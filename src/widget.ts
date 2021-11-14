// Copyright (c) Thomas Ballinger
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';
import { listenToSizeAndValuesAndReady, sendInputs } from './wrapper_code';
import { logo } from './observable_logo';

// ../src/iframe_code.js because path is relative to lib
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore // some webpack import syntax doesn't work with TypeScript?
import iframe_bundle_src from '!!raw-loader!../src/iframe_code.js';
import '../css/widget.css';
export class ObservableWidgetModel extends DOMWidgetModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: ObservableWidgetModel.model_name,
      _model_module: ObservableWidgetModel.model_module,
      _model_module_version: ObservableWidgetModel.model_module_version,
      _view_name: ObservableWidgetModel.view_name,
      _view_module: ObservableWidgetModel.view_module,
      _view_module_version: ObservableWidgetModel.view_module_version,
      value: undefined,
      slug: '',
      cells: undefined,
      inputs: undefined,
      outputs: undefined,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'ObservableWidgetModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'ObservableWidgetView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class ObservableWidgetView extends DOMWidgetView {
  outputEl?: HTMLElement; // TODO remove this, it's just for debugging
  iframe: HTMLIFrameElement;
  queuedInputs: Record<string, any>[] = [];

  // ugly hack until I figure out how to add code to the constructor
  pAndR = (function promiseAndResolve(): [Promise<void>, () => void] {
    let resolve: () => void;
    const p = new Promise<void>((r) => {
      resolve = r;
    });
    return [p, resolve!];
  })();
  iframeReadyForInputs: Promise<void> = this.pAndR[0];
  setIframeReadyForInputs: () => void = this.pAndR[1];

  render(): void {
    this.el.classList.add('custom-widget');

    const slug = this.model.get('slug');
    const cells = this.model.get('cells');
    const outputs = this.model.get('outputs');
    const pretty_slug = slug.startsWith('d/') ? 'embedded notebook' : slug;

    // TODO make Observable logo optional

    // TODO is this style helpful? I figured it was for aligning the logo
    //<div style="text-align: right; position: relative">
    const logoHTML = `<a class="observable-link" href="https://observablehq.com/${slug}" target="_blank" style="text-decoration: none; color: inherit;">
    <div class="observable-logo" style="display: flex; align-items: center; justify-content: flex-end;">
    <span>Edit ${pretty_slug} on Observable</span>
    ${logo}
    </div>
    </a>`;

    this.el.innerHTML = `
    <div>
    ${logoHTML}
    <iframe sandbox="allow-scripts" style="overflow: auto; min-width: 100%; width: 0px;" frameBorder="0"></iframe>
    <div class="value">output not available yet...</div>`;

    this.el.querySelector('iframe')!.srcdoc = get_srcdoc(slug, cells, outputs);
    this.outputEl = this.el.querySelector('.value') as HTMLElement;
    this.iframe = this.el.querySelector('iframe') as HTMLIFrameElement;

    listenToSizeAndValuesAndReady(
      this.iframe,
      this.onPublishValues,
      this.setIframeReadyForInputs
    );
    this.onInputs();
    this.model.on('change:inputs', this.onInputs, this);
  }

  onInputs = async (): Promise<void> => {
    const inputs: Record<string, any> = { ...this.model.get('inputs') };
    for (const name of Object.keys(inputs)) {
      // nonce, or some other value that is not a valid cell name on purpose
      if (name.startsWith('-invalid-cell-name')) {
        delete inputs[name];
      }
    }
    this.queuedInputs.push(inputs);
    await this.iframeReadyForInputs;
    // A lazy way to queue up inputs
    let inputsToSend;
    while ((inputsToSend = this.queuedInputs.shift())) {
      sendInputs(this.iframe, inputsToSend);
    }
  };

  onPublishValues = (values: Record<string, any>): void => {
    console.log('publishing values:', values);
    if (this.outputEl) {
      this.outputEl.innerHTML =
        '<span title="' +
        JSON.stringify(values, null, 2).replace(/"/g, "'") +
        '">hover to preview widget.value</span>';
    }
    this.model.set('value', values);
    this.touch();
  };
}

function get_srcdoc(slug: string, cells?: string[], outputs?: string[]) {
  return `<!DOCTYPE html>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@observablehq/inspector@3/dist/inspector.css">
<style>
body {
  margin: 0;
}
</style>
<div style="overflow: auto;"></div>
<script type="module">
${iframe_bundle_src}

const slug = '${slug}';
const into = document.getElementsByTagName('div')[0];
const cells = ${cells ? JSON.stringify(cells) : 'undefined'};
const outputs = ${outputs ? JSON.stringify(outputs) : 'undefined'}
embed(slug, into, cells, outputs);
monitor()
// TODO how to clean up monitor or a window event listener when this cell gets rerun?
</script>
`;
}

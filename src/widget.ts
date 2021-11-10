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
      value: 'fake initial value',
      slug: 'nonsense slug',
      cells: [],
      inputs: { initialInput: 123 },
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'ObservableWidgetModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'ObservableWidgetView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

// TODO use a bundler for this? or at least use an external js file read in

// ugly hack until I figure out how to add code to the constructor
function promiseAndResolve(): [Promise<void>, () => void] {
  let resolve: () => void;
  const p = new Promise<void>((r) => {
    resolve = r;
  });
  return [p, resolve!];
}

export class ObservableWidgetView extends DOMWidgetView {
  outputEl?: HTMLElement;
  iframe: HTMLIFrameElement;

  // ugly hack until I figure out how to add code to the constructor
  pAndR = promiseAndResolve();
  iframeReadyForInputs: Promise<void> = this.pAndR[0];
  iframeReadyForInputsResolve: () => void = this.pAndR[1];

  queuedInputs: Record<string, any>[] = [];

  /* How do I properly override this contructor? What's its signature?
  constructor() {
    super();
    this.iframeReadyForInputs = new Promise((r) => {
      this.iframeReadyForInputsResolve = r;
    });
  }
  */

  render(): void {
    this.el.classList.add('custom-widget');

    const slug = this.model.get('slug');
    //const slug = '@ballingt/embedding-example';
    const cells = this.model.get('cells');
    // QUESTION: Could this view be constructed or rendered before
    // receiving the inital state push?
    const inputs = this.model.get('inputs');

    //TODO add a call to on() to listen to value changes?
    const pretty_slug = slug.startsWith('d/') ? 'embedded notebook' : slug;

    // TODO this may not be needed? but if it is, it should be deterministic
    const iframe_id =
      'observable-iframe-' + Math.floor(Math.random() * 1000000);

    // TODO make Observable logo optional

    // TODO is this style helpful? I figured it was for aligning the logo
    //<div style="text-align: right; position: relative">
    this.el.innerHTML = `
    <div>
    <a class="observable-link" href="https://observablehq.com/${slug}" target="_blank" style="text-decoration: none; color: inherit;">
    <div class="observable-logo" style="display: flex; align-items: center; justify-content: flex-end;">
    <span>Edit ${pretty_slug} on Observable</span>
    ${logo}
    </div>
    </a>

    <iframe id="${iframe_id}" sandbox="allow-scripts" style="overflow: auto; min-width: 100%; width: 0px;" frameBorder="0"></iframe>
    <div class="value">initial</div>`;

    this.el.querySelector('iframe')!.srcdoc = get_srcdoc(slug, cells, inputs);
    this.outputEl = this.el.querySelector('.value') as HTMLElement;
    console.log('setting iframe...');
    this.iframe = this.el.querySelector('iframe') as HTMLIFrameElement;

    const onReady = () => {
      console.log('iframe ready for inputs...');
      this.iframeReadyForInputsResolve();
    };

    listenToSizeAndValuesAndReady(this.iframe, this.onPublishValues, onReady);

    console.log('sending initial inputs message:', inputs);
    this.onInputs(inputs);
    this.model.on('change:inputs', this.onInputs, this);
  }

  onInputs = async (inputs: Record<string, any>): Promise<void> => {
    this.queuedInputs.push(inputs);
    await this.iframeReadyForInputs;
    // A lazy way to queue up inputs
    let inputsToSend;
    while ((inputsToSend = this.queuedInputs.shift())) {
      console.log('sending inputs to iframe:', inputsToSend);
      sendInputs(this.iframe, inputsToSend);
    }
  };

  onPublishValues = (values: Record<string, any>): void => {
    if (this.outputEl) {
      this.outputEl.textContent =
        'Widget value: ' + JSON.stringify(this.model.get('value'), null, 2);
    }
    this.model.set('value', values);
    this.touch();
  };
}

function get_srcdoc(
  slug: string,
  cells: string[],
  inputs: Record<string, any>
) {
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
const cells = ${cells ? JSON.stringify(cells) : 'undefined'}
embed(slug, into, cells).then(m => {{window.main = m;}});
monitor()
</script>
`;
}

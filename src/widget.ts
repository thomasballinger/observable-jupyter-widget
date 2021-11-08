// Copyright (c) Thomas Ballinger
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

// Import the CSS
import '../css/widget.css';
import { listenToSizeAndValues } from './wrapper_code';
import { logo } from './observable_logo';

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
      value: 'Hello World',
      slug: '@ballingt/embedding-example',
      cells: ['initial', 'cells'],
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
const iframe_bundle_src = `
import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js";

export class DocumentBodyDimensionsMutationObserverMonitor {
  constructor() {
    this.lastHeight = -1;

    this.onMutation = (entries) => {
      const height = document.body.clientHeight;
      if (height !== this.lastHeight) {
        this.lastHeight = height;
        postHeight(this.lastHeight);
      }
    };
  }

  start() {
    this.observer = new MutationObserver(this.onMutation);
    this.observer.observe(document.body, {
      childList: true,
      attributes: true,
      subtree: true,
    });
  }
}

export class DocumentBodyDimensionsResizeObserverMonitor {
  constructor() {
    if (typeof window.ResizeObserver === 'undefined') {
      throw Error('ResizeObserver is not supported');
    }
    this.lastHeight = -1;

    this.onResize = (entries) => {
      for (let entry of entries) {
        const height = entry.contentRect.height;
        if (height !== this.lastHeight) {
          this.lastHeight = height;
          postHeight(this.lastHeight);
        }
      }
    };
  }

  start() {
    this.observer = new ResizeObserver(this.onResize);
    this.observer.observe(document.body);
  }
}

function postHeight(height) {
  window.parent.postMessage(
    {
      type: 'iframeSize',
      height,
    },
    '*'
  );
}

export const monitor = () => {
  if (typeof window.ResizeObserver !== 'undefined') {
    new DocumentBodyDimensionsResizeObserverMonitor().start();
  } else {
    new DocumentBodyDimensionsMutationObserverMonitor().start();
  }
};

class JupyterWidgetAllValuesObserver {
  pending() {
    console.log('observable cell values pending');
  }
  fulfilled(value) {
    // postMessage does a "structured clone" which fails for DOM elements, functions, and more
    // so let's jsonify
    // We will probably wastefully jsonify again on the other side of the postMessage
    const cleaned = {};
    for (const name of Object.keys(value)) {
      try {
        cleaned[name] = JSON.parse(JSON.stringify(value[name]));
      } catch (e) {
        cleaned[name] = null;
      }
    }
    window.parent.postMessage(
      {
        type: 'allValues',
        allValues: JSON.parse(JSON.stringify(cleaned)),
      },
      '*'
    );
  }
  rejected(error) {
    console.error('all values rejected:', error);
  }
}

export const embed = async (slug, into, cells, inputs = {}) => {
  console.log('embed called with', slug, into, cells, inputs);
  const moduleUrl = 'https://api.observablehq.com/' + slug + '.js?v=3';
  const define = (await import(moduleUrl)).default;
  const inspect = Inspector.into(into);
  const filter = cells ? (name) => cells.includes(name) : (name) => true;

  const newDefine = (runtime, observer) => {
    const main = define(runtime, observer);
    // TODO dynamically gather all variable names
    const allVariables = [
      'vegaPetalsWidget',
      'minSepalLength',
      'minSepalWidth',
      'extraCell',
    ];
    main.variable(observer('observableJupyterWidgetAllValues')).define('observableJupyterWidgetAllValues', [
      ...allVariables
    ], function(...args){ 
      const allValues = {};
      allVariables.forEach((name, i) => {
        allValues[name] = args[i];
      })
      console.log('calculating allvalues');
      // the reporting side effect could just go here, but then we'd still need to pass true to run the code
      return allValues;
    })
  }

  const runtime = new Runtime();

  const main = runtime.module(newDefine, (name) => {
    if (name === 'observableJupyterWidgetAllValues') {
      return new JupyterWidgetAllValuesObserver();
    }
    return filter(name) ? inspect() : true
  });

/*
main.variable(observer("irisSubset")).define("irisSubset", ["irisData","minSepalLength","minSepalWidth"], function(irisData,minSepalLength,minSepalWidth){return(
irisData
.filter(flower => 
  flower.sepalLength >= minSepalLength)
.filter(flower => 
  flower.sepalWidth >= minSepalWidth)
)});
*/



  for (let name of Object.keys(inputs)) {
    try {
      console.log('redefining', name, 'to', inputs[name]);
      main.redefine(name, inputs[name]);
    } catch (e) {
      if (e.message.endsWith(name + ' is not defined')) {
        console.log('Send value to Observable that does not exist: '+name);
        console.log(e);
        // TODO get this error into Python code? How do widget Python exceptions propagate?
      } else {
        throw e;
      }
    }
  }
  return main;
};`;

export class ObservableWidgetView extends DOMWidgetView {
  outputEl?: HTMLElement;

  render(): void {
    this.el.classList.add('custom-widget');

    const inputs = this.model.get('inputs');
    const slug = this.model.get('slug');
    //const slug = '@ballingt/embedding-example';
    const cells = this.model.get('cells');
    // QUESTION: Could this view be constructed or rendered before
    // receiving the inital state push?

    //TODO add a call to on() to listen to value changes?
    const pretty_slug = slug.startsWith('d/') ? 'embedded notebook' : slug;

    const iframe_id = 'asdf';
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

    this.el.querySelector('iframe')!.srcdoc = `<!DOCTYPE html>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@observablehq/inspector@3/dist/inspector.css">
<style>
body {
  margin: 0;
}
</style>
<div style="overflow: auto;"></div>
<script type="module">
${iframe_bundle_src}

const inputs = ${JSON.stringify(inputs)};
const slug = '${slug}';
const into = document.getElementsByTagName('div')[0];
const cells = ${cells ? JSON.stringify(cells) : 'undefined'}
embed(slug, into, cells, inputs).then(m => {{window.main = m;}});
monitor()
window.addEventListener('unload', () => {{
  if (typeof window.main !== 'undefined') {{
      window.main._runtime.dispose();
  }}
}});
</script>
`;
    this.outputEl = this.el.querySelector('.value') as HTMLElement;
    const iframe = this.el.querySelector('iframe') as HTMLIFrameElement;

    const onValues = (values: any) => {
      this.model.set('value', values);
      this.touch();
    };
    listenToSizeAndValues(iframe, onValues);

    // Do we want to trigger a value_changed right away? Probably, so callbacks added in Python fire
    this.value_changed();
    this.model.on('change:value', this.value_changed, this);
  }

  value_changed(): void {
    if (this.outputEl) {
      this.outputEl.textContent =
        'Widget value: ' + JSON.stringify(this.model.get('value'), null, 2);
    }
  }
}

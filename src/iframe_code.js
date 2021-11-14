// This code is injected into the iframe via a .srcdoc property
import {
  Runtime,
  Inspector,
} from 'https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js';

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

class JupyterWidgetOutputObserver {
  pending() {
    // could gray something out here
  }
  fulfilled(value) {
    // postMessage does a "structured clone" which fails for DOM elements, functions, and more
    // so let's jsonify
    // We will probably wastefully jsonify again on the other side of the postMessage
    const cleaned = {};
    for (const name of Object.keys(value)) {
      try {
        let v = value[name];
        if (v instanceof Set) {
          v = Array.from(v);
        } else if (v instanceof Map) {
          v = Object.fromEntries(v);
        }
        cleaned[name] = JSON.parse(JSON.stringify(v));
      } catch (e) {
        console.log('error JSONifying value of cell', name, v);
        cleaned[name] = null;
      }
    }
    window.parent.postMessage(
      {
        type: 'outputs',
        outputs: JSON.parse(JSON.stringify(cleaned)),
      },
      '*'
    );
  }
  rejected(error) {
    console.error('all values rejected:', error);
  }
}

// (slug: string, into: string | HTMLElement, cells?: string[], outputs?: string[])
export const embed = async (slug, into, cells, outputs) => {
  const moduleUrl = 'https://api.observablehq.com/' + slug + '.js?v=3';
  const define = (await import(moduleUrl)).default;
  const inspect = Inspector.into(into);
  const filter = cells ? (name) => cells.includes(name) : (name) => true;

  const newDefine = (runtime, observer) => {
    const main = define(runtime, observer);
    let outputVariables = new Set();
    // TODO allow a subset of these to be manually specified?
    if (outputs) {
      outputVariables = new Set(outputs);
    } else {
      const candidateOutputVariables = cells ? cells : [...main._scope.keys()];
      for (const cell of candidateOutputVariables) {
        if (cell.slice(0, 7) === 'viewof ') {
          outputVariables.add(cell.slice(7));
        } else {
          outputVariables.add(cell);
        }
      }
    }
    main
      .variable(observer('observableJupyterWidgetOutputCell'))
      .define(
        'observableJupyterWidgetOutputCell',
        [...outputVariables],
        (...args) => {
          const output = {};
          [...outputVariables].forEach((name, i) => {
            output[name] = args[i];
          });
          return output;
        }
      );
  };

  let main;

  // TODO wait for this initial inputs message before actually running anything
  window.addEventListener('message', (msg) => {
    if (msg.data.type === 'inputs' && msg.source === window.parent) {
      // only the first time, start things up
      if (!main) {
        const runtime = new Runtime();
        main = runtime.module(newDefine, (name) => {
          if (name === 'observableJupyterWidgetOutputCell') {
            return new JupyterWidgetOutputObserver();
          }
          return filter(name) ? inspect() : true;
        });
      }
      window.addEventListener('unload', () => {
        main._runtime.dispose();
      });

      const inputs = msg.data.inputs;
      for (let name of Object.keys(inputs)) {
        try {
          //console.log('redefining', name, 'to', inputs[name]);
          main.redefine(name, inputs[name]);
        } catch (e) {
          if (e.message.endsWith(name + ' is not defined')) {
            console.log(
              'Send value to Observable that does not exist: ' + name
            );
            console.log(e);
            // TODO get this error into Python code? How do widget Python exceptions propagate?
          } else {
            throw e;
          }
        }
      }
    }
  });

  // iframe is ready to start receiving 'inputs' messages
  window.parent.postMessage({ type: 'ready' }, '*');
  return main;
};

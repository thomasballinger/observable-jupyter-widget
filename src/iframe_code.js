// This code is injected into the iframe via a .srcdoc property
import { Runtime, Inspector } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@4/dist/runtime.js";

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

export const embed = async (slug, into, cells) => {
    console.log('embed called with', slug, into, cells);
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
        ], function (...args) {
            const allValues = {};
            allVariables.forEach((name, i) => {
                allValues[name] = args[i];
            })
            console.log('calculating allvalues');
            // the reporting side effect could just go here, but then we'd still need to pass true to run the code
            return allValues;
        })
    }

    let main;
    let setMain;
    const mainP = new Promise(r => {
        setMain = r;
    });

    // TODO wait for this initial inputs message before actually running anything
    window.addEventListener('message', (msg) => {
        if (msg.data.type === 'inputs' && msg.source === window.parent) {
            console.log('iframe received inputs message from parent', msg.data);

            // only the first time, start things up
            if (!main) {
                const runtime = new Runtime();
                main = runtime.module(newDefine, (name) => {
                    if (name === 'observableJupyterWidgetAllValues') {
                        return new JupyterWidgetAllValuesObserver();
                    }
                    return filter(name) ? inspect() : true
                });
                setMain(main);
            }
            window.addEventListener('unload', () => {
                main._runtime.dispose();
            });

            const inputs = msg.data.inputs;
            for (let name of Object.keys(inputs)) {
                try {
                    console.log('redefining', name, 'to', inputs[name]);
                    main.redefine(name, inputs[name]);
                } catch (e) {
                    if (e.message.endsWith(name + ' is not defined')) {
                        console.log('Send value to Observable that does not exist: ' + name);
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
    window.parent.postMessage({ type: 'ready', }, '*');
    return main;
};
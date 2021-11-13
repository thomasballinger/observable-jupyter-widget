# observable-jupyter-widget

Run Observable notebooks in Jupyter, sending values between Python and JavaScript

[Observable](https://observablehq.com/) is pretty great. But sometimes you need Python! Or, more often, what you already have is Jupyter. What if you could use your (or someone else's) Observable notebooks in Jupyter, passing values back and forth?

* Allow viewers of a Jupyter notebook use powerful Observable inputs like the [FIPS county code brush](https://observablehq.com/@awhitty/fips-county-code-brush) to specify Python values interactively
* Display data calculated in Jupyter on interactive D3 plots ([see gallery](https://observablehq.com/@d3/gallery))
* Quickly iterate on data visualization on observablehq.com: publish an update to an Observable notebook, wait a few seconds, and refresh the Jupyter web page. That's right, no kernel restarts!
* Or create powerful interactive widgets that request additional data from Python without building a webapp. Display a map that limits client-side data by requesting more when the user pans the map from a server-side Jupyter kernel with plenty of RAM.

This library is similar to [observable-jupyter](https://github.com/thomasballinger/observable-jupyter), which allows feeding Python values into an Observable notebook once per embed. Unlike that library, this widget version allows new inputs to be sent in and brings Observable cell outputs back to Python. It also integrates with the Jupyter Widget ecosystem, so e.g. callbacks can run every time new values are produced in the embed.

## Usage
Install the package and import the module.
```py
!pip install observable_jupyter_widget
import observable_jupyter_widget
```

Instantiate a widget object and evaluate (use the variable name wihtout a semicolon it) to render it.

Pass in the Observable notebook you want to render and optionally include which cells to display, input Python values to substitute into the Observable notebook, and which Observable cells to report the output values of.

```py
w = observable_jupyter_widget.ObservableWidget(
    '@ballingt/embedding-example',
    cells=['vegaPetalsWidget', 'viewof minSepalLength', 'viewof minSepalWidth', 'extraCell'], # optional
    inputs={'extraCell': 123},  # optional
    outputs=['minSepalLength', 'extraCell']  # optional
)
w
```

Widgets have a `.value` attribute which is a dictionary of values from Observable cells.
```py
print(w.value)
```

Using the `redefine` method you can redefine Observable inputs to new values:

```py
w.redefine(extraCell=10000)
```

See example [Colab notebook](https://colab.research.google.com/drive/1kPH2XkEszv_95Rijc5PhoxZ41QGFBI_d?usp=sharing)

## Limitations

### ObservableWidgets only run when onscreen [#2](https://github.com/thomasballinger/observable-jupyter-widget/issues/2)
For security (to prevent embedded notebooks from running untrusted Python code) an embedded Observable notebook runs in an iframe.
The observable runtime is runs on [AnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame), an event that never happens if the iframe is offscreen in most browsers.

### Embed output may not be ready when the next Jupyter cell runs [#1](https://github.com/thomasballinger/observable-jupyter-widget/issues/1)
Observable notebooks take time to run and resolve their `.value` value (any amount of time, depending on the notebook) but the Jupyter kernel keeps right on chugging.
When using "Restart and Run All" menu item in Jupyter, or even when quickly executing consecutive cells manually with option-enter, the `.value` attribute may still be None (the initial value) instead of a dictionary mapping cell names to output values. 

To get around this, use ipython_blocking cell magic %block along with a function that evalutes to True once the value is ready, or just don't run all cells at once!

```python
import ipython_blocking
w = ObservableWidget(...)
observable_output_ready = lambda: w.value != None
---
%block observable_output_ready
---
print(w.value)
```

### Embeds do not execute in non-interactive notebook execution environments like Papermill
ObservableWidget works great for interactive experiences embedded in a Jupyter notebook. Although results of JavaScript interactions are exposed by the `.value` attribute, it needs to be viewed by a user to run. If you're using a Jupyter notebook to run scheduled tasks like ETL, try a [Juypyter kernel that uses node](https://github.com/n-riesco/ijavascript) to run JavaScript.

## Installation

You can install using `pip`:

```bash
pip install observable_jupyter_widget
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] observable_jupyter_widget
```

## Development Installation

TODO this is fromthe cookiecutter template. It's not wrong, butit's not what I use.

Create a dev environment:
```bash
conda create -n observable_jupyter_widget-dev -c conda-forge nodejs yarn python jupyterlab
conda activate observable_jupyter_widget-dev
```

Install the python code. This will also build the TS package.
```bash
pip install -e ".[test, examples]"
```

When developing your extensions, you need to manually enable your extensions with the
notebook / lab frontend. For lab, this is done by the command:

```
jupyter labextension develop --overwrite .
yarn run build
```

For classic notebook, you need to run:

```
jupyter nbextension install --sys-prefix --symlink --overwrite --py observable_jupyter_widget
jupyter nbextension enable --sys-prefix --py observable_jupyter_widget
```

Note that the `--symlink` flag doesn't work on Windows, so you will here have to run
the `install` command every time that you rebuild your extension. For certain installations
you might also need another flag instead of `--sys-prefix`, but we won't cover the meaning
of those flags here.

### How to see your changes
#### Typescript:
If you use JupyterLab to develop then you can watch the source directory and run JupyterLab at the same time in different
terminals to watch for changes in the extension's source and automatically rebuild the widget.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
yarn run watch
# Run JupyterLab in another terminal
jupyter lab
```

After a change wait for the build to finish and then refresh your browser and the changes should take effect.

#### Python:
If you make a change to the python code then you will need to restart the notebook kernel to have it take effect.

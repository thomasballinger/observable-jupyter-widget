# observable-jupyter-widget

[![Build Status](https://travis-ci.org/thomasballinger/observable-jupyter-widget.svg?branch=master)](https://travis-ci.org/thomasballinger/observable_jupyter_widget)
[![codecov](https://codecov.io/gh/thomasballinger/observable-jupyter-widget/branch/master/graph/badge.svg)](https://codecov.io/gh/thomasballinger/observable-jupyter-widget)


Connect Observable notebooks to the Jupyter kernel.

Similar to the [observable-jupyter](https://github.com/thomasballinger/observable-jupyter) project, which allows feeding Python values into an Observable notebook once per embed. This widget version allows new inputs to be sent in and brings Observable cell outputs back to Python and integrates with the Jupyter Widget ecosystem.

## Usage
Install the package and import the module.
```py
!pip install observable_jupyter_widget
import observable_jupyter_widget
```

Instantiate a widget object and evaluate (use the variable name wihtout a semicolon it) to render it.

Pass in the Observable notebook you want to render and optionally include which cells to display, input Python values to substitute into the Observable notebook, and which Observable cells to report the output value of.

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

By assigning a dictionary to the `.inputs` attribute you can redefine Observable cells to new values.
```py
w.inputs = {'extraCell': 10000}
```

See example [Colab notebook](https://colab.research.google.com/drive/1kPH2XkEszv_95Rijc5PhoxZ41QGFBI_d?usp=sharing)

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

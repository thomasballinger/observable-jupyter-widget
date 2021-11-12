#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thomas Ballinger.
# Distributed under the terms of the Modified BSD License.

"""
Observable Embed Widget
"""
import json
from typing import List, Dict, Any, Union
import time
import asyncio

from IPython.display import display
from ipywidgets import DOMWidget, ValueWidget
import traitlets
import ipython_blocking
import nest_asyncio

from ._frontend import module_name, module_version


# applause for this hack
nest_asyncio.apply()


class ObservableWidget(DOMWidget, ValueWidget):
    _model_name = traitlets.Unicode("ObservableWidgetModel").tag(sync=True)
    _model_module = traitlets.Unicode(module_name).tag(sync=True)
    _model_module_version = traitlets.Unicode(module_version).tag(sync=True)
    _view_name = traitlets.Unicode("ObservableWidgetView").tag(sync=True)
    _view_module = traitlets.Unicode(module_name).tag(sync=True)
    _view_module_version = traitlets.Unicode(module_version).tag(sync=True)

    # These should not change
    slug = traitlets.Unicode("").tag(sync=True)
    cells = traitlets.List(default_value=None, allow_none=True).tag(sync=True)
    outputs = traitlets.List(default_value=None, allow_none=True).tag(sync=True)

    # Each time this changes the widget will be updated
    inputs = traitlets.Dict(default_value=None, allow_none=True).tag(sync=True)

    # This should only be changed from the JavaScript side
    value = traitlets.Dict(default_value=None, allow_none=True).tag(sync=True)

    def __init__(
        self,
        slug: str,
        cells: List[str] = None,
        *,
        inputs: Dict = None,
        outputs: List[str] = None,
        display_logo=True,
    ) -> None:
        """Embeds a set of cells or an entire Observable notebook.

        Every cell of the Observable notebook runs, just like when opening a notebook on observablehq.com.
        Cells are unordered: cells are always rendered in the order they appear in the Observable notebook.
        Cells in inputs

        """
        super().__init__()

        if (
            slug.startswith("http")
            or slug.startswith("www.")
            or slug.startswith("observablehq.com")
        ):
            raise ValueError(
                "notebook identifier looks like a url, please path a specifier like @observablehq/a-taste-of-observable or d/4575c6c14b706a4f"
            )

        jsonified_inputs = jsonify(inputs or {})

        if cells:
            for cell in cells:
                if not isinstance(cell, str):
                    raise ValueError("Cell names should be strings.")

        if outputs:
            for cell in outputs:
                if not isinstance(cell, str):
                    raise ValueError("Cell names should be strings.")

        self.slug = slug
        self.cells = cells
        self.inputs = inputs
        self.outputs = outputs

    def redefine(self, **kwargs):
        "Redefine an Observable cell with a Python value."
        # this could be any cell in the Observable notebook (not limited to widget.cells)
        kwargs["-invalid-cell-name-nonce"] = time.time()
        self.inputs = kwargs
        # TODO block and return outputs?

    @property
    def output(self):
        return self.get_output()

    def get_output(self):
        return self.value


"""
class ObservableEmbed:  # AKA a 'widge' (it's not a Widget)
    widget: ObservableWidget

    def __init__(self, widget: ObservableWidget):
        self.widget = widget
        self.widget.observe(self._on_value_change, "change")

    def _on_value_change(self, change: Any):
        value: Union[Dict[str, Any], None] = change.new
        # Using attributes for this is a not a good idea, going with it for now
        # self.update_attrs(value)

    def update_attrs(self, values: Dict[str, Any]):
        for k, v in values.items():
            if k in ["widget"]:
                continue
            old = getattr(self, k)
            if callable(old):
                continue
            setattr(self, k, v)

    def redefine(self, **kwargs):
        "Redefine an Observable cell with a Python value."
        # this could be any cell in the Observable notebook (not limited to widget.cells)
        kwargs["-invalid-cell-name-nonce"] = time.time()
        self.widget.inputs = kwargs
        # TODO block and return outputs?

    @property
    def output(self):
        return self.get_output()

    # Steps the kernel along to propagate kernel messages until the widget finishes
    # https://gitter.im/jupyter-widgets/Lobby?at=5e86fe9381a582042e972b4d
    async def get_output_async(self, sleep=0.1):
        if self.widget.value is not None:
            return self.widget.value

        ready = False

        def get_value(change):
            nonlocal ready
            ready = True
            self.widget.unobserve(get_value)

        self.widget.observe(get_value, "value")

        async def runner():
            ctx = ipython_blocking.CaptureExecution(replay=True)
            with ctx:
                while True:
                    await asyncio.sleep(sleep)
                    if ready:
                        return self.widget.value
                    ctx.step()  # handles all other messages that aren't 'execute_request' including widget value changes

        return await asyncio.create_task(runner())

    # Steps the kernel along to propagate kernel messages until the widget finishes
    # https://gitter.im/jupyter-widgets/Lobby?at=5e86fe9381a582042e972b4d
    def get_output(self, sleep=0.1):
        if self.widget.value is not None:
            return self.widget.value

        # loop = asyncio.get_event_loop()

        print("running simple get_output()")

        ready = False

        def get_value(change):
            nonlocal ready
            ready = True
            self.widget.unobserve(get_value)

        self.widget.observe(get_value, "value")

        ctx = ipython_blocking.CaptureExecution(replay=False)
        with ctx:
            while True:
                if ready:
                    break
                ctx.step()  # handles all other messages that aren't 'execute_request' including widget value changes

        return self.widget.value

    async def get_cell_value_async(self, cell):
        values = await self.get_output_async()
        return values[cell]

    def get_cell_value(self, cell):
        values = self.get_output()
        return values[cell]


async def interactive_embed_async(
    slug: str,
    cells: List[str] = None,
    *,
    inputs: Dict = None,
    outputs: List[str] = None,
    display_logo=True,
) -> ObservableEmbed:
    w = ObservableWidget(
        slug=slug,
        cells=cells,
        inputs=inputs,
        outputs=outputs,
        display_logo=display_logo,
    )
    display(w)
    wrapper = ObservableEmbed(w)
    await wrapper.get_output_async()
    return wrapper


# someday this could be combined with embed() from observable_jupyter
# but we need to match the semantics first
def interactive_embed(
    slug: str,
    cells: List[str] = None,
    *,
    inputs: Dict = None,
    outputs: List[str] = None,
    display_logo=True,
) -> ObservableEmbed:
    w = ObservableWidget(
        slug=slug,
        cells=cells,
        inputs=inputs,
        outputs=outputs,
        display_logo=display_logo,
    )
    display(w)
    wrapper = ObservableEmbed(w)
    wrapper.get_output()
    return wrapper
"""


class ExampleEmbed(ObservableWidget):
    def __init__(self):
        inputs = {"extraCell": 123}
        slug = "@ballingt/embedding-example"
        cells = [
            "vegaPetalsWidget",
            "viewof minSepalLength",
            "viewof minSepalWidth",
            "extraCell",
        ]
        super().__init__(slug, cells=cells, inputs=inputs)


def jsonify(obj):
    return json.dumps(obj, cls=DataJSONEncoder)


class DataJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if type(obj).__name__ == "DataFrame":  # Pandas DataFrame
            return json.dumps(obj.to_dict(orient="records"))

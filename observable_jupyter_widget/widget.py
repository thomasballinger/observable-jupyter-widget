#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thomas Ballinger.
# Distributed under the terms of the Modified BSD License.

"""
Observable Embed Widget
"""
import json
import typing

from ipywidgets import DOMWidget
from traitlets import Unicode, Dict, List
from ._frontend import module_name, module_version


class ObservableWidget(DOMWidget):
    _model_name = Unicode('ObservableWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ObservableWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    # These should not change
    slug = Unicode("").tag(sync=True)
    cells = List([]).tag(sync=True)

    # Each time this changes the widget will be updated
    inputs = Dict([]).tag(sync=True)

    # This should only be changed from the JavaScript side
    value = Dict({}).tag(sync=True)

    def __init__(self, slug: str, cells: typing.List[str] = None, inputs: typing.Dict = None, display_logo=True) -> None:
        """Embeds a set of cells or an entire Observable notebook.
        
        Cells are unordered: cells are always rendered in the order they appear in the Observable notebook.
        """
        super().__init__()

        if slug.startswith("http"):
            raise ValueError("notebook identifier looks like a url, please path a specifier like @observablehq/a-taste-of-observable or d/4575c6c14b706a4f")

        jsonified_inputs = jsonify(inputs or {})

        if cells:
            for cell in cells:
                if not isinstance(cell, str):
                    raise ValueError("Cell names should be strings.")

        # TODO check that inputs exist? get errors back here
        # That might require an async init, so we can raise an exception

        self.slug = slug
        self.cells = cells
        self.inputs = inputs


class ExampleEmbed(ObservableWidget):
    def __init__(self):
        inputs = { 'extraCell': 123 }
        slug = '@ballingt/embedding-example'
        cells = [
          'vegaPetalsWidget',
          'viewof minSepalLength',
          'viewof minSepalWidth',
          'extraCell',
        ]
        super().__init__(slug, cells=cells, inputs=inputs)

def jsonify(obj):
    return json.dumps(obj, cls=DataJSONEncoder)


class DataJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if type(obj).__name__ == "DataFrame":  # Pandas DataFrame
            return json.dumps(obj.to_dict(orient="records"))

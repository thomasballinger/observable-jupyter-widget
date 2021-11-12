#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thomas Ballinger.
# Distributed under the terms of the Modified BSD License.

import pytest
import pandas as pd
import numpy as np
import json

from ..widget import jsonify, ObservableWidget


def test_creation_blank():
    w = ObservableWidget("@fakeauthor/fakenotebook")
    # because this widget is never rendered, its JavaScript does not run.
    assert w.value is None


def test_input_serialization():
    s = jsonify(["a", 1])
    assert s
    data = np.array(
        [(1, 2, 3), (4, 5, 6), (7, 8, 9)], dtype=[("a", "i4"), ("b", "i4"), ("c", "i4")]
    )
    df = pd.DataFrame(data, columns=["c", "a"])
    tidied = json.loads(jsonify(df))
    assert tidied

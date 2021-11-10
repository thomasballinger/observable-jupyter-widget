#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thomas Ballinger.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..widget import ObservableWidget


def test_example_creation_blank():
    w = ObservableWidget()
    assert w.value == 'Hello World'

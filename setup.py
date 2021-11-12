#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from glob import glob
import os
from os.path import join as pjoin
from setuptools import setup, find_packages

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
    get_version,
    skip_if_exists,
)

HERE = os.path.dirname(os.path.abspath(__file__))
name = "observable_jupyter_widget"
version = get_version(pjoin(name, "_version.py"))

# Representative files that should exist after a successful build
jstargets = [
    pjoin(HERE, name, "nbextension", "index.js"),
    pjoin(HERE, name, "labextension", "package.json"),
]


package_data_spec = {name: ["nbextension/**js*", "labextension/**"]}


data_files_spec = [
    (
        "share/jupyter/nbextensions/observable_jupyter_widget",
        "observable_jupyter_widget/nbextension",
        "**",
    ),
    (
        "share/jupyter/labextensions/observable-jupyter-widget",
        "observable_jupyter_widget/labextension",
        "**",
    ),
    ("share/jupyter/labextensions/observable-jupyter-widget", ".", "install.json"),
    ("etc/jupyter/nbconfig/notebook.d", ".", "observable_jupyter_widget.json"),
]


cmdclass = create_cmdclass(
    "jsdeps", package_data_spec=package_data_spec, data_files_spec=data_files_spec
)
npm_install = combine_commands(
    install_npm(HERE, build_cmd="build:prod"),
    ensure_targets(jstargets),
)
cmdclass["jsdeps"] = skip_if_exists(jstargets, npm_install)


setup_args = dict(
    name=name,
    description="Connect Observable notebooks to the Jupyter kernel for two-way interactivity",
    version=version,
    cmdclass=cmdclass,
    packages=find_packages(),
    author="Thomas Ballinger",
    author_email="me@ballingt.com",
    url="https://github.com/thomasballinger/observable-jupyter-widget",
    license="ISC",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Observable", "Jupyter", "Widgets", "IPython"],
    classifiers=[
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Framework :: Jupyter",
    ],
    include_package_data=True,
    python_requires=">=3.6",
    install_requires=[
        "ipywidgets>=7.0.0",
        "ipython_blocking"
    ],
    extras_require={
        "test": [
            "pytest>=4.6",
            "pytest-cov",
            "nbval",
            "numpy",
            "pandas",
        ],
        "examples": [
            "jupyter",
        ],
        "docs": [
            "jupyter_sphinx",
            "nbsphinx",
            "nbsphinx-link",
            "pytest_check_links",
            "pypandoc",
            "recommonmark",
            "sphinx>=1.5",
            "sphinx_rtd_theme",
        ],
    },
)

if __name__ == "__main__":
    setup(**setup_args)

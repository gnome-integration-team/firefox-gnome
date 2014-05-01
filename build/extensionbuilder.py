#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import subprocess

from addonbuilder import AddonBuilder

class ExtensionBuilder(AddonBuilder):
    def __init__(self, src_dir="extension", build_dir=".build/extension",
                 config_file="config.json"):
        AddonBuilder.__init__(self, src_dir=src_dir, build_dir=build_dir,
                              config_file=config_file)

        self.xpi_file = self.config["xpi"]["extension"]

        self.dependencies = {
            "install.rdf.in": ["../config.json"]
        }

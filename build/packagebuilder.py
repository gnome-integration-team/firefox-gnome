#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import zipfile

from addonbuilder import AddonBuilder

class PackageBuilder(AddonBuilder):
    def __init__(self, src_dir="", build_dir=".build",
                 config_file="config.json"):
        AddonBuilder.__init__(self, src_dir=src_dir, build_dir=build_dir,
                              config_file=config_file)

        self.xpi_file = self.config["xpi"]["package"]

        self.dependencies = {
            "install.rdf.in": ["config.json"]
        }

    def build(self):
        self.result_files = []

        for source in [self.config["xpi"]["theme"], self.config["xpi"]["extension"], "install.rdf.in"]:
            self._process_file(source)

        xpi = zipfile.ZipFile(self.xpi_file, "w")
        for i in self.result_files:
            xpi.write(i[0], i[1]) # source, path_inside_xpi
        xpi.close()

        del self.result_files


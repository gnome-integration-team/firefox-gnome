# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from addonbuilder import AddonBuilder

class PackageBuilder(AddonBuilder):
    def __init__(self, config, src_dir="", build_dir=".build"):
        AddonBuilder.__init__(self, config=config,
                              src_dir=src_dir, build_dir=build_dir)

        self.xpi_file = self.config["xpi"]["package"]

        self.dependencies = {
            "install.rdf.in": ["config.json"]
        }

    def build(self):
        self.result_files = []
        for source in [self.config["xpi"]["theme"], self.config["xpi"]["extension"], "install.rdf.in"]:
            self._process_file(source)
        self._create_xpi()


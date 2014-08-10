# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from addonbuilder import AddonBuilder

class ExtensionBuilder(AddonBuilder):
    def __init__(self, config, src_dir="extension", build_dir=".build/extension"):
        AddonBuilder.__init__(self, config=config,
                              src_dir=src_dir, build_dir=build_dir)

        self.xpi_file = self.config["extension"]["xpi"]

        self.dependencies = {
            "install.rdf": ["../config.json"]
        }

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re

import console
from addonbuilder import AddonBuilder

class ThemeBuilder(AddonBuilder):
    def __init__(self, config, src_dir="theme", build_dir=".build/theme"):
        AddonBuilder.__init__(self, config=config,
                              src_dir=src_dir, build_dir=build_dir)

        self.xpi_file = self.config["theme"]["xpi"]


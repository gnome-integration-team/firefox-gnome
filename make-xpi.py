#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Usage:

./make-xpi.py
./make-xpi.py theme
./make-xpi.py extension
./make-xpi.py clean
"""

import sys
import os
import shutil
import json

sys.path.insert(0, "./build")

from themebuilder import ThemeBuilder
from extensionbuilder import ExtensionBuilder
from packagebuilder import PackageBuilder

def main():
    args = sys.argv[1:]
    if len(args) == 1:
        action = args[0]
    else:
        action = "all"

    if not action in ["all", "theme", "extension", "clean"]:
        print(sys.argv[0] + ": uncorrect target")
        print("Availible targets: all, theme, extension, clean")
        sys.exit(1)

    #
    # Clean up
    #

    if action == "clean":
        if os.path.isdir(".build"):
            shutil.rmtree(".build")
        if os.path.isdir("build/__pycache__"):
            shutil.rmtree("build/__pycache__")
        for name in os.listdir("build"):
            if name.endswith(".pyc"):
                os.remove(os.path.join("build", name))
        sys.exit(0)

    #
    # Theme building
    #

    if action in ["theme", "all"]:
        builder = ThemeBuilder()
        print(":: Starting build theme...")
        builder.build()

    #
    # Extension building
    #

    if action in ["extension", "all"]:
        builder = ExtensionBuilder()
        print(":: Starting build extension...")
        builder.build()

    #
    # Package building
    #

    if action in ["all"]:
        builder = PackageBuilder()
        print(":: Starting make package...")
        builder.build()

if __name__ == "__main__":
    main()


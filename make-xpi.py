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
import argparse

sys.path.insert(0, "./build")

from themebuilder import ThemeBuilder
from extensionbuilder import ExtensionBuilder
from packagebuilder import PackageBuilder

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", nargs='?', default="all",
                        choices=["all", "theme", "extension", "clean"],
                        help="build theme, extension, package or clean sources")
    parser.add_argument("--version",
                        help="override version from config.json")
    parser.add_argument("--target-version", type=int,
                        help="build for a certain version only")
    args = parser.parse_args()

    action = args.action

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
    # Create config = argparse + config.json
    #

    try:
        with open("config.json", "r") as config_file:
            config = json.load(config_file)
    except FileNotFoundError:
        print("%s: %s not found" % (sys.argv[0], "config.json"))
        sys.exit(1)
    except ValueError as e:
        print("%s: parse error: %s" % (sys.argv[0], "config.json"))
        print(e)
        sys.exit(1)

    if "VERSION" in os.environ:
        config["version"] = os.environ.get("VERSION")
        config["override-version"] = True
    if args.version:
        config["version"] = args.version
        config["override-version"] = True
    if args.target_version:
        config["target-version"] = args.target_version

    #
    # Theme building
    #

    if action in ["theme", "all"]:
        builder = ThemeBuilder(config)
        print(":: Starting build theme...")
        builder.build()

    #
    # Extension building
    #

    if action in ["extension", "all"]:
        builder = ExtensionBuilder(config)
        print(":: Starting build extension...")
        builder.build()

    #
    # Package building
    #

    if action == "all":
        builder = PackageBuilder(config)
        print(":: Starting make package...")
        builder.build()

if __name__ == "__main__":
    main()


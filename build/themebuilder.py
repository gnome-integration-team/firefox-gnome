#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re

from addonbuilder import AddonBuilder

class ThemeBuilder(AddonBuilder):
    def __init__(self, config, src_dir="theme", build_dir=".build/theme"):
        AddonBuilder.__init__(self, config=config,
                              src_dir=src_dir, build_dir=build_dir)

        self.shared_dir = self.config["directory-structure"]["shared-dir"]

        self.xpi_file = self.config["xpi"]["theme"]

        self.default_dependencies = {
            "install.rdf.in": ["../config.json"],
            "chrome.manifest.in": ["../config.json"]
        }

    def build(self):
        self.app_versions = []

        if "target-version" in self.config:
            self.app_versions.append(self.config["target-version"])
        else:
            for name in os.listdir(self.src_dir):
                if not name.startswith("chrome-"):
                    continue
                version = int(name.replace("chrome-", ""))
                self.app_versions.append(version)

        self.dependencies = self._load_dependencies_cache()

        self.result_files = []
        for base, dirs, files in os.walk(self.src_dir):
            for name in files:
                source = os.path.join(base, name)[len(self.src_dir)+1:]
                self._process_file(source)
        self._create_xpi()

        self._save_dependencies_cache(self.dependencies)

    def _generate_chrome_manifest(self, source, target, min_version, max_version):
        source = os.path.join(self.src_dir, source)
        target = os.path.join(self.build_dir, target)
        print("Convert %s to %s" % (source, target))

        os.makedirs(os.path.dirname(target), exist_ok=True)

        with open(source, "rt") as source_file:
            with open(target, "wt") as target_file:
                for line in source_file:
                    line = line.strip()
                    for version in range(min_version, max_version+1):
                        w = line.replace("@VERSION@", str(version))
                        if version != min_version:
                            w = w + " appversion>=" + str(version) + "a1"
                        target_file.write(w + "\n")

    def _process_file(self, source):
        if source in ["chrome.manifest.in", "install.rdf.in"]:
            target = source[:-3]
            override = False
            if "override-version" in self.config or "target-version" in self.config:
                target = target + ".override"
                override = True

            if override or self._is_need_update(target, source):
                if source == "install.rdf.in":
                    self._generate_install_manifest(source, target)
                else:
                    self._generate_chrome_manifest(source, target,
                                               min(self.app_versions),
                                               max(self.app_versions))

            if override:
                self.result_files.append([os.path.join(self.build_dir, target), target[:-9]])
            else:
                self.result_files.append([os.path.join(self.build_dir, target), target])
        elif source.endswith(".inc.css"):
            pass
        elif source.startswith(self.shared_dir + "/"):
            for app_version in self.app_versions:
                target = re.sub(r"^"+self.shared_dir,
                                "chrome-" + str(app_version),
                                source)

                if os.path.exists(os.path.join(self.src_dir, target)):
                    continue

                if source.endswith(".css"):
                    deps = self._get_dependencies(source)
                    if self._is_need_update(target, dependencies=deps):
                        self._preprocess(source, target, app_version)
                    self.result_files.append([os.path.join(self.build_dir, target), target])
                else:
                    self.result_files.append([os.path.join(self.src_dir, source), target])
        else:
            if source.startswith("chrome-"):
                version = source.replace("chrome-", "")
                version = int(re.sub(r"\/.*", "", version))
                if not version in self.app_versions:
                    return

            target = source

            deps = [source]
            if source in self.dependencies:
                deps = deps + self.dependencies[source]

            if source.endswith(".css"):
                if self._is_need_update(target, dependencies=deps):
                    if source.startswith("chrome-"):
                        app_version = re.sub(r"^chrome-", "", source)
                        app_version = re.sub(r"\/.*", "", app_version)
                        app_version = int(app_version)
                    self._preprocess(source, target, app_version)
                self.result_files.append([os.path.join(self.build_dir, target), target])
            else:
                self.result_files.append([os.path.join(self.src_dir, source), target])

#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re
import time
import json
import subprocess

class CTBuilder():
    def __init__(self, config=None, build_dir=".build",
                 theme_dir="theme", extension_dir="extension"):
        self.config = self._validate_config(config)

        self.build_dir = os.path.normpath(build_dir)
        self.theme_dir = os.path.normpath(theme_dir)
        self.extension_dir = os.path.normpath(extension_dir)
        self.build_theme_dir = os.path.join(
                             self.build_dir,
                             os.path.basename(self.theme_dir))
        #self.build_extension_dir = os.path.join(
        #                         self.build_dir,
        #                         os.path.basename(self.extension_dir))

        self.shared_dir = self.config["directory-structure"]["shared-dir"]

        self.default_dependencies = {
            "theme/install.rdf.in": ["config.json"],
            "theme/chrome.manifest.in": ["config.json"],
        }

        os.makedirs(self.build_dir, exist_ok=True)

    def _validate_config(self, config):
        if "version" in config:
            version = config["version"]

            for i in ["theme", "extension", "package"]:
                config["xpi"][i] = config["xpi"][i].replace("@VERSION@", version)

        if not "directory-structure" in config:
            config["directory-structure"] = {}
            config["directory-structure"]["shared-dir"] = "shared"

        return config

    def build_theme(self):
        self.app_versions = []
        for name in os.listdir(self.theme_dir):
            if name.startswith("chrome-"):
                version = int(name.replace("chrome-", ""))
                self.app_versions.append(version)

        self.dependencies = self._load_dependencies_cache()

        for base, dirs, files in os.walk(self.theme_dir):
            for name in files:
                self._process_file(os.path.join(base, name))

        self._save_dependencies_cache(self.dependencies)

        self._archive(self.build_theme_dir, self.config["xpi"]["theme"])

    def build_extension(self):
        self._archive(self.extension_dir, self.config["xpi"]["extension"])

    def build_package(self):
        subprocess.call(["zip", "-FS", "-r", self.config["xpi"]["package"],
                         "install.rdf", self.config["xpi"]["theme"],
                         self.config["xpi"]["extension"]])

    def _load_dependencies_cache(self):
        path = os.path.join(self.build_dir, "deps.cache")
        if not os.path.exists(path):
            return self.default_dependencies
        with open(path, "r") as cache_file:
            return json.load(cache_file)

    def _save_dependencies_cache(self, deps):
        with open(os.path.join(self.build_dir, "deps.cache"), "w") as cache_file:
            json.dump(deps, cache_file)

    def _is_need_update(self, target, dependencies=None):
        if not os.path.exists(target):
            return True

        target_mtime = os.path.getmtime(target)
        for source in dependencies:
            if os.path.getmtime(source) > target_mtime:
                return True

        return False

    def _archive(self, source, target):
        saved_path = os.getcwd()
        zip_archive = os.path.abspath(target)
        os.chdir(source)
        subprocess.call("zip -FS -r " + zip_archive + " *", shell=True)
        os.chdir(saved_path)

    def _generate_manifest(self, source, target, manifest_type="chrome"):
        print("Convert " + source + " to " + target)

        os.makedirs(os.path.dirname(target), exist_ok=True)

        if manifest_type == "chrome":
            subprocess.call(["build/manifest.sh",
                            "-m", str(min(self.app_versions)),
                            "-M", str(max(self.app_versions)),
                            source, target])
        else:
            cmd = "sed"
            cmd = cmd + " -e s,[@]VERSION[@]," + self.config["version"] + ",g"
            cmd = cmd + " -e s,[@]MIN_VERSION[@]," + self.config["min-version"] + ",g"
            cmd = cmd + " -e s,[@]MAX_VERSION[@]," + self.config["max-version"] + ",g"
            cmd = cmd + " < '" + source + "' > '" + target + "'"
            subprocess.call(cmd, shell=True)

    def _copy(self, source, target):
        print("Copy " + source + " to " + target)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        subprocess.call(["cp", source, target])

    def _preprocess(self, source, target, current_version):
        print("Convert " + source + " to " + target)

        deps_tmp_file = os.path.join(self.build_dir, "deps.tmp")

        os.makedirs(os.path.dirname(target), exist_ok=True)
        a = subprocess.call(["python2", "build/preprocessor.py",
                         "--marker=%",
                         "--depend=" + deps_tmp_file,
                         "-D", "APP_VERSION="+str(current_version)+"",
                         "--output="+target, source])

        line = open(deps_tmp_file, "r").readline()
        line = re.sub(r"^[^:]*:", "", line)
        line = line.replace(os.path.abspath(self.theme_dir), self.theme_dir)
        line = line.replace(source, "")
        line = line.strip()

        if line:
            deps = line.split(" ")
            self._update_dependencies(source, deps)

        #os.remove(deps_tmp_file)

    def _update_dependencies(self, source, deps):
        if len(deps) == 0 and source in self.dependencies:
            del self.dependencies[source]
        elif len(deps) > 0:
            self.dependencies[source] = deps

    def _process_file(self, source):
        source_short = source[len(self.theme_dir)+1:]

        if source_short in ["chrome.manifest.in", "install.rdf.in"]:
            target = os.path.join(self.build_theme_dir, source_short[:-3])

            deps = [source]
            if source in self.dependencies:
                deps = deps + self.dependencies[source]

            if not self._is_need_update(target, deps):
                return

            if source_short == "chrome.manifest.in":
                self._generate_manifest(source, target, manifest_type="chrome")
            else:
                self._generate_manifest(source, target, manifest_type="install")
        elif source_short.endswith(".inc.css"):
            pass
        elif source_short.startswith(self.shared_dir + "/"):
            for app_version in self.app_versions:
                sub_path = re.sub(r"^"+self.shared_dir, "chrome-" + str(app_version),
                                  source_short)

                if os.path.exists(os.path.join(self.theme_dir, sub_path)):
                    continue

                target = os.path.join(self.build_theme_dir, sub_path)

                deps = [source]
                if source in self.dependencies:
                    deps = deps + self.dependencies[source]

                if not self._is_need_update(target, deps):
                    continue

                if source_short.endswith(".css"):
                    self._preprocess(source, target, app_version)
                else:
                    self._copy(source, target)
        else:
            target = os.path.join(self.build_theme_dir, source_short)

            deps = [source]
            if source in self.dependencies:
                deps = deps + self.dependencies[source]

            if not self._is_need_update(target, deps):
                return

            if source_short.endswith(".css"):
                if source_short.startswith("chrome-"):
                    app_version = re.sub(r"^chrome-", "", source_short)
                    app_version = re.sub(r"\/.*", "", app_version)
                    app_version = int(app_version)
                self._preprocess(source, target, app_version)
            else:
                self._copy(source, target)

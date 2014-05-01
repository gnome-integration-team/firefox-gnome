#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys
import os
import re
import time
import json
import subprocess
import zipfile

class AddonBuilder():
    def __init__(self, src_dir=".", build_dir=".build", config_file="config.json"):
        self.config = self._load_config(config_file)
        if "VERSION" in os.environ:
            self.config["override-version"] = True
            self.config["version"] = os.environ.get("VERSION")
        self.config = self._validate_config(self.config)

        self.src_dir = os.path.normpath(src_dir)
        self.build_dir = os.path.normpath(build_dir)

        self.dependencies = {}

        os.makedirs(self.build_dir, exist_ok=True)

    def _load_config(self, path):
        try:
            with open(path, "r") as config_file:
                config = json.load(config_file)
                return config
        except FileNotFoundError:
            print("%s: %s not found" % (sys.argv[0], path))
            sys.exit(1)
        except ValueError as e:
            print("%s: parse error: %s" % (sys.argv[0], path))
            print(e)
            sys.exit(1)

    class ConfigError(RuntimeError):
        def __init__(self, message):
            self.message = message

    def _validate_config(self, config):
        try:
            if not "version" in config and not "override-version" in config:
                raise AddonBuilder.ConfigError("version is not specified")

            if not "min-version" in config:
                raise AddonBuilder.ConfigError("min-version is not specified")

            if not "max-version" in config:
                raise AddonBuilder.ConfigError("max-version is not specified")

            if not "xpi" in config:
                raise AddonBuilder.ConfigError("file name for *.xpi is not specified")
        except AddonBuilder.ConfigError as e:
            print("%s: %s" % (sys.argv[0], e.message))
            sys.exit(1)

        x = "xpi"
        for i in ["theme", "extension", "package"]:
            if i in config[x]:
                config[x][i] = config[x][i].replace("@VERSION@", config["version"])

        return config

    def build(self):
        self.result_files = []

        for base, dirs, files in os.walk(self.src_dir):
            for name in files:
                source = os.path.join(base, name)[len(self.src_dir)+1:]
                self._process_file(source)

        xpi = zipfile.ZipFile(self.xpi_file, "w")
        for i in self.result_files:
            xpi.write(i[0], i[1]) # source, path_inside_xpi
        xpi.close()

        del self.result_files

    def _process_file(self, source):
        if source == "install.rdf.in":
            target = source[:-3]
            if self._is_need_update(target, source) or "override-version" in self.config:
                self._generate_install_manifest(source, target)
            self.result_files.append([os.path.join(self.build_dir, target), target])
        else:
            target = source
            self.result_files.append([os.path.join(self.src_dir, source), target])

    def _is_need_update(self, target, source=None, dependencies=None):
        target_full = os.path.join(self.build_dir, target)

        if not os.path.exists(target_full):
            return True

        if not dependencies and source:
            dependencies = [source]
            if source in self.dependencies:
                dependencies = dependencies + (self.dependencies[source])

        target_mtime = os.path.getmtime(target_full)
        for f in dependencies:
            if os.path.getmtime(os.path.join(self.src_dir, f)) > target_mtime:
                return True

        return False

    def _get_dependencies(self, source):
        deps = [source]
        if source in self.dependencies:
            deps = deps + self.dependencies[source]
        return deps

    def _generate_install_manifest(self, source, target):
        source = os.path.join(self.src_dir, source)
        target = os.path.join(self.build_dir, target)
        print("Convert %s to %s" % (source, target))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        cmd = "sed"
        cmd = cmd + " -e s,[@]VERSION[@]," + self.config["version"] + ",g"
        cmd = cmd + " -e s,[@]MIN_VERSION[@]," + self.config["min-version"] + ",g"
        cmd = cmd + " -e s,[@]MAX_VERSION[@]," + self.config["max-version"] + ",g"
        cmd = cmd + " < '" + source + "' > '" + target + "'"
        subprocess.call(cmd, shell=True)

    def _preprocess(self, source, target, app_version=None):
        source_full = os.path.join(self.src_dir, source)
        target_full = os.path.join(self.build_dir, target)
        print("Convert %s to %s" % (source_full, target_full))

        deps_tmp_file = os.path.join(self.build_dir, "deps.tmp")
        os.makedirs(os.path.dirname(deps_tmp_file), exist_ok=True)

        os.makedirs(os.path.dirname(target_full), exist_ok=True)

        variables = []
        if app_version:
            variables = ["-D", "APP_VERSION="+str(app_version)]

        cmd = []
        cmd = cmd + ["python2", "build/preprocessor.py", "--marker=%"]
        cmd = cmd + ["--depend="+deps_tmp_file]
        cmd = cmd + variables
        cmd = cmd + ["--output="+target_full, source_full]

        subprocess.call(cmd)

        line = open(deps_tmp_file, "r").readline()
        line = re.sub(r"^[^:]*:", "", line)
        line = line.replace(os.path.abspath(self.src_dir)+"/", "")
        line = line.replace(source_full, "")
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

    def _load_dependencies_cache(self):
        path = os.path.join(self.build_dir, "deps.cache")
        if not os.path.exists(path):
            return self.default_dependencies
        with open(path, "r") as cache_file:
            return json.load(cache_file)

    def _save_dependencies_cache(self, deps):
        with open(os.path.join(self.build_dir, "deps.cache"), "w") as cache_file:
            json.dump(deps, cache_file)


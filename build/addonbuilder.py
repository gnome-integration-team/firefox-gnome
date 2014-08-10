# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from __future__ import (print_function)

import sys
import os
import re
import time
import json
import subprocess
import zipfile

import console

class AddonBuilder():
    def __init__(self, config, src_dir=".", build_dir=".build"):
        self.config = config

        self.src_dir = os.path.normpath(src_dir)
        self.build_dir = os.path.normpath(build_dir)

        self.dependencies = {}
        self.default_dependencies = {
            "install.rdf": ["../config.json"],
            "chrome.manifest": ["../config.json"]
        }

        if not os.path.isdir(self.build_dir):
            os.makedirs(self.build_dir) # exist_ok=True

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
        elif source.startswith("shared/"):
            for app_version in self.app_versions:
                target = re.sub(r"^shared", "chrome-" + str(app_version), source)

                if os.path.exists(os.path.join(self.src_dir, target)):
                    continue

                if source.endswith(".css"):
                    deps = self._get_dependencies(source, target)
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
            else:
                version = None

            target = source

            if source.endswith(".css"):
                deps = self._get_dependencies(source, target)
                if self._is_need_update(target, dependencies=deps):
                    self._preprocess(source, target, version)
                self.result_files.append([os.path.join(self.build_dir, target), target])
            else:
                self.result_files.append([os.path.join(self.src_dir, source), target])

    def _is_need_update(self, target, source=None, dependencies=None):
        if self.config["force-rebuild"]:
            return True

        target_full = os.path.join(self.build_dir, target)

        if not os.path.exists(target_full):
            return True

        if not dependencies and source:
            dependencies = self._get_dependencies(source, target)

        target_mtime = os.path.getmtime(target_full)
        for i in dependencies:
            d = os.path.join(self.src_dir, i)
            if not os.path.exists(d) or os.path.getmtime(d) > target_mtime:
                return True

        return False

    def _get_dependencies(self, source, target):
        deps = [source]
        if target in self.dependencies:
            deps = deps + self.dependencies[target]
        return deps

    def _generate_install_manifest(self, source, target):
        source = os.path.join(self.src_dir, source)
        target = os.path.join(self.build_dir, target)
        if not self.config["verbose"]:
            console.log("generating", target)
        else:
            console.log("generating", "%s from %s" % (target, source))

        if not os.path.isdir(os.path.dirname(target)):
            os.makedirs(os.path.dirname(target)) # exist_ok=True

        with open(source, "rt") as source_file:
            with open(target, "wt") as target_file:
                for l in source_file:
                    l = l.replace("@VERSION@", str(self.config["version"]))
                    l = l.replace("@MIN_VERSION@", str(self.config["min-version"]))
                    l = l.replace("@MAX_VERSION@", str(self.config["max-version"]))
                    target_file.write(l)

    def _generate_chrome_manifest(self, source, target, min_version, max_version):
        source = os.path.join(self.src_dir, source)
        target = os.path.join(self.build_dir, target)
        if not self.config["verbose"]:
            console.log("generating", target)
        else:
            console.log("generating", "%s from %s" % (target, source))

        if not os.path.isdir(os.path.dirname(target)):
            os.makedirs(os.path.dirname(target)) # exist_ok=True

        with open(source, "rt") as source_file:
            with open(target, "wt") as target_file:
                for line in source_file:
                    line = line.strip()
                    if "@VERSION@" in line:
                        for version in range(min_version, max_version+1):
                            nl = line.replace("@VERSION@", str(version))
                            if version != min_version:
                                nl = nl + " appversion>=%ia1" % version
                            target_file.write(nl + "\n")
                    else:
                        target_file.write(line + "\n")

    def _preprocess(self, source, target, app_version=None):
        source_full = os.path.join(self.src_dir, source)
        target_full = os.path.join(self.build_dir, target)
        if not self.config["verbose"]:
            console.log("preprocessor.py", "... %s" % target_full)
        else:
            console.log("preprocessor.py", "... %s from %s" % (target_full, source_full))

        deps_tmp_file = os.path.join(self.build_dir, "deps.tmp")

        if not os.path.isdir(os.path.dirname(deps_tmp_file)):
            os.makedirs(os.path.dirname(deps_tmp_file)) # exist_ok=True

        if not os.path.isdir(os.path.dirname(target_full)):
            os.makedirs(os.path.dirname(target_full)) # exist_ok=True

        variables = []
        if app_version:
            variables = ["-D", "APP_VERSION="+str(app_version)]

        python2 = "python2"
        if "PYTHON2PATH" in os.environ:
            python2 = os.environ.get("PYTHON2PATH")
            if not (os.path.isfile(python2) or os.access(python2, os.X_OK)):
                print("Error: can't execute %s" % python2)
                print("Please check your PYTHON2PATH environment variable")
                sys.exit(1)

        cmd = []
        cmd = cmd + [python2, "build/preprocessor.py", "--marker=%"]
        cmd = cmd + ["--depend="+deps_tmp_file]
        cmd = cmd + variables
        cmd = cmd + ["--output="+target_full, source_full]

        try:
            subprocess.check_output(cmd, stderr=subprocess.STDOUT,
                                    universal_newlines=True)
        except subprocess.CalledProcessError as e:
            print("BuildError: preprocessor.py returned no zero code (%i)" % e.returncode)
            print("Command: \"%s\"" % " ".join(str(a) for a in cmd))
            print(e.output, end="")
            os.remove(target_full)
            sys.exit(2)

        line = open(deps_tmp_file, "r").readline()
        line = re.sub(r"^[^:]*:", "", line)
        line = line.replace(os.path.abspath(self.src_dir)+"/", "")
        line = line.replace(source_full, "")
        line = line.strip()

        if line:
            deps = line.split(" ")
            self._update_dependencies(target, deps)

        #os.remove(deps_tmp_file)

    def _create_xpi(self, files_map=None):
        if not files_map:
            files_map = self.result_files

        xpi = zipfile.ZipFile(self.xpi_file, "w", compression=zipfile.ZIP_DEFLATED)
        if not self.config["verbose"]:
            console.log("building xpi", self.xpi_file)
        for i in files_map:
            if self.config["verbose"]:
                console.log("archiving", "%s to @%s@/%s" % (i[0], self.xpi_file, i[1]))
            xpi.write(i[0], i[1]) # source, path_inside_xpi
        xpi.close()

    def _update_dependencies(self, target, deps):
        if len(deps) == 0 and target in self.dependencies:
            del self.dependencies[target]
        elif len(deps) > 0:
            self.dependencies[target] = deps

    def _load_dependencies_cache(self):
        path = os.path.join(self.build_dir, "deps.cache")
        if not os.path.exists(path):
            self.config["force-rebuild"] = True
            return self.default_dependencies
        with open(path, "r") as cache_file:
            return json.load(cache_file)

    def _save_dependencies_cache(self, deps):
        with open(os.path.join(self.build_dir, "deps.cache"), "w") as cache_file:
            json.dump(deps, cache_file)


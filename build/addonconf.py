# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys
import json

class ConfigError(RuntimeError):
    def __init__(self, message):
        self.message = message

def load(path="config.json"):
    config = None
    try:
        with open(path, "r") as config_file:
            config = json.load(config_file)
    except FileNotFoundError:
        print("%s: %s not found" % (sys.argv[0], path))
    except ValueError as e:
        print("%s: parse error: %s" % (sys.argv[0], path))
        print(e)
    return config

def validate(config, action):
    try:
        main_validate(config)
        if action in ["theme", "all"]:
            theme_validate(config)
        if action in ["extension", "all"]:
            extension_validate(config)
        if action == "all":
            package_validate(config)
        return config
    except ConfigError as e:
        print("%s: %s" % (sys.argv[0], e.message))
        return None

def main_validate(config):
    if not "version" in config:
        raise ConfigError("version is not specified")

    if not "min-version" in config:
        raise ConfigError("min-version is not specified")

    if not "max-version" in config:
        raise ConfigError("max-version is not specified")

    if not "xpi" in config:
        raise ConfigError("file name for *.xpi is not specified")

    for i in config["xpi"]:
        config["xpi"][i] = config["xpi"][i].replace("@VERSION@", config["version"])

def theme_validate(config):
    if not "theme" in config["xpi"]:
        raise ConfigError("file name for theme's .xpi is not specified")

    if not "directory-structure" in config:
        config["directory-structure"] = {}
        config["directory-structure"]["shared-dir"] = "shared"

def extension_validate(config):
    if not "extension" in config["xpi"]:
        raise ConfigError("file name for extension's .xpi is not specified")

def package_validate(config):
    if not "package" in config["xpi"]:
        raise ConfigError("file name for package's .xpi is not specified")


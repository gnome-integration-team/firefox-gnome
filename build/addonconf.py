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
    except IOError: # FileNotFoundError
        print("%s: %s not found" % (sys.argv[0], path))
    except ValueError as e:
        print("%s: parse error: %s" % (sys.argv[0], path))
        print(e)
    return config

def validate(config):
    try:
        main_validate(config)
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

    for addon in ["theme", "extension", "package"]:
        if not addon in config:
            continue

        if not "xpi" in config[addon]:
            raise ConfigError("file name for %s's .xpi is not specified" % addon)

        config[addon]["xpi"] = config[addon]["xpi"].replace("@VERSION@", config["version"])


#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

help() {
cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
   -h      Show this message
   -t      Make theme only
   -e      Make extension only
EOF
}

while getopts "hte" OPTION
do
    case $OPTION in
        t)
            BUILD_THEME_ONLY=true
            ;;
        e)
            BUILD_EXTENSION_ONLY=true
            ;;
        h)
            help
            exit
            ;;
        ?)
            help
            exit
            ;;
    esac
done

if [ ! $BUILD_EXTENSION_ONLY ]; then
    cd theme
    zip -FS -r ../gnome-firefox-theme.xpi *
    cd -
fi

if [ ! $BUILD_THEME_ONLY ]; then
    cd extension
    zip -FS -r ../gnome-firefox-extension.xpi *
    cd -
fi

if [ ! $BUILD_THEME_ONLY ] && [ ! $BUILD_EXTENSION_ONLY ]; then
    VERSION=$(grep em:version install.rdf | cut -f2 -d'>' | cut -f1 -d'<')
    zip -FS -r gnome-firefox-$VERSION.xpi gnome-firefox-theme.xpi gnome-firefox-extension.xpi install.rdf
fi


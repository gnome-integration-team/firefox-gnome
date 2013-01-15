#!/bin/bash

cd theme

VERSION=$(cat install.rdf | grep em:version | cut -f2 -d'>' | cut -f1 -d'<')

zip -FS -r ../gnome-firefox-$VERSION.xpi *

cd -

ln -sf gnome-firefox-$VERSION.xpi gnome-firefox.xpi

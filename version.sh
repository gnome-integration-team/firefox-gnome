#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

help() {
cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
  -v VERSION, --version=VERSION
                              Set version for theme, extension and package
  -M MAX_VERSION, --max-version=MAX_VERSION
                              Set max compatible version of Firefox
  -m MIN_VERSION, --min-version=MIN_VERSION
                              Set min compatible version of Firefox
  -h, --help                  Show this message
EOF
}

while :; do
    case $1 in
        -h | --help | -\?)
            help
            exit
            ;;
        -v | --version)
            VERSION=$2
            shift 2
            ;;
        --version=*)
            VERSION=${1#*=}
            shift
            ;;
        -m | --min-version)
            MIN_VERSION=$2
            shift 2
            ;;
        --min-version=*)
            MIN_VERSION=${1#*=}
            shift
            ;;
        -M | --max-version)
            MAX_VERSION=$2
            shift 2
            ;;
        --max-version=*)
            MAX_VERSION=${1#*=}
            shift
            ;;
        -*)
            printf >&2 'WARNING: Unknown option (ignored): %s\n' "$1"
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [ $VERSION ]; then
    sed --in-place "s/<em:version>[^<]*/<em:version>$VERSION/g" "install.rdf" "extension/install.rdf" "theme/install.rdf" || exit 1
fi

if [ $MIN_VERSION ]; then
    sed --in-place "s/<em:minVersion>[^<]*/<em:minVersion>$MIN_VERSION/g" "install.rdf" "extension/install.rdf" "theme/install.rdf" || exit 1
fi

if [ $MAX_VERSION ]; then
    sed --in-place "s/<em:maxVersion>[^<]*/<em:maxVersion>$MAX_VERSION/g" "install.rdf" "extension/install.rdf" "theme/install.rdf" || exit 1
fi

if [ ! $VERSION ] && [ ! $MAX_VERSION ] && [ ! $MAX_VERSION ]; then
    for i in Theme Extension Package; do
        echo "$i:"

        case $i in
            Theme)
                INSTALL_RDF="theme/install.rdf"
                ;;
            Extension)
                INSTALL_RDF="extension/install.rdf"
                ;;
            Package)
                INSTALL_RDF="install.rdf"
                ;;
        esac

        VERSION=$(grep em:version $INSTALL_RDF | cut -f2 -d'>' | cut -f1 -d'<')
        MIN_VERSION=$(grep em:minVersion $INSTALL_RDF | cut -f2 -d'>' | cut -f1 -d'<')
        MAX_VERSION=$(grep em:maxVersion $INSTALL_RDF | cut -f2 -d'>' | cut -f1 -d'<')

        echo "- Version:     $VERSION"
        echo "- Min version: $MIN_VERSION"
        echo "- Max version: $MAX_VERSION"

        if [ ! "$i" == "Package" ]; then
            echo
        fi
    done
fi

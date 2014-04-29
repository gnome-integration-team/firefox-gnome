#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

help() {
cat << EOF
Usage: $0 [OPTIONS] [SOURCE_FILE] [TARGET_FILE]

OPTIONS:
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
            if [ "$1" != "" ] && [ "$2" != "" ] && [ ! $3 ]; then
                IN=$1
                OUT=$2
                break
            fi
            ;;
    esac
done

MIN_VERSION=$(echo -n $MIN_VERSION | cut -f1 -d'.')
MAX_VERSION=$(echo -n $MAX_VERSION | cut -f1 -d'.')

echo -n > "$OUT"

while read r; do
    if [[ $r == *@VERSION@* ]]; then
        for i in $(seq $MIN_VERSION $MAX_VERSION); do
            if [ "$i" == "$MIN_VERSION" ]; then
                echo "$r" | sed -e "s,[@]VERSION[@],$i,g" >> "$OUT"
            else
                echo "$r  appversion>=@VERSION@a1" | sed -e "s,[@]VERSION[@],$i,g" >> "$OUT"
            fi
        done

    else
        echo "$r" >> "$OUT"
    fi
done < "$IN"

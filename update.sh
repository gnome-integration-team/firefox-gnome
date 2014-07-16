#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

help() {
cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
   -t      Set version to upgrade
   -c      Clean up
   -h      Show this message
EOF
}

while getopts "t:ch" OPTION
do
    case $OPTION in
        t)
            VERSION=$OPTARG
            ;;
        c)
            CLEAN_UP=true
            ;;
        h)
            help
            exit
            ;;
    esac
done

TEMP_DIR=".upgrade"

if [ $CLEAN_UP ]; then
    echo ":: Cleaning..."
    rm -r $TEMP_DIR
    exit
fi

if [ "$VERSION" == "" ]; then
    echo "ERROR: Please select a Firefox version to update. For example, 29.0b2"
    exit 1
fi

VERSION_SHORT=$(echo -n $VERSION | cut -f1 -d'.')
VERSION_LONG=$(echo -n $VERSION | sed "s/a/ alpha /" | sed "s/b/ beta /")

echo ":: Starting upgrade to $VERSION_LONG..."

echo ":: Checking environment..."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" != "vanilla" ]; then
    echo "ERROR: Current branch is \"$CURRENT_BRANCH\". Please enter \"git checkout vanilla\" to continue"
    exit 1
fi

mkdir $TEMP_DIR 2>/dev/null && cd $TEMP_DIR
if [ $? != 0 ]; then
    echo "ERROR: Cannot create temporary directory \""$TEMP_DIR"\""
    exit 1
fi

echo ":: Downloading tarball..."

case $VERSION in
    *a1)
        URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-mozilla-central/firefox-$VERSION.en-US.linux-x86_64.tar.bz2"
        ;;
    *a2)
        URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-mozilla-aurora/firefox-$VERSION.en-US.linux-x86_64.tar.bz2"
        ;;
    *)
        URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/$VERSION/linux-x86_64/en-US/firefox-$VERSION.tar.bz2"
        ;;
esac

echo "$URL"
curl --remote-time -o "firefox-$VERSION.tar.bz2" "$URL" || exit 2

FILE_TYPE=$(file "firefox-$VERSION.tar.bz2");
REMOTE_TIME=$(date --utc --date="@`stat -c %Y firefox-$VERSION.tar.bz2`" "+%d-%b-%Y %H:%M")

if [[ $FILE_TYPE != *"compressed data"* ]]; then
    echo "ERROR: Download failed. Please check Firefox version"
    cd ..
    rm -r $TEMP_DIR
    exit 2
fi

echo ":: Unpacking..."
echo "firefox-$VERSION.tar.bz2"
tar jxf "firefox-$VERSION.tar.bz2" "firefox/omni.ja" "firefox/browser/omni.ja" || exit 2

echo "omni.ja"
unzip "firefox/omni.ja" -d "firefox/omni/" > /dev/null 2>&1
echo "browser/omni.ja"
unzip "firefox/browser/omni.ja" -d "firefox/browser/omni/" > /dev/null 2>&1

echo ":: Moving files..."

mkdir -p "../theme/chrome-$VERSION_SHORT/"
rm -r "../theme/chrome-$VERSION_SHORT/browser"
rm -r "../theme/chrome-$VERSION_SHORT/global"
rm -r "../theme/chrome-$VERSION_SHORT/mozapps"

echo "chrome/browser"
mv "firefox/browser/omni/chrome/browser/skin/classic/browser" "../theme/chrome-$VERSION_SHORT/browser"
echo "chrome/global"
mv "firefox/omni/chrome/toolkit/skin/classic/global" "../theme/chrome-$VERSION_SHORT/global"
echo "chrome/mozapps"
mv "firefox/omni/chrome/toolkit/skin/classic/mozapps" "../theme/chrome-$VERSION_SHORT/mozapps"

echo ":: Cleaning..."
cd ..
rm -r $TEMP_DIR

echo ":: Creating commit..."
cd "theme"
git add -A .

if [[ $VERSION == *a* ]]; then
    git commit -m "Upgrade to Firefox $VERSION ($REMOTE_TIME)"
else
    git commit -m "Upgrade to Firefox $VERSION_LONG"
fi

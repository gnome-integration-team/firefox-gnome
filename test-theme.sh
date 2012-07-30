#!/bin/bash

PROFILE=default

source ./make-xpi.sh
cp adwaita-firefox.xpi ~/.mozilla/firefox/*.${PROFILE}/extensions/{451500c0-902c-11e0-91e4-0800200c9a66}.xpi

killall firefox firefox-bin &>/dev/null; firefox &

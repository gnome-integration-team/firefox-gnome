#!/bin/bash

PROFILE=default

source ./make-xpi.sh
for directory in ~/.mozilla/firefox/*.${PROFILE}
do
    cp adwaita-firefox.xpi $directory/extensions/{451500c0-902c-11e0-91e4-0800200c9a66}.xpi
done

killall firefox firefox-bin &>/dev/null; firefox &

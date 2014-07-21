## GNOME theme for Firefox

(This is the theme previously known as "Adwaita".)

An easy-to-install version of this theme is available at 
[Mozilla's ADD-ONS site](https://addons.mozilla.org/en-US/firefox/addon/adwaita).  
Bleeding edge releases are available [here](https://launchpad.net/gnome-integration/firefox-gnome/firefox-gnome-releases).

For current issues please see the 
[bug tracker](https://github.com/gnome-integration-team/firefox-gnome/issues).

Help & feedback are both appreciated! ;-)

### How to build

You can use __make-xpi.py__ script to build xpi and clean temporary files:

```Bash
$ ./make-xpi.py [TARGET]
$ python3 make-xpi.py [TARGET]
```

Available targets: _all_, _theme_, _extension_ and _clean_. Default is _all_.

For more details please check
[this page](https://github.com/seleznev/firefox-complete-theme-build-system#firefox-complete-theme-build-system).

### Screenshots

Tabs on top:

![Screenshot](https://raw.github.com/gnome-integration-team/firefox-gnome/master/screenshots/screenshot-tabs-on-top.png)

Tabs on bottom:

![Screenshot](https://raw.github.com/gnome-integration-team/firefox-gnome/master/screenshots/screenshot-tabs-on-bottom.png)

If you'd like to change tab positions or any additional settings, 
please install [GNOME Theme Tweak](https://addons.mozilla.org/en-US/firefox/addon/gnome-theme-tweak/)
(an extension we also make).

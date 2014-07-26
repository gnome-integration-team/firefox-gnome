# GNOME 3 theme for Firefox

You can install latest stable version from [Mozilla's Add-ons](https://addons.mozilla.org/firefox/addon/adwaita/) or get bleeding edge releases from [Launchpad](https://launchpad.net/gnome-integration/firefox-gnome/firefox-gnome-releases).

List of current issues is available at our [bug tracker](https://github.com/gnome-integration-team/firefox-gnome/issues).

Help & feedback are both appreciated! ;-)

## How to build

You can use __make-xpi.py__ script to build xpi and clean temporary files:

```Bash
$ ./make-xpi.py [TARGET]
$ python3 make-xpi.py [TARGET]
```

Available targets: _all_, _theme_, _extension_ and _clean_. Default is _all_.

For more details please check
[this page](https://github.com/seleznev/firefox-complete-theme-build-system#firefox-complete-theme-build-system).

## Screenshots

Default:

![Screenshot](screenshots/screenshot-theme.png)

With some tweaks enabled:

![Screenshot](screenshots/screenshot-tweaks.png)

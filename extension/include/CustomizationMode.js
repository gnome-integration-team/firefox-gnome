/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var CustomizationMode = {
    _addLink: function(window) {
        if (!window) return;

        var element = window.document.getElementById("customization-toolbar-visibility-button");
        if (!element) return;

        var cmd = "openUILinkIn('chrome://gnome-theme-tweak/content/options.xul', 'current');"; // 'tab'

        var link = window.document.createElement("label");
        link.setAttribute("id", "customization-gnome-tweaks-link");
        link.setAttribute("class", "text-link customizationmode-link");
        link.setAttribute("value", "GNOME Tweaks"); // Localization?
        link.setAttribute("onclick", cmd);

        element.parentNode.insertBefore(link, element.nextSibling);
    },

    _removeLink: function(window) {
        if (!window) return;
        var button = window.document.getElementById("customization-gnome-tweaks-link");
        button && button.remove();
    }
}

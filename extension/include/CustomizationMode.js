/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var CustomizationMode = {
    _addLink: function(window) {
        if (!window) return;

        var button1 = window.document.getElementById("customization-toolbar-visibility-button");
        var button2 = window.document.getElementById("customization-lwtheme-button"); // Fx 34+

        var element = button2 ? button2 : button1;
        if (!element)
            return;

        var open_prefs = "BrowserOpenAddonsMgr('addons://detail/' + encodeURIComponent('{05f1cdaa-7474-43fa-9f69-c697555f4ea8}') + '/preferences');"

        var link = window.document.createElement("label");
        link.setAttribute("id", "customization-gnome-tweaks-link");
        link.setAttribute("class", "text-link customizationmode-link");
        link.setAttribute("value", "GNOME Tweaks"); // Localization?
        link.setAttribute("onclick", open_prefs);

        element.parentNode.insertBefore(link, element.nextSibling);
    },

    _removeLink: function(window) {
        if (!window) return;
        var button = window.document.getElementById("customization-gnome-tweaks-link");
        button && button.remove();
    }
}

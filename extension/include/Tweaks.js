/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var Tweaks = {
    /*
    exampleTweak: {
        key: "example-tweak",
        enable: function() {
            // do something...
        },
        disable: function() {
            // do something...
        },
    },
    */

    customizationGnomeTweaksLink: {
        enable: function() {
            if (!this._isEnabled) {
                GNOMEThemeTweak.addListener("loadWindow", this._addLink);
                GNOMEThemeTweak.launchIntoExistingWindows(this._addLink);
                this._isEnabled = true;
            }
        },

        disable: function() {
            if (this._isEnabled) {
                GNOMEThemeTweak.removeListener("loadWindow", this._addLink);
                GNOMEThemeTweak.launchIntoExistingWindows(this._removeLink);
                this._isEnabled = false;
            }
        },

        _isEnabled: false,

        _addLink: function(window) {
            if (!window) return;

            var element = window.document.getElementById("customization-toolbar-visibility-button");
            if (!element) return;

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
        },
    },

    newtabPage: {
        key: "newtab-page",
        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.loadStyle(this.key);
                this._isEnabled = true;
            }
        },
        disable: function() {
            this._isEnabled && GNOMEThemeTweak.unloadStyle(this.key); this._isEnabled = false;
        },
        _isEnabled: false
    },

    tabsOnBottom: {
        key: "tabs-on-top",

        enable: function() {
            if (!this._isEnabled && !GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.addListener("sizeModeChange", this._moveWindowControlsToNavbar);
                GNOMEThemeTweak.addListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._setAttributes);
                GNOMEThemeTweak.loadStyle(this.key);
                this._isEnabled = true;
            }
        },

        disable: function() {
            if (this._isEnabled) {
                GNOMEThemeTweak.removeListener("sizeModeChange", this._moveWindowControlsToNavbar);
                GNOMEThemeTweak.launchIntoExistingWindows(this._moveWindowControlsToTabsbar);

                GNOMEThemeTweak.removeListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._removeAttributes);
                GNOMEThemeTweak.unloadStyle(this.key);
                this._isEnabled = false;
            }
        },

        _isEnabled: false,

        _moveWindowControlsToNavbar: function(window) {
            var windowctls = window.document.getElementById("window-controls");
            var navbar = window.document.getElementById("nav-bar");
            if (navbar != windowctls.parentNode)
                navbar.appendChild(windowctls);
        },

        _moveWindowControlsToTabsbar: function(window) {
            var windowctls = window.document.getElementById("window-controls");
            var tabsbar = window.document.getElementById("TabsToolbar");
            if (tabsbar != windowctls.parentNode)
                tabsbar.appendChild(windowctls);
        },

        _setAttributes: function(window) {
            if (!window) return;
            var e = ["navigator-toolbox", "nav-bar", "TabsToolbar"];
            for (var i=0; i < e.length; i++) {
                var item = window.document.getElementById(e[i]);
                item && item.setAttribute("tabsontop", false);
            }
        },

        _removeAttributes: function(window) {
            if (!window) return;
            var e = ["navigator-toolbox", "nav-bar", "TabsToolbar"];
            for (var i=0; i < e.length; i++) {
                var item = window.document.getElementById(e[i]);
                item && item.removeAttribute("tabsontop");
            }
        },
    },

    tabsBorder: {
        key: "tabs-border",
        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.loadStyle(this.key);
                this._isEnabled = true;
            }
        },
        disable: function() {
            this._isEnabled && GNOMEThemeTweak.unloadStyle(this.key); this._isEnabled = false;
        },
        _isEnabled: false
    },

    urlbarHistoryDropmarker: {
        key: "urlbar-history-dropmarker",
        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.loadStyle(this.key);
                this._isEnabled = true;
            }
        },
        disable: function() {
            this._isEnabled && GNOMEThemeTweak.unloadStyle(this.key); this._isEnabled = false;
        },
        _isEnabled: false
    },

    forwardButton: {
        key: "forward-button",

        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.addListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._setAttributes);
                this._isEnabled = true;
            }
        },

        disable: function() {
            if (this._isEnabled) {
                GNOMEThemeTweak.removeListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._removeAttributes);
                this._isEnabled = false;
            }
        },

        _isEnabled: false,

        _setAttributes: function(window) {
            if (!window) return;

            var ai = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
            var vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
            var element_id = vc.compare(ai.version, "29.0a1") >= 0 ? "urlbar-container" : "unified-back-forward-button";

            var toolbaritem = window.document.getElementById(element_id);
            toolbaritem && toolbaritem.setAttribute("forwardshowalways", true);
        },

        _removeAttributes: function(window) {
            if (!window) return;

            var ai = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
            var vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
            var element_id = vc.compare(ai.version, "29.0a1") >= 0 ? "urlbar-container" : "unified-back-forward-button";

            var toolbaritem = window.document.getElementById(element_id);
            toolbaritem && toolbaritem.removeAttribute("forwardshowalways");
        },
    },

    inactiveState: {
        key: "inactive-state",
        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.loadStyle(this.key);
                this._isEnabled = true;
            }
        },
        disable: function() {
            this._isEnabled && GNOMEThemeTweak.unloadStyle(this.key); this._isEnabled = false;
        },
        _isEnabled: false
    },

    reliefButtons: {
        key: "relief-buttons",

        enable: function() {
            if (!this._isEnabled && GNOMEThemeTweak.prefs.getBoolPref(this.key)) {
                GNOMEThemeTweak.addListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._setAttributes);
                this._isEnabled = true;
            }
        },

        disable: function() {
            if (this._isEnabled) {
                GNOMEThemeTweak.removeListener("loadWindow", this._setAttributes);
                GNOMEThemeTweak.launchIntoExistingWindows(this._removeAttributes);
                this._isEnabled = false;
            }
        },

        _isEnabled: false,

        _setAttributes: function(window) {
            if (!window) return;
            var navbar = window.document.getElementById("nav-bar");
            navbar && navbar.setAttribute("reliefbuttons", true);
        },

        _removeAttributes: function(window) {
            if (!window) return;
            var navbar = window.document.getElementById("nav-bar");
            navbar && navbar.removeAttribute("reliefbuttons");
        },
    },
}

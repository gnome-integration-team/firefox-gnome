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

    customizationGnomeTweaksButton: {
        enable: function() {
            if (!this._isEnabled) {
                GNOMEThemeTweak.loadStyle("customization-gnome-tweaks-button");
                GNOMEThemeTweak.addListener("loadWindow", this._addButton);
                GNOMEThemeTweak.launchIntoExistingWindows(this._addButton);
                this._isEnabled = true;
            }
        },

        disable: function() {
            if (this._isEnabled) {
                GNOMEThemeTweak.removeListener("loadWindow", this._addButton);
                GNOMEThemeTweak.launchIntoExistingWindows(this._removeButton);
                GNOMEThemeTweak.unloadStyle("customization-gnome-tweaks-button");
                this._isEnabled = false;
            }
        },

        _isEnabled: false,

        _addButton: function(window) {
            if (!window) return;

            var element = window.document.getElementById("customization-toolbar-visibility-button");
            if (!element) return;

            var button = window.document.createElement("button");
            button.setAttribute("id", "customization-gnome-tweaks-button");
            button.setAttribute("class", "customizationmode-button");

            element.parentNode.insertBefore(button, element.nextSibling);
        },

        _removeButton: function(window) {
            if (!window) return;
            var button = window.document.getElementById("customization-gnome-tweaks-button");
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

    tabsOnTop: {
        key: "tabs-on-top",

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
            var e = ["navigator-toolbox", "nav-bar", "TabsToolbar"];
            for (var i=0; i < e.length; i++) {
                var item = window.document.getElementById(e[i]);
                item && item.setAttribute("tabsontop", true);
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

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
            var toolbaritem = window.document.getElementById("unified-back-forward-button");
            toolbaritem && toolbaritem.setAttribute("forwardshowalways", true);
        },

        _removeAttributes: function(window) {
            if (!window) return;
            var toolbaritem = window.document.getElementById("unified-back-forward-button");
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

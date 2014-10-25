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

    tabMaxWidth: {
        key: "tab-max-width",
        type: "attribute",
        elements: ["tabbrowser-tabs"],
        attributeName: "tabmaxwidth",
        attributeValue: function() {
            switch (GNOMEThemeTweak.prefs.getIntPref(this.key)) {
                case 1:
                    return "small";
                case 2:
                    return "normal";
                case 3:
                    return "large";
                case 4:
                    return "stretch";
                default:
                    return "default";
            }
        }
    },

    urlbarHistoryDropmarker: {
        key: "urlbar-history-dropmarker",
        type: "attribute",
        elements: ["urlbar"],
        attributeName: "hidehistorydropmarker"
    },

    inactiveState: {
        key: "inactive-state",
        type: "stylesheet"
    },

    reliefButtons: {
        key: "relief-buttons",
        type: "attribute",
        elements: ["nav-bar", "bookmarked-notification-anchor"],
        attributeName: "reliefbuttons"
    },

    disablePopupAnimation: {
        key: "disable-popup-animation",
        type: "stylesheet"
    },

    darkVariant: {
        key: "dark-variant",
        type: "attribute",
        elements: ["main-window", "navigator-toolbox",
                   "TabsToolbar", "nav-bar", "PersonalToolbar",
                   "urlbar", "identity-box", "notification-popup-box"],
        attributeName: "darkvariant",
        attributeValue: function() {
            switch (GNOMEThemeTweak.prefs.getIntPref(this.key)) {
                case 2:
                    return "full";
                default:
                    return "toolbar";
            }
        }
    },
}

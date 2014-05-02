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

    newStyleTabs: {
        key: "new-style-tabs",
        type: "attribute",
        elements: ["navigator-toolbox", "nav-bar", "TabsToolbar"],
        attributeName: "newstyletabs",
        attributeValue: "true"
    },

    newtabPage: {
        key: "newtab-page",
        type: "stylesheet"
    },

    tabsOnTop: {
        key: "tabs-on-top",
        type: "attribute",
        elements: ["navigator-toolbox", "nav-bar", "TabsToolbar"],
        attributeName: "tabsontop"
    },

    tabsBorder: {
        key: "tabs-border",
        type: "attribute",
        elements: ["TabsToolbar"],
        attributeName: "bottomborder",
        attributeValue: "false"
    },

    urlbarHistoryDropmarker: {
        key: "urlbar-history-dropmarker",
        type: "attribute",
        elements: ["urlbar"],
        attributeName: "hidehistorydropmarker"
    },

    forwardButton: {
        key: "forward-button",
        type: "attribute",
        elements: ["urlbar-container"],
        attributeName: "forwardshowalways"
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
}

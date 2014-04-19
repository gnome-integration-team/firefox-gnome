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
        nodes: ["TabsToolbar"],
        attribute: "newstyletabs"
    },

    newtabPage: {
        key: "newtab-page",
        type: "stylesheet"
    },

    tabsOnTop: {
        key: "tabs-on-top",
        type: "attribute",
        nodes: ["navigator-toolbox", "nav-bar", "TabsToolbar"],
        attribute: "tabsontop"
    },

    tabsBorder: {
        key: "tabs-border",
        type: "stylesheet"
    },

    urlbarHistoryDropmarker: {
        key: "urlbar-history-dropmarker",
        type: "attribute",
        nodes: ["urlbar"],
        attribute: "hidehistorydropmarker"
    },

    forwardButton: {
        key: "forward-button",
        type: "attribute",
        nodes: ["urlbar-container"],
        attribute: "forwardshowalways"
    },

    inactiveState: {
        key: "inactive-state",
        type: "stylesheet"
    },

    reliefButtons: {
        key: "relief-buttons",
        type: "attribute",
        nodes: ["nav-bar", "bookmarked-notification-anchor"],
        attribute: "reliefbuttons"
    },
}

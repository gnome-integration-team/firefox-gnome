/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

function include(path) {
    var uri = Services.io.newURI(path, null, Services.io.newURI(__SCRIPT_URI_SPEC__, null, null));
    Services.scriptloader.loadSubScript(uri.spec, this);
};

include("include/DefaultPrefs.js");
include("include/Tweaks.js");

var GNOMEThemeTweak = {
    PREF_BRANCH: "extensions.gnome-theme-tweak.",
    prefs: null,

    setDefaultPrefs: function() {
        let branch = Services.prefs.getDefaultBranch(this.PREF_BRANCH);
        for (let [key, val] in Iterator(DefaultPrefs)) {
            switch (typeof val) {
            case "boolean":
                branch.setBoolPref(key, val);
                break;
            case "number":
                branch.setIntPref(key, val);
                break;
            case "string":
                branch.setCharPref(key, val);
                break;
            }
        }
    },

    loadStyle: function(name) {
        let sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
        let uri = Services.io.newURI("chrome://gnome-theme-tweak/content/tweaks/"+name+".css", null, null);
        if (!sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    },

    unloadStyle: function(name) {
        let sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
        let uri = Services.io.newURI("chrome://gnome-theme-tweak/content/tweaks/"+name+".css", null, null);
        if (sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.unregisterSheet(uri, sss.USER_SHEET);
    },

    addListener: function(type, listener) {
        if (typeof this._listeners[type] == "undefined") {
            this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
    },

    removeListener: function(type, listener) {
        if (typeof this._listeners[type] != "undefined") {
            var listeners = this._listeners[type];
            for (var i=0; i < listeners.length; i++) {
                if (listeners[i] === listener) {
                    listeners.splice(listener, 1);
                }
            }
        }
    },

    launchIntoExistingWindows: function(targetFunction) {
        this._launchIntoExistingWindows(targetFunction);
    },

    _listeners: {},

    _launchIntoExistingWindows: function(targetFunction) {
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        let enumerator = wm.getEnumerator("navigator:browser");
        while (enumerator.hasMoreElements()) {
            let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
            targetFunction(window);
        }
        return wm;
    },

    _onEvent: function(e, window) {
        if (typeof GNOMEThemeTweak._listeners[e] != "undefined") {
            var listeners = GNOMEThemeTweak._listeners[e];
            for (var i=0; i < listeners.length; i++) {
                listeners[i](window);
            }
        }
    },

    _windowListener: {
        onOpenWindow: function(aWindow) {
            let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            domWindow.addEventListener("load", function onLoad() {
                domWindow.removeEventListener("load", onLoad, false);
                GNOMEThemeTweak._onEvent("loadWindow", domWindow);
            }, false);
            domWindow.addEventListener("sizemodechange", function onSizeModeChange() {
                GNOMEThemeTweak._onEvent("sizeModeChange", domWindow);
            }, false);
        },
        onCloseWindow: function(aWindow) {},
        onWindowTitleChange: function(aWindow, aTitle) {}
    },

    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;

        for (var i in Tweaks) {
            if (Tweaks[i].key == data) {
                this.log(data);
                Tweaks[i].disable();
                Tweaks[i].enable();
                break;
            }
        }
    },

    log: function(message) {
        var console = Cc["@mozilla.org/consoleservice;1"]
                        .getService(Ci.nsIConsoleService);
        console.logStringMessage(message);
    },

    init: function() {
        this.setDefaultPrefs();

        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch(this.PREF_BRANCH);

        // Removing older keys...
        if (this.prefs.getPrefType("restore-button"))
            this.prefs.clearUserPref("restore-button");

        this.prefs.addObserver("", this, false);

        var f = function addListener(window) {
            window.addEventListener("sizemodechange", function onSizeModeChange() {
                GNOMEThemeTweak._onEvent("sizeModeChange", window);
            }, false);
        }

        let wm = this._launchIntoExistingWindows(f);

        // Load into any new windows
        wm.addListener(this._windowListener);

        for (var i in Tweaks) {
            Tweaks[i].enable();
        }
    },

    uninit: function() {
        for (var i in Tweaks) {
            Tweaks[i].disable();
        }

        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        wm.removeListener(this._windowListener);

        this.prefs.removeObserver("", this);
    },
}

function startup(data, reason) {
    GNOMEThemeTweak.init();
}

function shutdown(data, reason) {
    if (reason == APP_SHUTDOWN)
        return;

    GNOMEThemeTweak.uninit();
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

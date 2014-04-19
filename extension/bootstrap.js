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

include("include/CustomizationMode.js");
include("include/DefaultPrefs.js");
include("include/Tweaks.js");

var GNOMEThemeTweak = {
    PREF_BRANCH: "extensions.gnome-theme-tweak.",
    prefs: null,

    loadStyle: function(name) {
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
        var uri = Services.io.newURI("chrome://gnome-theme-tweak/content/tweaks/" + name + ".css", null, null);
        if (!sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    },

    unloadStyle: function(name) {
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
        var uri = Services.io.newURI("chrome://gnome-theme-tweak/content/tweaks/" + name + ".css", null, null);
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
        if (typeof this._listeners[type] == "undefined")
            return;
        var listeners = this._listeners[type];
        for (let i=listeners.length-1; i >= 0; i--) {
            if (listeners[i] === listener)
               listeners.splice(i, 1);
        }
    },

    launchIntoExistingWindows: function(targetFunction) {
        this._launchIntoExistingWindows(targetFunction);
    },

    _listeners: {},
    _attributes: {},

    _setDefaultPrefs: function() {
        var branch = Services.prefs.getDefaultBranch(this.PREF_BRANCH);
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

    _launchIntoExistingWindows: function(targetFunction) {
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        let enumerator = wm.getEnumerator("navigator:browser");

        var args = Array.prototype.slice.call(arguments);
        args[0] = null;

        while (enumerator.hasMoreElements()) {
            let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
            args[0] = window;
            targetFunction.apply(null, args);
        }
        return wm;
    },

    _setAttributes: function(window, el_attr) {
        for (let id in el_attr) {
            let element = window.document.getElementById(id);
            if (!element)
                continue;
            let attr_list = el_attr[id];
            for (let i=0; i < attr_list.length; i++) {
                element.setAttribute(attr_list[i][0], attr_list[i][1]);
            }
        }
    },

    _removeAttributes: function(window, el_attr) {
        for (let id in el_attr) {
            let element = window.document.getElementById(id);
            if (!element)
                continue;
            let attr_list = el_attr[id];
            for (let i=0; i < attr_list.length; i++) {
                element.removeAttribute(attr_list[i][0]);
            }
        }
    },

    _onEvent: function(e, window) {
        if (e == "loadWindow") {
            GNOMEThemeTweak._setAttributes(window, GNOMEThemeTweak._attributes);
        }
        if (typeof GNOMEThemeTweak._listeners[e] != "undefined") {
            let listeners = GNOMEThemeTweak._listeners[e];
            for (let i=0; i < listeners.length; i++) {
                listeners[i](window);
            }
        }
    },

    _windowListener: {
        onOpenWindow: function(aWindow) {
            var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            domWindow.addEventListener("load", function onLoad() {
                domWindow.removeEventListener("load", onLoad, false);
                GNOMEThemeTweak._onEvent("loadWindow", domWindow);
            }, false);
            /*
            domWindow.addEventListener("sizemodechange", function onSizeModeChange() {
                GNOMEThemeTweak._onEvent("sizeModeChange", domWindow);
            }, false);
            */
        },
        onCloseWindow: function(aWindow) {},
        onWindowTitleChange: function(aWindow, aTitle) {}
    },

    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;

        for (let i in Tweaks) {
            if (Tweaks[i].key == data) {
                GNOMEThemeTweak._disableTweak(Tweaks[i]);
                GNOMEThemeTweak._enableTweak(Tweaks[i]);
                break;
            }
        }
    },

    _enableTweak: function(tweak) {
        switch(tweak.type) {
            case "stylesheet":
                if (!tweak.isEnabled && this.prefs.getBoolPref(tweak.key)) {
                    this.loadStyle(tweak.key);
                    tweak.isEnabled = true;
                }
                break;
            case "attribute":
                if (!tweak.isEnabled && this.prefs.getBoolPref(tweak.key)) {
                    let value = [tweak.attribute, "true"];
                    let tmp_attr = {};
                    for (let i=0; i < tweak.nodes.length; i++) {
                        let node_id = tweak.nodes[i];
                        tmp_attr[node_id] = [value];
                        if (typeof this._attributes[node_id] == "undefined") {
                            this._attributes[node_id] = [];
                        }
                        else {
                            let attr = this._attributes[node_id];
                            for (let j=0; j < attr.length; j++) {
                                if (attr[j][0] === value[0]) {
                                    // Attribute already exists
                                    var flag = true;
                                    break;
                                }
                            }
                            if (flag)
                                continue;
                        }
                        this._attributes[node_id].push(value);
                    }
                    GNOMEThemeTweak._launchIntoExistingWindows(GNOMEThemeTweak._setAttributes, tmp_attr);
                    tweak.isEnabled = true;
                }
                break;
            default:
                tweak.enable();
        }
    },

    _disableTweak: function(tweak) {
        switch(tweak.type) {
            case "stylesheet":
                if (tweak.isEnabled) {
                    GNOMEThemeTweak.unloadStyle(tweak.key);
                    tweak.isEnabled = false;
                }
                break;
            case "attribute":
                if (tweak.isEnabled) {
                    let rm_attr = {};
                    for (let i=0; i < tweak.nodes.length; i++) {
                        let node_id = tweak.nodes[i];
                        if (typeof this._attributes[node_id] == "undefined") {
                            continue;
                        }
                        rm_attr[node_id] = [[tweak.attribute]];
                        let al = this._attributes[node_id];
                        for (let j=al.length-1; j>=0; j--) {
                            if (al[j][0] === tweak.attribute) {
                                al.splice(j, 1);
                            }
                        }
                        if (al.length == 0) {
                            delete this._attributes[node_id];
                        }
                    }
                    GNOMEThemeTweak._launchIntoExistingWindows(GNOMEThemeTweak._removeAttributes, rm_attr);
                    tweak.isEnabled = false;
                }
                break;
            default:
                tweak.disable();
        }
    },

    log: function(message) {
        var console = Cc["@mozilla.org/consoleservice;1"]
                        .getService(Ci.nsIConsoleService);
        console.logStringMessage(message);
    },

    init: function() {
        this._setDefaultPrefs();

        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch(this.PREF_BRANCH);

        // Removing older keys...
        if (this.prefs.getPrefType("restore-button"))
            this.prefs.clearUserPref("restore-button");

        this.prefs.addObserver("", this, false);

        /*
        var f = function addListener(window) {
            window.addEventListener("sizemodechange", function onSizeModeChange() {
                GNOMEThemeTweak._onEvent("sizeModeChange", window);
            }, false);
        }
        this.launchIntoExistingWindows(f);
        */

        // Load into any new windows
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        wm.addListener(this._windowListener);

        this.addListener("loadWindow", CustomizationMode._addLink);
        this.launchIntoExistingWindows(CustomizationMode._addLink);

        for (let i in Tweaks) {
            this._enableTweak(Tweaks[i]);
        }
    },

    uninit: function() {
        for (let i in Tweaks) {
            this._disableTweak(Tweaks[i]);
        }

        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        wm.removeListener(this._windowListener);

        /*
        var f = function addListener(window) {
            window.removeEventListener("sizemodechange", function onSizeModeChange, false);
        }
        this.launchIntoExistingWindows(f);
        */

        this.launchIntoExistingWindows(CustomizationMode._removeLink);

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

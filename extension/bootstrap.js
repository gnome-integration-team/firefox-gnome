/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

function Tweak(options) {
    // key, style=key, defValue=false
    
    this.key = options.key;
    this.style = (options.style === undefined ? this.key : options.style);
    this.defValue = Boolean(options.defValue);
    
    this.isEnabled = function(prefs) {
        if (prefs && prefs.getPrefType(this.key)) {
            return Boolean(prefs.getBoolPref(this.key) ^ this.defValue);
        }
        return this.defValue;
    }
}

var GNOMEThemeTweak = {
    tweaks: [
        new Tweak({key: "newtab-page"}),
        new Tweak({key: "relief-buttons", style: null}),
        new Tweak({key: "tabs-border"}),
        new Tweak({key: "urlbar-history-dropmarker"}),
        new Tweak({key: "forward-button"}),
        new Tweak({key: "inactive-state"}),
    ],
    
    appliedStyles: [],
    
    prefs: null,
    
    getTweakByKey: function(key) {
        for (var i = 0; i < this.tweaks.length; i++) {
            if (this.tweaks[i].key == key) {
                return this.tweaks[i];
            }
        }
        return null;
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
    
    setAttributes: function(window) {
        if (!window)
            return;
        
        var navbar = window.document.getElementById("nav-bar");
        var relief_buttons = this.prefs.getPrefType("relief-buttons") && this.prefs.getBoolPref("relief-buttons");
        if (navbar)
            navbar.setAttribute("reliefbuttons", relief_buttons);
    },
    
    removeAttributes: function(window) {
        if (!window)
            return;
        
        var navbar = window.document.getElementById("nav-bar");
        if (navbar)
            navbar.removeAttribute("reliefbuttons");
    },
    
    windowListener: {
        onOpenWindow: function(aWindow) {
            let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            domWindow.addEventListener("load", function onLoad() {
                domWindow.removeEventListener("load", onLoad, false);
                GNOMEThemeTweak.setAttributes(domWindow);
            }, false);
        },
        
        onCloseWindow: function(aWindow) { },
        onWindowTitleChange: function(aWindow, aTitle) { }
    },
    
    init: function() {
        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch("extensions.gnome-theme-tweak.");
        
        // Removing older keys...
        if (this.prefs.getPrefType("restore-button"))
            this.prefs.clearUserPref("restore-button");
        
        this.prefs.addObserver("", this, false);
        
        for (var i = 0; i < this.tweaks.length; i++) {
            var tweak = this.tweaks[i];
            
            if (tweak.style && tweak.isEnabled(this.prefs)) {
                this.loadStyle(tweak.style);
                this.appliedStyles.push(tweak.style);
            }
        }
        
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

        // Load into any existing windows
        let enumerator = wm.getEnumerator("navigator:browser");
        while (enumerator.hasMoreElements()) {
            let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
            this.setAttributes(window);
        }

        // Load into any new windows
        wm.addListener(this.windowListener);
    },
    
    uninit: function() {
        this.prefs.removeObserver("", this);
        
        for (var i = 0; i < this.appliedStyles.length; i++) {
            this.unloadStyle(this.appliedStyles[i]);
        }
        
        let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        
        // Stop watching for new windows
        wm.removeListener(this.windowListener);
        
        // Unload from any existing windows
        let enumerator = wm.getEnumerator("navigator:browser");
        while (enumerator.hasMoreElements()) {
            let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
            this.removeAttributes(window);
        }
    },
    
    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;
        
        var tweak = this.getTweakByKey(data);
        if (tweak) {
            if (tweak.key == "relief-buttons") {
                let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
                
                // Load into any existing windows
                let enumerator = wm.getEnumerator("navigator:browser");
                while (enumerator.hasMoreElements()) {
                    let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
                    this.setAttributes(window);
                }
            }
            
            if (tweak.style) {
                if (tweak.isEnabled(this.prefs)) {
                    this.loadStyle(tweak.style);
                    this.appliedStyles.push(tweak.style);
                }
                else {
                    this.unloadStyle(tweak.style);
                    this.appliedStyles.splice(this.appliedStyles.indexOf(tweak.style), 1);
                }
            }
        }
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

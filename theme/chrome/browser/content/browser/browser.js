//@line 71 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const nsIWebNavigation = Ci.nsIWebNavigation;

var gCharsetMenu = null;
var gLastBrowserCharset = null;
var gPrevCharset = null;
var gProxyFavIcon = null;
var gLastValidURLStr = "";
var gInPrintPreviewMode = false;
var gDownloadMgr = null;
var gContextMenu = null; // nsContextMenu instance

//@line 89 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
var gEditUIVisible = true;
//@line 91 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

[
  ["gBrowser",            "content"],
  ["gNavToolbox",         "navigator-toolbox"],
  ["gURLBar",             "urlbar"],
  ["gNavigatorBundle",    "bundle_browser"]
].forEach(function (elementGlobal) {
  var [name, id] = elementGlobal;
  window.__defineGetter__(name, function () {
    var element = document.getElementById(id);
    if (!element)
      return null;
    delete window[name];
    return window[name] = element;
  });
  window.__defineSetter__(name, function (val) {
    delete window[name];
    return window[name] = val;
  });
});

// Smart getter for the findbar.  If you don't wish to force the creation of
// the findbar, check gFindBarInitialized first.
var gFindBarInitialized = false;
XPCOMUtils.defineLazyGetter(window, "gFindBar", function() {
  let XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  let findbar = document.createElementNS(XULNS, "findbar");
  findbar.id = "FindToolbar";

  let browserBottomBox = document.getElementById("browser-bottombox");
  browserBottomBox.insertBefore(findbar, browserBottomBox.firstChild);

  // Force a style flush to ensure that our binding is attached.
  findbar.clientTop;
  findbar.browser = gBrowser;
  window.gFindBarInitialized = true;
  return findbar;
});

__defineGetter__("gPrefService", function() {
  delete this.gPrefService;
  return this.gPrefService = Services.prefs;
});

__defineGetter__("AddonManager", function() {
  Cu.import("resource://gre/modules/AddonManager.jsm");
  return this.AddonManager;
});
__defineSetter__("AddonManager", function (val) {
  delete this.AddonManager;
  return this.AddonManager = val;
});

__defineGetter__("PluralForm", function() {
  Cu.import("resource://gre/modules/PluralForm.jsm");
  return this.PluralForm;
});
__defineSetter__("PluralForm", function (val) {
  delete this.PluralForm;
  return this.PluralForm = val;
});

//@line 154 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
XPCOMUtils.defineLazyGetter(this, "Weave", function() {
  let tmp = {};
  Cu.import("resource://services-sync/main.js", tmp);
  return tmp.Weave;
});
//@line 160 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

XPCOMUtils.defineLazyGetter(this, "PopupNotifications", function () {
  let tmp = {};
  Cu.import("resource://gre/modules/PopupNotifications.jsm", tmp);
  try {
    return new tmp.PopupNotifications(gBrowser,
                                      document.getElementById("notification-popup"),
                                      document.getElementById("notification-popup-box"));
  } catch (ex) {
    Cu.reportError(ex);
  }
});

let gInitialPages = [
  "about:blank",
  "about:privatebrowsing",
  "about:sessionrestore"
];

/*
//@line 41 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-fullZoom.js"
 */

// One of the possible values for the mousewheel.* preferences.
// From nsEventStateManager.cpp.
const MOUSE_SCROLL_ZOOM = 3;

/**
 * Controls the "full zoom" setting and its site-specific preferences.
 */
var FullZoom = {
  // Identifies the setting in the content prefs database.
  name: "browser.content.full-zoom",

  // The global value (if any) for the setting.  Lazily loaded from the service
  // when first requested, then updated by the pref change listener as it changes.
  // If there is no global value, then this should be undefined.
  get globalValue() {
    var globalValue = Services.contentPrefs.getPref(null, this.name);
    if (typeof globalValue != "undefined")
      globalValue = this._ensureValid(globalValue);
    delete this.globalValue;
    return this.globalValue = globalValue;
  },

  // browser.zoom.siteSpecific preference cache
  _siteSpecificPref: undefined,

  // browser.zoom.updateBackgroundTabs preference cache
  updateBackgroundTabs: undefined,

  // whether we are in private browsing mode
  _inPrivateBrowsing: false,

  get siteSpecific() {
    return !this._inPrivateBrowsing && this._siteSpecificPref;
  },

  //**************************************************************************//
  // nsISupports

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDOMEventListener,
                                         Ci.nsIObserver,
                                         Ci.nsIContentPrefObserver,
                                         Ci.nsISupportsWeakReference,
                                         Ci.nsISupports]),

  //**************************************************************************//
  // Initialization & Destruction

  init: function FullZoom_init() {
    // Listen for scrollwheel events so we can save scrollwheel-based changes.
    window.addEventListener("DOMMouseScroll", this, false);

    // Register ourselves with the service so we know when our pref changes.
    Services.contentPrefs.addObserver(this.name, this);

    // We disable site-specific preferences in Private Browsing mode, because the
    // content preferences module is disabled
    Services.obs.addObserver(this, "private-browsing", true);

    // Retrieve the initial status of the Private Browsing mode.
    this._inPrivateBrowsing = Cc["@mozilla.org/privatebrowsing;1"].
                              getService(Ci.nsIPrivateBrowsingService).
                              privateBrowsingEnabled;

    this._siteSpecificPref =
      gPrefService.getBoolPref("browser.zoom.siteSpecific");
    this.updateBackgroundTabs =
      gPrefService.getBoolPref("browser.zoom.updateBackgroundTabs");
    // Listen for changes to the browser.zoom branch so we can enable/disable
    // updating background tabs and per-site saving and restoring of zoom levels.
    gPrefService.addObserver("browser.zoom.", this, true);
  },

  destroy: function FullZoom_destroy() {
    Services.obs.removeObserver(this, "private-browsing");
    gPrefService.removeObserver("browser.zoom.", this);
    Services.contentPrefs.removeObserver(this.name, this);
    window.removeEventListener("DOMMouseScroll", this, false);
  },


  //**************************************************************************//
  // Event Handlers

  // nsIDOMEventListener

  handleEvent: function FullZoom_handleEvent(event) {
    switch (event.type) {
      case "DOMMouseScroll":
        this._handleMouseScrolled(event);
        break;
    }
  },

  _handleMouseScrolled: function FullZoom__handleMouseScrolled(event) {
    // Construct the "mousewheel action" pref key corresponding to this event.
    // Based on nsEventStateManager::GetBasePrefKeyForMouseWheel.
    var pref = "mousewheel";
    if (event.axis == event.HORIZONTAL_AXIS)
      pref += ".horizscroll";

    if (event.shiftKey)
      pref += ".withshiftkey";
    else if (event.ctrlKey)
      pref += ".withcontrolkey";
    else if (event.altKey)
      pref += ".withaltkey";
    else if (event.metaKey)
      pref += ".withmetakey";
    else
      pref += ".withnokey";

    pref += ".action";

    // Don't do anything if this isn't a "zoom" scroll event.
    var isZoomEvent = false;
    try {
      isZoomEvent = (gPrefService.getIntPref(pref) == MOUSE_SCROLL_ZOOM);
    } catch (e) {}
    if (!isZoomEvent)
      return;

    // XXX Lazily cache all the possible action prefs so we don't have to get
    // them anew from the pref service for every scroll event?  We'd have to
    // make sure to observe them so we can update the cache when they change.

    // We have to call _applySettingToPref in a timeout because we handle
    // the event before the event state manager has a chance to apply the zoom
    // during nsEventStateManager::PostHandleEvent.
    window.setTimeout(function (self) { self._applySettingToPref() }, 0, this);
  },

  // nsIObserver

  observe: function (aSubject, aTopic, aData) {
    switch (aTopic) {
      case "nsPref:changed":
        switch (aData) {
          case "browser.zoom.siteSpecific":
            this._siteSpecificPref =
              gPrefService.getBoolPref("browser.zoom.siteSpecific");
            break;
          case "browser.zoom.updateBackgroundTabs":
            this.updateBackgroundTabs =
              gPrefService.getBoolPref("browser.zoom.updateBackgroundTabs");
            break;
        }
        break;
      case "private-browsing":
        switch (aData) {
          case "enter":
            this._inPrivateBrowsing = true;
            break;
          case "exit":
            this._inPrivateBrowsing = false;
            break;
        }
        break;
    }
  },

  // nsIContentPrefObserver

  onContentPrefSet: function FullZoom_onContentPrefSet(aGroup, aName, aValue) {
    if (aGroup == Services.contentPrefs.grouper.group(gBrowser.currentURI))
      this._applyPrefToSetting(aValue);
    else if (aGroup == null) {
      this.globalValue = this._ensureValid(aValue);

      // If the current page doesn't have a site-specific preference,
      // then its zoom should be set to the new global preference now that
      // the global preference has changed.
      if (!Services.contentPrefs.hasPref(gBrowser.currentURI, this.name))
        this._applyPrefToSetting();
    }
  },

  onContentPrefRemoved: function FullZoom_onContentPrefRemoved(aGroup, aName) {
    if (aGroup == Services.contentPrefs.grouper.group(gBrowser.currentURI))
      this._applyPrefToSetting();
    else if (aGroup == null) {
      this.globalValue = undefined;

      // If the current page doesn't have a site-specific preference,
      // then its zoom should be set to the default preference now that
      // the global preference has changed.
      if (!Services.contentPrefs.hasPref(gBrowser.currentURI, this.name))
        this._applyPrefToSetting();
    }
  },

  // location change observer

  /**
   * Called when the location of a tab changes.
   * When that happens, we need to update the current zoom level if appropriate.
   *
   * @param aURI
   *        A URI object representing the new location.
   * @param aIsTabSwitch
   *        Whether this location change has happened because of a tab switch.
   * @param aBrowser
   *        (optional) browser object displaying the document
   */
  onLocationChange: function FullZoom_onLocationChange(aURI, aIsTabSwitch, aBrowser) {
    if (!aURI || (aIsTabSwitch && !this.siteSpecific))
      return;

    // Avoid the cps roundtrip and apply the default/global pref.
    if (aURI.spec == "about:blank") {
      this._applyPrefToSetting(undefined, aBrowser);
      return;
    }

    let browser = aBrowser || gBrowser.selectedBrowser;

    if (Services.contentPrefs.hasCachedPref(aURI, this.name)) {
      let zoomValue = Services.contentPrefs.getPref(aURI, this.name);
      this._applyPrefToSetting(zoomValue, browser);
    } else {
      var self = this;
      Services.contentPrefs.getPref(aURI, this.name, function (aResult) {
        // Check that we're still where we expect to be in case this took a while.
        if (aURI.equals(browser.currentURI)) {
          self._applyPrefToSetting(aResult, browser);
        }
      });
    }
  },

  // update state of zoom type menu item

  updateMenu: function FullZoom_updateMenu() {
    var menuItem = document.getElementById("toggle_zoom");

    menuItem.setAttribute("checked", !ZoomManager.useFullZoom);
  },

  //**************************************************************************//
  // Setting & Pref Manipulation

  reduce: function FullZoom_reduce() {
    ZoomManager.reduce();
    this._applySettingToPref();
  },

  enlarge: function FullZoom_enlarge() {
    ZoomManager.enlarge();
    this._applySettingToPref();
  },

  reset: function FullZoom_reset() {
    if (typeof this.globalValue != "undefined")
      ZoomManager.zoom = this.globalValue;
    else
      ZoomManager.reset();

    this._removePref();
  },

  /**
   * Set the zoom level for the current tab.
   *
   * Per nsPresContext::setFullZoom, we can set the zoom to its current value
   * without significant impact on performance, as the setting is only applied
   * if it differs from the current setting.  In fact getting the zoom and then
   * checking ourselves if it differs costs more.
   * 
   * And perhaps we should always set the zoom even if it was more expensive,
   * since DocumentViewerImpl::SetTextZoom claims that child documents can have
   * a different text zoom (although it would be unusual), and it implies that
   * those child text zooms should get updated when the parent zoom gets set,
   * and perhaps the same is true for full zoom
   * (although DocumentViewerImpl::SetFullZoom doesn't mention it).
   *
   * So when we apply new zoom values to the browser, we simply set the zoom.
   * We don't check first to see if the new value is the same as the current
   * one.
   **/
  _applyPrefToSetting: function FullZoom__applyPrefToSetting(aValue, aBrowser) {
    if ((!this.siteSpecific && !this._inPrivateBrowsing) ||
        gInPrintPreviewMode)
      return;

    var browser = aBrowser || (gBrowser && gBrowser.selectedBrowser);
    try {
      if (browser.contentDocument instanceof Ci.nsIImageDocument ||
          this._inPrivateBrowsing)
        ZoomManager.setZoomForBrowser(browser, 1);
      else if (typeof aValue != "undefined")
        ZoomManager.setZoomForBrowser(browser, this._ensureValid(aValue));
      else if (typeof this.globalValue != "undefined")
        ZoomManager.setZoomForBrowser(browser, this.globalValue);
      else
        ZoomManager.setZoomForBrowser(browser, 1);
    }
    catch(ex) {}
  },

  _applySettingToPref: function FullZoom__applySettingToPref() {
    if (!this.siteSpecific || gInPrintPreviewMode ||
        content.document instanceof Ci.nsIImageDocument)
      return;

    var zoomLevel = ZoomManager.zoom;
    Services.contentPrefs.setPref(gBrowser.currentURI, this.name, zoomLevel);
  },

  _removePref: function FullZoom__removePref() {
    if (!(content.document instanceof Ci.nsIImageDocument))
      Services.contentPrefs.removePref(gBrowser.currentURI, this.name);
  },


  //**************************************************************************//
  // Utilities

  _ensureValid: function FullZoom__ensureValid(aValue) {
    if (isNaN(aValue))
      return 1;

    if (aValue < ZoomManager.MIN)
      return ZoomManager.MIN;

    if (aValue > ZoomManager.MAX)
      return ZoomManager.MAX;

    return aValue;
  }
};
/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
//@line 43 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/inspector.js"

/*
 * Software License Agreement (BSD License)
 *
 * Copyright (c) 2007, Parakey Inc.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 * 
 * * Neither the name of Parakey Inc. nor the names of its
 *   contributors may be used to endorse or promote products
 *   derived from this software without specific prior
 *   written permission of Parakey Inc.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Creator:
 *  Joe Hewitt
 * Contributors
 *  John J. Barton (IBM Almaden)
 *  Jan Odvarko (Mozilla Corp.)
 *  Max Stepanov (Aptana Inc.)
 *  Rob Campbell (Mozilla Corp.)
 *  Hans Hillen (Paciello Group, Mozilla)
 *  Curtis Bartley (Mozilla Corp.)
 *  Mike Collins (IBM Almaden)
 *  Kevin Decker
 *  Mike Ratcliffe (Comartis AG)
 *  Hernan Rodríguez Colmeiro
 *  Austin Andrews
 *  Christoph Dorn
 *  Steven Roussey (AppCenter Inc, Network54)
 */

///////////////////////////////////////////////////////////////////////////
//// InsideOutBox

/**
 * InsideOutBoxView is a simple interface definition for views implementing
 * InsideOutBox controls. All implementors must define these methods.
 * Implemented in InspectorUI.
 */

/*
InsideOutBoxView = {
  //
   * Retrieves the parent object for a given child object.
   * @param aChild
   *        The child node to retrieve the parent object for.
   * @returns a DOM node | null
   //
  getParentObject: function(aChild) {},

  //
   * Retrieves a given child node.
   *
   * If both index and previousSibling are passed, the implementation
   * may assume that previousSibling will be the return for getChildObject
   * with index-1.
   * @param aParent
   *        The parent object of the child object to retrieve.
   * @param aIndex
   *        The index of the child object to retrieve from aParent.
   * @param aPreviousSibling
   *        The previous sibling of the child object to retrieve.
   *        Supercedes aIndex.
   * @returns a DOM object | null
   //
  getChildObject: function(aParent, aIndex, aPreviousSibling) {},

  //
   * Renders the HTML representation of the object. Should return an HTML
   * object which will be displayed to the user.
   * @param aObject
   *        The object to create the box object for.
   * @param aIsRoot
   *        Is the object the root object. May not be used in all
   *        implementations.
   * @returns an object box | null
   //
  createObjectBox: function(aObject, aIsRoot) {},

  //
  * Convenience wrappers for classList API.
  * @param aObject
  *        DOM node to query/set.
  * @param aClassName
  *        String containing the class name to query/set.
  //
  hasClass: function(aObject, aClassName) {},
  addClass: function(aObject, aClassName) {},
  removeClass: function(aObject, aClassName) {}
};
*/

/**
 * Creates a tree based on objects provided by a separate "view" object.
 *
 * Construction uses an "inside-out" algorithm, meaning that the view's job is
 * first to tell us the ancestry of each object, and secondarily its
 * descendants.
 *
 * Constructor
 * @param aView
 *        The view requiring the InsideOutBox.
 * @param aBox
 *        The box object containing the InsideOutBox. Required to add/remove
 *        children during box manipulation (toggling opened or closed).
 */
function InsideOutBox(aView, aBox)
{
  this.view = aView;
  this.box = aBox;

  this.rootObject = null;

  this.rootObjectBox = null;
  this.selectedObjectBox = null;
  this.highlightedObjectBox = null;
  this.scrollIntoView = false;
};

InsideOutBox.prototype =
{
  /**
   * Highlight the given object node in the tree.
   * @param aObject
   *        the object to highlight.
   * @returns objectBox
   */
  highlight: function IOBox_highlight(aObject)
  {
    let objectBox = this.createObjectBox(aObject);
    this.highlightObjectBox(objectBox);
    return objectBox;
  },

  /**
   * Open the given object node in the tree.
   * @param aObject
   *        The object node to open.
   * @returns objectBox
   */
  openObject: function IOBox_openObject(aObject)
  {
    let object = aObject;
    let firstChild = this.view.getChildObject(object, 0);
    if (firstChild)
      object = firstChild;

    return this.openToObject(object);
  },

  /**
   * Open the tree up to the given object node.
   * @param aObject
   *        The object in the tree to open to.
   * @returns objectBox
   */
  openToObject: function IOBox_openToObject(aObject)
  {
    let objectBox = this.createObjectBox(aObject);
    this.openObjectBox(objectBox);
    return objectBox;
  },

  /**
   * Select the given object node in the tree.
   * @param aObject
   *        The object node to select.
   * @param makeBoxVisible
   *        Boolean. Open the object box in the tree?
   * @param forceOpen
   *        Force the object box open by expanding all elements in the tree?
   * @param scrollIntoView
   *        Scroll the objectBox into view?
   * @returns objectBox
   */
  select:
  function IOBox_select(aObject, makeBoxVisible, forceOpen, scrollIntoView)
  {
    let objectBox = this.createObjectBox(aObject);
    this.selectObjectBox(objectBox, forceOpen);
    if (makeBoxVisible) {
      this.openObjectBox(objectBox);
      if (scrollIntoView) {
        objectBox.scrollIntoView(true);
      }
    }
    return objectBox;
  },

  /**
   * Expands/contracts the given object, depending on its state.
   * @param aObject
   *        The tree node to expand/contract.
   */
  toggleObject: function IOBox_toggleObject(aObject)
  {
    let box = this.createObjectBox(aObject);
    if (!(this.view.hasClass(box, "open")))
      this.expandObjectBox(box);
    else
      this.contractObjectBox(box);
  },

  /**
   * Expand the given object in the tree.
   * @param aObject
   *        The tree node to expand.
   */
  expandObject: function IOBox_expandObject(aObject)
  {
    let objectBox = this.createObjectBox(aObject);
    if (objectBox)
      this.expandObjectBox(objectBox);
  },

  /**
   * Contract the given object in the tree.
   * @param aObject
   *        The tree node to contract.
   */
  contractObject: function IOBox_contractObject(aObject)
  {
    let objectBox = this.createObjectBox(aObject);
    if (objectBox)
      this.contractObjectBox(objectBox);
  },

  /**
   * General method for iterating over an object's ancestors and performing
   * some function.
   * @param aObject
   *        The object whose ancestors we wish to iterate over.
   * @param aCallback
   *        The function to call with the object as argument.
   */

  iterateObjectAncestors: function IOBox_iterateObjectAncesors(aObject, aCallback)
  {
    let object = aObject;
    if (!(aCallback && typeof(aCallback) == "function")) {
      this.view._log("Illegal argument in IOBox.iterateObjectAncestors");
      return;
    }
    while ((object = this.getParentObjectBox(object)))
      aCallback(object);
  },

  /**
   * Highlight the given objectBox in the tree.
   * @param aObjectBox
   *        The objectBox to highlight.
   */
  highlightObjectBox: function IOBox_highlightObjectBox(aObjectBox)
  {
    let self = this;

    if (!aObjectBox)
      return;

    if (this.highlightedObjectBox) {
      this.view.removeClass(this.highlightedObjectBox, "highlighted");
      this.iterateObjectAncestors(this.highlightedObjectBox, function (box) {
        self.view.removeClass(box, "highlightOpen");
      });
    }

    this.highlightedObjectBox = aObjectBox;

    this.view.addClass(aObjectBox, "highlighted");
    this.iterateObjectAncestors(this.highlightedObjectBox, function (box) {
      self.view.addClass(box, "highlightOpen");
    });

    aObjectBox.scrollIntoView(true);
  },

  /**
   * Select the given objectBox in the tree, forcing it to be open if necessary.
   * @param aObjectBox
   *        The objectBox to select.
   * @param forceOpen
   *        Force the box (subtree) to be open?
   */
  selectObjectBox: function IOBox_selectObjectBox(aObjectBox, forceOpen)
  {
    let isSelected = this.selectedObjectBox &&
      aObjectBox == this.selectedObjectBox;

    // aObjectBox is already selected, return
    if (isSelected)
      return;

    if (this.selectedObjectBox)
      this.view.removeClass(this.selectedObjectBox, "selected");

    this.selectedObjectBox = aObjectBox;

    if (aObjectBox) {
      this.view.addClass(aObjectBox, "selected");

      // Force it open the first time it is selected
      if (forceOpen)
        this.expandObjectBox(aObjectBox, true);
    }
  },

  /**
   * Open the ancestors of the given object box.
   * @param aObjectBox
   *        The object box to open.
   */
  openObjectBox: function IOBox_openObjectBox(aObjectBox)
  {
    if (!aObjectBox)
      return;

    let self = this;
    this.iterateObjectAncestors(aObjectBox, function (box) {
      self.view.addClass(box, "open");
      let labelBox = box.querySelector(".nodeLabelBox");
      if (labelBox)
        labelBox.setAttribute("aria-expanded", "true");
   });
  },

  /**
   * Expand the given object box.
   * @param aObjectBox
   *        The object box to expand.
   */
  expandObjectBox: function IOBox_expandObjectBox(aObjectBox)
  {
    let nodeChildBox = this.getChildObjectBox(aObjectBox);

    // no children means nothing to expand, return
    if (!nodeChildBox)
      return;

    if (!aObjectBox.populated) {
      let firstChild = this.view.getChildObject(aObjectBox.repObject, 0);
      this.populateChildBox(firstChild, nodeChildBox);
    }
    let labelBox = aObjectBox.querySelector(".nodeLabelBox");
    if (labelBox)
      labelBox.setAttribute("aria-expanded", "true");
    this.view.addClass(aObjectBox, "open");
  },

  /**
   * Contract the given object box.
   * @param aObjectBox
   *        The object box to contract.
   */
  contractObjectBox: function IOBox_contractObjectBox(aObjectBox)
  {
    this.view.removeClass(aObjectBox, "open");
    let nodeLabel = aObjectBox.querySelector(".nodeLabel");
    let labelBox = nodeLabel.querySelector(".nodeLabelBox");
    if (labelBox)
      labelBox.setAttribute("aria-expanded", "false");
  },

  /**
   * Toggle the given object box, forcing open if requested.
   * @param aObjectBox
   *        The object box to toggle.
   * @param forceOpen
   *        Force the objectbox open?
   */
  toggleObjectBox: function IOBox_toggleObjectBox(aObjectBox, forceOpen)
  {
    let isOpen = this.view.hasClass(aObjectBox, "open");

    if (!forceOpen && isOpen)
      this.contractObjectBox(aObjectBox);
    else if (!isOpen)
      this.expandObjectBox(aObjectBox);
  },

  /**
   * Creates all of the boxes for an object, its ancestors, and siblings.
   * @param aObject
   *        The tree node to create the object boxes for.
   * @returns anObjectBox or null
   */
  createObjectBox: function IOBox_createObjectBox(aObject)
  {
    if (!aObject)
      return null;

    this.rootObject = this.getRootNode(aObject) || aObject;

    // Get or create all of the boxes for the target and its ancestors
    let objectBox = this.createObjectBoxes(aObject, this.rootObject);

    if (!objectBox)
      return null;

    if (aObject == this.rootObject)
      return objectBox;

    return this.populateChildBox(aObject, objectBox.parentNode);
  },

  /**
   * Creates all of the boxes for an object, its ancestors, and siblings up to
   * a root.
   * @param aObject
   *        The tree's object node to create the object boxes for.
   * @param aRootObject
   *        The root object at which to stop building object boxes.
   * @returns an object box or null
   */
  createObjectBoxes: function IOBox_createObjectBoxes(aObject, aRootObject)
  {
    if (!aObject)
      return null;

    if (aObject == aRootObject) {
      if (!this.rootObjectBox || this.rootObjectBox.repObject != aRootObject) {
        if (this.rootObjectBox) {
          try {
            this.box.removeChild(this.rootObjectBox);
          } catch (exc) {
            InspectorUI._log("this.box.removeChild(this.rootObjectBox) FAILS " +
              this.box + " must not contain " + this.rootObjectBox);
          }
        }

        this.highlightedObjectBox = null;
        this.selectedObjectBox = null;
        this.rootObjectBox = this.view.createObjectBox(aObject, true);
        this.box.appendChild(this.rootObjectBox);
      }
      return this.rootObjectBox;
    }

    let parentNode = this.view.getParentObject(aObject);
    let parentObjectBox = this.createObjectBoxes(parentNode, aRootObject);

    if (!parentObjectBox)
      return null;

    let parentChildBox = this.getChildObjectBox(parentObjectBox);

    if (!parentChildBox)
      return null;

    let childObjectBox = this.findChildObjectBox(parentChildBox, aObject);

    return childObjectBox ? childObjectBox
      : this.populateChildBox(aObject, parentChildBox);
  },

  /**
   * Locate the object box for a given object node.
   * @param aObject
   *        The given object node in the tree.
   * @returns an object box or null.
   */
  findObjectBox: function IOBox_findObjectBox(aObject)
  {
    if (!aObject)
      return null;

    if (aObject == this.rootObject)
      return this.rootObjectBox;

    let parentNode = this.view.getParentObject(aObject);
    let parentObjectBox = this.findObjectBox(parentNode);
    if (!parentObjectBox)
      return null;

    let parentChildBox = this.getChildObjectBox(parentObjectBox);
    if (!parentChildBox)
      return null;

    return this.findChildObjectBox(parentChildBox, aObject);
  },

  getAncestorByClass: function IOBox_getAncestorByClass(node, className)
  {
    for (let parent = node; parent; parent = parent.parentNode) {
      if (this.view.hasClass(parent, className))
        return parent;
    }

    return null;
  },

  /**
   * We want all children of the parent of repObject.
   */
  populateChildBox: function IOBox_populateChildBox(repObject, nodeChildBox)
  {
    if (!repObject)
      return null;

    let parentObjectBox = this.getAncestorByClass(nodeChildBox, "nodeBox");

    if (parentObjectBox.populated)
      return this.findChildObjectBox(nodeChildBox, repObject);

    let lastSiblingBox = this.getChildObjectBox(nodeChildBox);
    let siblingBox = nodeChildBox.firstChild;
    let targetBox = null;
    let view = this.view;
    let targetSibling = null;
    let parentNode = view.getParentObject(repObject);

    for (let i = 0; 1; ++i) {
      targetSibling = view.getChildObject(parentNode, i, targetSibling);
      if (!targetSibling)
        break;

      // Check if we need to start appending, or continue to insert before
      if (lastSiblingBox && lastSiblingBox.repObject == targetSibling)
        lastSiblingBox = null;

      if (!siblingBox || siblingBox.repObject != targetSibling) {
        let newBox = view.createObjectBox(targetSibling);
        if (newBox) {
          if (lastSiblingBox)
            nodeChildBox.insertBefore(newBox, lastSiblingBox);
          else
            nodeChildBox.appendChild(newBox);
        }

        siblingBox = newBox;
      }

      if (targetSibling == repObject)
        targetBox = siblingBox;

      if (siblingBox && siblingBox.repObject == targetSibling)
        siblingBox = siblingBox.nextSibling;
    }

    if (targetBox)
      parentObjectBox.populated = true;

    return targetBox;
  },

  /**
   * Get the parent object box of a given object box.
   * @params aObjectBox
   *         The object box of the parent.
   * @returns an object box or null
   */
  getParentObjectBox: function IOBox_getParentObjectBox(aObjectBox)
  {
    let parent = aObjectBox.parentNode ? aObjectBox.parentNode.parentNode : null;
    return parent && parent.repObject ? parent : null;
  },

  /**
   * Get the child object box of a given object box.
   * @param aObjectBox
   *        The object box whose child you want.
   * @returns an object box or null
   */
  getChildObjectBox: function IOBox_getChildObjectBox(aObjectBox)
  {
    return aObjectBox.querySelector(".nodeChildBox");
  },

  /**
   * Find the child object box for a given repObject within the subtree
   * rooted at aParentNodeBox.
   * @param aParentNodeBox
   *        root of the subtree in which to search for repObject.
   * @param aRepObject
   *        The object you wish to locate in the subtree.
   * @returns an object box or null
   */
  findChildObjectBox: function IOBox_findChildObjectBox(aParentNodeBox, aRepObject)
  {
    let childBox = aParentNodeBox.firstChild;
    while (childBox) {
      if (childBox.repObject == aRepObject)
        return childBox;
      childBox = childBox.nextSibling;
    }
    return null; // not found
  },

  /**
   * Determines if the given node is an ancestor of the current root.
   * @param aNode
   *        The node to look for within the tree.
   * @returns boolean
   */
  isInExistingRoot: function IOBox_isInExistingRoot(aNode)
  {
    let parentNode = aNode;
    while (parentNode && parentNode != this.rootObject) {
      parentNode = this.view.getParentObject(parentNode);
    }
    return parentNode == this.rootObject;
  },

  /**
   * Get the root node of a given node.
   * @param aNode
   *        The node whose root you wish to retrieve.
   * @returns a root node or null
   */
  getRootNode: function IOBox_getRootNode(aNode)
  {
    let node = aNode;
    let tmpNode;
    while ((tmpNode = this.view.getParentObject(node)))
      node = tmpNode;

    return node;
  },
};
//@line 45 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/inspector.js"

const INSPECTOR_INVISIBLE_ELEMENTS = {
  "head": true,
  "base": true,
  "basefont": true,
  "isindex": true,
  "link": true,
  "meta": true,
  "script": true,
  "style": true,
  "title": true,
};

///////////////////////////////////////////////////////////////////////////
//// PanelHighlighter

/**
 * A highlighter mechanism using xul panels.
 *
 * @param aBrowser
 *        The XUL browser object for the content window being highlighted.
 */
function PanelHighlighter(aBrowser)
{
  this.panel = document.getElementById("highlighter-panel");
  this.panel.hidden = false;
  this.browser = aBrowser;
  this.win = this.browser.contentWindow;
}

PanelHighlighter.prototype = {

  /**
   * Highlight this.node, unhilighting first if necessary.
   *
   * @param scroll
   *        Boolean determining whether to scroll or not.
   */
  highlight: function PanelHighlighter_highlight(scroll)
  {
    // node is not set or node is not highlightable, bail
    if (!this.isNodeHighlightable()) {
      return;
    }

    this.unhighlight();

    let rect = this.node.getBoundingClientRect();

    if (scroll) {
      this.node.scrollIntoView();
    }

    if (this.viewContainsRect(rect)) {
      // TODO check for offscreen boundaries, bug565301
      this.panel.openPopup(this.node, "overlap", 0, 0, false, false);
      this.panel.sizeTo(rect.width, rect.height);
    } else {
      this.highlightVisibleRegion(rect);
    }
  },

  /**
   * Highlight the given node.
   *
   * @param aNode
   *        a DOM element to be highlighted
   * @param aParams
   *        extra parameters object
   */
  highlightNode: function PanelHighlighter_highlightNode(aNode, aParams)
  {
    this.node = aNode;
    this.highlight(aParams && aParams.scroll);
  },

  /**
   * Highlight the visible region of the region described by aRect, if any.
   *
   * @param aRect
   * @returns boolean
   *          was a region highlighted?
   */
  highlightVisibleRegion: function PanelHighlighter_highlightVisibleRegion(aRect)
  {
    let offsetX = 0;
    let offsetY = 0;
    let width = 0;
    let height = 0;
    let visibleWidth = this.win.innerWidth;
    let visibleHeight = this.win.innerHeight;

    // If any of these edges are out-of-bounds, the node's rectangle is
    // completely out-of-view and we can return.
    if (aRect.top > visibleHeight || aRect.left > visibleWidth ||
        aRect.bottom < 0 || aRect.right < 0) {
      return false;
    }

    // Calculate node offsets, if values are negative, then start the offsets
    // at their absolute values from node origin. The delta should be the edge
    // of view.
    offsetX = aRect.left < 0 ? Math.abs(aRect.left) : 0;
    offsetY = aRect.top < 0 ? Math.abs(aRect.top) : 0;

    // Calculate actual node width, taking into account the available visible
    // width and then subtracting the offset for the final dimension.
    width = aRect.right > visibleWidth ? visibleWidth - aRect.left :
      aRect.width;
    width -= offsetX;

    // Calculate actual node height using the same formula as above for width.
    height = aRect.bottom > visibleHeight ? visibleHeight - aRect.top :
      aRect.height;
    height -= offsetY;

    // If width and height are non-negative, open the highlighter popup over the
    // node and sizeTo width and height.
    if (width > 0 && height > 0) {
      this.panel.openPopup(this.node, "overlap", offsetX, offsetY, false,
        false);
      this.panel.sizeTo(width, height);
      return true;
    }

    return false;
  },

  /**
   * Close the highlighter panel.
   */
  unhighlight: function PanelHighlighter_unhighlight()
  {
    if (this.isHighlighting) {
      this.panel.hidePopup();
    }
  },

  /**
   * Is the highlighter panel open?
   *
   * @returns boolean
   */
  get isHighlighting()
  {
    return this.panel.state == "open";
  },

  /**
   * Return the midpoint of a line from pointA to pointB.
   *
   * @param aPointA
   *        An object with x and y properties.
   * @param aPointB
   *        An object with x and y properties.
   * @returns aPoint
   *          An object with x and y properties.
   */
  midPoint: function PanelHighlighter_midPoint(aPointA, aPointB)
  {
    let pointC = { };
    pointC.x = (aPointB.x - aPointA.x) / 2 + aPointA.x;
    pointC.y = (aPointB.y - aPointA.y) / 2 + aPointA.y;
    return pointC;
  },

  /**
   * Return the node under the highlighter rectangle. Useful for testing.
   * Calculation based on midpoint of diagonal from top left to bottom right
   * of panel.
   *
   * @returns a DOM node or null if none
   */
  get highlitNode()
  {
    // No highlighter panel? Bail.
    if (!this.isHighlighting) {
      return null;
    }

    let browserRect = this.browser.getBoundingClientRect();
    let clientRect = this.panel.getBoundingClientRect();

    // Calculate top left point offset minus browser chrome.
    let a = {
      x: clientRect.left - browserRect.left,
      y: clientRect.top - browserRect.top
    };

    // Calculate bottom right point minus browser chrome.
    let b = {
      x: clientRect.right - browserRect.left,
      y: clientRect.bottom - browserRect.top
    };

    // Get midpoint of diagonal line.
    let midpoint = this.midPoint(a, b);

    return InspectorUI.elementFromPoint(this.win.document, midpoint.x,
      midpoint.y);
  },

  /**
   * Is this.node highlightable?
   *
   * @returns boolean
   */
  isNodeHighlightable: function PanelHighlighter_isNodeHighlightable()
  {
    if (!this.node) {
      return false;
    }
    let nodeName = this.node.nodeName.toLowerCase();
    if (nodeName[0] == '#') {
      return false;
    }
    return !INSPECTOR_INVISIBLE_ELEMENTS[nodeName];
  },

  /**
   * Returns true if the given viewport-relative rect is within the visible area
   * of the window.
   *
   * @param aRect
   *        a CSS rectangle object
   * @returns boolean
   */
  viewContainsRect: function PanelHighlighter_viewContainsRect(aRect)
  {
    let visibleWidth = this.win.innerWidth;
    let visibleHeight = this.win.innerHeight;

    return ((0 <= aRect.left) && (aRect.right <= visibleWidth) &&
        (0 <= aRect.top) && (aRect.bottom <= visibleHeight))
  },

  /////////////////////////////////////////////////////////////////////////
  //// Event Handling

  /**
   * Handle mousemoves in panel when InspectorUI.inspecting is true.
   *
   * @param aEvent
   *        The MouseEvent triggering the method.
   */
  handleMouseMove: function PanelHighlighter_handleMouseMove(aEvent)
  {
    if (!InspectorUI.inspecting) {
      return;
    }
    let browserRect = this.browser.getBoundingClientRect();
    let element = InspectorUI.elementFromPoint(this.win.document,
      aEvent.clientX - browserRect.left, aEvent.clientY - browserRect.top);
    if (element && element != this.node) {
      InspectorUI.inspectNode(element);
    }
  },

  /**
   * Handle MozMousePixelScroll in panel when InspectorUI.inspecting is true.
   *
   * @param aEvent
   *        The onMozMousePixelScrollEvent triggering the method.
   * @returns void
   */
  handlePixelScroll: function PanelHighlighter_handlePixelScroll(aEvent) {
    if (!InspectorUI.inspecting) {
      return;
    }
    let browserRect = this.browser.getBoundingClientRect();
    let element = InspectorUI.elementFromPoint(this.win.document,
      aEvent.clientX - browserRect.left, aEvent.clientY - browserRect.top);
    let win = element.ownerDocument.defaultView;

    if (aEvent.axis == aEvent.HORIZONTAL_AXIS) {
      win.scrollBy(aEvent.detail, 0);
    } else {
      win.scrollBy(0, aEvent.detail);
    }
  }
};

///////////////////////////////////////////////////////////////////////////
//// InspectorUI

/**
 * Main controller class for the Inspector.
 */
var InspectorUI = {
  browser: null,
  selectEventsSuppressed: false,
  showTextNodesWithWhitespace: false,
  inspecting: false,
  treeLoaded: false,
  prefEnabledName: "devtools.inspector.enabled",

  /**
   * Toggle the inspector interface elements on or off.
   *
   * @param aEvent
   *        The event that requested the UI change. Toolbar button or menu.
   */
  toggleInspectorUI: function IUI_toggleInspectorUI(aEvent)
  {
    if (this.isTreePanelOpen) {
      this.closeInspectorUI(true);
    } else {
      this.openInspectorUI();
    }
  },

  /**
   * Toggle the status of the inspector, starting or stopping it. Invoked
   * from the toolbar's Inspect button.
   */
  toggleInspection: function IUI_toggleInspection()
  {
    if (this.inspecting) {
      this.stopInspecting();
    } else {
      this.startInspecting();
    }
  },

  /**
   * Toggle the style panel. Invoked from the toolbar's Style button.
   */
  toggleStylePanel: function IUI_toggleStylePanel()
  {
    if (this.isStylePanelOpen) {
      this.stylePanel.hidePopup();
    } else {
      this.openStylePanel();
      if (this.selection) {
        this.updateStylePanel(this.selection);
      }
    }
  },

  /**
   * Toggle the DOM panel. Invoked from the toolbar's DOM button.
   */
  toggleDOMPanel: function IUI_toggleDOMPanel()
  {
    if (this.isDOMPanelOpen) {
      this.domPanel.hidePopup();
    } else {
      this.clearDOMPanel();
      this.openDOMPanel();
      if (this.selection) {
        this.updateDOMPanel(this.selection);
      }
    }
  },

  /**
   * Is the tree panel open?
   *
   * @returns boolean
   */
  get isTreePanelOpen()
  {
    return this.treePanel && this.treePanel.state == "open";
  },

  /**
   * Is the style panel open?
   *
   * @returns boolean
   */
  get isStylePanelOpen()
  {
    return this.stylePanel && this.stylePanel.state == "open";
  },

  /**
   * Is the DOM panel open?
   *
   * @returns boolean
   */
  get isDOMPanelOpen()
  {
    return this.domPanel && this.domPanel.state == "open";
  },

  /**
   * Return the default selection element for the inspected document.
   */
  get defaultSelection()
  {
    let doc = this.win.document;
    return doc.documentElement.lastElementChild;
  },

  initializeTreePanel: function IUI_initializeTreePanel()
  {
    this.treeBrowserDocument = this.treeIFrame.contentDocument;
    this.treePanelDiv = this.treeBrowserDocument.createElement("div");
    this.treeBrowserDocument.body.appendChild(this.treePanelDiv);
    this.treePanelDiv.ownerPanel = this;
    this.ioBox = new InsideOutBox(this, this.treePanelDiv);
    this.ioBox.createObjectBox(this.win.document.documentElement);
    this.treeLoaded = true;
    if (this.isTreePanelOpen && this.isStylePanelOpen &&
        this.isDOMPanelOpen && this.treeLoaded) {
      this.notifyReady();
    }
  },

  /**
   * Open the inspector's tree panel and initialize it.
   */
  openTreePanel: function IUI_openTreePanel()
  {
    if (!this.treePanel) {
      this.treePanel = document.getElementById("inspector-tree-panel");
      this.treePanel.hidden = false;
    }

    this.treeIFrame = document.getElementById("inspector-tree-iframe");
    if (!this.treeIFrame) {
      let resizerBox = document.getElementById("tree-panel-resizer-box");
      this.treeIFrame = document.createElement("iframe");
      this.treeIFrame.setAttribute("id", "inspector-tree-iframe");
      this.treeIFrame.setAttribute("flex", "1");
      this.treeIFrame.setAttribute("type", "content");
      this.treeIFrame.setAttribute("onclick", "InspectorUI.onTreeClick(event)");
      this.treeIFrame = this.treePanel.insertBefore(this.treeIFrame, resizerBox);
    }
    
    const panelWidthRatio = 7 / 8;
    const panelHeightRatio = 1 / 5;
    this.treePanel.openPopup(this.browser, "overlap", 80, this.win.innerHeight,
      false, false);
    this.treePanel.sizeTo(this.win.outerWidth * panelWidthRatio,
      this.win.outerHeight * panelHeightRatio);

    let src = this.treeIFrame.getAttribute("src");
    if (src != "chrome://browser/content/inspector.html") {
      let self = this;
      this.treeIFrame.addEventListener("DOMContentLoaded", function() {
        self.treeIFrame.removeEventListener("DOMContentLoaded", arguments.callee, true);
        self.initializeTreePanel();
      }, true);

      this.treeIFrame.setAttribute("src", "chrome://browser/content/inspector.html");
    } else {
      this.initializeTreePanel();
    }
  },

  createObjectBox: function IUI_createObjectBox(object, isRoot)
  {
    let tag = this.domplateUtils.getNodeTag(object);
    if (tag)
      return tag.replace({object: object}, this.treeBrowserDocument);
  },

  getParentObject: function IUI_getParentObject(node)
  {
    let parentNode = node ? node.parentNode : null;

    if (!parentNode) {
      // Documents have no parentNode; Attr, Document, DocumentFragment, Entity,
      // and Notation. top level windows have no parentNode
      if (node && node == Node.DOCUMENT_NODE) {
        // document type
        if (node.defaultView) {
          let embeddingFrame = node.defaultView.frameElement;
          if (embeddingFrame)
            return embeddingFrame.parentNode;
        }
      }
      // a Document object without a parentNode or window
      return null;  // top level has no parent
    }

    if (parentNode.nodeType == Node.DOCUMENT_NODE) {
      if (parentNode.defaultView) {
        return parentNode.defaultView.frameElement;
      }
      if (this.embeddedBrowserParents) {
        let skipParent = this.embeddedBrowserParents[node];
        // HTML element? could be iframe?
        if (skipParent)
          return skipParent;
      } else // parent is document element, but no window at defaultView.
        return null;
    } else if (!parentNode.localName) {
      return null;
    }
    return parentNode;
  },

  getChildObject: function IUI_getChildObject(node, index, previousSibling)
  {
    if (!node)
      return null;

    if (node.contentDocument) {
      // then the node is a frame
      if (index == 0) {
        if (!this.embeddedBrowserParents)
          this.embeddedBrowserParents = {};
        let skipChild = node.contentDocument.documentElement;
        this.embeddedBrowserParents[skipChild] = node;
        return skipChild;  // the node's HTMLElement
      }
      return null;
    }

    if (node instanceof GetSVGDocument) {
      // then the node is a frame
      if (index == 0) {
        if (!this.embeddedBrowserParents)
          this.embeddedBrowserParents = {};
        let skipChild = node.getSVGDocument().documentElement;
        this.embeddedBrowserParents[skipChild] = node;
        return skipChild;  // the node's SVGElement
      }
      return null;
    }

    let child = null;
    if (previousSibling)  // then we are walking
      child = this.getNextSibling(previousSibling);
    else
      child = this.getFirstChild(node);

    if (this.showTextNodesWithWhitespace)
      return child;

    for (; child; child = this.getNextSibling(child)) {
      if (!this.domplateUtils.isWhitespaceText(child))
        return child;
    }

    return null;  // we have no children worth showing.
  },

  getFirstChild: function IUI_getFirstChild(node)
  {
    this.treeWalker = node.ownerDocument.createTreeWalker(node,
      NodeFilter.SHOW_ALL, null, false);
    return this.treeWalker.firstChild();
  },

  getNextSibling: function IUI_getNextSibling(node)
  {
    let next = this.treeWalker.nextSibling();

    if (!next)
      delete this.treeWalker;

    return next;
  },

  /**
   * Open the style panel if not already onscreen.
   */
  openStylePanel: function IUI_openStylePanel()
  {
    if (!this.stylePanel)
      this.stylePanel = document.getElementById("inspector-style-panel");
    if (!this.isStylePanelOpen) {
      this.stylePanel.hidden = false;
      // open at top right of browser panel, offset by 20px from top.
      this.stylePanel.openPopup(this.browser, "end_before", 0, 20, false, false);
      // size panel to 200px wide by half browser height - 60.
      this.stylePanel.sizeTo(200, this.win.outerHeight / 2 - 60);
    }
  },

  /**
   * Open the DOM panel if not already onscreen.
   */
  openDOMPanel: function IUI_openDOMPanel()
  {
    if (!this.isDOMPanelOpen) {
      this.domPanel.hidden = false;
      // open at middle right of browser panel, offset by 20px from middle.
      this.domPanel.openPopup(this.browser, "end_before", 0,
        this.win.outerHeight / 2 - 20, false, false);
      // size panel to 200px wide by half browser height - 60.
      this.domPanel.sizeTo(200, this.win.outerHeight / 2 - 60);
    }
  },

  /**
   * Toggle the dimmed (semi-transparent) state for a panel by setting or
   * removing a dimmed attribute.
   *
   * @param aDim
   *        The panel to be dimmed.
   */
  toggleDimForPanel: function IUI_toggleDimForPanel(aDim)
  {
    if (aDim.hasAttribute("dimmed")) {
      aDim.removeAttribute("dimmed");
    } else {
      aDim.setAttribute("dimmed", "true");
    }
  },

  /**
   * Open inspector UI. tree, style and DOM panels if enabled. Add listeners for
   * document scrolling, resize, tabContainer.TabSelect and others.
   */
  openInspectorUI: function IUI_openInspectorUI()
  {
    // initialization
    this.browser = gBrowser.selectedBrowser;
    this.win = this.browser.contentWindow;
    this.winID = this.getWindowID(this.win);
    if (!this.domplate) {
      Cu.import("resource:///modules/domplate.jsm", this);
      this.domplateUtils.setDOM(window);
    }

    // DOM panel initialization and loading (via PropertyPanel.jsm)
    let objectPanelTitle = this.strings.
      GetStringFromName("object.objectPanelTitle");
    let parent = document.getElementById("inspector-style-panel").parentNode;
    this.propertyPanel = new (this.PropertyPanel)(parent, document,
      objectPanelTitle, {});

    // additional DOM panel setup needed for unittest identification and use
    this.domPanel = this.propertyPanel.panel;
    this.domPanel.setAttribute("id", "inspector-dom-panel");
    this.domBox = this.propertyPanel.tree;
    this.domTreeView = this.propertyPanel.treeView;

    // open inspector UI
    this.openTreePanel();

    // style panel setup and activation
    this.styleBox = document.getElementById("inspector-style-listbox");
    this.clearStylePanel();
    this.openStylePanel();

    // DOM panel setup and activation
    this.clearDOMPanel();
    this.openDOMPanel();

    // setup highlighter and start inspecting
    this.initializeHighlighter();

    // Setup the InspectorStore or restore state
    this.initializeStore();

    if (InspectorStore.getValue(this.winID, "inspecting"))
      this.startInspecting();

    this.win.document.addEventListener("scroll", this, false);
    this.win.addEventListener("resize", this, false);
    this.inspectCmd.setAttribute("checked", true);
    document.addEventListener("popupshown", this, false);
  },

  /**
   * Initialize highlighter.
   */
  initializeHighlighter: function IUI_initializeHighlighter()
  {
    this.highlighter = new PanelHighlighter(this.browser);
  },

  /**
   * Initialize the InspectorStore.
   */
  initializeStore: function IUI_initializeStore()
  {
    // First time opened, add the TabSelect listener
    if (InspectorStore.isEmpty())
      gBrowser.tabContainer.addEventListener("TabSelect", this, false);

    // Has this windowID been inspected before?
    if (InspectorStore.hasID(this.winID)) {
      let selectedNode = InspectorStore.getValue(this.winID, "selectedNode");
      if (selectedNode) {
        this.inspectNode(selectedNode);
      }
    } else {
      // First time inspecting, set state to no selection + live inspection.
      InspectorStore.addStore(this.winID);
      InspectorStore.setValue(this.winID, "selectedNode", null);
      InspectorStore.setValue(this.winID, "inspecting", true);
      this.win.addEventListener("pagehide", this, true);
    }
  },

  /**
   * Close inspector UI and associated panels. Unhighlight and stop inspecting.
   * Remove event listeners for document scrolling, resize,
   * tabContainer.TabSelect and others.
   *
   * @param boolean aClearStore tells if you want the store associated to the
   * current tab/window to be cleared or not.
   */
  closeInspectorUI: function IUI_closeInspectorUI(aClearStore)
  {
    if (this.closing || !this.win || !this.browser) {
      return;
    }

    this.closing = true;

    if (aClearStore) {
      InspectorStore.deleteStore(this.winID);
      this.win.removeEventListener("pagehide", this, true);
    } else {
      // Update the store before closing.
      if (this.selection) {
        InspectorStore.setValue(this.winID, "selectedNode",
          this.selection);
      }
      InspectorStore.setValue(this.winID, "inspecting", this.inspecting);
    }

    if (InspectorStore.isEmpty()) {
      gBrowser.tabContainer.removeEventListener("TabSelect", this, false);
    }

    this.win.document.removeEventListener("scroll", this, false);
    this.win.removeEventListener("resize", this, false);
    this.stopInspecting();
    if (this.highlighter && this.highlighter.isHighlighting) {
      this.highlighter.unhighlight();
    }

    if (this.isTreePanelOpen)
      this.treePanel.hidePopup();
    if (this.treePanelDiv) {
      this.treePanelDiv.ownerPanel = null;
      let parent = this.treePanelDiv.parentNode;
      parent.removeChild(this.treePanelDiv);
      delete this.treePanelDiv;
      delete this.treeBrowserDocument;
    }

    if (this.treeIFrame)
      delete this.treeIFrame;
    delete this.ioBox;

    if (this.domplate) {
      this.domplateUtils.setDOM(null);
      delete this.domplate;
      delete this.HTMLTemplates;
      delete this.domplateUtils;
    }

    if (this.isStylePanelOpen) {
      this.stylePanel.hidePopup();
    }
    if (this.domPanel) {
      this.domPanel.hidePopup();
      this.domBox = null;
      this.domTreeView = null;
    }
    this.inspectCmd.setAttribute("checked", false);
    this.browser = this.win = null; // null out references to browser and window
    this.winID = null;
    this.selection = null;
    this.treeLoaded = false;
    this.closing = false;
    Services.obs.notifyObservers(null, "inspector-closed", null);
  },

  /**
   * Begin inspecting webpage, attach page event listeners, activate
   * highlighter event listeners.
   */
  startInspecting: function IUI_startInspecting()
  {
    this.attachPageListeners();
    this.inspecting = true;
    this.toggleDimForPanel(this.stylePanel);
    this.toggleDimForPanel(this.domPanel);
  },

  /**
   * Stop inspecting webpage, detach page listeners, disable highlighter
   * event listeners.
   */
  stopInspecting: function IUI_stopInspecting()
  {
    if (!this.inspecting)
      return;
    this.detachPageListeners();
    this.inspecting = false;
    this.toggleDimForPanel(this.stylePanel);
    this.toggleDimForPanel(this.domPanel);
    if (this.highlighter.node) {
      this.select(this.highlighter.node, true, true);
    }
  },

  /**
   * Select an object in the tree view.
   * @param aNode
   *        node to inspect
   * @param forceUpdate
   *        force an update?
   * @param aScroll
   *        force scroll?
   */
  select: function IUI_select(aNode, forceUpdate, aScroll)
  {
    if (!aNode)
      aNode = this.defaultSelection;

    if (forceUpdate || aNode != this.selection) {
      this.selection = aNode;
      let box = this.ioBox.createObjectBox(this.selection);
      if (!this.inspecting) {
        this.highlighter.highlightNode(this.selection);
        this.updateStylePanel(this.selection);
        this.updateDOMPanel(this.selection);
      }
      this.ioBox.select(aNode, true, true, aScroll);
    }
  },

  /////////////////////////////////////////////////////////////////////////
  //// Model Creation Methods

  /**
   * Add a new item to the style panel listbox.
   *
   * @param aLabel
   *        A bit of text to put in the listitem's label attribute.
   * @param aType
   *        The type of item.
   * @param content
   *        Text content or value of the listitem.
   */
  addStyleItem: function IUI_addStyleItem(aLabel, aType, aContent)
  {
    let itemLabelString = this.strings.GetStringFromName("style.styleItemLabel");
    let item = document.createElement("listitem");

    // Do not localize these strings
    let label = aLabel;
    item.className = "style-" + aType;
    if (aContent) {
      label = itemLabelString.replace("#1", aLabel);
      label = label.replace("#2", aContent);
    }
    item.setAttribute("label", label);

    this.styleBox.appendChild(item);
  },

  /**
   * Create items for each rule included in the given array.
   *
   * @param aRules
   *        an array of rule objects
   */
  createStyleRuleItems: function IUI_createStyleRuleItems(aRules)
  {
    let selectorLabel = this.strings.GetStringFromName("style.selectorLabel");

    aRules.forEach(function(rule) {
      this.addStyleItem(selectorLabel, "selector", rule.id);
      rule.properties.forEach(function(property) {
        if (property.overridden)
          return; // property marked overridden elsewhere
        // Do not localize the strings below this line
        let important = "";
        if (property.important)
          important += " !important";
        this.addStyleItem(property.name, "property", property.value + important);
      }, this);
    }, this);
  },

  /**
   * Create rule items for each section as well as the element's style rules,
   * if any.
   *
   * @param aRules
   *        Array of rules corresponding to the element's style object.
   * @param aSections
   *        Array of sections encapsulating the inherited rules for selectors
   *        and elements.
   */
  createStyleItems: function IUI_createStyleItems(aRules, aSections)
  {
    this.createStyleRuleItems(aRules);
    let inheritedString =
      this.strings.GetStringFromName("style.inheritedFrom");
    aSections.forEach(function(section) {
      let sectionTitle = section.element.tagName;
      if (section.element.id)
        sectionTitle += "#" + section.element.id;
      let replacedString = inheritedString.replace("#1", sectionTitle);
      this.addStyleItem(replacedString, "section");
      this.createStyleRuleItems(section.rules);
    }, this);
  },

  /**
   * Remove all items from the Style Panel's listbox.
   */
  clearStylePanel: function IUI_clearStylePanel()
  {
    for (let i = this.styleBox.childElementCount; i >= 0; --i)
      this.styleBox.removeItemAt(i);
  },

  /**
   * Remove all items from the DOM Panel's listbox.
   */
  clearDOMPanel: function IUI_clearStylePanel()
  {
    this.domTreeView.data = {};
  },

  /**
   * Update the contents of the style panel with styles for the currently
   * inspected node.
   *
   * @param aNode
   *        The highlighted node to get styles for.
   */
  updateStylePanel: function IUI_updateStylePanel(aNode)
  {
    if (this.inspecting || !this.isStylePanelOpen) {
      return;
    }

    let rules = [], styleSections = [], usedProperties = {};
    this.style.getInheritedRules(aNode, styleSections, usedProperties);
    this.style.getElementRules(aNode, rules, usedProperties);
    this.clearStylePanel();
    this.createStyleItems(rules, styleSections);
  },

  /**
   * Update the contents of the DOM panel with name/value pairs for the
   * currently-inspected node.
   */
  updateDOMPanel: function IUI_updateDOMPanel(aNode)
  {
    if (this.inspecting || !this.isDOMPanelOpen) {
      return;
    }

    this.domTreeView.data = aNode;
  },

  /////////////////////////////////////////////////////////////////////////
  //// Event Handling

  notifyReady: function IUI_notifyReady()
  {
    document.removeEventListener("popupshowing", this, false);
    Services.obs.notifyObservers(null, "inspector-opened", null);
  },

  /**
   * Main callback handler for events.
   *
   * @param event
   *        The event to be handled.
   */
  handleEvent: function IUI_handleEvent(event)
  {
    let winID = null;
    let win = null;
    let inspectorClosed = false;

    switch (event.type) {
      case "popupshown":
        if (event.target.id == "inspector-tree-panel" ||
            event.target.id == "inspector-style-panel" ||
            event.target.id == "inspector-dom-panel")
          if (this.isTreePanelOpen && this.isStylePanelOpen &&
              this.isDOMPanelOpen && this.treeLoaded) {
            this.notifyReady();
          }
        break;
      case "TabSelect":
        winID = this.getWindowID(gBrowser.selectedBrowser.contentWindow);
        if (this.isTreePanelOpen && winID != this.winID) {
          this.closeInspectorUI(false);
          inspectorClosed = true;
        }

        if (winID && InspectorStore.hasID(winID)) {
          if (inspectorClosed && this.closing) {
            Services.obs.addObserver(function () {
              InspectorUI.openInspectorUI();
            }, "inspector-closed", false);
          } else {
            this.openInspectorUI();
          }
        } else if (InspectorStore.isEmpty()) {
          gBrowser.tabContainer.removeEventListener("TabSelect", this, false);
        }
        break;
      case "pagehide":
        win = event.originalTarget.defaultView;
        // Skip iframes/frames.
        if (!win || win.frameElement || win.top != win) {
          break;
        }

        win.removeEventListener(event.type, this, true);

        winID = this.getWindowID(win);
        if (winID && winID != this.winID) {
          InspectorStore.deleteStore(winID);
        }

        if (InspectorStore.isEmpty()) {
          gBrowser.tabContainer.removeEventListener("TabSelect", this, false);
        }
        break;
      case "keypress":
        switch (event.keyCode) {
          case KeyEvent.DOM_VK_RETURN:
          case KeyEvent.DOM_VK_ESCAPE:
            this.stopInspecting();
            break;
        }
        break;
      case "mousemove":
        let element = this.elementFromPoint(event.target.ownerDocument,
          event.clientX, event.clientY);
        if (element && element != this.node) {
          this.inspectNode(element);
        }
        break;
      case "click":
        this.stopInspecting();
        break;
      case "scroll":
      case "resize":
        this.highlighter.highlight();
        break;
    }
  },

  /**
   * Handle click events in the html tree panel.
   * @param aEvent
   *        The mouse event.
   */
  onTreeClick: function IUI_onTreeClick(aEvent)
  {
    let node;
    let target = aEvent.target;
    let hitTwisty = false;
    if (this.hasClass(target, "twisty")) {
      node = this.getRepObject(aEvent.target.nextSibling);
      hitTwisty = true;
    } else {
      node = this.getRepObject(aEvent.target);
    }

    if (node) {
      if (hitTwisty)
        this.ioBox.toggleObject(node);
      this.select(node, false, false);
    }
  },

  /**
   * Attach event listeners to content window and child windows to enable
   * highlighting and click to stop inspection.
   */
  attachPageListeners: function IUI_attachPageListeners()
  {
    this.win.addEventListener("keypress", this, true);
    this.browser.addEventListener("mousemove", this, true);
    this.browser.addEventListener("click", this, true);
  },

  /**
   * Detach event listeners from content window and child windows
   * to disable highlighting.
   */
  detachPageListeners: function IUI_detachPageListeners()
  {
    this.win.removeEventListener("keypress", this, true);
    this.browser.removeEventListener("mousemove", this, true);
    this.browser.removeEventListener("click", this, true);
  },

  /////////////////////////////////////////////////////////////////////////
  //// Utility Methods

  /**
   * inspect the given node, highlighting it on the page and selecting the
   * correct row in the tree panel
   *
   * @param aNode
   *        the element in the document to inspect
   */
  inspectNode: function IUI_inspectNode(aNode)
  {
    this.highlighter.highlightNode(aNode);
    this.selectEventsSuppressed = true;
    this.select(aNode, true, true);
    this.selectEventsSuppressed = false;
    this.updateStylePanel(aNode);
    this.updateDOMPanel(aNode);
  },

  /**
   * Find an element from the given coordinates. This method descends through
   * frames to find the element the user clicked inside frames.
   *
   * @param DOMDocument aDocument the document to look into.
   * @param integer aX
   * @param integer aY
   * @returns Node|null the element node found at the given coordinates.
   */
  elementFromPoint: function IUI_elementFromPoint(aDocument, aX, aY)
  {
    let node = aDocument.elementFromPoint(aX, aY);
    if (node && node.contentDocument) {
      switch (node.nodeName.toLowerCase()) {
        case "iframe":
          let rect = node.getBoundingClientRect();
          aX -= rect.left;
          aY -= rect.top;

        case "frame":
          let subnode = this.elementFromPoint(node.contentDocument, aX, aY);
          if (subnode) {
            node = subnode;
          }
      }
    }
    return node;
  },

  ///////////////////////////////////////////////////////////////////////////
  //// Utility functions

  /**
   * Does the given object have a class attribute?
   * @param aNode
   *        the DOM node.
   * @param aClass
   *        The class string.
   * @returns boolean
   */
  hasClass: function IUI_hasClass(aNode, aClass)
  {
    if (!(aNode instanceof Element))
      return false;
    return aNode.classList.contains(aClass);
  },

  /**
   * Add the class name to the given object.
   * @param aNode
   *        the DOM node.
   * @param aClass
   *        The class string.
   */
  addClass: function IUI_addClass(aNode, aClass)
  {
    if (aNode instanceof Element)
      aNode.classList.add(aClass);
  },

  /**
   * Remove the class name from the given object
   * @param aNode
   *        the DOM node.
   * @param aClass
   *        The class string.
   */
  removeClass: function IUI_removeClass(aNode, aClass)
  {
    if (aNode instanceof Element)
      aNode.classList.remove(aClass);
  },

  /**
   * Retrieve the unique ID of a window object.
   *
   * @param nsIDOMWindow aWindow
   * @returns integer ID
   */
  getWindowID: function IUI_getWindowID(aWindow)
  {
    if (!aWindow) {
      return null;
    }

    let util = {};

    try {
      util = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowUtils);
    } catch (ex) { }

    return util.currentInnerWindowID;
  },

  /**
   * Get the "repObject" from the HTML panel's domplate-constructed DOM node.
   * In this system, a "repObject" is the Object being Represented by the box
   * object. It is the "real" object that we're building our facade around.
   *
   * @param element
   *        The element in the HTML panel the user clicked.
   * @returns either a real node or null
   */
  getRepObject: function IUI_getRepObject(element)
  {
    let target = null;
    for (let child = element; child; child = child.parentNode) {
      if (this.hasClass(child, "repTarget"))
        target = child;

      if (child.repObject) {
        if (!target && this.hasClass(child.repObject, "repIgnore"))
          break;
        else
          return child.repObject;
      }
    }
    return null;
  },

  /**
   * @param msg
   *        text message to send to the log
   */
  _log: function LOG(msg)
  {
    Services.console.logStringMessage(msg);
  },
}

/**
 * The Inspector store is used for storing data specific to each tab window.
 */
var InspectorStore = {
  store: {},
  length: 0,

  /**
   * Check if there is any data recorded for any tab/window.
   *
   * @returns boolean True if there are no stores for any window/tab, or false
   * otherwise.
   */
  isEmpty: function IS_isEmpty()
  {
    return this.length == 0 ? true : false;
  },

  /**
   * Add a new store.
   *
   * @param string aID The Store ID you want created.
   * @returns boolean True if the store was added successfully, or false
   * otherwise.
   */
  addStore: function IS_addStore(aID)
  {
    let result = false;

    if (!(aID in this.store)) {
      this.store[aID] = {};
      this.length++;
      result = true;
    }

    return result;
  },

  /**
   * Delete a store by ID.
   *
   * @param string aID The store ID you want deleted.
   * @returns boolean True if the store was removed successfully, or false
   * otherwise.
   */
  deleteStore: function IS_deleteStore(aID)
  {
    let result = false;

    if (aID in this.store) {
      delete this.store[aID];
      this.length--;
      result = true;
    }

    return result;
  },

  /**
   * Check store existence.
   *
   * @param string aID The store ID you want to check.
   * @returns boolean True if the store ID is registered, or false otherwise.
   */
  hasID: function IS_hasID(aID)
  {
    return (aID in this.store);
  },

  /**
   * Retrieve a value from a store for a given key.
   *
   * @param string aID The store ID you want to read the value from.
   * @param string aKey The key name of the value you want.
   * @returns mixed the value associated to your store and key.
   */
  getValue: function IS_getValue(aID, aKey)
  {
    if (!this.hasID(aID))
      return null;
    if (aKey in this.store[aID])
      return this.store[aID][aKey];
    return null;
  },

  /**
   * Set a value for a given key and store.
   *
   * @param string aID The store ID where you want to store the value into.
   * @param string aKey The key name for which you want to save the value.
   * @param mixed aValue The value you want stored.
   * @returns boolean True if the value was stored successfully, or false
   * otherwise.
   */
  setValue: function IS_setValue(aID, aKey, aValue)
  {
    let result = false;

    if (aID in this.store) {
      this.store[aID][aKey] = aValue;
      result = true;
    }

    return result;
  },

  /**
   * Delete a value for a given key and store.
   *
   * @param string aID The store ID where you want to store the value into.
   * @param string aKey The key name for which you want to save the value.
   * @returns boolean True if the value was removed successfully, or false
   * otherwise.
   */
  deleteValue: function IS_deleteValue(aID, aKey)
  {
    let result = false;

    if (aID in this.store && aKey in this.store[aID]) {
      delete this.store[aID][aKey];
      result = true;
    }

    return result;
  }
};

/////////////////////////////////////////////////////////////////////////
//// Initializors

XPCOMUtils.defineLazyGetter(InspectorUI, "inspectCmd", function () {
  return document.getElementById("Tools:Inspect");
});

XPCOMUtils.defineLazyGetter(InspectorUI, "strings", function () {
  return Services.strings.createBundle("chrome://browser/locale/inspector.properties");
});

XPCOMUtils.defineLazyGetter(InspectorUI, "PropertyTreeView", function () {
  var obj = {};
  Cu.import("resource:///modules/PropertyPanel.jsm", obj);
  return obj.PropertyTreeView;
});

XPCOMUtils.defineLazyGetter(InspectorUI, "PropertyPanel", function () {
  var obj = {};
  Cu.import("resource:///modules/PropertyPanel.jsm", obj);
  return obj.PropertyPanel;
});

XPCOMUtils.defineLazyGetter(InspectorUI, "style", function () {
  var obj = {};
  Cu.import("resource:///modules/stylePanel.jsm", obj);
  obj.style.initialize();
  return obj.style;
});

//@line 41 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-places.js"


var StarUI = {
  _itemId: -1,
  uri: null,
  _batching: false,

  _element: function(aID) {
    return document.getElementById(aID);
  },

  // Edit-bookmark panel
  get panel() {
    delete this.panel;
    var element = this._element("editBookmarkPanel");
    // initially the panel is hidden
    // to avoid impacting startup / new window performance
    element.hidden = false;
    element.addEventListener("popuphidden", this, false);
    element.addEventListener("keypress", this, false);
    return this.panel = element;
  },

  // Array of command elements to disable when the panel is opened.
  get _blockedCommands() {
    delete this._blockedCommands;
    return this._blockedCommands =
      ["cmd_close", "cmd_closeWindow"].map(function (id) this._element(id), this);
  },

  _blockCommands: function SU__blockCommands() {
    this._blockedCommands.forEach(function (elt) {
      // make sure not to permanently disable this item (see bug 409155)
      if (elt.hasAttribute("wasDisabled"))
        return;
      if (elt.getAttribute("disabled") == "true") {
        elt.setAttribute("wasDisabled", "true");
      } else {
        elt.setAttribute("wasDisabled", "false");
        elt.setAttribute("disabled", "true");
      }
    });
  },

  _restoreCommandsState: function SU__restoreCommandsState() {
    this._blockedCommands.forEach(function (elt) {
      if (elt.getAttribute("wasDisabled") != "true")
        elt.removeAttribute("disabled");
      elt.removeAttribute("wasDisabled");
    });
  },

  // nsIDOMEventListener
  handleEvent: function SU_handleEvent(aEvent) {
    switch (aEvent.type) {
      case "popuphidden":
        if (aEvent.originalTarget == this.panel) {
          if (!this._element("editBookmarkPanelContent").hidden)
            this.quitEditMode();

          this._restoreCommandsState();
          this._itemId = -1;
          if (this._batching) {
            PlacesUIUtils.ptm.endBatch();
            this._batching = false;
          }

          switch (this._actionOnHide) {
            case "cancel": {
              PlacesUIUtils.ptm.undoTransaction();
              break;
            }
            case "remove": {
              // Remove all bookmarks for the bookmark's url, this also removes
              // the tags for the url.
              PlacesUIUtils.ptm.beginBatch();
              let itemIds = PlacesUtils.getBookmarksForURI(this._uriForRemoval);
              for (let i = 0; i < itemIds.length; i++) {
                let txn = PlacesUIUtils.ptm.removeItem(itemIds[i]);
                PlacesUIUtils.ptm.doTransaction(txn);
              }
              PlacesUIUtils.ptm.endBatch();
              break;
            }
          }
          this._actionOnHide = "";
        }
        break;
      case "keypress":
        if (aEvent.getPreventDefault()) {
          // The event has already been consumed inside of the panel.
          break;
        }
        switch (aEvent.keyCode) {
          case KeyEvent.DOM_VK_ESCAPE:
            if (!this._element("editBookmarkPanelContent").hidden)
              this.cancelButtonOnCommand();
            break;
          case KeyEvent.DOM_VK_RETURN:
            if (aEvent.target.className == "expander-up" ||
                aEvent.target.className == "expander-down" ||
                aEvent.target.id == "editBMPanel_newFolderButton") {
              //XXX Why is this necessary? The getPreventDefault() check should
              //    be enough.
              break;
            }
            this.panel.hidePopup();
            break;
        }
        break;
    }
  },

  _overlayLoaded: false,
  _overlayLoading: false,
  showEditBookmarkPopup:
  function SU_showEditBookmarkPopup(aItemId, aAnchorElement, aPosition) {
    // Performance: load the overlay the first time the panel is opened
    // (see bug 392443).
    if (this._overlayLoading)
      return;

    if (this._overlayLoaded) {
      this._doShowEditBookmarkPanel(aItemId, aAnchorElement, aPosition);
      return;
    }

    var loadObserver = {
      _self: this,
      _itemId: aItemId,
      _anchorElement: aAnchorElement,
      _position: aPosition,
      observe: function (aSubject, aTopic, aData) {
        //XXX We just caused localstore.rdf to be re-applied (bug 640158)
        retrieveToolbarIconsizesFromTheme();

        this._self._overlayLoading = false;
        this._self._overlayLoaded = true;
        this._self._doShowEditBookmarkPanel(this._itemId, this._anchorElement,
                                            this._position);
      }
    };
    this._overlayLoading = true;
    document.loadOverlay("chrome://browser/content/places/editBookmarkOverlay.xul",
                         loadObserver);
  },

  _doShowEditBookmarkPanel:
  function SU__doShowEditBookmarkPanel(aItemId, aAnchorElement, aPosition) {
    if (this.panel.state != "closed")
      return;

    this._blockCommands(); // un-done in the popuphiding handler

    // Move the header (star, title, possibly a button) into the grid,
    // so that it aligns nicely with the other items (bug 484022).
    var rows = this._element("editBookmarkPanelGrid").lastChild;
    var header = this._element("editBookmarkPanelHeader");
    rows.insertBefore(header, rows.firstChild);
    header.hidden = false;

    // Set panel title:
    // if we are batching, i.e. the bookmark has been added now,
    // then show Page Bookmarked, else if the bookmark did already exist,
    // we are about editing it, then use Edit This Bookmark.
    this._element("editBookmarkPanelTitle").value =
      this._batching ?
        gNavigatorBundle.getString("editBookmarkPanel.pageBookmarkedTitle") :
        gNavigatorBundle.getString("editBookmarkPanel.editBookmarkTitle");

    // No description; show the Done, Cancel;
    this._element("editBookmarkPanelDescription").textContent = "";
    this._element("editBookmarkPanelBottomButtons").hidden = false;
    this._element("editBookmarkPanelContent").hidden = false;

    // The remove button is shown only if we're not already batching, i.e.
    // if the cancel button/ESC does not remove the bookmark.
    this._element("editBookmarkPanelRemoveButton").hidden = this._batching;

    // The label of the remove button differs if the URI is bookmarked
    // multiple times.
    var bookmarks = PlacesUtils.getBookmarksForURI(gBrowser.currentURI);
    var forms = gNavigatorBundle.getString("editBookmark.removeBookmarks.label");
    var label = PluralForm.get(bookmarks.length, forms).replace("#1", bookmarks.length);
    this._element("editBookmarkPanelRemoveButton").label = label;

    // unset the unstarred state, if set
    this._element("editBookmarkPanelStarIcon").removeAttribute("unstarred");

    this._itemId = aItemId !== undefined ? aItemId : this._itemId;
    this.beginBatch();

    // Consume dismiss clicks, see bug 400924
    this.panel.popupBoxObject
        .setConsumeRollupEvent(Ci.nsIPopupBoxObject.ROLLUP_CONSUME);
    this.panel.openPopup(aAnchorElement, aPosition);

    gEditItemOverlay.initPanel(this._itemId,
                               { hiddenRows: ["description", "location",
                                              "loadInSidebar", "keyword"] });
  },

  panelShown:
  function SU_panelShown(aEvent) {
    if (aEvent.target == this.panel) {
      if (!this._element("editBookmarkPanelContent").hidden) {
        let fieldToFocus = "editBMPanel_" +
          gPrefService.getCharPref("browser.bookmarks.editDialog.firstEditField");
        var elt = this._element(fieldToFocus);
        elt.focus();
        elt.select();
      }
      else {
        // Note this isn't actually used anymore, we should remove this
        // once we decide not to bring back the page bookmarked notification
        this.panel.focus();
      }
    }
  },

  quitEditMode: function SU_quitEditMode() {
    this._element("editBookmarkPanelContent").hidden = true;
    this._element("editBookmarkPanelBottomButtons").hidden = true;
    gEditItemOverlay.uninitPanel(true);
  },

  editButtonCommand: function SU_editButtonCommand() {
    this.showEditBookmarkPopup();
  },

  cancelButtonOnCommand: function SU_cancelButtonOnCommand() {
    this._actionOnHide = "cancel";
    this.panel.hidePopup();
  },

  removeBookmarkButtonCommand: function SU_removeBookmarkButtonCommand() {
    this._uriForRemoval = PlacesUtils.bookmarks.getBookmarkURI(this._itemId);
    this._actionOnHide = "remove";
    this.panel.hidePopup();
  },

  beginBatch: function SU_beginBatch() {
    if (!this._batching) {
      PlacesUIUtils.ptm.beginBatch();
      this._batching = true;
    }
  }
}

var PlacesCommandHook = {
  /**
   * Adds a bookmark to the page loaded in the given browser.
   *
   * @param aBrowser
   *        a <browser> element.
   * @param [optional] aParent
   *        The folder in which to create a new bookmark if the page loaded in
   *        aBrowser isn't bookmarked yet, defaults to the unfiled root.
   * @param [optional] aShowEditUI
   *        whether or not to show the edit-bookmark UI for the bookmark item
   */  
  bookmarkPage: function PCH_bookmarkPage(aBrowser, aParent, aShowEditUI) {
    var uri = aBrowser.currentURI;
    var itemId = PlacesUtils.getMostRecentBookmarkForURI(uri);
    if (itemId == -1) {
      // Copied over from addBookmarkForBrowser:
      // Bug 52536: We obtain the URL and title from the nsIWebNavigation
      // associated with a <browser/> rather than from a DOMWindow.
      // This is because when a full page plugin is loaded, there is
      // no DOMWindow (?) but information about the loaded document
      // may still be obtained from the webNavigation.
      var webNav = aBrowser.webNavigation;
      var url = webNav.currentURI;
      var title;
      var description;
      var charset;
      try {
        title = webNav.document.title || url.spec;
        description = PlacesUIUtils.getDescriptionFromDocument(webNav.document);
        charset = webNav.document.characterSet;
      }
      catch (e) { }

      if (aShowEditUI) {
        // If we bookmark the page here (i.e. page was not "starred" already)
        // but open right into the "edit" state, start batching here, so
        // "Cancel" in that state removes the bookmark.
        StarUI.beginBatch();
      }

      var parent = aParent != undefined ?
                   aParent : PlacesUtils.unfiledBookmarksFolderId;
      var descAnno = { name: PlacesUIUtils.DESCRIPTION_ANNO, value: description };
      var txn = PlacesUIUtils.ptm.createItem(uri, parent, -1,
                                             title, null, [descAnno]);
      PlacesUIUtils.ptm.doTransaction(txn);
      // Set the character-set
      if (charset)
        PlacesUtils.history.setCharsetForURI(uri, charset);
      itemId = PlacesUtils.getMostRecentBookmarkForURI(uri);
    }

    // Revert the contents of the location bar
    if (gURLBar)
      gURLBar.handleRevert();

    // dock the panel to the star icon when possible, otherwise dock
    // it to the content area
    if (aBrowser.contentWindow == window.content) {
      var starIcon = aBrowser.ownerDocument.getElementById("star-button");
      if (starIcon && isElementVisible(starIcon)) {
        if (aShowEditUI)
          StarUI.showEditBookmarkPopup(itemId, starIcon, "bottomcenter topright");
        return;
      }
    }

    StarUI.showEditBookmarkPopup(itemId, aBrowser, "overlap");
  },

  /**
   * Adds a bookmark to the page loaded in the current tab. 
   */
  bookmarkCurrentPage: function PCH_bookmarkCurrentPage(aShowEditUI, aParent) {
    this.bookmarkPage(gBrowser.selectedBrowser, aParent, aShowEditUI);
  },

  /**
   * Adds a bookmark to the page targeted by a link.
   * @param aParent
   *        The folder in which to create a new bookmark if aURL isn't
   *        bookmarked.
   * @param aURL (string)
   *        the address of the link target
   * @param aTitle
   *        The link text
   */
  bookmarkLink: function PCH_bookmarkLink(aParent, aURL, aTitle) {
    var linkURI = makeURI(aURL);
    var itemId = PlacesUtils.getMostRecentBookmarkForURI(linkURI);
    if (itemId == -1)
      PlacesUIUtils.showMinimalAddBookmarkUI(linkURI, aTitle);
    else {
      PlacesUIUtils.showItemProperties(itemId,
                                       PlacesUtils.bookmarks.TYPE_BOOKMARK);
    }
  },

  /**
   * List of nsIURI objects characterizing the tabs currently open in the
   * browser, modulo pinned tabs.  The URIs will be in the order in which their
   * corresponding tabs appeared and duplicates are discarded.
   */
  get uniqueCurrentPages() {
    let uniquePages = {};
    let URIs = [];
    gBrowser.visibleTabs.forEach(function (tab) {
      let spec = tab.linkedBrowser.currentURI.spec;
      if (!tab.pinned && !(spec in uniquePages)) {
        uniquePages[spec] = null;
        URIs.push(tab.linkedBrowser.currentURI);
      }
    });
    return URIs;
  },

  /**
   * Adds a folder with bookmarks to all of the currently open tabs in this 
   * window.
   */
  bookmarkCurrentPages: function PCH_bookmarkCurrentPages() {
    let pages = this.uniqueCurrentPages;
    if (pages.length > 1) {
      PlacesUIUtils.showMinimalAddMultiBookmarkUI(pages);
    }
  },

  /**
   * Updates disabled state for the "Bookmark All Tabs" command.
   */
  updateBookmarkAllTabsCommand:
  function PCH_updateBookmarkAllTabsCommand() {
    // There's nothing to do in non-browser windows.
    if (window.location.href != getBrowserURL())
      return;

    // Disable "Bookmark All Tabs" if there are less than two
    // "unique current pages".
    goSetCommandEnabled("Browser:BookmarkAllTabs",
                        this.uniqueCurrentPages.length >= 2);
  },

  /**
   * Adds a Live Bookmark to a feed associated with the current page. 
   * @param     url
   *            The nsIURI of the page the feed was attached to
   * @title     title
   *            The title of the feed. Optional.
   * @subtitle  subtitle
   *            A short description of the feed. Optional.
   */
  addLiveBookmark: function PCH_addLiveBookmark(url, feedTitle, feedSubtitle) {
    var feedURI = makeURI(url);
    
    var doc = gBrowser.contentDocument;
    var title = (arguments.length > 1) ? feedTitle : doc.title;
 
    var description;
    if (arguments.length > 2)
      description = feedSubtitle;
    else
      description = PlacesUIUtils.getDescriptionFromDocument(doc);

    var toolbarIP =
      new InsertionPoint(PlacesUtils.bookmarks.toolbarFolder, -1);
    PlacesUIUtils.showMinimalAddLivemarkUI(feedURI, gBrowser.currentURI,
                                           title, description, toolbarIP, true);
  },

  /**
   * Opens the Places Organizer. 
   * @param   aLeftPaneRoot
   *          The query to select in the organizer window - options
   *          are: History, AllBookmarks, BookmarksMenu, BookmarksToolbar,
   *          UnfiledBookmarks and Tags.
   */
  showPlacesOrganizer: function PCH_showPlacesOrganizer(aLeftPaneRoot) {
    var organizer = Services.wm.getMostRecentWindow("Places:Organizer");
    if (!organizer) {
      // No currently open places window, so open one with the specified mode.
      openDialog("chrome://browser/content/places/places.xul", 
                 "", "chrome,toolbar=yes,dialog=no,resizable", aLeftPaneRoot);
    }
    else {
      organizer.PlacesOrganizer.selectLeftPaneQuery(aLeftPaneRoot);
      organizer.focus();
    }
  }
};

// View for the history menu.
function HistoryMenu(aPopupShowingEvent) {
  // Workaround for Bug 610187.  The sidebar does not include all the Places
  // views definitions, and we don't need them there.
  // Defining the prototype inheritance in the prototype itself would cause
  // browser.js to halt on "PlacesMenu is not defined" error.
  this.__proto__.__proto__ = PlacesMenu.prototype;
  XPCOMUtils.defineLazyServiceGetter(this, "_ss",
                                     "@mozilla.org/browser/sessionstore;1",
                                     "nsISessionStore");
  PlacesMenu.call(this, aPopupShowingEvent,
                  "place:redirectsMode=2&sort=4&maxResults=10");
}

HistoryMenu.prototype = {
  toggleRecentlyClosedTabs: function HM_toggleRecentlyClosedTabs() {
    // enable/disable the Recently Closed Tabs sub menu
    var undoMenu = this._rootElt.getElementsByClassName("recentlyClosedTabsMenu")[0];

    // no restorable tabs, so disable menu
    if (this._ss.getClosedTabCount(window) == 0)
      undoMenu.setAttribute("disabled", true);
    else
      undoMenu.removeAttribute("disabled");
  },

  /**
    * Re-open a closed tab and put it to the end of the tab strip.
    * Used for a middle click.
    * @param aEvent
    *        The event when the user clicks the menu item
    */
  _undoCloseMiddleClick: function PHM__undoCloseMiddleClick(aEvent) {
    if (aEvent.button != 1)
      return;

    undoCloseTab(aEvent.originalTarget.value);
    gBrowser.moveTabToEnd();
  },

  /**
   * Populate when the history menu is opened
   */
  populateUndoSubmenu: function PHM_populateUndoSubmenu() {
    var undoMenu = this._rootElt.getElementsByClassName("recentlyClosedTabsMenu")[0];
    var undoPopup = undoMenu.firstChild;

    // remove existing menu items
    while (undoPopup.hasChildNodes())
      undoPopup.removeChild(undoPopup.firstChild);

    // no restorable tabs, so make sure menu is disabled, and return
    if (this._ss.getClosedTabCount(window) == 0) {
      undoMenu.setAttribute("disabled", true);
      return;
    }

    // enable menu
    undoMenu.removeAttribute("disabled");

    // populate menu
    var undoItems = eval("(" + this._ss.getClosedTabData(window) + ")");
    for (var i = 0; i < undoItems.length; i++) {
      var m = document.createElement("menuitem");
      m.setAttribute("label", undoItems[i].title);
      if (undoItems[i].image) {
        let iconURL = undoItems[i].image;
        // don't initiate a connection just to fetch a favicon (see bug 467828)
        if (/^https?:/.test(iconURL))
          iconURL = "moz-anno:favicon:" + iconURL;
        m.setAttribute("image", iconURL);
      }
      m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
      m.setAttribute("value", i);
      m.setAttribute("oncommand", "undoCloseTab(" + i + ");");

      // Set the targetURI attribute so it will be shown in tooltip and trigger
      // onLinkHovered. SessionStore uses one-based indexes, so we need to
      // normalize them.
      let tabData = undoItems[i].state;
      let activeIndex = (tabData.index || tabData.entries.length) - 1;
      if (activeIndex >= 0 && tabData.entries[activeIndex])
        m.setAttribute("targetURI", tabData.entries[activeIndex].url);

      m.addEventListener("click", this._undoCloseMiddleClick, false);
      if (i == 0)
        m.setAttribute("key", "key_undoCloseTab");
      undoPopup.appendChild(m);
    }

    // "Restore All Tabs"
    var strings = gNavigatorBundle;
    undoPopup.appendChild(document.createElement("menuseparator"));
    m = undoPopup.appendChild(document.createElement("menuitem"));
    m.id = "menu_restoreAllTabs";
    m.setAttribute("label", strings.getString("menuRestoreAllTabs.label"));
    m.addEventListener("command", function() {
      for (var i = 0; i < undoItems.length; i++)
        undoCloseTab();
    }, false);
  },

  toggleRecentlyClosedWindows: function PHM_toggleRecentlyClosedWindows() {
    // enable/disable the Recently Closed Windows sub menu
    var undoMenu = this._rootElt.getElementsByClassName("recentlyClosedWindowsMenu")[0];

    // no restorable windows, so disable menu
    if (this._ss.getClosedWindowCount() == 0)
      undoMenu.setAttribute("disabled", true);
    else
      undoMenu.removeAttribute("disabled");
  },

  /**
   * Populate when the history menu is opened
   */
  populateUndoWindowSubmenu: function PHM_populateUndoWindowSubmenu() {
    let undoMenu = this._rootElt.getElementsByClassName("recentlyClosedWindowsMenu")[0];
    let undoPopup = undoMenu.firstChild;
    let menuLabelString = gNavigatorBundle.getString("menuUndoCloseWindowLabel");
    let menuLabelStringSingleTab =
      gNavigatorBundle.getString("menuUndoCloseWindowSingleTabLabel");

    // remove existing menu items
    while (undoPopup.hasChildNodes())
      undoPopup.removeChild(undoPopup.firstChild);

    // no restorable windows, so make sure menu is disabled, and return
    if (this._ss.getClosedWindowCount() == 0) {
      undoMenu.setAttribute("disabled", true);
      return;
    }

    // enable menu
    undoMenu.removeAttribute("disabled");

    // populate menu
    let undoItems = JSON.parse(this._ss.getClosedWindowData());
    for (let i = 0; i < undoItems.length; i++) {
      let undoItem = undoItems[i];
      let otherTabsCount = undoItem.tabs.length - 1;
      let label = (otherTabsCount == 0) ? menuLabelStringSingleTab
                                        : PluralForm.get(otherTabsCount, menuLabelString);
      let menuLabel = label.replace("#1", undoItem.title)
                           .replace("#2", otherTabsCount);
      let m = document.createElement("menuitem");
      m.setAttribute("label", menuLabel);
      let selectedTab = undoItem.tabs[undoItem.selected - 1];
      if (selectedTab.attributes.image) {
        let iconURL = selectedTab.attributes.image;
        // don't initiate a connection just to fetch a favicon (see bug 467828)
        if (/^https?:/.test(iconURL))
          iconURL = "moz-anno:favicon:" + iconURL;
        m.setAttribute("image", iconURL);
      }
      m.setAttribute("class", "menuitem-iconic bookmark-item menuitem-with-favicon");
      m.setAttribute("oncommand", "undoCloseWindow(" + i + ");");

      // Set the targetURI attribute so it will be shown in tooltip.
      // SessionStore uses one-based indexes, so we need to normalize them.
      let activeIndex = (selectedTab.index || selectedTab.entries.length) - 1;
      if (activeIndex >= 0 && selectedTab.entries[activeIndex])
        m.setAttribute("targetURI", selectedTab.entries[activeIndex].url);

      if (i == 0)
        m.setAttribute("key", "key_undoCloseWindow");
      undoPopup.appendChild(m);
    }

    // "Open All in Windows"
    undoPopup.appendChild(document.createElement("menuseparator"));
    let m = undoPopup.appendChild(document.createElement("menuitem"));
    m.id = "menu_restoreAllWindows";
    m.setAttribute("label", gNavigatorBundle.getString("menuRestoreAllWindows.label"));
    m.setAttribute("oncommand",
      "for (var i = 0; i < " + undoItems.length + "; i++) undoCloseWindow();");
  },

  toggleTabsFromOtherComputers: function PHM_toggleTabsFromOtherComputers() {
    // This is a no-op if MOZ_SERVICES_SYNC isn't defined
//@line 662 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-places.js"
    // enable/disable the Tabs From Other Computers menu
    let menuitem = document.getElementById("sync-tabs-menuitem");

    // If Sync isn't configured yet, then don't show the menuitem.
    if (Weave.Status.checkSetup() == Weave.CLIENT_NOT_CONFIGURED ||
        Weave.Svc.Prefs.get("firstSync", "") == "notReady") {
      menuitem.setAttribute("hidden", true);
      return;
    }

    // The tabs engine might never be inited (if services.sync.registerEngines
    // is modified), so make sure we avoid undefined errors.
    let enabled = Weave.Service.isLoggedIn && Weave.Engines.get("tabs") &&
                  Weave.Engines.get("tabs").enabled;
    menuitem.setAttribute("disabled", !enabled);
    menuitem.setAttribute("hidden", false);
//@line 679 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-places.js"
  },

  toggleRestoreLastSession: function PHM_toggleRestoreLastSession() {
    let restoreItem = this._rootElt.getElementsByClassName("restoreLastSession")[0];

    if (this._ss.canRestoreLastSession)
      restoreItem.removeAttribute("disabled");
    else
      restoreItem.setAttribute("disabled", true);
  },

  _onPopupShowing: function HM__onPopupShowing(aEvent) {
    PlacesMenu.prototype._onPopupShowing.apply(this, arguments);

    // Don't handle events for submenus.
    if (aEvent.target != aEvent.currentTarget)
      return;

    this.toggleRecentlyClosedTabs();
    this.toggleRecentlyClosedWindows();
    this.toggleTabsFromOtherComputers();
    this.toggleRestoreLastSession();
  },

  _onCommand: function HM__onCommand(aEvent) {
    let placesNode = aEvent.target._placesNode;
    if (placesNode) {
      PlacesUIUtils.markPageAsTyped(placesNode.uri);
      openUILink(placesNode.uri, aEvent, false, true);
    }
  }
};

/**
 * Functions for handling events in the Bookmarks Toolbar and menu.
 */
var BookmarksEventHandler = {
  /**
   * Handler for click event for an item in the bookmarks toolbar or menu.
   * Menus and submenus from the folder buttons bubble up to this handler.
   * Left-click is handled in the onCommand function.
   * When items are middle-clicked (or clicked with modifier), open in tabs.
   * If the click came through a menu, close the menu.
   * @param aEvent
   *        DOMEvent for the click
   * @param aView
   *        The places view which aEvent should be associated with.
   */
  onClick: function BEH_onClick(aEvent, aView) {
    // Only handle middle-click or left-click with modifiers.
//@line 732 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-places.js"
    var modifKey = aEvent.ctrlKey || aEvent.shiftKey;
//@line 734 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-places.js"
    if (aEvent.button == 2 || (aEvent.button == 0 && !modifKey))
      return;

    var target = aEvent.originalTarget;
    // If this event bubbled up from a menu or menuitem, close the menus.
    // Do this before opening tabs, to avoid hiding the open tabs confirm-dialog.
    if (target.localName == "menu" || target.localName == "menuitem") {
      for (node = target.parentNode; node; node = node.parentNode) {
        if (node.localName == "menupopup")
          node.hidePopup();
        else if (node.localName != "menu" &&
                 node.localName != "splitmenu" &&
                 node.localName != "hbox" &&
                 node.localName != "vbox" )
          break;
      }
    }

    if (target._placesNode && PlacesUtils.nodeIsContainer(target._placesNode)) {
      // Don't open the root folder in tabs when the empty area on the toolbar
      // is middle-clicked or when a non-bookmark item except for Open in Tabs)
      // in a bookmarks menupopup is middle-clicked.
      if (target.localName == "menu" || target.localName == "toolbarbutton")
        PlacesUIUtils.openContainerNodeInTabs(target._placesNode, aEvent, aView);
    }
    else if (aEvent.button == 1) {
      // left-clicks with modifier are already served by onCommand
      this.onCommand(aEvent, aView);
    }
  },

  /**
   * Handler for command event for an item in the bookmarks toolbar.
   * Menus and submenus from the folder buttons bubble up to this handler.
   * Opens the item.
   * @param aEvent 
   *        DOMEvent for the command
   * @param aView
   *        The places view which aEvent should be associated with.
   */
  onCommand: function BEH_onCommand(aEvent, aView) {
    var target = aEvent.originalTarget;
    if (target._placesNode)
      PlacesUIUtils.openNodeWithEvent(target._placesNode, aEvent, aView);
  },

  fillInBHTooltip: function BEH_fillInBHTooltip(aDocument, aEvent) {
    var node;
    var cropped = false;
    var targetURI;

    if (aDocument.tooltipNode.localName == "treechildren") {
      var tree = aDocument.tooltipNode.parentNode;
      var row = {}, column = {};
      var tbo = tree.treeBoxObject;
      tbo.getCellAt(aEvent.clientX, aEvent.clientY, row, column, {});
      if (row.value == -1)
        return false;
      node = tree.view.nodeForTreeIndex(row.value);
      cropped = tbo.isCellCropped(row.value, column.value);
    }
    else {
      // Check whether the tooltipNode is a Places node.
      // In such a case use it, otherwise check for targetURI attribute.
      var tooltipNode = aDocument.tooltipNode;
      if (tooltipNode._placesNode)
        node = tooltipNode._placesNode;
      else {
        // This is a static non-Places node.
        targetURI = tooltipNode.getAttribute("targetURI");
      }
    }

    if (!node && !targetURI)
      return false;

    // Show node.label as tooltip's title for non-Places nodes.
    var title = node ? node.title : tooltipNode.label;

    // Show URL only for Places URI-nodes or nodes with a targetURI attribute.
    var url;
    if (targetURI || PlacesUtils.nodeIsURI(node))
      url = targetURI || node.uri;

    // Show tooltip for containers only if their title is cropped.
    if (!cropped && !url)
      return false;

    var tooltipTitle = aDocument.getElementById("bhtTitleText");
    tooltipTitle.hidden = (!title || (title == url));
    if (!tooltipTitle.hidden)
      tooltipTitle.textContent = title;

    var tooltipUrl = aDocument.getElementById("bhtUrlText");
    tooltipUrl.hidden = !url;
    if (!tooltipUrl.hidden)
      tooltipUrl.value = url;

    // Show tooltip.
    return true;
  }
};


// Handles special drag and drop functionality for Places menus that are not
// part of a Places view (e.g. the bookmarks menu in the menubar).
var PlacesMenuDNDHandler = {
  _springLoadDelay: 350, // milliseconds
  _loadTimer: null,

  /**
   * Called when the user enters the <menu> element during a drag.
   * @param   event
   *          The DragEnter event that spawned the opening. 
   */
  onDragEnter: function PMDH_onDragEnter(event) {
    // Opening menus in a Places popup is handled by the view itself.
    if (!this._isStaticContainer(event.target))
      return;

    this._loadTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this._loadTimer.initWithCallback(function() {
      PlacesMenuDNDHandler._loadTimer = null;
      event.target.lastChild.setAttribute("autoopened", "true");
      event.target.lastChild.showPopup(event.target.lastChild);
    }, this._springLoadDelay, Ci.nsITimer.TYPE_ONE_SHOT);
    event.preventDefault();
    event.stopPropagation();
  },

  /**
   * Handles dragexit on the <menu> element.
   * @returns true if the element is a container element (menu or 
   *          menu-toolbarbutton), false otherwise.
   */
  onDragExit: function PMDH_onDragExit(event) {
    // Closing menus in a Places popup is handled by the view itself.
    if (!this._isStaticContainer(event.target))
      return;

    if (this._loadTimer) {
      this._loadTimer.cancel();
      this._loadTimer = null;
    }
    let closeTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    closeTimer.initWithCallback(function() {
      let node = PlacesControllerDragHelper.currentDropTarget;
      let inHierarchy = false;
      while (node && !inHierarchy) {
        inHierarchy = node == event.target;
        node = node.parentNode;
      }
      if (!inHierarchy && event.target.lastChild &&
          event.target.lastChild.hasAttribute("autoopened")) {
        event.target.lastChild.removeAttribute("autoopened");
        event.target.lastChild.hidePopup();
      }
    }, this._springLoadDelay, Ci.nsITimer.TYPE_ONE_SHOT);
  },

  /**
   * Determines if a XUL element represents a static container.
   * @returns true if the element is a container element (menu or 
   *`         menu-toolbarbutton), false otherwise.
   */
  _isStaticContainer: function PMDH__isContainer(node) {
    let isMenu = node.localName == "menu" ||
                 (node.localName == "toolbarbutton" &&
                  node.getAttribute("type") == "menu");
    let isStatic = !("_placesNode" in node) && node.lastChild &&
                   node.lastChild.hasAttribute("placespopup") &&
                   !node.parentNode.hasAttribute("placespopup");
    return isMenu && isStatic;
  },

  /**
   * Called when the user drags over the <menu> element.
   * @param   event
   *          The DragOver event. 
   */
  onDragOver: function PMDH_onDragOver(event) {
    let ip = new InsertionPoint(PlacesUtils.bookmarksMenuFolderId,
                                PlacesUtils.bookmarks.DEFAULT_INDEX,
                                Ci.nsITreeView.DROP_ON);
    if (ip && PlacesControllerDragHelper.canDrop(ip, event.dataTransfer))
      event.preventDefault();

    event.stopPropagation();
  },

  /**
   * Called when the user drops on the <menu> element.
   * @param   event
   *          The Drop event. 
   */
  onDrop: function PMDH_onDrop(event) {
    // Put the item at the end of bookmark menu.
    let ip = new InsertionPoint(PlacesUtils.bookmarksMenuFolderId,
                                PlacesUtils.bookmarks.DEFAULT_INDEX,
                                Ci.nsITreeView.DROP_ON);
    PlacesControllerDragHelper.onDrop(ip, event.dataTransfer);
    event.stopPropagation();
  }
};


var PlacesStarButton = {
  _hasBookmarksObserver: false,
  uninit: function PSB_uninit()
  {
    if (this._hasBookmarksObserver) {
      PlacesUtils.bookmarks.removeObserver(this);
    }
    if (this._pendingStmt) {
      this._pendingStmt.cancel();
      delete this._pendingStmt;
    }
  },

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsINavBookmarkObserver
  ]),

  get _starredTooltip()
  {
    delete this._starredTooltip;
    return this._starredTooltip =
      gNavigatorBundle.getString("starButtonOn.tooltip");
  },
  get _unstarredTooltip()
  {
    delete this._unstarredTooltip;
    return this._unstarredTooltip =
      gNavigatorBundle.getString("starButtonOff.tooltip");
  },

  updateState: function PSB_updateState()
  {
    this._starIcon = document.getElementById("star-button");
    if (!this._starIcon || (this._uri && gBrowser.currentURI.equals(this._uri))) {
      return;
    }

    // Reset tracked values.
    this._uri = gBrowser.currentURI;
    this._itemIds = [];

    if (this._pendingStmt) {
      this._pendingStmt.cancel();
      delete this._pendingStmt;
    }

    // We can load about:blank before the actual page, but there is no point in handling that page.
    if (this._uri.spec == "about:blank") {
      return;
    }

    this._pendingStmt = PlacesUtils.asyncGetBookmarkIds(this._uri, function (aItemIds, aURI) {
      // Safety check that the bookmarked URI equals the tracked one.
      if (!aURI.equals(this._uri)) {
        Components.utils.reportError("PlacesStarButton did not receive current URI");
        return;
      }

      // It's possible that onItemAdded gets called before the async statement
      // calls back.  For such an edge case, retain all unique entries from both
      // arrays.
      this._itemIds = this._itemIds.filter(
        function (id) aItemIds.indexOf(id) == -1
      ).concat(aItemIds);
      this._updateStateInternal();

      // Start observing bookmarks if needed.
      if (!this._hasBookmarksObserver) {
        try {
          PlacesUtils.bookmarks.addObserver(this, false);
          this._hasBookmarksObserver = true;
        } catch(ex) {
          Components.utils.reportError("PlacesStarButton failed adding a bookmarks observer: " + ex);
        }
      }

      delete this._pendingStmt;
    }, this);
  },

  _updateStateInternal: function PSB__updateStateInternal()
  {
    if (!this._starIcon) {
      return;
    }

    if (this._itemIds.length > 0) {
      this._starIcon.setAttribute("starred", "true");
      this._starIcon.setAttribute("tooltiptext", this._starredTooltip);
    }
    else {
      this._starIcon.removeAttribute("starred");
      this._starIcon.setAttribute("tooltiptext", this._unstarredTooltip);
    }
  },

  onClick: function PSB_onClick(aEvent)
  {
    // Ignore clicks on the star while we update its state.
    if (aEvent.button == 0 && !this._pendingStmt) {
      PlacesCommandHook.bookmarkCurrentPage(this._itemIds.length > 0);
    }
    // Don't bubble to the textbox, to avoid unwanted selection of the address.
    aEvent.stopPropagation();
  },

  // nsINavBookmarkObserver
  onItemAdded:
  function PSB_onItemAdded(aItemId, aFolder, aIndex, aItemType, aURI)
  {
    if (!this._starIcon) {
      return;
    }

    if (aURI && aURI.equals(this._uri)) {
      // If a new bookmark has been added to the tracked uri, register it.
      if (this._itemIds.indexOf(aItemId) == -1) {
        this._itemIds.push(aItemId);
        this._updateStateInternal();
      }
    }
  },

  onItemRemoved:
  function PSB_onItemRemoved(aItemId, aFolder, aIndex, aItemType)
  {
    if (!this._starIcon) {
      return;
    }

    let index = this._itemIds.indexOf(aItemId);
    // If one of the tracked bookmarks has been removed, unregister it.
    if (index != -1) {
      this._itemIds.splice(index, 1);
      this._updateStateInternal();
    }
  },

  onItemChanged:
  function PSB_onItemChanged(aItemId, aProperty, aIsAnnotationProperty,
                             aNewValue, aLastModified, aItemType)
  {
    if (!this._starIcon) {
      return;
    }

    if (aProperty == "uri") {
      let index = this._itemIds.indexOf(aItemId);
      // If the changed bookmark was tracked, check if it is now pointing to
      // a different uri and unregister it.
      if (index != -1 && aNewValue != this._uri.spec) {
        this._itemIds.splice(index, 1);
        this._updateStateInternal();
      }
      // If another bookmark is now pointing to the tracked uri, register it.
      else if (index == -1 && aNewValue == this._uri.spec) {
        this._itemIds.push(aItemId);
        this._updateStateInternal();
      }
    }
  },

  onBeginUpdateBatch: function () {},
  onEndUpdateBatch: function () {},
  onBeforeItemRemoved: function () {},
  onItemVisited: function () {},
  onItemMoved: function () {}
};


// This object handles the initialization and uninitialization of the bookmarks
// toolbar.  updateState is called when the browser window is opened and
// after closing the toolbar customization dialog.
let PlacesToolbarHelper = {
  _place: "place:folder=TOOLBAR",

  get _viewElt() {
    return document.getElementById("PlacesToolbar");
  },

  init: function PTH_init() {
    let viewElt = this._viewElt;
    if (!viewElt || viewElt._placesView)
      return;

    // If the bookmarks toolbar item is hidden because the parent toolbar is
    // collapsed or hidden (i.e. in a popup), spare the initialization.
    let toolbar = viewElt.parentNode.parentNode;
    if (toolbar.collapsed ||
        getComputedStyle(toolbar, "").display == "none")
      return;

    new PlacesToolbar(this._place);
  },

  customizeStart: function PTH_customizeStart() {
    let viewElt = this._viewElt;
    if (viewElt && viewElt._placesView)
      viewElt._placesView.uninit();
  },

  customizeDone: function PTH_customizeDone() {
    this.init();
  }
};


// Handles the bookmarks menu button shown when the main menubar is hidden.
let BookmarksMenuButton = {
  get button() {
    return document.getElementById("bookmarks-menu-button");
  },

  get buttonContainer() {
    return document.getElementById("bookmarks-menu-button-container");
  },

  get personalToolbar() {
    delete this.personalToolbar;
    return this.personalToolbar = document.getElementById("PersonalToolbar");
  },

  get bookmarksToolbarItem() {
    return document.getElementById("personal-bookmarks");
  },

  init: function BMB_init() {
    this.updatePosition();

    // Any other stuff that does not regard the button itself should be
    // handled in the onPopupShowing handler, so it does not hit Ts.
  },

  _popupNeedsUpdate: {},
  onPopupShowing: function BMB_onPopupShowing(event) {
    // Don't handle events for submenus.
    if (event.target != event.currentTarget)
      return;

    let popup = event.target;
    let needsUpdate = this._popupNeedsUpdate[popup.id];

    // Check if popup contents need to be updated.  Note that if needsUpdate is
    // undefined we have never seen the popup, thus it should be updated.
    if (needsUpdate === false)
      return;
    this._popupNeedsUpdate[popup.id] = false;

    function getPlacesAnonymousElement(aAnonId)
      document.getAnonymousElementByAttribute(popup.parentNode,
                                              "placesanonid",
                                              aAnonId);

    let viewToolbarMenuitem = getPlacesAnonymousElement("view-toolbar");
    if (viewToolbarMenuitem) {
      // Update View bookmarks toolbar checkbox menuitem.
      viewToolbarMenuitem.setAttribute("checked",
                                       !this.personalToolbar.collapsed);
    }

    let toolbarMenuitem = getPlacesAnonymousElement("toolbar-autohide");
    if (toolbarMenuitem) {
      // If bookmarks items are visible, hide Bookmarks Toolbar menu and the
      // separator after it.
      toolbarMenuitem.collapsed = toolbarMenuitem.nextSibling.collapsed =
        isElementVisible(this.bookmarksToolbarItem);
    }
  },

  updatePosition: function BMB_updatePosition() {
    // Popups will have to be updated when the user customizes the UI, or
    // changes personal toolbar collapsed status.  Both of those location call
    // updatePosition(), so this is the only point asking for popup updates.
    for (let popupId in this._popupNeedsUpdate) {
      this._popupNeedsUpdate[popupId] = true;
    }

    let button = this.button;
    if (!button)
      return;

    // If the toolbar containing bookmarks is visible, we want to move the
    // button to bookmarksToolbarItem.
    let bookmarksToolbarItem = this.bookmarksToolbarItem;
    let bookmarksOnVisibleToolbar = bookmarksToolbarItem &&
                                    !bookmarksToolbarItem.parentNode.collapsed &&
                                    bookmarksToolbarItem.parentNode.getAttribute("autohide") != "true";

    // If the container has been moved by the user to the toolbar containing
    // bookmarks, we want to preserve the desired position.
    let container = this.buttonContainer;
    let containerNearBookmarks = container && bookmarksToolbarItem &&
                                 container.parentNode == bookmarksToolbarItem.parentNode;

    if (bookmarksOnVisibleToolbar && !containerNearBookmarks) {
      if (button.parentNode != bookmarksToolbarItem) {
        this._uninitView();
        bookmarksToolbarItem.appendChild(button);
      }
    }
    else {
      if (container && button.parentNode != container) {
        this._uninitView();
        container.appendChild(button);
      }
    }
    this._updateStyle();
  },

  _updateStyle: function BMB__updateStyle() {
    let button = this.button;
    if (!button)
      return;

    let container = this.buttonContainer;
    let containerOnPersonalToolbar = container &&
                                     (container.parentNode == this.personalToolbar ||
                                      container.parentNode.parentNode == this.personalToolbar);

    if (button.parentNode == this.bookmarksToolbarItem ||
        containerOnPersonalToolbar) {
      button.classList.add("bookmark-item");
      button.classList.remove("toolbarbutton-1");
    }
    else {
      button.classList.remove("bookmark-item");
      button.classList.add("toolbarbutton-1");
    }
  },

  _uninitView: function BMB__uninitView() {
    // When an element with a placesView attached is removed and re-inserted,
    // XBL reapplies the binding causing any kind of issues and possible leaks,
    // so kill current view and let popupshowing generate a new one.
    let button = this.button;
    if (button && button._placesView)
      button._placesView.uninit();
  },

  customizeStart: function BMB_customizeStart() {
    this._uninitView();
    let button = this.button;
    let container = this.buttonContainer;
    if (button && container && button.parentNode != container) {
      // Move button back to the container, so user can move or remove it.
      container.appendChild(button);
      this._updateStyle();
    }
  },

  customizeChange: function BMB_customizeChange() {
    this._updateStyle();
  },

  customizeDone: function BMB_customizeDone() {
    this.updatePosition();
  }
};
/*
//@line 39 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-tabPreviews.js"
 */

/**
 * Tab previews utility, produces thumbnails
 */
var tabPreviews = {
  aspectRatio: 0.5625, // 16:9
  init: function tabPreviews_init() {
    if (this._selectedTab)
      return;
    this._selectedTab = gBrowser.selectedTab;

    this.width = Math.ceil(screen.availWidth / 5.75);
    this.height = Math.round(this.width * this.aspectRatio);

    window.addEventListener("unload", this, false);
    gBrowser.tabContainer.addEventListener("TabSelect", this, false);
    gBrowser.tabContainer.addEventListener("SSTabRestored", this, false);
  },
  uninit: function tabPreviews_uninit() {
    window.removeEventListener("unload", this, false);
    gBrowser.tabContainer.removeEventListener("TabSelect", this, false);
    gBrowser.tabContainer.removeEventListener("SSTabRestored", this, false);
    this._selectedTab = null;
  },
  get: function tabPreviews_get(aTab) {
    this.init();

    if (aTab.__thumbnail_lastURI &&
        aTab.__thumbnail_lastURI != aTab.linkedBrowser.currentURI.spec) {
      aTab.__thumbnail = null;
      aTab.__thumbnail_lastURI = null;
    }
    return aTab.__thumbnail || this.capture(aTab, !aTab.hasAttribute("busy"));
  },
  capture: function tabPreviews_capture(aTab, aStore) {
    this.init();

    var thumbnail = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    thumbnail.mozOpaque = true;
    thumbnail.height = this.height;
    thumbnail.width = this.width;

    var ctx = thumbnail.getContext("2d");
    var win = aTab.linkedBrowser.contentWindow;
    var snippetWidth = win.innerWidth * .6;
    var scale = this.width / snippetWidth;
    ctx.scale(scale, scale);
    ctx.drawWindow(win, win.scrollX, win.scrollY,
                   snippetWidth, snippetWidth * this.aspectRatio, "rgb(255,255,255)");

    if (aStore) {
      aTab.__thumbnail = thumbnail;
      aTab.__thumbnail_lastURI = aTab.linkedBrowser.currentURI.spec;
    }
    return thumbnail;
  },
  handleEvent: function tabPreviews_handleEvent(event) {
    switch (event.type) {
      case "TabSelect":
        if (this._selectedTab &&
            this._selectedTab.parentNode &&
            !this._pendingUpdate) {
          // Generate a thumbnail for the tab that was selected.
          // The timeout keeps the UI snappy and prevents us from generating thumbnails
          // for tabs that will be closed. During that timeout, don't generate other
          // thumbnails in case multiple TabSelect events occur fast in succession.
          this._pendingUpdate = true;
          setTimeout(function (self, aTab) {
            self._pendingUpdate = false;
            if (aTab.parentNode && !aTab.hasAttribute("busy"))
              self.capture(aTab, true);
          }, 2000, this, this._selectedTab);
        }
        this._selectedTab = event.target;
        break;
      case "SSTabRestored":
        this.capture(event.target, true);
        break;
      case "unload":
        this.uninit();
        break;
    }
  }
};

var tabPreviewPanelHelper = {
  opening: function (host) {
    host.panel.hidden = false;

    var handler = this._generateHandler(host);
    host.panel.addEventListener("popupshown", handler, false);
    host.panel.addEventListener("popuphiding", handler, false);
    host.panel.addEventListener("popuphidden", handler, false);

    host._prevFocus = document.commandDispatcher.focusedElement;
  },
  _generateHandler: function (host) {
    var self = this;
    return function (event) {
      if (event.target == host.panel) {
        host.panel.removeEventListener(event.type, arguments.callee, false);
        self["_" + event.type](host);
      }
    };
  },
  _popupshown: function (host) {
    if ("setupGUI" in host)
      host.setupGUI();
  },
  _popuphiding: function (host) {
    if ("suspendGUI" in host)
      host.suspendGUI();

    if (host._prevFocus) {
      Cc["@mozilla.org/focus-manager;1"]
        .getService(Ci.nsIFocusManager)
        .setFocus(host._prevFocus, Ci.nsIFocusManager.FLAG_NOSCROLL);
      host._prevFocus = null;
    } else
      gBrowser.selectedBrowser.focus();

    if (host.tabToSelect) {
      gBrowser.selectedTab = host.tabToSelect;
      host.tabToSelect = null;
    }
  },
  _popuphidden: function (host) {
    // Destroy the widget in order to prevent outdated content
    // when re-opening the panel.
    host.panel.hidden = true;
  }
};

/**
 * Ctrl-Tab panel
 */
var ctrlTab = {
  get panel () {
    delete this.panel;
    return this.panel = document.getElementById("ctrlTab-panel");
  },
  get showAllButton () {
    delete this.showAllButton;
    return this.showAllButton = document.getElementById("ctrlTab-showAll");
  },
  get previews () {
    delete this.previews;
    return this.previews = this.panel.getElementsByClassName("ctrlTab-preview");
  },
  get recentlyUsedLimit () {
    delete this.recentlyUsedLimit;
    return this.recentlyUsedLimit = gPrefService.getIntPref("browser.ctrlTab.recentlyUsedLimit");
  },
  get keys () {
    var keys = {};
    ["close", "find", "selectAll"].forEach(function (key) {
      keys[key] = document.getElementById("key_" + key)
                          .getAttribute("key")
                          .toLocaleLowerCase().charCodeAt(0);
    });
    delete this.keys;
    return this.keys = keys;
  },
  _selectedIndex: 0,
  get selected () this._selectedIndex < 0 ?
                    document.activeElement :
                    this.previews.item(this._selectedIndex),
  get isOpen   () this.panel.state == "open" || this.panel.state == "showing" || this._timer,
  get tabCount () this.tabList.length,
  get tabPreviewCount () Math.min(this.previews.length - 1, this.tabCount),
  get canvasWidth () Math.min(tabPreviews.width,
                              Math.ceil(screen.availWidth * .85 / this.tabPreviewCount)),
  get canvasHeight () Math.round(this.canvasWidth * tabPreviews.aspectRatio),

  get tabList () {
    if (this._tabList)
      return this._tabList;

    let list = gBrowser.visibleTabs;

    if (this._closing)
      this.detachTab(this._closing, list);

    // Rotate the list until the selected tab is first
    while (!list[0].selected)
      list.push(list.shift());

    if (this.recentlyUsedLimit != 0) {
      let recentlyUsedTabs = this._recentlyUsedTabs;
      if (this.recentlyUsedLimit > 0)
        recentlyUsedTabs = this._recentlyUsedTabs.slice(0, this.recentlyUsedLimit);
      for (let i = recentlyUsedTabs.length - 1; i >= 0; i--) {
        list.splice(list.indexOf(recentlyUsedTabs[i]), 1);
        list.unshift(recentlyUsedTabs[i]);
      }
    }

    return this._tabList = list;
  },

  init: function ctrlTab_init() {
    if (!this._recentlyUsedTabs) {
      tabPreviews.init();

      this._recentlyUsedTabs = [gBrowser.selectedTab];
      this._init(true);
    }
  },

  uninit: function ctrlTab_uninit() {
    this._recentlyUsedTabs = null;
    this._init(false);
  },

  prefName: "browser.ctrlTab.previews",
  readPref: function ctrlTab_readPref() {
    var enable =
      gPrefService.getBoolPref(this.prefName) &&
      (!gPrefService.prefHasUserValue("browser.ctrlTab.disallowForScreenReaders") ||
       !gPrefService.getBoolPref("browser.ctrlTab.disallowForScreenReaders"));

    if (enable)
      this.init();
    else
      this.uninit();
  },
  observe: function (aSubject, aTopic, aPrefName) {
    this.readPref();
  },

  updatePreviews: function ctrlTab_updatePreviews() {
    for (let i = 0; i < this.previews.length; i++)
      this.updatePreview(this.previews[i], this.tabList[i]);

    var showAllLabel = gNavigatorBundle.getString("ctrlTab.showAll.label");
    this.showAllButton.label =
      PluralForm.get(this.tabCount, showAllLabel).replace("#1", this.tabCount);
  },

  updatePreview: function ctrlTab_updatePreview(aPreview, aTab) {
    if (aPreview == this.showAllButton)
      return;

    aPreview._tab = aTab;

    if (aPreview.firstChild)
      aPreview.removeChild(aPreview.firstChild);
    if (aTab) {
      let canvasWidth = this.canvasWidth;
      let canvasHeight = this.canvasHeight;
      aPreview.appendChild(tabPreviews.get(aTab));
      aPreview.setAttribute("label", aTab.label);
      aPreview.setAttribute("tooltiptext", aTab.label);
      aPreview.setAttribute("crop", aTab.crop);
      aPreview.setAttribute("canvaswidth", canvasWidth);
      aPreview.setAttribute("canvasstyle",
                            "max-width:" + canvasWidth + "px;" +
                            "min-width:" + canvasWidth + "px;" +
                            "max-height:" + canvasHeight + "px;" +
                            "min-height:" + canvasHeight + "px;");
      if (aTab.image)
        aPreview.setAttribute("image", aTab.image);
      else
        aPreview.removeAttribute("image");
      aPreview.hidden = false;
    } else {
      aPreview.hidden = true;
      aPreview.removeAttribute("label");
      aPreview.removeAttribute("tooltiptext");
      aPreview.removeAttribute("image");
    }
  },

  advanceFocus: function ctrlTab_advanceFocus(aForward) {
    if (this._selectedIndex == -1) {
      // No virtual selectedIndex, focus must be in the panel already.
      if (aForward)
        document.commandDispatcher.advanceFocus();
      else
        document.commandDispatcher.rewindFocus();
    } else {
      // Focus isn't in the panel yet, so we maintain a virtual selectedIndex.
      do {
        this._selectedIndex += aForward ? 1 : -1;
        if (this._selectedIndex < 0)
          this._selectedIndex = this.previews.length - 1;
        else if (this._selectedIndex >= this.previews.length)
          this._selectedIndex = 0;
      } while (this.selected.hidden);
    }

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      this._openPanel();
    }
  },

  _mouseOverFocus: function ctrlTab_mouseOverFocus(aPreview) {
    if (this._trackMouseOver)
      aPreview.focus();
  },

  pick: function ctrlTab_pick(aPreview) {
    if (!this.tabCount)
      return;

    var select = (aPreview || this.selected);

    if (select == this.showAllButton)
      this.showAllTabs();
    else
      this.close(select._tab);
  },

  showAllTabs: function ctrlTab_showAllTabs(aPreview) {
    this.close();
    document.getElementById("Browser:ShowAllTabs").doCommand();
  },

  remove: function ctrlTab_remove(aPreview) {
    if (aPreview._tab)
      gBrowser.removeTab(aPreview._tab);
  },

  attachTab: function ctrlTab_attachTab(aTab, aPos) {
    if (aPos == 0)
      this._recentlyUsedTabs.unshift(aTab);
    else if (aPos)
      this._recentlyUsedTabs.splice(aPos, 0, aTab);
    else
      this._recentlyUsedTabs.push(aTab);
  },
  detachTab: function ctrlTab_detachTab(aTab, aTabs) {
    var tabs = aTabs || this._recentlyUsedTabs;
    var i = tabs.indexOf(aTab);
    if (i >= 0)
      tabs.splice(i, 1);
  },

  open: function ctrlTab_open() {
    if (this.isOpen)
      return;

    allTabs.close();

    document.addEventListener("keyup", this, true);

    this.updatePreviews();
    this._selectedIndex = 1;

    // Add a slight delay before showing the UI, so that a quick
    // "ctrl-tab" keypress just flips back to the MRU tab.
    this._timer = setTimeout(function (self) {
      self._timer = null;
      self._openPanel();
    }, 200, this);
  },

  _openPanel: function ctrlTab_openPanel() {
    tabPreviewPanelHelper.opening(this);

    this.panel.width = Math.min(screen.availWidth * .99,
                                this.canvasWidth * 1.25 * this.tabPreviewCount);
    var estimateHeight = this.canvasHeight * 1.25 + 75;
    this.panel.openPopupAtScreen(screen.availLeft + (screen.availWidth - this.panel.width) / 2,
                                 screen.availTop + (screen.availHeight - estimateHeight) / 2,
                                 false);
  },

  close: function ctrlTab_close(aTabToSelect) {
    if (!this.isOpen)
      return;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      this.suspendGUI();
      if (aTabToSelect)
        gBrowser.selectedTab = aTabToSelect;
      return;
    }

    this.tabToSelect = aTabToSelect;
    this.panel.hidePopup();
  },

  setupGUI: function ctrlTab_setupGUI() {
    this.selected.focus();
    this._selectedIndex = -1;

    // Track mouse movement after a brief delay so that the item that happens
    // to be under the mouse pointer initially won't be selected unintentionally.
    this._trackMouseOver = false;
    setTimeout(function (self) {
      if (self.isOpen)
        self._trackMouseOver = true;
    }, 0, this);
  },

  suspendGUI: function ctrlTab_suspendGUI() {
    document.removeEventListener("keyup", this, true);

    Array.forEach(this.previews, function (preview) {
      this.updatePreview(preview, null);
    }, this);

    this._tabList = null;
  },

  onKeyPress: function ctrlTab_onKeyPress(event) {
    var isOpen = this.isOpen;

    if (isOpen) {
      event.preventDefault();
      event.stopPropagation();
    }

    switch (event.keyCode) {
      case event.DOM_VK_TAB:
        if (event.ctrlKey && !event.altKey && !event.metaKey) {
          if (isOpen) {
            this.advanceFocus(!event.shiftKey);
          } else if (!event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            let tabs = gBrowser.visibleTabs;
            if (tabs.length > 2) {
              this.open();
            } else if (tabs.length == 2) {
              let index = gBrowser.selectedTab == tabs[0] ? 1 : 0;
              gBrowser.selectedTab = tabs[index];
            }
          }
        }
        break;
      default:
        if (isOpen && event.ctrlKey) {
          if (event.keyCode == event.DOM_VK_DELETE) {
            this.remove(this.selected);
            break;
          }
          switch (event.charCode) {
            case this.keys.close:
              this.remove(this.selected);
              break;
            case this.keys.find:
            case this.keys.selectAll:
              this.showAllTabs();
              break;
          }
        }
    }
  },

  removeClosingTabFromUI: function ctrlTab_removeClosingTabFromUI(aTab) {
    if (this.tabCount == 2) {
      this.close();
      return;
    }

    this._closing = aTab;
    this._tabList = null;
    this.updatePreviews();
    this._closing = null;

    if (this.selected.hidden)
      this.advanceFocus(false);
    if (this.selected == this.showAllButton)
      this.advanceFocus(false);

    // If the current tab is removed, another tab can steal our focus.
    if (aTab == gBrowser.selectedTab && this.panel.state == "open") {
      setTimeout(function (selected) {
        selected.focus();
      }, 0, this.selected);
    }
  },

  handleEvent: function ctrlTab_handleEvent(event) {
    switch (event.type) {
      case "TabAttrModified":
        // tab attribute modified (e.g. label, crop, busy, image, selected)
        for (let i = this.previews.length - 1; i >= 0; i--) {
          if (this.previews[i]._tab && this.previews[i]._tab == event.target) {
            this.updatePreview(this.previews[i], event.target);
            break;
          }
        }
        break;
      case "TabSelect":
        this.detachTab(event.target);
        this.attachTab(event.target, 0);
        break;
      case "TabOpen":
        this.attachTab(event.target, 1);
        break;
      case "TabClose":
        this.detachTab(event.target);
        if (this.isOpen)
          this.removeClosingTabFromUI(event.target);
        break;
      case "keypress":
        this.onKeyPress(event);
        break;
      case "keyup":
        if (event.keyCode == event.DOM_VK_CONTROL)
          this.pick();
        break;
    }
  },

  _init: function ctrlTab__init(enable) {
    var toggleEventListener = enable ? "addEventListener" : "removeEventListener";

    var tabContainer = gBrowser.tabContainer;
    tabContainer[toggleEventListener]("TabOpen", this, false);
    tabContainer[toggleEventListener]("TabAttrModified", this, false);
    tabContainer[toggleEventListener]("TabSelect", this, false);
    tabContainer[toggleEventListener]("TabClose", this, false);

    document[toggleEventListener]("keypress", this, false);
    gBrowser.mTabBox.handleCtrlTab = !enable;

    // If we're not running, hide the "Show All Tabs" menu item,
    // as Shift+Ctrl+Tab will be handled by the tab bar.
    document.getElementById("menu_showAllTabs").hidden = !enable;

    // Also disable the <key> to ensure Shift+Ctrl+Tab never triggers
    // Show All Tabs.
    var key_showAllTabs = document.getElementById("key_showAllTabs");
    if (enable)
      key_showAllTabs.removeAttribute("disabled");
    else
      key_showAllTabs.setAttribute("disabled", "true");
  }
};


/**
 * All Tabs panel
 */
var allTabs = {
  get panel () {
    delete this.panel;
    return this.panel = document.getElementById("allTabs-panel");
  },
  get filterField () {
    delete this.filterField;
    return this.filterField = document.getElementById("allTabs-filter");
  },
  get container () {
    delete this.container;
    return this.container = document.getElementById("allTabs-container");
  },
  get tabCloseButton () {
    delete this.tabCloseButton;
    return this.tabCloseButton = document.getElementById("allTabs-tab-close-button");
  },
  get previews () this.container.getElementsByClassName("allTabs-preview"),
  get isOpen () this.panel.state == "open" || this.panel.state == "showing",

  init: function allTabs_init() {
    if (this._initiated)
      return;
    this._initiated = true;

    tabPreviews.init();

    Array.forEach(gBrowser.tabs, function (tab) {
      this._addPreview(tab);
    }, this);

    gBrowser.tabContainer.addEventListener("TabOpen", this, false);
    gBrowser.tabContainer.addEventListener("TabAttrModified", this, false);
    gBrowser.tabContainer.addEventListener("TabMove", this, false);
    gBrowser.tabContainer.addEventListener("TabClose", this, false);
  },

  uninit: function allTabs_uninit() {
    if (!this._initiated)
      return;

    gBrowser.tabContainer.removeEventListener("TabOpen", this, false);
    gBrowser.tabContainer.removeEventListener("TabAttrModified", this, false);
    gBrowser.tabContainer.removeEventListener("TabMove", this, false);
    gBrowser.tabContainer.removeEventListener("TabClose", this, false);

    while (this.container.hasChildNodes())
      this.container.removeChild(this.container.firstChild);

    this._initiated = false;
  },

  prefName: "browser.allTabs.previews",
  readPref: function allTabs_readPref() {
    var allTabsButton = document.getElementById("alltabs-button");
    if (!allTabsButton)
      return;

    if (gPrefService.getBoolPref(this.prefName)) {
      allTabsButton.removeAttribute("type");
      allTabsButton.setAttribute("command", "Browser:ShowAllTabs");
    } else {
      allTabsButton.setAttribute("type", "menu");
      allTabsButton.removeAttribute("command");
      allTabsButton.removeAttribute("oncommand");
    }
  },
  observe: function (aSubject, aTopic, aPrefName) {
    this.readPref();
  },

  pick: function allTabs_pick(aPreview) {
    if (!aPreview)
      aPreview = this._firstVisiblePreview;
    if (aPreview)
      this.tabToSelect = aPreview._tab;

    this.close();
  },

  closeTab: function allTabs_closeTab(event) {
    this.filterField.focus();
    gBrowser.removeTab(event.currentTarget._targetPreview._tab);
  },

  filter: function allTabs_filter() {
    if (this._currentFilter == this.filterField.value)
      return;

    this._currentFilter = this.filterField.value;

    var filter = this._currentFilter.split(/\s+/g);
    this._visible = 0;
    Array.forEach(this.previews, function (preview) {
      var tab = preview._tab;
      var matches = 0;
      if (filter.length && !tab.hidden) {
        let tabstring = tab.linkedBrowser.currentURI.spec;
        try {
          tabstring = decodeURI(tabstring);
        } catch (e) {}
        tabstring = tab.label + " " + tab.label.toLocaleLowerCase() + " " + tabstring;
        for (let i = 0; i < filter.length; i++)
          matches += tabstring.indexOf(filter[i]) > -1;
      }
      if (matches < filter.length || tab.hidden) {
        preview.hidden = true;
      }
      else {
        this._visible++;
        this._updatePreview(preview);
        preview.hidden = false;
      }
    }, this);

    this._reflow();
  },

  open: function allTabs_open() {
    this.init();

    if (this.isOpen)
      return;

    this._maxPanelHeight = Math.max(gBrowser.clientHeight, screen.availHeight / 2);
    this._maxPanelWidth = Math.max(gBrowser.clientWidth, screen.availWidth / 2);

    this.filter();

    tabPreviewPanelHelper.opening(this);

    this.panel.popupBoxObject.setConsumeRollupEvent(Ci.nsIPopupBoxObject.ROLLUP_NO_CONSUME);
    this.panel.openPopup(gBrowser, "overlap", 0, 0, false, true);
  },

  close: function allTabs_close() {
    this.panel.hidePopup();
  },

  setupGUI: function allTabs_setupGUI() {
    this.filterField.focus();
    this.filterField.placeholder = this.filterField.tooltipText;

    this.panel.addEventListener("keypress", this, false);
    this.panel.addEventListener("keypress", this, true);
    this._browserCommandSet.addEventListener("command", this, false);

    // When the panel is open, a second click on the all tabs button should
    // close the panel but not re-open it.
    document.getElementById("Browser:ShowAllTabs").setAttribute("disabled", "true");
  },

  suspendGUI: function allTabs_suspendGUI() {
    this.filterField.placeholder = "";
    this.filterField.value = "";
    this._currentFilter = null;

    this._updateTabCloseButton();

    this.panel.removeEventListener("keypress", this, false);
    this.panel.removeEventListener("keypress", this, true);
    this._browserCommandSet.removeEventListener("command", this, false);

    setTimeout(function () {
      document.getElementById("Browser:ShowAllTabs").removeAttribute("disabled");
    }, 300);
  },

  handleEvent: function allTabs_handleEvent(event) {
    if (/^Tab/.test(event.type)) {
      var tab = event.target;
      if (event.type != "TabOpen")
        var preview = this._getPreview(tab);
    }
    switch (event.type) {
      case "TabAttrModified":
        // tab attribute modified (e.g. label, crop, busy, image)
        if (!preview.hidden)
          this._updatePreview(preview);
        break;
      case "TabOpen":
        if (this.isOpen)
          this.close();
        this._addPreview(tab);
        break;
      case "TabMove":
        let siblingPreview = tab.nextSibling &&
                             this._getPreview(tab.nextSibling);
        if (siblingPreview)
          siblingPreview.parentNode.insertBefore(preview, siblingPreview);
        else
          this.container.lastChild.appendChild(preview);
        if (this.isOpen && !preview.hidden) {
          this._reflow();
          preview.focus();
        }
        break;
      case "TabClose":
        this._removePreview(preview);
        break;
      case "keypress":
        this._onKeyPress(event);
        break;
      case "command":
        if (event.target.id != "Browser:ShowAllTabs") {
          // Close the panel when there's a browser command executing in the background.
          this.close();
        }
        break;
    }
  },

  _visible: 0,
  _currentFilter: null,
  get _stack () {
    delete this._stack;
    return this._stack = document.getElementById("allTabs-stack");
  },
  get _browserCommandSet () {
    delete this._browserCommandSet;
    return this._browserCommandSet = document.getElementById("mainCommandSet");
  },
  get _previewLabelHeight () {
    delete this._previewLabelHeight;
    return this._previewLabelHeight = parseInt(getComputedStyle(this.previews[0], "").lineHeight);
  },

  get _visiblePreviews ()
    Array.filter(this.previews, function (preview) !preview.hidden),

  get _firstVisiblePreview () {
    if (this._visible == 0)
      return null;
    var previews = this.previews;
    for (let i = 0; i < previews.length; i++) {
      if (!previews[i].hidden)
        return previews[i];
    }
    return null;
  },

  _reflow: function allTabs_reflow() {
    this._updateTabCloseButton();

    const CONTAINER_MAX_WIDTH = this._maxPanelWidth * .95;
    const CONTAINER_MAX_HEIGHT = this._maxPanelHeight - 35;
    // the size of the whole preview relative to the thumbnail
    const REL_PREVIEW_THUMBNAIL = 1.2;
    const REL_PREVIEW_HEIGHT_WIDTH = tabPreviews.height / tabPreviews.width;
    const PREVIEW_MAX_WIDTH = tabPreviews.width * REL_PREVIEW_THUMBNAIL;

    var rows, previewHeight, previewWidth, outerHeight;
    this._columns = Math.floor(CONTAINER_MAX_WIDTH / PREVIEW_MAX_WIDTH);
    do {
      rows = Math.ceil(this._visible / this._columns);
      previewWidth = Math.min(PREVIEW_MAX_WIDTH,
                              Math.round(CONTAINER_MAX_WIDTH / this._columns));
      previewHeight = Math.round(previewWidth * REL_PREVIEW_HEIGHT_WIDTH);
      outerHeight = previewHeight + this._previewLabelHeight;
    } while (rows * outerHeight > CONTAINER_MAX_HEIGHT && ++this._columns);

    var outerWidth = previewWidth;
    {
      let innerWidth = Math.ceil(previewWidth / REL_PREVIEW_THUMBNAIL);
      let innerHeight = Math.ceil(previewHeight / REL_PREVIEW_THUMBNAIL);
      var canvasStyle = "max-width:" + innerWidth + "px;" +
                        "min-width:" + innerWidth + "px;" +
                        "max-height:" + innerHeight + "px;" +
                        "min-height:" + innerHeight + "px;";
    }

    var previews = Array.slice(this.previews);

    while (this.container.hasChildNodes())
      this.container.removeChild(this.container.firstChild);
    for (let i = rows || 1; i > 0; i--)
      this.container.appendChild(document.createElement("hbox"));

    var row = this.container.firstChild;
    var colCount = 0;
    previews.forEach(function (preview) {
      if (!preview.hidden &&
          ++colCount > this._columns) {
        row = row.nextSibling;
        colCount = 1;
      }
      preview.setAttribute("minwidth", outerWidth);
      preview.setAttribute("height", outerHeight);
      preview.setAttribute("canvasstyle", canvasStyle);
      preview.removeAttribute("closebuttonhover");
      row.appendChild(preview);
    }, this);

    this._stack.width = this._maxPanelWidth;
    this.container.width = Math.ceil(outerWidth * Math.min(this._columns, this._visible));
    this.container.left = Math.round((this._maxPanelWidth - this.container.width) / 2);
    this.container.maxWidth = this._maxPanelWidth - this.container.left;
    this.container.maxHeight = rows * outerHeight;
  },

  _addPreview: function allTabs_addPreview(aTab) {
    var preview = document.createElement("button");
    preview.className = "allTabs-preview";
    preview._tab = aTab;
    this.container.lastChild.appendChild(preview);
  },

  _removePreview: function allTabs_removePreview(aPreview) {
    var updateUI = (this.isOpen && !aPreview.hidden);
    aPreview._tab = null;
    aPreview.parentNode.removeChild(aPreview);
    if (updateUI) {
      this._visible--;
      this._reflow();
      this.filterField.focus();
    }
  },

  _getPreview: function allTabs_getPreview(aTab) {
    var previews = this.previews;
    for (let i = 0; i < previews.length; i++)
      if (previews[i]._tab == aTab)
        return previews[i];
    return null;
  },

  _updateTabCloseButton: function allTabs_updateTabCloseButton(event) {
    if (event && event.target == this.tabCloseButton)
      return;

    if (this.tabCloseButton._targetPreview) {
      if (event && event.target == this.tabCloseButton._targetPreview)
        return;

      this.tabCloseButton._targetPreview.removeAttribute("closebuttonhover");
    }

    if (event &&
        event.target.parentNode.parentNode == this.container &&
        (event.target._tab.previousSibling || event.target._tab.nextSibling)) {
      let canvas = event.target.firstChild.getBoundingClientRect();
      let container = this.container.getBoundingClientRect();
      let tabCloseButton = this.tabCloseButton.getBoundingClientRect();
      let alignLeft = getComputedStyle(this.panel, "").direction == "rtl";
//@line 929 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-tabPreviews.js"
      this.tabCloseButton.left = canvas.left -
                                 container.left +
                                 parseInt(this.container.left) +
                                 (alignLeft ? 0 :
                                  canvas.width - tabCloseButton.width);
      this.tabCloseButton.top = canvas.top - container.top;
      this.tabCloseButton._targetPreview = event.target;
      this.tabCloseButton.style.visibility = "visible";
      event.target.setAttribute("closebuttonhover", "true");
    } else {
      this.tabCloseButton.style.visibility = "hidden";
      this.tabCloseButton.left = this.tabCloseButton.top = 0;
      this.tabCloseButton._targetPreview = null;
    }
  },

  _updatePreview: function allTabs_updatePreview(aPreview) {
    aPreview.setAttribute("label", aPreview._tab.label);
    aPreview.setAttribute("tooltiptext", aPreview._tab.label);
    aPreview.setAttribute("crop", aPreview._tab.crop);
    if (aPreview._tab.image)
      aPreview.setAttribute("image", aPreview._tab.image);
    else
      aPreview.removeAttribute("image");

    var thumbnail = tabPreviews.get(aPreview._tab);
    if (aPreview.firstChild) {
      if (aPreview.firstChild == thumbnail)
        return;
      aPreview.removeChild(aPreview.firstChild);
    }
    aPreview.appendChild(thumbnail);
  },

  _onKeyPress: function allTabs_onKeyPress(event) {
    if (event.eventPhase == event.CAPTURING_PHASE) {
      this._onCapturingKeyPress(event);
      return;
    }

    if (event.keyCode == event.DOM_VK_ESCAPE) {
      this.close();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.target == this.filterField) {
      switch (event.keyCode) {
        case event.DOM_VK_UP:
          if (this._visible) {
            let previews = this._visiblePreviews;
            let columns = Math.min(previews.length, this._columns);
            previews[Math.floor(previews.length / columns) * columns - 1].focus();
            event.preventDefault();
            event.stopPropagation();
          }
          break;
        case event.DOM_VK_DOWN:
          if (this._visible) {
            this._firstVisiblePreview.focus();
            event.preventDefault();
            event.stopPropagation();
          }
          break;
      }
    }
  },

  _onCapturingKeyPress: function allTabs_onCapturingKeyPress(event) {
    switch (event.keyCode) {
      case event.DOM_VK_UP:
      case event.DOM_VK_DOWN:
        if (event.target != this.filterField)
          this._advanceFocusVertically(event);
        break;
      case event.DOM_VK_RETURN:
        if (event.target == this.filterField) {
          this.filter();
          this.pick();
          event.preventDefault();
          event.stopPropagation();
        }
        break;
    }
  },

  _advanceFocusVertically: function allTabs_advanceFocusVertically(event) {
    var preview = document.activeElement;
    if (!preview || preview.parentNode.parentNode != this.container)
      return;

    event.stopPropagation();

    var up = (event.keyCode == event.DOM_VK_UP);
    var previews = this._visiblePreviews;

    if (up && preview == previews[0]) {
      this.filterField.focus();
      return;
    }

    var i       = previews.indexOf(preview);
    var columns = Math.min(previews.length, this._columns);
    var column  = i % columns;
    var row     = Math.floor(i / columns);

    function newIndex()    row * columns + column;
    function outOfBounds() newIndex() >= previews.length;

    if (up) {
      row--;
      if (row < 0) {
        let rows = Math.ceil(previews.length / columns);
        row = rows - 1;
        column--;
        if (outOfBounds())
          row--;
      }
    } else {
      row++;
      if (outOfBounds()) {
        if (column == columns - 1) {
          this.filterField.focus();
          return;
        }
        row = 0;
        column++;
      }
    }
    previews[newIndex()].focus();
  }
};
//@line 38 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-tabview.js"

let TabView = {
  _deck: null,
  _window: null,
  _firstUseExperienced: false,
  _browserKeyHandlerInitialized: false,
  VISIBILITY_IDENTIFIER: "tabview-visibility",

  // ----------
  get windowTitle() {
    delete this.windowTitle;
    let brandBundle = document.getElementById("bundle_brand");
    let brandShortName = brandBundle.getString("brandShortName");
    let title = gNavigatorBundle.getFormattedString("tabView2.title", [brandShortName]);
    return this.windowTitle = title;
  },

  // ----------
  get firstUseExperienced() {
    return this._firstUseExperienced;
  },

  // ----------
  set firstUseExperienced(val) {
    if (val != this._firstUseExperienced)
      Services.prefs.setBoolPref("browser.panorama.experienced_first_run", val);
  },

  // ----------
  init: function TabView_init() {
    if (!Services.prefs.prefHasUserValue("browser.panorama.experienced_first_run") ||
        !Services.prefs.getBoolPref("browser.panorama.experienced_first_run")) {
      Services.prefs.addObserver(
        "browser.panorama.experienced_first_run", this, false);
    } else {
      this._firstUseExperienced = true;

      if ((gBrowser.tabs.length - gBrowser.visibleTabs.length) > 0)
        this._setBrowserKeyHandlers();

      // ___ visibility
      let sessionstore =
        Cc["@mozilla.org/browser/sessionstore;1"].getService(Ci.nsISessionStore);
      let data = sessionstore.getWindowValue(window, this.VISIBILITY_IDENTIFIER);

      if (data && data == "true") {
        this.show();
      } else {
        let self = this;

        // if a tab is changed from hidden to unhidden and the iframe is not 
        // initialized, load the iframe and setup the tab.
        this._tabShowEventListener = function (event) {
          if (!self._window)
            self._initFrame(function() {
              self._window.UI.onTabSelect(gBrowser.selectedTab);
            });
        };
        gBrowser.tabContainer.addEventListener(
          "TabShow", this._tabShowEventListener, true);
      }
    }
  },

  // ----------
  // Observes topic changes.
  observe: function TabView_observe(subject, topic, data) {
    if (topic == "nsPref:changed") {
      Services.prefs.removeObserver(
        "browser.panorama.experienced_first_run", this);
      this._firstUseExperienced = true;
      this._addToolbarButton();
    }
  },

  // ----------
  // Uninitializes TabView.
  uninit: function TabView_uninit() {
    if (!this._firstUseExperienced) {
      Services.prefs.removeObserver(
        "browser.panorama.experienced_first_run", this);
    }
    if (this._tabShowEventListener) {
      gBrowser.tabContainer.removeEventListener(
        "TabShow", this._tabShowEventListener, true);
    }
  },

  // ----------
  // Creates the frame and calls the callback once it's loaded. 
  // If the frame already exists, calls the callback immediately. 
  _initFrame: function TabView__initFrame(callback) {
    if (this._window) {
      if (typeof callback == "function")
        callback();
    } else {
      // ___ find the deck
      this._deck = document.getElementById("tab-view-deck");

      // ___ create the frame
      let iframe = document.createElement("iframe");
      iframe.id = "tab-view";
      iframe.setAttribute("transparent", "true");
      iframe.flex = 1;

      if (typeof callback == "function")
        window.addEventListener("tabviewframeinitialized", callback, false);

      iframe.setAttribute("src", "chrome://browser/content/tabview.html");
      this._deck.appendChild(iframe);
      this._window = iframe.contentWindow;

      if (this._tabShowEventListener) {
        gBrowser.tabContainer.removeEventListener(
          "TabShow", this._tabShowEventListener, true);
        this._tabShowEventListener = null;
      }

      this._setBrowserKeyHandlers();
    }
  },

  // ----------
  getContentWindow: function TabView_getContentWindow() {
    return this._window;
  },

  // ----------
  isVisible: function() {
    return (this._deck ? this._deck.selectedIndex == 1 : false);
  },

  // ----------
  show: function() {
    if (this.isVisible())
      return;
    
    this._initFrame(function() {
      let event = document.createEvent("Events");
      event.initEvent("tabviewshow", false, false);
      dispatchEvent(event);
    });
  },

  // ----------
  hide: function() {
    if (!this.isVisible())
      return;

    let event = document.createEvent("Events");
    event.initEvent("tabviewhide", false, false);
    dispatchEvent(event);
  },

  // ----------
  toggle: function() {
    if (this.isVisible())
      this.hide();
    else 
      this.show();
  },
  
  getActiveGroupName: function TabView_getActiveGroupName() {
    // We get the active group this way, instead of querying
    // GroupItems.getActiveGroupItem() because the tabSelect event
    // will not have happened by the time the browser tries to
    // update the title.
    let activeTab = window.gBrowser.selectedTab;
    if (activeTab._tabViewTabItem && activeTab._tabViewTabItem.parent){
      let groupName = activeTab._tabViewTabItem.parent.getTitle();
      if (groupName)
        return groupName;
    }
    return null;
  },  

  // ----------
  updateContextMenu: function(tab, popup) {
    let separator = document.getElementById("context_tabViewNamedGroups");
    let isEmpty = true;

    while (popup.firstChild && popup.firstChild != separator)
      popup.removeChild(popup.firstChild);

    let self = this;
    this._initFrame(function() {
      let activeGroup = tab._tabViewTabItem.parent;
      let groupItems = self._window.GroupItems.groupItems;

      groupItems.forEach(function(groupItem) {
        // if group has title, it's not hidden and there is no active group or
        // the active group id doesn't match the group id, a group menu item
        // would be added.
        if (groupItem.getTitle().length > 0 && !groupItem.hidden &&
            (!activeGroup || activeGroup.id != groupItem.id)) {
          let menuItem = self._createGroupMenuItem(groupItem);
          popup.insertBefore(menuItem, separator);
          isEmpty = false;
        }
      });
      separator.hidden = isEmpty;
    });
  },

  // ----------
  _createGroupMenuItem: function TabView__createGroupMenuItem(groupItem) {
    let menuItem = document.createElement("menuitem")
    menuItem.setAttribute("label", groupItem.getTitle());
    menuItem.setAttribute(
      "oncommand", 
      "TabView.moveTabTo(TabContextMenu.contextTab,'" + groupItem.id + "')");

    return menuItem;
  },

  // ----------
  moveTabTo: function TabView_moveTabTo(tab, groupItemId) {
    if (this._window) {
      this._window.GroupItems.moveTabToGroupItem(tab, groupItemId);
    } else {
      let self = this;
      this._initFrame(function() {
        self._window.GroupItems.moveTabToGroupItem(tab, groupItemId);
      });
    }
  },

  // ----------
  enableSearch: function TabView_enableSearch(event) {
    if (this._window)
      this._window.UI.enableSearch(event);
  },

  // ----------
  // Adds new key commands to the browser, for invoking the Tab Candy UI
  // and for switching between groups of tabs when outside of the Tab Candy UI.
  _setBrowserKeyHandlers: function TabView__setBrowserKeyHandlers() {
    if (this._browserKeyHandlerInitialized)
      return;

    this._browserKeyHandlerInitialized = true;

    let self = this;
    window.addEventListener("keypress", function(event) {
      if (self.isVisible() ||
          (gBrowser.tabs.length - gBrowser.visibleTabs.length) == 0)
        return;

      let charCode = event.charCode;
      // Control (+ Shift) + `
      if (event.ctrlKey && !event.metaKey && !event.altKey &&
          (charCode == 96 || charCode == 126)) {
        event.stopPropagation();
        event.preventDefault();

        self._initFrame(function() {
          let groupItems = self._window.GroupItems;
          let tabItem = groupItems.getNextGroupItemTab(event.shiftKey);
          if (!tabItem)
            return;

          // Switch to the new tab, and close the old group if it's now empty.
          let oldGroupItem = groupItems.getActiveGroupItem();
          window.gBrowser.selectedTab = tabItem.tab;
          oldGroupItem.closeIfEmpty();
        });
      }
    }, true);
  },

  // ----------
  // Prepares the tab view for undo close tab.
  prepareUndoCloseTab: function(blankTabToRemove) {
    if (this._window) {
      this._window.UI.restoredClosedTab = true;

      if (blankTabToRemove)
        blankTabToRemove._tabViewTabIsRemovedAfterRestore = true;
    }
  },

  // ----------
  // Cleans up the tab view after undo close tab.
  afterUndoCloseTab: function () {
    if (this._window)
      this._window.UI.restoredClosedTab = false;
  },

  // ----------
  // On move to group pop showing.
  moveToGroupPopupShowing: function TabView_moveToGroupPopupShowing(event) {
    // there are hidden tabs so initialize the iframe and update the context menu
    if ((gBrowser.tabs.length - gBrowser.visibleTabs.length) > 0)
      this.updateContextMenu(TabContextMenu.contextTab, event.target);
  },

  // ----------
  // Function: _addToolbarButton
  // Adds the TabView button to the TabsToolbar.
  _addToolbarButton: function TabView__addToolbarButton() {
    let buttonId = "tabview-button";

    if (document.getElementById(buttonId))
      return;

    let toolbar = document.getElementById("TabsToolbar");
    let currentSet = toolbar.currentSet.split(",");

    let alltabsPos = currentSet.indexOf("alltabs-button");
    if (-1 == alltabsPos)
      return;

    currentSet[alltabsPos] += "," + buttonId;
    currentSet = currentSet.join(",");
    toolbar.currentSet = currentSet;
    toolbar.setAttribute("currentset", currentSet);
    document.persist(toolbar.id, "currentset");
  }
};
//@line 184 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

//@line 40 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser-syncui.js"

// gSyncUI handles updating the tools menu
let gSyncUI = {
  init: function SUI_init() {
    // Proceed to set up the UI if Sync has already started up.
    // Otherwise we'll do it when Sync is firing up.
    if (Weave.Status.ready) {
      this.initUI();
      return;
    }

    Services.obs.addObserver(this, "weave:service:ready", true);

    // Remove the observer if the window is closed before the observer
    // was triggered.
    window.addEventListener("unload", function() {
      window.removeEventListener("unload", arguments.callee, false);
      Services.obs.removeObserver(gSyncUI, "weave:service:ready");
    }, false);
  },

  initUI: function SUI_initUI() {
    let obs = ["weave:service:sync:start",
               "weave:service:sync:finish",
               "weave:service:sync:error",
               "weave:service:sync:delayed",
               "weave:service:quota:remaining",
               "weave:service:setup-complete",
               "weave:service:login:start",
               "weave:service:login:finish",
               "weave:service:login:error",
               "weave:service:logout:finish",
               "weave:service:start-over"];

    // If this is a browser window?
    if (gBrowser) {
      obs.push("weave:notification:added");
    }

    obs.forEach(function(topic) {
      Services.obs.addObserver(this, topic, true);
    }, this);

    // Find the alltabs-popup, only if there is a gBrowser
    if (gBrowser) {
      let popup = document.getElementById("alltabs-popup");
      if (popup) {
        popup.addEventListener(
          "popupshowing", this.alltabsPopupShowing.bind(this), true);
      }

      if (Weave.Notifications.notifications.length)
        this.initNotifications();
    }
    this.updateUI();
  },
  
  initNotifications: function SUI_initNotifications() {
    const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    let notificationbox = document.createElementNS(XULNS, "notificationbox");
    notificationbox.id = "sync-notifications";
    notificationbox.setAttribute("flex", "1");

    let bottombox = document.getElementById("browser-bottombox");
    bottombox.insertBefore(notificationbox, bottombox.firstChild);

    // Force a style flush to ensure that our binding is attached.
    notificationbox.clientTop;

    // notificationbox will listen to observers from now on.
    Services.obs.removeObserver(this, "weave:notification:added");
  },

  _wasDelayed: false,

  _needsSetup: function SUI__needsSetup() {
    let firstSync = "";
    try {
      firstSync = Services.prefs.getCharPref("services.sync.firstSync");
    } catch (e) { }
    return Weave.Status.checkSetup() == Weave.CLIENT_NOT_CONFIGURED ||
           firstSync == "notReady";
  },

  updateUI: function SUI_updateUI() {
    let needsSetup = this._needsSetup();
    document.getElementById("sync-setup-state").hidden = !needsSetup;
    document.getElementById("sync-syncnow-state").hidden = needsSetup;

    if (!gBrowser)
      return;

    let button = document.getElementById("sync-button");
    if (!button)
      return;

    button.removeAttribute("status");
    this._updateLastSyncTime();
    if (needsSetup)
      button.removeAttribute("tooltiptext");
  },

  alltabsPopupShowing: function(event) {
    // Should we show the menu item?
    //XXXphilikon We should remove the check for isLoggedIn here and have
    //            about:sync-tabs auto-login (bug 583344)
    if (!Weave.Service.isLoggedIn || !Weave.Engines.get("tabs").enabled)
      return;

    let label = this._stringBundle.GetStringFromName("tabs.fromOtherComputers.label");

    let popup = document.getElementById("alltabs-popup");
    if (!popup)
      return;
    
    let menuitem = document.createElement("menuitem");
    menuitem.setAttribute("id", "sync-tabs-menuitem");
    menuitem.setAttribute("label", label);
    menuitem.setAttribute("class", "alltabs-item");
    menuitem.setAttribute("oncommand", "BrowserOpenSyncTabs();");

    // Fake the tab object on the menu entries, so that we don't have to worry
    // about removing them ourselves. They will just get cleaned up by popup
    // binding.
    menuitem.tab = { "linkedBrowser": { "currentURI": { "spec": label } } };

    let sep = document.getElementById("alltabs-popup-separator");
    popup.insertBefore(menuitem, sep);
  },


  // Functions called by observers
  onActivityStart: function SUI_onActivityStart() {
    if (!gBrowser)
      return;

    let button = document.getElementById("sync-button");
    if (!button)
      return;

    button.setAttribute("status", "active");
  },

  onSyncFinish: function SUI_onSyncFinish() {
    this._onSyncEnd(true);
  },

  onSyncError: function SUI_onSyncError() {
    this._onSyncEnd(false);
  },

  onSyncDelay: function SUI_onSyncDelay() {
    // basically, we want to just inform users that stuff is going to take a while
    let title = this._stringBundle.GetStringFromName("error.sync.no_node_found.title");
    let description = this._stringBundle.GetStringFromName("error.sync.no_node_found");
    let buttons = [new Weave.NotificationButton(
      this._stringBundle.GetStringFromName("error.sync.serverStatusButton.label"),
      this._stringBundle.GetStringFromName("error.sync.serverStatusButton.accesskey"),
      function() { gSyncUI.openServerStatus(); return true; }
    )];
    let notification = new Weave.Notification(
      title, description, null, Weave.Notifications.PRIORITY_INFO, buttons);
    Weave.Notifications.replaceTitle(notification);
    this._wasDelayed = true;
  },

  onLoginFinish: function SUI_onLoginFinish() {
    // Clear out any login failure notifications
    let title = this._stringBundle.GetStringFromName("error.login.title");
    Weave.Notifications.removeAll(title);

    this.updateUI();
  },

  onLoginError: function SUI_onLoginError() {
    // if login fails, any other notifications are essentially moot
    Weave.Notifications.removeAll();

    // if we haven't set up the client, don't show errors
    if (this._needsSetup() || Weave.Service.shouldIgnoreError()) {
      this.updateUI();
      return;
    }

    let title = this._stringBundle.GetStringFromName("error.login.title");
    let reason = Weave.Utils.getErrorString(Weave.Status.login);
    let description =
      this._stringBundle.formatStringFromName("error.login.description", [reason], 1);
    let buttons = [];
    buttons.push(new Weave.NotificationButton(
      this._stringBundle.GetStringFromName("error.login.prefs.label"),
      this._stringBundle.GetStringFromName("error.login.prefs.accesskey"),
      function() { gSyncUI.openPrefs(); return true; }
    ));

    let notification = new Weave.Notification(title, description, null,
                                              Weave.Notifications.PRIORITY_WARNING, buttons);
    Weave.Notifications.replaceTitle(notification);
    this.updateUI();
  },

  onLogout: function SUI_onLogout() {
    this.updateUI();
  },

  onStartOver: function SUI_onStartOver() {
    Weave.Notifications.removeAll();
    this.updateUI();
  },

  onQuotaNotice: function onQuotaNotice(subject, data) {
    let title = this._stringBundle.GetStringFromName("warning.sync.quota.label");
    let description = this._stringBundle.GetStringFromName("warning.sync.quota.description");
    let buttons = [];
    buttons.push(new Weave.NotificationButton(
      this._stringBundle.GetStringFromName("error.sync.viewQuotaButton.label"),
      this._stringBundle.GetStringFromName("error.sync.viewQuotaButton.accesskey"),
      function() { gSyncUI.openQuotaDialog(); return true; }
    ));

    let notification = new Weave.Notification(
      title, description, null, Weave.Notifications.PRIORITY_WARNING, buttons);
    Weave.Notifications.replaceTitle(notification);
  },

  openServerStatus: function () {
    let statusURL = Services.prefs.getCharPref("services.sync.statusURL");
    window.openUILinkIn(statusURL, "tab");
  },

  // Commands
  doSync: function SUI_doSync() {
    setTimeout(function() Weave.Service.sync(), 0);
  },

  handleToolbarButton: function SUI_handleStatusbarButton() {
    if (this._needsSetup())
      this.openSetup();
    else
      this.doSync();
  },

  //XXXzpao should be part of syncCommon.js - which we might want to make a module...
  //        To be fixed in a followup (bug 583366)
  openSetup: function SUI_openSetup() {
    let win = Services.wm.getMostRecentWindow("Weave:AccountSetup");
    if (win)
      win.focus();
    else {
      window.openDialog("chrome://browser/content/syncSetup.xul",
                        "weaveSetup", "centerscreen,chrome,resizable=no");
    }
  },

  openQuotaDialog: function SUI_openQuotaDialog() {
    let win = Services.wm.getMostRecentWindow("Sync:ViewQuota");
    if (win)
      win.focus();
    else 
      Services.ww.activeWindow.openDialog(
        "chrome://browser/content/syncQuota.xul", "",
        "centerscreen,chrome,dialog,modal");
  },

  openPrefs: function SUI_openPrefs() {
    openPreferences("paneSync");
  },


  // Helpers
  _updateLastSyncTime: function SUI__updateLastSyncTime() {
    if (!gBrowser)
      return;

    let syncButton = document.getElementById("sync-button");
    if (!syncButton)
      return;

    let lastSync;
    try {
      lastSync = Services.prefs.getCharPref("services.sync.lastSync");
    }
    catch (e) { };
    if (!lastSync || this._needsSetup()) {
      syncButton.removeAttribute("tooltiptext");
      return;
    }

    // Show the day-of-week and time (HH:MM) of last sync
    let lastSyncDate = new Date(lastSync).toLocaleFormat("%a %H:%M");
    let lastSyncLabel =
      this._stringBundle.formatStringFromName("lastSync.label", [lastSyncDate], 1);

    syncButton.setAttribute("tooltiptext", lastSyncLabel);
  },

  _onSyncEnd: function SUI__onSyncEnd(success) {
    let title = this._stringBundle.GetStringFromName("error.sync.title");
    if (!success) {
      if (Weave.Status.login != Weave.LOGIN_SUCCEEDED) {
        this.onLoginError();
        return;
      }

      // Ignore network related errors unless we haven't been able to
      // sync for a while.
      if (Weave.Service.shouldIgnoreError()) {
        this.updateUI();
        return;
      }

      let error = Weave.Utils.getErrorString(Weave.Status.sync);
      let description =
        this._stringBundle.formatStringFromName("error.sync.description", [error], 1);

      let priority = Weave.Notifications.PRIORITY_WARNING;
      let buttons = [];

      // Check if the client is outdated in some way
      let outdated = Weave.Status.sync == Weave.VERSION_OUT_OF_DATE;
      for (let [engine, reason] in Iterator(Weave.Status.engines))
        outdated = outdated || reason == Weave.VERSION_OUT_OF_DATE;

      if (outdated) {
        description = this._stringBundle.GetStringFromName(
          "error.sync.needUpdate.description");
        buttons.push(new Weave.NotificationButton(
          this._stringBundle.GetStringFromName("error.sync.needUpdate.label"),
          this._stringBundle.GetStringFromName("error.sync.needUpdate.accesskey"),
          function() { window.openUILinkIn("https://services.mozilla.com/update/", "tab"); return true; }
        ));
      }
      else if (Weave.Status.sync == Weave.OVER_QUOTA) {
        description = this._stringBundle.GetStringFromName(
          "error.sync.quota.description");
        buttons.push(new Weave.NotificationButton(
          this._stringBundle.GetStringFromName(
            "error.sync.viewQuotaButton.label"),
          this._stringBundle.GetStringFromName(
            "error.sync.viewQuotaButton.accesskey"),
          function() { gSyncUI.openQuotaDialog(); return true; } )
        );
      }
      else if (Weave.Status.enforceBackoff) {
        priority = Weave.Notifications.PRIORITY_INFO;
        buttons.push(new Weave.NotificationButton(
          this._stringBundle.GetStringFromName("error.sync.serverStatusButton.label"),
          this._stringBundle.GetStringFromName("error.sync.serverStatusButton.accesskey"),
          function() { gSyncUI.openServerStatus(); return true; }
        ));
      }
      else {
        priority = Weave.Notifications.PRIORITY_INFO;
        buttons.push(new Weave.NotificationButton(
          this._stringBundle.GetStringFromName("error.sync.tryAgainButton.label"),
          this._stringBundle.GetStringFromName("error.sync.tryAgainButton.accesskey"),
          function() { gSyncUI.doSync(); return true; }
        ));
      }

      let notification =
        new Weave.Notification(title, description, null, priority, buttons);
      Weave.Notifications.replaceTitle(notification);
    }
    else {
      // Clear out sync failures on a successful sync
      Weave.Notifications.removeAll(title);
    }

    if (this._wasDelayed && Weave.Status.sync != Weave.NO_SYNC_NODE_FOUND) {
      title = this._stringBundle.GetStringFromName("error.sync.no_node_found.title");
      Weave.Notifications.removeAll(title);
      this._wasDelayed = false;
    }

    this.updateUI();
  },
  
  observe: function SUI_observe(subject, topic, data) {
    switch (topic) {
      case "weave:service:sync:start":
        this.onActivityStart();
        break;
      case "weave:service:sync:finish":
        this.onSyncFinish();
        break;
      case "weave:service:sync:error":
        this.onSyncError();
        break;
      case "weave:service:sync:delayed":
        this.onSyncDelay();
        break;
      case "weave:service:quota:remaining":
        this.onQuotaNotice();
        break;
      case "weave:service:setup-complete":
        this.onLoginFinish();
        break;
      case "weave:service:login:start":
        this.onActivityStart();
        break;
      case "weave:service:login:finish":
        this.onLoginFinish();
        break;
      case "weave:service:login:error":
        this.onLoginError();
        break;
      case "weave:service:logout:finish":
        this.onLogout();
        break;
      case "weave:service:start-over":
        this.onStartOver();
        break;
      case "weave:service:ready":
        this.initUI();
        break;
      case "weave:notification:added":
        this.initNotifications();
        break;
    }
  },

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIObserver,
    Ci.nsISupportsWeakReference
  ])
};

XPCOMUtils.defineLazyGetter(gSyncUI, "_stringBundle", function() {
  //XXXzpao these strings should probably be moved from /services to /browser... (bug 583381)
  //        but for now just make it work
  return Cc["@mozilla.org/intl/stringbundle;1"].
         getService(Ci.nsIStringBundleService).
         createBundle("chrome://weave/locale/services/sync.properties");
});

//@line 188 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

XPCOMUtils.defineLazyGetter(this, "Win7Features", function () {
//@line 209 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  return null;
});

//@line 217 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

/**
* We can avoid adding multiple load event listeners and save some time by adding
* one listener that calls all real handlers.
*/
function pageShowEventHandlers(event) {
  // Filter out events that are not about the document load we are interested in
  if (event.originalTarget == content.document) {
    charsetLoadListener(event);
    XULBrowserWindow.asyncUpdateUI();
  }
}

function UpdateBackForwardCommands(aWebNavigation) {
  var backBroadcaster = document.getElementById("Browser:Back");
  var forwardBroadcaster = document.getElementById("Browser:Forward");

  // Avoid setting attributes on broadcasters if the value hasn't changed!
  // Remember, guys, setting attributes on elements is expensive!  They
  // get inherited into anonymous content, broadcast to other widgets, etc.!
  // Don't do it if the value hasn't changed! - dwh

  var backDisabled = backBroadcaster.hasAttribute("disabled");
  var forwardDisabled = forwardBroadcaster.hasAttribute("disabled");
  if (backDisabled == aWebNavigation.canGoBack) {
    if (backDisabled)
      backBroadcaster.removeAttribute("disabled");
    else
      backBroadcaster.setAttribute("disabled", true);
  }

  if (forwardDisabled == aWebNavigation.canGoForward) {
    if (forwardDisabled)
      forwardBroadcaster.removeAttribute("disabled");
    else
      forwardBroadcaster.setAttribute("disabled", true);
  }
}

/**
 * Click-and-Hold implementation for the Back and Forward buttons
 * XXXmano: should this live in toolbarbutton.xml?
 */
function SetClickAndHoldHandlers() {
  var timer;

  function timerCallback(aButton) {
    aButton.firstChild.hidden = false;
    aButton.open = true;
    timer = null;
  }

  function mousedownHandler(aEvent) {
    if (aEvent.button != 0 ||
        aEvent.currentTarget.open ||
        aEvent.currentTarget.disabled)
      return;

    // Prevent the menupopup from opening immediately
    aEvent.currentTarget.firstChild.hidden = true;

    timer = setTimeout(timerCallback, 500, aEvent.currentTarget);
  }

  function clickHandler(aEvent) {
    if (aEvent.button == 0 &&
        aEvent.target == aEvent.currentTarget &&
        !aEvent.currentTarget.open &&
        !aEvent.currentTarget.disabled) {
      let cmdEvent = document.createEvent("xulcommandevent");
      cmdEvent.initCommandEvent("command", true, true, window, 0,
                                aEvent.ctrlKey, aEvent.altKey, aEvent.shiftKey,
                                aEvent.metaKey, null);
      aEvent.currentTarget.dispatchEvent(cmdEvent);
    }
  }

  function stopTimer(aEvent) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function _addClickAndHoldListenersOnElement(aElm) {
    aElm.addEventListener("mousedown", mousedownHandler, true);
    aElm.addEventListener("mouseup", stopTimer, false);
    aElm.addEventListener("mouseout", stopTimer, false);
    aElm.addEventListener("click", clickHandler, true);
  }

  // Bug 414797: Clone the dropmarker's menu into both the back and
  // the forward buttons.
  var unifiedButton = document.getElementById("unified-back-forward-button");
  if (unifiedButton && !unifiedButton._clickHandlersAttached) {
    var popup = document.getElementById("backForwardMenu").cloneNode(true);
    popup.removeAttribute("id");
    var backButton = document.getElementById("back-button");
    backButton.setAttribute("type", "menu");
    backButton.appendChild(popup);
    _addClickAndHoldListenersOnElement(backButton);
    var forwardButton = document.getElementById("forward-button");
    popup = popup.cloneNode(true);
    forwardButton.setAttribute("type", "menu");
    forwardButton.appendChild(popup);
    _addClickAndHoldListenersOnElement(forwardButton);
    unifiedButton._clickHandlersAttached = true;
  }
}

const gSessionHistoryObserver = {
  observe: function(subject, topic, data)
  {
    if (topic != "browser:purge-session-history")
      return;

    var backCommand = document.getElementById("Browser:Back");
    backCommand.setAttribute("disabled", "true");
    var fwdCommand = document.getElementById("Browser:Forward");
    fwdCommand.setAttribute("disabled", "true");

    if (gURLBar) {
      // Clear undo history of the URL bar
      gURLBar.editor.transactionManager.clear()
    }
  }
};

/**
 * Given a starting docshell and a URI to look up, find the docshell the URI
 * is loaded in.
 * @param   aDocument
 *          A document to find instead of using just a URI - this is more specific.
 * @param   aDocShell
 *          The doc shell to start at
 * @param   aSoughtURI
 *          The URI that we're looking for
 * @returns The doc shell that the sought URI is loaded in. Can be in
 *          subframes.
 */
function findChildShell(aDocument, aDocShell, aSoughtURI) {
  aDocShell.QueryInterface(Components.interfaces.nsIWebNavigation);
  aDocShell.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
  var doc = aDocShell.getInterface(Components.interfaces.nsIDOMDocument);
  if ((aDocument && doc == aDocument) ||
      (aSoughtURI && aSoughtURI.spec == aDocShell.currentURI.spec))
    return aDocShell;

  var node = aDocShell.QueryInterface(Components.interfaces.nsIDocShellTreeNode);
  for (var i = 0; i < node.childCount; ++i) {
    var docShell = node.getChildAt(i);
    docShell = findChildShell(aDocument, docShell, aSoughtURI);
    if (docShell)
      return docShell;
  }
  return null;
}

var gPopupBlockerObserver = {
  _reportButton: null,
  
  onReportButtonClick: function (aEvent)
  {
    if (aEvent.button != 0 || aEvent.target != this._reportButton)
      return;

    document.getElementById("blockedPopupOptions")
            .openPopup(this._reportButton, "after_end", 0, 2, false, false, aEvent);
  },

  handleEvent: function (aEvent)
  {
    if (aEvent.originalTarget != gBrowser.selectedBrowser)
      return;

    if (!this._reportButton && gURLBar)
      this._reportButton = document.getElementById("page-report-button");

    if (!gBrowser.pageReport) {
      // Hide the icon in the location bar (if the location bar exists)
      if (gURLBar)
        this._reportButton.hidden = true;
      return;
    }

    if (gURLBar)
      this._reportButton.hidden = false;

    // Only show the notification again if we've not already shown it. Since
    // notifications are per-browser, we don't need to worry about re-adding
    // it.
    if (!gBrowser.pageReport.reported) {
      if (gPrefService.getBoolPref("privacy.popups.showBrowserMessage")) {
        var brandBundle = document.getElementById("bundle_brand");
        var brandShortName = brandBundle.getString("brandShortName");
        var message;
        var popupCount = gBrowser.pageReport.length;
//@line 418 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
        var popupButtonText = gNavigatorBundle.getString("popupWarningButtonUnix");
        var popupButtonAccesskey = gNavigatorBundle.getString("popupWarningButtonUnix.accesskey");
//@line 421 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
        if (popupCount > 1)
          message = gNavigatorBundle.getFormattedString("popupWarningMultiple", [brandShortName, popupCount]);
        else
          message = gNavigatorBundle.getFormattedString("popupWarning", [brandShortName]);

        var notificationBox = gBrowser.getNotificationBox();
        var notification = notificationBox.getNotificationWithValue("popup-blocked");
        if (notification) {
          notification.label = message;
        }
        else {
          var buttons = [{
            label: popupButtonText,
            accessKey: popupButtonAccesskey,
            popup: "blockedPopupOptions",
            callback: null
          }];

          const priority = notificationBox.PRIORITY_WARNING_MEDIUM;
          notificationBox.appendNotification(message, "popup-blocked",
                                             "chrome://browser/skin/Info.png",
                                             priority, buttons);
        }
      }

      // Record the fact that we've reported this blocked popup, so we don't
      // show it again.
      gBrowser.pageReport.reported = true;
    }
  },

  toggleAllowPopupsForSite: function (aEvent)
  {
    var pm = Services.perms;
    var shouldBlock = aEvent.target.getAttribute("block") == "true";
    var perm = shouldBlock ? pm.DENY_ACTION : pm.ALLOW_ACTION;
    pm.add(gBrowser.currentURI, "popup", perm);

    gBrowser.getNotificationBox().removeCurrentNotification();
  },

  fillPopupList: function (aEvent)
  {
    // XXXben - rather than using |currentURI| here, which breaks down on multi-framed sites
    //          we should really walk the pageReport and create a list of "allow for <host>"
    //          menuitems for the common subset of hosts present in the report, this will
    //          make us frame-safe.
    //
    // XXXjst - Note that when this is fixed to work with multi-framed sites,
    //          also back out the fix for bug 343772 where
    //          nsGlobalWindow::CheckOpenAllow() was changed to also
    //          check if the top window's location is whitelisted.
    var uri = gBrowser.currentURI;
    var blockedPopupAllowSite = document.getElementById("blockedPopupAllowSite");
    try {
      blockedPopupAllowSite.removeAttribute("hidden");

      var pm = Services.perms;
      if (pm.testPermission(uri, "popup") == pm.ALLOW_ACTION) {
        // Offer an item to block popups for this site, if a whitelist entry exists
        // already for it.
        let blockString = gNavigatorBundle.getFormattedString("popupBlock", [uri.host]);
        blockedPopupAllowSite.setAttribute("label", blockString);
        blockedPopupAllowSite.setAttribute("block", "true");
      }
      else {
        // Offer an item to allow popups for this site
        let allowString = gNavigatorBundle.getFormattedString("popupAllow", [uri.host]);
        blockedPopupAllowSite.setAttribute("label", allowString);
        blockedPopupAllowSite.removeAttribute("block");
      }
    }
    catch (e) {
      blockedPopupAllowSite.setAttribute("hidden", "true");
    }

    if (gPrivateBrowsingUI.privateBrowsingEnabled)
      blockedPopupAllowSite.setAttribute("disabled", "true");
    else
      blockedPopupAllowSite.removeAttribute("disabled");

    var item = aEvent.target.lastChild;
    while (item && item.getAttribute("observes") != "blockedPopupsSeparator") {
      var next = item.previousSibling;
      item.parentNode.removeChild(item);
      item = next;
    }

    var foundUsablePopupURI = false;
    var pageReport = gBrowser.pageReport;
    if (pageReport) {
      for (var i = 0; i < pageReport.length; ++i) {
        // popupWindowURI will be null if the file picker popup is blocked.
        // xxxdz this should make the option say "Show file picker" and do it (Bug 590306) 
        if (!pageReport[i].popupWindowURI)
          continue;
        var popupURIspec = pageReport[i].popupWindowURI.spec;

        // Sometimes the popup URI that we get back from the pageReport
        // isn't useful (for instance, netscape.com's popup URI ends up
        // being "http://www.netscape.com", which isn't really the URI of
        // the popup they're trying to show).  This isn't going to be
        // useful to the user, so we won't create a menu item for it.
        if (popupURIspec == "" || popupURIspec == "about:blank" ||
            popupURIspec == uri.spec)
          continue;

        // Because of the short-circuit above, we may end up in a situation
        // in which we don't have any usable popup addresses to show in
        // the menu, and therefore we shouldn't show the separator.  However,
        // since we got past the short-circuit, we must've found at least
        // one usable popup URI and thus we'll turn on the separator later.
        foundUsablePopupURI = true;

        var menuitem = document.createElement("menuitem");
        var label = gNavigatorBundle.getFormattedString("popupShowPopupPrefix",
                                                        [popupURIspec]);
        menuitem.setAttribute("label", label);
        menuitem.setAttribute("popupWindowURI", popupURIspec);
        menuitem.setAttribute("popupWindowFeatures", pageReport[i].popupWindowFeatures);
        menuitem.setAttribute("popupWindowName", pageReport[i].popupWindowName);
        menuitem.setAttribute("oncommand", "gPopupBlockerObserver.showBlockedPopup(event);");
        menuitem.requestingWindow = pageReport[i].requestingWindow;
        menuitem.requestingDocument = pageReport[i].requestingDocument;
        aEvent.target.appendChild(menuitem);
      }
    }

    // Show or hide the separator, depending on whether we added any
    // showable popup addresses to the menu.
    var blockedPopupsSeparator =
      document.getElementById("blockedPopupsSeparator");
    if (foundUsablePopupURI)
      blockedPopupsSeparator.removeAttribute("hidden");
    else
      blockedPopupsSeparator.setAttribute("hidden", true);

    var blockedPopupDontShowMessage = document.getElementById("blockedPopupDontShowMessage");
    var showMessage = gPrefService.getBoolPref("privacy.popups.showBrowserMessage");
    blockedPopupDontShowMessage.setAttribute("checked", !showMessage);
    if (aEvent.target.anchorNode.id == "page-report-button") {
      aEvent.target.anchorNode.setAttribute("open", "true");
      blockedPopupDontShowMessage.setAttribute("label", gNavigatorBundle.getString("popupWarningDontShowFromLocationbar"));
    } else
      blockedPopupDontShowMessage.setAttribute("label", gNavigatorBundle.getString("popupWarningDontShowFromMessage"));
  },

  onPopupHiding: function (aEvent) {
    if (aEvent.target.anchorNode.id == "page-report-button")
      aEvent.target.anchorNode.removeAttribute("open");
  },

  showBlockedPopup: function (aEvent)
  {
    var target = aEvent.target;
    var popupWindowURI = target.getAttribute("popupWindowURI");
    var features = target.getAttribute("popupWindowFeatures");
    var name = target.getAttribute("popupWindowName");

    var dwi = target.requestingWindow;

    // If we have a requesting window and the requesting document is
    // still the current document, open the popup.
    if (dwi && dwi.document == target.requestingDocument) {
      dwi.open(popupWindowURI, name, features);
    }
  },

  editPopupSettings: function ()
  {
    var host = "";
    try {
      host = gBrowser.currentURI.host;
    }
    catch (e) { }

    var bundlePreferences = document.getElementById("bundle_preferences");
    var params = { blockVisible   : false,
                   sessionVisible : false,
                   allowVisible   : true,
                   prefilledHost  : host,
                   permissionType : "popup",
                   windowTitle    : bundlePreferences.getString("popuppermissionstitle"),
                   introText      : bundlePreferences.getString("popuppermissionstext") };
    var existingWindow = Services.wm.getMostRecentWindow("Browser:Permissions");
    if (existingWindow) {
      existingWindow.initWithParams(params);
      existingWindow.focus();
    }
    else
      window.openDialog("chrome://browser/content/preferences/permissions.xul",
                        "_blank", "resizable,dialog=no,centerscreen", params);
  },

  dontShowMessage: function ()
  {
    var showMessage = gPrefService.getBoolPref("privacy.popups.showBrowserMessage");
    gPrefService.setBoolPref("privacy.popups.showBrowserMessage", !showMessage);
    gBrowser.getNotificationBox().removeCurrentNotification();
  }
};

const gXPInstallObserver = {
  _findChildShell: function (aDocShell, aSoughtShell)
  {
    if (aDocShell == aSoughtShell)
      return aDocShell;

    var node = aDocShell.QueryInterface(Components.interfaces.nsIDocShellTreeNode);
    for (var i = 0; i < node.childCount; ++i) {
      var docShell = node.getChildAt(i);
      docShell = this._findChildShell(docShell, aSoughtShell);
      if (docShell == aSoughtShell)
        return docShell;
    }
    return null;
  },

  _getBrowser: function (aDocShell)
  {
    for (var i = 0; i < gBrowser.browsers.length; ++i) {
      var browser = gBrowser.getBrowserAtIndex(i);
      if (this._findChildShell(browser.docShell, aDocShell))
        return browser;
    }
    return null;
  },

  observe: function (aSubject, aTopic, aData)
  {
    var brandBundle = document.getElementById("bundle_brand");
    var installInfo = aSubject.QueryInterface(Components.interfaces.amIWebInstallInfo);
    var win = installInfo.originatingWindow;
    var shell = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShell);
    var browser = this._getBrowser(shell);
    if (!browser)
      return;
    const anchorID = "addons-notification-icon";
    var messageString, action;
    var brandShortName = brandBundle.getString("brandShortName");

    var notificationID = aTopic;
    // Make notifications persist a minimum of 30 seconds
    var options = {
      timeout: Date.now() + 30000
    };

    switch (aTopic) {
    case "addon-install-disabled":
      notificationID = "xpinstall-disabled"

      if (gPrefService.prefIsLocked("xpinstall.enabled")) {
        messageString = gNavigatorBundle.getString("xpinstallDisabledMessageLocked");
        buttons = [];
      }
      else {
        messageString = gNavigatorBundle.getString("xpinstallDisabledMessage");

        action = {
          label: gNavigatorBundle.getString("xpinstallDisabledButton"),
          accessKey: gNavigatorBundle.getString("xpinstallDisabledButton.accesskey"),
          callback: function editPrefs() {
            gPrefService.setBoolPref("xpinstall.enabled", true);
          }
        };
      }

      PopupNotifications.show(browser, notificationID, messageString, anchorID,
                              action, null, options);
      break;
    case "addon-install-blocked":
      messageString = gNavigatorBundle.getFormattedString("xpinstallPromptWarning",
                        [brandShortName, installInfo.originatingURI.host]);

      action = {
        label: gNavigatorBundle.getString("xpinstallPromptAllowButton"),
        accessKey: gNavigatorBundle.getString("xpinstallPromptAllowButton.accesskey"),
        callback: function() {
          installInfo.install();
        }
      };

      PopupNotifications.show(browser, notificationID, messageString, anchorID,
                              action, null, options);
      break;
    case "addon-install-started":
      function needsDownload(aInstall) {
        return aInstall.state != AddonManager.STATE_DOWNLOADED;
      }
      // If all installs have already been downloaded then there is no need to
      // show the download progress
      if (!installInfo.installs.some(needsDownload))
        return;
      notificationID = "addon-progress";
      messageString = gNavigatorBundle.getString("addonDownloading");
      messageString = PluralForm.get(installInfo.installs.length, messageString);
      options.installs = installInfo.installs;
      options.contentWindow = browser.contentWindow;
      options.sourceURI = browser.currentURI;
      options.eventCallback = function(aEvent) {
        if (aEvent != "removed")
          return;
        options.contentWindow = null;
        options.sourceURI = null;
      };
      PopupNotifications.show(browser, notificationID, messageString, anchorID,
                              null, null, options);
      break;
    case "addon-install-failed":
      // TODO This isn't terribly ideal for the multiple failure case
      installInfo.installs.forEach(function(aInstall) {
        var host = (installInfo.originatingURI instanceof Ci.nsIStandardURL) &&
                   installInfo.originatingURI.host;
        if (!host)
          host = (aInstall.sourceURI instanceof Ci.nsIStandardURL) &&
                 aInstall.sourceURI.host;

        var error = (host || aInstall.error == 0) ? "addonError" : "addonLocalError";
        if (aInstall.error != 0)
          error += aInstall.error;
        else if (aInstall.addon.blocklistState == Ci.nsIBlocklistService.STATE_BLOCKED)
          error += "Blocklisted";
        else
          error += "Incompatible";

        messageString = gNavigatorBundle.getString(error);
        messageString = messageString.replace("#1", aInstall.name);
        if (host)
          messageString = messageString.replace("#2", host);
        messageString = messageString.replace("#3", brandShortName);
        messageString = messageString.replace("#4", Services.appinfo.version);

        PopupNotifications.show(browser, notificationID, messageString, anchorID,
                                action, null, options);
      });
      break;
    case "addon-install-complete":
      var needsRestart = installInfo.installs.some(function(i) {
        return i.addon.pendingOperations != AddonManager.PENDING_NONE;
      });

      if (needsRestart) {
        messageString = gNavigatorBundle.getString("addonsInstalledNeedsRestart");
        action = {
          label: gNavigatorBundle.getString("addonInstallRestartButton"),
          accessKey: gNavigatorBundle.getString("addonInstallRestartButton.accesskey"),
          callback: function() {
            Application.restart();
          }
        };
      }
      else {
        messageString = gNavigatorBundle.getString("addonsInstalled");
        action = {
          label: gNavigatorBundle.getString("addonInstallManage"),
          accessKey: gNavigatorBundle.getString("addonInstallManage.accesskey"),
          callback: function() {
            // Calculate the add-on type that is most popular in the list of
            // installs
            var types = {};
            var bestType = null;
            installInfo.installs.forEach(function(aInstall) {
              if (aInstall.type in types)
                types[aInstall.type]++;
              else
                types[aInstall.type] = 1;
              if (!bestType || types[aInstall.type] > types[bestType])
                bestType = aInstall.type;
            });

            BrowserOpenAddonsMgr("addons://list/" + bestType);
          }
        };
      }

      messageString = PluralForm.get(installInfo.installs.length, messageString);
      messageString = messageString.replace("#1", installInfo.installs[0].name);
      messageString = messageString.replace("#2", installInfo.installs.length);
      messageString = messageString.replace("#3", brandShortName);

      // Remove notificaion on dismissal, since it's possible to cancel the
      // install through the addons manager UI, making the "restart" prompt
      // irrelevant.
      options.removeOnDismissal = true;

      PopupNotifications.show(browser, notificationID, messageString, anchorID,
                              action, null, options);
      break;
    }
  }
};

const gFormSubmitObserver = {
  QueryInterface : XPCOMUtils.generateQI([Ci.nsIFormSubmitObserver]),

  panel: null,

  init: function()
  {
    this.panel = document.getElementById('invalid-form-popup');
  },

  panelIsOpen: function()
  {
    return this.panel && this.panel.state != "hiding" &&
           this.panel.state != "closed";
  },

  notifyInvalidSubmit : function (aFormElement, aInvalidElements)
  {
    // We are going to handle invalid form submission attempt by focusing the
    // first invalid element and show the corresponding validation message in a
    // panel attached to the element.
    if (!aInvalidElements.length) {
      return;
    }

    // Don't show the popup if the current tab doesn't contain the invalid form.
    if (gBrowser.contentDocument !=
        aFormElement.ownerDocument.defaultView.top.document) {
      return;
    }

    let element = aInvalidElements.queryElementAt(0, Ci.nsISupports);

    if (!(element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLButtonElement)) {
      return;
    }

    this.panel.firstChild.textContent = element.validationMessage;

    element.focus();

    // If the user interacts with the element and makes it valid or leaves it,
    // we want to remove the popup.
    // We could check for clicks but a click is already removing the popup.
    function blurHandler() {
      gFormSubmitObserver.panel.hidePopup();
    };
    function inputHandler(e) {
      if (e.originalTarget.validity.valid) {
        gFormSubmitObserver.panel.hidePopup();
      } else {
        // If the element is now invalid for a new reason, we should update the
        // error message.
        if (gFormSubmitObserver.panel.firstChild.textContent !=
            e.originalTarget.validationMessage) {
          gFormSubmitObserver.panel.firstChild.textContent =
            e.originalTarget.validationMessage;
        }
      }
    };
    element.addEventListener("input", inputHandler, false);
    element.addEventListener("blur", blurHandler, false);

    // One event to bring them all and in the darkness bind them.
    this.panel.addEventListener("popuphiding", function(aEvent) {
      aEvent.target.removeEventListener("popuphiding", arguments.callee, false);
      element.removeEventListener("input", inputHandler, false);
      element.removeEventListener("blur", blurHandler, false);
    }, false);

    this.panel.hidden = false;

    // We want to show the popup at the middle of checkbox and radio buttons
    // and where the content begin for the other elements.
    let offset = 0;
    let position = "";

    if (element.tagName == 'INPUT' &&
        (element.type == 'radio' || element.type == 'checkbox')) {
      position = "bottomcenter topleft";
    } else {
      let win = element.ownerDocument.defaultView;
      let style = win.getComputedStyle(element, null);
      let utils = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                     .getInterface(Components.interfaces.nsIDOMWindowUtils);

      if (style.direction == 'rtl') {
        offset = parseInt(style.paddingRight) + parseInt(style.borderRightWidth);
      } else {
        offset = parseInt(style.paddingLeft) + parseInt(style.borderLeftWidth);
      }

      offset = Math.round(offset * utils.screenPixelsPerCSSPixel);

      position = "after_start";
    }

    this.panel.openPopup(element, position, offset, 0);
  }
};

// Simple gestures support
//
// As per bug #412486, web content must not be allowed to receive any
// simple gesture events.  Multi-touch gesture APIs are in their
// infancy and we do NOT want to be forced into supporting an API that
// will probably have to change in the future.  (The current Mac OS X
// API is undocumented and was reverse-engineered.)  Until support is
// implemented in the event dispatcher to keep these events as
// chrome-only, we must listen for the simple gesture events during
// the capturing phase and call stopPropagation on every event.

let gGestureSupport = {
  /**
   * Add or remove mouse gesture event listeners
   *
   * @param aAddListener
   *        True to add/init listeners and false to remove/uninit
   */
  init: function GS_init(aAddListener) {
    const gestureEvents = ["SwipeGesture",
      "MagnifyGestureStart", "MagnifyGestureUpdate", "MagnifyGesture",
      "RotateGestureStart", "RotateGestureUpdate", "RotateGesture",
      "TapGesture", "PressTapGesture"];

    let addRemove = aAddListener ? window.addEventListener :
      window.removeEventListener;

    gestureEvents.forEach(function (event) addRemove("Moz" + event, this, true),
                          this);
  },

  /**
   * Dispatch events based on the type of mouse gesture event. For now, make
   * sure to stop propagation of every gesture event so that web content cannot
   * receive gesture events.
   *
   * @param aEvent
   *        The gesture event to handle
   */
  handleEvent: function GS_handleEvent(aEvent) {
    aEvent.stopPropagation();

    // Create a preference object with some defaults
    let def = function(aThreshold, aLatched)
      ({ threshold: aThreshold, latched: !!aLatched });

    switch (aEvent.type) {
      case "MozSwipeGesture":
        aEvent.preventDefault();
        return this.onSwipe(aEvent);
      case "MozMagnifyGestureStart":
        aEvent.preventDefault();
//@line 974 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
        return this._setupGesture(aEvent, "pinch", def(150, 1), "out", "in");
//@line 976 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      case "MozRotateGestureStart":
        aEvent.preventDefault();
        return this._setupGesture(aEvent, "twist", def(25, 0), "right", "left");
      case "MozMagnifyGestureUpdate":
      case "MozRotateGestureUpdate":
        aEvent.preventDefault();
        return this._doUpdate(aEvent);
      case "MozTapGesture":
        aEvent.preventDefault();
        return this._doAction(aEvent, ["tap"]);
      case "MozPressTapGesture":
      // Fall through to default behavior
      return;
    }
  },

  /**
   * Called at the start of "pinch" and "twist" gestures to setup all of the
   * information needed to process the gesture
   *
   * @param aEvent
   *        The continual motion start event to handle
   * @param aGesture
   *        Name of the gesture to handle
   * @param aPref
   *        Preference object with the names of preferences and defaults
   * @param aInc
   *        Command to trigger for increasing motion (without gesture name)
   * @param aDec
   *        Command to trigger for decreasing motion (without gesture name)
   */
  _setupGesture: function GS__setupGesture(aEvent, aGesture, aPref, aInc, aDec) {
    // Try to load user-set values from preferences
    for (let [pref, def] in Iterator(aPref))
      aPref[pref] = this._getPref(aGesture + "." + pref, def);

    // Keep track of the total deltas and latching behavior
    let offset = 0;
    let latchDir = aEvent.delta > 0 ? 1 : -1;
    let isLatched = false;

    // Create the update function here to capture closure state
    this._doUpdate = function GS__doUpdate(aEvent) {
      // Update the offset with new event data
      offset += aEvent.delta;

      // Check if the cumulative deltas exceed the threshold
      if (Math.abs(offset) > aPref["threshold"]) {
        // Trigger the action if we don't care about latching; otherwise, make
        // sure either we're not latched and going the same direction of the
        // initial motion; or we're latched and going the opposite way
        let sameDir = (latchDir ^ offset) >= 0;
        if (!aPref["latched"] || (isLatched ^ sameDir)) {
          this._doAction(aEvent, [aGesture, offset > 0 ? aInc : aDec]);

          // We must be getting latched or leaving it, so just toggle
          isLatched = !isLatched;
        }

        // Reset motion counter to prepare for more of the same gesture
        offset = 0;
      }
    };

    // The start event also contains deltas, so handle an update right away
    this._doUpdate(aEvent);
  },

  /**
   * Generator producing the powerset of the input array where the first result
   * is the complete set and the last result (before StopIteration) is empty.
   *
   * @param aArray
   *        Source array containing any number of elements
   * @yield Array that is a subset of the input array from full set to empty
   */
  _power: function GS__power(aArray) {
    // Create a bitmask based on the length of the array
    let num = 1 << aArray.length;
    while (--num >= 0) {
      // Only select array elements where the current bit is set
      yield aArray.reduce(function (aPrev, aCurr, aIndex) {
        if (num & 1 << aIndex)
          aPrev.push(aCurr);
        return aPrev;
      }, []);
    }
  },

  /**
   * Determine what action to do for the gesture based on which keys are
   * pressed and which commands are set
   *
   * @param aEvent
   *        The original gesture event to convert into a fake click event
   * @param aGesture
   *        Array of gesture name parts (to be joined by periods)
   * @return Name of the command found for the event's keys and gesture. If no
   *         command is found, no value is returned (undefined).
   */
  _doAction: function GS__doAction(aEvent, aGesture) {
    // Create an array of pressed keys in a fixed order so that a command for
    // "meta" is preferred over "ctrl" when both buttons are pressed (and a
    // command for both don't exist)
    let keyCombos = [];
    ["shift", "alt", "ctrl", "meta"].forEach(function (key) {
      if (aEvent[key + "Key"])
        keyCombos.push(key);
    });

    // Try each combination of key presses in decreasing order for commands
    for each (let subCombo in this._power(keyCombos)) {
      // Convert a gesture and pressed keys into the corresponding command
      // action where the preference has the gesture before "shift" before
      // "alt" before "ctrl" before "meta" all separated by periods
      let command;
      try {
        command = this._getPref(aGesture.concat(subCombo).join("."));
      } catch (e) {}

      if (!command)
        continue;

      let node = document.getElementById(command);
      if (node) {
        if (node.getAttribute("disabled") != "true") {
          let cmdEvent = document.createEvent("xulcommandevent");
          cmdEvent.initCommandEvent("command", true, true, window, 0,
                                    aEvent.ctrlKey, aEvent.altKey, aEvent.shiftKey,
                                    aEvent.metaKey, null);
          node.dispatchEvent(cmdEvent);
        }
      } else {
        goDoCommand(command);
      }

      return command;
    }
    return null;
  },

  /**
   * Convert continual motion events into an action if it exceeds a threshold
   * in a given direction. This function will be set by _setupGesture to
   * capture state that needs to be shared across multiple gesture updates.
   *
   * @param aEvent
   *        The continual motion update event to handle
   */
  _doUpdate: function(aEvent) {},

  /**
   * Convert the swipe gesture into a browser action based on the direction
   *
   * @param aEvent
   *        The swipe event to handle
   */
  onSwipe: function GS_onSwipe(aEvent) {
    // Figure out which one (and only one) direction was triggered
    ["UP", "RIGHT", "DOWN", "LEFT"].forEach(function (dir) {
      if (aEvent.direction == aEvent["DIRECTION_" + dir])
        return this._doAction(aEvent, ["swipe", dir.toLowerCase()]);
    }, this);
  },

  /**
   * Get a gesture preference or use a default if it doesn't exist
   *
   * @param aPref
   *        Name of the preference to load under the gesture branch
   * @param aDef
   *        Default value if the preference doesn't exist
   */
  _getPref: function GS__getPref(aPref, aDef) {
    // Preferences branch under which all gestures preferences are stored
    const branch = "browser.gesture.";

    try {
      // Determine what type of data to load based on default value's type
      let type = typeof aDef;
      let getFunc = "get" + (type == "boolean" ? "Bool" :
                             type == "number" ? "Int" : "Char") + "Pref";
      return gPrefService[getFunc](branch + aPref);
    }
    catch (e) {
      return aDef;
    }
  },
};

function BrowserStartup() {
  var uriToLoad = null;

  // window.arguments[0]: URI to load (string), or an nsISupportsArray of
  //                      nsISupportsStrings to load, or a xul:tab of
  //                      a tabbrowser, which will be replaced by this
  //                      window (for this case, all other arguments are
  //                      ignored).
  //                 [1]: character set (string)
  //                 [2]: referrer (nsIURI)
  //                 [3]: postData (nsIInputStream)
  //                 [4]: allowThirdPartyFixup (bool)
  if ("arguments" in window && window.arguments[0])
    uriToLoad = window.arguments[0];

  var isLoadingBlank = uriToLoad == "about:blank";
  var mustLoadSidebar = false;

  prepareForStartup();

  if (uriToLoad && !isLoadingBlank) {
    if (uriToLoad instanceof Ci.nsISupportsArray) {
      let count = uriToLoad.Count();
      let specs = [];
      for (let i = 0; i < count; i++) {
        let urisstring = uriToLoad.GetElementAt(i).QueryInterface(Ci.nsISupportsString);
        specs.push(urisstring.data);
      }

      // This function throws for certain malformed URIs, so use exception handling
      // so that we don't disrupt startup
      try {
        gBrowser.loadTabs(specs, false, true);
      } catch (e) {}
    }
    else if (uriToLoad instanceof XULElement) {
      // swap the given tab with the default about:blank tab and then close
      // the original tab in the other window.

      // Stop the about:blank load
      gBrowser.stop();
      // make sure it has a docshell
      gBrowser.docShell;

      gBrowser.swapBrowsersAndCloseOther(gBrowser.selectedTab, uriToLoad);
    }
    else if (window.arguments.length >= 3) {
      loadURI(uriToLoad, window.arguments[2], window.arguments[3] || null,
              window.arguments[4] || false);
      content.focus();
    }
    // Note: loadOneOrMoreURIs *must not* be called if window.arguments.length >= 3.
    // Such callers expect that window.arguments[0] is handled as a single URI.
    else
      loadOneOrMoreURIs(uriToLoad);
  }

  if (window.opener && !window.opener.closed) {
    let openerSidebarBox = window.opener.document.getElementById("sidebar-box");
    // If the opener had a sidebar, open the same sidebar in our window.
    // The opener can be the hidden window too, if we're coming from the state
    // where no windows are open, and the hidden window has no sidebar box.
    if (openerSidebarBox && !openerSidebarBox.hidden) {
      let sidebarCmd = openerSidebarBox.getAttribute("sidebarcommand");
      let sidebarCmdElem = document.getElementById(sidebarCmd);

      // dynamically generated sidebars will fail this check.
      if (sidebarCmdElem) {
        let sidebarBox = document.getElementById("sidebar-box");
        let sidebarTitle = document.getElementById("sidebar-title");

        sidebarTitle.setAttribute(
          "value", window.opener.document.getElementById("sidebar-title").getAttribute("value"));
        sidebarBox.setAttribute("width", openerSidebarBox.boxObject.width);

        sidebarBox.setAttribute("sidebarcommand", sidebarCmd);
        // Note: we're setting 'src' on sidebarBox, which is a <vbox>, not on
        // the <browser id="sidebar">. This lets us delay the actual load until
        // delayedStartup().
        sidebarBox.setAttribute(
          "src", window.opener.document.getElementById("sidebar").getAttribute("src"));
        mustLoadSidebar = true;

        sidebarBox.hidden = false;
        document.getElementById("sidebar-splitter").hidden = false;
        sidebarCmdElem.setAttribute("checked", "true");
      }
    }
  }
  else {
    let box = document.getElementById("sidebar-box");
    if (box.hasAttribute("sidebarcommand")) {
      let commandID = box.getAttribute("sidebarcommand");
      if (commandID) {
        let command = document.getElementById(commandID);
        if (command) {
          mustLoadSidebar = true;
          box.hidden = false;
          document.getElementById("sidebar-splitter").hidden = false;
          command.setAttribute("checked", "true");
        }
        else {
          // Remove the |sidebarcommand| attribute, because the element it
          // refers to no longer exists, so we should assume this sidebar
          // panel has been uninstalled. (249883)
          box.removeAttribute("sidebarcommand");
        }
      }
    }
  }

  // Certain kinds of automigration rely on this notification to complete their
  // tasks BEFORE the browser window is shown.
  Services.obs.notifyObservers(null, "browser-window-before-show", "");

  // Set a sane starting width/height for all resolutions on new profiles.
  if (!document.documentElement.hasAttribute("width")) {
    let defaultWidth = 994;
    let defaultHeight;
    if (screen.availHeight <= 600) {
      document.documentElement.setAttribute("sizemode", "maximized");
      defaultWidth = 610;
      defaultHeight = 450;
    }
    else {
      // Create a narrower window for large or wide-aspect displays, to suggest
      // side-by-side page view.
      if (screen.availWidth >= 1600)
        defaultWidth = (screen.availWidth / 2) - 20;
      defaultHeight = screen.availHeight - 10;
//@line 1297 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      // On X, we're not currently able to account for the size of the window
      // border.  Use 28px as a guess (titlebar + bottom window border)
      defaultHeight -= 28;
//@line 1301 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    }
    document.documentElement.setAttribute("width", defaultWidth);
    document.documentElement.setAttribute("height", defaultHeight);
  }

  if (!gShowPageResizers)
    document.getElementById("status-bar").setAttribute("hideresizer", "true");

  if (!window.toolbar.visible) {
    // adjust browser UI for popups
    if (gURLBar) {
      gURLBar.setAttribute("readonly", "true");
      gURLBar.setAttribute("enablehistory", "false");
    }
    goSetCommandEnabled("Browser:OpenLocation", false);
    goSetCommandEnabled("cmd_newNavigatorTab", false);
  }

//@line 1320 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  updateAppButtonDisplay();
//@line 1322 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  CombinedStopReload.init();

  allTabs.readPref();

  TabsOnTop.syncCommand();

  BookmarksMenuButton.init();

  TabsInTitlebar.init();

  gPrivateBrowsingUI.init();

  retrieveToolbarIconsizesFromTheme();

  setTimeout(delayedStartup, 0, isLoadingBlank, mustLoadSidebar);
}

function HandleAppCommandEvent(evt) {
  evt.stopPropagation();
  switch (evt.command) {
  case "Back":
    BrowserBack();
    break;
  case "Forward":
    BrowserForward();
    break;
  case "Reload":
    BrowserReloadSkipCache();
    break;
  case "Stop":
    BrowserStop();
    break;
  case "Search":
    BrowserSearch.webSearch();
    break;
  case "Bookmarks":
    toggleSidebar('viewBookmarksSidebar');
    break;
  case "Home":
    BrowserHome();
    break;
  default:
    break;
  }
}

function prepareForStartup() {
  gBrowser.addEventListener("DOMUpdatePageReport", gPopupBlockerObserver, false);

  gBrowser.addEventListener("PluginNotFound",     gPluginHandler, true);
  gBrowser.addEventListener("PluginCrashed",      gPluginHandler, true);
  gBrowser.addEventListener("PluginBlocklisted",  gPluginHandler, true);
  gBrowser.addEventListener("PluginOutdated",     gPluginHandler, true);
  gBrowser.addEventListener("PluginDisabled",     gPluginHandler, true);
  gBrowser.addEventListener("NewPluginInstalled", gPluginHandler.newPluginInstalled, true);
//@line 1381 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  Services.obs.addObserver(gPluginHandler.pluginCrashed, "plugin-crashed", false);

  window.addEventListener("AppCommand", HandleAppCommandEvent, true);

  var webNavigation;
  try {
    webNavigation = getWebNavigation();
    if (!webNavigation)
      throw "no XBL binding for browser";
  } catch (e) {
    alert("Error launching browser window:" + e);
    window.close(); // Give up.
    return;
  }

  // initialize observers and listeners
  // and give C++ access to gBrowser
  XULBrowserWindow.init();
  window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem).treeOwner
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIXULWindow)
        .XULBrowserWindow = window.XULBrowserWindow;
  window.QueryInterface(Ci.nsIDOMChromeWindow).browserDOMWindow =
    new nsBrowserAccess();

  // set default character set if provided
  if ("arguments" in window && window.arguments.length > 1 && window.arguments[1]) {
    if (window.arguments[1].indexOf("charset=") != -1) {
      var arrayArgComponents = window.arguments[1].split("=");
      if (arrayArgComponents) {
        //we should "inherit" the charset menu setting in a new window
        getMarkupDocumentViewer().defaultCharacterSet = arrayArgComponents[1];
      }
    }
  }

  // Manually hook up session and global history for the first browser
  // so that we don't have to load global history before bringing up a
  // window.
  // Wire up session and global history before any possible
  // progress notifications for back/forward button updating
  webNavigation.sessionHistory = Components.classes["@mozilla.org/browser/shistory;1"]
                                           .createInstance(Components.interfaces.nsISHistory);
  Services.obs.addObserver(gBrowser.browsers[0], "browser:purge-session-history", false);

  // remove the disablehistory attribute so the browser cleans up, as
  // though it had done this work itself
  gBrowser.browsers[0].removeAttribute("disablehistory");

  // enable global history
  try {
    gBrowser.docShell.QueryInterface(Components.interfaces.nsIDocShellHistory).useGlobalHistory = true;
  } catch(ex) {
    Components.utils.reportError("Places database may be locked: " + ex);
  }

  // hook up UI through progress listener
  gBrowser.addProgressListener(window.XULBrowserWindow, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
  gBrowser.addTabsProgressListener(window.TabsProgressListener);

  // setup our common DOMLinkAdded listener
  gBrowser.addEventListener("DOMLinkAdded", DOMLinkHandler, false);

  // setup our MozApplicationManifest listener
  gBrowser.addEventListener("MozApplicationManifest",
                            OfflineApps, false);

  // setup simple gestures support
  gGestureSupport.init(true);
}

function delayedStartup(isLoadingBlank, mustLoadSidebar) {
  Services.obs.addObserver(gSessionHistoryObserver, "browser:purge-session-history", false);
  Services.obs.addObserver(gXPInstallObserver, "addon-install-disabled", false);
  Services.obs.addObserver(gXPInstallObserver, "addon-install-started", false);
  Services.obs.addObserver(gXPInstallObserver, "addon-install-blocked", false);
  Services.obs.addObserver(gXPInstallObserver, "addon-install-failed", false);
  Services.obs.addObserver(gXPInstallObserver, "addon-install-complete", false);
  Services.obs.addObserver(gFormSubmitObserver, "invalidformsubmit", false);

  BrowserOffline.init();
  OfflineApps.init();
  IndexedDBPromptHelper.init();
  gFormSubmitObserver.init();
  AddonManager.addAddonListener(AddonsMgrListener);

  gBrowser.addEventListener("pageshow", function(evt) { setTimeout(pageShowEventHandlers, 0, evt); }, true);

  // Ensure login manager is up and running.
  Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);

  if (mustLoadSidebar) {
    let sidebar = document.getElementById("sidebar");
    let sidebarBox = document.getElementById("sidebar-box");
    sidebar.setAttribute("src", sidebarBox.getAttribute("src"));
  }

  UpdateUrlbarSearchSplitterState();

  if (isLoadingBlank && gURLBar && isElementVisible(gURLBar))
    gURLBar.focus();
  else
    gBrowser.selectedBrowser.focus();

  gNavToolbox.customizeDone = BrowserToolboxCustomizeDone;
  gNavToolbox.customizeChange = BrowserToolboxCustomizeChange;

  // Set up Sanitize Item
  initializeSanitizer();

  // Enable/Disable auto-hide tabbar
  gBrowser.tabContainer.updateVisibility();

  gPrefService.addObserver(gHomeButton.prefDomain, gHomeButton, false);

  var homeButton = document.getElementById("home-button");
  gHomeButton.updateTooltip(homeButton);
  gHomeButton.updatePersonalToolbarStyle(homeButton);

//@line 1504 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  // Perform default browser checking (after window opens).
  var shell = getShellService();
  if (shell) {
    var shouldCheck = shell.shouldCheckDefaultBrowser;
    var willRecoverSession = false;
    try {
      var ss = Cc["@mozilla.org/browser/sessionstartup;1"].
               getService(Ci.nsISessionStartup);
      willRecoverSession =
        (ss.sessionType == Ci.nsISessionStartup.RECOVER_SESSION);
    }
    catch (ex) { /* never mind; suppose SessionStore is broken */ }
    if (shouldCheck && !shell.isDefaultBrowser(true) && !willRecoverSession) {
      var brandBundle = document.getElementById("bundle_brand");
      var shellBundle = document.getElementById("bundle_shell");

      var brandShortName = brandBundle.getString("brandShortName");
      var promptTitle = shellBundle.getString("setDefaultBrowserTitle");
      var promptMessage = shellBundle.getFormattedString("setDefaultBrowserMessage",
                                                         [brandShortName]);
      var checkboxLabel = shellBundle.getFormattedString("setDefaultBrowserDontAsk",
                                                         [brandShortName]);
      var checkEveryTime = { value: shouldCheck };
      var ps = Services.prompt;
      var rv = ps.confirmEx(window, promptTitle, promptMessage,
                            ps.STD_YES_NO_BUTTONS,
                            null, null, null, checkboxLabel, checkEveryTime);
      if (rv == 0)
        shell.setDefaultBrowser(true, false);
      shell.shouldCheckDefaultBrowser = checkEveryTime.value;
    }
  }
//@line 1537 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  // BiDi UI
  gBidiUI = isBidiEnabled();
  if (gBidiUI) {
    document.getElementById("documentDirection-separator").hidden = false;
    document.getElementById("documentDirection-swap").hidden = false;
    document.getElementById("textfieldDirection-separator").hidden = false;
    document.getElementById("textfieldDirection-swap").hidden = false;
  }

  // Setup click-and-hold gestures access to the session history
  // menus if global click-and-hold isn't turned on
  if (!getBoolPref("ui.click_hold_context_menus", false))
    SetClickAndHoldHandlers();

  // Initialize the full zoom setting.
  // We do this before the session restore service gets initialized so we can
  // apply full zoom settings to tabs restored by the session restore service.
  try {
    FullZoom.init();
  }
  catch(ex) {
    Components.utils.reportError("Failed to init content pref service:\n" + ex);
  }

  let NP = {};
  Cu.import("resource:///modules/NetworkPrioritizer.jsm", NP);
  NP.trackBrowserWindow(window);

  // initialize the session-restore service (in case it's not already running)
  try {
    Cc["@mozilla.org/browser/sessionstore;1"]
      .getService(Ci.nsISessionStore)
      .init(window);
  } catch (ex) {
    dump("nsSessionStore could not be initialized: " + ex + "\n");
  }

  PlacesToolbarHelper.init();

  ctrlTab.readPref();
  gPrefService.addObserver(ctrlTab.prefName, ctrlTab, false);
  gPrefService.addObserver(allTabs.prefName, allTabs, false);

  // Initialize the microsummary service by retrieving it, prompting its factory
  // to create its singleton, whose constructor initializes the service.
  // Started 4 seconds after delayedStartup (before the livemarks service below).
  setTimeout(function() {
    try {
      Cc["@mozilla.org/microsummary/service;1"].getService(Ci.nsIMicrosummaryService);
    } catch (ex) {
      Components.utils.reportError("Failed to init microsummary service:\n" + ex);
    }
  }, 4000);

  // Delayed initialization of the livemarks update timer.
  // Livemark updates don't need to start until after bookmark UI
  // such as the toolbar has initialized. Starting 5 seconds after
  // delayedStartup in order to stagger this after the microsummary
  // service (see above) and before the download manager starts (see below).
  setTimeout(function() PlacesUtils.livemarks.start(), 5000);

  // Initialize the download manager some time after the app starts so that
  // auto-resume downloads begin (such as after crashing or quitting with
  // active downloads) and speeds up the first-load of the download manager UI.
  // If the user manually opens the download manager before the timeout, the
  // downloads will start right away, and getting the service again won't hurt.
  setTimeout(function() {
    gDownloadMgr = Cc["@mozilla.org/download-manager;1"].
                   getService(Ci.nsIDownloadManager);

    if (Win7Features) {
      let tempScope = {};
      Cu.import("resource://gre/modules/DownloadTaskbarProgress.jsm",
                tempScope);
      tempScope.DownloadTaskbarProgress.onBrowserWindowLoad(window);
    }
  }, 10000);

//@line 1617 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  updateEditUIVisibility();
  let placesContext = document.getElementById("placesContext");
  placesContext.addEventListener("popupshowing", updateEditUIVisibility, false);
  placesContext.addEventListener("popuphiding", updateEditUIVisibility, false);
//@line 1622 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  gBrowser.mPanelContainer.addEventListener("InstallBrowserTheme", LightWeightThemeWebInstaller, false, true);
  gBrowser.mPanelContainer.addEventListener("PreviewBrowserTheme", LightWeightThemeWebInstaller, false, true);
  gBrowser.mPanelContainer.addEventListener("ResetBrowserThemePreview", LightWeightThemeWebInstaller, false, true);

  if (Win7Features)
    Win7Features.onOpenWindow();

  // called when we go into full screen, even if it is
  // initiated by a web page script
  window.addEventListener("fullscreen", onFullScreen, true);
  if (window.fullScreen)
    onFullScreen();

//@line 1637 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  // initialize the sync UI
  gSyncUI.init();
//@line 1640 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  TabView.init();

  // Enable Inspector?
  let enabled = gPrefService.getBoolPref(InspectorUI.prefEnabledName);
  if (enabled) {
    document.getElementById("menu_pageinspect").hidden = false;
    document.getElementById("Tools:Inspect").removeAttribute("disabled");
//@line 1649 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    document.getElementById("appmenu_pageInspect").hidden = false;
//@line 1651 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  }

  // Enable Error Console?
  // XXX Temporarily always-enabled, see bug 601201
  let consoleEnabled = true || gPrefService.getBoolPref("devtools.errorconsole.enabled");
  if (consoleEnabled) {
    document.getElementById("javascriptConsole").hidden = false;
    document.getElementById("key_errorConsole").removeAttribute("disabled");
//@line 1660 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    document.getElementById("appmenu_errorConsole").hidden = false;
//@line 1662 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  }

//@line 1665 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  // If the user (or the locale) hasn't enabled the top-level "Character
  // Encoding" menu via the "browser.menu.showCharacterEncoding" preference,
  // hide it.
  if ("true" != gPrefService.getComplexValue("browser.menu.showCharacterEncoding",
                                             Ci.nsIPrefLocalizedString).data)
    document.getElementById("appmenu_charsetMenu").hidden = true;
//@line 1672 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  Services.obs.notifyObservers(window, "browser-delayed-startup-finished", "");
}

function BrowserShutdown()
{
  if (Win7Features)
    Win7Features.onCloseWindow();

  gPrefService.removeObserver(ctrlTab.prefName, ctrlTab);
  gPrefService.removeObserver(allTabs.prefName, allTabs);
  ctrlTab.uninit();
  allTabs.uninit();
  TabView.uninit();

  CombinedStopReload.uninit();

  gGestureSupport.init(false);

  FullScreen.cleanup();

  try {
    FullZoom.destroy();
  }
  catch(ex) {
    Components.utils.reportError(ex);
  }

  Services.obs.removeObserver(gSessionHistoryObserver, "browser:purge-session-history");
  Services.obs.removeObserver(gXPInstallObserver, "addon-install-disabled");
  Services.obs.removeObserver(gXPInstallObserver, "addon-install-started");
  Services.obs.removeObserver(gXPInstallObserver, "addon-install-blocked");
  Services.obs.removeObserver(gXPInstallObserver, "addon-install-failed");
  Services.obs.removeObserver(gXPInstallObserver, "addon-install-complete");
  Services.obs.removeObserver(gPluginHandler.pluginCrashed, "plugin-crashed");
  Services.obs.removeObserver(gFormSubmitObserver, "invalidformsubmit");

  try {
    gBrowser.removeProgressListener(window.XULBrowserWindow);
    gBrowser.removeTabsProgressListener(window.TabsProgressListener);
  } catch (ex) {
  }

  PlacesStarButton.uninit();

  try {
    gPrefService.removeObserver(gHomeButton.prefDomain, gHomeButton);
  } catch (ex) {
    Components.utils.reportError(ex);
  }

  BrowserOffline.uninit();
  OfflineApps.uninit();
  gPrivateBrowsingUI.uninit();
  IndexedDBPromptHelper.uninit();
  AddonManager.removeAddonListener(AddonsMgrListener);
  TabsInTitlebar.uninit();

  var enumerator = Services.wm.getEnumerator(null);
  enumerator.getNext();
  if (!enumerator.hasMoreElements()) {
    document.persist("sidebar-box", "sidebarcommand");
    document.persist("sidebar-box", "width");
    document.persist("sidebar-box", "src");
    document.persist("sidebar-title", "value");
  }

  window.XULBrowserWindow.destroy();
  window.XULBrowserWindow = null;
  window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIWebNavigation)
        .QueryInterface(Components.interfaces.nsIDocShellTreeItem).treeOwner
        .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIXULWindow)
        .XULBrowserWindow = null;
  window.QueryInterface(Ci.nsIDOMChromeWindow).browserDOMWindow = null;
}

//@line 1834 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

function initializeSanitizer()
{
  const kDidSanitizeDomain = "privacy.sanitize.didShutdownSanitize";
  if (gPrefService.prefHasUserValue(kDidSanitizeDomain)) {
    gPrefService.clearUserPref(kDidSanitizeDomain);
    // We need to persist this preference change, since we want to
    // check it at next app start even if the browser exits abruptly
    gPrefService.savePrefFile(null);
  }

  /**
   * Migrate Firefox 3.0 privacy.item prefs under one of these conditions:
   *
   * a) User has customized any privacy.item prefs
   * b) privacy.sanitize.sanitizeOnShutdown is set
   */
  if (!gPrefService.getBoolPref("privacy.sanitize.migrateFx3Prefs")) {
    let itemBranch = gPrefService.getBranch("privacy.item.");
    let itemArray = itemBranch.getChildList("");

    // See if any privacy.item prefs are set
    let doMigrate = itemArray.some(function (name) itemBranch.prefHasUserValue(name));
    // Or if sanitizeOnShutdown is set
    if (!doMigrate)
      doMigrate = gPrefService.getBoolPref("privacy.sanitize.sanitizeOnShutdown");

    if (doMigrate) {
      let cpdBranch = gPrefService.getBranch("privacy.cpd.");
      let clearOnShutdownBranch = gPrefService.getBranch("privacy.clearOnShutdown.");
      itemArray.forEach(function (name) {
        try {
          // don't migrate password or offlineApps clearing in the CRH dialog since
          // there's no UI for those anymore. They default to false. bug 497656
          if (name != "passwords" && name != "offlineApps")
            cpdBranch.setBoolPref(name, itemBranch.getBoolPref(name));
          clearOnShutdownBranch.setBoolPref(name, itemBranch.getBoolPref(name));
        }
        catch(e) {
          Cu.reportError("Exception thrown during privacy pref migration: " + e);
        }
      });
    }

    gPrefService.setBoolPref("privacy.sanitize.migrateFx3Prefs", true);
  }
}

function gotoHistoryIndex(aEvent) {
  let index = aEvent.target.getAttribute("index");
  if (!index)
    return false;

  let where = whereToOpenLink(aEvent);

  if (where == "current") {
    // Normal click. Go there in the current tab and update session history.

    try {
      gBrowser.gotoIndex(index);
    }
    catch(ex) {
      return false;
    }
    return true;
  }
  // Modified click. Go there in a new tab/window.

  duplicateTabIn(gBrowser.selectedTab, where, index - gBrowser.sessionHistory.index);
  return true;
}

function BrowserForward(aEvent) {
  let where = whereToOpenLink(aEvent, false, true);

  if (where == "current") {
    try {
      gBrowser.goForward();
    }
    catch(ex) {
    }
  }
  else {
    duplicateTabIn(gBrowser.selectedTab, where, 1);
  }
}

function BrowserBack(aEvent) {
  let where = whereToOpenLink(aEvent, false, true);

  if (where == "current") {
    try {
      gBrowser.goBack();
    }
    catch(ex) {
    }
  }
  else {
    duplicateTabIn(gBrowser.selectedTab, where, -1);
  }
}

function BrowserHandleBackspace()
{
  switch (gPrefService.getIntPref("browser.backspace_action")) {
  case 0:
    BrowserBack();
    break;
  case 1:
    goDoCommand("cmd_scrollPageUp");
    break;
  }
}

function BrowserHandleShiftBackspace()
{
  switch (gPrefService.getIntPref("browser.backspace_action")) {
  case 0:
    BrowserForward();
    break;
  case 1:
    goDoCommand("cmd_scrollPageDown");
    break;
  }
}

function BrowserStop()
{
  try {
    const stopFlags = nsIWebNavigation.STOP_ALL;
    getWebNavigation().stop(stopFlags);
  }
  catch(ex) {
  }
}

function BrowserReloadOrDuplicate(aEvent) {
  var backgroundTabModifier = aEvent.button == 1 ||
//@line 1975 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    aEvent.ctrlKey;
//@line 1977 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  if (aEvent.shiftKey && !backgroundTabModifier) {
    BrowserReloadSkipCache();
    return;
  }

  let where = whereToOpenLink(aEvent, false, true);
  if (where == "current")
    BrowserReload();
  else
    duplicateTabIn(gBrowser.selectedTab, where);
}

function BrowserReload() {
  const reloadFlags = nsIWebNavigation.LOAD_FLAGS_NONE;
  BrowserReloadWithFlags(reloadFlags);
}

function BrowserReloadSkipCache() {
  // Bypass proxy and cache.
  const reloadFlags = nsIWebNavigation.LOAD_FLAGS_BYPASS_PROXY | nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE;
  BrowserReloadWithFlags(reloadFlags);
}

var BrowserHome = BrowserGoHome;
function BrowserGoHome(aEvent) {
  if (aEvent && "button" in aEvent &&
      aEvent.button == 2) // right-click: do nothing
    return;

  var homePage = gHomeButton.getHomePage();
  var where = whereToOpenLink(aEvent, false, true);
  var urls;

  // Home page should open in a new tab when current tab is an app tab
  if (where == "current" &&
      gBrowser &&
      gBrowser.selectedTab.pinned)
    where = "tab";

  // openUILinkIn in utilityOverlay.js doesn't handle loading multiple pages
  switch (where) {
  case "current":
    loadOneOrMoreURIs(homePage);
    break;
  case "tabshifted":
  case "tab":
    urls = homePage.split("|");
    var loadInBackground = getBoolPref("browser.tabs.loadBookmarksInBackground", false);
    gBrowser.loadTabs(urls, loadInBackground);
    break;
  case "window":
    OpenBrowserWindow();
    break;
  }
}

function loadOneOrMoreURIs(aURIString)
{
//@line 2043 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  // This function throws for certain malformed URIs, so use exception handling
  // so that we don't disrupt startup
  try {
    gBrowser.loadTabs(aURIString.split("|"), false, true);
  }
  catch (e) {
  }
}

function focusAndSelectUrlBar() {
  if (gURLBar && !gURLBar.readOnly) {
    if (window.fullScreen)
      FullScreen.mouseoverToggle(true);
    if (isElementVisible(gURLBar)) {
      gURLBar.focus();
      gURLBar.select();
      return true;
    }
  }
  return false;
}

function openLocation() {
  if (focusAndSelectUrlBar())
    return;

//@line 2086 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  openDialog("chrome://browser/content/openLocation.xul", "_blank",
             "chrome,modal,titlebar", window);
}

function openLocationCallback()
{
  // make sure the DOM is ready
  setTimeout(function() { this.openLocation(); }, 0);
}

function BrowserOpenTab()
{
  if (!gBrowser) {
    // If there are no open browser windows, open a new one
    window.openDialog("chrome://browser/content/", "_blank",
                      "chrome,all,dialog=no", "about:blank");
    return;
  }
  gBrowser.loadOneTab("about:blank", {inBackground: false});
  focusAndSelectUrlBar();
}

/* Called from the openLocation dialog. This allows that dialog to instruct
   its opener to open a new window and then step completely out of the way.
   Anything less byzantine is causing horrible crashes, rather believably,
   though oddly only on Linux. */
function delayedOpenWindow(chrome, flags, href, postData)
{
  // The other way to use setTimeout,
  // setTimeout(openDialog, 10, chrome, "_blank", flags, url),
  // doesn't work here.  The extra "magic" extra argument setTimeout adds to
  // the callback function would confuse prepareForStartup() by making
  // window.arguments[1] be an integer instead of null.
  setTimeout(function() { openDialog(chrome, "_blank", flags, href, null, null, postData); }, 10);
}

/* Required because the tab needs time to set up its content viewers and get the load of
   the URI kicked off before becoming the active content area. */
function delayedOpenTab(aUrl, aReferrer, aCharset, aPostData, aAllowThirdPartyFixup)
{
  gBrowser.loadOneTab(aUrl, {
                      referrerURI: aReferrer,
                      charset: aCharset,
                      postData: aPostData,
                      inBackground: false,
                      allowThirdPartyFixup: aAllowThirdPartyFixup});
}

var gLastOpenDirectory = {
  _lastDir: null,
  get path() {
    if (!this._lastDir || !this._lastDir.exists()) {
      try {
        this._lastDir = gPrefService.getComplexValue("browser.open.lastDir",
                                                     Ci.nsILocalFile);
        if (!this._lastDir.exists())
          this._lastDir = null;
      }
      catch(e) {}
    }
    return this._lastDir;
  },
  set path(val) {
    if (!val || !val.exists() || !val.isDirectory())
      return;
    this._lastDir = val.clone();

    // Don't save the last open directory pref inside the Private Browsing mode
    if (!gPrivateBrowsingUI.privateBrowsingEnabled)
      gPrefService.setComplexValue("browser.open.lastDir", Ci.nsILocalFile,
                                   this._lastDir);
  },
  reset: function() {
    this._lastDir = null;
  }
};

function BrowserOpenFileWindow()
{
  // Get filepicker component.
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, gNavigatorBundle.getString("openFile"), nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText | nsIFilePicker.filterImages |
                     nsIFilePicker.filterXML | nsIFilePicker.filterHTML);
    fp.displayDirectory = gLastOpenDirectory.path;

    if (fp.show() == nsIFilePicker.returnOK) {
      if (fp.file && fp.file.exists())
        gLastOpenDirectory.path = fp.file.parent.QueryInterface(Ci.nsILocalFile);
      openTopWin(fp.fileURL.spec);
    }
  } catch (ex) {
  }
}

function BrowserCloseTabOrWindow() {
//@line 2191 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  // If the current tab is the last one, this will close the window.
  gBrowser.removeCurrentTab({animate: true});
}

function BrowserTryToCloseWindow()
{
  if (WindowIsClosing())
    window.close();     // WindowIsClosing does all the necessary checks
}

function loadURI(uri, referrer, postData, allowThirdPartyFixup)
{
  try {
    if (postData === undefined)
      postData = null;
    var flags = nsIWebNavigation.LOAD_FLAGS_NONE;
    if (allowThirdPartyFixup) {
      flags = nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP;
    }
    gBrowser.loadURIWithFlags(uri, flags, referrer, null, postData);
  } catch (e) {
  }
}

function getShortcutOrURI(aURL, aPostDataRef) {
  var shortcutURL = null;
  var keyword = aURL;
  var param = "";

  var offset = aURL.indexOf(" ");
  if (offset > 0) {
    keyword = aURL.substr(0, offset);
    param = aURL.substr(offset + 1);
  }

  if (!aPostDataRef)
    aPostDataRef = {};

  var engine = Services.search.getEngineByAlias(keyword);
  if (engine) {
    var submission = engine.getSubmission(param);
    aPostDataRef.value = submission.postData;
    return submission.uri.spec;
  }

  [shortcutURL, aPostDataRef.value] =
    PlacesUtils.getURLAndPostDataForKeyword(keyword);

  if (!shortcutURL)
    return aURL;

  var postData = "";
  if (aPostDataRef.value)
    postData = unescape(aPostDataRef.value);

  if (/%s/i.test(shortcutURL) || /%s/i.test(postData)) {
    var charset = "";
    const re = /^(.*)\&mozcharset=([a-zA-Z][_\-a-zA-Z0-9]+)\s*$/;
    var matches = shortcutURL.match(re);
    if (matches)
      [, shortcutURL, charset] = matches;
    else {
      // Try to get the saved character-set.
      try {
        // makeURI throws if URI is invalid.
        // Will return an empty string if character-set is not found.
        charset = PlacesUtils.history.getCharsetForURI(makeURI(shortcutURL));
      } catch (e) {}
    }

    var encodedParam = "";
    if (charset)
      encodedParam = escape(convertFromUnicode(charset, param));
    else // Default charset is UTF-8
      encodedParam = encodeURIComponent(param);

    shortcutURL = shortcutURL.replace(/%s/g, encodedParam).replace(/%S/g, param);

    if (/%s/i.test(postData)) // POST keyword
      aPostDataRef.value = getPostDataStream(postData, param, encodedParam,
                                             "application/x-www-form-urlencoded");
  }
  else if (param) {
    // This keyword doesn't take a parameter, but one was provided. Just return
    // the original URL.
    aPostDataRef.value = null;

    return aURL;
  }

  return shortcutURL;
}

function getPostDataStream(aStringData, aKeyword, aEncKeyword, aType) {
  var dataStream = Cc["@mozilla.org/io/string-input-stream;1"].
                   createInstance(Ci.nsIStringInputStream);
  aStringData = aStringData.replace(/%s/g, aEncKeyword).replace(/%S/g, aKeyword);
  dataStream.data = aStringData;

  var mimeStream = Cc["@mozilla.org/network/mime-input-stream;1"].
                   createInstance(Ci.nsIMIMEInputStream);
  mimeStream.addHeader("Content-Type", aType);
  mimeStream.addContentLength = true;
  mimeStream.setData(dataStream);
  return mimeStream.QueryInterface(Ci.nsIInputStream);
}

function readFromClipboard()
{
  var url;

  try {
    // Get clipboard.
    var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
                              .getService(Components.interfaces.nsIClipboard);

    // Create transferable that will transfer the text.
    var trans = Components.classes["@mozilla.org/widget/transferable;1"]
                          .createInstance(Components.interfaces.nsITransferable);

    trans.addDataFlavor("text/unicode");

    // If available, use selection clipboard, otherwise global one
    if (clipboard.supportsSelectionClipboard())
      clipboard.getData(trans, clipboard.kSelectionClipboard);
    else
      clipboard.getData(trans, clipboard.kGlobalClipboard);

    var data = {};
    var dataLen = {};
    trans.getTransferData("text/unicode", data, dataLen);

    if (data) {
      data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
      url = data.data.substring(0, dataLen.value / 2);
    }
  } catch (ex) {
  }

  return url;
}

function BrowserViewSourceOfDocument(aDocument)
{
  var pageCookie;
  var webNav;

  // Get the document charset
  var docCharset = "charset=" + aDocument.characterSet;

  // Get the nsIWebNavigation associated with the document
  try {
      var win;
      var ifRequestor;

      // Get the DOMWindow for the requested document.  If the DOMWindow
      // cannot be found, then just use the content window...
      //
      // XXX:  This is a bit of a hack...
      win = aDocument.defaultView;
      if (win == window) {
        win = content;
      }
      ifRequestor = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor);

      webNav = ifRequestor.getInterface(nsIWebNavigation);
  } catch(err) {
      // If nsIWebNavigation cannot be found, just get the one for the whole
      // window...
      webNav = getWebNavigation();
  }
  //
  // Get the 'PageDescriptor' for the current document. This allows the
  // view-source to access the cached copy of the content rather than
  // refetching it from the network...
  //
  try{
    var PageLoader = webNav.QueryInterface(Components.interfaces.nsIWebPageDescriptor);

    pageCookie = PageLoader.currentDescriptor;
  } catch(err) {
    // If no page descriptor is available, just use the view-source URL...
  }

  top.gViewSourceUtils.viewSource(webNav.currentURI.spec, pageCookie, aDocument);
}

// doc - document to use for source, or null for this window's document
// initialTab - name of the initial tab to display, or null for the first tab
// imageElement - image to load in the Media Tab of the Page Info window; can be null/omitted
function BrowserPageInfo(doc, initialTab, imageElement) {
  var args = {doc: doc, initialTab: initialTab, imageElement: imageElement};
  var windows = Cc['@mozilla.org/appshell/window-mediator;1']
                  .getService(Ci.nsIWindowMediator)
                  .getEnumerator("Browser:page-info");

  var documentURL = doc ? doc.location : window.content.document.location;

  // Check for windows matching the url
  while (windows.hasMoreElements()) {
    var currentWindow = windows.getNext();
    if (currentWindow.document.documentElement.getAttribute("relatedUrl") == documentURL) {
      currentWindow.focus();
      currentWindow.resetPageInfo(args);
      return currentWindow;
    }
  }

  // We didn't find a matching window, so open a new one.
  return openDialog("chrome://browser/content/pageinfo/pageInfo.xul", "",
                    "chrome,toolbar,dialog=no,resizable", args);
}

function URLBarSetURI(aURI) {
  var value = gBrowser.userTypedValue;
  var valid = false;

  if (value == null) {
    let uri = aURI || getWebNavigation().currentURI;

    // Replace initial page URIs with an empty string
    // only if there's no opener (bug 370555).
    if (gInitialPages.indexOf(uri.spec) != -1)
      value = content.opener ? uri.spec : "";
    else
      value = losslessDecodeURI(uri);

    valid = (uri.spec != "about:blank");
  }

  gURLBar.value = value;
  SetPageProxyState(valid ? "valid" : "invalid");
}

function losslessDecodeURI(aURI) {
  var value = aURI.spec;
  // Try to decode as UTF-8 if there's no encoding sequence that we would break.
  if (!/%25(?:3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/i.test(value))
    try {
      value = decodeURI(value)
                // 1. decodeURI decodes %25 to %, which creates unintended
                //    encoding sequences. Re-encode it, unless it's part of
                //    a sequence that survived decodeURI, i.e. one for:
                //    ';', '/', '?', ':', '@', '&', '=', '+', '$', ',', '#'
                //    (RFC 3987 section 3.2)
                // 2. Re-encode whitespace so that it doesn't get eaten away
                //    by the location bar (bug 410726).
                .replace(/%(?!3B|2F|3F|3A|40|26|3D|2B|24|2C|23)|[\r\n\t]/ig,
                         encodeURIComponent);
    } catch (e) {}

  // Encode invisible characters (line and paragraph separator,
  // object replacement character) (bug 452979)
  value = value.replace(/[\v\x0c\x1c\x1d\x1e\x1f\u2028\u2029\ufffc]/g,
                        encodeURIComponent);

  // Encode default ignorable characters (bug 546013)
  // except ZWNJ (U+200C) and ZWJ (U+200D) (bug 582186).
  // This includes all bidirectional formatting characters.
  // (RFC 3987 sections 3.2 and 4.1 paragraph 6)
  value = value.replace(/[\u00ad\u034f\u115f-\u1160\u17b4-\u17b5\u180b-\u180d\u200b\u200e-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufff8]|\ud834[\udd73-\udd7a]|[\udb40-\udb43][\udc00-\udfff]/g,
                        encodeURIComponent);
  return value;
}

function UpdateUrlbarSearchSplitterState()
{
  var splitter = document.getElementById("urlbar-search-splitter");
  var urlbar = document.getElementById("urlbar-container");
  var searchbar = document.getElementById("search-container");
  var stop = document.getElementById("stop-button");

  var ibefore = null;
  if (urlbar && searchbar) {
    if (urlbar.nextSibling == searchbar ||
        urlbar.getAttribute("combined") &&
        stop && stop.nextSibling == searchbar)
      ibefore = searchbar;
    else if (searchbar.nextSibling == urlbar)
      ibefore = urlbar;
  }

  if (ibefore) {
    if (!splitter) {
      splitter = document.createElement("splitter");
      splitter.id = "urlbar-search-splitter";
      splitter.setAttribute("resizebefore", "flex");
      splitter.setAttribute("resizeafter", "flex");
      splitter.className = "chromeclass-toolbar-additional";
    }
    urlbar.parentNode.insertBefore(splitter, ibefore);
  } else if (splitter)
    splitter.parentNode.removeChild(splitter);
}

var LocationBarHelpers = {
  _timeoutID: null,

  _searchBegin: function LocBar_searchBegin() {
    function delayedBegin(self) {
      self._timeoutID = null;
      document.getElementById("urlbar-throbber").setAttribute("busy", "true");
    }

    this._timeoutID = setTimeout(delayedBegin, 500, this);
  },

  _searchComplete: function LocBar_searchComplete() {
    // Did we finish the search before delayedBegin was invoked?
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
    document.getElementById("urlbar-throbber").removeAttribute("busy");
  }
};

function UpdatePageProxyState()
{
  if (gURLBar && gURLBar.value != gLastValidURLStr)
    SetPageProxyState("invalid");
}

function SetPageProxyState(aState)
{
  if (!gURLBar)
    return;

  if (!gProxyFavIcon)
    gProxyFavIcon = document.getElementById("page-proxy-favicon");

  gURLBar.setAttribute("pageproxystate", aState);
  gProxyFavIcon.setAttribute("pageproxystate", aState);

  // the page proxy state is set to valid via OnLocationChange, which
  // gets called when we switch tabs.
  if (aState == "valid") {
    gLastValidURLStr = gURLBar.value;
    gURLBar.addEventListener("input", UpdatePageProxyState, false);

    PageProxySetIcon(gBrowser.getIcon());
  } else if (aState == "invalid") {
    gURLBar.removeEventListener("input", UpdatePageProxyState, false);
    PageProxyClearIcon();
  }
}

function PageProxySetIcon (aURL)
{
  if (!gProxyFavIcon)
    return;

  if (!aURL)
    PageProxyClearIcon();
  else if (gProxyFavIcon.getAttribute("src") != aURL)
    gProxyFavIcon.setAttribute("src", aURL);
}

function PageProxyClearIcon ()
{
  gProxyFavIcon.removeAttribute("src");
}

function PageProxyClickHandler(aEvent)
{
  if (aEvent.button == 1 && gPrefService.getBoolPref("middlemouse.paste"))
    middleMousePaste(aEvent);
}

function BrowserImport()
{
//@line 2574 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  window.openDialog("chrome://browser/content/migration/migration.xul",
                    "migration", "modal,centerscreen,chrome,resizable=no");
//@line 2577 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
}

/**
 *  Handle load of some pages (about:*) so that we can make modifications
 *  to the DOM for unprivileged pages.
 */
function BrowserOnAboutPageLoad(document) {
  if (/^about:home$/i.test(document.documentURI)) {
    let ss = Components.classes["@mozilla.org/browser/sessionstore;1"].
             getService(Components.interfaces.nsISessionStore);
    if (!ss.canRestoreLastSession)
      document.getElementById("sessionRestoreContainer").hidden = true;
  }
}

/**
 * Handle command events bubbling up from error page content
 */
function BrowserOnClick(event) {
    // Don't trust synthetic events
    if (!event.isTrusted || event.target.localName != "button")
      return;

    var ot = event.originalTarget;
    var errorDoc = ot.ownerDocument;

    // If the event came from an ssl error page, it is probably either the "Add
    // Exception…" or "Get me out of here!" button
    if (/^about:certerror/.test(errorDoc.documentURI)) {
      if (ot == errorDoc.getElementById('exceptionDialogButton')) {
        var params = { exceptionAdded : false, handlePrivateBrowsing : true };

        try {
          switch (gPrefService.getIntPref("browser.ssl_override_behavior")) {
            case 2 : // Pre-fetch & pre-populate
              params.prefetchCert = true;
            case 1 : // Pre-populate
              params.location = errorDoc.location.href;
          }
        } catch (e) {
          Components.utils.reportError("Couldn't get ssl_override pref: " + e);
        }

        window.openDialog('chrome://pippki/content/exceptionDialog.xul',
                          '','chrome,centerscreen,modal', params);

        // If the user added the exception cert, attempt to reload the page
        if (params.exceptionAdded)
          errorDoc.location.reload();
      }
      else if (ot == errorDoc.getElementById('getMeOutOfHereButton')) {
        getMeOutOfHere();
      }
    }
    else if (/^about:blocked/.test(errorDoc.documentURI)) {
      // The event came from a button on a malware/phishing block page
      // First check whether it's malware or phishing, so that we can
      // use the right strings/links
      var isMalware = /e=malwareBlocked/.test(errorDoc.documentURI);

      if (ot == errorDoc.getElementById('getMeOutButton')) {
        getMeOutOfHere();
      }
      else if (ot == errorDoc.getElementById('reportButton')) {
        // This is the "Why is this site blocked" button.  For malware,
        // we can fetch a site-specific report, for phishing, we redirect
        // to the generic page describing phishing protection.

        if (isMalware) {
          // Get the stop badware "why is this blocked" report url,
          // append the current url, and go there.
          try {
            let reportURL = formatURL("browser.safebrowsing.malware.reportURL", true);
            reportURL += errorDoc.location.href;
            content.location = reportURL;
          } catch (e) {
            Components.utils.reportError("Couldn't get malware report URL: " + e);
          }
        }
        else { // It's a phishing site, not malware
          try {
            content.location = formatURL("browser.safebrowsing.warning.infoURL", true);
          } catch (e) {
            Components.utils.reportError("Couldn't get phishing info URL: " + e);
          }
        }
      }
      else if (ot == errorDoc.getElementById('ignoreWarningButton')) {
        // Allow users to override and continue through to the site,
        // but add a notify bar as a reminder, so that they don't lose
        // track after, e.g., tab switching.
        gBrowser.loadURIWithFlags(content.location.href,
                                  nsIWebNavigation.LOAD_FLAGS_BYPASS_CLASSIFIER,
                                  null, null, null);
        let buttons = [{
          label: gNavigatorBundle.getString("safebrowsing.getMeOutOfHereButton.label"),
          accessKey: gNavigatorBundle.getString("safebrowsing.getMeOutOfHereButton.accessKey"),
          callback: function() { getMeOutOfHere(); }
        }];

        let title;
        if (isMalware) {
          title = gNavigatorBundle.getString("safebrowsing.reportedAttackSite");
          buttons[1] = {
            label: gNavigatorBundle.getString("safebrowsing.notAnAttackButton.label"),
            accessKey: gNavigatorBundle.getString("safebrowsing.notAnAttackButton.accessKey"),
            callback: function() {
              openUILinkIn(safebrowsing.getReportURL('MalwareError'), 'tab');
            }
          };
        } else {
          title = gNavigatorBundle.getString("safebrowsing.reportedWebForgery");
          buttons[1] = {
            label: gNavigatorBundle.getString("safebrowsing.notAForgeryButton.label"),
            accessKey: gNavigatorBundle.getString("safebrowsing.notAForgeryButton.accessKey"),
            callback: function() {
              openUILinkIn(safebrowsing.getReportURL('Error'), 'tab');
            }
          };
        }

        let notificationBox = gBrowser.getNotificationBox();
        let value = "blocked-badware-page";

        let previousNotification = notificationBox.getNotificationWithValue(value);
        if (previousNotification)
          notificationBox.removeNotification(previousNotification);

        notificationBox.appendNotification(
          title,
          value,
          "chrome://global/skin/icons/blacklist_favicon.png",
          notificationBox.PRIORITY_CRITICAL_HIGH,
          buttons
        );
      }
    }
    else if (/^about:home$/i.test(errorDoc.documentURI)) {
      if (ot == errorDoc.getElementById("restorePreviousSession")) {
        let ss = Cc["@mozilla.org/browser/sessionstore;1"].
                 getService(Ci.nsISessionStore);
        if (ss.canRestoreLastSession)
          ss.restoreLastSession();
        errorDoc.getElementById("sessionRestoreContainer").hidden = true;
      }
    }
}

/**
 * Re-direct the browser to a known-safe page.  This function is
 * used when, for example, the user browses to a known malware page
 * and is presented with about:blocked.  The "Get me out of here!"
 * button should take the user to the default start page so that even
 * when their own homepage is infected, we can get them somewhere safe.
 */
function getMeOutOfHere() {
  // Get the start page from the *default* pref branch, not the user's
  var prefs = Cc["@mozilla.org/preferences-service;1"]
             .getService(Ci.nsIPrefService).getDefaultBranch(null);
  var url = "about:blank";
  try {
    url = prefs.getComplexValue("browser.startup.homepage",
                                Ci.nsIPrefLocalizedString).data;
    // If url is a pipe-delimited set of pages, just take the first one.
    if (url.indexOf("|") != -1)
      url = url.split("|")[0];
  } catch(e) {
    Components.utils.reportError("Couldn't get homepage pref: " + e);
  }
  content.location = url;
}

function BrowserFullScreen()
{
  window.fullScreen = !window.fullScreen;
}

function onFullScreen(event) {
  FullScreen.toggle(event);
}

function getWebNavigation()
{
  try {
    return gBrowser.webNavigation;
  } catch (e) {
    return null;
  }
}

function BrowserReloadWithFlags(reloadFlags) {
  /* First, we'll try to use the session history object to reload so
   * that framesets are handled properly. If we're in a special
   * window (such as view-source) that has no session history, fall
   * back on using the web navigation's reload method.
   */

  var webNav = getWebNavigation();
  try {
    var sh = webNav.sessionHistory;
    if (sh)
      webNav = sh.QueryInterface(nsIWebNavigation);
  } catch (e) {
  }

  try {
    webNav.reload(reloadFlags);
  } catch (e) {
  }
}

var PrintPreviewListener = {
  _printPreviewTab: null,
  _tabBeforePrintPreview: null,

  getPrintPreviewBrowser: function () {
    if (!this._printPreviewTab) {
      this._tabBeforePrintPreview = gBrowser.selectedTab;
      this._printPreviewTab = gBrowser.loadOneTab("about:blank",
                                                  { inBackground: false });
      gBrowser.selectedTab = this._printPreviewTab;
    }
    return gBrowser.getBrowserForTab(this._printPreviewTab);
  },
  getSourceBrowser: function () {
    return this._tabBeforePrintPreview ?
      this._tabBeforePrintPreview.linkedBrowser : gBrowser.selectedBrowser;
  },
  getNavToolbox: function () {
    return gNavToolbox;
  },
  onEnter: function () {
    gInPrintPreviewMode = true;
    this._toggleAffectedChrome();
  },
  onExit: function () {
    gBrowser.selectedTab = this._tabBeforePrintPreview;
    this._tabBeforePrintPreview = null;
    gInPrintPreviewMode = false;
    this._toggleAffectedChrome();
    gBrowser.removeTab(this._printPreviewTab);
    this._printPreviewTab = null;
  },
  _toggleAffectedChrome: function () {
    gNavToolbox.hidden = gInPrintPreviewMode;

    if (gInPrintPreviewMode)
      this._hideChrome();
    else
      this._showChrome();

    if (this._chromeState.sidebarOpen)
      toggleSidebar(this._sidebarCommand);

//@line 2832 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    updateAppButtonDisplay();
//@line 2834 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  },
  _hideChrome: function () {
    this._chromeState = {};

    var sidebar = document.getElementById("sidebar-box");
    this._chromeState.sidebarOpen = !sidebar.hidden;
    this._sidebarCommand = sidebar.getAttribute("sidebarcommand");

    var notificationBox = gBrowser.getNotificationBox();
    this._chromeState.notificationsOpen = !notificationBox.notificationsHidden;
    notificationBox.notificationsHidden = true;

    document.getElementById("sidebar").setAttribute("src", "about:blank");
    var addonBar = document.getElementById("addon-bar");
    this._chromeState.addonBarOpen = !addonBar.collapsed;
    addonBar.collapsed = true;
    gBrowser.updateWindowResizers();

    this._chromeState.findOpen = gFindBarInitialized && !gFindBar.hidden;
    if (gFindBarInitialized)
      gFindBar.close();

    this._chromeState.syncNotificationsOpen = false;
    var syncNotifications = document.getElementById("sync-notifications");
    if (syncNotifications) {
      this._chromeState.syncNotificationsOpen = !syncNotifications.notificationsHidden;
      syncNotifications.notificationsHidden = true;
    }
  },
  _showChrome: function () {
    if (this._chromeState.notificationsOpen)
      gBrowser.getNotificationBox().notificationsHidden = false;

    if (this._chromeState.addonBarOpen) {
      document.getElementById("addon-bar").collapsed = false;
      gBrowser.updateWindowResizers();
    }

    if (this._chromeState.findOpen)
      gFindBar.open();

    if (this._chromeState.syncNotificationsOpen)
      document.getElementById("sync-notifications").notificationsHidden = false;
  }
}

function getMarkupDocumentViewer()
{
  return gBrowser.markupDocumentViewer;
}

/**
 * Content area tooltip.
 * XXX - this must move into XBL binding/equiv! Do not want to pollute
 *       browser.js with functionality that can be encapsulated into
 *       browser widget. TEMPORARY!
 *
 * NOTE: Any changes to this routine need to be mirrored in DefaultTooltipTextProvider::GetNodeText()
 *       (located in mozilla/embedding/browser/webBrowser/nsDocShellTreeOwner.cpp)
 *       which performs the same function, but for embedded clients that
 *       don't use a XUL/JS layer. It is important that the logic of
 *       these two routines be kept more or less in sync.
 *       (pinkerton)
 **/
function FillInHTMLTooltip(tipElement)
{
  var retVal = false;
  // Don't show the tooltip if the tooltip node is a XUL element or a document.
  if (tipElement.namespaceURI == "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" ||
      !tipElement.ownerDocument)
    return retVal;

  const XLinkNS = "http://www.w3.org/1999/xlink";


  var titleText = null;
  var XLinkTitleText = null;
  var SVGTitleText = null;
//@line 2913 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  var lookingForSVGTitle = true;
//@line 2917 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  var direction = tipElement.ownerDocument.dir;

  // If the element is invalid per HTML5 Forms specifications and has no title,
  // show the constraint validation error message.
  if ((tipElement instanceof HTMLInputElement ||
       tipElement instanceof HTMLTextAreaElement ||
       tipElement instanceof HTMLSelectElement ||
       tipElement instanceof HTMLButtonElement) &&
      !tipElement.hasAttribute('title') &&
      (!tipElement.form || !tipElement.form.noValidate)) {
    // If the element is barred from constraint validation or valid,
    // the validation message will be the empty string.
    titleText = tipElement.validationMessage;
  }

  while (!titleText && !XLinkTitleText && !SVGTitleText && tipElement) {
    if (tipElement.nodeType == Node.ELEMENT_NODE) {
      titleText = tipElement.getAttribute("title");
      if ((tipElement instanceof HTMLAnchorElement && tipElement.href) ||
          (tipElement instanceof HTMLAreaElement && tipElement.href) ||
          (tipElement instanceof HTMLLinkElement && tipElement.href)
//@line 2939 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
          || (tipElement instanceof SVGAElement && tipElement.hasAttributeNS(XLinkNS, "href"))
//@line 2941 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
          ) {
        XLinkTitleText = tipElement.getAttributeNS(XLinkNS, "title");
      }
      if (lookingForSVGTitle &&
          !(tipElement instanceof SVGElement &&
            tipElement.parentNode instanceof SVGElement &&
            !(tipElement.parentNode instanceof SVGForeignObjectElement))) {
        lookingForSVGTitle = false;
      }
      if (lookingForSVGTitle) {
        let length = tipElement.childNodes.length;
        for (let i = 0; i < length; i++) {
          let childNode = tipElement.childNodes[i];
          if (childNode instanceof SVGTitleElement) {
            SVGTitleText = childNode.textContent;
            break;
          }
        }
      }
      var defView = tipElement.ownerDocument.defaultView;
      // XXX Work around bug 350679:
      // "Tooltips can be fired in documents with no view".
      if (!defView)
        return retVal;
      direction = defView.getComputedStyle(tipElement, "")
        .getPropertyValue("direction");
    }
    tipElement = tipElement.parentNode;
  }

  var tipNode = document.getElementById("aHTMLTooltip");
  tipNode.style.direction = direction;

  [titleText, XLinkTitleText, SVGTitleText].forEach(function (t) {
    if (t && /\S/.test(t)) {

      // Per HTML 4.01 6.2 (CDATA section), literal CRs and tabs should be
      // replaced with spaces, and LFs should be removed entirely.
      // XXX Bug 322270: We don't preserve the result of entities like &#13;,
      // which should result in a line break in the tooltip, because we can't
      // distinguish that from a literal character in the source by this point.
      t = t.replace(/[\r\t]/g, ' ');
      t = t.replace(/\n/g, '');

      tipNode.setAttribute("label", t);
      retVal = true;
    }
  });

  return retVal;
}

var browserDragAndDrop = {
  canDropLink: function (aEvent) Services.droppedLinkHandler.canDropLink(aEvent, true),

  dragOver: function (aEvent)
  {
    if (this.canDropLink(aEvent)) {
      aEvent.preventDefault();
    }
  },

  drop: function (aEvent, aName) Services.droppedLinkHandler.dropLink(aEvent, aName)
};

var homeButtonObserver = {
  onDrop: function (aEvent)
    {
      setTimeout(openHomeDialog, 0, browserDragAndDrop.drop(aEvent, { }));
    },

  onDragOver: function (aEvent)
    {
      browserDragAndDrop.dragOver(aEvent);
      aEvent.dropEffect = "link";
    },
  onDragExit: function (aEvent)
    {
    }
}

function openHomeDialog(aURL)
{
  var promptTitle = gNavigatorBundle.getString("droponhometitle");
  var promptMsg   = gNavigatorBundle.getString("droponhomemsg");
  var pressedVal  = Services.prompt.confirmEx(window, promptTitle, promptMsg,
                          Services.prompt.STD_YES_NO_BUTTONS,
                          null, null, null, null, {value:0});

  if (pressedVal == 0) {
    try {
      var str = Components.classes["@mozilla.org/supports-string;1"]
                          .createInstance(Components.interfaces.nsISupportsString);
      str.data = aURL;
      gPrefService.setComplexValue("browser.startup.homepage",
                                   Components.interfaces.nsISupportsString, str);
    } catch (ex) {
      dump("Failed to set the home page.\n"+ex+"\n");
    }
  }
}

var bookmarksButtonObserver = {
  onDrop: function (aEvent)
  {
    let name = { };
    let url = browserDragAndDrop.drop(aEvent, name);
    try {
      PlacesUIUtils.showMinimalAddBookmarkUI(makeURI(url), name);
    } catch(ex) { }
  },

  onDragOver: function (aEvent)
  {
    browserDragAndDrop.dragOver(aEvent);
    aEvent.dropEffect = "link";
  },

  onDragExit: function (aEvent)
  {
  }
}

var newTabButtonObserver = {
  onDragOver: function (aEvent)
  {
    browserDragAndDrop.dragOver(aEvent);
  },

  onDragExit: function (aEvent)
  {
  },

  onDrop: function (aEvent)
  {
    let url = browserDragAndDrop.drop(aEvent, { });
    var postData = {};
    url = getShortcutOrURI(url, postData);
    if (url) {
      // allow third-party services to fixup this URL
      openNewTabWith(url, null, postData.value, aEvent, true);
    }
  }
}

var newWindowButtonObserver = {
  onDragOver: function (aEvent)
  {
    browserDragAndDrop.dragOver(aEvent);
  },
  onDragExit: function (aEvent)
  {
  },
  onDrop: function (aEvent)
  {
    let url = browserDragAndDrop.drop(aEvent, { });
    var postData = {};
    url = getShortcutOrURI(url, postData);
    if (url) {
      // allow third-party services to fixup this URL
      openNewWindowWith(url, null, postData.value, true);
    }
  }
}

var DownloadsButtonDNDObserver = {
  onDragOver: function (aEvent)
  {
    var types = aEvent.dataTransfer.types;
    if (types.contains("text/x-moz-url") ||
        types.contains("text/uri-list") ||
        types.contains("text/plain"))
      aEvent.preventDefault();
  },

  onDragExit: function (aEvent)
  {
  },

  onDrop: function (aEvent)
  {
    let name = { };
    let url = browserDragAndDrop.drop(aEvent, name);
    if (url)
      saveURL(url, name, null, true, true);
  }
}

const DOMLinkHandler = {
  handleEvent: function (event) {
    switch (event.type) {
      case "DOMLinkAdded":
        this.onLinkAdded(event);
        break;
    }
  },
  onLinkAdded: function (event) {
    var link = event.originalTarget;
    var rel = link.rel && link.rel.toLowerCase();
    if (!link || !link.ownerDocument || !rel || !link.href)
      return;

    var feedAdded = false;
    var iconAdded = false;
    var searchAdded = false;
    var relStrings = rel.split(/\s+/);
    var rels = {};
    for (let i = 0; i < relStrings.length; i++)
      rels[relStrings[i]] = true;

    for (let relVal in rels) {
      switch (relVal) {
        case "feed":
        case "alternate":
          if (!feedAdded) {
            if (!rels.feed && rels.alternate && rels.stylesheet)
              break;

            if (isValidFeed(link, link.ownerDocument.nodePrincipal, rels.feed)) {
              FeedHandler.addFeed(link, link.ownerDocument);
              feedAdded = true;
            }
          }
          break;
        case "icon":
          if (!iconAdded) {
            if (!gPrefService.getBoolPref("browser.chrome.site_icons"))
              break;

            var targetDoc = link.ownerDocument;
            var uri = makeURI(link.href, targetDoc.characterSet);

            if (gBrowser.isFailedIcon(uri))
              break;

            // Verify that the load of this icon is legal.
            // Some error or special pages can load their favicon.
            // To be on the safe side, only allow chrome:// favicons.
            var isAllowedPage = [
              /^about:neterror\?/,
              /^about:blocked\?/,
              /^about:certerror\?/,
              /^about:home$/,
            ].some(function (re) re.test(targetDoc.documentURI));

            if (!isAllowedPage || !uri.schemeIs("chrome")) {
              var ssm = Cc["@mozilla.org/scriptsecuritymanager;1"].
                        getService(Ci.nsIScriptSecurityManager);
              try {
                ssm.checkLoadURIWithPrincipal(targetDoc.nodePrincipal, uri,
                                              Ci.nsIScriptSecurityManager.DISALLOW_SCRIPT);
              } catch(e) {
                break;
              }
            }

            try {
              var contentPolicy = Cc["@mozilla.org/layout/content-policy;1"].
                                  getService(Ci.nsIContentPolicy);
            } catch(e) {
              break; // Refuse to load if we can't do a security check.
            }

            // Security says okay, now ask content policy
            if (contentPolicy.shouldLoad(Ci.nsIContentPolicy.TYPE_IMAGE,
                                         uri, targetDoc.documentURIObject,
                                         link, link.type, null)
                                         != Ci.nsIContentPolicy.ACCEPT)
              break;

            var browserIndex = gBrowser.getBrowserIndexForDocument(targetDoc);
            // no browser? no favicon.
            if (browserIndex == -1)
              break;

            let tab = gBrowser.tabs[browserIndex];
            gBrowser.setIcon(tab, link.href);
            iconAdded = true;
          }
          break;
        case "search":
          if (!searchAdded) {
            var type = link.type && link.type.toLowerCase();
            type = type.replace(/^\s+|\s*(?:;.*)?$/g, "");

            if (type == "application/opensearchdescription+xml" && link.title &&
                /^(?:https?|ftp):/i.test(link.href) &&
                !gPrivateBrowsingUI.privateBrowsingEnabled) {
              var engine = { title: link.title, href: link.href };
              BrowserSearch.addEngine(engine, link.ownerDocument);
              searchAdded = true;
            }
          }
          break;
      }
    }
  }
}

const BrowserSearch = {
  addEngine: function(engine, targetDoc) {
    if (!this.searchBar)
      return;

    var browser = gBrowser.getBrowserForDocument(targetDoc);
    // ignore search engines from subframes (see bug 479408)
    if (!browser)
      return;

    // Check to see whether we've already added an engine with this title
    if (browser.engines) {
      if (browser.engines.some(function (e) e.title == engine.title))
        return;
    }

    // Append the URI and an appropriate title to the browser data.
    // Use documentURIObject in the check for shouldLoadFavIcon so that we
    // do the right thing with about:-style error pages.  Bug 453442
    var iconURL = null;
    if (gBrowser.shouldLoadFavIcon(targetDoc.documentURIObject))
      iconURL = targetDoc.documentURIObject.prePath + "/favicon.ico";

    var hidden = false;
    // If this engine (identified by title) is already in the list, add it
    // to the list of hidden engines rather than to the main list.
    // XXX This will need to be changed when engines are identified by URL;
    // see bug 335102.
    if (Services.search.getEngineByName(engine.title))
      hidden = true;

    var engines = (hidden ? browser.hiddenEngines : browser.engines) || [];

    engines.push({ uri: engine.href,
                   title: engine.title,
                   icon: iconURL });

    if (hidden)
      browser.hiddenEngines = engines;
    else
      browser.engines = engines;
  },

  /**
   * Gives focus to the search bar, if it is present on the toolbar, or loads
   * the default engine's search form otherwise. For Mac, opens a new window
   * or focuses an existing window, if necessary.
   */
  webSearch: function BrowserSearch_webSearch() {
//@line 3312 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    var searchBar = this.searchBar;
    if (searchBar && window.fullScreen)
      FullScreen.mouseoverToggle(true);

    if (isElementVisible(searchBar)) {
      searchBar.select();
      searchBar.focus();
    } else {
      openUILinkIn(Services.search.defaultEngine.searchForm, "current");
    }
  },

  /**
   * Loads a search results page, given a set of search terms. Uses the current
   * engine if the search bar is visible, or the default engine otherwise.
   *
   * @param searchText
   *        The search terms to use for the search.
   *
   * @param useNewTab
   *        Boolean indicating whether or not the search should load in a new
   *        tab.
   */
  loadSearch: function BrowserSearch_search(searchText, useNewTab) {
    var engine;

    // If the search bar is visible, use the current engine, otherwise, fall
    // back to the default engine.
    if (isElementVisible(this.searchBar))
      engine = Services.search.currentEngine;
    else
      engine = Services.search.defaultEngine;

    var submission = engine.getSubmission(searchText); // HTML response

    // getSubmission can return null if the engine doesn't have a URL
    // with a text/html response type.  This is unlikely (since
    // SearchService._addEngineToStore() should fail for such an engine),
    // but let's be on the safe side.
    if (!submission)
      return;

    if (useNewTab) {
      gBrowser.loadOneTab(submission.uri.spec, {
                          postData: submission.postData,
                          relatedToCurrent: true});
    } else
      loadURI(submission.uri.spec, null, submission.postData, false);
  },

  /**
   * Returns the search bar element if it is present in the toolbar, null otherwise.
   */
  get searchBar() {
    return document.getElementById("searchbar");
  },

  loadAddEngines: function BrowserSearch_loadAddEngines() {
    var newWindowPref = gPrefService.getIntPref("browser.link.open_newwindow");
    var where = newWindowPref == 3 ? "tab" : "window";
    var regionBundle = document.getElementById("bundle_browser_region");
    var searchEnginesURL = formatURL("browser.search.searchEnginesURL", true);
    openUILinkIn(searchEnginesURL, where);
  }
}

function FillHistoryMenu(aParent) {
  // Lazily add the hover listeners on first showing and never remove them
  if (!aParent.hasStatusListener) {
    // Show history item's uri in the status bar when hovering, and clear on exit
    aParent.addEventListener("DOMMenuItemActive", function(aEvent) {
      // Only the current page should have the checked attribute, so skip it
      if (!aEvent.target.hasAttribute("checked"))
        XULBrowserWindow.setOverLink(aEvent.target.getAttribute("uri"));
    }, false);
    aParent.addEventListener("DOMMenuItemInactive", function() {
      XULBrowserWindow.setOverLink("");
    }, false);

    aParent.hasStatusListener = true;
  }

  // Remove old entries if any
  var children = aParent.childNodes;
  for (var i = children.length - 1; i >= 0; --i) {
    if (children[i].hasAttribute("index"))
      aParent.removeChild(children[i]);
  }

  var webNav = getWebNavigation();
  var sessionHistory = webNav.sessionHistory;

  var count = sessionHistory.count;
  if (count <= 1) // don't display the popup for a single item
    return false;

  const MAX_HISTORY_MENU_ITEMS = 15;
  var index = sessionHistory.index;
  var half_length = Math.floor(MAX_HISTORY_MENU_ITEMS / 2);
  var start = Math.max(index - half_length, 0);
  var end = Math.min(start == 0 ? MAX_HISTORY_MENU_ITEMS : index + half_length + 1, count);
  if (end == count)
    start = Math.max(count - MAX_HISTORY_MENU_ITEMS, 0);

  var tooltipBack = gNavigatorBundle.getString("tabHistory.goBack");
  var tooltipCurrent = gNavigatorBundle.getString("tabHistory.current");
  var tooltipForward = gNavigatorBundle.getString("tabHistory.goForward");

  for (var j = end - 1; j >= start; j--) {
    let item = document.createElement("menuitem");
    let entry = sessionHistory.getEntryAtIndex(j, false);
    let uri = entry.URI.spec;

    item.setAttribute("uri", uri);
    item.setAttribute("label", entry.title || uri);
    item.setAttribute("index", j);

    if (j != index) {
      try {
        let iconURL = Cc["@mozilla.org/browser/favicon-service;1"]
                         .getService(Ci.nsIFaviconService)
                         .getFaviconForPage(entry.URI).spec;
        item.style.listStyleImage = "url(" + iconURL + ")";
      } catch (ex) {}
    }

    if (j < index) {
      item.className = "unified-nav-back menuitem-iconic menuitem-with-favicon";
      item.setAttribute("tooltiptext", tooltipBack);
    } else if (j == index) {
      item.setAttribute("type", "radio");
      item.setAttribute("checked", "true");
      item.className = "unified-nav-current";
      item.setAttribute("tooltiptext", tooltipCurrent);
    } else {
      item.className = "unified-nav-forward menuitem-iconic menuitem-with-favicon";
      item.setAttribute("tooltiptext", tooltipForward);
    }

    aParent.appendChild(item);
  }
  return true;
}

function addToUrlbarHistory(aUrlToAdd) {
  if (aUrlToAdd &&
      aUrlToAdd.indexOf(" ") == -1 &&
      !/[\x00-\x1F]/.test(aUrlToAdd))
    PlacesUIUtils.markPageAsTyped(aUrlToAdd);
}

function toJavaScriptConsole()
{
  toOpenWindowByType("global:console", "chrome://global/content/console.xul");
}

function BrowserDownloadsUI()
{
  Cc["@mozilla.org/download-manager-ui;1"].
  getService(Ci.nsIDownloadManagerUI).show(window);
}

function toOpenWindowByType(inType, uri, features)
{
  var topWindow = Services.wm.getMostRecentWindow(inType);

  if (topWindow)
    topWindow.focus();
  else if (features)
    window.open(uri, "_blank", features);
  else
    window.open(uri, "_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
}

function OpenBrowserWindow()
{
  var charsetArg = new String();
  var handler = Components.classes["@mozilla.org/browser/clh;1"]
                          .getService(Components.interfaces.nsIBrowserHandler);
  var defaultArgs = handler.defaultArgs;
  var wintype = document.documentElement.getAttribute('windowtype');

  // if and only if the current window is a browser window and it has a document with a character
  // set, then extract the current charset menu setting from the current document and use it to
  // initialize the new browser window...
  var win;
  if (window && (wintype == "navigator:browser") && window.content && window.content.document)
  {
    var DocCharset = window.content.document.characterSet;
    charsetArg = "charset="+DocCharset;

    //we should "inherit" the charset menu setting in a new window
    win = window.openDialog("chrome://browser/content/", "_blank", "chrome,all,dialog=no", defaultArgs, charsetArg);
  }
  else // forget about the charset information.
  {
    win = window.openDialog("chrome://browser/content/", "_blank", "chrome,all,dialog=no", defaultArgs);
  }

  return win;
}

var gCustomizeSheet = false;
// Returns a reference to the window in which the toolbar
// customization document is loaded.
function BrowserCustomizeToolbar()
{
  // Disable the toolbar context menu items
  var menubar = document.getElementById("main-menubar");
  for (var i = 0; i < menubar.childNodes.length; ++i)
    menubar.childNodes[i].setAttribute("disabled", true);

  var cmd = document.getElementById("cmd_CustomizeToolbars");
  cmd.setAttribute("disabled", "true");

  var splitter = document.getElementById("urlbar-search-splitter");
  if (splitter)
    splitter.parentNode.removeChild(splitter);

  CombinedStopReload.uninit();

  PlacesToolbarHelper.customizeStart();
  BookmarksMenuButton.customizeStart();

  TabsInTitlebar.allowedBy("customizing-toolbars", false);

  var customizeURL = "chrome://global/content/customizeToolbar.xul";
  gCustomizeSheet = getBoolPref("toolbar.customization.usesheet", false);

  if (gCustomizeSheet) {
    var sheetFrame = document.getElementById("customizeToolbarSheetIFrame");
    var panel = document.getElementById("customizeToolbarSheetPopup");
    sheetFrame.hidden = false;
    sheetFrame.toolbox = gNavToolbox;
    sheetFrame.panel = panel;

    // The document might not have been loaded yet, if this is the first time.
    // If it is already loaded, reload it so that the onload initialization code
    // re-runs.
    if (sheetFrame.getAttribute("src") == customizeURL)
      sheetFrame.contentWindow.location.reload()
    else
      sheetFrame.setAttribute("src", customizeURL);

    // Open the panel, but make it invisible until the iframe has loaded so
    // that the user doesn't see a white flash.
    panel.style.visibility = "hidden";
    gNavToolbox.addEventListener("beforecustomization", function () {
      gNavToolbox.removeEventListener("beforecustomization", arguments.callee, false);
      panel.style.removeProperty("visibility");
    }, false);
    panel.openPopup(gNavToolbox, "after_start", 0, 0);
    return sheetFrame.contentWindow;
  } else {
    return window.openDialog(customizeURL,
                             "CustomizeToolbar",
                             "chrome,titlebar,toolbar,location,resizable,dependent",
                             gNavToolbox);
  }
}

function BrowserToolboxCustomizeDone(aToolboxChanged) {
  if (gCustomizeSheet) {
    document.getElementById("customizeToolbarSheetIFrame").hidden = true;
    document.getElementById("customizeToolbarSheetPopup").hidePopup();
  }

  // Update global UI elements that may have been added or removed
  if (aToolboxChanged) {
    gURLBar = document.getElementById("urlbar");

    gProxyFavIcon = document.getElementById("page-proxy-favicon");
    gHomeButton.updateTooltip();
    gIdentityHandler._cacheElements();
    window.XULBrowserWindow.init();

//@line 3589 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    updateEditUIVisibility();
//@line 3591 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

    // Hacky: update the PopupNotifications' object's reference to the iconBox,
    // if it already exists, since it may have changed if the URL bar was
    // added/removed.
    if (!__lookupGetter__("PopupNotifications"))
      PopupNotifications.iconBox = document.getElementById("notification-popup-box");
  }

  PlacesToolbarHelper.customizeDone();
  BookmarksMenuButton.customizeDone();

  // The url bar splitter state is dependent on whether stop/reload
  // and the location bar are combined, so we need this ordering
  CombinedStopReload.init();
  UpdateUrlbarSearchSplitterState();

  // Update the urlbar
  if (gURLBar) {
    URLBarSetURI();
    XULBrowserWindow.asyncUpdateUI();
    PlacesStarButton.updateState();
  }

  TabsInTitlebar.allowedBy("customizing-toolbars", true);

  // Re-enable parts of the UI we disabled during the dialog
  var menubar = document.getElementById("main-menubar");
  for (var i = 0; i < menubar.childNodes.length; ++i)
    menubar.childNodes[i].setAttribute("disabled", false);
  var cmd = document.getElementById("cmd_CustomizeToolbars");
  cmd.removeAttribute("disabled");

  // make sure to re-enable click-and-hold
  if (!getBoolPref("ui.click_hold_context_menus", false))
    SetClickAndHoldHandlers();

  window.content.focus();
}

function BrowserToolboxCustomizeChange(aType) {
  switch (aType) {
    case "iconsize":
    case "mode":
      retrieveToolbarIconsizesFromTheme();
      break;
    default:
      gHomeButton.updatePersonalToolbarStyle();
      BookmarksMenuButton.customizeChange();
      allTabs.readPref();
  }
}

/**
 * Allows themes to override the "iconsize" attribute on toolbars.
 */
function retrieveToolbarIconsizesFromTheme() {
  function retrieveToolbarIconsize(aToolbar) {
    if (aToolbar.localName != "toolbar")
      return;

    // The theme indicates that it wants to override the "iconsize" attribute
    // by specifying a special value for the "counter-reset" property on the
    // toolbar. A custom property cannot be used because getComputedStyle can
    // only return the values of standard CSS properties.
    let counterReset = getComputedStyle(aToolbar).counterReset;
    if (counterReset == "smallicons 0")
      aToolbar.setAttribute("iconsize", "small");
    else if (counterReset == "largeicons 0")
      aToolbar.setAttribute("iconsize", "large");
  }

  Array.forEach(gNavToolbox.childNodes, retrieveToolbarIconsize);
  gNavToolbox.externalToolbars.forEach(retrieveToolbarIconsize);
}

/**
 * Update the global flag that tracks whether or not any edit UI (the Edit menu,
 * edit-related items in the context menu, and edit-related toolbar buttons
 * is visible, then update the edit commands' enabled state accordingly.  We use
 * this flag to skip updating the edit commands on focus or selection changes
 * when no UI is visible to improve performance (including pageload performance,
 * since focus changes when you load a new page).
 *
 * If UI is visible, we use goUpdateGlobalEditMenuItems to set the commands'
 * enabled state so the UI will reflect it appropriately.
 *
 * If the UI isn't visible, we enable all edit commands so keyboard shortcuts
 * still work and just lazily disable them as needed when the user presses a
 * shortcut.
 *
 * This doesn't work on Mac, since Mac menus flash when users press their
 * keyboard shortcuts, so edit UI is essentially always visible on the Mac,
 * and we need to always update the edit commands.  Thus on Mac this function
 * is a no op.
 */
function updateEditUIVisibility()
{
//@line 3689 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  let editMenuPopupState = document.getElementById("menu_EditPopup").state;
  let contextMenuPopupState = document.getElementById("contentAreaContextMenu").state;
  let placesContextMenuPopupState = document.getElementById("placesContext").state;
//@line 3693 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  let appMenuPopupState = document.getElementById("appmenu-popup").state;
//@line 3695 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  // The UI is visible if the Edit menu is opening or open, if the context menu
  // is open, or if the toolbar has been customized to include the Cut, Copy,
  // or Paste toolbar buttons.
  gEditUIVisible = editMenuPopupState == "showing" ||
                   editMenuPopupState == "open" ||
                   contextMenuPopupState == "showing" ||
                   contextMenuPopupState == "open" ||
                   placesContextMenuPopupState == "showing" ||
                   placesContextMenuPopupState == "open" ||
//@line 3706 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
                   appMenuPopupState == "showing" ||
                   appMenuPopupState == "open" ||
//@line 3709 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
                   document.getElementById("cut-button") ||
                   document.getElementById("copy-button") ||
                   document.getElementById("paste-button") ? true : false;

  // If UI is visible, update the edit commands' enabled state to reflect
  // whether or not they are actually enabled for the current focus/selection.
  if (gEditUIVisible)
    goUpdateGlobalEditMenuItems();

  // Otherwise, enable all commands, so that keyboard shortcuts still work,
  // then lazily determine their actual enabled state when the user presses
  // a keyboard shortcut.
  else {
    goSetCommandEnabled("cmd_undo", true);
    goSetCommandEnabled("cmd_redo", true);
    goSetCommandEnabled("cmd_cut", true);
    goSetCommandEnabled("cmd_copy", true);
    goSetCommandEnabled("cmd_paste", true);
    goSetCommandEnabled("cmd_selectAll", true);
    goSetCommandEnabled("cmd_delete", true);
    goSetCommandEnabled("cmd_switchTextDirection", true);
  }
//@line 3732 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
}

var FullScreen = {
  _XULNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
  toggle: function (event) {
    var enterFS = window.fullScreen;

    // We get the fullscreen event _before_ the window transitions into or out of FS mode.
    if (event && event.type == "fullscreen")
      enterFS = !enterFS;

    // show/hide all menubars, toolbars (except the full screen toolbar)
    this.showXULChrome("toolbar", !enterFS);
    document.getElementById("View:FullScreen").setAttribute("checked", enterFS);

    if (enterFS) {
      // Add a tiny toolbar to receive mouseover and dragenter events, and provide affordance.
      // This will help simulate the "collapse" metaphor while also requiring less code and
      // events than raw listening of mouse coords.
      let fullScrToggler = document.getElementById("fullscr-toggler");
      if (!fullScrToggler) {
        fullScrToggler = document.createElement("hbox");
        fullScrToggler.id = "fullscr-toggler";
        fullScrToggler.collapsed = true;
        gNavToolbox.parentNode.insertBefore(fullScrToggler, gNavToolbox.nextSibling);
      }
      fullScrToggler.addEventListener("mouseover", this._expandCallback, false);
      fullScrToggler.addEventListener("dragenter", this._expandCallback, false);

      if (gPrefService.getBoolPref("browser.fullscreen.autohide"))
        gBrowser.mPanelContainer.addEventListener("mousemove",
                                                  this._collapseCallback, false);

      document.addEventListener("keypress", this._keyToggleCallback, false);
      document.addEventListener("popupshown", this._setPopupOpen, false);
      document.addEventListener("popuphidden", this._setPopupOpen, false);
      this._shouldAnimate = true;
      this.mouseoverToggle(false);

      // Autohide prefs
      gPrefService.addObserver("browser.fullscreen", this, false);
    }
    else {
      // The user may quit fullscreen during an animation
      clearInterval(this._animationInterval);
      clearTimeout(this._animationTimeout);
      gNavToolbox.style.marginTop = "";
      if (this._isChromeCollapsed)
        this.mouseoverToggle(true);
      this._isAnimating = false;
      // This is needed if they use the context menu to quit fullscreen
      this._isPopupOpen = false;

      this.cleanup();
    }
  },

  cleanup: function () {
    if (window.fullScreen) {
      gBrowser.mPanelContainer.removeEventListener("mousemove",
                                                   this._collapseCallback, false);
      document.removeEventListener("keypress", this._keyToggleCallback, false);
      document.removeEventListener("popupshown", this._setPopupOpen, false);
      document.removeEventListener("popuphidden", this._setPopupOpen, false);
      gPrefService.removeObserver("browser.fullscreen", this);

      let fullScrToggler = document.getElementById("fullscr-toggler");
      if (fullScrToggler) {
        fullScrToggler.removeEventListener("mouseover", this._expandCallback, false);
        fullScrToggler.removeEventListener("dragenter", this._expandCallback, false);
      }
    }
  },

  observe: function(aSubject, aTopic, aData)
  {
    if (aData == "browser.fullscreen.autohide") {
      if (gPrefService.getBoolPref("browser.fullscreen.autohide")) {
        gBrowser.mPanelContainer.addEventListener("mousemove",
                                                  this._collapseCallback, false);
      }
      else {
        gBrowser.mPanelContainer.removeEventListener("mousemove",
                                                     this._collapseCallback, false);
      }
    }
  },

  // Event callbacks
  _expandCallback: function()
  {
    FullScreen.mouseoverToggle(true);
  },
  _collapseCallback: function()
  {
    FullScreen.mouseoverToggle(false);
  },
  _keyToggleCallback: function(aEvent)
  {
    // if we can use the keyboard (eg Ctrl+L or Ctrl+E) to open the toolbars, we
    // should provide a way to collapse them too.
    if (aEvent.keyCode == aEvent.DOM_VK_ESCAPE) {
      FullScreen._shouldAnimate = false;
      FullScreen.mouseoverToggle(false, true);
    }
    // F6 is another shortcut to the address bar, but its not covered in OpenLocation()
    else if (aEvent.keyCode == aEvent.DOM_VK_F6)
      FullScreen.mouseoverToggle(true);
  },

  // Checks whether we are allowed to collapse the chrome
  _isPopupOpen: false,
  _isChromeCollapsed: false,
  _safeToCollapse: function(forceHide)
  {
    if (!gPrefService.getBoolPref("browser.fullscreen.autohide"))
      return false;

    // a popup menu is open in chrome: don't collapse chrome
    if (!forceHide && this._isPopupOpen)
      return false;

    // a textbox in chrome is focused (location bar anyone?): don't collapse chrome
    if (document.commandDispatcher.focusedElement &&
        document.commandDispatcher.focusedElement.ownerDocument == document &&
        document.commandDispatcher.focusedElement.localName == "input") {
      if (forceHide)
        // hidden textboxes that still have focus are bad bad bad
        document.commandDispatcher.focusedElement.blur();
      else
        return false;
    }
    return true;
  },

  _setPopupOpen: function(aEvent)
  {
    // Popups should only veto chrome collapsing if they were opened when the chrome was not collapsed.
    // Otherwise, they would not affect chrome and the user would expect the chrome to go away.
    // e.g. we wouldn't want the autoscroll icon firing this event, so when the user
    // toggles chrome when moving mouse to the top, it doesn't go away again.
    if (aEvent.type == "popupshown" && !FullScreen._isChromeCollapsed &&
        aEvent.target.localName != "tooltip" && aEvent.target.localName != "window")
      FullScreen._isPopupOpen = true;
    else if (aEvent.type == "popuphidden" && aEvent.target.localName != "tooltip" &&
             aEvent.target.localName != "window")
      FullScreen._isPopupOpen = false;
  },

  // Autohide helpers for the context menu item
  getAutohide: function(aItem)
  {
    aItem.setAttribute("checked", gPrefService.getBoolPref("browser.fullscreen.autohide"));
  },
  setAutohide: function()
  {
    gPrefService.setBoolPref("browser.fullscreen.autohide", !gPrefService.getBoolPref("browser.fullscreen.autohide"));
  },

  // Animate the toolbars disappearing
  _shouldAnimate: true,
  _isAnimating: false,
  _animationTimeout: null,
  _animationInterval: null,
  _animateUp: function()
  {
    // check again, the user may have done something before the animation was due to start
    if (!window.fullScreen || !FullScreen._safeToCollapse(false)) {
      FullScreen._isAnimating = false;
      FullScreen._shouldAnimate = true;
      return;
    }

    var animateFrameAmount = 2;
    function animateUpFrame() {
      animateFrameAmount *= 2;
      if (animateFrameAmount >= gNavToolbox.boxObject.height) {
        // We've animated enough
        clearInterval(FullScreen._animationInterval);
        gNavToolbox.style.marginTop = "";
        FullScreen._isAnimating = false;
        FullScreen._shouldAnimate = false; // Just to make sure
        FullScreen.mouseoverToggle(false);
        return;
      }
      gNavToolbox.style.marginTop = (animateFrameAmount * -1) + "px";
    }

    FullScreen._animationInterval = setInterval(animateUpFrame, 70);
  },

  mouseoverToggle: function(aShow, forceHide)
  {
    // Don't do anything if:
    // a) we're already in the state we want,
    // b) we're animating and will become collapsed soon, or
    // c) we can't collapse because it would be undesirable right now
    if (aShow != this._isChromeCollapsed || (!aShow && this._isAnimating) ||
        (!aShow && !this._safeToCollapse(forceHide)))
      return;

    // browser.fullscreen.animateUp
    // 0 - never animate up
    // 1 - animate only for first collapse after entering fullscreen (default for perf's sake)
    // 2 - animate every time it collapses
    if (gPrefService.getIntPref("browser.fullscreen.animateUp") == 0)
      this._shouldAnimate = false;

    if (!aShow && this._shouldAnimate) {
      this._isAnimating = true;
      this._shouldAnimate = false;
      this._animationTimeout = setTimeout(this._animateUp, 800);
      return;
    }

    // The chrome is collapsed so don't spam needless mousemove events
    if (aShow) {
      gBrowser.mPanelContainer.addEventListener("mousemove",
                                                this._collapseCallback, false);
    }
    else {
      gBrowser.mPanelContainer.removeEventListener("mousemove",
                                                   this._collapseCallback, false);
    }

    // Hiding/collapsing the toolbox interferes with the tab bar's scrollbox,
    // so we just move it off-screen instead. See bug 430687.
    gNavToolbox.style.marginTop =
      aShow ? "" : -gNavToolbox.getBoundingClientRect().height + "px";

    document.getElementById("fullscr-toggler").collapsed = aShow;
    this._isChromeCollapsed = !aShow;
    if (gPrefService.getIntPref("browser.fullscreen.animateUp") == 2)
      this._shouldAnimate = true;
  },

  showXULChrome: function(aTag, aShow)
  {
    var els = document.getElementsByTagNameNS(this._XULNS, aTag);

    for (var i = 0; i < els.length; ++i) {
      // XXX don't interfere with previously collapsed toolbars
      if (els[i].getAttribute("fullscreentoolbar") == "true") {
        if (!aShow) {

          var toolbarMode = els[i].getAttribute("mode");
          if (toolbarMode != "text") {
            els[i].setAttribute("saved-mode", toolbarMode);
            els[i].setAttribute("saved-iconsize",
                                els[i].getAttribute("iconsize"));
            els[i].setAttribute("mode", "icons");
            els[i].setAttribute("iconsize", "small");
          }

          // Give the main nav bar and the tab bar the fullscreen context menu,
          // otherwise remove context menu to prevent breakage
          els[i].setAttribute("saved-context",
                              els[i].getAttribute("context"));
          if (els[i].id == "nav-bar" || els[i].id == "TabsToolbar")
            els[i].setAttribute("context", "autohide-context");
          else
            els[i].removeAttribute("context");

          // Set the inFullscreen attribute to allow specific styling
          // in fullscreen mode
          els[i].setAttribute("inFullscreen", true);
        }
        else {
          function restoreAttr(attrName) {
            var savedAttr = "saved-" + attrName;
            if (els[i].hasAttribute(savedAttr)) {
              els[i].setAttribute(attrName, els[i].getAttribute(savedAttr));
              els[i].removeAttribute(savedAttr);
            }
          }

          restoreAttr("mode");
          restoreAttr("iconsize");
          restoreAttr("context");

          els[i].removeAttribute("inFullscreen");
        }
      } else {
        // use moz-collapsed so it doesn't persist hidden/collapsed,
        // so that new windows don't have missing toolbars
        if (aShow)
          els[i].removeAttribute("moz-collapsed");
        else
          els[i].setAttribute("moz-collapsed", "true");
      }
    }

    if (aShow) {
      gNavToolbox.removeAttribute("inFullscreen");
      document.documentElement.removeAttribute("inFullscreen");
    } else {
      gNavToolbox.setAttribute("inFullscreen", true);
      document.documentElement.setAttribute("inFullscreen", true);
    }

    // In tabs-on-top mode, move window controls to the tab bar,
    // and in tabs-on-bottom mode, move them back to the navigation toolbar.
    // When there is a chance the tab bar may be collapsed, put window
    // controls on nav bar.
    var fullscreenflex = document.getElementById("fullscreenflex");
    var fullscreenctls = document.getElementById("window-controls");
    var ctlsOnTabbar = TabsOnTop.enabled &&
                       !gPrefService.getBoolPref("browser.tabs.autoHide");
    if (fullscreenctls.parentNode.id == "nav-bar" && ctlsOnTabbar) {
      document.getElementById("TabsToolbar").appendChild(fullscreenctls);
      // we don't need this space in tabs-on-top mode, so prevent it from 
      // being shown
      fullscreenflex.removeAttribute("fullscreencontrol");
    }
    else if (fullscreenctls.parentNode.id == "TabsToolbar" && !ctlsOnTabbar) {
      document.getElementById("nav-bar").appendChild(fullscreenctls);
      fullscreenflex.setAttribute("fullscreencontrol", "true");
    }

    var controls = document.getElementsByAttribute("fullscreencontrol", "true");
    for (var i = 0; i < controls.length; ++i)
      controls[i].hidden = aShow;
  }
};

/**
 * Returns true if |aMimeType| is text-based, false otherwise.
 *
 * @param aMimeType
 *        The MIME type to check.
 *
 * If adding types to this function, please also check the similar
 * function in findbar.xml
 */
function mimeTypeIsTextBased(aMimeType)
{
  return /^text\/|\+xml$/.test(aMimeType) ||
         aMimeType == "application/x-javascript" ||
         aMimeType == "application/javascript" ||
         aMimeType == "application/xml" ||
         aMimeType == "mozilla.application/cached-xul";
}

var XULBrowserWindow = {
  // Stored Status, Link and Loading values
  status: "",
  defaultStatus: "",
  jsStatus: "",
  jsDefaultStatus: "",
  overLink: "",
  startTime: 0,
  statusText: "",
  isBusy: false,
  inContentWhitelist: ["about:addons"],

  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsIWebProgressListener2) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsIXULBrowserWindow) ||
        aIID.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_NOINTERFACE;
  },

  get stopCommand () {
    delete this.stopCommand;
    return this.stopCommand = document.getElementById("Browser:Stop");
  },
  get reloadCommand () {
    delete this.reloadCommand;
    return this.reloadCommand = document.getElementById("Browser:Reload");
  },
  get statusTextField () {
    delete this.statusTextField;
    return this.statusTextField = document.getElementById("statusbar-display");
  },
  get isImage () {
    delete this.isImage;
    return this.isImage = document.getElementById("isImage");
  },
  get _uriFixup () {
    delete this._uriFixup;
    return this._uriFixup = Cc["@mozilla.org/docshell/urifixup;1"]
                              .getService(Ci.nsIURIFixup);
  },

  init: function () {
    this.throbberElement = document.getElementById("navigator-throbber");

    // Initialize the security button's state and tooltip text.  Remember to reset
    // _hostChanged, otherwise onSecurityChange will short circuit.
    var securityUI = gBrowser.securityUI;
    this._hostChanged = true;
    this.onSecurityChange(null, null, securityUI.state);
  },

  destroy: function () {
    // XXXjag to avoid leaks :-/, see bug 60729
    delete this.throbberElement;
    delete this.stopCommand;
    delete this.reloadCommand;
    delete this.statusTextField;
    delete this.statusText;
  },

  setJSStatus: function (status) {
    this.jsStatus = status;
    this.updateStatusField();
  },

  setJSDefaultStatus: function (status) {
    this.jsDefaultStatus = status;
    this.updateStatusField();
  },

  setDefaultStatus: function (status) {
    this.defaultStatus = status;
    this.updateStatusField();
  },

  setOverLink: function (url, anchorElt) {
    // Encode bidirectional formatting characters.
    // (RFC 3987 sections 3.2 and 4.1 paragraph 6)
    this.overLink = url.replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e]/g,
                                encodeURIComponent);
    LinkTargetDisplay.update();
  },

  updateStatusField: function () {
    var text, type, types = ["overLink"];
    if (this._busyUI)
      types.push("status");
    types.push("jsStatus", "jsDefaultStatus", "defaultStatus");
    for (let i = 0; !text && i < types.length; i++) {
      type = types[i];
      text = this[type];
    }

    // check the current value so we don't trigger an attribute change
    // and cause needless (slow!) UI updates
    if (this.statusText != text) {
      let field = this.statusTextField;
      field.setAttribute("previoustype", field.getAttribute("type"));
      field.setAttribute("type", type);
      field.label = text;
      field.setAttribute("crop", type == "overLink" ? "center" : "end");
      this.statusText = text;
    }
  },

  // Called before links are navigated to to allow us to retarget them if needed.
  onBeforeLinkTraversal: function(originalTarget, linkURI, linkNode, isAppTab) {
    // Don't modify non-default targets or targets that aren't in top-level app
    // tab docshells (isAppTab will be false for app tab subframes).
    if (originalTarget != "" || !isAppTab)
      return originalTarget;

    // External links from within app tabs should always open in new tabs
    // instead of replacing the app tab's page (Bug 575561)
    let linkHost;
    let docHost;
    try {
      linkHost = linkURI.host;
      docHost = linkNode.ownerDocument.documentURIObject.host;
    } catch(e) {
      // nsIURI.host can throw for non-nsStandardURL nsIURIs.
      // If we fail to get either host, just return originalTarget.
      return originalTarget;
    }

    if (docHost == linkHost)
      return originalTarget;

    // Special case: ignore "www" prefix if it is part of host string
    let [longHost, shortHost] =
      linkHost.length > docHost.length ? [linkHost, docHost] : [docHost, linkHost];
    if (longHost == "www." + shortHost)
      return originalTarget;

    return "_blank";
  },

  onLinkIconAvailable: function (aIconURL) {
    if (gProxyFavIcon && gBrowser.userTypedValue === null)
      PageProxySetIcon(aIconURL); // update the favicon in the URL bar
  },

  onProgressChange: function (aWebProgress, aRequest,
                              aCurSelfProgress, aMaxSelfProgress,
                              aCurTotalProgress, aMaxTotalProgress) {
    // Do nothing.
  },

  onProgressChange64: function (aWebProgress, aRequest,
                                aCurSelfProgress, aMaxSelfProgress,
                                aCurTotalProgress, aMaxTotalProgress) {
    return this.onProgressChange(aWebProgress, aRequest,
      aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress,
      aMaxTotalProgress);
  },

  onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {
    const nsIWebProgressListener = Ci.nsIWebProgressListener;
    const nsIChannel = Ci.nsIChannel;

    if (aStateFlags & nsIWebProgressListener.STATE_START &&
        aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {

      if (aRequest && aWebProgress.DOMWindow == content)
        this.startDocumentLoad(aRequest);

      this.isBusy = true;

      if (!(aStateFlags & nsIWebProgressListener.STATE_RESTORING)) {
        this._busyUI = true;

        // Turn the throbber on.
        if (this.throbberElement)
          this.throbberElement.setAttribute("busy", "true");

        // XXX: This needs to be based on window activity...
        this.stopCommand.removeAttribute("disabled");
        CombinedStopReload.switchToStop();
      }
    }
    else if (aStateFlags & nsIWebProgressListener.STATE_STOP) {
      if (aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
        if (aWebProgress.DOMWindow == content) {
          if (aRequest)
            this.endDocumentLoad(aRequest, aStatus);
          if (!gBrowser.mTabbedMode && !gBrowser.getIcon())
            gBrowser.useDefaultIcon(gBrowser.selectedTab);
        }
      }

      // This (thanks to the filter) is a network stop or the last
      // request stop outside of loading the document, stop throbbers
      // and progress bars and such
      if (aRequest) {
        let msg = "";
        let location;
        // Get the URI either from a channel or a pseudo-object
        if (aRequest instanceof nsIChannel || "URI" in aRequest) {
          location = aRequest.URI;

          // For keyword URIs clear the user typed value since they will be changed into real URIs
          if (location.scheme == "keyword" && aWebProgress.DOMWindow == content)
            gBrowser.userTypedValue = null;

          if (location.spec != "about:blank") {
            switch (aStatus) {
              case Components.results.NS_ERROR_NET_TIMEOUT:
                msg = gNavigatorBundle.getString("nv_timeout");
                break;
            }
          }
        }

        this.status = "";
        this.setDefaultStatus(msg);

        // Disable menu entries for images, enable otherwise
        if (content.document && mimeTypeIsTextBased(content.document.contentType))
          this.isImage.removeAttribute('disabled');
        else
          this.isImage.setAttribute('disabled', 'true');
      }

      this.isBusy = false;

      if (this._busyUI) {
        this._busyUI = false;

        // Turn the throbber off.
        if (this.throbberElement)
          this.throbberElement.removeAttribute("busy");

        this.stopCommand.setAttribute("disabled", "true");
        CombinedStopReload.switchToReload(aRequest instanceof Ci.nsIRequest);
      }
    }
  },

  onLocationChange: function (aWebProgress, aRequest, aLocationURI) {
    var location = aLocationURI ? aLocationURI.spec : "";
    this._hostChanged = true;

    // Hide the form invalid popup.
    if (gFormSubmitObserver.panelIsOpen()) {
      gFormSubmitObserver.panel.hidePopup();
    }

    if (document.tooltipNode) {
      // Optimise for the common case
      if (aWebProgress.DOMWindow == content) {
        document.getElementById("aHTMLTooltip").hidePopup();
        document.tooltipNode = null;
      }
      else {
        for (let tooltipWindow =
               document.tooltipNode.ownerDocument.defaultView;
             tooltipWindow != tooltipWindow.parent;
             tooltipWindow = tooltipWindow.parent) {
          if (tooltipWindow == aWebProgress.DOMWindow) {
            document.getElementById("aHTMLTooltip").hidePopup();
            document.tooltipNode = null;
            break;
          }
        }
      }
    }

    // This code here does not compare uris exactly when determining
    // whether or not the message should be hidden since the message
    // may be prematurely hidden when an install is invoked by a click
    // on a link that looks like this:
    //
    // <a href="#" onclick="return install();">Install Foo</a>
    //
    // - which fires a onLocationChange message to uri + '#'...
    var selectedBrowser = gBrowser.selectedBrowser;
    if (selectedBrowser.lastURI) {
      let oldSpec = selectedBrowser.lastURI.spec;
      let oldIndexOfHash = oldSpec.indexOf("#");
      if (oldIndexOfHash != -1)
        oldSpec = oldSpec.substr(0, oldIndexOfHash);
      let newSpec = location;
      let newIndexOfHash = newSpec.indexOf("#");
      if (newIndexOfHash != -1)
        newSpec = newSpec.substr(0, newSpec.indexOf("#"));
      if (newSpec != oldSpec) {
        // Remove all the notifications, except for those which want to
        // persist across the first location change.
        let nBox = gBrowser.getNotificationBox(selectedBrowser);
        nBox.removeTransientNotifications();

        // Only need to call locationChange if the PopupNotifications object
        // for this window has already been initialized (i.e. its getter no
        // longer exists)
        if (!__lookupGetter__("PopupNotifications"))
          PopupNotifications.locationChange();
      }
    }

    // Disable menu entries for images, enable otherwise
    if (content.document && mimeTypeIsTextBased(content.document.contentType))
      this.isImage.removeAttribute('disabled');
    else
      this.isImage.setAttribute('disabled', 'true');

    this.hideOverLinkImmediately = true;
    this.setOverLink("", null);
    this.hideOverLinkImmediately = false;

    // We should probably not do this if the value has changed since the user
    // searched
    // Update urlbar only if a new page was loaded on the primary content area
    // Do not update urlbar if there was a subframe navigation

    var browser = gBrowser.selectedBrowser;
    if (aWebProgress.DOMWindow == content) {
      if ((location == "about:blank" && !content.opener) ||
          location == "") {  // Second condition is for new tabs, otherwise
                             // reload function is enabled until tab is refreshed.
        this.reloadCommand.setAttribute("disabled", "true");
      } else {
        this.reloadCommand.removeAttribute("disabled");
      }

      if (!gBrowser.mTabbedMode && aWebProgress.isLoadingDocument)
        gBrowser.setIcon(gBrowser.selectedTab, null);

      if (gURLBar) {
        // Strip off "wyciwyg://" and passwords for the location bar
        let uri = aLocationURI;
        try {
          uri = this._uriFixup.createExposableURI(uri);
        } catch (e) {}
        URLBarSetURI(uri);

        // Update starring UI
        PlacesStarButton.updateState();
      }

      // Show or hide browser chrome based on the whitelist
      if (this.hideChromeForLocation(location))
        document.documentElement.setAttribute("disablechrome", "true");
      else
        document.documentElement.removeAttribute("disablechrome");

      // Disable find commands in documents that ask for them to be disabled.
      let docElt = content.document.documentElement;
      let disableFind = aLocationURI &&
        (docElt && docElt.getAttribute("disablefastfind") == "true") &&
        (aLocationURI.schemeIs("about") || aLocationURI.schemeIs("chrome"));
      let findCommands = [document.getElementById("cmd_find"),
                          document.getElementById("cmd_findAgain"),
                          document.getElementById("cmd_findPrevious")];
      findCommands.forEach(function (elt) {
        if (disableFind)
          elt.setAttribute("disabled", "true");
        else
          elt.removeAttribute("disabled");
      });

      if (gFindBarInitialized) {
        if (gFindBar.findMode != gFindBar.FIND_NORMAL) {
          // Close the Find toolbar if we're in old-style TAF mode
          gFindBar.close();
        }

        // fix bug 253793 - turn off highlight when page changes
        gFindBar.getElement("highlight").checked = false;
      }
    }
    UpdateBackForwardCommands(gBrowser.webNavigation);

    // See bug 358202, when tabs are switched during a drag operation,
    // timers don't fire on windows (bug 203573)
    if (aRequest)
      setTimeout(function () { XULBrowserWindow.asyncUpdateUI(); }, 0);
    else
      this.asyncUpdateUI();
  },

  asyncUpdateUI: function () {
    FeedHandler.updateFeeds();
  },

  hideChromeForLocation: function(aLocation) {
    return this.inContentWhitelist.some(function(aSpec) {
      return aSpec == aLocation;
    });
  },

  onStatusChange: function (aWebProgress, aRequest, aStatus, aMessage) {
    this.status = aMessage;
    this.updateStatusField();
  },

  // Properties used to cache security state used to update the UI
  _state: null,
  _hostChanged: false, // onLocationChange will flip this bit

  onSecurityChange: function (aWebProgress, aRequest, aState) {
    // Don't need to do anything if the data we use to update the UI hasn't
    // changed
    if (this._state == aState &&
        !this._hostChanged) {
//@line 4493 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      return;
    }
    this._state = aState;

//@line 4504 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

    this._hostChanged = false;

    // aState is defined as a bitmask that may be extended in the future.
    // We filter out any unknown bits before testing for known values.
    const wpl = Components.interfaces.nsIWebProgressListener;
    const wpl_security_bits = wpl.STATE_IS_SECURE |
                              wpl.STATE_IS_BROKEN |
                              wpl.STATE_IS_INSECURE |
                              wpl.STATE_SECURE_HIGH |
                              wpl.STATE_SECURE_MED |
                              wpl.STATE_SECURE_LOW;
    var level;

    switch (this._state & wpl_security_bits) {
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_HIGH:
        level = "high";
        break;
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_MED:
      case wpl.STATE_IS_SECURE | wpl.STATE_SECURE_LOW:
        level = "low";
        break;
      case wpl.STATE_IS_BROKEN:
        level = "broken";
        break;
    }

    if (level) {
      // We don't style the Location Bar based on the the 'level' attribute
      // anymore, but still set it for third-party themes.
      if (gURLBar)
        gURLBar.setAttribute("level", level);
    } else {
      if (gURLBar)
        gURLBar.removeAttribute("level");
    }

    // Don't pass in the actual location object, since it can cause us to
    // hold on to the window object too long.  Just pass in the fields we
    // care about. (bug 424829)
    var location = gBrowser.contentWindow.location;
    var locationObj = {};
    try {
      // about:blank can be used by webpages so pretend it is http
      locationObj.protocol = location == "about:blank" ? "http:" : location.protocol;
      locationObj.host = location.host;
      locationObj.hostname = location.hostname;
      locationObj.port = location.port;
    } catch (ex) {
      // Can sometimes throw if the URL being visited has no host/hostname,
      // e.g. about:blank. The _state for these pages means we won't need these
      // properties anyways, though.
    }
    gIdentityHandler.checkIdentity(this._state, locationObj);
  },

  // simulate all change notifications after switching tabs
  onUpdateCurrentBrowser: function XWB_onUpdateCurrentBrowser(aStateFlags, aStatus, aMessage, aTotalProgress) {
    if (FullZoom.updateBackgroundTabs)
      FullZoom.onLocationChange(gBrowser.currentURI, true);
    var nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    var loadingDone = aStateFlags & nsIWebProgressListener.STATE_STOP;
    // use a pseudo-object instead of a (potentially nonexistent) channel for getting
    // a correct error message - and make sure that the UI is always either in
    // loading (STATE_START) or done (STATE_STOP) mode
    this.onStateChange(
      gBrowser.webProgress,
      { URI: gBrowser.currentURI },
      loadingDone ? nsIWebProgressListener.STATE_STOP : nsIWebProgressListener.STATE_START,
      aStatus
    );
    // status message and progress value are undefined if we're done with loading
    if (loadingDone)
      return;
    this.onStatusChange(gBrowser.webProgress, null, 0, aMessage);
  },

  startDocumentLoad: function XWB_startDocumentLoad(aRequest) {
    // clear out feed data
    gBrowser.selectedBrowser.feeds = null;

    // clear out search-engine data
    gBrowser.selectedBrowser.engines = null;

    var uri = aRequest.QueryInterface(Ci.nsIChannel).URI;
    try {
      Services.obs.notifyObservers(content, "StartDocumentLoad", uri.spec);
    } catch (e) {
    }
  },

  endDocumentLoad: function XWB_endDocumentLoad(aRequest, aStatus) {
    var urlStr = aRequest.QueryInterface(Ci.nsIChannel).originalURI.spec;

    var notification = Components.isSuccessCode(aStatus) ? "EndDocumentLoad" : "FailDocumentLoad";
    try {
      Services.obs.notifyObservers(content, notification, urlStr);
    } catch (e) {
    }
  }
};

var LinkTargetDisplay = {
  get DELAY_SHOW() {
     delete this.DELAY_SHOW;
     return this.DELAY_SHOW = Services.prefs.getIntPref("browser.overlink-delay");
  },

  DELAY_HIDE: 150,
  _timer: 0,

  get _isVisible () XULBrowserWindow.statusTextField.label != "",

  update: function () {
    clearTimeout(this._timer);
    window.removeEventListener("mousemove", this, true);

    if (!XULBrowserWindow.overLink) {
      if (XULBrowserWindow.hideOverLinkImmediately)
        this._hide();
      else
        this._timer = setTimeout(this._hide.bind(this), this.DELAY_HIDE);
      return;
    }

    if (this._isVisible) {
      XULBrowserWindow.updateStatusField();
    } else {
      // Let the display appear when the mouse doesn't move within the delay
      this._showDelayed();
      window.addEventListener("mousemove", this, true);
    }
  },

  handleEvent: function (event) {
    switch (event.type) {
      case "mousemove":
        // Restart the delay since the mouse was moved
        clearTimeout(this._timer);
        this._showDelayed();
        break;
    }
  },

  _showDelayed: function () {
    this._timer = setTimeout(function (self) {
      XULBrowserWindow.updateStatusField();
      window.removeEventListener("mousemove", self, true);
    }, this.DELAY_SHOW, this);
  },

  _hide: function () {
    clearTimeout(this._timer);

    XULBrowserWindow.updateStatusField();
  }
};

var CombinedStopReload = {
  init: function () {
    if (this._initialized)
      return;

    var urlbar = document.getElementById("urlbar-container");
    var reload = document.getElementById("reload-button");
    var stop = document.getElementById("stop-button");

    if (urlbar) {
      if (urlbar.parentNode.getAttribute("mode") != "icons" ||
          !reload || urlbar.nextSibling != reload ||
          !stop || reload.nextSibling != stop)
        urlbar.removeAttribute("combined");
      else {
        urlbar.setAttribute("combined", "true");
        reload = document.getElementById("urlbar-reload-button");
        stop = document.getElementById("urlbar-stop-button");
      }
    }
    if (!stop || !reload || reload.nextSibling != stop)
      return;

    this._initialized = true;
    if (XULBrowserWindow.stopCommand.getAttribute("disabled") != "true")
      reload.setAttribute("displaystop", "true");
    stop.addEventListener("click", this, false);
    this.reload = reload;
    this.stop = stop;
  },

  uninit: function () {
    if (!this._initialized)
      return;

    this._cancelTransition();
    this._initialized = false;
    this.stop.removeEventListener("click", this, false);
    this.reload = null;
    this.stop = null;
  },

  handleEvent: function (event) {
    // the only event we listen to is "click" on the stop button
    if (event.button == 0 &&
        !this.stop.disabled)
      this._stopClicked = true;
  },

  switchToStop: function () {
    if (!this._initialized)
      return;

    this._cancelTransition();
    this.reload.setAttribute("displaystop", "true");
  },

  switchToReload: function (aDelay) {
    if (!this._initialized)
      return;

    this.reload.removeAttribute("displaystop");

    if (!aDelay || this._stopClicked) {
      this._stopClicked = false;
      this._cancelTransition();
      this.reload.disabled = XULBrowserWindow.reloadCommand
                                             .getAttribute("disabled") == "true";
      return;
    }

    if (this._timer)
      return;

    // Temporarily disable the reload button to prevent the user from
    // accidentally reloading the page when intending to click the stop button
    this.reload.disabled = true;
    this._timer = setTimeout(function (self) {
      self._timer = 0;
      self.reload.disabled = XULBrowserWindow.reloadCommand
                                             .getAttribute("disabled") == "true";
    }, 650, this);
  },

  _cancelTransition: function () {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = 0;
    }
  }
};

var TabsProgressListener = {
  onStateChange: function (aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
//@line 4764 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

    // Attach a listener to watch for "click" events bubbling up from error
    // pages and other similar page. This lets us fix bugs like 401575 which
    // require error page UI to do privileged things, without letting error
    // pages have any privilege themselves.
    // We can't look for this during onLocationChange since at that point the
    // document URI is not yet the about:-uri of the error page.

    if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        /^about:/.test(aWebProgress.DOMWindow.document.documentURI)) {
      aBrowser.addEventListener("click", BrowserOnClick, false);
      aBrowser.addEventListener("pagehide", function () {
        aBrowser.removeEventListener("click", BrowserOnClick, false);
        aBrowser.removeEventListener("pagehide", arguments.callee, true);
      }, true);

      // We also want to make changes to page UI for unprivileged about pages.
      BrowserOnAboutPageLoad(aWebProgress.DOMWindow.document);
    }
  },

  onLocationChange: function (aBrowser, aWebProgress, aRequest, aLocationURI) {
    // Filter out any sub-frame loads
    if (aBrowser.contentWindow == aWebProgress.DOMWindow)
      FullZoom.onLocationChange(aLocationURI, false, aBrowser);
  },

  onRefreshAttempted: function (aBrowser, aWebProgress, aURI, aDelay, aSameURI) {
    if (gPrefService.getBoolPref("accessibility.blockautorefresh")) {
      let brandBundle = document.getElementById("bundle_brand");
      let brandShortName = brandBundle.getString("brandShortName");
      let refreshButtonText =
        gNavigatorBundle.getString("refreshBlocked.goButton");
      let refreshButtonAccesskey =
        gNavigatorBundle.getString("refreshBlocked.goButton.accesskey");
      let message =
        gNavigatorBundle.getFormattedString(aSameURI ? "refreshBlocked.refreshLabel"
                                                     : "refreshBlocked.redirectLabel",
                                            [brandShortName]);
      let docShell = aWebProgress.DOMWindow
                                 .QueryInterface(Ci.nsIInterfaceRequestor)
                                 .getInterface(Ci.nsIWebNavigation)
                                 .QueryInterface(Ci.nsIDocShell);
      let notificationBox = gBrowser.getNotificationBox(aBrowser);
      let notification = notificationBox.getNotificationWithValue("refresh-blocked");
      if (notification) {
        notification.label = message;
        notification.refreshURI = aURI;
        notification.delay = aDelay;
        notification.docShell = docShell;
      } else {
        let buttons = [{
          label: refreshButtonText,
          accessKey: refreshButtonAccesskey,
          callback: function (aNotification, aButton) {
            var refreshURI = aNotification.docShell
                                          .QueryInterface(Ci.nsIRefreshURI);
            refreshURI.forceRefreshURI(aNotification.refreshURI,
                                       aNotification.delay, true);
          }
        }];
        notification =
          notificationBox.appendNotification(message, "refresh-blocked",
                                             "chrome://browser/skin/Info.png",
                                             notificationBox.PRIORITY_INFO_MEDIUM,
                                             buttons);
        notification.refreshURI = aURI;
        notification.delay = aDelay;
        notification.docShell = docShell;
      }
      return false;
    }
    return true;
  }
}

function nsBrowserAccess() { }

nsBrowserAccess.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIBrowserDOMWindow, Ci.nsISupports]),

  openURI: function (aURI, aOpener, aWhere, aContext) {
    var newWindow = null;
    var isExternal = (aContext == Ci.nsIBrowserDOMWindow.OPEN_EXTERNAL);

    if (isExternal && aURI && aURI.schemeIs("chrome")) {
      dump("use -chrome command-line option to load external chrome urls\n");
      return null;
    }

    if (aWhere == Ci.nsIBrowserDOMWindow.OPEN_DEFAULTWINDOW)
      aWhere = gPrefService.getIntPref("browser.link.open_newwindow");
    switch (aWhere) {
      case Ci.nsIBrowserDOMWindow.OPEN_NEWWINDOW :
        // FIXME: Bug 408379. So how come this doesn't send the
        // referrer like the other loads do?
        var url = aURI ? aURI.spec : "about:blank";
        // Pass all params to openDialog to ensure that "url" isn't passed through
        // loadOneOrMoreURIs, which splits based on "|"
        newWindow = openDialog(getBrowserURL(), "_blank", "all,dialog=no", url, null, null, null);
        break;
      case Ci.nsIBrowserDOMWindow.OPEN_NEWTAB :
        let win, needToFocusWin;

        // try the current window.  if we're in a popup, fall back on the most recent browser window
        if (!window.document.documentElement.getAttribute("chromehidden"))
          win = window;
        else {
          win = Cc["@mozilla.org/browser/browserglue;1"]
                  .getService(Ci.nsIBrowserGlue)
                  .getMostRecentBrowserWindow();
          needToFocusWin = true;
        }

        if (!win) {
          // we couldn't find a suitable window, a new one needs to be opened.
          return null;
        }

        if (isExternal && (!aURI || aURI.spec == "about:blank")) {
          win.BrowserOpenTab(); // this also focuses the location bar
          win.focus();
          newWindow = win.content;
          break;
        }

        let loadInBackground = gPrefService.getBoolPref("browser.tabs.loadDivertedInBackground");
        let referrer = aOpener ? makeURI(aOpener.location.href) : null;

        let tab = win.gBrowser.loadOneTab(aURI ? aURI.spec : "about:blank", {
                                          referrerURI: referrer,
                                          fromExternal: isExternal,
                                          inBackground: loadInBackground});
        let browser = win.gBrowser.getBrowserForTab(tab);

        newWindow = browser.contentWindow;
        if (needToFocusWin || (!loadInBackground && isExternal))
          newWindow.focus();
        break;
      default : // OPEN_CURRENTWINDOW or an illegal value
        newWindow = content;
        if (aURI) {
          let referrer = aOpener ? makeURI(aOpener.location.href) : null;
          let loadflags = isExternal ?
                            Ci.nsIWebNavigation.LOAD_FLAGS_FROM_EXTERNAL :
                            Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
          gBrowser.loadURIWithFlags(aURI.spec, loadflags, referrer, null, null);
        }
        if (!gPrefService.getBoolPref("browser.tabs.loadDivertedInBackground"))
          content.focus();
    }
    return newWindow;
  },

  isTabContentWindow: function (aWindow) {
    return gBrowser.browsers.some(function (browser) browser.contentWindow == aWindow);
  }
}

function onViewToolbarsPopupShowing(aEvent, aInsertPoint) {
  var popup = aEvent.target;
  if (popup != aEvent.currentTarget)
    return;

  // Empty the menu
  for (var i = popup.childNodes.length-1; i >= 0; --i) {
    var deadItem = popup.childNodes[i];
    if (deadItem.hasAttribute("toolbarId"))
      popup.removeChild(deadItem);
  }

  var firstMenuItem = aInsertPoint || popup.firstChild;

  let toolbarNodes = Array.slice(gNavToolbox.childNodes);
  toolbarNodes.push(document.getElementById("addon-bar"));

  toolbarNodes.forEach(function(toolbar) {
    var toolbarName = toolbar.getAttribute("toolbarname");
    if (toolbarName) {
      let menuItem = document.createElement("menuitem");
      let hidingAttribute = toolbar.getAttribute("type") == "menubar" ?
                            "autohide" : "collapsed";
      menuItem.setAttribute("id", "toggle_" + toolbar.id);
      menuItem.setAttribute("toolbarId", toolbar.id);
      menuItem.setAttribute("type", "checkbox");
      menuItem.setAttribute("label", toolbarName);
      menuItem.setAttribute("checked", toolbar.getAttribute(hidingAttribute) != "true");
      if (popup.id != "appmenu_customizeMenu")
        menuItem.setAttribute("accesskey", toolbar.getAttribute("accesskey"));
      if (popup.id != "toolbar-context-menu")
        menuItem.setAttribute("key", toolbar.getAttribute("key"));

      popup.insertBefore(menuItem, firstMenuItem);

      menuItem.addEventListener("command", onViewToolbarCommand, false);
    }
  }, this);
}

function onViewToolbarCommand(aEvent) {
  var toolbarId = aEvent.originalTarget.getAttribute("toolbarId");
  var toolbar = document.getElementById(toolbarId);
  var isVisible = aEvent.originalTarget.getAttribute("checked") == "true";
  setToolbarVisibility(toolbar, isVisible);
}

function setToolbarVisibility(toolbar, isVisible) {
  var hidingAttribute = toolbar.getAttribute("type") == "menubar" ?
                        "autohide" : "collapsed";

  toolbar.setAttribute(hidingAttribute, !isVisible);
  document.persist(toolbar.id, hidingAttribute);

  PlacesToolbarHelper.init();
  BookmarksMenuButton.updatePosition();
  gBrowser.updateWindowResizers();

//@line 4982 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  updateAppButtonDisplay();
//@line 4984 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
}

var TabsOnTop = {
  toggle: function () {
    this.enabled = !this.enabled;
  },
  syncCommand: function () {
    let enabled = this.enabled;
    document.getElementById("cmd_ToggleTabsOnTop")
            .setAttribute("checked", enabled);
    document.documentElement.setAttribute("tabsontop", enabled);
    document.getElementById("TabsToolbar").setAttribute("tabsontop", enabled);
    gBrowser.tabContainer.setAttribute("tabsontop", enabled);
    TabsInTitlebar.allowedBy("tabs-on-top", enabled);
  },
  get enabled () {
    return gNavToolbox.getAttribute("tabsontop") == "true";
  },
  set enabled (val) {
    gNavToolbox.setAttribute("tabsontop", !!val);
    this.syncCommand();

    return val;
  }
}

var TabsInTitlebar = {
  init: function () {
//@line 5028 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  },

  allowedBy: function (condition, allow) {
//@line 5044 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  },

//@line 5121 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

  uninit: function () {
//@line 5127 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  }
};

//@line 5131 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
function updateAppButtonDisplay() {
  var displayAppButton =
    !gInPrintPreviewMode &&
    window.menubar.visible &&
    document.getElementById("toolbar-menubar").getAttribute("autohide") == "true";

//@line 5147 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  document.getElementById("appmenu-toolbar-button").hidden =
    !displayAppButton;
//@line 5150 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
}
//@line 5152 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

//@line 5161 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

function displaySecurityInfo()
{
  BrowserPageInfo(null, "securityTab");
}

/**
 * Opens or closes the sidebar identified by commandID.
 *
 * @param commandID a string identifying the sidebar to toggle; see the
 *                  note below. (Optional if a sidebar is already open.)
 * @param forceOpen boolean indicating whether the sidebar should be
 *                  opened regardless of its current state (optional).
 * @note
 * We expect to find a xul:broadcaster element with the specified ID.
 * The following attributes on that element may be used and/or modified:
 *  - id           (required) the string to match commandID. The convention
 *                 is to use this naming scheme: 'view<sidebar-name>Sidebar'.
 *  - sidebarurl   (required) specifies the URL to load in this sidebar.
 *  - sidebartitle or label (in that order) specify the title to
 *                 display on the sidebar.
 *  - checked      indicates whether the sidebar is currently displayed.
 *                 Note that toggleSidebar updates this attribute when
 *                 it changes the sidebar's visibility.
 *  - group        this attribute must be set to "sidebar".
 */
function toggleSidebar(commandID, forceOpen) {

  var sidebarBox = document.getElementById("sidebar-box");
  if (!commandID)
    commandID = sidebarBox.getAttribute("sidebarcommand");

  var sidebarBroadcaster = document.getElementById(commandID);
  var sidebar = document.getElementById("sidebar"); // xul:browser
  var sidebarTitle = document.getElementById("sidebar-title");
  var sidebarSplitter = document.getElementById("sidebar-splitter");

  if (sidebarBroadcaster.getAttribute("checked") == "true") {
    if (!forceOpen) {
      sidebarBroadcaster.removeAttribute("checked");
      sidebarBox.setAttribute("sidebarcommand", "");
      sidebarTitle.value = "";
      sidebar.setAttribute("src", "about:blank");
      sidebarBox.hidden = true;
      sidebarSplitter.hidden = true;
      content.focus();
    } else {
      fireSidebarFocusedEvent();
    }
    return;
  }

  // now we need to show the specified sidebar

  // ..but first update the 'checked' state of all sidebar broadcasters
  var broadcasters = document.getElementsByAttribute("group", "sidebar");
  for (var i = 0; i < broadcasters.length; ++i) {
    // skip elements that observe sidebar broadcasters and random
    // other elements
    if (broadcasters[i].localName != "broadcaster")
      continue;

    if (broadcasters[i] != sidebarBroadcaster)
      broadcasters[i].removeAttribute("checked");
    else
      sidebarBroadcaster.setAttribute("checked", "true");
  }

  sidebarBox.hidden = false;
  sidebarSplitter.hidden = false;

  var url = sidebarBroadcaster.getAttribute("sidebarurl");
  var title = sidebarBroadcaster.getAttribute("sidebartitle");
  if (!title)
    title = sidebarBroadcaster.getAttribute("label");
  sidebar.setAttribute("src", url); // kick off async load
  sidebarBox.setAttribute("sidebarcommand", sidebarBroadcaster.id);
  sidebarTitle.value = title;

  // We set this attribute here in addition to setting it on the <browser>
  // element itself, because the code in BrowserShutdown persists this
  // attribute, not the "src" of the <browser id="sidebar">. The reason it
  // does that is that we want to delay sidebar load a bit when a browser
  // window opens. See delayedStartup().
  sidebarBox.setAttribute("src", url);

  if (sidebar.contentDocument.location.href != url)
    sidebar.addEventListener("load", sidebarOnLoad, true);
  else // older code handled this case, so we do it too
    fireSidebarFocusedEvent();
}

function sidebarOnLoad(event) {
  var sidebar = document.getElementById("sidebar");
  sidebar.removeEventListener("load", sidebarOnLoad, true);
  // We're handling the 'load' event before it bubbles up to the usual
  // (non-capturing) event handlers. Let it bubble up before firing the
  // SidebarFocused event.
  setTimeout(fireSidebarFocusedEvent, 0);
}

/**
 * Fire a "SidebarFocused" event on the sidebar's |window| to give the sidebar
 * a chance to adjust focus as needed. An additional event is needed, because
 * we don't want to focus the sidebar when it's opened on startup or in a new
 * window, only when the user opens the sidebar.
 */
function fireSidebarFocusedEvent() {
  var sidebar = document.getElementById("sidebar");
  var event = document.createEvent("Events");
  event.initEvent("SidebarFocused", true, false);
  sidebar.contentWindow.dispatchEvent(event);
}

var gHomeButton = {
  prefDomain: "browser.startup.homepage",
  observe: function (aSubject, aTopic, aPrefName)
  {
    if (aTopic != "nsPref:changed" || aPrefName != this.prefDomain)
      return;

    this.updateTooltip();
  },

  updateTooltip: function (homeButton)
  {
    if (!homeButton)
      homeButton = document.getElementById("home-button");
    if (homeButton) {
      var homePage = this.getHomePage();
      homePage = homePage.replace(/\|/g,', ');
      if (homePage.toLowerCase() == "about:home")
        homeButton.setAttribute("tooltiptext", homeButton.getAttribute("aboutHomeOverrideTooltip"));
      else
        homeButton.setAttribute("tooltiptext", homePage);
    }
  },

  getHomePage: function ()
  {
    var url;
    try {
      url = gPrefService.getComplexValue(this.prefDomain,
                                Components.interfaces.nsIPrefLocalizedString).data;
    } catch (e) {
    }

    // use this if we can't find the pref
    if (!url) {
      var SBS = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
      var configBundle = SBS.createBundle("chrome://branding/locale/browserconfig.properties");
      url = configBundle.GetStringFromName(this.prefDomain);
    }

    return url;
  },

  updatePersonalToolbarStyle: function (homeButton)
  {
    if (!homeButton)
      homeButton = document.getElementById("home-button");
    if (homeButton)
      homeButton.className = homeButton.parentNode.id == "PersonalToolbar"
                               || homeButton.parentNode.parentNode.id == "PersonalToolbar" ?
                             homeButton.className.replace("toolbarbutton-1", "bookmark-item") :
                             homeButton.className.replace("bookmark-item", "toolbarbutton-1");
  }
};

/**
 * Gets the selected text in the active browser. Leading and trailing
 * whitespace is removed, and consecutive whitespace is replaced by a single
 * space. A maximum of 150 characters will be returned, regardless of the value
 * of aCharLen.
 *
 * @param aCharLen
 *        The maximum number of characters to return.
 */
function getBrowserSelection(aCharLen) {
  // selections of more than 150 characters aren't useful
  const kMaxSelectionLen = 150;
  const charLen = Math.min(aCharLen || kMaxSelectionLen, kMaxSelectionLen);

  var focusedWindow = document.commandDispatcher.focusedWindow;
  var selection = focusedWindow.getSelection().toString();

  if (selection) {
    if (selection.length > charLen) {
      // only use the first charLen important chars. see bug 221361
      var pattern = new RegExp("^(?:\\s*.){0," + charLen + "}");
      pattern.test(selection);
      selection = RegExp.lastMatch;
    }

    selection = selection.replace(/^\s+/, "")
                         .replace(/\s+$/, "")
                         .replace(/\s+/g, " ");

    if (selection.length > charLen)
      selection = selection.substr(0, charLen);
  }
  return selection;
}

var gWebPanelURI;
function openWebPanel(aTitle, aURI)
{
    // Ensure that the web panels sidebar is open.
    toggleSidebar('viewWebPanelsSidebar', true);

    // Set the title of the panel.
    document.getElementById("sidebar-title").value = aTitle;

    // Tell the Web Panels sidebar to load the bookmark.
    var sidebar = document.getElementById("sidebar");
    if (sidebar.docShell && sidebar.contentDocument && sidebar.contentDocument.getElementById('web-panels-browser')) {
        sidebar.contentWindow.loadWebPanel(aURI);
        if (gWebPanelURI) {
            gWebPanelURI = "";
            sidebar.removeEventListener("load", asyncOpenWebPanel, true);
        }
    }
    else {
        // The panel is still being constructed.  Attach an onload handler.
        if (!gWebPanelURI)
            sidebar.addEventListener("load", asyncOpenWebPanel, true);
        gWebPanelURI = aURI;
    }
}

function asyncOpenWebPanel(event)
{
    var sidebar = document.getElementById("sidebar");
    if (gWebPanelURI && sidebar.contentDocument && sidebar.contentDocument.getElementById('web-panels-browser'))
        sidebar.contentWindow.loadWebPanel(gWebPanelURI);
    gWebPanelURI = "";
    sidebar.removeEventListener("load", asyncOpenWebPanel, true);
}

/*
 * - [ Dependencies ] ---------------------------------------------------------
 *  utilityOverlay.js:
 *    - gatherTextUnder
 */

/**
 * Extracts linkNode and href for the current click target.
 *
 * @param event
 *        The click event.
 * @return [href, linkNode].
 *
 * @note linkNode will be null if the click wasn't on an anchor
 *       element (or XLink).
 */
function hrefAndLinkNodeForClickEvent(event)
{
  function isHTMLLink(aNode)
  {
    // Be consistent with what nsContextMenu.js does.
    return ((aNode instanceof HTMLAnchorElement && aNode.href) ||
            (aNode instanceof HTMLAreaElement && aNode.href) ||
            aNode instanceof HTMLLinkElement);
  }

  let node = event.target;
  while (node && !isHTMLLink(node)) {
    node = node.parentNode;
  }

  if (node)
    return [node.href, node];

  // If there is no linkNode, try simple XLink.
  let href, baseURI;
  node = event.target;
  while (node) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      href = node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href)
        baseURI = node.baseURI;
    }
    node = node.parentNode;
  }

  // In case of XLink, we don't return the node we got href from since
  // callers expect <a>-like elements.
  return [href ? makeURLAbsolute(baseURI, href) : null, null];
}

/**
 * Called whenever the user clicks in the content area.
 *
 * @param event
 *        The click event.
 * @param isPanelClick
 *        Whether the event comes from a web panel.
 * @note default event is prevented if the click is handled.
 */
function contentAreaClick(event, isPanelClick)
{
  if (!event.isTrusted || event.getPreventDefault() || event.button == 2)
    return true;

  let [href, linkNode] = hrefAndLinkNodeForClickEvent(event);
  if (!href) {
    // Not a link, handle middle mouse navigation.
    if (event.button == 1 &&
        gPrefService.getBoolPref("middlemouse.contentLoadURL") &&
        !gPrefService.getBoolPref("general.autoScroll")) {
      middleMousePaste(event);
      event.preventDefault();
    }
    return true;
  }

  // This code only applies if we have a linkNode (i.e. clicks on real anchor
  // elements, as opposed to XLink).
  if (linkNode && event.button == 0 &&
      !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
    // A Web panel's links should target the main content area.  Do this
    // if no modifier keys are down and if there's no target or the target
    // equals _main (the IE convention) or _content (the Mozilla convention).
    let target = linkNode.target;
    let mainTarget = !target || target == "_content" || target  == "_main";
    if (isPanelClick && mainTarget) {
      // javascript and data links should be executed in the current browser.
      if (linkNode.getAttribute("onclick") ||
          href.substr(0, 11) === "javascript:" ||
          href.substr(0, 5) === "data:")
        return true;

      try {
        urlSecurityCheck(href, linkNode.ownerDocument.nodePrincipal);
      }
      catch(ex) {
        // Prevent loading unsecure destinations.
        event.preventDefault();
        return true;
      }

      let postData = {};
      let url = getShortcutOrURI(href, postData);
      if (!url)
        return true;
      loadURI(url, null, postData.value, false);
      event.preventDefault();
      return true;
    }

    if (linkNode.getAttribute("rel") == "sidebar") {
      // This is the Opera convention for a special link that, when clicked,
      // allows to add a sidebar panel.  The link's title attribute contains
      // the title that should be used for the sidebar panel.
      PlacesUIUtils.showMinimalAddBookmarkUI(makeURI(href),
                                             linkNode.getAttribute("title"),
                                             null, null, true, true);
      event.preventDefault();
      return true;
    }
  }

  handleLinkClick(event, href, linkNode);

  // Mark the page as a user followed link.  This is done so that history can
  // distinguish automatic embed visits from user activated ones.  For example
  // pages loaded in frames are embed visits and lost with the session, while
  // visits across frames should be preserved.
  try {
    PlacesUIUtils.markPageAsFollowedLink(href);
  } catch (ex) { /* Skip invalid URIs. */ }

  return true;
}

/**
 * Handles clicks on links.
 *
 * @return true if the click event was handled, false otherwise.
 */
function handleLinkClick(event, href, linkNode) {
  if (event.button == 2) // right click
    return false;

  var where = whereToOpenLink(event);
  if (where == "current")
    return false;

  var doc = event.target.ownerDocument;

  if (where == "save") {
    saveURL(href, linkNode ? gatherTextUnder(linkNode) : "", null, true,
            true, doc.documentURIObject);
    event.preventDefault();
    return true;
  }

  urlSecurityCheck(href, doc.nodePrincipal);
  openLinkIn(href, where, { referrerURI: doc.documentURIObject,
                            charset: doc.characterSet });
  event.preventDefault();
  return true;
}

function middleMousePaste(event) {
  let clipboard = readFromClipboard();
  if (!clipboard)
    return;

  // Strip embedded newlines and surrounding whitespace, to match the URL
  // bar's behavior (stripsurroundingwhitespace)
  clipboard.replace(/\s*\n\s*/g, "");

  let url = getShortcutOrURI(clipboard);
  try {
    makeURI(url);
  } catch (ex) {
    // Not a valid URI.
    return;
  }

  try {
    addToUrlbarHistory(url);
  } catch (ex) {
    // Things may go wrong when adding url to session history,
    // but don't let that interfere with the loading of the url.
    Cu.reportError(ex);
  }

  openUILink(url,
             event,
             true /* ignore the fact this is a middle click */);

  event.stopPropagation();
}

function handleDroppedLink(event, url, name)
{
  let postData = { };
  let uri = getShortcutOrURI(url, postData);
  if (uri)
    loadURI(uri, null, postData.value, false);

  // Keep the event from being handled by the dragDrop listeners
  // built-in to gecko if they happen to be above us.
  event.preventDefault();
};

function MultiplexHandler(event)
{ try {
    var node = event.target;
    var name = node.getAttribute('name');

    if (name == 'detectorGroup') {
        SetForcedDetector(true);
        SelectDetector(event, false);
    } else if (name == 'charsetGroup') {
        var charset = node.getAttribute('id');
        charset = charset.substring('charset.'.length, charset.length)
        SetForcedCharset(charset);
    } else if (name == 'charsetCustomize') {
        //do nothing - please remove this else statement, once the charset prefs moves to the pref window
    } else {
        SetForcedCharset(node.getAttribute('id'));
    }
    } catch(ex) { alert(ex); }
}

function SelectDetector(event, doReload)
{
    var uri =  event.target.getAttribute("id");
    var prefvalue = uri.substring('chardet.'.length, uri.length);
    if ("off" == prefvalue) { // "off" is special value to turn off the detectors
        prefvalue = "";
    }

    try {
        var str =  Cc["@mozilla.org/supports-string;1"].
                   createInstance(Ci.nsISupportsString);

        str.data = prefvalue;
        gPrefService.setComplexValue("intl.charset.detector", Ci.nsISupportsString, str);
        if (doReload)
          window.content.location.reload();
    }
    catch (ex) {
        dump("Failed to set the intl.charset.detector preference.\n");
    }
}

function SetForcedDetector(doReload)
{
    BrowserSetForcedDetector(doReload);
}

function SetForcedCharset(charset)
{
    BrowserSetForcedCharacterSet(charset);
}

function BrowserSetForcedCharacterSet(aCharset)
{
  var docCharset = gBrowser.docShell.QueryInterface(Ci.nsIDocCharset);
  docCharset.charset = aCharset;
  // Save the forced character-set
  PlacesUtils.history.setCharsetForURI(getWebNavigation().currentURI, aCharset);
  BrowserReloadWithFlags(nsIWebNavigation.LOAD_FLAGS_CHARSET_CHANGE);
}

function BrowserSetForcedDetector(doReload)
{
  gBrowser.documentCharsetInfo.forcedDetector = true;
  if (doReload)
    BrowserReloadWithFlags(nsIWebNavigation.LOAD_FLAGS_CHARSET_CHANGE);
}

function charsetMenuGetElement(parent, id) {
  return parent.getElementsByAttribute("id", id)[0];
}

function UpdateCurrentCharset(target) {
    // extract the charset from DOM
    var wnd = document.commandDispatcher.focusedWindow;
    if ((window == wnd) || (wnd == null)) wnd = window.content;

    // Uncheck previous item
    if (gPrevCharset) {
        var pref_item = charsetMenuGetElement(target, "charset." + gPrevCharset);
        if (pref_item)
          pref_item.setAttribute('checked', 'false');
    }

    var menuitem = charsetMenuGetElement(target, "charset." + wnd.document.characterSet);
    if (menuitem) {
        menuitem.setAttribute('checked', 'true');
    }
}

function UpdateCharsetDetector(target) {
  var prefvalue;

  try {
    prefvalue = gPrefService.getComplexValue("intl.charset.detector", Ci.nsIPrefLocalizedString).data;
  }
  catch (ex) {}
  
  if (!prefvalue)
    prefvalue = "off";

  var menuitem = charsetMenuGetElement(target, "chardet." + prefvalue);
  if (menuitem)
    menuitem.setAttribute("checked", "true");
}

function UpdateMenus(event) {
  UpdateCurrentCharset(event.target);
  UpdateCharsetDetector(event.target);
}

function CreateMenu(node) {
  Services.obs.notifyObservers(null, "charsetmenu-selected", node);
}

function charsetLoadListener(event) {
  var charset = window.content.document.characterSet;

  if (charset.length > 0 && (charset != gLastBrowserCharset)) {
    if (!gCharsetMenu)
      gCharsetMenu = Cc['@mozilla.org/rdf/datasource;1?name=charset-menu'].getService(Ci.nsICurrentCharsetListener);
    gCharsetMenu.SetCurrentCharset(charset);
    gPrevCharset = gLastBrowserCharset;
    gLastBrowserCharset = charset;
  }
}

/* Begin Page Style Functions */
function getAllStyleSheets(frameset) {
  var styleSheetsArray = Array.slice(frameset.document.styleSheets);
  for (let i = 0; i < frameset.frames.length; i++) {
    let frameSheets = getAllStyleSheets(frameset.frames[i]);
    styleSheetsArray = styleSheetsArray.concat(frameSheets);
  }
  return styleSheetsArray;
}

function stylesheetFillPopup(menuPopup) {
  var noStyle = menuPopup.firstChild;
  var persistentOnly = noStyle.nextSibling;
  var sep = persistentOnly.nextSibling;
  while (sep.nextSibling)
    menuPopup.removeChild(sep.nextSibling);

  var styleSheets = getAllStyleSheets(window.content);
  var currentStyleSheets = {};
  var styleDisabled = getMarkupDocumentViewer().authorStyleDisabled;
  var haveAltSheets = false;
  var altStyleSelected = false;

  for (let i = 0; i < styleSheets.length; ++i) {
    let currentStyleSheet = styleSheets[i];

    if (!currentStyleSheet.title)
      continue;

    // Skip any stylesheets that don't match the screen media type.
    if (currentStyleSheet.media.length > 0) {
      let media = currentStyleSheet.media.mediaText.split(", ");
      if (media.indexOf("screen") == -1 &&
          media.indexOf("all") == -1)
        continue;
    }

    if (!currentStyleSheet.disabled)
      altStyleSelected = true;

    haveAltSheets = true;

    let lastWithSameTitle = null;
    if (currentStyleSheet.title in currentStyleSheets)
      lastWithSameTitle = currentStyleSheets[currentStyleSheet.title];

    if (!lastWithSameTitle) {
      let menuItem = document.createElement("menuitem");
      menuItem.setAttribute("type", "radio");
      menuItem.setAttribute("label", currentStyleSheet.title);
      menuItem.setAttribute("data", currentStyleSheet.title);
      menuItem.setAttribute("checked", !currentStyleSheet.disabled && !styleDisabled);
      menuPopup.appendChild(menuItem);
      currentStyleSheets[currentStyleSheet.title] = menuItem;
    } else if (currentStyleSheet.disabled) {
      lastWithSameTitle.removeAttribute("checked");
    }
  }

  noStyle.setAttribute("checked", styleDisabled);
  persistentOnly.setAttribute("checked", !altStyleSelected && !styleDisabled);
  persistentOnly.hidden = (window.content.document.preferredStyleSheetSet) ? haveAltSheets : false;
  sep.hidden = (noStyle.hidden && persistentOnly.hidden) || !haveAltSheets;
  return true;
}

function stylesheetInFrame(frame, title) {
  return Array.some(frame.document.styleSheets,
                    function (stylesheet) stylesheet.title == title);
}

function stylesheetSwitchFrame(frame, title) {
  var docStyleSheets = frame.document.styleSheets;

  for (let i = 0; i < docStyleSheets.length; ++i) {
    let docStyleSheet = docStyleSheets[i];

    if (title == "_nostyle")
      docStyleSheet.disabled = true;
    else if (docStyleSheet.title)
      docStyleSheet.disabled = (docStyleSheet.title != title);
    else if (docStyleSheet.disabled)
      docStyleSheet.disabled = false;
  }
}

function stylesheetSwitchAll(frameset, title) {
  if (!title || title == "_nostyle" || stylesheetInFrame(frameset, title))
    stylesheetSwitchFrame(frameset, title);

  for (let i = 0; i < frameset.frames.length; i++)
    stylesheetSwitchAll(frameset.frames[i], title);
}

function setStyleDisabled(disabled) {
  getMarkupDocumentViewer().authorStyleDisabled = disabled;
}
/* End of the Page Style functions */

var BrowserOffline = {
  _inited: false,

  /////////////////////////////////////////////////////////////////////////////
  // BrowserOffline Public Methods
  init: function ()
  {
    if (!this._uiElement)
      this._uiElement = document.getElementById("workOfflineMenuitemState");

    Services.obs.addObserver(this, "network:offline-status-changed", false);

    this._updateOfflineUI(Services.io.offline);

    this._inited = true;
  },

  uninit: function ()
  {
    if (this._inited) {
      Services.obs.removeObserver(this, "network:offline-status-changed");
    }
  },

  toggleOfflineStatus: function ()
  {
    var ioService = Services.io;

    // Stop automatic management of the offline status
    try {
      ioService.manageOfflineStatus = false;
    } catch (ex) {
    }

    if (!ioService.offline && !this._canGoOffline()) {
      this._updateOfflineUI(false);
      return;
    }

    ioService.offline = !ioService.offline;

    // Save the current state for later use as the initial state
    // (if there is no netLinkService)
    gPrefService.setBoolPref("browser.offline", ioService.offline);
  },

  /////////////////////////////////////////////////////////////////////////////
  // nsIObserver
  observe: function (aSubject, aTopic, aState)
  {
    if (aTopic != "network:offline-status-changed")
      return;

    this._updateOfflineUI(aState == "offline");
  },

  /////////////////////////////////////////////////////////////////////////////
  // BrowserOffline Implementation Methods
  _canGoOffline: function ()
  {
    try {
      var cancelGoOffline = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
      Services.obs.notifyObservers(cancelGoOffline, "offline-requested", null);

      // Something aborted the quit process.
      if (cancelGoOffline.data)
        return false;
    }
    catch (ex) {
    }

    return true;
  },

  _uiElement: null,
  _updateOfflineUI: function (aOffline)
  {
    var offlineLocked = gPrefService.prefIsLocked("network.online");
    if (offlineLocked)
      this._uiElement.setAttribute("disabled", "true");

    this._uiElement.setAttribute("checked", aOffline);
  }
};

var OfflineApps = {
  /////////////////////////////////////////////////////////////////////////////
  // OfflineApps Public Methods
  init: function ()
  {
    Services.obs.addObserver(this, "dom-storage-warn-quota-exceeded", false);
    Services.obs.addObserver(this, "offline-cache-update-completed", false);
  },

  uninit: function ()
  {
    Services.obs.removeObserver(this, "dom-storage-warn-quota-exceeded");
    Services.obs.removeObserver(this, "offline-cache-update-completed");
  },

  handleEvent: function(event) {
    if (event.type == "MozApplicationManifest") {
      this.offlineAppRequested(event.originalTarget.defaultView);
    }
  },

  /////////////////////////////////////////////////////////////////////////////
  // OfflineApps Implementation Methods

  // XXX: _getBrowserWindowForContentWindow and _getBrowserForContentWindow
  // were taken from browser/components/feeds/src/WebContentConverter.
  _getBrowserWindowForContentWindow: function(aContentWindow) {
    return aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIWebNavigation)
                         .QueryInterface(Ci.nsIDocShellTreeItem)
                         .rootTreeItem
                         .QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindow)
                         .wrappedJSObject;
  },

  _getBrowserForContentWindow: function(aBrowserWindow, aContentWindow) {
    // This depends on pseudo APIs of browser.js and tabbrowser.xml
    aContentWindow = aContentWindow.top;
    var browsers = aBrowserWindow.gBrowser.browsers;
    for (var i = 0; i < browsers.length; ++i) {
      if (browsers[i].contentWindow == aContentWindow)
        return browsers[i];
    }
    return null;
  },

  _getManifestURI: function(aWindow) {
    if (!aWindow.document.documentElement)
      return null;

    var attr = aWindow.document.documentElement.getAttribute("manifest");
    if (!attr)
      return null;

    try {
      var contentURI = makeURI(aWindow.location.href, null, null);
      return makeURI(attr, aWindow.document.characterSet, contentURI);
    } catch (e) {
      return null;
    }
  },

  // A cache update isn't tied to a specific window.  Try to find
  // the best browser in which to warn the user about space usage
  _getBrowserForCacheUpdate: function(aCacheUpdate) {
    // Prefer the current browser
    var uri = this._getManifestURI(content);
    if (uri && uri.equals(aCacheUpdate.manifestURI)) {
      return gBrowser.selectedBrowser;
    }

    var browsers = gBrowser.browsers;
    for (var i = 0; i < browsers.length; ++i) {
      uri = this._getManifestURI(browsers[i].contentWindow);
      if (uri && uri.equals(aCacheUpdate.manifestURI)) {
        return browsers[i];
      }
    }

    return null;
  },

  _warnUsage: function(aBrowser, aURI) {
    if (!aBrowser)
      return;

    var notificationBox = gBrowser.getNotificationBox(aBrowser);
    var notification = notificationBox.getNotificationWithValue("offline-app-usage");
    if (!notification) {
      var buttons = [{
          label: gNavigatorBundle.getString("offlineApps.manageUsage"),
          accessKey: gNavigatorBundle.getString("offlineApps.manageUsageAccessKey"),
          callback: OfflineApps.manage
        }];

      var warnQuota = gPrefService.getIntPref("offline-apps.quota.warn");
      const priority = notificationBox.PRIORITY_WARNING_MEDIUM;
      var message = gNavigatorBundle.getFormattedString("offlineApps.usage",
                                                        [ aURI.host,
                                                          warnQuota / 1024 ]);

      notificationBox.appendNotification(message, "offline-app-usage",
                                         "chrome://browser/skin/Info.png",
                                         priority, buttons);
    }

    // Now that we've warned once, prevent the warning from showing up
    // again.
    Services.perms.add(aURI, "offline-app",
                       Ci.nsIOfflineCacheUpdateService.ALLOW_NO_WARN);
  },

  // XXX: duplicated in preferences/advanced.js
  _getOfflineAppUsage: function (host, groups)
  {
    var cacheService = Cc["@mozilla.org/network/application-cache-service;1"].
                       getService(Ci.nsIApplicationCacheService);
    if (!groups)
      groups = cacheService.getGroups();

    var usage = 0;
    for (var i = 0; i < groups.length; i++) {
      var uri = Services.io.newURI(groups[i], null, null);
      if (uri.asciiHost == host) {
        var cache = cacheService.getActiveCache(groups[i]);
        usage += cache.usage;
      }
    }

    var storageManager = Cc["@mozilla.org/dom/storagemanager;1"].
                         getService(Ci.nsIDOMStorageManager);
    usage += storageManager.getUsage(host);

    return usage;
  },

  _checkUsage: function(aURI) {
    // if the user has already allowed excessive usage, don't bother checking
    if (Services.perms.testExactPermission(aURI, "offline-app") !=
        Ci.nsIOfflineCacheUpdateService.ALLOW_NO_WARN) {
      var usage = this._getOfflineAppUsage(aURI.asciiHost);
      var warnQuota = gPrefService.getIntPref("offline-apps.quota.warn");
      if (usage >= warnQuota * 1024) {
        return true;
      }
    }

    return false;
  },

  offlineAppRequested: function(aContentWindow) {
    if (!gPrefService.getBoolPref("browser.offline-apps.notify")) {
      return;
    }

    var browserWindow = this._getBrowserWindowForContentWindow(aContentWindow);
    var browser = this._getBrowserForContentWindow(browserWindow,
                                                   aContentWindow);

    var currentURI = aContentWindow.document.documentURIObject;

    // don't bother showing UI if the user has already made a decision
    if (Services.perms.testExactPermission(currentURI, "offline-app") != Services.perms.UNKNOWN_ACTION)
      return;

    try {
      if (gPrefService.getBoolPref("offline-apps.allow_by_default")) {
        // all pages can use offline capabilities, no need to ask the user
        return;
      }
    } catch(e) {
      // this pref isn't set by default, ignore failures
    }

    var host = currentURI.asciiHost;
    var notificationBox = gBrowser.getNotificationBox(browser);
    var notificationID = "offline-app-requested-" + host;
    var notification = notificationBox.getNotificationWithValue(notificationID);

    if (notification) {
      notification.documents.push(aContentWindow.document);
    } else {
      var buttons = [{
        label: gNavigatorBundle.getString("offlineApps.allow"),
        accessKey: gNavigatorBundle.getString("offlineApps.allowAccessKey"),
        callback: function() {
          for (var i = 0; i < notification.documents.length; i++) {
            OfflineApps.allowSite(notification.documents[i]);
          }
        }
      },{
        label: gNavigatorBundle.getString("offlineApps.never"),
        accessKey: gNavigatorBundle.getString("offlineApps.neverAccessKey"),
        callback: function() {
          for (var i = 0; i < notification.documents.length; i++) {
            OfflineApps.disallowSite(notification.documents[i]);
          }
        }
      },{
        label: gNavigatorBundle.getString("offlineApps.notNow"),
        accessKey: gNavigatorBundle.getString("offlineApps.notNowAccessKey"),
        callback: function() { /* noop */ }
      }];

      const priority = notificationBox.PRIORITY_INFO_LOW;
      var message = gNavigatorBundle.getFormattedString("offlineApps.available",
                                                        [ host ]);
      notification =
        notificationBox.appendNotification(message, notificationID,
                                           "chrome://browser/skin/Info.png",
                                           priority, buttons);
      notification.documents = [ aContentWindow.document ];
    }
  },

  allowSite: function(aDocument) {
    Services.perms.add(aDocument.documentURIObject, "offline-app", Services.perms.ALLOW_ACTION);

    // When a site is enabled while loading, manifest resources will
    // start fetching immediately.  This one time we need to do it
    // ourselves.
    this._startFetching(aDocument);
  },

  disallowSite: function(aDocument) {
    Services.perms.add(aDocument.documentURIObject, "offline-app", Services.perms.DENY_ACTION);
  },

  manage: function() {
    openAdvancedPreferences("networkTab");
  },

  _startFetching: function(aDocument) {
    if (!aDocument.documentElement)
      return;

    var manifest = aDocument.documentElement.getAttribute("manifest");
    if (!manifest)
      return;

    var manifestURI = makeURI(manifest, aDocument.characterSet,
                              aDocument.documentURIObject);

    var updateService = Cc["@mozilla.org/offlinecacheupdate-service;1"].
                        getService(Ci.nsIOfflineCacheUpdateService);
    updateService.scheduleUpdate(manifestURI, aDocument.documentURIObject, window);
  },

  /////////////////////////////////////////////////////////////////////////////
  // nsIObserver
  observe: function (aSubject, aTopic, aState)
  {
    if (aTopic == "dom-storage-warn-quota-exceeded") {
      if (aSubject) {
        var uri = makeURI(aSubject.location.href);

        if (OfflineApps._checkUsage(uri)) {
          var browserWindow =
            this._getBrowserWindowForContentWindow(aSubject);
          var browser = this._getBrowserForContentWindow(browserWindow,
                                                         aSubject);
          OfflineApps._warnUsage(browser, uri);
        }
      }
    } else if (aTopic == "offline-cache-update-completed") {
      var cacheUpdate = aSubject.QueryInterface(Ci.nsIOfflineCacheUpdate);

      var uri = cacheUpdate.manifestURI;
      if (OfflineApps._checkUsage(uri)) {
        var browser = this._getBrowserForCacheUpdate(cacheUpdate);
        if (browser) {
          OfflineApps._warnUsage(browser, cacheUpdate.manifestURI);
        }
      }
    }
  }
};

var IndexedDBPromptHelper = {
  _permissionsPrompt: "indexedDB-permissions-prompt",
  _permissionsResponse: "indexedDB-permissions-response",

  _quotaPrompt: "indexedDB-quota-prompt",
  _quotaResponse: "indexedDB-quota-response",
  _quotaCancel: "indexedDB-quota-cancel",

  _notificationIcon: "indexedDB-notification-icon",

  init:
  function IndexedDBPromptHelper_init() {
    Services.obs.addObserver(this, this._permissionsPrompt, false);
    Services.obs.addObserver(this, this._quotaPrompt, false);
    Services.obs.addObserver(this, this._quotaCancel, false);
  },

  uninit:
  function IndexedDBPromptHelper_uninit() {
    Services.obs.removeObserver(this, this._permissionsPrompt, false);
    Services.obs.removeObserver(this, this._quotaPrompt, false);
    Services.obs.removeObserver(this, this._quotaCancel, false);
  },

  observe:
  function IndexedDBPromptHelper_observe(subject, topic, data) {
    if (topic != this._permissionsPrompt &&
        topic != this._quotaPrompt &&
        topic != this._quotaCancel) {
      throw new Error("Unexpected topic!");
    }

    var requestor = subject.QueryInterface(Ci.nsIInterfaceRequestor);

    var contentWindow = requestor.getInterface(Ci.nsIDOMWindow);
    var contentDocument = contentWindow.document;
    var browserWindow =
      OfflineApps._getBrowserWindowForContentWindow(contentWindow);
    var browser =
      OfflineApps._getBrowserForContentWindow(browserWindow, contentWindow);

    if (!browser) {
      // Must belong to some other window.
      return;
    }

    var host = contentDocument.documentURIObject.asciiHost;

    var message;
    var responseTopic;
    if (topic == this._permissionsPrompt) {
      message = gNavigatorBundle.getFormattedString("offlineApps.available",
                                                    [ host ]);
      responseTopic = this._permissionsResponse;
    }
    else if (topic == this._quotaPrompt) {
      message = gNavigatorBundle.getFormattedString("indexedDB.usage",
                                                    [ host, data ]);
      responseTopic = this._quotaResponse;
    }
    else if (topic == this._quotaCancel) {
      responseTopic = this._quotaResponse;
    }

    const hiddenTimeoutDuration = 30000; // 30 seconds
    const firstTimeoutDuration = 360000; // 5 minutes

    var timeoutId;

    var observer = requestor.getInterface(Ci.nsIObserver);

    var mainAction = {
      label: gNavigatorBundle.getString("offlineApps.allow"),
      accessKey: gNavigatorBundle.getString("offlineApps.allowAccessKey"),
      callback: function() {
        clearTimeout(timeoutId);
        observer.observe(null, responseTopic,
                         Ci.nsIPermissionManager.ALLOW_ACTION);
      }
    };

    var secondaryActions = [
      {
        label: gNavigatorBundle.getString("offlineApps.never"),
        accessKey: gNavigatorBundle.getString("offlineApps.neverAccessKey"),
        callback: function() {
          clearTimeout(timeoutId);
          observer.observe(null, responseTopic,
                           Ci.nsIPermissionManager.DENY_ACTION);
        }
      }
    ];

    // This will be set to the result of PopupNotifications.show() below, or to
    // the result of PopupNotifications.getNotification() if this is a
    // quotaCancel notification.
    var notification;

    function timeoutNotification() {
      // Remove the notification.
      if (notification) {
        notification.remove();
      }

      // Clear all of our timeout stuff. We may be called directly, not just
      // when the timeout actually elapses.
      clearTimeout(timeoutId);

      // And tell the page that the popup timed out.
      observer.observe(null, responseTopic,
                       Ci.nsIPermissionManager.UNKNOWN_ACTION);
    }

    var options = {
      eventCallback: function(state) {
        // Don't do anything if the timeout has not been set yet.
        if (!timeoutId) {
          return;
        }

        // If the popup is being dismissed start the short timeout.
        if (state == "dismissed") {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(timeoutNotification, hiddenTimeoutDuration);
          return;
        }

        // If the popup is being re-shown then clear the timeout allowing
        // unlimited waiting.
        if (state == "shown") {
          clearTimeout(timeoutId);
        }
      }
    };

    if (topic == this._quotaCancel) {
      notification = PopupNotifications.getNotification(this._quotaPrompt,
                                                        browser);
      timeoutNotification();
      return;
    }

    notification = PopupNotifications.show(browser, topic, message,
                                           this._notificationIcon, mainAction,
                                           secondaryActions, options);

    // Set the timeoutId after the popup has been created, and use the long
    // timeout value. If the user doesn't notice the popup after this amount of
    // time then it is most likely not visible and we want to alert the page.
    timeoutId = setTimeout(timeoutNotification, firstTimeoutDuration);
  }
};

function WindowIsClosing()
{
  if (TabView.isVisible()) {
    TabView.hide();
    return false;
  }

  var reallyClose = closeWindow(false, warnAboutClosingWindow);
  if (!reallyClose)
    return false;

  var numBrowsers = gBrowser.browsers.length;
  for (let i = 0; reallyClose && i < numBrowsers; ++i) {
    let ds = gBrowser.browsers[i].docShell;

    if (ds.contentViewer && !ds.contentViewer.permitUnload())
      reallyClose = false;
  }

  return reallyClose;
}

/**
 * Checks if this is the last full *browser* window around. If it is, this will
 * be communicated like quitting. Otherwise, we warn about closing multiple tabs.
 * @returns true if closing can proceed, false if it got cancelled.
 */
function warnAboutClosingWindow() {
  // Popups aren't considered full browser windows.
  if (!toolbar.visible)
    return gBrowser.warnAboutClosingTabs(true);

  // Figure out if there's at least one other browser window around.
  let e = Services.wm.getEnumerator("navigator:browser");
  while (e.hasMoreElements()) {
    let win = e.getNext();
    if (win != window && win.toolbar.visible)
      return gBrowser.warnAboutClosingTabs(true);
  }

  let os = Services.obs;

  let closingCanceled = Cc["@mozilla.org/supports-PRBool;1"].
                        createInstance(Ci.nsISupportsPRBool);
  os.notifyObservers(closingCanceled,
                     "browser-lastwindow-close-requested", null);
  if (closingCanceled.data)
    return false;

  os.notifyObservers(null, "browser-lastwindow-close-granted", null);

//@line 6409 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  return true;
//@line 6411 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
}

var MailIntegration = {
  sendLinkForWindow: function (aWindow) {
    this.sendMessage(aWindow.location.href,
                     aWindow.document.title);
  },

  sendMessage: function (aBody, aSubject) {
    // generate a mailto url based on the url and the url's title
    var mailtoUrl = "mailto:";
    if (aBody) {
      mailtoUrl += "?body=" + encodeURIComponent(aBody);
      mailtoUrl += "&subject=" + encodeURIComponent(aSubject);
    }

    var uri = makeURI(mailtoUrl);

    // now pass this uri to the operating system
    this._launchExternalUrl(uri);
  },

  // a generic method which can be used to pass arbitrary urls to the operating
  // system.
  // aURL --> a nsIURI which represents the url to launch
  _launchExternalUrl: function (aURL) {
    var extProtocolSvc =
       Cc["@mozilla.org/uriloader/external-protocol-service;1"]
         .getService(Ci.nsIExternalProtocolService);
    if (extProtocolSvc)
      extProtocolSvc.loadUrl(aURL);
  }
};

function BrowserOpenAddonsMgr(aView) {
  if (aView) {
    let emWindow;
    let browserWindow;

    function receivePong(aSubject, aTopic, aData) {
      let browserWin = aSubject.QueryInterface(Ci.nsIInterfaceRequestor)
                               .getInterface(Ci.nsIWebNavigation)
                               .QueryInterface(Ci.nsIDocShellTreeItem)
                               .rootTreeItem
                               .QueryInterface(Ci.nsIInterfaceRequestor)
                               .getInterface(Ci.nsIDOMWindow);
      if (!emWindow || browserWin == window /* favor the current window */) {
        emWindow = aSubject;
        browserWindow = browserWin;
      }
    }
    Services.obs.addObserver(receivePong, "EM-pong", false);
    Services.obs.notifyObservers(null, "EM-ping", "");
    Services.obs.removeObserver(receivePong, "EM-pong");

    if (emWindow) {
      emWindow.loadView(aView);
      browserWindow.gBrowser.selectedTab =
        browserWindow.gBrowser._getTabForContentWindow(emWindow);
      emWindow.focus();
      return;
    }
  }

  var newLoad = !switchToTabHavingURI("about:addons", true);

  if (aView) {
    // This must be a new load, else the ping/pong would have
    // found the window above.
    Services.obs.addObserver(function (aSubject, aTopic, aData) {
      Services.obs.removeObserver(arguments.callee, aTopic);
      aSubject.loadView(aView);
    }, "EM-loaded", false);
  }
}

function AddKeywordForSearchField() {
  var node = document.popupNode;

  var charset = node.ownerDocument.characterSet;

  var docURI = makeURI(node.ownerDocument.URL,
                       charset);

  var formURI = makeURI(node.form.getAttribute("action"),
                        charset,
                        docURI);

  var spec = formURI.spec;

  var isURLEncoded =
               (node.form.method.toUpperCase() == "POST"
                && (node.form.enctype == "application/x-www-form-urlencoded" ||
                    node.form.enctype == ""));

  var title = gNavigatorBundle.getFormattedString("addKeywordTitleAutoFill",
                                                  [node.ownerDocument.title]);
  var description = PlacesUIUtils.getDescriptionFromDocument(node.ownerDocument);

  var el, type;
  var formData = [];

  function escapeNameValuePair(aName, aValue, aIsFormUrlEncoded) {
    if (aIsFormUrlEncoded)
      return escape(aName + "=" + aValue);
    else
      return escape(aName) + "=" + escape(aValue);
  }

  for (var i=0; i < node.form.elements.length; i++) {
    el = node.form.elements[i];

    if (!el.type) // happens with fieldsets
      continue;

    if (el == node) {
      formData.push((isURLEncoded) ? escapeNameValuePair(el.name, "%s", true) :
                                     // Don't escape "%s", just append
                                     escapeNameValuePair(el.name, "", false) + "%s");
      continue;
    }

    type = el.type.toLowerCase();

    if (((el instanceof HTMLInputElement && el.mozIsTextField(true)) ||
        type == "hidden" || type == "textarea") ||
        ((type == "checkbox" || type == "radio") && el.checked)) {
      formData.push(escapeNameValuePair(el.name, el.value, isURLEncoded));
    } else if (el instanceof HTMLSelectElement && el.selectedIndex >= 0) {
      for (var j=0; j < el.options.length; j++) {
        if (el.options[j].selected)
          formData.push(escapeNameValuePair(el.name, el.options[j].value,
                                            isURLEncoded));
      }
    }
  }

  var postData;

  if (isURLEncoded)
    postData = formData.join("&");
  else
    spec += "?" + formData.join("&");

  PlacesUIUtils.showMinimalAddBookmarkUI(makeURI(spec), title, description, null,
                                         null, null, "", postData, charset);
}

function SwitchDocumentDirection(aWindow) {
  aWindow.document.dir = (aWindow.document.dir == "ltr" ? "rtl" : "ltr");
  for (var run = 0; run < aWindow.frames.length; run++)
    SwitchDocumentDirection(aWindow.frames[run]);
}

function getPluginInfo(pluginElement)
{
  var tagMimetype;
  var pluginsPage;
  if (pluginElement instanceof HTMLAppletElement) {
    tagMimetype = "application/x-java-vm";
  } else {
    if (pluginElement instanceof HTMLObjectElement) {
      pluginsPage = pluginElement.getAttribute("codebase");
    } else {
      pluginsPage = pluginElement.getAttribute("pluginspage");
    }

    // only attempt if a pluginsPage is defined.
    if (pluginsPage) {
      var doc = pluginElement.ownerDocument;
      var docShell = findChildShell(doc, gBrowser.docShell, null);
      try {
        pluginsPage = makeURI(pluginsPage, doc.characterSet, docShell.currentURI).spec;
      } catch (ex) {
        pluginsPage = "";
      }
    }

    tagMimetype = pluginElement.QueryInterface(Components.interfaces.nsIObjectLoadingContent)
                               .actualType;

    if (tagMimetype == "") {
      tagMimetype = pluginElement.type;
    }
  }

  return {mimetype: tagMimetype, pluginsPage: pluginsPage};
}

var gPluginHandler = {

  get CrashSubmit() {
    delete this.CrashSubmit;
    Cu.import("resource://gre/modules/CrashSubmit.jsm", this);
    return this.CrashSubmit;
  },

  get crashReportHelpURL() {
    delete this.crashReportHelpURL;
    let url = formatURL("app.support.baseURL", true);
    url += "plugin-crashed";
    this.crashReportHelpURL = url;
    return this.crashReportHelpURL;
  },

  // Map the plugin's name to a filtered version more suitable for user UI.
  makeNicePluginName : function (aName, aFilename) {
    if (aName == "Shockwave Flash")
      return "Adobe Flash";

    // Clean up the plugin name by stripping off any trailing version numbers
    // or "plugin". EG, "Foo Bar Plugin 1.23_02" --> "Foo Bar"
    let newName = aName.replace(/\bplug-?in\b/i, "").replace(/[\s\d\.\-\_\(\)]+$/, "");
    return newName;
  },

  isTooSmall : function (plugin, overlay) {
    // Is the <object>'s size too small to hold what we want to show?
    let pluginRect = plugin.getBoundingClientRect();
    // XXX bug 446693. The text-shadow on the submitted-report text at
    //     the bottom causes scrollHeight to be larger than it should be.
    let overflows = (overlay.scrollWidth > pluginRect.width) ||
                    (overlay.scrollHeight - 5 > pluginRect.height);
    return overflows;
  },

  addLinkClickCallback: function (linkNode, callbackName /*callbackArgs...*/) {
    // XXX just doing (callback)(arg) was giving a same-origin error. bug?
    let self = this;
    let callbackArgs = Array.prototype.slice.call(arguments).slice(2);
    linkNode.addEventListener("click",
                              function(evt) {
                                if (!evt.isTrusted)
                                  return;
                                evt.preventDefault();
                                if (callbackArgs.length == 0)
                                  callbackArgs = [ evt ];
                                (self[callbackName]).apply(self, callbackArgs);
                              },
                              true);

    linkNode.addEventListener("keydown",
                              function(evt) {
                                if (!evt.isTrusted)
                                  return;
                                if (evt.keyCode == evt.DOM_VK_RETURN) {
                                  evt.preventDefault();
                                  if (callbackArgs.length == 0)
                                    callbackArgs = [ evt ];
                                  evt.preventDefault();
                                  (self[callbackName]).apply(self, callbackArgs);
                                }
                              },
                              true);
  },

  handleEvent : function(event) {
    let self = gPluginHandler;
    let plugin = event.target;
    let hideBarPrefName;

    // We're expecting the target to be a plugin.
    if (!(plugin instanceof Ci.nsIObjectLoadingContent))
      return;

    switch (event.type) {
      case "PluginCrashed":
        self.pluginInstanceCrashed(plugin, event);
        break;

      case "PluginNotFound":
        // For non-object plugin tags, register a click handler to install the
        // plugin. Object tags can, and often do, deal with that themselves,
        // so don't stomp on the page developers toes.
        if (!(plugin instanceof HTMLObjectElement))
          self.addLinkClickCallback(plugin, "installSinglePlugin");
        /* FALLTHRU */
      case "PluginBlocklisted":
      case "PluginOutdated":
        hideBarPrefName = event.type == "PluginOutdated" ?
                                "plugins.hide_infobar_for_outdated_plugin" :
                                "plugins.hide_infobar_for_missing_plugin";
        if (gPrefService.getBoolPref(hideBarPrefName))
          return;

        self.pluginUnavailable(plugin, event.type);
        break;
//@line 6707 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      case "PluginDisabled":
        self.addLinkClickCallback(plugin, "managePlugins");
        break;
    }
  },

  newPluginInstalled : function(event) {
    // browser elements are anonymous so we can't just use target.
    var browser = event.originalTarget;
    // clear the plugin list, now that at least one plugin has been installed
    browser.missingPlugins = null;

    var notificationBox = gBrowser.getNotificationBox(browser);
    var notification = notificationBox.getNotificationWithValue("missing-plugins");
    if (notification)
      notificationBox.removeNotification(notification);

    // reload the browser to make the new plugin show.
    browser.reload();
  },

  // Callback for user clicking on a missing (unsupported) plugin.
  installSinglePlugin: function (aEvent) {
    var missingPluginsArray = {};

    var pluginInfo = getPluginInfo(aEvent.target);
    missingPluginsArray[pluginInfo.mimetype] = pluginInfo;

    openDialog("chrome://mozapps/content/plugins/pluginInstallerWizard.xul",
               "PFSWindow", "chrome,centerscreen,resizable=yes",
               {plugins: missingPluginsArray, browser: gBrowser.selectedBrowser});
  },

  // Callback for user clicking on a disabled plugin
  managePlugins: function (aEvent) {
    BrowserOpenAddonsMgr("addons://list/plugin");
  },

  // Callback for user clicking "submit a report" link
  submitReport : function(pluginDumpID, browserDumpID) {
    // The crash reporter wants a DOM element it can append an IFRAME to,
    // which it uses to submit a form. Let's just give it gBrowser.
    this.CrashSubmit.submit(pluginDumpID, gBrowser, null, null);
    if (browserDumpID)
      this.CrashSubmit.submit(browserDumpID, gBrowser, null, null);
  },

  // Callback for user clicking a "reload page" link
  reloadPage: function (browser) {
    browser.reload();
  },

  // Callback for user clicking the help icon
  openHelpPage: function () {
    openHelpLink("plugin-crashed", false);
  },

  // event listener for missing/blocklisted/outdated/carbonFailure plugins.
  pluginUnavailable: function (plugin, eventType) {
    let browser = gBrowser.getBrowserForDocument(plugin.ownerDocument
                                                       .defaultView.top.document);
    if (!browser.missingPlugins)
      browser.missingPlugins = {};

    var pluginInfo = getPluginInfo(plugin);
    browser.missingPlugins[pluginInfo.mimetype] = pluginInfo;

    var notificationBox = gBrowser.getNotificationBox(browser);

    // Should only display one of these warnings per page.
    // In order of priority, they are: outdated > missing > blocklisted
    let outdatedNotification = notificationBox.getNotificationWithValue("outdated-plugins");
    let blockedNotification  = notificationBox.getNotificationWithValue("blocked-plugins");
    let missingNotification  = notificationBox.getNotificationWithValue("missing-plugins");

    // If there is already an outdated plugin notification then do nothing
    if (outdatedNotification)
      return;

    function showBlocklistInfo() {
      var url = formatURL("extensions.blocklist.detailsURL", true);
      gBrowser.loadOneTab(url, {inBackground: false});
      return true;
    }

    function showOutdatedPluginsInfo() {
      gPrefService.setBoolPref("plugins.update.notifyUser", false);
      var url = formatURL("plugins.update.url", true);
      gBrowser.loadOneTab(url, {inBackground: false});
      return true;
    }

    function showPluginsMissing() {
      // get the urls of missing plugins
      var missingPluginsArray = gBrowser.selectedBrowser.missingPlugins;
      if (missingPluginsArray) {
        openDialog("chrome://mozapps/content/plugins/pluginInstallerWizard.xul",
                   "PFSWindow", "chrome,centerscreen,resizable=yes",
                   {plugins: missingPluginsArray, browser: gBrowser.selectedBrowser});
      }
    }

//@line 6825 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

    let notifications = {
      PluginBlocklisted : {
                            barID   : "blocked-plugins",
                            iconURL : "chrome://mozapps/skin/plugins/notifyPluginBlocked.png",
                            message : gNavigatorBundle.getString("blockedpluginsMessage.title"),
                            buttons : [{
                                         label     : gNavigatorBundle.getString("blockedpluginsMessage.infoButton.label"),
                                         accessKey : gNavigatorBundle.getString("blockedpluginsMessage.infoButton.accesskey"),
                                         popup     : null,
                                         callback  : showBlocklistInfo
                                       },
                                       {
                                         label     : gNavigatorBundle.getString("blockedpluginsMessage.searchButton.label"),
                                         accessKey : gNavigatorBundle.getString("blockedpluginsMessage.searchButton.accesskey"),
                                         popup     : null,
                                         callback  : showOutdatedPluginsInfo
                                      }],
                          },
      PluginOutdated    : {
                            barID   : "outdated-plugins",
                            iconURL : "chrome://mozapps/skin/plugins/notifyPluginOutdated.png",
                            message : gNavigatorBundle.getString("outdatedpluginsMessage.title"),
                            buttons : [{
                                         label     : gNavigatorBundle.getString("outdatedpluginsMessage.updateButton.label"),
                                         accessKey : gNavigatorBundle.getString("outdatedpluginsMessage.updateButton.accesskey"),
                                         popup     : null,
                                         callback  : showOutdatedPluginsInfo
                                      }],
                          },
      PluginNotFound    : {
                            barID   : "missing-plugins",
                            iconURL : "chrome://mozapps/skin/plugins/notifyPluginGeneric.png",
                            message : gNavigatorBundle.getString("missingpluginsMessage.title"),
                            buttons : [{
                                         label     : gNavigatorBundle.getString("missingpluginsMessage.button.label"),
                                         accessKey : gNavigatorBundle.getString("missingpluginsMessage.button.accesskey"),
                                         popup     : null,
                                         callback  : showPluginsMissing
                                      }],
                            },
//@line 6879 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    };
//@line 6895 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    if (eventType == "PluginBlocklisted") {
      if (blockedNotification || missingNotification)
        return;
    }
    else if (eventType == "PluginOutdated") {
      // Cancel any notification about blocklisting/missing plugins
      if (blockedNotification)
        blockedNotification.close();
      if (missingNotification)
        missingNotification.close();
    }
    else if (eventType == "PluginNotFound") {
      if (missingNotification)
        return;

      // Cancel any notification about blocklisting plugins
      if (blockedNotification)
        blockedNotification.close();
    }

    let notify = notifications[eventType];
    notificationBox.appendNotification(notify.message, notify.barID, notify.iconURL,
                                       notificationBox.PRIORITY_WARNING_MEDIUM,
                                       notify.buttons);
  },

  // Crashed-plugin observer. Notified once per plugin crash, before events
  // are dispatched to individual plugin instances.
  pluginCrashed : function(subject, topic, data) {
    let propertyBag = subject;
    if (!(propertyBag instanceof Ci.nsIPropertyBag2) ||
        !(propertyBag instanceof Ci.nsIWritablePropertyBag2))
     return;

//@line 6942 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  },

  // Crashed-plugin event listener. Called for every instance of a
  // plugin in content.
  pluginInstanceCrashed: function (plugin, aEvent) {
    // Ensure the plugin and event are of the right type.
    if (!(aEvent instanceof Ci.nsIDOMDataContainerEvent))
      return;

    let submittedReport = aEvent.getData("submittedCrashReport");
    let doPrompt        = true; // XXX followup for .getData("doPrompt");
    let submitReports   = true; // XXX followup for .getData("submitReports");
    let pluginName      = aEvent.getData("pluginName");
    let pluginFilename  = aEvent.getData("pluginFilename");
    let pluginDumpID    = aEvent.getData("pluginDumpID");
    let browserDumpID   = aEvent.getData("browserDumpID");

    // Remap the plugin name to a more user-presentable form.
    pluginName = this.makeNicePluginName(pluginName, pluginFilename);

    // Force a style flush, so that we ensure our binding is attached.
    plugin.clientTop;

    let messageString = gNavigatorBundle.getFormattedString("crashedpluginsMessage.title", [pluginName]);

    //
    // Configure the crashed-plugin placeholder.
    //
    let doc = plugin.ownerDocument;
    let overlay = doc.getAnonymousElementByAttribute(plugin, "class", "mainBox");

    // The binding has role="link" here, since missing/disabled/blocked
    // plugin UI has a onclick handler on the whole thing. This isn't needed
    // for the plugin-crashed UI, because we use actual HTML links in the text.
    overlay.removeAttribute("role");

    let statusDiv = doc.getAnonymousElementByAttribute(plugin, "class", "submitStatus");
//@line 7043 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

    let crashText = doc.getAnonymousElementByAttribute(plugin, "class", "msg msgCrashed");
    crashText.textContent = messageString;

    let browser = gBrowser.getBrowserForDocument(doc.defaultView.top.document);

    let link = doc.getAnonymousElementByAttribute(plugin, "class", "reloadLink");
    this.addLinkClickCallback(link, "reloadPage", browser);

    let notificationBox = gBrowser.getNotificationBox(browser);

    // Is the <object>'s size too small to hold what we want to show?
    if (this.isTooSmall(plugin, overlay)) {
        // Hide the overlay's contents. Use visibility style, so that it
        // doesn't collapse down to 0x0.
        overlay.style.visibility = "hidden";
        // If another plugin on the page was large enough to show our UI, we
        // don't want to show a notification bar.
        if (!doc.mozNoPluginCrashedNotification)
          showNotificationBar(pluginDumpID, browserDumpID);
    } else {
        // If a previous plugin on the page was too small and resulted in
        // adding a notification bar, then remove it because this plugin
        // instance it big enough to serve as in-content notification.
        hideNotificationBar();
        doc.mozNoPluginCrashedNotification = true;
    }

    function hideNotificationBar() {
      let notification = notificationBox.getNotificationWithValue("plugin-crashed");
      if (notification)
        notificationBox.removeNotification(notification, true);
    }

    function showNotificationBar(pluginDumpID, browserDumpID) {
      // If there's already an existing notification bar, don't do anything.
      let notification = notificationBox.getNotificationWithValue("plugin-crashed");
      if (notification)
        return;

      // Configure the notification bar
      let priority = notificationBox.PRIORITY_WARNING_MEDIUM;
      let iconURL = "chrome://mozapps/skin/plugins/notifyPluginCrashed.png";
      let reloadLabel = gNavigatorBundle.getString("crashedpluginsMessage.reloadButton.label");
      let reloadKey   = gNavigatorBundle.getString("crashedpluginsMessage.reloadButton.accesskey");
      let submitLabel = gNavigatorBundle.getString("crashedpluginsMessage.submitButton.label");
      let submitKey   = gNavigatorBundle.getString("crashedpluginsMessage.submitButton.accesskey");

      let buttons = [{
        label: reloadLabel,
        accessKey: reloadKey,
        popup: null,
        callback: function() { browser.reload(); },
      }];
//@line 7107 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

      let notification = notificationBox.appendNotification(messageString, "plugin-crashed",
                                                            iconURL, priority, buttons);

      // Add the "learn more" link.
      let XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
      let link = notification.ownerDocument.createElementNS(XULNS, "label");
      link.className = "text-link";
      link.setAttribute("value", gNavigatorBundle.getString("crashedpluginsMessage.learnMore"));
      link.href = gPluginHandler.crashReportHelpURL;
      let description = notification.ownerDocument.getAnonymousElementByAttribute(notification, "anonid", "messageText");
      description.appendChild(link);

      // Remove the notfication when the page is reloaded.
      doc.defaultView.top.addEventListener("unload", function() {
        notificationBox.removeNotification(notification);
      }, false);
    }

  }
};

function convertFromUnicode(charset, str)
{
  try {
    var unicodeConverter = Components
       .classes["@mozilla.org/intl/scriptableunicodeconverter"]
       .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    unicodeConverter.charset = charset;
    str = unicodeConverter.ConvertFromUnicode(str);
    return str + unicodeConverter.Finish();
  } catch(ex) {
    return null;
  }
}

/**
 * The Feed Handler object manages discovery of RSS/ATOM feeds in web pages
 * and shows UI when they are discovered.
 */
var FeedHandler = {
  /**
   * The click handler for the Feed icon in the toolbar. Opens the
   * subscription page if user is not given a choice of feeds.
   * (Otherwise the list of available feeds will be presented to the
   * user in a popup menu.)
   */
  onFeedButtonClick: function(event) {
    event.stopPropagation();

    let feeds = gBrowser.selectedBrowser.feeds || [];
    // If there are multiple feeds, the menu will open, so no need to do
    // anything. If there are no feeds, nothing to do either.
    if (feeds.length != 1)
      return;

    if (event.eventPhase == Event.AT_TARGET &&
        (event.button == 0 || event.button == 1)) {
      this.subscribeToFeed(feeds[0].href, event);
    }
  },

 /** Called when the user clicks on the Subscribe to This Page... menu item.
   * Builds a menu of unique feeds associated with the page, and if there
   * is only one, shows the feed inline in the browser window.
   * @param   menuPopup
   *          The feed list menupopup to be populated.
   * @returns true if the menu should be shown, false if there was only
   *          one feed and the feed should be shown inline in the browser
   *          window (do not show the menupopup).
   */
  buildFeedList: function(menuPopup) {
    var feeds = gBrowser.selectedBrowser.feeds;
    if (feeds == null) {
      // XXX hack -- menu opening depends on setting of an "open"
      // attribute, and the menu refuses to open if that attribute is
      // set (because it thinks it's already open).  onpopupshowing gets
      // called after the attribute is unset, and it doesn't get unset
      // if we return false.  so we unset it here; otherwise, the menu
      // refuses to work past this point.
      menuPopup.parentNode.removeAttribute("open");
      return false;
    }

    while (menuPopup.firstChild)
      menuPopup.removeChild(menuPopup.firstChild);

    if (feeds.length <= 1)
      return false;

    // Build the menu showing the available feed choices for viewing.
    for (var i = 0; i < feeds.length; ++i) {
      var feedInfo = feeds[i];
      var menuItem = document.createElement("menuitem");
      var baseTitle = feedInfo.title || feedInfo.href;
      var labelStr = gNavigatorBundle.getFormattedString("feedShowFeedNew", [baseTitle]);
      menuItem.setAttribute("class", "feed-menuitem");
      menuItem.setAttribute("label", labelStr);
      menuItem.setAttribute("feed", feedInfo.href);
      menuItem.setAttribute("tooltiptext", feedInfo.href);
      menuItem.setAttribute("crop", "center");
      menuPopup.appendChild(menuItem);
    }
    return true;
  },

  /**
   * Subscribe to a given feed.  Called when
   *   1. Page has a single feed and user clicks feed icon in location bar
   *   2. Page has a single feed and user selects Subscribe menu item
   *   3. Page has multiple feeds and user selects from feed icon popup
   *   4. Page has multiple feeds and user selects from Subscribe submenu
   * @param   href
   *          The feed to subscribe to. May be null, in which case the
   *          event target's feed attribute is examined.
   * @param   event
   *          The event this method is handling. Used to decide where
   *          to open the preview UI. (Optional, unless href is null)
   */
  subscribeToFeed: function(href, event) {
    // Just load the feed in the content area to either subscribe or show the
    // preview UI
    if (!href)
      href = event.target.getAttribute("feed");
    urlSecurityCheck(href, gBrowser.contentPrincipal,
                     Ci.nsIScriptSecurityManager.DISALLOW_INHERIT_PRINCIPAL);
    var feedURI = makeURI(href, document.characterSet);
    // Use the feed scheme so X-Moz-Is-Feed will be set
    // The value doesn't matter
    if (/^https?/.test(feedURI.scheme))
      href = "feed:" + href;
    this.loadFeed(href, event);
  },

  loadFeed: function(href, event) {
    var feeds = gBrowser.selectedBrowser.feeds;
    try {
      openUILink(href, event, false, true, false, null);
    }
    finally {
      // We might default to a livebookmarks modal dialog,
      // so reset that if the user happens to click it again
      gBrowser.selectedBrowser.feeds = feeds;
    }
  },

  get _feedMenuitem() {
    delete this._feedMenuitem;
    return this._feedMenuitem = document.getElementById("singleFeedMenuitemState");
  },

  get _feedMenupopup() {
    delete this._feedMenupopup;
    return this._feedMenupopup = document.getElementById("multipleFeedsMenuState");
  },

  /**
   * Update the browser UI to show whether or not feeds are available when
   * a page is loaded or the user switches tabs to a page that has feeds.
   */
  updateFeeds: function() {
    clearTimeout(this._updateFeedTimeout);

    var feeds = gBrowser.selectedBrowser.feeds;
    var haveFeeds = feeds && feeds.length > 0;

    var feedButton = document.getElementById("feed-button");
    if (feedButton)
      feedButton.disabled = !haveFeeds;

    if (!haveFeeds) {
      this._feedMenuitem.setAttribute("disabled", "true");
      this._feedMenuitem.removeAttribute("hidden");
      this._feedMenupopup.setAttribute("hidden", "true");
      return;
    }

    if (feeds.length > 1) {
      this._feedMenuitem.setAttribute("hidden", "true");
      this._feedMenupopup.removeAttribute("hidden");
    } else {
      this._feedMenuitem.setAttribute("feed", feeds[0].href);
      this._feedMenuitem.removeAttribute("disabled");
      this._feedMenuitem.removeAttribute("hidden");
      this._feedMenupopup.setAttribute("hidden", "true");
    }
  },

  addFeed: function(link, targetDoc) {
    // find which tab this is for, and set the attribute on the browser
    var browserForLink = gBrowser.getBrowserForDocument(targetDoc);
    if (!browserForLink) {
      // ignore feeds loaded in subframes (see bug 305472)
      return;
    }

    if (!browserForLink.feeds)
      browserForLink.feeds = [];

    browserForLink.feeds.push({ href: link.href, title: link.title });

    // If this addition was for the current browser, update the UI. For
    // background browsers, we'll update on tab switch.
    if (browserForLink == gBrowser.selectedBrowser) {
      // Batch updates to avoid updating the UI for multiple onLinkAdded events
      // fired within 100ms of each other.
      clearTimeout(this._updateFeedTimeout);
      this._updateFeedTimeout = setTimeout(this.updateFeeds.bind(this), 100);
    }
  }
};

/**
 * Re-open a closed tab.
 * @param aIndex
 *        The index of the tab (via nsSessionStore.getClosedTabData)
 * @returns a reference to the reopened tab.
 */
function undoCloseTab(aIndex) {
  // wallpaper patch to prevent an unnecessary blank tab (bug 343895)
  var blankTabToRemove = null;
  if (gBrowser.tabs.length == 1 &&
      !gPrefService.getBoolPref("browser.tabs.autoHide") &&
      isTabEmpty(gBrowser.selectedTab))
    blankTabToRemove = gBrowser.selectedTab;

  var tab = null;
  var ss = Cc["@mozilla.org/browser/sessionstore;1"].
           getService(Ci.nsISessionStore);
  if (ss.getClosedTabCount(window) > (aIndex || 0)) {
    TabView.prepareUndoCloseTab(blankTabToRemove);
    tab = ss.undoCloseTab(window, aIndex || 0);
    TabView.afterUndoCloseTab();

    if (blankTabToRemove)
      gBrowser.removeTab(blankTabToRemove);
  }

  return tab;
}

/**
 * Re-open a closed window.
 * @param aIndex
 *        The index of the window (via nsSessionStore.getClosedWindowData)
 * @returns a reference to the reopened window.
 */
function undoCloseWindow(aIndex) {
  let ss = Cc["@mozilla.org/browser/sessionstore;1"].
           getService(Ci.nsISessionStore);
  let window = null;
  if (ss.getClosedWindowCount() > (aIndex || 0))
    window = ss.undoCloseWindow(aIndex || 0);

  return window;
}

/*
 * Determines if a tab is "empty", usually used in the context of determining
 * if it's ok to close the tab.
 */
function isTabEmpty(aTab) {
  let browser = aTab.linkedBrowser;
  return browser.sessionHistory.count < 2 &&
         browser.currentURI.spec == "about:blank" &&
         !browser.contentDocument.body.hasChildNodes() &&
         !aTab.hasAttribute("busy");
}

//@line 7377 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
function BrowserOpenSyncTabs() {
  switchToTabHavingURI("about:sync-tabs", true);
}
//@line 7381 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"

/**
 * Format a URL
 * eg:
 * echo formatURL("https://addons.mozilla.org/%LOCALE%/%APP%/%VERSION%/");
 * > https://addons.mozilla.org/en-US/firefox/3.0a1/
 *
 * Currently supported built-ins are LOCALE, APP, and any value from nsIXULAppInfo, uppercased.
 */
function formatURL(aFormat, aIsPref) {
  var formatter = Cc["@mozilla.org/toolkit/URLFormatterService;1"].getService(Ci.nsIURLFormatter);
  return aIsPref ? formatter.formatURLPref(aFormat) : formatter.formatURL(aFormat);
}

/**
 * Utility object to handle manipulations of the identity indicators in the UI
 */
var gIdentityHandler = {
  // Mode strings used to control CSS display
  IDENTITY_MODE_IDENTIFIED       : "verifiedIdentity", // High-quality identity information
  IDENTITY_MODE_DOMAIN_VERIFIED  : "verifiedDomain",   // Minimal SSL CA-signed domain verification
  IDENTITY_MODE_UNKNOWN          : "unknownIdentity",  // No trusted identity information
  IDENTITY_MODE_MIXED_CONTENT    : "unknownIdentity mixedContent",  // SSL with unauthenticated content
  IDENTITY_MODE_CHROMEUI         : "chromeUI",         // Part of the product's UI

  // Cache the most recent SSLStatus and Location seen in checkIdentity
  _lastStatus : null,
  _lastLocation : null,
  _mode : "unknownIdentity",

  // smart getters
  get _encryptionLabel () {
    delete this._encryptionLabel;
    this._encryptionLabel = {};
    this._encryptionLabel[this.IDENTITY_MODE_DOMAIN_VERIFIED] =
      gNavigatorBundle.getString("identity.encrypted");
    this._encryptionLabel[this.IDENTITY_MODE_IDENTIFIED] =
      gNavigatorBundle.getString("identity.encrypted");
    this._encryptionLabel[this.IDENTITY_MODE_UNKNOWN] =
      gNavigatorBundle.getString("identity.unencrypted");
    this._encryptionLabel[this.IDENTITY_MODE_MIXED_CONTENT] =
      gNavigatorBundle.getString("identity.mixed_content");
    return this._encryptionLabel;
  },
  get _identityPopup () {
    delete this._identityPopup;
    return this._identityPopup = document.getElementById("identity-popup");
  },
  get _identityBox () {
    delete this._identityBox;
    return this._identityBox = document.getElementById("identity-box");
  },
  get _identityPopupContentBox () {
    delete this._identityPopupContentBox;
    return this._identityPopupContentBox =
      document.getElementById("identity-popup-content-box");
  },
  get _identityPopupContentHost () {
    delete this._identityPopupContentHost;
    return this._identityPopupContentHost =
      document.getElementById("identity-popup-content-host");
  },
  get _identityPopupContentOwner () {
    delete this._identityPopupContentOwner;
    return this._identityPopupContentOwner =
      document.getElementById("identity-popup-content-owner");
  },
  get _identityPopupContentSupp () {
    delete this._identityPopupContentSupp;
    return this._identityPopupContentSupp =
      document.getElementById("identity-popup-content-supplemental");
  },
  get _identityPopupContentVerif () {
    delete this._identityPopupContentVerif;
    return this._identityPopupContentVerif =
      document.getElementById("identity-popup-content-verifier");
  },
  get _identityPopupEncLabel () {
    delete this._identityPopupEncLabel;
    return this._identityPopupEncLabel =
      document.getElementById("identity-popup-encryption-label");
  },
  get _identityIconLabel () {
    delete this._identityIconLabel;
    return this._identityIconLabel = document.getElementById("identity-icon-label");
  },
  get _overrideService () {
    delete this._overrideService;
    return this._overrideService = Cc["@mozilla.org/security/certoverride;1"]
                                     .getService(Ci.nsICertOverrideService);
  },
  get _identityIconCountryLabel () {
    delete this._identityIconCountryLabel;
    return this._identityIconCountryLabel = document.getElementById("identity-icon-country-label");
  },

  /**
   * Rebuild cache of the elements that may or may not exist depending
   * on whether there's a location bar.
   */
  _cacheElements : function() {
    delete this._identityBox;
    delete this._identityIconLabel;
    delete this._identityIconCountryLabel;
    this._identityBox = document.getElementById("identity-box");
    this._identityIconLabel = document.getElementById("identity-icon-label");
    this._identityIconCountryLabel = document.getElementById("identity-icon-country-label");
  },

  /**
   * Handler for mouseclicks on the "More Information" button in the
   * "identity-popup" panel.
   */
  handleMoreInfoClick : function(event) {
    displaySecurityInfo();
    event.stopPropagation();
  },

  /**
   * Helper to parse out the important parts of _lastStatus (of the SSL cert in
   * particular) for use in constructing identity UI strings
  */
  getIdentityData : function() {
    var result = {};
    var status = this._lastStatus.QueryInterface(Components.interfaces.nsISSLStatus);
    var cert = status.serverCert;

    // Human readable name of Subject
    result.subjectOrg = cert.organization;

    // SubjectName fields, broken up for individual access
    if (cert.subjectName) {
      result.subjectNameFields = {};
      cert.subjectName.split(",").forEach(function(v) {
        var field = v.split("=");
        this[field[0]] = field[1];
      }, result.subjectNameFields);

      // Call out city, state, and country specifically
      result.city = result.subjectNameFields.L;
      result.state = result.subjectNameFields.ST;
      result.country = result.subjectNameFields.C;
    }

    // Human readable name of Certificate Authority
    result.caOrg =  cert.issuerOrganization || cert.issuerCommonName;
    result.cert = cert;

    return result;
  },

  /**
   * Determine the identity of the page being displayed by examining its SSL cert
   * (if available) and, if necessary, update the UI to reflect this.  Intended to
   * be called by onSecurityChange
   *
   * @param PRUint32 state
   * @param JS Object location that mirrors an nsLocation (i.e. has .host and
   *                           .hostname and .port)
   */
  checkIdentity : function(state, location) {
    var currentStatus = gBrowser.securityUI
                                .QueryInterface(Components.interfaces.nsISSLStatusProvider)
                                .SSLStatus;
    this._lastStatus = currentStatus;
    this._lastLocation = location;

    let nsIWebProgressListener = Ci.nsIWebProgressListener;
    if (location.protocol == "chrome:" || location.protocol == "about:")
      this.setMode(this.IDENTITY_MODE_CHROMEUI);
    else if (state & nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL)
      this.setMode(this.IDENTITY_MODE_IDENTIFIED);
    else if (state & nsIWebProgressListener.STATE_SECURE_HIGH)
      this.setMode(this.IDENTITY_MODE_DOMAIN_VERIFIED);
    else if (state & nsIWebProgressListener.STATE_IS_BROKEN)
      this.setMode(this.IDENTITY_MODE_MIXED_CONTENT);
    else
      this.setMode(this.IDENTITY_MODE_UNKNOWN);
  },

  /**
   * Return the eTLD+1 version of the current hostname
   */
  getEffectiveHost : function() {
    // Cache the eTLDService if this is our first time through
    if (!this._eTLDService)
      this._eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"]
                         .getService(Ci.nsIEffectiveTLDService);
    if (!this._IDNService)
      this._IDNService = Cc["@mozilla.org/network/idn-service;1"]
                         .getService(Ci.nsIIDNService);
    try {
      let baseDomain =
        this._eTLDService.getBaseDomainFromHost(this._lastLocation.hostname);
      return this._IDNService.convertToDisplayIDN(baseDomain, {});
    } catch (e) {
      // If something goes wrong (e.g. hostname is an IP address) just fail back
      // to the full domain.
      return this._lastLocation.hostname;
    }
  },

  /**
   * Update the UI to reflect the specified mode, which should be one of the
   * IDENTITY_MODE_* constants.
   */
  setMode : function(newMode) {
    if (!this._identityBox) {
      // No identity box means the identity box is not visible, in which
      // case there's nothing to do.
      return;
    }

    this._identityBox.className = newMode;
    this.setIdentityMessages(newMode);

    // Update the popup too, if it's open
    if (this._identityPopup.state == "open")
      this.setPopupMessages(newMode);

    this._mode = newMode;
  },

  /**
   * Set up the messages for the primary identity UI based on the specified mode,
   * and the details of the SSL cert, where applicable
   *
   * @param newMode The newly set identity mode.  Should be one of the IDENTITY_MODE_* constants.
   */
  setIdentityMessages : function(newMode) {
    if (newMode == this.IDENTITY_MODE_DOMAIN_VERIFIED) {
      var iData = this.getIdentityData();

      // It would be sort of nice to use the CN= field in the cert, since that's
      // typically what we want here, but thanks to x509 certs being extensible,
      // it's not the only place you have to check, there can be more than one domain,
      // et cetera, ad nauseum.  We know the cert is valid for location.host, so
      // let's just use that. Check the pref to determine how much of the verified
      // hostname to show
      var icon_label = "";
      var icon_country_label = "";
      var icon_labels_dir = "ltr";
      switch (gPrefService.getIntPref("browser.identity.ssl_domain_display")) {
        case 2 : // Show full domain
          icon_label = this._lastLocation.hostname;
          break;
        case 1 : // Show eTLD.
          icon_label = this.getEffectiveHost();
      }

      // We need a port number for all lookups.  If one hasn't been specified, use
      // the https default
      var lookupHost = this._lastLocation.host;
      if (lookupHost.indexOf(':') < 0)
        lookupHost += ":443";

      // Verifier is either the CA Org, for a normal cert, or a special string
      // for certs that are trusted because of a security exception.
      var tooltip = gNavigatorBundle.getFormattedString("identity.identified.verifier",
                                                        [iData.caOrg]);

      // Check whether this site is a security exception. XPConnect does the right
      // thing here in terms of converting _lastLocation.port from string to int, but
      // the overrideService doesn't like undefined ports, so make sure we have
      // something in the default case (bug 432241).
      if (this._overrideService.hasMatchingOverride(this._lastLocation.hostname,
                                                    (this._lastLocation.port || 443),
                                                    iData.cert, {}, {}))
        tooltip = gNavigatorBundle.getString("identity.identified.verified_by_you");
    }
    else if (newMode == this.IDENTITY_MODE_IDENTIFIED) {
      // If it's identified, then we can populate the dialog with credentials
      iData = this.getIdentityData();
      tooltip = gNavigatorBundle.getFormattedString("identity.identified.verifier",
                                                    [iData.caOrg]);
      icon_label = iData.subjectOrg;
      if (iData.country)
        icon_country_label = "(" + iData.country + ")";
      // If the organization name starts with an RTL character, then
      // swap the positions of the organization and country code labels.
      // The Unicode ranges reflect the definition of the UCS2_CHAR_IS_BIDI
      // macro in intl/unicharutil/util/nsBidiUtils.h. When bug 218823 gets
      // fixed, this test should be replaced by one adhering to the
      // Unicode Bidirectional Algorithm proper (at the paragraph level).
      icon_labels_dir = /^[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/.test(icon_label) ?
                        "rtl" : "ltr";
    }
    else if (newMode == this.IDENTITY_MODE_CHROMEUI) {
      icon_label = "";
      tooltip = "";
      icon_country_label = "";
      icon_labels_dir = "ltr";
    }
    else {
      tooltip = gNavigatorBundle.getString("identity.unknown.tooltip");
      icon_label = "";
      icon_country_label = "";
      icon_labels_dir = "ltr";
    }

    // Push the appropriate strings out to the UI
    this._identityBox.tooltipText = tooltip;
    this._identityIconLabel.value = icon_label;
    this._identityIconCountryLabel.value = icon_country_label;
    // Set cropping and direction
    this._identityIconLabel.crop = icon_country_label ? "end" : "center";
    this._identityIconLabel.parentNode.style.direction = icon_labels_dir;
    // Hide completely if the organization label is empty
    this._identityIconLabel.parentNode.collapsed = icon_label ? false : true;
  },

  /**
   * Set up the title and content messages for the identity message popup,
   * based on the specified mode, and the details of the SSL cert, where
   * applicable
   *
   * @param newMode The newly set identity mode.  Should be one of the IDENTITY_MODE_* constants.
   */
  setPopupMessages : function(newMode) {

    this._identityPopup.className = newMode;
    this._identityPopupContentBox.className = newMode;

    // Set the static strings up front
    this._identityPopupEncLabel.textContent = this._encryptionLabel[newMode];

    // Initialize the optional strings to empty values
    var supplemental = "";
    var verifier = "";

    if (newMode == this.IDENTITY_MODE_DOMAIN_VERIFIED) {
      var iData = this.getIdentityData();
      var host = this.getEffectiveHost();
      var owner = gNavigatorBundle.getString("identity.ownerUnknown2");
      verifier = this._identityBox.tooltipText;
      supplemental = "";
    }
    else if (newMode == this.IDENTITY_MODE_IDENTIFIED) {
      // If it's identified, then we can populate the dialog with credentials
      iData = this.getIdentityData();
      host = this.getEffectiveHost();
      owner = iData.subjectOrg;
      verifier = this._identityBox.tooltipText;

      // Build an appropriate supplemental block out of whatever location data we have
      if (iData.city)
        supplemental += iData.city + "\n";
      if (iData.state && iData.country)
        supplemental += gNavigatorBundle.getFormattedString("identity.identified.state_and_country",
                                                            [iData.state, iData.country]);
      else if (iData.state) // State only
        supplemental += iData.state;
      else if (iData.country) // Country only
        supplemental += iData.country;
    }
    else {
      // These strings will be hidden in CSS anyhow
      host = "";
      owner = "";
    }

    // Push the appropriate strings out to the UI
    this._identityPopupContentHost.textContent = host;
    this._identityPopupContentOwner.textContent = owner;
    this._identityPopupContentSupp.textContent = supplemental;
    this._identityPopupContentVerif.textContent = verifier;
  },

  hideIdentityPopup : function() {
    this._identityPopup.hidePopup();
  },

  /**
   * Click handler for the identity-box element in primary chrome.
   */
  handleIdentityButtonEvent : function(event) {

    event.stopPropagation();

    if ((event.type == "click" && event.button != 0) ||
        (event.type == "keypress" && event.charCode != KeyEvent.DOM_VK_SPACE &&
         event.keyCode != KeyEvent.DOM_VK_RETURN))
      return; // Left click, space or enter only

    // Revert the contents of the location bar, see bug 406779
    gURLBar.handleRevert();

    if (this._mode == this.IDENTITY_MODE_CHROMEUI)
      return;

    // Make sure that the display:none style we set in xul is removed now that
    // the popup is actually needed
    this._identityPopup.hidden = false;

    // Tell the popup to consume dismiss clicks, to avoid bug 395314
    this._identityPopup.popupBoxObject
        .setConsumeRollupEvent(Ci.nsIPopupBoxObject.ROLLUP_CONSUME);

    // Update the popup strings
    this.setPopupMessages(this._identityBox.className);

    // Add the "open" attribute to the identity box for styling
    this._identityBox.setAttribute("open", "true");
    var self = this;
    this._identityPopup.addEventListener("popuphidden", function (e) {
      e.currentTarget.removeEventListener("popuphidden", arguments.callee, false);
      self._identityBox.removeAttribute("open");
    }, false);

    // Now open the popup, anchored off the primary chrome element
    this._identityPopup.openPopup(this._identityBox, "bottomcenter topleft");
  },

  onDragStart: function (event) {
    if (gURLBar.getAttribute("pageproxystate") != "valid")
      return;

    var value = content.location.href;
    var urlString = value + "\n" + content.document.title;
    var htmlString = "<a href=\"" + value + "\">" + value + "</a>";

    var dt = event.dataTransfer;
    dt.setData("text/x-moz-url", urlString);
    dt.setData("text/uri-list", value);
    dt.setData("text/plain", value);
    dt.setData("text/html", htmlString);
    dt.addElement(event.currentTarget);
  }
};

let DownloadMonitorPanel = {
  //////////////////////////////////////////////////////////////////////////////
  //// DownloadMonitorPanel Member Variables

  _panel: null,
  _activeStr: null,
  _pausedStr: null,
  _lastTime: Infinity,
  _listening: false,

  get DownloadUtils() {
    delete this.DownloadUtils;
    Cu.import("resource://gre/modules/DownloadUtils.jsm", this);
    return this.DownloadUtils;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// DownloadMonitorPanel Public Methods

  /**
   * Initialize the status panel and member variables
   */
  init: function DMP_init() {
    // Initialize "private" member variables
    this._panel = document.getElementById("download-monitor");

    // Cache the status strings
    this._activeStr = gNavigatorBundle.getString("activeDownloads1");
    this._pausedStr = gNavigatorBundle.getString("pausedDownloads1");

    gDownloadMgr.addListener(this);
    this._listening = true;

    this.updateStatus();
  },

  uninit: function DMP_uninit() {
    if (this._listening)
      gDownloadMgr.removeListener(this);
  },

  inited: function DMP_inited() {
    return this._panel != null;
  },

  /**
   * Update status based on the number of active and paused downloads
   */
  updateStatus: function DMP_updateStatus() {
    if (!this.inited())
      return;

    let numActive = gDownloadMgr.activeDownloadCount;

    // Hide the panel and reset the "last time" if there's no downloads
    if (numActive == 0) {
      this._panel.hidden = true;
      this._lastTime = Infinity;

      return;
    }

    // Find the download with the longest remaining time
    let numPaused = 0;
    let maxTime = -Infinity;
    let dls = gDownloadMgr.activeDownloads;
    while (dls.hasMoreElements()) {
      let dl = dls.getNext().QueryInterface(Ci.nsIDownload);
      if (dl.state == gDownloadMgr.DOWNLOAD_DOWNLOADING) {
        // Figure out if this download takes longer
        if (dl.speed > 0 && dl.size > 0)
          maxTime = Math.max(maxTime, (dl.size - dl.amountTransferred) / dl.speed);
        else
          maxTime = -1;
      }
      else if (dl.state == gDownloadMgr.DOWNLOAD_PAUSED)
        numPaused++;
    }

    // Get the remaining time string and last sec for time estimation
    let timeLeft;
    [timeLeft, this._lastTime] =
      this.DownloadUtils.getTimeLeft(maxTime, this._lastTime);

    // Figure out how many downloads are currently downloading
    let numDls = numActive - numPaused;
    let status = this._activeStr;

    // If all downloads are paused, show the paused message instead
    if (numDls == 0) {
      numDls = numPaused;
      status = this._pausedStr;
    }

    // Get the correct plural form and insert the number of downloads and time
    // left message if necessary
    status = PluralForm.get(numDls, status);
    status = status.replace("#1", numDls);
    status = status.replace("#2", timeLeft);

    // Update the panel and show it
    this._panel.label = status;
    this._panel.hidden = false;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsIDownloadProgressListener

  /**
   * Update status for download progress changes
   */
  onProgressChange: function() {
    this.updateStatus();
  },

  /**
   * Update status for download state changes
   */
  onDownloadStateChange: function() {
    this.updateStatus();
  },

  onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus, aDownload) {
  },

  onSecurityChange: function(aWebProgress, aRequest, aState, aDownload) {
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsISupports

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDownloadProgressListener]),
};

function getNotificationBox(aWindow) {
  var foundBrowser = gBrowser.getBrowserForDocument(aWindow.document);
  if (foundBrowser)
    return gBrowser.getNotificationBox(foundBrowser)
  return null;
};

function getTabModalPromptBox(aWindow) {
  var foundBrowser = gBrowser.getBrowserForDocument(aWindow.document);
  if (foundBrowser)
    return gBrowser.getTabModalPromptBox(foundBrowser);
  return null;
};

/* DEPRECATED */
function getBrowser() gBrowser;
function getNavToolbox() gNavToolbox;

let gPrivateBrowsingUI = {
  _privateBrowsingService: null,
  _searchBarValue: null,
  _findBarValue: null,
  _inited: false,

  init: function PBUI_init() {
    Services.obs.addObserver(this, "private-browsing", false);
    Services.obs.addObserver(this, "private-browsing-transition-complete", false);

    this._privateBrowsingService = Cc["@mozilla.org/privatebrowsing;1"].
                                   getService(Ci.nsIPrivateBrowsingService);

    if (this.privateBrowsingEnabled)
      this.onEnterPrivateBrowsing(true);

    this._inited = true;
  },

  uninit: function PBUI_unint() {
    if (!this._inited)
      return;

    Services.obs.removeObserver(this, "private-browsing");
    Services.obs.removeObserver(this, "private-browsing-transition-complete");
  },

  get _disableUIOnToggle() {
    if (this._privateBrowsingService.autoStarted)
      return false;

    try {
      return !gPrefService.getBoolPref("browser.privatebrowsing.keep_current_session");
    }
    catch (e) {
      return true;
    }
  },

  observe: function PBUI_observe(aSubject, aTopic, aData) {
    if (aTopic == "private-browsing") {
      if (aData == "enter")
        this.onEnterPrivateBrowsing();
      else if (aData == "exit")
        this.onExitPrivateBrowsing();
    }
    else if (aTopic == "private-browsing-transition-complete") {
      if (this._disableUIOnToggle) {
        document.getElementById("Tools:PrivateBrowsing")
                .removeAttribute("disabled");
      }
    }
  },

  _shouldEnter: function PBUI__shouldEnter() {
    try {
      // Never prompt if the session is not going to be closed, or if user has
      // already requested not to be prompted.
      if (gPrefService.getBoolPref("browser.privatebrowsing.dont_prompt_on_enter") ||
          gPrefService.getBoolPref("browser.privatebrowsing.keep_current_session"))
        return true;
    }
    catch (ex) { }

    var bundleService = Cc["@mozilla.org/intl/stringbundle;1"].
                        getService(Ci.nsIStringBundleService);
    var pbBundle = bundleService.createBundle("chrome://browser/locale/browser.properties");
    var brandBundle = bundleService.createBundle("chrome://branding/locale/brand.properties");

    var appName = brandBundle.GetStringFromName("brandShortName");
//@line 8038 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    var dialogTitle = pbBundle.GetStringFromName("privateBrowsingDialogTitle");
    var header = pbBundle.GetStringFromName("privateBrowsingMessageHeader") + "\n\n";
//@line 8041 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    var message = pbBundle.formatStringFromName("privateBrowsingMessage", [appName], 1);

    var ps = Services.prompt;

    var flags = ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_0 +
                ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_1 +
                ps.BUTTON_POS_0_DEFAULT;

    var neverAsk = {value:false};
    var button0Title = pbBundle.GetStringFromName("privateBrowsingYesTitle");
    var button1Title = pbBundle.GetStringFromName("privateBrowsingNoTitle");
    var neverAskText = pbBundle.GetStringFromName("privateBrowsingNeverAsk");

    var result;
    var choice = ps.confirmEx(null, dialogTitle, header + message,
                              flags, button0Title, button1Title, null,
                              neverAskText, neverAsk);

    switch (choice) {
    case 0: // Start Private Browsing
      result = true;
      if (neverAsk.value)
        gPrefService.setBoolPref("browser.privatebrowsing.dont_prompt_on_enter", true);
      break;
    case 1: // Keep
      result = false;
      break;
    }

    return result;
  },

  onEnterPrivateBrowsing: function PBUI_onEnterPrivateBrowsing(aOnWindowOpen) {
    if (BrowserSearch.searchBar)
      this._searchBarValue = BrowserSearch.searchBar.textbox.value;

    if (gFindBarInitialized)
      this._findBarValue = gFindBar.getElement("findbar-textbox").value;

    this._setPBMenuTitle("stop");

    document.getElementById("menu_import").setAttribute("disabled", "true");

    // Disable the Clear Recent History... menu item when in PB mode
    // temporary fix until bug 463607 is fixed
    document.getElementById("Tools:Sanitize").setAttribute("disabled", "true");

    let docElement = document.documentElement;
    if (this._privateBrowsingService.autoStarted) {
      // Disable the menu item in auto-start mode
      document.getElementById("privateBrowsingItem")
              .setAttribute("disabled", "true");
//@line 8094 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      document.getElementById("appmenu_privateBrowsing")
              .setAttribute("disabled", "true");
//@line 8097 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
      document.getElementById("Tools:PrivateBrowsing")
              .setAttribute("disabled", "true");
      if (window.location.href == getBrowserURL())
        docElement.setAttribute("privatebrowsingmode", "permanent");
    }
    else if (window.location.href == getBrowserURL()) {
      // Adjust the window's title
      docElement.setAttribute("title",
        docElement.getAttribute("title_privatebrowsing"));
      docElement.setAttribute("titlemodifier",
        docElement.getAttribute("titlemodifier_privatebrowsing"));
      docElement.setAttribute("privatebrowsingmode", "temporary");
      gBrowser.updateTitlebar();
    }

    if (!aOnWindowOpen && this._disableUIOnToggle)
      document.getElementById("Tools:PrivateBrowsing")
              .setAttribute("disabled", "true");
  },

  onExitPrivateBrowsing: function PBUI_onExitPrivateBrowsing() {
    if (BrowserSearch.searchBar) {
      let searchBox = BrowserSearch.searchBar.textbox;
      searchBox.reset();
      if (this._searchBarValue) {
        searchBox.value = this._searchBarValue;
        this._searchBarValue = null;
      }
    }

    if (gURLBar) {
      gURLBar.editor.transactionManager.clear();
    }

    document.getElementById("menu_import").removeAttribute("disabled");

    // Re-enable the Clear Recent History... menu item on exit of PB mode
    // temporary fix until bug 463607 is fixed
    document.getElementById("Tools:Sanitize").removeAttribute("disabled");

    if (gFindBarInitialized) {
      let findbox = gFindBar.getElement("findbar-textbox");
      findbox.reset();
      if (this._findBarValue) {
        findbox.value = this._findBarValue;
        this._findBarValue = null;
      }
    }

    this._setPBMenuTitle("start");

    if (window.location.href == getBrowserURL()) {
      // Adjust the window's title
      let docElement = document.documentElement;
      docElement.setAttribute("title",
        docElement.getAttribute("title_normal"));
      docElement.setAttribute("titlemodifier",
        docElement.getAttribute("titlemodifier_normal"));
      docElement.removeAttribute("privatebrowsingmode");
    }

    // Enable the menu item in after exiting the auto-start mode
    document.getElementById("privateBrowsingItem")
            .removeAttribute("disabled");
//@line 8162 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    document.getElementById("appmenu_privateBrowsing")
            .removeAttribute("disabled");
//@line 8165 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    document.getElementById("Tools:PrivateBrowsing")
            .removeAttribute("disabled");

    gLastOpenDirectory.reset();

    if (this._disableUIOnToggle)
      document.getElementById("Tools:PrivateBrowsing")
              .setAttribute("disabled", "true");
  },

  _setPBMenuTitle: function PBUI__setPBMenuTitle(aMode) {
    let pbMenuItem = document.getElementById("privateBrowsingItem");
    pbMenuItem.setAttribute("label", pbMenuItem.getAttribute(aMode + "label"));
    pbMenuItem.setAttribute("accesskey", pbMenuItem.getAttribute(aMode + "accesskey"));
//@line 8180 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
    let appmenupbMenuItem = document.getElementById("appmenu_privateBrowsing");
    appmenupbMenuItem.setAttribute("label", appmenupbMenuItem.getAttribute(aMode + "label"));
    appmenupbMenuItem.setAttribute("accesskey", appmenupbMenuItem.getAttribute(aMode + "accesskey"));
//@line 8184 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  },

  toggleMode: function PBUI_toggleMode() {
    // prompt the users on entering the private mode, if needed
    if (!this.privateBrowsingEnabled)
      if (!this._shouldEnter())
        return;

    this._privateBrowsingService.privateBrowsingEnabled =
      !this.privateBrowsingEnabled;
  },

  get privateBrowsingEnabled() {
    return this._privateBrowsingService.privateBrowsingEnabled;
  }
};

var LightWeightThemeWebInstaller = {
  handleEvent: function (event) {
    switch (event.type) {
      case "InstallBrowserTheme":
      case "PreviewBrowserTheme":
      case "ResetBrowserThemePreview":
        // ignore requests from background tabs
        if (event.target.ownerDocument.defaultView.top != content)
          return;
    }
    switch (event.type) {
      case "InstallBrowserTheme":
        this._installRequest(event);
        break;
      case "PreviewBrowserTheme":
        this._preview(event);
        break;
      case "ResetBrowserThemePreview":
        this._resetPreview(event);
        break;
      case "pagehide":
      case "TabSelect":
        this._resetPreview();
        break;
    }
  },

  get _manager () {
    var temp = {};
    Cu.import("resource://gre/modules/LightweightThemeManager.jsm", temp);
    delete this._manager;
    return this._manager = temp.LightweightThemeManager;
  },

  _installRequest: function (event) {
    var node = event.target;
    var data = this._getThemeFromNode(node);
    if (!data)
      return;

    if (this._isAllowed(node)) {
      this._install(data);
      return;
    }

    var allowButtonText =
      gNavigatorBundle.getString("lwthemeInstallRequest.allowButton");
    var allowButtonAccesskey =
      gNavigatorBundle.getString("lwthemeInstallRequest.allowButton.accesskey");
    var message =
      gNavigatorBundle.getFormattedString("lwthemeInstallRequest.message",
                                          [node.ownerDocument.location.host]);
    var buttons = [{
      label: allowButtonText,
      accessKey: allowButtonAccesskey,
      callback: function () {
        LightWeightThemeWebInstaller._install(data);
      }
    }];

    this._removePreviousNotifications();

    var notificationBox = gBrowser.getNotificationBox();
    var notificationBar =
      notificationBox.appendNotification(message, "lwtheme-install-request", "",
                                         notificationBox.PRIORITY_INFO_MEDIUM,
                                         buttons);
    notificationBar.persistence = 1;
  },

  _install: function (newLWTheme) {
    var previousLWTheme = this._manager.currentTheme;

    var listener = {
      onEnabling: function(aAddon, aRequiresRestart) {
        if (!aRequiresRestart)
          return;

        let messageString = gNavigatorBundle.getFormattedString("lwthemeNeedsRestart.message",
          [aAddon.name], 1);

        let action = {
          label: gNavigatorBundle.getString("lwthemeNeedsRestart.button"),
          accessKey: gNavigatorBundle.getString("lwthemeNeedsRestart.accesskey"),
          callback: function () {
            Application.restart();
          }
        };

        let options = {
          timeout: Date.now() + 30000
        };

        PopupNotifications.show(gBrowser.selectedBrowser, "addon-theme-change",
                                messageString, "addons-notification-icon",
                                action, null, options);
      },

      onEnabled: function(aAddon) {
        LightWeightThemeWebInstaller._postInstallNotification(newLWTheme, previousLWTheme);
      }
    };

    AddonManager.addAddonListener(listener);
    this._manager.currentTheme = newLWTheme;
    AddonManager.removeAddonListener(listener);
  },

  _postInstallNotification: function (newTheme, previousTheme) {
    function text(id) {
      return gNavigatorBundle.getString("lwthemePostInstallNotification." + id);
    }

    var buttons = [{
      label: text("undoButton"),
      accessKey: text("undoButton.accesskey"),
      callback: function () {
        LightWeightThemeWebInstaller._manager.forgetUsedTheme(newTheme.id);
        LightWeightThemeWebInstaller._manager.currentTheme = previousTheme;
      }
    }, {
      label: text("manageButton"),
      accessKey: text("manageButton.accesskey"),
      callback: function () {
        BrowserOpenAddonsMgr("addons://list/theme");
      }
    }];

    this._removePreviousNotifications();

    var notificationBox = gBrowser.getNotificationBox();
    var notificationBar =
      notificationBox.appendNotification(text("message"),
                                         "lwtheme-install-notification", "",
                                         notificationBox.PRIORITY_INFO_MEDIUM,
                                         buttons);
    notificationBar.persistence = 1;
    notificationBar.timeout = Date.now() + 20000; // 20 seconds
  },

  _removePreviousNotifications: function () {
    var box = gBrowser.getNotificationBox();

    ["lwtheme-install-request",
     "lwtheme-install-notification"].forEach(function (value) {
        var notification = box.getNotificationWithValue(value);
        if (notification)
          box.removeNotification(notification);
      });
  },

  _previewWindow: null,
  _preview: function (event) {
    if (!this._isAllowed(event.target))
      return;

    var data = this._getThemeFromNode(event.target);
    if (!data)
      return;

    this._resetPreview();

    this._previewWindow = event.target.ownerDocument.defaultView;
    this._previewWindow.addEventListener("pagehide", this, true);
    gBrowser.tabContainer.addEventListener("TabSelect", this, false);

    this._manager.previewTheme(data);
  },

  _resetPreview: function (event) {
    if (!this._previewWindow ||
        event && !this._isAllowed(event.target))
      return;

    this._previewWindow.removeEventListener("pagehide", this, true);
    this._previewWindow = null;
    gBrowser.tabContainer.removeEventListener("TabSelect", this, false);

    this._manager.resetPreview();
  },

  _isAllowed: function (node) {
    var pm = Services.perms;

    var uri = node.ownerDocument.documentURIObject;
    return pm.testPermission(uri, "install") == pm.ALLOW_ACTION;
  },

  _getThemeFromNode: function (node) {
    return this._manager.parseTheme(node.getAttribute("data-browsertheme"),
                                    node.baseURI);
  }
}

/**
 * Switch to a tab that has a given URI, and focusses its browser window.
 * If a matching tab is in this window, it will be switched to. Otherwise, other
 * windows will be searched.
 *
 * @param aURI
 *        URI to search for
 * @param aOpenNew
 *        True to open a new tab and switch to it, if no existing tab is found.
 *        If no suitable window is found, a new one will be opened.
 * @return True if an existing tab was found, false otherwise
 */
function switchToTabHavingURI(aURI, aOpenNew) {
  // This will switch to the tab in aWindow having aURI, if present.
  function switchIfURIInWindow(aWindow) {
    let browsers = aWindow.gBrowser.browsers;
    for (let i = 0; i < browsers.length; i++) {
      let browser = browsers[i];
      if (browser.currentURI.equals(aURI)) {
        // Focus the matching window & tab
        aWindow.focus();
        aWindow.gBrowser.tabContainer.selectedIndex = i;
        return true;
      }
    }
    return false;
  }

  // This can be passed either nsIURI or a string.
  if (!(aURI instanceof Ci.nsIURI))
    aURI = Services.io.newURI(aURI, null, null);

  let isBrowserWindow = !!window.gBrowser;

  // Prioritise this window.
  if (isBrowserWindow && switchIfURIInWindow(window))
    return true;

  let winEnum = Services.wm.getEnumerator("navigator:browser");
  while (winEnum.hasMoreElements()) {
    let browserWin = winEnum.getNext();
    // Skip closed (but not yet destroyed) windows,
    // and the current window (which was checked earlier).
    if (browserWin.closed || browserWin == window)
      continue;
    if (switchIfURIInWindow(browserWin))
      return true;
  }

  // No opened tab has that url.
  if (aOpenNew) {
    if (isBrowserWindow && isTabEmpty(gBrowser.selectedTab))
      gBrowser.selectedBrowser.loadURI(aURI.spec);
    else
      openUILinkIn(aURI.spec, "tab");
  }

  return false;
}

function restoreLastSession() {
  let ss = Cc["@mozilla.org/browser/sessionstore;1"].
           getService(Ci.nsISessionStore);
  ss.restoreLastSession();
}

var TabContextMenu = {
  contextTab: null,
  updateContextMenu: function updateContextMenu(aPopupMenu) {
    this.contextTab = document.popupNode.localName == "tab" ?
                      document.popupNode : gBrowser.selectedTab;
    let disabled = gBrowser.visibleTabs.length == 1;

    // Enable the "Close Tab" menuitem when the window doesn't close with the last tab.
    document.getElementById("context_closeTab").disabled =
      disabled && gBrowser.tabContainer._closeWindowWithLastTab;

    var menuItems = aPopupMenu.getElementsByAttribute("tbattr", "tabbrowser-multiple");
    for (var i = 0; i < menuItems.length; i++)
      menuItems[i].disabled = disabled;

    // Session store
    document.getElementById("context_undoCloseTab").disabled =
      Cc["@mozilla.org/browser/sessionstore;1"].
      getService(Ci.nsISessionStore).
      getClosedTabCount(window) == 0;

    // Only one of pin/unpin should be visible
    document.getElementById("context_pinTab").hidden = this.contextTab.pinned;
    document.getElementById("context_unpinTab").hidden = !this.contextTab.pinned;

    // Disable "Close other Tabs" if there is only one unpinned tab and
    // hide it when the user rightclicked on a pinned tab.
    let unpinnedTabs = gBrowser.visibleTabs.length - gBrowser._numPinnedTabs;
    document.getElementById("context_closeOtherTabs").disabled = unpinnedTabs <= 1;
    document.getElementById("context_closeOtherTabs").hidden = this.contextTab.pinned;

    // Hide "Bookmark All Tabs" for a pinned tab.  Update its state if visible.
    let bookmarkAllTabs = document.getElementById("context_bookmarkAllTabs");
    bookmarkAllTabs.hidden = this.contextTab.pinned;
    if (!bookmarkAllTabs.hidden)
      PlacesCommandHook.updateBookmarkAllTabsCommand();

    // Hide "Move to Group" if it's a pinned tab.
    document.getElementById("context_tabViewMenu").hidden =
      (this.contextTab.pinned || !TabView.firstUseExperienced);
  }
};

XPCOMUtils.defineLazyGetter(this, "HUDConsoleUI", function () {
  Cu.import("resource:///modules/HUDService.jsm");
  try {
    return HUDService.consoleUI;
  }
  catch (ex) {
    Components.utils.reportError(ex);
  }
});

// Prompt user to restart the browser in safe mode 
function safeModeRestart()
{
  // prompt the user to confirm 
  let promptTitle = gNavigatorBundle.getString("safeModeRestartPromptTitle");
  let promptMessage = 
    gNavigatorBundle.getString("safeModeRestartPromptMessage");
  let rv = Services.prompt.confirm(window, promptTitle, promptMessage);
  if (rv) {
    let environment = Components.classes["@mozilla.org/process/environment;1"].
      getService(Components.interfaces.nsIEnvironment);
    environment.set("MOZ_SAFE_MODE_RESTART", "1");
    Application.restart();
  }
}

/* duplicateTabIn duplicates tab in a place specified by the parameter |where|.
 *
 * |where| can be:
 *  "tab"         new tab
 *  "tabshifted"  same as "tab" but in background if default is to select new
 *                tabs, and vice versa
 *  "window"      new window
 *
 * delta is the offset to the history entry that you want to load.
 */
function duplicateTabIn(aTab, where, delta) {
  let newTab = Cc['@mozilla.org/browser/sessionstore;1']
                 .getService(Ci.nsISessionStore)
                 .duplicateTab(window, aTab, delta);

  var loadInBackground =
    getBoolPref("browser.tabs.loadBookmarksInBackground", false);

  switch (where) {
    case "window":
      gBrowser.hideTab(newTab);
      gBrowser.replaceTabWithWindow(newTab);
      break;
    case "tabshifted":
      loadInBackground = !loadInBackground;
      // fall through
    case "tab":
      if (!loadInBackground)
        gBrowser.selectedTab = newTab;
      break;
  }
}

/*
 * When addons are installed/uninstalled, check and see if the number of items
 * on the add-on bar changed:
 * - If an add-on was installed, incrementing the count, show the bar.
 * - If an add-on was uninstalled, and no more items are left, hide the bar.
 */
let AddonsMgrListener = {
  get addonBar() document.getElementById("addon-bar"),
  get statusBar() document.getElementById("status-bar"),
  getAddonBarItemCount: function() {
    // Take into account the contents of the status bar shim for the count.
    var itemCount = this.statusBar.childNodes.length;

    var defaultOrNoninteractive = this.addonBar.getAttribute("defaultset")
                                      .split(",")
                                      .concat(["separator", "spacer", "spring"]);
    this.addonBar.currentSet.split(",").forEach(function (item) {
      if (defaultOrNoninteractive.indexOf(item) == -1)
        itemCount++;
    });

    return itemCount;
  },
  onInstalling: function(aAddon) {
    this.lastAddonBarCount = this.getAddonBarItemCount();
  },
  onInstalled: function(aAddon) {
    if (this.getAddonBarItemCount() > this.lastAddonBarCount)
      setToolbarVisibility(this.addonBar, true);
  },
  onUninstalling: function(aAddon) {
    this.lastAddonBarCount = this.getAddonBarItemCount();
  },
  onUninstalled: function(aAddon) {
    if (this.getAddonBarItemCount() == 0)
      setToolbarVisibility(this.addonBar, false);
  },
  onEnabling: function(aAddon) this.onInstalling(),
  onEnabled: function(aAddon) this.onInstalled(),
  onDisabling: function(aAddon) this.onUninstalling(),
  onDisabled: function(aAddon) this.onUninstalled(),
};

function toggleAddonBar() {
  let addonBar = document.getElementById("addon-bar");
  setToolbarVisibility(addonBar, addonBar.collapsed);
}

XPCOMUtils.defineLazyGetter(window, "gShowPageResizers", function () {
//@line 8618 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
  return false;
//@line 8620 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/browser.js"
});


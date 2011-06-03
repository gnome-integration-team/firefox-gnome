const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource:///modules/tabview/AllTabs.jsm");
Cu.import("resource:///modules/tabview/utils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "tabviewBundle", function() {
  return Services.strings.
    createBundle("chrome://browser/locale/tabview.properties");
});

function tabviewString(name) tabviewBundle.GetStringFromName('tabview.' + name);

XPCOMUtils.defineLazyGetter(this, "gPrefBranch", function() {
  return Services.prefs.getBranch("browser.panorama.");
});

XPCOMUtils.defineLazyGetter(this, "gPrivateBrowsing", function() {
  return Cc["@mozilla.org/privatebrowsing;1"].
           getService(Ci.nsIPrivateBrowsingService);
});

XPCOMUtils.defineLazyGetter(this, "gNetUtil", function() {
  var obj = {};
  Cu.import("resource://gre/modules/NetUtil.jsm", obj);
  return obj.NetUtil;
});

var gWindow = window.parent;
var gBrowser = gWindow.gBrowser;
var gTabView = gWindow.TabView;
var gTabViewDeck = gWindow.document.getElementById("tab-view-deck");
var gTabViewFrame = gWindow.document.getElementById("tab-view");

//@line 39 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/tabview.js"

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is iq.js.
 *
 * The Initial Developer of the Original Code is the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Tim Taubert <tim.taubert@gmx.de>
 *
 * This file incorporates work from:
 * jQuery JavaScript Library v1.4.2: http://code.jquery.com/jquery-1.4.2.js
 * This incorporated work is covered by the following copyright and
 * permission notice:
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: iq.js
// Various helper functions, in the vein of jQuery.

// ----------
// Function: iQ
// Returns an iQClass object which represents an individual element or a group
// of elements. It works pretty much like jQuery(), with a few exceptions,
// most notably that you can't use strings with complex html,
// just simple tags like '<div>'.
function iQ(selector, context) {
  // The iQ object is actually just the init constructor 'enhanced'
  return new iQClass(selector, context);
};

// A simple way to check for HTML strings or ID strings
// (both of which we optimize for)
let quickExpr = /^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/;

// Match a standalone tag
let rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>)?$/;

// ##########
// Class: iQClass
// The actual class of iQ result objects, representing an individual element
// or a group of elements.
//
// ----------
// Function: iQClass
// You don't call this directly; this is what's called by iQ().
function iQClass(selector, context) {

  // Handle $(""), $(null), or $(undefined)
  if (!selector) {
    return this;
  }

  // Handle $(DOMElement)
  if (selector.nodeType) {
    this.context = selector;
    this[0] = selector;
    this.length = 1;
    return this;
  }

  // The body element only exists once, optimize finding it
  if (selector === "body" && !context) {
    this.context = document;
    this[0] = document.body;
    this.selector = "body";
    this.length = 1;
    return this;
  }

  // Handle HTML strings
  if (typeof selector === "string") {
    // Are we dealing with HTML string or an ID?

    let match = quickExpr.exec(selector);

    // Verify a match, and that no context was specified for #id
    if (match && (match[1] || !context)) {

      // HANDLE $(html) -> $(array)
      if (match[1]) {
        let doc = (context ? context.ownerDocument || context : document);

        // If a single string is passed in and it's a single tag
        // just do a createElement and skip the rest
        let ret = rsingleTag.exec(selector);

        if (ret) {
          if (Utils.isPlainObject(context)) {
            Utils.assert(false, 'does not support HTML creation with context');
          } else {
            selector = [doc.createElement(ret[1])];
          }

        } else {
          Utils.assert(false, 'does not support complex HTML creation');
        }

        return Utils.merge(this, selector);

      // HANDLE $("#id")
      } else {
        let elem = document.getElementById(match[2]);

        if (elem) {
          this.length = 1;
          this[0] = elem;
        }

        this.context = document;
        this.selector = selector;
        return this;
      }

    // HANDLE $("TAG")
    } else if (!context && /^\w+$/.test(selector)) {
      this.selector = selector;
      this.context = document;
      selector = document.getElementsByTagName(selector);
      return Utils.merge(this, selector);

    // HANDLE $(expr, $(...))
    } else if (!context || context.iq) {
      return (context || iQ(document)).find(selector);

    // HANDLE $(expr, context)
    // (which is just equivalent to: $(context).find(expr)
    } else {
      return iQ(context).find(selector);
    }

  // HANDLE $(function)
  // Shortcut for document ready
  } else if (typeof selector == "function") {
    Utils.log('iQ does not support ready functions');
    return null;
  }

  if ("selector" in selector) {
    this.selector = selector.selector;
    this.context = selector.context;
  }

  let ret = this || [];
  if (selector != null) {
    // The window, strings (and functions) also have 'length'
    if (selector.length == null || typeof selector == "string" || selector.setInterval) {
      Array.push(ret, selector);
    } else {
      Utils.merge(ret, selector);
    }
  }
  return ret;
};
  
iQClass.prototype = {

  // Start with an empty selector
  selector: "",

  // The default length of a iQ object is 0
  length: 0,

  // ----------
  // Function: each
  // Execute a callback for every element in the matched set.
  each: function iQClass_each(callback) {
    if (typeof callback != "function") {
      Utils.assert(false, "each's argument must be a function");
      return null;
    }
    for (let i = 0; this[i] != null; i++) {
      callback(this[i]);
    }
    return this;
  },

  // ----------
  // Function: addClass
  // Adds the given class(es) to the receiver.
  addClass: function iQClass_addClass(value) {
    Utils.assertThrow(typeof value == "string" && value,
                      'requires a valid string argument');

    let length = this.length;
    for (let i = 0; i < length; i++) {
      let elem = this[i];
      if (elem.nodeType === 1) {
        value.split(/\s+/).forEach(function(className) {
          elem.classList.add(className);
        });
      }
    }

    return this;
  },

  // ----------
  // Function: removeClass
  // Removes the given class(es) from the receiver.
  removeClass: function iQClass_removeClass(value) {
    if (typeof value != "string" || !value) {
      Utils.assert(false, 'does not support function argument');
      return null;
    }

    let length = this.length;
    for (let i = 0; i < length; i++) {
      let elem = this[i];
      if (elem.nodeType === 1 && elem.className) {
        value.split(/\s+/).forEach(function(className) {
          elem.classList.remove(className);
        });
      }
    }

    return this;
  },

  // ----------
  // Function: hasClass
  // Returns true is the receiver has the given css class.
  hasClass: function iQClass_hasClass(singleClassName) {
    let length = this.length;
    for (let i = 0; i < length; i++) {
      if (this[i].classList.contains(singleClassName)) {
        return true;
      }
    }
    return false;
  },

  // ----------
  // Function: find
  // Searches the receiver and its children, returning a new iQ object with
  // elements that match the given selector.
  find: function iQClass_find(selector) {
    let ret = [];
    let length = 0;

    let l = this.length;
    for (let i = 0; i < l; i++) {
      length = ret.length;
      try {
        Utils.merge(ret, this[i].querySelectorAll(selector));
      } catch(e) {
        Utils.log('iQ.find error (bad selector)', e);
      }

      if (i > 0) {
        // Make sure that the results are unique
        for (let n = length; n < ret.length; n++) {
          for (let r = 0; r < length; r++) {
            if (ret[r] === ret[n]) {
              ret.splice(n--, 1);
              break;
            }
          }
        }
      }
    }

    return iQ(ret);
  },

  // ----------
  // Function: contains
  // Check to see if a given DOM node descends from the receiver.
  contains: function iQClass_contains(selector) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');

    // fast path when querySelector() can be used
    if ('string' == typeof selector)
      return null != this[0].querySelector(selector);

    let object = iQ(selector);
    Utils.assert(object.length <= 1, 'does not yet support multi-objects');

    let elem = object[0];
    if (!elem || !elem.parentNode)
      return false;

    do {
      elem = elem.parentNode;
    } while (elem && this[0] != elem);

    return this[0] == elem;
  },

  // ----------
  // Function: remove
  // Removes the receiver from the DOM.
  remove: function iQClass_remove() {
    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      if (elem.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    }
    return this;
  },

  // ----------
  // Function: empty
  // Removes all of the reciever's children and HTML content from the DOM.
  empty: function iQClass_empty() {
    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
      }
    }
    return this;
  },

  // ----------
  // Function: width
  // Returns the width of the receiver, including padding and border.
  width: function iQClass_width() {
    return Math.floor(this[0].offsetWidth);
  },

  // ----------
  // Function: height
  // Returns the height of the receiver, including padding and border.
  height: function iQClass_height() {
    return Math.floor(this[0].offsetHeight);
  },

  // ----------
  // Function: position
  // Returns an object with the receiver's position in left and top
  // properties.
  position: function iQClass_position() {
    let bounds = this.bounds();
    return new Point(bounds.left, bounds.top);
  },

  // ----------
  // Function: bounds
  // Returns a <Rect> with the receiver's bounds.
  bounds: function iQClass_bounds() {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
    let rect = this[0].getBoundingClientRect();
    return new Rect(Math.floor(rect.left), Math.floor(rect.top),
                    Math.floor(rect.width), Math.floor(rect.height));
  },

  // ----------
  // Function: data
  // Pass in both key and value to attach some data to the receiver;
  // pass in just key to retrieve it.
  data: function iQClass_data(key, value) {
    let data = null;
    if (value === undefined) {
      Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
      data = this[0].iQData;
      if (data)
        return data[key];
      else
        return null;
    }

    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      data = elem.iQData;

      if (!data)
        data = elem.iQData = {};

      data[key] = value;
    }

    return this;
  },

  // ----------
  // Function: html
  // Given a value, sets the receiver's innerHTML to it; otherwise returns
  // what's already there.
  html: function iQClass_html(value) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
    if (value === undefined)
      return this[0].innerHTML;

    this[0].innerHTML = value;
    return this;
  },

  // ----------
  // Function: text
  // Given a value, sets the receiver's textContent to it; otherwise returns
  // what's already there.
  text: function iQClass_text(value) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
    if (value === undefined) {
      return this[0].textContent;
    }

    return this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(value));
  },

  // ----------
  // Function: val
  // Given a value, sets the receiver's value to it; otherwise returns what's already there.
  val: function iQClass_val(value) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
    if (value === undefined) {
      return this[0].value;
    }

    this[0].value = value;
    return this;
  },

  // ----------
  // Function: appendTo
  // Appends the receiver to the result of iQ(selector).
  appendTo: function iQClass_appendTo(selector) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');
    iQ(selector).append(this);
    return this;
  },

  // ----------
  // Function: append
  // Appends the result of iQ(selector) to the receiver.
  append: function iQClass_append(selector) {
    let object = iQ(selector);
    Utils.assert(object.length == 1 && this.length == 1, 
        'does not yet support multi-objects (or null objects)');
    this[0].appendChild(object[0]);
    return this;
  },

  // ----------
  // Function: attr
  // Sets or gets an attribute on the element(s).
  attr: function iQClass_attr(key, value) {
    Utils.assert(typeof key === 'string', 'string key');
    if (value === undefined) {
      Utils.assert(this.length == 1, 'retrieval does not support multi-objects (or null objects)');
      return this[0].getAttribute(key);
    }

    for (let i = 0; this[i] != null; i++)
      this[i].setAttribute(key, value);

    return this;
  },

  // ----------
  // Function: css
  // Sets or gets CSS properties on the receiver. When setting certain numerical properties,
  // will automatically add "px". A property can be removed by setting it to null.
  //
  // Possible call patterns:
  //   a: object, b: undefined - sets with properties from a
  //   a: string, b: undefined - gets property specified by a
  //   a: string, b: string/number - sets property specified by a to b
  css: function iQClass_css(a, b) {
    let properties = null;

    if (typeof a === 'string') {
      let key = a;
      if (b === undefined) {
        Utils.assert(this.length == 1, 'retrieval does not support multi-objects (or null objects)');

        return window.getComputedStyle(this[0], null).getPropertyValue(key);
      }
      properties = {};
      properties[key] = b;
    } else if (a instanceof Rect) {
      properties = {
        left: a.left,
        top: a.top,
        width: a.width,
        height: a.height
      };
    } else {
      properties = a;
    }

    let pixels = {
      'left': true,
      'top': true,
      'right': true,
      'bottom': true,
      'width': true,
      'height': true
    };

    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      for (let key in properties) {
        let value = properties[key];

        if (pixels[key] && typeof value != 'string')
          value += 'px';

        if (value == null) {
          elem.style.removeProperty(key);
        } else if (key.indexOf('-') != -1)
          elem.style.setProperty(key, value, '');
        else
          elem.style[key] = value;
      }
    }

    return this;
  },

  // ----------
  // Function: animate
  // Uses CSS transitions to animate the element.
  //
  // Parameters:
  //   css - an object map of the CSS properties to change
  //   options - an object with various properites (see below)
  //
  // Possible "options" properties:
  //   duration - how long to animate, in milliseconds
  //   easing - easing function to use. Possibilities include
  //     "tabviewBounce", "easeInQuad". Default is "ease".
  //   complete - function to call once the animation is done, takes nothing
  //     in, but "this" is set to the element that was animated.
  animate: function iQClass_animate(css, options) {
    Utils.assert(this.length == 1, 'does not yet support multi-objects (or null objects)');

    if (!options)
      options = {};

    let easings = {
      tabviewBounce: "cubic-bezier(0.0, 0.63, .6, 1.29)", 
      easeInQuad: 'ease-in', // TODO: make it a real easeInQuad, or decide we don't care
      fast: 'cubic-bezier(0.7,0,1,1)'
    };

    let duration = (options.duration || 400);
    let easing = (easings[options.easing] || 'ease');

    if (css instanceof Rect) {
      css = {
        left: css.left,
        top: css.top,
        width: css.width,
        height: css.height
      };
    }


    // The latest versions of Firefox do not animate from a non-explicitly
    // set css properties. So for each element to be animated, go through
    // and explicitly define 'em.
    let rupper = /([A-Z])/g;
    this.each(function(elem) {
      let cStyle = window.getComputedStyle(elem, null);
      for (let prop in css) {
        prop = prop.replace(rupper, "-$1").toLowerCase();
        iQ(elem).css(prop, cStyle.getPropertyValue(prop));
      }
    });

    this.css({
      '-moz-transition-property': 'all', // TODO: just animate the properties we're changing
      '-moz-transition-duration': (duration / 1000) + 's',
      '-moz-transition-timing-function': easing
    });

    this.css(css);

    let self = this;
    setTimeout(function() {
      self.css({
        '-moz-transition-property': 'none',
        '-moz-transition-duration': '',
        '-moz-transition-timing-function': ''
      });

      if (typeof options.complete == "function")
        options.complete.apply(self);
    }, duration);

    return this;
  },

  // ----------
  // Function: fadeOut
  // Animates the receiver to full transparency. Calls callback on completion.
  fadeOut: function iQClass_fadeOut(callback) {
    Utils.assert(typeof callback == "function" || callback === undefined, 
        'does not yet support duration');

    this.animate({
      opacity: 0
    }, {
      duration: 400,
      complete: function() {
        iQ(this).css({display: 'none'});
        if (typeof callback == "function")
          callback.apply(this);
      }
    });

    return this;
  },

  // ----------
  // Function: fadeIn
  // Animates the receiver to full opacity.
  fadeIn: function iQClass_fadeIn() {
    this.css({display: ''});
    this.animate({
      opacity: 1
    }, {
      duration: 400
    });

    return this;
  },

  // ----------
  // Function: hide
  // Hides the receiver.
  hide: function iQClass_hide() {
    this.css({display: 'none', opacity: 0});
    return this;
  },

  // ----------
  // Function: show
  // Shows the receiver.
  show: function iQClass_show() {
    this.css({display: '', opacity: 1});
    return this;
  },

  // ----------
  // Function: bind
  // Binds the given function to the given event type. Also wraps the function
  // in a try/catch block that does a Utils.log on any errors.
  bind: function iQClass_bind(type, func) {
    let handler = function(event) func.apply(this, [event]);

    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      if (!elem.iQEventData)
        elem.iQEventData = {};

      if (!elem.iQEventData[type])
        elem.iQEventData[type] = [];

      elem.iQEventData[type].push({
        original: func,
        modified: handler
      });

      elem.addEventListener(type, handler, false);
    }

    return this;
  },

  // ----------
  // Function: one
  // Binds the given function to the given event type, but only for one call;
  // automatically unbinds after the event fires once.
  one: function iQClass_one(type, func) {
    Utils.assert(typeof func == "function", 'does not support eventData argument');

    let handler = function(e) {
      iQ(this).unbind(type, handler);
      return func.apply(this, [e]);
    };

    return this.bind(type, handler);
  },

  // ----------
  // Function: unbind
  // Unbinds the given function from the given event type.
  unbind: function iQClass_unbind(type, func) {
    Utils.assert(typeof func == "function", 'Must provide a function');

    for (let i = 0; this[i] != null; i++) {
      let elem = this[i];
      let handler = func;
      if (elem.iQEventData && elem.iQEventData[type]) {
        let count = elem.iQEventData[type].length;
        for (let a = 0; a < count; a++) {
          let pair = elem.iQEventData[type][a];
          if (pair.original == func) {
            handler = pair.modified;
            elem.iQEventData[type].splice(a, 1);
            break;
          }
        }
      }

      elem.removeEventListener(type, handler, false);
    }

    return this;
  }
};

// ----------
// Create various event aliases
let events = [
  'keyup',
  'keydown',
  'keypress',
  'mouseup',
  'mousedown',
  'mouseover',
  'mouseout',
  'mousemove',
  'click',
  'resize',
  'change',
  'blur',
  'focus'
];

events.forEach(function(event) {
  iQClass.prototype[event] = function(func) {
    return this.bind(event, func);
  };
});
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is storage.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ehsan Akhgari <ehsan@mozilla.com>
 * Ian Gilman <ian@iangilman.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: storage.js

// ##########
// Class: Storage
// Singleton for permanent storage of TabView data.
let Storage = {
  GROUP_DATA_IDENTIFIER: "tabview-group",
  GROUPS_DATA_IDENTIFIER: "tabview-groups",
  TAB_DATA_IDENTIFIER: "tabview-tab",
  UI_DATA_IDENTIFIER: "tabview-ui",
  CACHE_CLIENT_IDENTIFIER: "tabview-cache",
  CACHE_PREFIX: "moz-panorama:",

  // ----------
  // Function: init
  // Sets up the object.
  init: function Storage_init() {
    this._sessionStore =
      Cc["@mozilla.org/browser/sessionstore;1"].
        getService(Ci.nsISessionStore);
    
    // Create stream-based cache session for tabview
    let cacheService = 
      Cc["@mozilla.org/network/cache-service;1"].
        getService(Ci.nsICacheService);
    this._cacheSession = cacheService.createSession(
      this.CACHE_CLIENT_IDENTIFIER, Ci.nsICache.STORE_ON_DISK, true);
    this.StringInputStream = Components.Constructor(
      "@mozilla.org/io/string-input-stream;1", "nsIStringInputStream",
      "setData");
    this.StorageStream = Components.Constructor(
      "@mozilla.org/storagestream;1", "nsIStorageStream", 
      "init");
  },

  // ----------
  // Function: uninit
  uninit: function Storage_uninit () {
    this._sessionStore = null;
    this._cacheSession = null;
    this.StringInputStream = null;
    this.StorageStream = null;
  },

  // ----------
  // Function: wipe
  // Cleans out all the stored data, leaving empty objects.
  wipe: function Storage_wipe() {
    try {
      var self = this;

      // ___ Tabs
      AllTabs.tabs.forEach(function(tab) {
        if (tab.ownerDocument.defaultView != gWindow)
          return;

        self.saveTab(tab, null);
      });

      // ___ Other
      this.saveGroupItemsData(gWindow, {});
      this.saveUIData(gWindow, {});

      this._sessionStore.setWindowValue(gWindow, this.GROUP_DATA_IDENTIFIER,
        JSON.stringify({}));
    } catch (e) {
      Utils.log("Error in wipe: "+e);
    }
  },

  // ----------
  // Function: _openCacheEntry
  // Opens a cache entry for the given <url> and requests access <access>.
  // Calls <successCallback>(entry) when the entry was successfully opened with
  // requested access rights. Otherwise calls <errorCallback>().
  _openCacheEntry: function Storage__openCacheEntry(url, access, successCallback, errorCallback) {
    let onCacheEntryAvailable = function (entry, accessGranted, status) {
      if (entry && access == accessGranted && Components.isSuccessCode(status)) {
        successCallback(entry);
      } else {
        entry && entry.close();
        errorCallback();
      }
    }

    let key = this.CACHE_PREFIX + url;

    // switch to synchronous mode if parent window is about to close
    if (UI.isDOMWindowClosing) {
      let entry = this._cacheSession.openCacheEntry(key, access, true);
      let status = Components.results.NS_OK;
      onCacheEntryAvailable(entry, entry.accessGranted, status);
    } else {
      let listener = new CacheListener(onCacheEntryAvailable);
      this._cacheSession.asyncOpenCacheEntry(key, access, listener);
    }
  },

  // ----------
  // Function: saveThumbnail
  // Saves the <imageData> to the cache using the given <url> as key.
  // Calls <callback>(status) when finished (passing true or false indicating
  // whether the operation succeeded).
  saveThumbnail: function Storage_saveThumbnail(url, imageData, callback) {
    Utils.assert(url, "url");
    Utils.assert(imageData, "imageData");
    Utils.assert(typeof callback == "function", "callback arg must be a function");

    let self = this;
    let StringInputStream = this.StringInputStream;

    let onCacheEntryAvailable = function (entry) {
      let outputStream = entry.openOutputStream(0);

      let cleanup = function () {
        outputStream.close();
        entry.close();
      }

      // switch to synchronous mode if parent window is about to close
      if (UI.isDOMWindowClosing) {
        outputStream.write(imageData, imageData.length);
        cleanup();
        callback(true);
        return;
      }

      // asynchronous mode
      let inputStream = new StringInputStream(imageData, imageData.length);
      gNetUtil.asyncCopy(inputStream, outputStream, function (result) {
        cleanup();
        inputStream.close();
        callback(Components.isSuccessCode(result));
      });
    }

    let onCacheEntryUnavailable = function () {
      callback(false);
    }

    this._openCacheEntry(url, Ci.nsICache.ACCESS_WRITE,
        onCacheEntryAvailable, onCacheEntryUnavailable);
  },

  // ----------
  // Function: loadThumbnail
  // Asynchrously loads image data from the cache using the given <url> as key.
  // Calls <callback>(status, data) when finished, passing true or false
  // (indicating whether the operation succeeded) and the retrieved image data.
  loadThumbnail: function Storage_loadThumbnail(url, callback) {
    Utils.assert(url, "url");
    Utils.assert(typeof callback == "function", "callback arg must be a function");

    let self = this;

    let onCacheEntryAvailable = function (entry) {
      let imageChunks = [];
      let nativeInputStream = entry.openInputStream(0);

      const CHUNK_SIZE = 0x10000; // 65k
      const PR_UINT32_MAX = 0xFFFFFFFF;
      let storageStream = new self.StorageStream(CHUNK_SIZE, PR_UINT32_MAX, null);
      let storageOutStream = storageStream.getOutputStream(0);

      let cleanup = function () {
        nativeInputStream.close();
        storageStream.close();
        storageOutStream.close();
        entry.close();
      }

      gNetUtil.asyncCopy(nativeInputStream, storageOutStream, function (result) {
        // cancel if parent window has already been closed
        if (typeof UI == "undefined") {
          cleanup();
          return;
        }

        let imageData = null;
        let isSuccess = Components.isSuccessCode(result);

        if (isSuccess) {
          let storageInStream = storageStream.newInputStream(0);
          imageData = gNetUtil.readInputStreamToString(storageInStream,
            storageInStream.available());
          storageInStream.close();
        }

        cleanup();
        callback(isSuccess, imageData);
      });
    }

    let onCacheEntryUnavailable = function () {
      callback(false);
    }

    this._openCacheEntry(url, Ci.nsICache.ACCESS_READ,
        onCacheEntryAvailable, onCacheEntryUnavailable);
  },

  // ----------
  // Function: saveTab
  // Saves the data for a single tab.
  saveTab: function Storage_saveTab(tab, data) {
    Utils.assert(tab, "tab");

    if (data != null) {
      let imageData = data.imageData;
      // Remove imageData from payload
      delete data.imageData;
      if (imageData != null) {
        this.saveThumbnail(data.url, imageData, function (status) {
          if (status) {
            // Notify subscribers
            tab._tabViewTabItem._sendToSubscribers("savedCachedImageData");
          } else {
            Utils.log("Error while saving thumbnail: " + e);
          }
        });
      }
    }

    this._sessionStore.setTabValue(tab, this.TAB_DATA_IDENTIFIER,
      JSON.stringify(data));
  },

  // ----------
  // Function: getTabData
  // Load tab data from session store and return it. Asynchrously loads the tab's
  // thumbnail from the cache and calls <callback>(imageData) when done.
  getTabData: function Storage_getTabData(tab, callback) {
    Utils.assert(tab, "tab");
    Utils.assert(typeof callback == "function", "callback arg must be a function");

    let existingData = null;

    try {
      let tabData = this._sessionStore.getTabValue(tab, this.TAB_DATA_IDENTIFIER);
      if (tabData != "") {
        existingData = JSON.parse(tabData);
      }
    } catch (e) {
      // getTabValue will fail if the property doesn't exist.
      Utils.log(e);
    }

    if (existingData) {
      this.loadThumbnail(existingData.url, function (status, imageData) {
        if (status) {
          callback(imageData);

          // Notify subscribers
          tab._tabViewTabItem._sendToSubscribers("loadedCachedImageData");
        } else {
          Utils.log("Error while loading thumbnail");
        }
      });
    }

    return existingData;
  },

  // ----------
  // Function: saveGroupItem
  // Saves the data for a single groupItem, associated with a specific window.
  saveGroupItem: function Storage_saveGroupItem(win, data) {
    var id = data.id;
    var existingData = this.readGroupItemData(win);
    existingData[id] = data;
    this._sessionStore.setWindowValue(win, this.GROUP_DATA_IDENTIFIER,
      JSON.stringify(existingData));
  },

  // ----------
  // Function: deleteGroupItem
  // Deletes the data for a single groupItem from the given window.
  deleteGroupItem: function Storage_deleteGroupItem(win, id) {
    var existingData = this.readGroupItemData(win);
    delete existingData[id];
    this._sessionStore.setWindowValue(win, this.GROUP_DATA_IDENTIFIER,
      JSON.stringify(existingData));
  },

  // ----------
  // Function: readGroupItemData
  // Returns the data for all groupItems associated with the given window.
  readGroupItemData: function Storage_readGroupItemData(win) {
    var existingData = {};
    let data;
    try {
      data = this._sessionStore.getWindowValue(win, this.GROUP_DATA_IDENTIFIER);
      if (data)
        existingData = JSON.parse(data);
    } catch (e) {
      // getWindowValue will fail if the property doesn't exist
      Utils.log("Error in readGroupItemData: "+e, data);
    }
    return existingData;
  },

  // ----------
  // Function: saveGroupItemsData
  // Saves the global data for the <GroupItems> singleton for the given window.
  saveGroupItemsData: function Storage_saveGroupItemsData(win, data) {
    this.saveData(win, this.GROUPS_DATA_IDENTIFIER, data);
  },

  // ----------
  // Function: readGroupItemsData
  // Reads the global data for the <GroupItems> singleton for the given window.
  readGroupItemsData: function Storage_readGroupItemsData(win) {
    return this.readData(win, this.GROUPS_DATA_IDENTIFIER);
  },

  // ----------
  // Function: saveUIData
  // Saves the global data for the <UIManager> singleton for the given window.
  saveUIData: function Storage_saveUIData(win, data) {
    this.saveData(win, this.UI_DATA_IDENTIFIER, data);
  },

  // ----------
  // Function: readUIData
  // Reads the global data for the <UIManager> singleton for the given window.
  readUIData: function Storage_readUIData(win) {
    return this.readData(win, this.UI_DATA_IDENTIFIER);
  },

  // ----------
  // Function: saveVisibilityData
  // Saves visibility for the given window.
  saveVisibilityData: function Storage_saveVisibilityData(win, data) {
    this._sessionStore.setWindowValue(
      win, win.TabView.VISIBILITY_IDENTIFIER, data);
  },

  // ----------
  // Function: saveData
  // Generic routine for saving data to a window.
  saveData: function Storage_saveData(win, id, data) {
    try {
      this._sessionStore.setWindowValue(win, id, JSON.stringify(data));
    } catch (e) {
      Utils.log("Error in saveData: "+e);
    }
  },

  // ----------
  // Function: readData
  // Generic routine for reading data from a window.
  readData: function Storage_readData(win, id) {
    var existingData = {};
    try {
      var data = this._sessionStore.getWindowValue(win, id);
      if (data)
        existingData = JSON.parse(data);
    } catch (e) {
      Utils.log("Error in readData: "+e);
    }

    return existingData;
  }
};

// ##########
// Class: CacheListener
// Generic CacheListener for feeding to asynchronous cache calls.
// Calls <callback>(entry, access, status) when the requested cache entry
// is available.
function CacheListener(callback) {
  Utils.assert(typeof callback == "function", "callback arg must be a function");
  this.callback = callback;
};

CacheListener.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsICacheListener]),
  onCacheEntryAvailable: function (entry, access, status) {
    this.callback(entry, access, status);
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is items.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Sean Dunn <seanedunn@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: items.js

// ##########
// Class: Item
// Superclass for all visible objects (<TabItem>s and <GroupItem>s).
//
// If you subclass, in addition to the things Item provides, you need to also provide these methods:
//   setBounds - function(rect, immediately, options)
//   setZ - function(value)
//   close - function()
//   save - function()
//
// Subclasses of Item must also provide the <Subscribable> interface.
//
// ... and this property:
//   defaultSize - a Point
//
// Make sure to call _init() from your subclass's constructor.
function Item() {
  // Variable: isAnItem
  // Always true for Items
  this.isAnItem = true;

  // Variable: bounds
  // The position and size of this Item, represented as a <Rect>.
  // This should never be modified without using setBounds()
  this.bounds = null;

  // Variable: zIndex
  // The z-index for this item.
  this.zIndex = 0;

  // Variable: debug
  // When set to true, displays a rectangle on the screen that corresponds with bounds.
  // May be used for additional debugging features in the future.
  this.debug = false;

  // Variable: $debug
  // If <debug> is true, this will be the iQ object for the visible rectangle.
  this.$debug = null;

  // Variable: container
  // The outermost DOM element that describes this item on screen.
  this.container = null;

  // Variable: parent
  // The groupItem that this item is a child of
  this.parent = null;

  // Variable: userSize
  // A <Point> that describes the last size specifically chosen by the user.
  // Used by unsquish.
  this.userSize = null;

  // Variable: dragOptions
  // Used by <draggable>
  //
  // Possible properties:
  //   cancelClass - A space-delimited list of classes that should cancel a drag
  //   start - A function to be called when a drag starts
  //   drag - A function to be called each time the mouse moves during drag
  //   stop - A function to be called when the drag is done
  this.dragOptions = null;

  // Variable: dropOptions
  // Used by <draggable> if the item is set to droppable.
  //
  // Possible properties:
  //   accept - A function to determine if a particular item should be accepted for dropping
  //   over - A function to be called when an item is over this item
  //   out - A function to be called when an item leaves this item
  //   drop - A function to be called when an item is dropped in this item
  this.dropOptions = null;

  // Variable: resizeOptions
  // Used by <resizable>
  //
  // Possible properties:
  //   minWidth - Minimum width allowable during resize
  //   minHeight - Minimum height allowable during resize
  //   aspectRatio - true if we should respect aspect ratio; default false
  //   start - A function to be called when resizing starts
  //   resize - A function to be called each time the mouse moves during resize
  //   stop - A function to be called when the resize is done
  this.resizeOptions = null;

  // Variable: isDragging
  // Boolean for whether the item is currently being dragged or not.
  this.isDragging = false;
};

Item.prototype = {
  // ----------
  // Function: _init
  // Initializes the object. To be called from the subclass's intialization function.
  //
  // Parameters:
  //   container - the outermost DOM element that describes this item onscreen.
  _init: function Item__init(container) {
    Utils.assert(typeof this.addSubscriber == 'function' && 
        typeof this.removeSubscriber == 'function' && 
        typeof this._sendToSubscribers == 'function',
        'Subclass must implement the Subscribable interface');
    Utils.assert(Utils.isDOMElement(container), 'container must be a DOM element');
    Utils.assert(typeof this.setBounds == 'function', 'Subclass must provide setBounds');
    Utils.assert(typeof this.setZ == 'function', 'Subclass must provide setZ');
    Utils.assert(typeof this.close == 'function', 'Subclass must provide close');
    Utils.assert(typeof this.save == 'function', 'Subclass must provide save');
    Utils.assert(Utils.isPoint(this.defaultSize), 'Subclass must provide defaultSize');
    Utils.assert(Utils.isRect(this.bounds), 'Subclass must provide bounds');

    this.container = container;
    this.$container = iQ(container);

    if (this.debug) {
      this.$debug = iQ('<div>')
        .css({
          border: '2px solid green',
          zIndex: -10,
          position: 'absolute'
        })
        .appendTo('body');
    }

    iQ(this.container).data('item', this);

    // ___ drag
    this.dragOptions = {
      cancelClass: 'close stackExpander',
      start: function(e, ui) {
        if (this.isAGroupItem)
          GroupItems.setActiveGroupItem(this);
        // if we start dragging a tab within a group, start with dropSpace on.
        else if (this.parent != null)
          this.parent._dropSpaceActive = true;
        drag.info = new Drag(this, e);
      },
      drag: function(e) {
        drag.info.drag(e);
      },
      stop: function() {
        drag.info.stop();
        drag.info = null;
        if (!this.isAGroupItem && !this.parent)
          gTabView.firstUseExperienced = true;
      },
      // The minimum the mouse must move after mouseDown in order to move an 
      // item
      minDragDistance: 3
    };

    // ___ drop
    this.dropOptions = {
      over: function() {},
      out: function() {
        let groupItem = drag.info.item.parent;
        if (groupItem)
          groupItem.remove(drag.info.$el, {dontClose: true});
        iQ(this.container).removeClass("acceptsDrop");
      },
      drop: function(event) {
        iQ(this.container).removeClass("acceptsDrop");
      },
      // Function: dropAcceptFunction
      // Given a DOM element, returns true if it should accept tabs being dropped on it.
      // Private to this file.
      accept: function dropAcceptFunction(item) {
        return (item && item.isATabItem && (!item.parent || !item.parent.expanded));
      }
    };

    // ___ resize
    var self = this;
    this.resizeOptions = {
      aspectRatio: self.keepProportional,
      minWidth: 90,
      minHeight: 90,
      start: function(e,ui) {
        if (this.isAGroupItem)
          GroupItems.setActiveGroupItem(this);
        resize.info = new Drag(this, e);
      },
      resize: function(e,ui) {
        resize.info.snap(UI.rtl ? 'topright' : 'topleft', false, self.keepProportional);
      },
      stop: function() {
        self.setUserSize();
        self.pushAway();
        resize.info.stop();
        resize.info = null;
      }
    };
  },

  // ----------
  // Function: getBounds
  // Returns a copy of the Item's bounds as a <Rect>.
  getBounds: function Item_getBounds() {
    Utils.assert(Utils.isRect(this.bounds), 'this.bounds should be a rect');
    return new Rect(this.bounds);
  },

  // ----------
  // Function: overlapsWithOtherItems
  // Returns true if this Item overlaps with any other Item on the screen.
  overlapsWithOtherItems: function Item_overlapsWithOtherItems() {
    var self = this;
    var items = Items.getTopLevelItems();
    var bounds = this.getBounds();
    return items.some(function(item) {
      if (item == self) // can't overlap with yourself.
        return false;
      var myBounds = item.getBounds();
      return myBounds.intersects(bounds);
    } );
  },

  // ----------
  // Function: setPosition
  // Moves the Item to the specified location.
  //
  // Parameters:
  //   left - the new left coordinate relative to the window
  //   top - the new top coordinate relative to the window
  //   immediately - if false or omitted, animates to the new position;
  //   otherwise goes there immediately
  setPosition: function Item_setPosition(left, top, immediately) {
    Utils.assert(Utils.isRect(this.bounds), 'this.bounds');
    this.setBounds(new Rect(left, top, this.bounds.width, this.bounds.height), immediately);
  },

  // ----------
  // Function: setSize
  // Resizes the Item to the specified size.
  //
  // Parameters:
  //   width - the new width in pixels
  //   height - the new height in pixels
  //   immediately - if false or omitted, animates to the new size;
  //   otherwise resizes immediately
  setSize: function Item_setSize(width, height, immediately) {
    Utils.assert(Utils.isRect(this.bounds), 'this.bounds');
    this.setBounds(new Rect(this.bounds.left, this.bounds.top, width, height), immediately);
  },

  // ----------
  // Function: setUserSize
  // Remembers the current size as one the user has chosen.
  setUserSize: function Item_setUserSize() {
    Utils.assert(Utils.isRect(this.bounds), 'this.bounds');
    this.userSize = new Point(this.bounds.width, this.bounds.height);
    this.save();
  },

  // ----------
  // Function: getZ
  // Returns the zIndex of the Item.
  getZ: function Item_getZ() {
    return this.zIndex;
  },

  // ----------
  // Function: setRotation
  // Rotates the object to the given number of degrees.
  setRotation: function Item_setRotation(degrees) {
    var value = degrees ? "rotate(%deg)".replace(/%/, degrees) : null;
    iQ(this.container).css({"-moz-transform": value});
  },

  // ----------
  // Function: setParent
  // Sets the receiver's parent to the given <Item>.
  setParent: function Item_setParent(parent) {
    this.parent = parent;
    this.removeTrenches();
    this.save();
  },

  // ----------
  // Function: pushAway
  // Pushes all other items away so none overlap this Item.
  //
  // Parameters:
  //  immediately - boolean for doing the pushAway without animation
  pushAway: function Item_pushAway(immediately) {
    var buffer = Math.floor(Items.defaultGutter / 2);

    var items = Items.getTopLevelItems();
    // setup each Item's pushAwayData attribute:
    items.forEach(function pushAway_setupPushAwayData(item) {
      var data = {};
      data.bounds = item.getBounds();
      data.startBounds = new Rect(data.bounds);
      // Infinity = (as yet) unaffected
      data.generation = Infinity;
      item.pushAwayData = data;
    });

    // The first item is a 0-generation pushed item. It all starts here.
    var itemsToPush = [this];
    this.pushAwayData.generation = 0;

    var pushOne = function Item_pushAway_pushOne(baseItem) {
      // the baseItem is an n-generation pushed item. (n could be 0)
      var baseData = baseItem.pushAwayData;
      var bb = new Rect(baseData.bounds);

      // make the bounds larger, adding a +buffer margin to each side.
      bb.inset(-buffer, -buffer);
      // bbc = center of the base's bounds
      var bbc = bb.center();

      items.forEach(function Item_pushAway_pushOne_pushEach(item) {
        if (item == baseItem)
          return;

        var data = item.pushAwayData;
        // if the item under consideration has already been pushed, or has a lower
        // "generation" (and thus an implictly greater placement priority) then don't move it.
        if (data.generation <= baseData.generation)
          return;

        // box = this item's current bounds, with a +buffer margin.
        var bounds = data.bounds;
        var box = new Rect(bounds);
        box.inset(-buffer, -buffer);

        // if the item under consideration overlaps with the base item...
        if (box.intersects(bb)) {

          // Let's push it a little.

          // First, decide in which direction and how far to push. This is the offset.
          var offset = new Point();
          // center = the current item's center.
          var center = box.center();

          // Consider the relationship between the current item (box) + the base item.
          // If it's more vertically stacked than "side by side"...
          if (Math.abs(center.x - bbc.x) < Math.abs(center.y - bbc.y)) {
            // push vertically.
            if (center.y > bbc.y)
              offset.y = bb.bottom - box.top;
            else
              offset.y = bb.top - box.bottom;
          } else { // if they're more "side by side" than stacked vertically...
            // push horizontally.
            if (center.x > bbc.x)
              offset.x = bb.right - box.left;
            else
              offset.x = bb.left - box.right;
          }

          // Actually push the Item.
          bounds.offset(offset);

          // This item now becomes an (n+1)-generation pushed item.
          data.generation = baseData.generation + 1;
          // keep track of who pushed this item.
          data.pusher = baseItem;
          // add this item to the queue, so that it, in turn, can push some other things.
          itemsToPush.push(item);
        }
      });
    };

    // push each of the itemsToPush, one at a time.
    // itemsToPush starts with just [this], but pushOne can add more items to the stack.
    // Maximally, this could run through all Items on the screen.
    while (itemsToPush.length)
      pushOne(itemsToPush.shift());

    // ___ Squish!
    var pageBounds = Items.getSafeWindowBounds();
    items.forEach(function Item_pushAway_squish(item) {
      var data = item.pushAwayData;
      if (data.generation == 0)
        return;

      let apply = function Item_pushAway_squish_apply(item, posStep, posStep2, sizeStep) {
        var data = item.pushAwayData;
        if (data.generation == 0)
          return;

        var bounds = data.bounds;
        bounds.width -= sizeStep.x;
        bounds.height -= sizeStep.y;
        bounds.left += posStep.x;
        bounds.top += posStep.y;

        let validSize;
        if (item.isAGroupItem) {
          validSize = GroupItems.calcValidSize(
            new Point(bounds.width, bounds.height));
          bounds.width = validSize.x;
          bounds.height = validSize.y;
        } else {
          if (sizeStep.y > sizeStep.x) {
            validSize = TabItems.calcValidSize(new Point(-1, bounds.height));
            bounds.left += (bounds.width - validSize.x) / 2;
            bounds.width = validSize.x;
          } else {
            validSize = TabItems.calcValidSize(new Point(bounds.width, -1));
            bounds.top += (bounds.height - validSize.y) / 2;
            bounds.height = validSize.y;        
          }
        }

        var pusher = data.pusher;
        if (pusher) {
          var newPosStep = new Point(posStep.x + posStep2.x, posStep.y + posStep2.y);
          apply(pusher, newPosStep, posStep2, sizeStep);
        }
      }

      var bounds = data.bounds;
      var posStep = new Point();
      var posStep2 = new Point();
      var sizeStep = new Point();

      if (bounds.left < pageBounds.left) {
        posStep.x = pageBounds.left - bounds.left;
        sizeStep.x = posStep.x / data.generation;
        posStep2.x = -sizeStep.x;
      } else if (bounds.right > pageBounds.right) { // this may be less of a problem post-601534
        posStep.x = pageBounds.right - bounds.right;
        sizeStep.x = -posStep.x / data.generation;
        posStep.x += sizeStep.x;
        posStep2.x = sizeStep.x;
      }

      if (bounds.top < pageBounds.top) {
        posStep.y = pageBounds.top - bounds.top;
        sizeStep.y = posStep.y / data.generation;
        posStep2.y = -sizeStep.y;
      } else if (bounds.bottom > pageBounds.bottom) { // this may be less of a problem post-601534
        posStep.y = pageBounds.bottom - bounds.bottom;
        sizeStep.y = -posStep.y / data.generation;
        posStep.y += sizeStep.y;
        posStep2.y = sizeStep.y;
      }

      if (posStep.x || posStep.y || sizeStep.x || sizeStep.y)
        apply(item, posStep, posStep2, sizeStep);        
    });

    // ___ Unsquish
    var pairs = [];
    items.forEach(function Item_pushAway_setupUnsquish(item) {
      var data = item.pushAwayData;
      pairs.push({
        item: item,
        bounds: data.bounds
      });
    });

    Items.unsquish(pairs);

    // ___ Apply changes
    items.forEach(function Item_pushAway_setBounds(item) {
      var data = item.pushAwayData;
      var bounds = data.bounds;
      if (!bounds.equals(data.startBounds)) {
        item.setBounds(bounds, immediately);
      }
    });
  },

  // ----------
  // Function: _updateDebugBounds
  // Called by a subclass when its bounds change, to update the debugging rectangles on screen.
  // This functionality is enabled only by the debug property.
  _updateDebugBounds: function Item__updateDebugBounds() {
    if (this.$debug) {
      this.$debug.css(this.bounds);
    }
  },

  // ----------
  // Function: setTrenches
  // Sets up/moves the trenches for snapping to this item.
  setTrenches: function Item_setTrenches(rect) {
    if (this.parent !== null)
      return;

    if (!this.borderTrenches)
      this.borderTrenches = Trenches.registerWithItem(this,"border");

    var bT = this.borderTrenches;
    Trenches.getById(bT.left).setWithRect(rect);
    Trenches.getById(bT.right).setWithRect(rect);
    Trenches.getById(bT.top).setWithRect(rect);
    Trenches.getById(bT.bottom).setWithRect(rect);

    if (!this.guideTrenches)
      this.guideTrenches = Trenches.registerWithItem(this,"guide");

    var gT = this.guideTrenches;
    Trenches.getById(gT.left).setWithRect(rect);
    Trenches.getById(gT.right).setWithRect(rect);
    Trenches.getById(gT.top).setWithRect(rect);
    Trenches.getById(gT.bottom).setWithRect(rect);

  },

  // ----------
  // Function: removeTrenches
  // Removes the trenches for snapping to this item.
  removeTrenches: function Item_removeTrenches() {
    for (var edge in this.borderTrenches) {
      Trenches.unregister(this.borderTrenches[edge]); // unregister can take an array
    }
    this.borderTrenches = null;
    for (var edge in this.guideTrenches) {
      Trenches.unregister(this.guideTrenches[edge]); // unregister can take an array
    }
    this.guideTrenches = null;
  },

  // ----------
  // Function: snap
  // The snap function used during groupItem creation via drag-out
  //
  // Parameters:
  //  immediately - bool for having the drag do the final positioning without animation
  snap: function Item_snap(immediately) {
    // make the snapping work with a wider range!
    var defaultRadius = Trenches.defaultRadius;
    Trenches.defaultRadius = 2 * defaultRadius; // bump up from 10 to 20!

    var event = {startPosition:{}}; // faux event
    var FauxDragInfo = new Drag(this, event, true);
    // true == isFauxDrag
    FauxDragInfo.snap('none', false);
    FauxDragInfo.stop(immediately);

    Trenches.defaultRadius = defaultRadius;
  },

  // ----------
  // Function: draggable
  // Enables dragging on this item. Note: not to be called multiple times on the same item!
  draggable: function Item_draggable() {
    try {
      Utils.assert(this.dragOptions, 'dragOptions');

      var cancelClasses = [];
      if (typeof this.dragOptions.cancelClass == 'string')
        cancelClasses = this.dragOptions.cancelClass.split(' ');

      var self = this;
      var $container = iQ(this.container);
      var startMouse;
      var startPos;
      var startSent;
      var startEvent;
      var droppables;
      var dropTarget;

      // ___ mousemove
      var handleMouseMove = function(e) {
        // global drag tracking
        drag.lastMoveTime = Date.now();

        // positioning
        var mouse = new Point(e.pageX, e.pageY);
        if (!startSent) {
          if(Math.abs(mouse.x - startMouse.x) > self.dragOptions.minDragDistance ||
             Math.abs(mouse.y - startMouse.y) > self.dragOptions.minDragDistance) {
            if (typeof self.dragOptions.start == "function")
              self.dragOptions.start.apply(self,
                  [startEvent, {position: {left: startPos.x, top: startPos.y}}]);
            startSent = true;
          }
        }
        if (startSent) {
          // drag events
          var box = self.getBounds();
          box.left = startPos.x + (mouse.x - startMouse.x);
          box.top = startPos.y + (mouse.y - startMouse.y);
          self.setBounds(box, true);

          if (typeof self.dragOptions.drag == "function")
            self.dragOptions.drag.apply(self, [e]);

          // drop events
          var best = {
            dropTarget: null,
            score: 0
          };

          droppables.forEach(function(droppable) {
            var intersection = box.intersection(droppable.bounds);
            if (intersection && intersection.area() > best.score) {
              var possibleDropTarget = droppable.item;
              var accept = true;
              if (possibleDropTarget != dropTarget) {
                var dropOptions = possibleDropTarget.dropOptions;
                if (dropOptions && typeof dropOptions.accept == "function")
                  accept = dropOptions.accept.apply(possibleDropTarget, [self]);
              }

              if (accept) {
                best.dropTarget = possibleDropTarget;
                best.score = intersection.area();
              }
            }
          });

          if (best.dropTarget != dropTarget) {
            var dropOptions;
            if (dropTarget) {
              dropOptions = dropTarget.dropOptions;
              if (dropOptions && typeof dropOptions.out == "function")
                dropOptions.out.apply(dropTarget, [e]);
            }

            dropTarget = best.dropTarget;

            if (dropTarget) {
              dropOptions = dropTarget.dropOptions;
              if (dropOptions && typeof dropOptions.over == "function")
                dropOptions.over.apply(dropTarget, [e]);
            }
          }
          if (dropTarget) {
            dropOptions = dropTarget.dropOptions;
            if (dropOptions && typeof dropOptions.move == "function")
              dropOptions.move.apply(dropTarget, [e]);
          }
        }

        e.preventDefault();
      };

      // ___ mouseup
      var handleMouseUp = function(e) {
        iQ(gWindow)
          .unbind('mousemove', handleMouseMove)
          .unbind('mouseup', handleMouseUp);

        if (dropTarget) {
          var dropOptions = dropTarget.dropOptions;
          if (dropOptions && typeof dropOptions.drop == "function")
            dropOptions.drop.apply(dropTarget, [e]);
        }

        if (startSent && typeof self.dragOptions.stop == "function")
          self.dragOptions.stop.apply(self, [e]);

        e.preventDefault();
      };

      // ___ mousedown
      $container.mousedown(function(e) {
        if (!Utils.isLeftClick(e))
          return;

        var cancel = false;
        var $target = iQ(e.target);
        cancelClasses.forEach(function(className) {
          if ($target.hasClass(className))
            cancel = true;
        });

        if (cancel) {
          e.preventDefault();
          return;
        }

        startMouse = new Point(e.pageX, e.pageY);
        startPos = self.getBounds().position();
        startEvent = e;
        startSent = false;
        dropTarget = null;

        droppables = [];
        iQ('.iq-droppable').each(function(elem) {
          if (elem != self.container) {
            var item = Items.item(elem);
            droppables.push({
              item: item,
              bounds: item.getBounds()
            });
          }
        });

        iQ(gWindow)
          .mousemove(handleMouseMove)
          .mouseup(handleMouseUp);

        e.preventDefault();
      });
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: droppable
  // Enables or disables dropping on this item.
  droppable: function Item_droppable(value) {
    try {
      var $container = iQ(this.container);
      if (value) {
        Utils.assert(this.dropOptions, 'dropOptions');
        $container.addClass('iq-droppable');
      } else
        $container.removeClass('iq-droppable');
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: resizable
  // Enables or disables resizing of this item.
  resizable: function Item_resizable(value) {
    try {
      var $container = iQ(this.container);
      iQ('.iq-resizable-handle', $container).remove();

      if (!value) {
        $container.removeClass('iq-resizable');
      } else {
        Utils.assert(this.resizeOptions, 'resizeOptions');

        $container.addClass('iq-resizable');

        var self = this;
        var startMouse;
        var startSize;
        var startAspect;

        // ___ mousemove
        var handleMouseMove = function(e) {
          // global resize tracking
          resize.lastMoveTime = Date.now();

          var mouse = new Point(e.pageX, e.pageY);
          var box = self.getBounds();
          if (UI.rtl) {
            var minWidth = (self.resizeOptions.minWidth || 0);
            var oldWidth = box.width;
            if (minWidth != oldWidth || mouse.x < startMouse.x) {
              box.width = Math.max(minWidth, startSize.x - (mouse.x - startMouse.x));
              box.left -= box.width - oldWidth;
            }
          } else {
            box.width = Math.max(self.resizeOptions.minWidth || 0, startSize.x + (mouse.x - startMouse.x));
          }
          box.height = Math.max(self.resizeOptions.minHeight || 0, startSize.y + (mouse.y - startMouse.y));

          if (self.resizeOptions.aspectRatio) {
            if (startAspect < 1)
              box.height = box.width * startAspect;
            else
              box.width = box.height / startAspect;
          }

          self.setBounds(box, true);

          if (typeof self.resizeOptions.resize == "function")
            self.resizeOptions.resize.apply(self, [e]);

          e.preventDefault();
          e.stopPropagation();
        };

        // ___ mouseup
        var handleMouseUp = function(e) {
          iQ(gWindow)
            .unbind('mousemove', handleMouseMove)
            .unbind('mouseup', handleMouseUp);

          if (typeof self.resizeOptions.stop == "function")
            self.resizeOptions.stop.apply(self, [e]);

          e.preventDefault();
          e.stopPropagation();
        };

        // ___ handle + mousedown
        iQ('<div>')
          .addClass('iq-resizable-handle iq-resizable-se')
          .appendTo($container)
          .mousedown(function(e) {
            if (!Utils.isLeftClick(e))
              return;

            startMouse = new Point(e.pageX, e.pageY);
            startSize = self.getBounds().size();
            startAspect = startSize.y / startSize.x;

            if (typeof self.resizeOptions.start == "function")
              self.resizeOptions.start.apply(self, [e]);

            iQ(gWindow)
              .mousemove(handleMouseMove)
              .mouseup(handleMouseUp);

            e.preventDefault();
            e.stopPropagation();
          });
        }
    } catch(e) {
      Utils.log(e);
    }
  }
};

// ##########
// Class: Items
// Keeps track of all Items.
let Items = {
  // ----------
  // Variable: defaultGutter
  // How far apart Items should be from each other and from bounds
  defaultGutter: 15,

  // ----------
  // Function: item
  // Given a DOM element representing an Item, returns the Item.
  item: function Items_item(el) {
    return iQ(el).data('item');
  },

  // ----------
  // Function: getTopLevelItems
  // Returns an array of all Items not grouped into groupItems.
  getTopLevelItems: function Items_getTopLevelItems() {
    var items = [];

    iQ('.tab, .groupItem, .info-item').each(function(elem) {
      var $this = iQ(elem);
      var item = $this.data('item');
      if (item && !item.parent && !$this.hasClass('phantom'))
        items.push(item);
    });

    return items;
  },

  // ----------
  // Function: getPageBounds
  // Returns a <Rect> defining the area of the page <Item>s should stay within.
  getPageBounds: function Items_getPageBounds() {
    var width = Math.max(100, window.innerWidth);
    var height = Math.max(100, window.innerHeight);
    return new Rect(0, 0, width, height);
  },

  // ----------
  // Function: getSafeWindowBounds
  // Returns the bounds within which it is safe to place all non-stationary <Item>s.
  getSafeWindowBounds: function Items_getSafeWindowBounds() {
    // the safe bounds that would keep it "in the window"
    var gutter = Items.defaultGutter;
    // Here, I've set the top gutter separately, as the top of the window has its own
    // extra chrome which makes a large top gutter unnecessary.
    // TODO: set top gutter separately, elsewhere.
    var topGutter = 5;
    return new Rect(gutter, topGutter,
        window.innerWidth - 2 * gutter, window.innerHeight - gutter - topGutter);

  },

  // ----------
  // Function: arrange
  // Arranges the given items in a grid within the given bounds,
  // maximizing item size but maintaining standard tab aspect ratio for each
  //
  // Parameters:
  //   items - an array of <Item>s. Can be null, in which case we won't
  //     actually move anything.
  //   bounds - a <Rect> defining the space to arrange within
  //   options - an object with various properites (see below)
  //
  // Possible "options" properties:
  //   animate - whether to animate; default: true.
  //   z - the z index to set all the items; default: don't change z.
  //   return - if set to 'widthAndColumns', it'll return an object with the
  //     width of children and the columns.
  //   count - overrides the item count for layout purposes;
  //     default: the actual item count
  //   padding - pixels between each item
  //   columns - (int) a preset number of columns to use
  //   dropPos - a <Point> which should have a one-tab space left open, used
  //             when a tab is dragged over.
  //
  // Returns:
  //   By default, an object with three properties: `rects`, the list of <Rect>s,
  //   `dropIndex`, the index which a dragged tab should have if dropped
  //   (null if no `dropPos` was specified), and the number of columns (`columns`).
  //   If the `return` option is set to 'widthAndColumns', an object with the
  //   width value of the child items (`childWidth`) and the number of columns
  //   (`columns`) is returned.
  arrange: function Items_arrange(items, bounds, options) {
    if (!options)
      options = {};
    var animate = "animate" in options ? options.animate : true;
    var immediately = !animate;

    var rects = [];

    var count = options.count || (items ? items.length : 0);
    if (options.addTab)
      count++;
    if (!count) {
      let dropIndex = (Utils.isPoint(options.dropPos)) ? 0 : null;
      return {rects: rects, dropIndex: dropIndex};
    }

    var columns = options.columns || 1;
    // We'll assume for the time being that all the items have the same styling
    // and that the margin is the same width around.
    var itemMargin = items && items.length ?
                       parseInt(iQ(items[0].container).css('margin-left')) : 0;
    var padding = itemMargin * 2;
    var rows;
    var tabWidth;
    var tabHeight;
    var totalHeight;

    function figure() {
      rows = Math.ceil(count / columns);
      let validSize = TabItems.calcValidSize(
        new Point((bounds.width - (padding * columns)) / columns, -1),
        options);
      tabWidth = validSize.x;
      tabHeight = validSize.y;

      totalHeight = (tabHeight * rows) + (padding * rows);    
    }

    figure();

    while (rows > 1 && totalHeight > bounds.height) {
      columns++;
      figure();
    }

    if (rows == 1) {
      let validSize = TabItems.calcValidSize(new Point(tabWidth,
        bounds.height - 2 * itemMargin), options);
      tabWidth = validSize.x;
      tabHeight = validSize.y;
    }
    
    if (options.return == 'widthAndColumns')
      return {childWidth: tabWidth, columns: columns};

    let initialOffset = 0;
    if (UI.rtl) {
      initialOffset = bounds.width - tabWidth - padding;
    }
    var box = new Rect(bounds.left + initialOffset, bounds.top, tabWidth, tabHeight);

    var column = 0;

    var dropIndex = false;
    var dropRect = false;
    if (Utils.isPoint(options.dropPos))
      dropRect = new Rect(options.dropPos.x, options.dropPos.y, 1, 1);
    for (let a = 0; a < count; a++) {
      // If we had a dropPos, see if this is where we should place it
      if (dropRect) {
        let activeBox = new Rect(box);
        activeBox.inset(-itemMargin - 1, -itemMargin - 1);
        // if the designated position (dropRect) is within the active box,
        // this is where, if we drop the tab being dragged, it should land!
        if (activeBox.contains(dropRect))
          dropIndex = a;
      }
      
      // record the box.
      rects.push(new Rect(box));

      box.left += (UI.rtl ? -1 : 1) * (box.width + padding);
      column++;
      if (column == columns) {
        box.left = bounds.left + initialOffset;
        box.top += box.height + padding;
        column = 0;
      }
    }

    return {rects: rects, dropIndex: dropIndex, columns: columns};
  },

  // ----------
  // Function: unsquish
  // Checks to see which items can now be unsquished.
  //
  // Parameters:
  //   pairs - an array of objects, each with two properties: item and bounds. The bounds are
  //     modified as appropriate, but the items are not changed. If pairs is null, the
  //     operation is performed directly on all of the top level items.
  //   ignore - an <Item> to not include in calculations (because it's about to be closed, for instance)
  unsquish: function Items_unsquish(pairs, ignore) {
    var pairsProvided = (pairs ? true : false);
    if (!pairsProvided) {
      var items = Items.getTopLevelItems();
      pairs = [];
      items.forEach(function(item) {
        pairs.push({
          item: item,
          bounds: item.getBounds()
        });
      });
    }

    var pageBounds = Items.getSafeWindowBounds();
    pairs.forEach(function(pair) {
      var item = pair.item;
      if (item == ignore)
        return;

      var bounds = pair.bounds;
      var newBounds = new Rect(bounds);

      var newSize;
      if (Utils.isPoint(item.userSize))
        newSize = new Point(item.userSize);
      else if (item.isAGroupItem)
        newSize = GroupItems.calcValidSize(
          new Point(GroupItems.minGroupWidth, -1));
      else
        newSize = TabItems.calcValidSize(
          new Point(TabItems.tabWidth, -1));

      if (item.isAGroupItem) {
          newBounds.width = Math.max(newBounds.width, newSize.x);
          newBounds.height = Math.max(newBounds.height, newSize.y);
      } else {
        if (bounds.width < newSize.x) {
          newBounds.width = newSize.x;
          newBounds.height = newSize.y;
        }
      }

      newBounds.left -= (newBounds.width - bounds.width) / 2;
      newBounds.top -= (newBounds.height - bounds.height) / 2;

      var offset = new Point();
      if (newBounds.left < pageBounds.left)
        offset.x = pageBounds.left - newBounds.left;
      else if (newBounds.right > pageBounds.right)
        offset.x = pageBounds.right - newBounds.right;

      if (newBounds.top < pageBounds.top)
        offset.y = pageBounds.top - newBounds.top;
      else if (newBounds.bottom > pageBounds.bottom)
        offset.y = pageBounds.bottom - newBounds.bottom;

      newBounds.offset(offset);

      if (!bounds.equals(newBounds)) {
        var blocked = false;
        pairs.forEach(function(pair2) {
          if (pair2 == pair || pair2.item == ignore)
            return;

          var bounds2 = pair2.bounds;
          if (bounds2.intersects(newBounds))
            blocked = true;
          return;
        });

        if (!blocked) {
          pair.bounds.copy(newBounds);
        }
      }
      return;
    });

    if (!pairsProvided) {
      pairs.forEach(function(pair) {
        pair.item.setBounds(pair.bounds);
      });
    }
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is groupItems.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Ehsan Akhgari <ehsan@mozilla.com>
 * Raymond Lee <raymond@appcoast.com>
 * Tim Taubert <tim.taubert@gmx.de>
 * Sean Dunn <seanedunn@yahoo.com>
 * Mihai Sucan <mihai.sucan@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: groupItems.js

// ##########
// Class: GroupItem
// A single groupItem in the TabView window. Descended from <Item>.
// Note that it implements the <Subscribable> interface.
//
// ----------
// Constructor: GroupItem
//
// Parameters:
//   listOfEls - an array of DOM elements for tabs to be added to this groupItem
//   options - various options for this groupItem (see below). In addition, gets passed
//     to <add> along with the elements provided.
//
// Possible options:
//   id - specifies the groupItem's id; otherwise automatically generated
//   userSize - see <Item.userSize>; default is null
//   bounds - a <Rect>; otherwise based on the locations of the provided elements
//   container - a DOM element to use as the container for this groupItem; otherwise will create
//   title - the title for the groupItem; otherwise blank
//   dontPush - true if this groupItem shouldn't push away or snap on creation; default is false
//   immediately - true if we want all placement immediately, not with animation
function GroupItem(listOfEls, options) {
  if (!options)
    options = {};

  this._inited = false;
  this._uninited = false;
  this._children = []; // an array of Items
  this.defaultSize = new Point(TabItems.tabWidth * 1.5, TabItems.tabHeight * 1.5);
  this.isAGroupItem = true;
  this.id = options.id || GroupItems.getNextID();
  this._isStacked = false;
  this.expanded = null;
  this.topChild = null;
  this.hidden = false;
  this.fadeAwayUndoButtonDelay = 15000;
  this.fadeAwayUndoButtonDuration = 300;

  this.keepProportional = false;

  // Double click tracker
  this._lastClick = 0;
  this._lastClickPositions = null;

  // Variable: _activeTab
  // The <TabItem> for the groupItem's active tab.
  this._activeTab = null;

  if (Utils.isPoint(options.userSize))
    this.userSize = new Point(options.userSize);

  var self = this;

  var rectToBe;
  if (options.bounds) {
    Utils.assert(Utils.isRect(options.bounds), "options.bounds must be a Rect");
    rectToBe = new Rect(options.bounds);
  }

  if (!rectToBe) {
    rectToBe = GroupItems.getBoundingBox(listOfEls);
    rectToBe.inset(-30, -30);
  }

  var $container = options.container;
  let immediately = options.immediately || $container ? true : false;
  if (!$container) {
    $container = iQ('<div>')
      .addClass('groupItem')
      .css({position: 'absolute'})
      .css(rectToBe);
  }

  this.bounds = $container.bounds();

  this.isDragging = false;
  $container
    .css({zIndex: -100})
    .appendTo("body");

  // ___ New Tab Button
  this.$ntb = iQ("<div>")
    .addClass('newTabButton')
    .click(function() {
      self.newTab();
    })
    .attr('title', tabviewString('groupItem.newTabButton'))
    .appendTo($container);

  // ___ Resizer
  this.$resizer = iQ("<div>")
    .addClass('resizer')
    .appendTo($container)
    .hide();

  // ___ Titlebar
  var html =
    "<div class='title-container'>" +
      "<input class='name' placeholder='" + this.defaultName + "'/>" +
      "<div class='title-shield' />" +
    "</div>";

  this.$titlebar = iQ('<div>')
    .addClass('titlebar')
    .html(html)
    .appendTo($container);

  this.$closeButton = iQ('<div>')
    .addClass('close')
    .click(function() {
      self.closeAll();
    })
    .appendTo($container);

  // ___ Title
  this.$titleContainer = iQ('.title-container', this.$titlebar);
  this.$title = iQ('.name', this.$titlebar);
  this.$titleShield = iQ('.title-shield', this.$titlebar);
  this.setTitle(options.title);

  var handleKeyDown = function(e) {
    if (e.which == 13 || e.which == 27) { // return & escape
      (self.$title)[0].blur();
      self.$title
        .addClass("transparentBorder")
        .one("mouseout", function() {
          self.$title.removeClass("transparentBorder");
        });
      e.stopPropagation();
      e.preventDefault();
    }
  };

  var handleKeyUp = function(e) {
    // NOTE: When user commits or cancels IME composition, the last key
    //       event fires only a keyup event.  Then, we shouldn't take any
    //       reactions but we should update our status.
    self.adjustTitleSize();
    self.save();
  };

  this.$title
    .blur(function() {
      self._titleFocused = false;
      self.$titleShield.show();
      if (self.getTitle())
        gTabView.firstUseExperienced = true;
    })
    .focus(function() {
      if (!self._titleFocused) {
        (self.$title)[0].select();
        self._titleFocused = true;
      }
    })
    .mousedown(function(e) {
      e.stopPropagation();
    })
    .keydown(handleKeyDown)
    .keyup(handleKeyUp);

  this.$titleShield
    .mousedown(function(e) {
      self.lastMouseDownTarget = (Utils.isLeftClick(e) ? e.target : null);
    })
    .mouseup(function(e) {
      var same = (e.target == self.lastMouseDownTarget);
      self.lastMouseDownTarget = null;
      if (!same)
        return;

      if (!self.isDragging) {
        self.$titleShield.hide();
        (self.$title)[0].focus();
      }
    });

  // ___ Stack Expander
  this.$expander = iQ("<div/>")
    .addClass("stackExpander")
    .appendTo($container)
    .hide();

  // ___ app tabs: create app tab tray and populate it
  let appTabTrayContainer = iQ("<div/>")
    .addClass("appTabTrayContainer")
    .appendTo($container);
  this.$appTabTray = iQ("<div/>")
    .addClass("appTabTray")
    .appendTo(appTabTrayContainer);

  AllTabs.tabs.forEach(function(xulTab) {
    if (xulTab.pinned && xulTab.ownerDocument.defaultView == gWindow)
      self.addAppTab(xulTab, {dontAdjustTray: true});
  });

  // ___ Undo Close
  this.$undoContainer = null;
  this._undoButtonTimeoutId = null;

  // ___ Superclass initialization
  this._init($container[0]);

  if (this.$debug)
    this.$debug.css({zIndex: -1000});

  // ___ Children
  Array.prototype.forEach.call(listOfEls, function(el) {
    self.add(el, options);
  });

  // ___ Finish Up
  this._addHandlers($container);

  this.setResizable(true, immediately);

  GroupItems.register(this);

  // ___ Position
  this.setBounds(rectToBe, immediately);
  if (options.dontPush) {
    this.setZ(drag.zIndex);
    drag.zIndex++; 
  } else
    // Calling snap will also trigger pushAway
    this.snap(immediately);
  if ($container)
    this.setBounds(rectToBe, immediately);

  this._inited = true;
  this.save();

  GroupItems.updateGroupCloseButtons();
};

// ----------
GroupItem.prototype = Utils.extend(new Item(), new Subscribable(), {
  // ----------
  // Variable: defaultName
  // The prompt text for the title field.
  defaultName: tabviewString('groupItem.defaultName'),

  // -----------
  // Function: setActiveTab
  // Sets the active <TabItem> for this groupItem; can be null, but only
  // if there are no children.
  setActiveTab: function GroupItem_setActiveTab(tab) {
    Utils.assertThrow((!tab && this._children.length == 0) || tab.isATabItem,
        "tab must be null (if no children) or a TabItem");

    this._activeTab = tab;
  },

  // -----------
  // Function: getActiveTab
  // Gets the active <TabItem> for this groupItem; can be null, but only
  // if there are no children.
  getActiveTab: function GroupItem_getActiveTab() {
    return this._activeTab;
  },

  // ----------
  // Function: getStorageData
  // Returns all of the info worth storing about this groupItem.
  getStorageData: function GroupItem_getStorageData() {
    var data = {
      bounds: this.getBounds(),
      userSize: null,
      title: this.getTitle(),
      id: this.id
    };

    if (Utils.isPoint(this.userSize))
      data.userSize = new Point(this.userSize);

    return data;
  },

  // ----------
  // Function: isEmpty
  // Returns true if the tab groupItem is empty and unnamed.
  isEmpty: function GroupItem_isEmpty() {
    return !this._children.length && !this.getTitle();
  },

  // ----------
  // Function: isStacked
  // Returns true if this item is in a stacked groupItem.
  isStacked: function GroupItem_isStacked() {
    return this._isStacked;
  },

  // ----------
  // Function: isTopOfStack
  // Returns true if the item is showing on top of this group's stack,
  // determined by whether the tab is this group's topChild, or
  // if it doesn't have one, its first child.
  isTopOfStack: function GroupItem_isTopOfStack(item) {
    return this.isStacked() && ((this.topChild == item) ||
      (!this.topChild && this.getChild(0) == item));
  },

  // ----------
  // Function: save
  // Saves this groupItem to persistent storage.
  save: function GroupItem_save() {
    if (!this._inited || this._uninited) // too soon/late to save
      return;

    var data = this.getStorageData();
    if (GroupItems.groupItemStorageSanity(data))
      Storage.saveGroupItem(gWindow, data);
  },

  // ----------
  // Function: deleteData
  // Deletes the groupItem in the persistent storage.
  deleteData: function GroupItem_deleteData() {
    this._uninited = true;
    Storage.deleteGroupItem(gWindow, this.id);
  },

  // ----------
  // Function: getTitle
  // Returns the title of this groupItem as a string.
  getTitle: function GroupItem_getTitle() {
    return this.$title ? this.$title.val() : '';
  },

  // ----------
  // Function: setTitle
  // Sets the title of this groupItem with the given string
  setTitle: function GroupItem_setTitle(value) {
    this.$title.val(value);
    this.save();
  },

  // ----------
  // Function: adjustTitleSize
  // Used to adjust the width of the title box depending on groupItem width and title size.
  adjustTitleSize: function GroupItem_adjustTitleSize() {
    Utils.assert(this.bounds, 'bounds needs to have been set');
    let closeButton = iQ('.close', this.container);
    var dimension = UI.rtl ? 'left' : 'right';
    var w = Math.min(this.bounds.width - parseInt(closeButton.width()) - parseInt(closeButton.css(dimension)),
                     Math.max(150, this.getTitle().length * 6));
    // The * 6 multiplier calculation is assuming that characters in the title
    // are approximately 6 pixels wide. Bug 586545
    var css = {width: w};
    this.$title.css(css);
    this.$titleShield.css(css);
  },

  // ----------
  // Function: adjustAppTabTray
  // Used to adjust the appTabTray size, to split the appTabIcons across
  // multiple columns when needed - if the groupItem size is too small.
  //
  // Parameters:
  //   arrangeGroup - rearrange the groupItem if the number of appTab columns
  //   changes. If true, then this.arrange() is called, otherwise not.
  adjustAppTabTray: function GroupItem_adjustAppTabTray(arrangeGroup) {
    let icons = iQ(".appTabIcon", this.$appTabTray);
    let container = iQ(this.$appTabTray[0].parentNode);
    if (!icons.length) {
      // There are no icons, so hide the appTabTray if needed.
      if (parseInt(container.css("width")) != 0) {
        this.$appTabTray.css("-moz-column-count", "auto");
        this.$appTabTray.css("height", 0);
        container.css("width", 0);
        container.css("height", 0);

        if (container.hasClass("appTabTrayContainerTruncated"))
          container.removeClass("appTabTrayContainerTruncated");

        if (arrangeGroup)
          this.arrange();
      }
      return;
    }

    let iconBounds = iQ(icons[0]).bounds();
    let boxBounds = this.getBounds();
    let contentHeight = boxBounds.height -
                        parseInt(container.css("top")) -
                        this.$resizer.height();
    let rows = Math.floor(contentHeight / iconBounds.height);
    let columns = Math.ceil(icons.length / rows);
    let columnsGap = parseInt(this.$appTabTray.css("-moz-column-gap"));
    let iconWidth = iconBounds.width + columnsGap;
    let maxColumns = Math.floor((boxBounds.width * 0.20) / iconWidth);

    Utils.assert(rows > 0 && columns > 0 && maxColumns > 0,
      "make sure the calculated rows, columns and maxColumns are correct");

    if (columns > maxColumns)
      container.addClass("appTabTrayContainerTruncated");
    else if (container.hasClass("appTabTrayContainerTruncated"))
      container.removeClass("appTabTrayContainerTruncated");

    // Need to drop the -moz- prefix when Gecko makes it obsolete.
    // See bug 629452.
    if (parseInt(this.$appTabTray.css("-moz-column-count")) != columns)
      this.$appTabTray.css("-moz-column-count", columns);

    if (parseInt(this.$appTabTray.css("height")) != contentHeight) {
      this.$appTabTray.css("height", contentHeight + "px");
      container.css("height", contentHeight + "px");
    }

    let fullTrayWidth = iconWidth * columns - columnsGap;
    if (parseInt(this.$appTabTray.css("width")) != fullTrayWidth)
      this.$appTabTray.css("width", fullTrayWidth + "px");

    let trayWidth = iconWidth * Math.min(columns, maxColumns) - columnsGap;
    if (parseInt(container.css("width")) != trayWidth) {
      container.css("width", trayWidth + "px");

      // Rearrange the groupItem if the width changed.
      if (arrangeGroup)
        this.arrange();
    }
  },

  // ----------
  // Function: getContentBounds
  // Returns a <Rect> for the groupItem's content area (which doesn't include the title, etc).
  getContentBounds: function GroupItem_getContentBounds() {
    var box = this.getBounds();
    var titleHeight = this.$titlebar.height();
    box.top += titleHeight;
    box.height -= titleHeight;

    let appTabTrayContainer = iQ(this.$appTabTray[0].parentNode);
    var appTabTrayWidth = appTabTrayContainer.width();
    if (appTabTrayWidth)
      appTabTrayWidth += parseInt(appTabTrayContainer.css(UI.rtl ? "left" : "right"));

    box.width -= appTabTrayWidth;
    if (UI.rtl) {
      box.left += appTabTrayWidth;
    }

    // Make the computed bounds' "padding" and new tab button margin actually be
    // themeable --OR-- compute this from actual bounds. Bug 586546
    box.inset(6, 6);
    box.height -= 33; // For new tab button

    return box;
  },

  // ----------
  // Function: setBounds
  // Sets the bounds with the given <Rect>, animating unless "immediately" is false.
  //
  // Parameters:
  //   rect - a <Rect> giving the new bounds
  //   immediately - true if it should not animate; default false
  //   options - an object with additional parameters, see below
  //
  // Possible options:
  //   force - true to always update the DOM even if the bounds haven't changed; default false
  setBounds: function GroupItem_setBounds(inRect, immediately, options) {
    if (!Utils.isRect(inRect)) {
      Utils.trace('GroupItem.setBounds: rect is not a real rectangle!', inRect);
      return;
    }

    // Validate and conform passed in size
    let validSize = GroupItems.calcValidSize(
      new Point(inRect.width, inRect.height));
    let rect = new Rect(inRect.left, inRect.top, validSize.x, validSize.y);

    if (!options)
      options = {};

    var titleHeight = this.$titlebar.height();

    // ___ Determine what has changed
    var css = {};
    var titlebarCSS = {};
    var contentCSS = {};

    if (rect.left != this.bounds.left || options.force)
      css.left = rect.left;

    if (rect.top != this.bounds.top || options.force)
      css.top = rect.top;

    if (rect.width != this.bounds.width || options.force) {
      css.width = rect.width;
      titlebarCSS.width = rect.width;
      contentCSS.width = rect.width;
    }

    if (rect.height != this.bounds.height || options.force) {
      css.height = rect.height;
      contentCSS.height = rect.height - titleHeight;
    }

    if (Utils.isEmptyObject(css))
      return;

    var offset = new Point(rect.left - this.bounds.left, rect.top - this.bounds.top);
    this.bounds = new Rect(rect);

    // Make sure the AppTab icons fit the new groupItem size.
    if (css.width || css.height)
      this.adjustAppTabTray();

    // ___ Deal with children
    if (css.width || css.height) {
      this.arrange({animate: !immediately}); //(immediately ? 'sometimes' : true)});
    } else if (css.left || css.top) {
      this._children.forEach(function(child) {
        if (!child.getHidden()) {
          var box = child.getBounds();
          child.setPosition(box.left + offset.x, box.top + offset.y, immediately);
        }
      });
    }

    // ___ Update our representation
    if (immediately) {
      iQ(this.container).css(css);
      this.$titlebar.css(titlebarCSS);
    } else {
      TabItems.pausePainting();
      iQ(this.container).animate(css, {
        duration: 350,
        easing: "tabviewBounce",
        complete: function() {
          TabItems.resumePainting();
        }
      });

      this.$titlebar.animate(titlebarCSS, {
        duration: 350
      });
    }

    if (css.width) {      
      this.adjustTitleSize();
    }

    UI.clearShouldResizeItems();

    this._updateDebugBounds();
    this.setTrenches(rect);

    this.save();
  },

  // ----------
  // Function: setZ
  // Set the Z order for the groupItem's container, as well as its children.
  setZ: function GroupItem_setZ(value) {
    this.zIndex = value;

    iQ(this.container).css({zIndex: value});

    if (this.$debug)
      this.$debug.css({zIndex: value + 1});

    var count = this._children.length;
    if (count) {
      var topZIndex = value + count + 1;
      var zIndex = topZIndex;
      var self = this;
      this._children.forEach(function(child) {
        if (child == self.topChild)
          child.setZ(topZIndex + 1);
        else {
          child.setZ(zIndex);
          zIndex--;
        }
      });
    }
  },

  // ----------
  // Function: close
  // Closes the groupItem, removing (but not closing) all of its children.
  //
  // Parameters:
  //   options - An object with optional settings for this call.
  //
  // Options:
  //   immediately - (bool) if true, no animation will be used
  close: function GroupItem_close(options) {
    this.removeAll({dontClose: true});
    GroupItems.unregister(this);

    let self = this;
    let destroyGroup = function () {
      iQ(self.container).remove();
      if (self.$undoContainer) {
        self.$undoContainer.remove();
        self.$undoContainer = null;
      }
      self.removeTrenches();
      Items.unsquish();
      self._sendToSubscribers("close");
      GroupItems.updateGroupCloseButtons();
    }

    if (this.hidden || (options && options.immediately)) {
      destroyGroup();
    } else {
      iQ(this.container).animate({
        opacity: 0,
        "-moz-transform": "scale(.3)",
      }, {
        duration: 170,
        complete: destroyGroup
      });
    }

    this.deleteData();
  },

  // ----------
  // Function: closeAll
  // Closes the groupItem and all of its children.
  closeAll: function GroupItem_closeAll() {
    if (this._children.length > 0) {
      this._children.forEach(function(child) {
        iQ(child.container).hide();
      });

      iQ(this.container).animate({
         opacity: 0,
         "-moz-transform": "scale(.3)",
      }, {
        duration: 170,
        complete: function() {
          iQ(this).hide();
        }
      });

      this.droppable(false);
      this._createUndoButton();
    } else
      this.close();
    
    this._makeClosestTabActive();
  },
  
  // ----------
  // Function: _makeClosestTabActive
  // Make the closest tab external to this group active.
  // Used when closing the group.
  _makeClosestTabActive: function GroupItem__makeClosestTabActive() {
    let closeCenter = this.getBounds().center();
    // Find closest tab to make active
    let closestTabItem = UI.getClosestTab(closeCenter);
    UI.setActiveTab(closestTabItem);

    // set the active group or orphan tabitem.
    if (closestTabItem) {
      if (closestTabItem.parent) {
        GroupItems.setActiveGroupItem(closestTabItem.parent);
      } else {
        GroupItems.setActiveOrphanTab(closestTabItem);
      }
    } else {
      GroupItems.setActiveGroupItem(null);
      GroupItems.setActiveOrphanTab(null);
    }
  },

  // ----------
  // Function: closeIfEmpty
  // Closes the group if it's empty, has no title, is closable, and
  // autoclose is enabled (see pauseAutoclose()). Returns true if the close
  // occurred and false otherwise.
  closeIfEmpty: function() {
    if (!this._children.length && !this.getTitle() &&
        !GroupItems.getUnclosableGroupItemId() &&
        !GroupItems._autoclosePaused) {
      this.close();
      return true;
    }
    return false;
  },

  // ----------
  // Function: _unhide
  // Shows the hidden group.
  _unhide: function GroupItem__unhide() {
    let self = this;

    this._cancelFadeAwayUndoButtonTimer();
    this.hidden = false;
    this.$undoContainer.remove();
    this.$undoContainer = null;
    this.droppable(true);

    GroupItems.setActiveGroupItem(this);
    if (this._activeTab)
      UI.setActiveTab(this._activeTab);

    iQ(this.container).show().animate({
      "-moz-transform": "scale(1)",
      "opacity": 1
    }, {
      duration: 170,
      complete: function() {
        self._children.forEach(function(child) {
          iQ(child.container).show();
        });
      }
    });

    GroupItems.updateGroupCloseButtons();
    self._sendToSubscribers("groupShown", { groupItemId: self.id });
  },

  // ----------
  // Function: closeHidden
  // Removes the group item, its children and its container.
  closeHidden: function GroupItem_closeHidden() {
    let self = this;

    this._cancelFadeAwayUndoButtonTimer();

    // When the last non-empty groupItem is closed and there are no orphan or
    // pinned tabs then create a new group with a blank tab.
    let remainingGroups = GroupItems.groupItems.filter(function (groupItem) {
      return (groupItem != self && groupItem.getChildren().length);
    });
    if (!gBrowser._numPinnedTabs && !GroupItems.getOrphanedTabs().length &&
        !remainingGroups.length) {
      let emptyGroups = GroupItems.groupItems.filter(function (groupItem) {
        return (groupItem != self && !groupItem.getChildren().length);
      });
      let group = (emptyGroups.length ? emptyGroups[0] : GroupItems.newGroup());
      group.newTab();
    }

    this.destroy();
  },

  // ----------
  // Function: destroy
  // Close all tabs linked to children (tabItems), removes all children and 
  // close the groupItem.
  //
  // Parameters:
  //   options - An object with optional settings for this call.
  //
  // Options:
  //   immediately - (bool) if true, no animation will be used
  destroy: function GroupItem_destroy(options) {
    let self = this;

    // when "TabClose" event is fired, the browser tab is about to close and our 
    // item "close" event is fired.  And then, the browser tab gets closed. 
    // In other words, the group "close" event is fired before all browser
    // tabs in the group are closed.  The below code would fire the group "close"
    // event only after all browser tabs in that group are closed.
    let shouldRemoveTabItems = [];
    let toClose = this._children.concat();
    toClose.forEach(function(child) {
      child.removeSubscriber(self, "close");

      let removed = child.close(true);
      if (removed) {
        shouldRemoveTabItems.push(child);
      } else {
        // child.removeSubscriber() must be called before child.close(), 
        // therefore we call child.addSubscriber() if the tab is not removed.
        child.addSubscriber(self, "close", function() {
          self.remove(child);
        });
      }
    });

    if (shouldRemoveTabItems.length != toClose.length) {
      // remove children without the assiciated tab and show the group item
      shouldRemoveTabItems.forEach(function(child) {
        self.remove(child, { dontArrange: true });
      });

      this.$undoContainer.fadeOut(function() { self._unhide() });
    } else {
      this.close(options);
    }
  },

  // ----------
  // Function: _fadeAwayUndoButton
  // Fades away the undo button
  _fadeAwayUndoButton: function GroupItem__fadeAwayUdoButton() {
    let self = this;

    if (this.$undoContainer) {
      // if there is one or more orphan tabs or there is more than one group 
      // and other groupS are not empty, fade away the undo button.
      let shouldFadeAway = GroupItems.getOrphanedTabs().length > 0;
      
      if (!shouldFadeAway && GroupItems.groupItems.length > 1) {
        shouldFadeAway = 
          GroupItems.groupItems.some(function(groupItem) {
            return (groupItem != self && groupItem.getChildren().length > 0);
          });
      }
      if (shouldFadeAway) {
        self.$undoContainer.animate({
          color: "transparent",
          opacity: 0
        }, {
          duration: this._fadeAwayUndoButtonDuration,
          complete: function() { self.closeHidden(); }
        });
      }
    }
  },

  // ----------
  // Function: _createUndoButton
  // Makes the affordance for undo a close group action
  _createUndoButton: function GroupItem__createUndoButton() {
    let self = this;
    this.$undoContainer = iQ("<div/>")
      .addClass("undo")
      .attr("type", "button")
      .text(tabviewString("groupItem.undoCloseGroup"))
      .appendTo("body");
    let undoClose = iQ("<span/>")
      .addClass("close")
      .appendTo(this.$undoContainer);

    this.$undoContainer.css({
      left: this.bounds.left + this.bounds.width/2 - iQ(self.$undoContainer).width()/2,
      top:  this.bounds.top + this.bounds.height/2 - iQ(self.$undoContainer).height()/2,
      "-moz-transform": "scale(.1)",
      opacity: 0
    });
    this.hidden = true;

    // hide group item and show undo container.
    setTimeout(function() {
      self.$undoContainer.animate({
        "-moz-transform": "scale(1)",
        "opacity": 1
      }, {
        easing: "tabviewBounce",
        duration: 170,
        complete: function() {
          self._sendToSubscribers("groupHidden", { groupItemId: self.id });
        }
      });
    }, 50);

    // add click handlers
    this.$undoContainer.click(function(e) {
      // Only do this for clicks on this actual element.
      if (e.target.nodeName != self.$undoContainer[0].nodeName)
        return;

      self.$undoContainer.fadeOut(function() { self._unhide(); });
    });

    undoClose.click(function() {
      self.$undoContainer.fadeOut(function() { self.closeHidden(); });
    });

    this.setupFadeAwayUndoButtonTimer();
    // Cancel the fadeaway if you move the mouse over the undo
    // button, and restart the countdown once you move out of it.
    this.$undoContainer.mouseover(function() { 
      self._cancelFadeAwayUndoButtonTimer();
    });
    this.$undoContainer.mouseout(function() {
      self.setupFadeAwayUndoButtonTimer();
    });

    GroupItems.updateGroupCloseButtons();
  },

  // ----------
  // Sets up fade away undo button timeout. 
  setupFadeAwayUndoButtonTimer: function() {
    let self = this;

    if (!this._undoButtonTimeoutId) {
      this._undoButtonTimeoutId = setTimeout(function() { 
        self._fadeAwayUndoButton(); 
      }, this.fadeAwayUndoButtonDelay);
    }
  },
  
  // ----------
  // Cancels the fade away undo button timeout. 
  _cancelFadeAwayUndoButtonTimer: function() {
    clearTimeout(this._undoButtonTimeoutId);
    this._undoButtonTimeoutId = null;
  }, 

  // ----------
  // Function: add
  // Adds an item to the groupItem.
  // Parameters:
  //
  //   a - The item to add. Can be an <Item>, a DOM element or an iQ object.
  //       The latter two must refer to the container of an <Item>.
  //   options - An object with optional settings for this call.
  //
  // Options:
  //
  //   index - (int) if set, add this tab at this index
  //   immediately - (bool) if true, no animation will be used
  //   dontArrange - (bool) if true, will not trigger an arrange on the group
  add: function GroupItem_add(a, options) {
    try {
      var item;
      var $el;
      if (a.isAnItem) {
        item = a;
        $el = iQ(a.container);
      } else {
        $el = iQ(a);
        item = Items.item($el);
      }

      // safeguard to remove the item from its previous group
      if (item.parent && item.parent !== this)
        item.parent.remove(item);

      item.removeTrenches();

      if (!options)
        options = {};

      var self = this;

      var wasAlreadyInThisGroupItem = false;
      var oldIndex = this._children.indexOf(item);
      if (oldIndex != -1) {
        this._children.splice(oldIndex, 1);
        wasAlreadyInThisGroupItem = true;
      }

      // Insert the tab into the right position.
      var index = ("index" in options) ? options.index : this._children.length;
      this._children.splice(index, 0, item);

      item.setZ(this.getZ() + 1);
      $el.addClass("tabInGroupItem");

      if (!wasAlreadyInThisGroupItem) {
        item.droppable(false);
        item.groupItemData = {};

        item.addSubscriber(this, "close", function() {
          let dontClose = !item.closedManually && gBrowser._numPinnedTabs > 0;
          self.remove(item, { dontClose: dontClose });

          if (self._children.length > 0 && self._activeTab) {
            GroupItems.setActiveGroupItem(self);
            UI.setActiveTab(self._activeTab);
          }
        });

        item.setParent(this);

        if (typeof item.setResizable == 'function')
          item.setResizable(false, options.immediately);

        // if it is visually active, set it as the active tab.
        if (iQ(item.container).hasClass("focus"))
          this.setActiveTab(item);

        // if it matches the selected tab or no active tab and the browser 
        // tab is hidden, the active group item would be set.
        if (item.tab == gBrowser.selectedTab || 
            (!GroupItems.getActiveGroupItem() && !item.tab.hidden))
          GroupItems.setActiveGroupItem(this);
      }

      if (!options.dontArrange)
        this.arrange({animate: !options.immediately});

      this._sendToSubscribers("childAdded",{ groupItemId: this.id, item: item });

      UI.setReorderTabsOnHide(this);
    } catch(e) {
      Utils.log('GroupItem.add error', e);
    }
  },

  // ----------
  // Function: remove
  // Removes an item from the groupItem.
  // Parameters:
  //
  //   a - The item to remove. Can be an <Item>, a DOM element or an iQ object.
  //       The latter two must refer to the container of an <Item>.
  //   options - An optional object with settings for this call. See below.
  //
  // Possible options: 
  //   dontArrange - don't rearrange the remaining items
  //   dontClose - don't close the group even if it normally would
  //   immediately - don't animate
  remove: function GroupItem_remove(a, options) {
    try {
      var $el;
      var item;

      if (a.isAnItem) {
        item = a;
        $el = iQ(item.container);
      } else {
        $el = iQ(a);
        item = Items.item($el);
      }

      if (!options)
        options = {};

      var index = this._children.indexOf(item);
      if (index != -1)
        this._children.splice(index, 1);

      if (item == this._activeTab || !this._activeTab) {
        if (this._children.length > 0)
          this._activeTab = this._children[0];
        else
          this._activeTab = null;
      }

      item.setParent(null);
      item.removeClass("tabInGroupItem");
      item.removeClass("stacked");
      item.isStacked = false;
      item.setHidden(false);
      item.removeClass("stack-trayed");
      item.setRotation(0);

      item.droppable(true);
      item.removeSubscriber(this, "close");

      if (typeof item.setResizable == 'function')
        item.setResizable(true, options.immediately);

      // if a blank tab is selected while restoring a tab the blank tab gets
      // removed. we need to keep the group alive for the restored tab.
      if (item.tab._tabViewTabIsRemovedAfterRestore)
        options.dontClose = true;

      let closed = options.dontClose ? false : this.closeIfEmpty();
      if (closed)
        this._makeClosestTabActive();
      else if (!options.dontArrange)
        this.arrange({animate: !options.immediately});

      this._sendToSubscribers("childRemoved",{ groupItemId: this.id, item: item });
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: removeAll
  // Removes all of the groupItem's children.
  // The optional "options" param is passed to each remove call. 
  removeAll: function GroupItem_removeAll(options) {
    let self = this;
    let newOptions = {dontArrange: true};
    if (options)
      Utils.extend(newOptions, options);
      
    let toRemove = this._children.concat();
    toRemove.forEach(function(child) {
      self.remove(child, newOptions);
    });
  },
  
  // ----------
  // Handles error event for loading app tab's fav icon.
  _onAppTabError : function(event) {
    iQ(".appTabIcon", this.$appTabTray).each(function(icon) {
      let $icon = iQ(icon);
      if ($icon.data("xulTab") == event.target) {
        $icon.attr("src", Utils.defaultFaviconURL);
      }
    });
  },

  // ----------
  // Adds the given xul:tab as an app tab in this group's apptab tray
  //
  // Parameters:
  //   options - change how the app tab is added.
  //
  // Options:
  //   dontAdjustTray - (boolean) if true, the $appTabTray size is not adjusted,
  //                    which means that the adjustAppTabTray() method is not
  //                    called.
  addAppTab: function GroupItem_addAppTab(xulTab, options) {
    let self = this;

    xulTab.addEventListener("error", this._onAppTabError, false);

    // add the icon
    let iconUrl = xulTab.image || Utils.defaultFaviconURL;
    let $appTab = iQ("<img>")
      .addClass("appTabIcon")
      .attr("src", iconUrl)
      .data("xulTab", xulTab)
      .appendTo(this.$appTabTray)
      .click(function(event) {
        if (!Utils.isLeftClick(event))
          return;

        GroupItems.setActiveGroupItem(self);
        UI.goToTab(iQ(this).data("xulTab"));
      });

    // adjust the tray, if needed.
    if (!options || !options.dontAdjustTray)
      this.adjustAppTabTray(true);
  },

  // ----------
  // Removes the given xul:tab as an app tab in this group's apptab tray
  removeAppTab: function GroupItem_removeAppTab(xulTab) {
    // remove the icon
    iQ(".appTabIcon", this.$appTabTray).each(function(icon) {
      let $icon = iQ(icon);
      if ($icon.data("xulTab") != xulTab)
        return;
        
      $icon.remove();
    });
    
    // adjust the tray
    this.adjustAppTabTray(true);

    xulTab.removeEventListener("error", this._onAppTabError, false);
  },

  // ----------
  // Function: hideExpandControl
  // Hide the control which expands a stacked groupItem into a quick-look view.
  hideExpandControl: function GroupItem_hideExpandControl() {
    this.$expander.hide();
  },

  // ----------
  // Function: showExpandControl
  // Show the control which expands a stacked groupItem into a quick-look view.
  showExpandControl: function GroupItem_showExpandControl() {
    let parentBB = this.getBounds();
    let childBB = this.getChild(0).getBounds();
    let padding = 7;
    this.$expander
        .show()
        .css({
          left: parentBB.width/2 - this.$expander.width()/2
        });
  },

  // ----------
  // Function: shouldStack
  // Returns true if the groupItem, given "count", should stack (instead of 
  // grid).
  shouldStack: function GroupItem_shouldStack(count) {
    if (count <= 1)
      return false;

    var bb = this.getContentBounds();
    var options = {
      return: 'widthAndColumns',
      count: count || this._children.length,
      hideTitle: false
    };
    let arrObj = Items.arrange(null, bb, options);
 
    let shouldStack = arrObj.childWidth < TabItems.minTabWidth * 1.35;
    this._columns = shouldStack ? null : arrObj.columns;

    return shouldStack;
  },

  // ----------
  // Function: arrange
  // Lays out all of the children.
  //
  // Parameters:
  //   options - passed to <Items.arrange> or <_stackArrange>, except those below
  //
  // Options:
  //   addTab - (boolean) if true, we add one to the child count
  //   oldDropIndex - if set, we will only set any bounds if the dropIndex has
  //                  changed
  //   dropPos - (<Point>) a position where a tab is currently positioned, above
  //             this group.
  //   animate - (boolean) if true, movement of children will be animated.
  //
  // Returns:
  //   dropIndex - an index value for where an item would be dropped, if 
  //               options.dropPos is given.
  arrange: function GroupItem_arrange(options) {
    if (!options)
      options = {};

    let childrenToArrange = [];
    this._children.forEach(function(child) {
      if (child.isDragging)
        options.addTab = true;
      else
        childrenToArrange.push(child);
    });

    if (GroupItems._arrangePaused) {
      GroupItems.pushArrange(this, options);
      return false;
    }
    
    let shouldStack = this.shouldStack(childrenToArrange.length + (options.addTab ? 1 : 0));
    let box = this.getContentBounds();
    
    // if we should stack and we're not expanded
    if (shouldStack && !this.expanded) {
      this.showExpandControl();
      this._stackArrange(childrenToArrange, box, options);
      return false;
    } else {
      this.hideExpandControl();
      // a dropIndex is returned
      return this._gridArrange(childrenToArrange, box, options);
    }
  },

  // ----------
  // Function: _stackArrange
  // Arranges the children in a stack.
  //
  // Parameters:
  //   childrenToArrange - array of <TabItem> children
  //   bb - <Rect> to arrange within
  //   options - see below
  //
  // Possible "options" properties:
  //   animate - whether to animate; default: true.
  _stackArrange: function GroupItem__stackArrange(childrenToArrange, bb, options) {
    if (!options)
      options = {};
    var animate = "animate" in options ? options.animate : true;

    var count = childrenToArrange.length;
    if (!count)
      return;

    let itemAspect = TabItems.tabHeight / TabItems.tabWidth;
    let zIndex = this.getZ() + count + 1;
    let maxRotation = 35; // degress
    let scale = 0.7;
    let newTabsPad = 10;
    let bbAspect = bb.height / bb.width;
    let numInPile = 6;
    let angleDelta = 3.5; // degrees

    // compute size of the entire stack, modulo rotation.
    let size;
    if (bbAspect > itemAspect) { // Tall, thin groupItem
      size = TabItems.calcValidSize(new Point(bb.width * scale, -1),
        {hideTitle:true});
     } else { // Short, wide groupItem
      size = TabItems.calcValidSize(new Point(-1, bb.height * scale),
        {hideTitle:true});
     }

    // x is the left margin that the stack will have, within the content area (bb)
    // y is the vertical margin
    var x = (bb.width - size.x) / 2;
    var y = Math.min(size.x, (bb.height - size.y) / 2);
    var box = new Rect(bb.left + x, bb.top + y, size.x, size.y);

    var self = this;
    var children = [];

    // ensure this.topChild is the first item in childrenToArrange
    let topChildPos = childrenToArrange.indexOf(this.topChild);
    if (topChildPos > 0) {
      childrenToArrange.splice(topChildPos, 1);
      childrenToArrange.unshift(this.topChild);
    }

    childrenToArrange.forEach(function GroupItem__stackArrange_order(child) {
      // Children are still considered stacked even if they're hidden later.
      child.addClass("stacked");
      child.isStacked = true;
      if (numInPile-- > 0) {
        children.push(child);
      } else {
        child.setHidden(true);
      }
    });

    let angleAccum = 0;
    children.forEach(function GroupItem__stackArrange_apply(child, index) {
      child.setZ(zIndex);
      zIndex--;

      // Force a recalculation of height because we've changed how the title
      // is shown.
      child.setBounds(box, !animate || child.getHidden(), {force:true});
      child.setRotation((UI.rtl ? -1 : 1) * angleAccum);
      child.setHidden(false);
      angleAccum += angleDelta;
    });

    self._isStacked = true;
  },
  
  // ----------
  // Function: _gridArrange
  // Arranges the children into a grid.
  //
  // Parameters:
  //   childrenToArrange - array of <TabItem> children
  //   box - <Rect> to arrange within
  //   options - see below
  //
  // Possible "options" properties:
  //   animate - whether to animate; default: true.
  //   z - (int) a z-index to assign the children
  //   columns - the number of columns to use in the layout, if known in advance
  //
  // Returns:
  //   dropIndex - (int) the index at which a dragged item (if there is one) should be added
  //               if it is dropped. Otherwise (boolean) false.
  _gridArrange: function GroupItem__gridArrange(childrenToArrange, box, options) {
    let arrangeOptions;
    if (this.expanded) {
      // if we're expanded, we actually want to use the expanded tray's bounds.
      box = new Rect(this.expanded.bounds);
      box.inset(8, 8);
      arrangeOptions = Utils.extend({}, options, {z: 99999});
    } else {
      this.topChild = null;
      this._isStacked = false;
      arrangeOptions = Utils.extend({}, options, {
        columns: this._columns
      });

      childrenToArrange.forEach(function(child) {
        child.removeClass("stacked");
        child.isStacked = false;
        child.setHidden(false);
      });
    }
  
    if (!childrenToArrange.length)
      return false;

    // Items.arrange will determine where/how the child items should be
    // placed, but will *not* actually move them for us. This is our job.
    let result = Items.arrange(childrenToArrange, box, arrangeOptions);
    let {dropIndex, rects, columns} = result;
    if ("oldDropIndex" in options && options.oldDropIndex === dropIndex)
      return dropIndex;

    this._columns = columns;
    let index = 0;
    let self = this;
    childrenToArrange.forEach(function GroupItem_arrange_children_each(child, i) {
      // If dropIndex spacing is active and this is a child after index,
      // bump it up one so we actually use the correct rect
      // (and skip one for the dropPos)
      if (self._dropSpaceActive && index === dropIndex)
        index++;
      child.setBounds(rects[index], !options.animate);
      child.setRotation(0);
      if (arrangeOptions.z)
        child.setZ(arrangeOptions.z);
      index++;
    });

    return dropIndex;
  },

  expand: function GroupItem_expand() {
    var self = this;
    // ___ we're stacked, and command is held down so expand
    GroupItems.setActiveGroupItem(self);
    let activeTab = this.topChild || this.getChildren()[0];
    UI.setActiveTab(activeTab);
    
    var startBounds = this.getChild(0).getBounds();
    var $tray = iQ("<div>").css({
      top: startBounds.top,
      left: startBounds.left,
      width: startBounds.width,
      height: startBounds.height,
      position: "absolute",
      zIndex: 99998
    }).appendTo("body");
    $tray[0].id = "expandedTray";

    var w = 180;
    var h = w * (TabItems.tabHeight / TabItems.tabWidth) * 1.1;
    var padding = 20;
    var col = Math.ceil(Math.sqrt(this._children.length));
    var row = Math.ceil(this._children.length/col);

    var overlayWidth = Math.min(window.innerWidth - (padding * 2), w*col + padding*(col+1));
    var overlayHeight = Math.min(window.innerHeight - (padding * 2), h*row + padding*(row+1));

    var pos = {left: startBounds.left, top: startBounds.top};
    pos.left -= overlayWidth / 3;
    pos.top  -= overlayHeight / 3;

    if (pos.top < 0)
      pos.top = 20;
    if (pos.left < 0)
      pos.left = 20;
    if (pos.top + overlayHeight > window.innerHeight)
      pos.top = window.innerHeight - overlayHeight - 20;
    if (pos.left + overlayWidth > window.innerWidth)
      pos.left = window.innerWidth - overlayWidth - 20;

    $tray
      .animate({
        width:  overlayWidth,
        height: overlayHeight,
        top: pos.top,
        left: pos.left
      }, {
        duration: 200,
        easing: "tabviewBounce",
        complete: function GroupItem_expand_animate_complete() {
          self._sendToSubscribers("expanded");
        }
      })
      .addClass("overlay");

    this._children.forEach(function(child) {
      child.addClass("stack-trayed");
      child.setHidden(false);
    });

    var $shield = iQ('<div>')
      .addClass('shield')
      .css({
        zIndex: 99997
      })
      .appendTo('body')
      .click(function() { // just in case
        self.collapse();
      });

    // There is a race-condition here. If there is
    // a mouse-move while the shield is coming up
    // it will collapse, which we don't want. Thus,
    // we wait a little bit before adding this event
    // handler.
    setTimeout(function() {
      $shield.mouseover(function() {
        self.collapse();
      });
    }, 200);

    this.expanded = {
      $tray: $tray,
      $shield: $shield,
      bounds: new Rect(pos.left, pos.top, overlayWidth, overlayHeight)
    };

    this.arrange();
  },

  // ----------
  // Function: collapse
  // Collapses the groupItem from the expanded "tray" mode.
  collapse: function GroupItem_collapse() {
    if (this.expanded) {
      var z = this.getZ();
      var box = this.getBounds();
      let self = this;
      this.expanded.$tray
        .css({
          zIndex: z + 1
        })
        .animate({
          width:  box.width,
          height: box.height,
          top: box.top,
          left: box.left,
          opacity: 0
        }, {
          duration: 350,
          easing: "tabviewBounce",
          complete: function GroupItem_collapse_animate_complete() {
            iQ(this).remove();
            self._sendToSubscribers("collapsed");
          }
        });

      this.expanded.$shield.remove();
      this.expanded = null;

      this._children.forEach(function(child) {
        child.removeClass("stack-trayed");
      });

      this.arrange({z: z + 2});
    }
  },

  // ----------
  // Function: _addHandlers
  // Helper routine for the constructor; adds various event handlers to the container.
  _addHandlers: function GroupItem__addHandlers(container) {
    let self = this;

    // Create new tab and zoom in on it after a double click
    container.mousedown(function(e) {
      if (!Utils.isLeftClick(e))
        return;

      // clicking in the title bar shouldn't create new tabs
      if (self.$titlebar[0] == e.target || self.$titlebar.contains(e.target))
        return;

      if (Date.now() - self._lastClick <= UI.DBLCLICK_INTERVAL &&
          (self._lastClickPositions.x - UI.DBLCLICK_OFFSET) <= e.clientX &&
          (self._lastClickPositions.x + UI.DBLCLICK_OFFSET) >= e.clientX &&
          (self._lastClickPositions.y - UI.DBLCLICK_OFFSET) <= e.clientY &&
          (self._lastClickPositions.y + UI.DBLCLICK_OFFSET) >= e.clientY) {
        self.newTab();
        self._lastClick = 0;
        self._lastClickPositions = null;
      } else {
        self._lastClick = Date.now();
        self._lastClickPositions = new Point(e.clientX, e.clientY);
      }
    });

    var dropIndex = false;
    var dropSpaceTimer = null;

    // When the _dropSpaceActive flag is turned on on a group, and a tab is
    // dragged on top, a space will open up.
    this._dropSpaceActive = false;

    this.dropOptions.over = function GroupItem_dropOptions_over(event) {
      iQ(this.container).addClass("acceptsDrop");
    };
    this.dropOptions.move = function GroupItem_dropOptions_move(event) {
      let oldDropIndex = dropIndex;
      let dropPos = drag.info.item.getBounds().center();
      let options = {dropPos: dropPos,
                     addTab: self._dropSpaceActive && drag.info.item.parent != self,
                     oldDropIndex: oldDropIndex};
      let newDropIndex = self.arrange(options);
      // If this is a new drop index, start a timer!
      if (newDropIndex !== oldDropIndex) {
        dropIndex = newDropIndex;
        if (this._dropSpaceActive)
          return;
          
        if (dropSpaceTimer) {
          clearTimeout(dropSpaceTimer);
          dropSpaceTimer = null;
        }

        dropSpaceTimer = setTimeout(function GroupItem_arrange_evaluateDropSpace() {
          // Note that dropIndex's scope is GroupItem__addHandlers, but
          // newDropIndex's scope is GroupItem_dropOptions_move. Thus,
          // dropIndex may change with other movement events before we come
          // back and check this. If it's still the same dropIndex, activate
          // drop space display!
          if (dropIndex === newDropIndex) {
            self._dropSpaceActive = true;
            dropIndex = self.arrange({dropPos: dropPos,
                                      addTab: drag.info.item.parent != self,
                                      animate: true});
          }
          dropSpaceTimer = null;
        }, 250);
      }
    };
    this.dropOptions.drop = function GroupItem_dropOptions_drop(event) {
      iQ(this.container).removeClass("acceptsDrop");
      let options = {};
      if (this._dropSpaceActive)
        this._dropSpaceActive = false;

      if (dropSpaceTimer) {
        clearTimeout(dropSpaceTimer);
        dropSpaceTimer = null;
        // If we drop this item before the timed rearrange was executed,
        // we won't have an accurate dropIndex value. Get that now.
        let dropPos = drag.info.item.getBounds().center();
        dropIndex = self.arrange({dropPos: dropPos,
                                  addTab: drag.info.item.parent != self,
                                  animate: true});
      }

      if (dropIndex !== false)
        options = {index: dropIndex};
      this.add(drag.info.$el, options);
      GroupItems.setActiveGroupItem(this);
      dropIndex = false;
    };
    this.dropOptions.out = function GroupItem_dropOptions_out(event) {
      dropIndex = false;
      if (this._dropSpaceActive)
        this._dropSpaceActive = false;

      if (dropSpaceTimer) {
        clearTimeout(dropSpaceTimer);
        dropSpaceTimer = null;
      }
      self.arrange();
      var groupItem = drag.info.item.parent;
      if (groupItem)
        groupItem.remove(drag.info.$el, {dontClose: true});
      iQ(this.container).removeClass("acceptsDrop");
    }

    this.draggable();
    this.droppable(true);

    this.$expander.click(function() {
      self.expand();
    });
  },

  // ----------
  // Function: setResizable
  // Sets whether the groupItem is resizable and updates the UI accordingly.
  setResizable: function GroupItem_setResizable(value, immediately) {
    this.resizeOptions.minWidth = GroupItems.minGroupWidth;
    this.resizeOptions.minHeight = GroupItems.minGroupHeight;

    if (value) {
      immediately ? this.$resizer.show() : this.$resizer.fadeIn();
      this.resizable(true);
    } else {
      immediately ? this.$resizer.hide() : this.$resizer.fadeOut();
      this.resizable(false);
    }
  },

  // ----------
  // Function: newTab
  // Creates a new tab within this groupItem.
  newTab: function GroupItem_newTab(url) {
    GroupItems.setActiveGroupItem(this);
    let newTab = gBrowser.loadOneTab(url || "about:blank", {inBackground: true});

    // TabItems will have handled the new tab and added the tabItem property.
    // We don't have to check if it's an app tab (and therefore wouldn't have a
    // TabItem), since we've just created it.
    newTab._tabViewTabItem.zoomIn(!url);
  },

  // ----------
  // Function: reorderTabItemsBasedOnTabOrder
  // Reorders the tabs in a groupItem based on the arrangment of the tabs
  // shown in the tab bar. It does it by sorting the children
  // of the groupItem by the positions of their respective tabs in the
  // tab bar.
  reorderTabItemsBasedOnTabOrder: function GroupItem_reorderTabItemsBasedOnTabOrder() {
    this._children.sort(function(a,b) a.tab._tPos - b.tab._tPos);

    this.arrange({animate: false});
    // this.arrange calls this.save for us
  },

  // Function: reorderTabsBasedOnTabItemOrder
  // Reorders the tabs in the tab bar based on the arrangment of the tabs
  // shown in the groupItem.
  reorderTabsBasedOnTabItemOrder: function GroupItem_reorderTabsBasedOnTabItemOrder() {
    let indices;
    let tabs = this._children.map(function (tabItem) tabItem.tab);

    tabs.forEach(function (tab, index) {
      if (!indices)
        indices = tabs.map(function (tab) tab._tPos);

      let start = index ? indices[index - 1] + 1 : 0;
      let end = index + 1 < indices.length ? indices[index + 1] - 1 : Infinity;
      let targetRange = new Range(start, end);

      if (!targetRange.contains(tab._tPos)) {
        gBrowser.moveTabTo(tab, start);
        indices = null;
      }
    });
  },

  // ----------
  // Function: setTopChild
  // Sets the <Item> that should be displayed on top when in stack mode.
  setTopChild: function GroupItem_setTopChild(topChild) {
    this.topChild = topChild;

    this.arrange({animate: false});
    // this.arrange calls this.save for us
  },

  // ----------
  // Function: getChild
  // Returns the nth child tab or null if index is out of range.
  //
  // Parameters:
  //  index - the index of the child tab to return, use negative
  //          numbers to index from the end (-1 is the last child)
  getChild: function GroupItem_getChild(index) {
    if (index < 0)
      index = this._children.length + index;
    if (index >= this._children.length || index < 0)
      return null;
    return this._children[index];
  },

  // ----------
  // Function: getChildren
  // Returns all children.
  getChildren: function GroupItem_getChildren() {
    return this._children;
  }
});

// ##########
// Class: GroupItems
// Singleton for managing all <GroupItem>s.
let GroupItems = {
  groupItems: [],
  nextID: 1,
  _inited: false,
  _activeGroupItem: null,
  _activeOrphanTab: null,
  _cleanupFunctions: [],
  _arrangePaused: false,
  _arrangesPending: [],
  _removingHiddenGroups: false,
  _delayedModUpdates: [],
  _autoclosePaused: false,
  minGroupHeight: 110,
  minGroupWidth: 125,

  // ----------
  // Function: init
  init: function GroupItems_init() {
    let self = this;

    // setup attr modified handler, and prepare for its uninit
    function handleAttrModified(xulTab) {
      self._handleAttrModified(xulTab);
    }

    // make sure any closed tabs are removed from the delay update list
    function handleClose(xulTab) {
      let idx = self._delayedModUpdates.indexOf(xulTab);
      if (idx != -1)
        self._delayedModUpdates.splice(idx, 1);
    }

    AllTabs.register("attrModified", handleAttrModified);
    AllTabs.register("close", handleClose);
    this._cleanupFunctions.push(function() {
      AllTabs.unregister("attrModified", handleAttrModified);
      AllTabs.unregister("close", handleClose);
    });
  },

  // ----------
  // Function: uninit
  uninit : function GroupItems_uninit () {
    // call our cleanup functions
    this._cleanupFunctions.forEach(function(func) {
      func();
    });

    this._cleanupFunctions = [];

    // additional clean up
    this.groupItems = null;
  },

  // ----------
  // Function: newGroup
  // Creates a new empty group.
  newGroup: function () {
    let bounds = new Rect(20, 20, 250, 200);
    return new GroupItem([], {bounds: bounds, immediately: true});
  },

  // ----------
  // Function: pauseArrange
  // Bypass arrange() calls and collect for resolution in
  // resumeArrange()
  pauseArrange: function GroupItems_pauseArrange() {
    Utils.assert(this._arrangePaused == false, 
      "pauseArrange has been called while already paused");
    Utils.assert(this._arrangesPending.length == 0, 
      "There are bypassed arrange() calls that haven't been resolved");
    this._arrangePaused = true;
  },

  // ----------
  // Function: pushArrange
  // Push an arrange() call and its arguments onto an array
  // to be resolved in resumeArrange()
  pushArrange: function GroupItems_pushArrange(groupItem, options) {
    Utils.assert(this._arrangePaused, 
      "Ensure pushArrange() called while arrange()s aren't paused"); 
    let i;
    for (i = 0; i < this._arrangesPending.length; i++)
      if (this._arrangesPending[i].groupItem === groupItem)
        break;
    let arrangeInfo = {
      groupItem: groupItem,
      options: options
    };
    if (i < this._arrangesPending.length)
      this._arrangesPending[i] = arrangeInfo;
    else
      this._arrangesPending.push(arrangeInfo);
  },

  // ----------
  // Function: resumeArrange
  // Resolve bypassed and collected arrange() calls
  resumeArrange: function GroupItems_resumeArrange() {
    this._arrangePaused = false;
    for (let i = 0; i < this._arrangesPending.length; i++) {
      let g = this._arrangesPending[i];
      g.groupItem.arrange(g.options);
    }
    this._arrangesPending = [];
  },

  // ----------
  // Function: _handleAttrModified
  // watch for icon changes on app tabs
  _handleAttrModified: function GroupItems__handleAttrModified(xulTab) {
    if (!UI.isTabViewVisible()) {
      if (this._delayedModUpdates.indexOf(xulTab) == -1) {
        this._delayedModUpdates.push(xulTab);
      }
    } else
      this._updateAppTabIcons(xulTab); 
  },

  // ----------
  // Function: flushTabUpdates
  // Update apptab icons based on xulTabs which have been updated
  // while the TabView hasn't been visible 
  flushAppTabUpdates: function GroupItems_flushAppTabUpdates() {
    let self = this;
    this._delayedModUpdates.forEach(function(xulTab) {
      self._updateAppTabIcons(xulTab);
    });
    this._delayedModUpdates = [];
  },

  // ----------
  // Function: _updateAppTabIcons
  // Update images of any apptab icons that point to passed in xultab 
  _updateAppTabIcons: function GroupItems__updateAppTabIcons(xulTab) {
    if (xulTab.ownerDocument.defaultView != gWindow || !xulTab.pinned)
      return;

    let iconUrl = xulTab.image || Utils.defaultFaviconURL;
    this.groupItems.forEach(function(groupItem) {
      iQ(".appTabIcon", groupItem.$appTabTray).each(function(icon) {
        let $icon = iQ(icon);
        if ($icon.data("xulTab") != xulTab)
          return;

        if (iconUrl != $icon.attr("src"))
          $icon.attr("src", iconUrl);
      });
    });
  },  

  // ----------
  // Function: addAppTab
  // Adds the given xul:tab to the app tab tray in all groups
  addAppTab: function GroupItems_addAppTab(xulTab) {
    this.groupItems.forEach(function(groupItem) {
      groupItem.addAppTab(xulTab);
    });
    this.updateGroupCloseButtons();
  },

  // ----------
  // Function: removeAppTab
  // Removes the given xul:tab from the app tab tray in all groups
  removeAppTab: function GroupItems_removeAppTab(xulTab) {
    this.groupItems.forEach(function(groupItem) {
      groupItem.removeAppTab(xulTab);
    });
    this.updateGroupCloseButtons();
  },

  // ----------
  // Function: getNextID
  // Returns the next unused groupItem ID.
  getNextID: function GroupItems_getNextID() {
    var result = this.nextID;
    this.nextID++;
    this._save();
    return result;
  },

  // ----------
  // Function: getStorageData
  // Returns an object for saving GroupItems state to persistent storage.
  getStorageData: function GroupItems_getStorageData() {
    var data = {nextID: this.nextID, groupItems: []};
    this.groupItems.forEach(function(groupItem) {
      data.groupItems.push(groupItem.getStorageData());
    });

    return data;
  },

  // ----------
  // Function: saveAll
  // Saves GroupItems state, as well as the state of all of the groupItems.
  saveAll: function GroupItems_saveAll() {
    this._save();
    this.groupItems.forEach(function(groupItem) {
      groupItem.save();
    });
  },

  // ----------
  // Function: _save
  // Saves GroupItems state.
  _save: function GroupItems__save() {
    if (!this._inited) // too soon to save now
      return;

    let activeGroupId = this._activeGroupItem ? this._activeGroupItem.id : null;
    Storage.saveGroupItemsData(
      gWindow, { nextID: this.nextID, activeGroupId: activeGroupId });
  },

  // ----------
  // Function: getBoundingBox
  // Given an array of DOM elements, returns a <Rect> with (roughly) the union of their locations.
  getBoundingBox: function GroupItems_getBoundingBox(els) {
    var bounds = [iQ(el).bounds() for each (el in els)];
    var left   = Math.min.apply({},[ b.left   for each (b in bounds) ]);
    var top    = Math.min.apply({},[ b.top    for each (b in bounds) ]);
    var right  = Math.max.apply({},[ b.right  for each (b in bounds) ]);
    var bottom = Math.max.apply({},[ b.bottom for each (b in bounds) ]);

    return new Rect(left, top, right-left, bottom-top);
  },

  // ----------
  // Function: reconstitute
  // Restores to stored state, creating groupItems as needed.
  reconstitute: function GroupItems_reconstitute(groupItemsData, groupItemData) {
    try {
      let activeGroupId;

      if (groupItemsData) {
        if (groupItemsData.nextID)
          this.nextID = Math.max(this.nextID, groupItemsData.nextID);
        if (groupItemsData.activeGroupId)
          activeGroupId = groupItemsData.activeGroupId;
      }

      if (groupItemData) {
        var toClose = this.groupItems.concat();
        for (var id in groupItemData) {
          let data = groupItemData[id];
          if (this.groupItemStorageSanity(data)) {
            let groupItem = this.groupItem(data.id); 
            if (groupItem && !groupItem.hidden) {
              groupItem.userSize = data.userSize;
              groupItem.setTitle(data.title);
              groupItem.setBounds(data.bounds, true);
              
              let index = toClose.indexOf(groupItem);
              if (index != -1)
                toClose.splice(index, 1);
            } else {
              var options = {
                dontPush: true,
                immediately: true
              };
  
              new GroupItem([], Utils.extend({}, data, options));
            }
          }
        }

        toClose.forEach(function(groupItem) {
          groupItem.destroy({immediately: true});
        });
      }

      // set active group item
      if (activeGroupId) {
        let activeGroupItem = this.groupItem(activeGroupId);
        if (activeGroupItem)
          this.setActiveGroupItem(activeGroupItem);
      }

      this._inited = true;
      this._save(); // for nextID
    } catch(e) {
      Utils.log("error in recons: "+e);
    }
  },

  // ----------
  // Function: load
  // Loads the storage data for groups. 
  // Returns true if there was global group data.
  load: function GroupItems_load() {
    let groupItemsData = Storage.readGroupItemsData(gWindow);
    let groupItemData = Storage.readGroupItemData(gWindow);
    this.reconstitute(groupItemsData, groupItemData);
    
    return (groupItemsData && !Utils.isEmptyObject(groupItemsData));
  },

  // ----------
  // Function: groupItemStorageSanity
  // Given persistent storage data for a groupItem, returns true if it appears to not be damaged.
  groupItemStorageSanity: function GroupItems_groupItemStorageSanity(groupItemData) {
    // TODO: check everything
    // Bug 586555
    var sane = true;
    if (!Utils.isRect(groupItemData.bounds)) {
      Utils.log('GroupItems.groupItemStorageSanity: bad bounds', groupItemData.bounds);
      sane = false;
    }

    return sane;
  },

  // ----------
  // Function: register
  // Adds the given <GroupItem> to the list of groupItems we're tracking.
  register: function GroupItems_register(groupItem) {
    Utils.assert(groupItem, 'groupItem');
    Utils.assert(this.groupItems.indexOf(groupItem) == -1, 'only register once per groupItem');
    this.groupItems.push(groupItem);
    UI.updateTabButton();
  },

  // ----------
  // Function: unregister
  // Removes the given <GroupItem> from the list of groupItems we're tracking.
  unregister: function GroupItems_unregister(groupItem) {
    var index = this.groupItems.indexOf(groupItem);
    if (index != -1)
      this.groupItems.splice(index, 1);

    if (groupItem == this._activeGroupItem)
      this._activeGroupItem = null;

    this._arrangesPending = this._arrangesPending.filter(function (pending) {
      return groupItem != pending.groupItem;
    });

    UI.updateTabButton();
  },

  // ----------
  // Function: groupItem
  // Given some sort of identifier, returns the appropriate groupItem.
  // Currently only supports groupItem ids.
  groupItem: function GroupItems_groupItem(a) {
    var result = null;
    this.groupItems.forEach(function(candidate) {
      if (candidate.id == a)
        result = candidate;
    });

    return result;
  },

  // ----------
  // Function: removeAll
  // Removes all tabs from all groupItems (which automatically closes all unnamed groupItems).
  removeAll: function GroupItems_removeAll() {
    var toRemove = this.groupItems.concat();
    toRemove.forEach(function(groupItem) {
      groupItem.removeAll();
    });
  },

  // ----------
  // Function: newTab
  // Given a <TabItem>, files it in the appropriate groupItem.
  newTab: function GroupItems_newTab(tabItem, options) {
    let activeGroupItem = this.getActiveGroupItem();

    // 1. Active group
    // 2. Active orphan
    // 3. First visible non-app tab (that's not the tab in question), whether it's an
    // orphan or not (make a new group if it's an orphan, add it to the group if it's
    // not)
    // 4. First group
    // 5. First orphan that's not the tab in question
    // 6. At this point there should be no groups or tabs (except for app tabs and the
    // tab in question): make a new group

    if (activeGroupItem) {
      activeGroupItem.add(tabItem, options);
      return;
    }

    let orphanTabItem = this.getActiveOrphanTab();
    if (!orphanTabItem) {
      let targetGroupItem;
      // find first visible non-app tab in the tabbar.
      gBrowser.visibleTabs.some(function(tab) {
        if (!tab.pinned && tab != tabItem.tab) {
          if (tab._tabViewTabItem) {
            if (!tab._tabViewTabItem.parent) {
              // the first visible tab is an orphan tab, set the orphan tab, and 
              // create a new group for orphan tab and new tabItem
              orphanTabItem = tab._tabViewTabItem;
            } else if (!tab._tabViewTabItem.parent.hidden) {
              // the first visible tab belongs to a group, add the new tabItem to 
              // that group
              targetGroupItem = tab._tabViewTabItem.parent;
            }
          }
          return true;
        }
        return false;
      });

      let visibleGroupItems;
      if (!orphanTabItem) {
        if (targetGroupItem) {
          // add the new tabItem to the first group item
          targetGroupItem.add(tabItem);
          this.setActiveGroupItem(targetGroupItem);
          return;
        } else {
          // find the first visible group item
          visibleGroupItems = this.groupItems.filter(function(groupItem) {
            return (!groupItem.hidden);
          });
          if (visibleGroupItems.length > 0) {
            visibleGroupItems[0].add(tabItem);
            this.setActiveGroupItem(visibleGroupItems[0]);
            return;
          }
        }
        let orphanedTabs = this.getOrphanedTabs();
        // set the orphan tab, and create a new group for orphan tab and 
        // new tabItem
        if (orphanedTabs.length > 0)
          orphanTabItem = orphanedTabs[0];
      }
    }

    // create new group for orphan tab and new tabItem
    let tabItems;
    let newGroupItemBounds;
    // the orphan tab would be the same as tabItem when all tabs are app tabs
    // and a new tab is created.
    if (orphanTabItem && orphanTabItem.tab != tabItem.tab) {
      newGroupItemBounds = orphanTabItem.getBounds();
      tabItems = [orphanTabItem, tabItem];
    } else {
      tabItem.setPosition(60, 60, true);
      newGroupItemBounds = tabItem.getBounds();
      tabItems = [tabItem];
    }

    newGroupItemBounds.inset(-40,-40);
    let newGroupItem = new GroupItem(tabItems, { bounds: newGroupItemBounds });
    newGroupItem.snap();
    this.setActiveGroupItem(newGroupItem);
  },

  // ----------
  // Function: getActiveGroupItem
  // Returns the active groupItem. Active means its tabs are
  // shown in the tab bar when not in the TabView interface.
  getActiveGroupItem: function GroupItems_getActiveGroupItem() {
    return this._activeGroupItem;
  },

  // ----------
  // Function: setActiveGroupItem
  // Sets the active groupItem, thereby showing only the relevant tabs and
  // setting the groupItem which will receive new tabs.
  //
  // Paramaters:
  //  groupItem - the active <GroupItem> or <null> if no groupItem is active
  //          (which means we have an orphaned tab selected)
  setActiveGroupItem: function GroupItems_setActiveGroupItem(groupItem) {
    if (this._activeGroupItem)
      iQ(this._activeGroupItem.container).removeClass('activeGroupItem');

    if (groupItem !== null) {
      if (groupItem)
        iQ(groupItem.container).addClass('activeGroupItem');
      // if a groupItem is active, we surely are not in an orphaned tab.
      this.setActiveOrphanTab(null);
    }

    this._activeGroupItem = groupItem;
    this._save();
  },

  // ----------
  // Function: getActiveOrphanTab
  // Returns the active orphan tab, in cases when there is no active groupItem.
  getActiveOrphanTab: function GroupItems_getActiveOrphanTab() {
    return this._activeOrphanTab;
  },

  // ----------
  // Function: setActiveOrphanTab
  // In cases where an orphan tab (not in a groupItem) is active by itself,
  // this function is called and the "active orphan tab" is set.
  //
  // Paramaters:
  //  groupItem - the active <TabItem> or <null>
  setActiveOrphanTab: function GroupItems_setActiveOrphanTab(tabItem) {
    if (tabItem !== null)
      this.setActiveGroupItem(null);
    this._activeOrphanTab = tabItem;
  },

  // ----------
  // Function: _updateTabBar
  // Hides and shows tabs in the tab bar based on the active groupItem or
  // currently active orphan tabItem
  _updateTabBar: function GroupItems__updateTabBar() {
    if (!window.UI)
      return; // called too soon
      
    if (!this._activeGroupItem && !this._activeOrphanTab) {
      Utils.assert(false, "There must be something to show in the tab bar!");
      return;
    }

    let tabItems = this._activeGroupItem == null ?
      [this._activeOrphanTab] : this._activeGroupItem._children;
    gBrowser.showOnlyTheseTabs(tabItems.map(function(item) item.tab));
  },

  // ----------
  // Function: updateActiveGroupItemAndTabBar
  // Sets active TabItem and GroupItem, and updates tab bar appropriately.
  updateActiveGroupItemAndTabBar: function GroupItems_updateActiveGroupItemAndTabBar(tabItem) {
    Utils.assertThrow(tabItem && tabItem.isATabItem, "tabItem must be a TabItem");

    let groupItem = tabItem.parent;

    if (groupItem) {
      this.setActiveGroupItem(groupItem);
      groupItem.setActiveTab(tabItem);
    } else
      this.setActiveOrphanTab(tabItem);

    this._updateTabBar();
  },

  // ----------
  // Function: getOrphanedTabs
  // Returns an array of all tabs that aren't in a groupItem.
  getOrphanedTabs: function GroupItems_getOrphanedTabs() {
    var tabs = TabItems.getItems();
    tabs = tabs.filter(function(tab) {
      return tab.parent == null;
    });
    return tabs;
  },

  // ----------
  // Function: getNextGroupItemTab
  // Paramaters:
  //  reverse - the boolean indicates the direction to look for the next groupItem.
  // Returns the <tabItem>. If nothing is found, return null.
  getNextGroupItemTab: function GroupItems_getNextGroupItemTab(reverse) {
    var groupItems = Utils.copy(GroupItems.groupItems);
    var activeGroupItem = GroupItems.getActiveGroupItem();
    var activeOrphanTab = GroupItems.getActiveOrphanTab();
    var tabItem = null;

    if (reverse)
      groupItems = groupItems.reverse();

    if (!activeGroupItem) {
      if (groupItems.length > 0) {
        groupItems.some(function(groupItem) {
          if (!groupItem.hidden) {
            // restore the last active tab in the group
            let activeTab = groupItem.getActiveTab();
            if (activeTab) {
              tabItem = activeTab;
              return true;
            }
            // if no tab is active, use the first one
            var child = groupItem.getChild(0);
            if (child) {
              tabItem = child;
              return true;
            }
          }
          return false;
        });
      }
    } else {
      var currentIndex;
      groupItems.some(function(groupItem, index) {
        if (!groupItem.hidden && groupItem == activeGroupItem) {
          currentIndex = index;
          return true;
        }
        return false;
      });
      var firstGroupItems = groupItems.slice(currentIndex + 1);
      firstGroupItems.some(function(groupItem) {
        if (!groupItem.hidden) {
          // restore the last active tab in the group
          let activeTab = groupItem.getActiveTab();
          if (activeTab) {
            tabItem = activeTab;
            return true;
          }
          // if no tab is active, use the first one
          var child = groupItem.getChild(0);
          if (child) {
            tabItem = child;
            return true;
          }
        }
        return false;
      });
      if (!tabItem) {
        var orphanedTabs = GroupItems.getOrphanedTabs();
        if (orphanedTabs.length > 0)
          tabItem = orphanedTabs[0];
      }
      if (!tabItem) {
        var secondGroupItems = groupItems.slice(0, currentIndex);
        secondGroupItems.some(function(groupItem) {
          if (!groupItem.hidden) {
            // restore the last active tab in the group
            let activeTab = groupItem.getActiveTab();
            if (activeTab) {
              tabItem = activeTab;
              return true;
            }
            // if no tab is active, use the first one
            var child = groupItem.getChild(0);
            if (child) {
              tabItem = child;
              return true;
            }
          }
          return false;
        });
      }
    }
    return tabItem;
  },

  // ----------
  // Function: moveTabToGroupItem
  // Used for the right click menu in the tab strip; moves the given tab
  // into the given group. Does nothing if the tab is an app tab.
  // Paramaters:
  //  tab - the <xul:tab>.
  //  groupItemId - the <groupItem>'s id.  If nothing, create a new <groupItem>.
  moveTabToGroupItem : function GroupItems_moveTabToGroupItem (tab, groupItemId) {
    if (tab.pinned)
      return;

    Utils.assertThrow(tab._tabViewTabItem, "tab must be linked to a TabItem");

    // given tab is already contained in target group
    if (tab._tabViewTabItem.parent && tab._tabViewTabItem.parent.id == groupItemId)
      return;

    let shouldUpdateTabBar = false;
    let shouldShowTabView = false;
    let groupItem;

    // switch to the appropriate tab first.
    if (gBrowser.selectedTab == tab) {
      if (gBrowser.visibleTabs.length > 1) {
        gBrowser._blurTab(tab);
        shouldUpdateTabBar = true;
      } else {
        shouldShowTabView = true;
      }
    } else {
      shouldUpdateTabBar = true
    }

    // remove tab item from a groupItem
    if (tab._tabViewTabItem.parent)
      tab._tabViewTabItem.parent.remove(tab._tabViewTabItem);

    // add tab item to a groupItem
    if (groupItemId) {
      groupItem = GroupItems.groupItem(groupItemId);
      groupItem.add(tab._tabViewTabItem);
      UI.setReorderTabItemsOnShow(groupItem);
    } else {
      let pageBounds = Items.getPageBounds();
      pageBounds.inset(20, 20);

      let box = new Rect(pageBounds);
      box.width = 250;
      box.height = 200;

      new GroupItem([ tab._tabViewTabItem ], { bounds: box });
    }

    if (shouldUpdateTabBar)
      this._updateTabBar();
    else if (shouldShowTabView)
      UI.showTabView();
  },

  // ----------
  // Function: removeHiddenGroups
  // Removes all hidden groups' data and its browser tabs.
  removeHiddenGroups: function GroupItems_removeHiddenGroups() {
    if (this._removingHiddenGroups)
      return;
    this._removingHiddenGroups = true;

    let groupItems = this.groupItems.concat();
    groupItems.forEach(function(groupItem) {
      if (groupItem.hidden)
        groupItem.closeHidden();
     });

    this._removingHiddenGroups = false;
  },

  // ----------
  // Function: getUnclosableGroupItemId
  // If there's only one (non-hidden) group, and there are app tabs present, 
  // returns that group.
  // Return the <GroupItem>'s Id
  getUnclosableGroupItemId: function GroupItems_getUnclosableGroupItemId() {
    let unclosableGroupItemId = null;

    if (gBrowser._numPinnedTabs > 0) {
      let hiddenGroupItems = 
        this.groupItems.concat().filter(function(groupItem) {
          return !groupItem.hidden;
        });
      if (hiddenGroupItems.length == 1)
        unclosableGroupItemId = hiddenGroupItems[0].id;
    }

    return unclosableGroupItemId;
  },

  // ----------
  // Function: updateGroupCloseButtons
  // Updates group close buttons.
  updateGroupCloseButtons: function GroupItems_updateGroupCloseButtons() {
    let unclosableGroupItemId = this.getUnclosableGroupItemId();

    if (unclosableGroupItemId) {
      let groupItem = this.groupItem(unclosableGroupItemId);

      if (groupItem) {
        groupItem.$closeButton.hide();
      }
    } else {
      this.groupItems.forEach(function(groupItem) {
        groupItem.$closeButton.show();
      });
    }
  },
  
  // ----------
  // Function: calcValidSize
  // Basic measure rules. Assures that item is a minimum size.
  calcValidSize: function GroupItems_calcValidSize(size, options) {
    Utils.assert(Utils.isPoint(size), 'input is a Point');
    Utils.assert((size.x>0 || size.y>0) && (size.x!=0 && size.y!=0), 
      "dimensions are valid:"+size.x+","+size.y);
    return new Point(
      Math.max(size.x, GroupItems.minGroupWidth),
      Math.max(size.y, GroupItems.minGroupHeight));
  },

  // ----------
  // Function: pauseAutoclose()
  // Temporarily disable the behavior that closes groups when they become
  // empty. This is used when entering private browsing, to avoid trashing the
  // user's groups while private browsing is shuffling things around.
  pauseAutoclose: function GroupItems_pauseAutoclose() {
    this._autoclosePaused = true;
  },

  // ----------
  // Function: unpauseAutoclose()
  // Re-enables the auto-close behavior.
  resumeAutoclose: function GroupItems_resumeAutoclose() {
    this._autoclosePaused = false;
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is tabitems.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Ehsan Akhgari <ehsan@mozilla.com>
 * Raymond Lee <raymond@appcoast.com>
 * Tim Taubert <tim.taubert@gmx.de>
 * Sean Dunn <seanedunn@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: tabitems.js

// ##########
// Class: TabItem
// An <Item> that represents a tab. Also implements the <Subscribable> interface.
//
// Parameters:
//   tab - a xul:tab
function TabItem(tab, options) {
  Utils.assert(tab, "tab");

  this.tab = tab;
  // register this as the tab's tabItem
  this.tab._tabViewTabItem = this;

  if (!options)
    options = {};

  // ___ set up div
  document.body.appendChild(TabItems.fragment().cloneNode(true));
  
  // The document fragment contains just one Node
  // As per DOM3 appendChild: it will then be the last child
  let div = document.body.lastChild;
  let $div = iQ(div);

  this._cachedImageData = null;
  this.canvasSizeForced = false;
  this.$thumb = iQ('.thumb', $div);
  this.$fav   = iQ('.favicon', $div);
  this.$tabTitle = iQ('.tab-title', $div);
  this.$canvas = iQ('.thumb canvas', $div);
  this.$cachedThumb = iQ('img.cached-thumb', $div);
  this.$favImage = iQ('.favicon>img', $div);
  this.$close = iQ('.close', $div);

  this.tabCanvas = new TabCanvas(this.tab, this.$canvas[0]);

  this.defaultSize = new Point(TabItems.tabWidth, TabItems.tabHeight);
  this._hidden = false;
  this.isATabItem = true;
  this.keepProportional = true;
  this._hasBeenDrawn = false;
  this._reconnected = false;
  this.isStacked = false;
  this.url = "";

  var self = this;

  this.isDragging = false;

  // Read off the total vertical and horizontal padding on the tab container
  // and cache this value, as it must be the same for every TabItem.
  if (Utils.isEmptyObject(TabItems.tabItemPadding)) {
    TabItems.tabItemPadding.x = parseInt($div.css('padding-left'))
        + parseInt($div.css('padding-right'));
  
    TabItems.tabItemPadding.y = parseInt($div.css('padding-top'))
        + parseInt($div.css('padding-bottom'));
  }
  
  this.bounds = new Rect(0,0,1,1);

  this._lastTabUpdateTime = Date.now();

  // ___ superclass setup
  this._init(div);

  // ___ drag/drop
  // override dropOptions with custom tabitem methods
  // This is mostly to support the phantom groupItems.
  this.dropOptions.drop = function(e) {
    var $target = this.$container;
    this.isDropTarget = false;

    var phantom = $target.data("phantomGroupItem");

    var groupItem = drag.info.item.parent;
    if (groupItem) {
      groupItem.add(drag.info.$el);
    } else {
      phantom.removeClass("phantom acceptsDrop");
      new GroupItem([$target, drag.info.$el], {container:phantom, bounds:phantom.bounds()});
    }
  };

  this.dropOptions.over = function(e) {
    var $target = this.$container;
    this.isDropTarget = true;

    $target.removeClass("acceptsDrop");

    var phantomMargin = 40;

    var groupItemBounds = this.getBounds();
    groupItemBounds.inset(-phantomMargin, -phantomMargin);

    iQ(".phantom").remove();
    var phantom = iQ("<div>")
      .addClass("groupItem phantom acceptsDrop")
      .css({
        position: "absolute",
        zIndex: -99
      })
      .css(groupItemBounds)
      .hide()
      .appendTo("body");

    var defaultRadius = Trenches.defaultRadius;
    // Extend the margin so that it covers the case where the target tab item
    // is right next to a trench.
    Trenches.defaultRadius = phantomMargin + 1;
    var updatedBounds = drag.info.snapBounds(groupItemBounds,'none');
    Trenches.defaultRadius = defaultRadius;

    // Utils.log('updatedBounds:',updatedBounds);
    if (updatedBounds)
      phantom.css(updatedBounds);

    phantom.fadeIn();

    $target.data("phantomGroupItem", phantom);
  };

  this.dropOptions.out = function(e) {
    this.isDropTarget = false;
    var phantom = this.$container.data("phantomGroupItem");
    if (phantom) {
      phantom.fadeOut(function() {
        iQ(this).remove();
      });
    }
  };

  this.draggable();

  // ___ more div setup
  $div.mousedown(function(e) {
    if (!Utils.isRightClick(e))
      self.lastMouseDownTarget = e.target;
  });

  $div.mouseup(function(e) {
    var same = (e.target == self.lastMouseDownTarget);
    self.lastMouseDownTarget = null;
    if (!same)
      return;

    // press close button or middle mouse click
    if (iQ(e.target).hasClass("close") || Utils.isMiddleClick(e)) {
      self.closedManually = true;
      self.close();
    } else {
      if (!Items.item(this).isDragging)
        self.zoomIn();
    }
  });

  this.setResizable(true, options.immediately);
  this.droppable(true);
  this._updateDebugBounds();

  TabItems.register(this);

  // ___ reconnect to data from Storage
  if (!TabItems.reconnectingPaused())
    this._reconnect();
};

TabItem.prototype = Utils.extend(new Item(), new Subscribable(), {
  // ----------
  // Function: forceCanvasSize
  // Repaints the thumbnail with the given resolution, and forces it
  // to stay that resolution until unforceCanvasSize is called.
  forceCanvasSize: function TabItem_forceCanvasSize(w, h) {
    this.canvasSizeForced = true;
    this.$canvas[0].width = w;
    this.$canvas[0].height = h;
    this.tabCanvas.paint();
  },

  // ----------
  // Function: _getFontSizeFromWidth
  // Private method that returns the fontsize to use given the tab's width
  _getFontSizeFromWidth: function TabItem__getFontSizeFromWidth(width) {
    let widthRange = new Range(0,TabItems.tabWidth);
    let proportion = widthRange.proportion(width-TabItems.tabItemPadding.x, true);
    // proportion is in [0,1]
    return TabItems.fontSizeRange.scale(proportion);
  },

  // ----------
  // Function: unforceCanvasSize
  // Stops holding the thumbnail resolution; allows it to shift to the
  // size of thumbnail on screen. Note that this call does not nest, unlike
  // <TabItems.resumePainting>; if you call forceCanvasSize multiple
  // times, you just need a single unforce to clear them all.
  unforceCanvasSize: function TabItem_unforceCanvasSize() {
    this.canvasSizeForced = false;
  },

  // ----------
  // Function: isShowingCachedData
  // Returns a boolean indicates whether the cached data is being displayed or
  // not. 
  isShowingCachedData: function() {
    return (this._cachedImageData != null);
  },

  // ----------
  // Function: showCachedData
  // Shows the cached data i.e. image and title.  Note: this method should only
  // be called at browser startup with the cached data avaliable.
  //
  // Parameters:
  //   tabData - the tab data
  showCachedData: function TabItem_showCachedData(tabData) {
    this._cachedImageData = tabData.imageData;
    this.$cachedThumb.attr("src", this._cachedImageData).show();
    this.$canvas.css({opacity: 0.0});
    this.$tabTitle.text(tabData.title ? tabData.title : "");
  },

  // ----------
  // Function: hideCachedData
  // Hides the cached data i.e. image and title and show the canvas.
  hideCachedData: function TabItem_hideCachedData() {
    this.$cachedThumb.hide();
    this.$canvas.css({opacity: 1.0});
    if (this._cachedImageData)
      this._cachedImageData = null;
  },

  // ----------
  // Function: getStorageData
  // Get data to be used for persistent storage of this object.
  //
  // Parameters:
  //   getImageData - true to include thumbnail pixels (and page title as well); default false
  getStorageData: function TabItem_getStorageData(getImageData) {
    let imageData = null;

    if (getImageData) { 
      if (this._cachedImageData)
        imageData = this._cachedImageData;
      else if (this.tabCanvas)
        imageData = this.tabCanvas.toImageData();
    }

    return {
      bounds: this.getBounds(),
      userSize: (Utils.isPoint(this.userSize) ? new Point(this.userSize) : null),
      url: this.tab.linkedBrowser.currentURI.spec,
      groupID: (this.parent ? this.parent.id : 0),
      imageData: imageData,
      title: getImageData && this.tab.label || null
    };
  },

  // ----------
  // Function: save
  // Store persistent for this object.
  //
  // Parameters:
  //   saveImageData - true to include thumbnail pixels (and page title as well); default false
  save: function TabItem_save(saveImageData) {
    try{
      if (!this.tab || this.tab.parentNode == null || !this._reconnected) // too soon/late to save
        return;

      var data = this.getStorageData(saveImageData);
      if (TabItems.storageSanity(data))
        Storage.saveTab(this.tab, data);
    } catch(e) {
      Utils.log("Error in saving tab value: "+e);
    }
  },

  // ----------
  // Function: _reconnect
  // Load the reciever's persistent data from storage. If there is none, 
  // treats it as a new tab. 
  _reconnect: function TabItem__reconnect() {
    Utils.assertThrow(!this._reconnected, "shouldn't already be reconnected");
    Utils.assertThrow(this.tab, "should have a xul:tab");

    let tabData = null;
    let self = this;
    let imageDataCb = function(imageData) {
      Utils.assertThrow(tabData, "tabData");
      
      tabData.imageData = imageData;

      let currentUrl = self.tab.linkedBrowser.currentURI.spec;
      // If we have a cached image, then show it if the loaded URL matches
      // what the cache is from, OR the loaded URL is blank, which means
      // that the page hasn't loaded yet.
      if (tabData.imageData &&
          (tabData.url == currentUrl || currentUrl == 'about:blank')) {
        self.showCachedData(tabData);
      }
    };
    // getTabData returns the sessionstore contents, but passes
    // a callback to run when the thumbnail is finally loaded.
    tabData = Storage.getTabData(this.tab, imageDataCb);
    if (tabData && TabItems.storageSanity(tabData)) {
      if (self.parent)
        self.parent.remove(self, {immediately: true});

      self.setBounds(tabData.bounds, true);

      if (Utils.isPoint(tabData.userSize))
        self.userSize = new Point(tabData.userSize);

      if (tabData.groupID) {
        var groupItem = GroupItems.groupItem(tabData.groupID);
        if (groupItem) {
          groupItem.add(self, {immediately: true});

          // if it matches the selected tab or no active tab and the browser
          // tab is hidden, the active group item would be set.
          if (self.tab == gBrowser.selectedTab ||
              (!GroupItems.getActiveGroupItem() && !self.tab.hidden))
            GroupItems.setActiveGroupItem(self.parent);
        }
      }
    } else {
      // create tab by double click is handled in UI_init().
      if (!TabItems.creatingNewOrphanTab)
        GroupItems.newTab(self, {immediately: true});
    }

    self._reconnected = true;
    self.save();
    self._sendToSubscribers("reconnected");
  },
  
  // ----------
  // Function: setHidden
  // Hide/unhide this item
  setHidden: function TabItem_setHidden(val) {
    if (val)
      this.addClass("tabHidden");
    else
      this.removeClass("tabHidden");
    this._hidden = val;
  },

  // ----------
  // Function: getHidden
  // Return hide state of item
  getHidden: function TabItem_getHidden() {
    return this._hidden;
  },

  // ----------
  // Function: setBounds
  // Moves this item to the specified location and size.
  //
  // Parameters:
  //   rect - a <Rect> giving the new bounds
  //   immediately - true if it should not animate; default false
  //   options - an object with additional parameters, see below
  //
  // Possible options:
  //   force - true to always update the DOM even if the bounds haven't changed; default false
  setBounds: function TabItem_setBounds(inRect, immediately, options) {
    if (!Utils.isRect(inRect)) {
      Utils.trace('TabItem.setBounds: rect is not a real rectangle!', inRect);
      return;
    }

    if (!options)
      options = {};

    // force the input size to be valid
    let validSize = TabItems.calcValidSize(
      new Point(inRect.width, inRect.height), 
      {hideTitle: (this.isStacked || options.hideTitle === true)});
    let rect = new Rect(inRect.left, inRect.top, 
      validSize.x, validSize.y);

    var css = {};

    if (rect.left != this.bounds.left || options.force)
      css.left = rect.left;

    if (rect.top != this.bounds.top || options.force)
      css.top = rect.top;

    if (rect.width != this.bounds.width || options.force) {
      css.width = rect.width - TabItems.tabItemPadding.x;
      css.fontSize = this._getFontSizeFromWidth(rect.width);
      css.fontSize += 'px';
    }

    if (rect.height != this.bounds.height || options.force) {
      if (!this.isStacked)
          css.height = rect.height - TabItems.tabItemPadding.y -
                       TabItems.fontSizeRange.max;
      else
        css.height = rect.height - TabItems.tabItemPadding.y;
    }

    if (Utils.isEmptyObject(css))
      return;

    this.bounds.copy(rect);

    // If this is a brand new tab don't animate it in from
    // a random location (i.e., from [0,0]). Instead, just
    // have it appear where it should be.
    if (immediately || (!this._hasBeenDrawn)) {
      this.$container.css(css);
    } else {
      TabItems.pausePainting();
      this.$container.animate(css, {
          duration: 200,
        easing: "tabviewBounce",
        complete: function() {
          TabItems.resumePainting();
        }
      });
    }

    if (css.fontSize && !(this.parent && this.parent.isStacked())) {
      if (css.fontSize < TabItems.fontSizeRange.min)
        immediately ? this.$tabTitle.hide() : this.$tabTitle.fadeOut();
      else
        immediately ? this.$tabTitle.show() : this.$tabTitle.fadeIn();
    }

    if (css.width) {
      TabItems.update(this.tab);

      let widthRange, proportion;

      if (this.parent && this.parent.isStacked()) {
        if (UI.rtl) {
          this.$fav.css({top:0, right:0});
        } else {
          this.$fav.css({top:0, left:0});
        }
        widthRange = new Range(70, 90);
        proportion = widthRange.proportion(css.width); // between 0 and 1
      } else {
        if (UI.rtl) {
          this.$fav.css({top:4, right:2});
        } else {
          this.$fav.css({top:4, left:4});
        }
        widthRange = new Range(40, 45);
        proportion = widthRange.proportion(css.width); // between 0 and 1
      }

      if (proportion <= .1)
        this.$close.hide();
      else
        this.$close.show().css({opacity:proportion});

      var pad = 1 + 5 * proportion;
      var alphaRange = new Range(0.1,0.2);
      this.$fav.css({
       "-moz-padding-start": pad + "px",
       "-moz-padding-end": pad + 2 + "px",
       "padding-top": pad + "px",
       "padding-bottom": pad + "px",
       "border-color": "rgba(0,0,0,"+ alphaRange.scale(proportion) +")",
      });
    }

    this._hasBeenDrawn = true;

    UI.clearShouldResizeItems();

    this._updateDebugBounds();
    rect = this.getBounds(); // ensure that it's a <Rect>

    if (!Utils.isRect(this.bounds))
      Utils.trace('TabItem.setBounds: this.bounds is not a real rectangle!', this.bounds);

    if (!this.parent && this.tab.parentNode != null)
      this.setTrenches(rect);

    this.save();
  },

  // ----------
  // Function: setZ
  // Sets the z-index for this item.
  setZ: function TabItem_setZ(value) {
    this.zIndex = value;
    this.$container.css({zIndex: value});
  },

  // ----------
  // Function: close
  // Closes this item (actually closes the tab associated with it, which automatically
  // closes the item.
  // Parameters:
  //   groupClose - true if this method is called by group close action.
  // Returns true if this tab is removed.
  close: function TabItem_close(groupClose) {
    // When the last tab is closed, put a new tab into closing tab's group. If
    // closing tab doesn't belong to a group and no empty group, create a new 
    // one for the new tab.
    if (!groupClose && gBrowser.tabs.length == 1) {
      if (this.tab._tabViewTabItem.parent) {
        group = this.tab._tabViewTabItem.parent;
      } else {
        let emptyGroups = GroupItems.groupItems.filter(function (groupItem) {
          return (!groupItem.getChildren().length);
        });
        group = (emptyGroups.length ? emptyGroups[0] : GroupItems.newGroup());
      }
      group.newTab();
    }
    // when "TabClose" event is fired, the browser tab is about to close and our 
    // item "close" is fired before the browser tab actually get closed. 
    // Therefore, we need "tabRemoved" event below.
    gBrowser.removeTab(this.tab);
    let tabNotClosed = 
      Array.some(gBrowser.tabs, function(tab) { return tab == this.tab; }, this);
    if (!tabNotClosed)
      this._sendToSubscribers("tabRemoved");

    // No need to explicitly delete the tab data, becasue sessionstore data
    // associated with the tab will automatically go away
    return !tabNotClosed;
  },

  // ----------
  // Function: addClass
  // Adds the specified CSS class to this item's container DOM element.
  addClass: function TabItem_addClass(className) {
    this.$container.addClass(className);
  },

  // ----------
  // Function: removeClass
  // Removes the specified CSS class from this item's container DOM element.
  removeClass: function TabItem_removeClass(className) {
    this.$container.removeClass(className);
  },

  // ----------
  // Function: setResizable
  // If value is true, makes this item resizable, otherwise non-resizable.
  // Shows/hides a visible resize handle as appropriate.
  setResizable: function TabItem_setResizable(value, immediately) {
    var $resizer = iQ('.expander', this.container);

    if (value) {
      this.resizeOptions.minWidth = TabItems.minTabWidth;
      this.resizeOptions.minHeight = TabItems.minTabHeight;
      immediately ? $resizer.show() : $resizer.fadeIn();
      this.resizable(true);
    } else {
      immediately ? $resizer.hide() : $resizer.fadeOut();
      this.resizable(false);
    }
  },

  // ----------
  // Function: makeActive
  // Updates this item to visually indicate that it's active.
  makeActive: function TabItem_makeActive() {
    this.$container.addClass("focus");

    if (this.parent)
      this.parent.setActiveTab(this);
  },

  // ----------
  // Function: makeDeactive
  // Updates this item to visually indicate that it's not active.
  makeDeactive: function TabItem_makeDeactive() {
    this.$container.removeClass("focus");
  },

  // ----------
  // Function: zoomIn
  // Allows you to select the tab and zoom in on it, thereby bringing you
  // to the tab in Firefox to interact with.
  // Parameters:
  //   isNewBlankTab - boolean indicates whether it is a newly opened blank tab.
  zoomIn: function TabItem_zoomIn(isNewBlankTab) {
    // don't allow zoom in if its group is hidden
    if (this.parent && this.parent.hidden)
      return;

    let self = this;
    let $tabEl = this.$container;
    let $canvas = this.$canvas;

    UI.setActiveTab(this);
    if (this.parent) {
      GroupItems.setActiveGroupItem(this.parent);
    } else {
      GroupItems.setActiveOrphanTab(this);
    }

    TabItems._update(this.tab, {force: true});

    // Zoom in!
    let tab = this.tab;

    function onZoomDone() {
      $canvas.css({ '-moz-transform': null });
      $tabEl.removeClass("front");

      UI.goToTab(tab);

      // tab might not be selected because hideTabView() is invoked after 
      // UI.goToTab() so we need to setup everything for the gBrowser.selectedTab
      if (tab != gBrowser.selectedTab) {
        UI.onTabSelect(gBrowser.selectedTab);
      } else { 
        if (isNewBlankTab)
          gWindow.gURLBar.focus();
      }
      if (self.parent && self.parent.expanded)
        self.parent.collapse();
    }

    let animateZoom = gPrefBranch.getBoolPref("animate_zoom");
    if (animateZoom) {
      let transform = this.getZoomTransform();
      TabItems.pausePainting();

      $tabEl.addClass("front");
      $canvas
        .css({ '-moz-transform-origin': transform.transformOrigin })
        .animate({ '-moz-transform': transform.transform }, {
          duration: 230,
          easing: 'fast',
          complete: function() {
            onZoomDone();

            setTimeout(function() {
              TabItems.resumePainting();
            }, 0);
          }
        });
    } else {
      setTimeout(onZoomDone, 0);
    }
  },

  // ----------
  // Function: zoomOut
  // Handles the zoom down animation after returning to TabView.
  // It is expected that this routine will be called from the chrome thread
  //
  // Parameters:
  //   complete - a function to call after the zoom down animation
  zoomOut: function TabItem_zoomOut(complete) {
    let $tab = this.$container, $canvas = this.$canvas;
    var self = this;
    
    let onZoomDone = function onZoomDone() {
      $tab.removeClass("front");
      $canvas.css("-moz-transform", null);

      GroupItems.setActiveOrphanTab(null);

      if (typeof complete == "function")
        complete();
    };

    TabItems._update(this.tab, {force: true});

    $tab.addClass("front");

    // If we're in a stacked group, make sure we become the
    // topChild now so that we show the zoom animation correctly.
    if (this.parent && this.parent.isStacked())
      this.parent.setTopChild(this);

    let animateZoom = gPrefBranch.getBoolPref("animate_zoom");
    if (animateZoom) {
      // The scaleCheat of 2 here is a clever way to speed up the zoom-out
      // code. See getZoomTransform() below.
      let transform = this.getZoomTransform(2);
      TabItems.pausePainting();

      $canvas.css({
        '-moz-transform': transform.transform,
        '-moz-transform-origin': transform.transformOrigin
      });

      $canvas.animate({ "-moz-transform": "scale(1.0)" }, {
        duration: 300,
        easing: 'cubic-bezier', // note that this is legal easing, even without parameters
        complete: function() {
          TabItems.resumePainting();
          onZoomDone();
        }
      });
    } else {
      onZoomDone();
    }
  },

  // ----------
  // Function: getZoomTransform
  // Returns the transform function which represents the maximum bounds of the
  // tab thumbnail in the zoom animation.
  getZoomTransform: function TabItem_getZoomTransform(scaleCheat) {
    // Taking the bounds of the container (as opposed to the canvas) makes us
    // immune to any transformations applied to the canvas.
    let { left, top, width, height, right, bottom } = this.$container.bounds();

    let { innerWidth: windowWidth, innerHeight: windowHeight } = window;

    // The scaleCheat is a clever way to speed up the zoom-in code.
    // Because image scaling is slowest on big images, we cheat and stop
    // the image at scaled-down size and placed accordingly. Because the
    // animation is fast, you can't see the difference but it feels a lot
    // zippier. The only trick is choosing the right animation function so
    // that you don't see a change in percieved animation speed from frame #1
    // (the tab) to frame #2 (the half-size image) to frame #3 (the first frame
    // of real animation). Choosing an animation that starts fast is key.

    if (!scaleCheat)
      scaleCheat = 1.7;

    let zoomWidth = width + (window.innerWidth - width) / scaleCheat;
    let zoomScaleFactor = zoomWidth / width;

    let zoomHeight = height * zoomScaleFactor;
    let zoomTop = top * (1 - 1/scaleCheat);
    let zoomLeft = left * (1 - 1/scaleCheat);

    let xOrigin = (left - zoomLeft) / ((left - zoomLeft) + (zoomLeft + zoomWidth - right)) * 100;
    let yOrigin = (top - zoomTop) / ((top - zoomTop) + (zoomTop + zoomHeight - bottom)) * 100;

    return {
      transformOrigin: xOrigin + "% " + yOrigin + "%",
      transform: "scale(" + zoomScaleFactor + ")"
    };
  }
});

// ##########
// Class: TabItems
// Singleton for managing <TabItem>s
let TabItems = {
  minTabWidth: 40,
  tabWidth: 160,
  tabHeight: 120,
  tabAspect: 0, // set in init
  invTabAspect: 0, // set in init  
  fontSize: 9,
  fontSizeRange: new Range(8,15),
  _fragment: null,
  items: [],
  paintingPaused: 0,
  _tabsWaitingForUpdate: null,
  _heartbeat: null, // see explanation at startHeartbeat() below
  _heartbeatTiming: 200, // milliseconds between calls
  _maxTimeForUpdating: 200, // milliseconds that consecutive updates can take
  _lastUpdateTime: Date.now(),
  _eventListeners: [],
  _pauseUpdateForTest: false,
  creatingNewOrphanTab: false,
  tempCanvas: null,
  _reconnectingPaused: false,
  tabItemPadding: {},

  // ----------
  // Function: init
  // Set up the necessary tracking to maintain the <TabItems>s.
  init: function TabItems_init() {
    Utils.assert(window.AllTabs, "AllTabs must be initialized first");
    let self = this;
    
    // Set up tab priority queue
    this._tabsWaitingForUpdate = new TabPriorityQueue();
    this.minTabHeight = this.minTabWidth * this.tabHeight / this.tabWidth;
    this.tabAspect = this.tabHeight / this.tabWidth;
    this.invTabAspect = 1 / this.tabAspect;

    let $canvas = iQ("<canvas>")
      .attr('moz-opaque', '');
    $canvas.appendTo(iQ("body"));
    $canvas.hide();
    this.tempCanvas = $canvas[0];
    // 150 pixels is an empirical size, below which FF's drawWindow()
    // algorithm breaks down
    this.tempCanvas.width = 150;
    this.tempCanvas.height = 112;

    // When a tab is opened, create the TabItem
    this._eventListeners["open"] = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow || tab.pinned)
        return;

      self.link(tab);
    }
    // When a tab's content is loaded, show the canvas and hide the cached data
    // if necessary.
    this._eventListeners["attrModified"] = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow || tab.pinned)
        return;

      self.update(tab);
    }
    // When a tab is closed, unlink.
    this._eventListeners["close"] = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow || tab.pinned)
        return;

      // XXX bug #635975 - don't unlink the tab if the dom window is closing.
      if (!UI.isDOMWindowClosing)
        self.unlink(tab);
    }
    for (let name in this._eventListeners) {
      AllTabs.register(name, this._eventListeners[name]);
    }

    // For each tab, create the link.
    AllTabs.tabs.forEach(function(tab) {
      if (tab.ownerDocument.defaultView != gWindow || tab.pinned)
        return;

      self.link(tab, {immediately: true});
      self.update(tab);
    });
  },

  // ----------
  // Function: uninit
  uninit: function TabItems_uninit() {
    for (let name in this._eventListeners) {
      AllTabs.unregister(name, this._eventListeners[name]);
    }
    this.items.forEach(function(tabItem) {
      for (let x in tabItem) {
        if (typeof tabItem[x] == "object")
          tabItem[x] = null;
      }
    });

    this.items = null;
    this._eventListeners = null;
    this._lastUpdateTime = null;
    this._tabsWaitingForUpdate.clear();
  },

  // ----------
  // Function: fragment
  // Return a DocumentFragment which has a single <div> child. This child node
  // will act as a template for all TabItem containers.
  // The first call of this function caches the DocumentFragment in _fragment.
  fragment: function TabItems_fragment() {
    if (this._fragment)
      return this._fragment;

    let div = document.createElement("div");
    div.classList.add("tab");
    div.innerHTML = "<div class='thumb'>" +
            "<img class='cached-thumb' style='display:none'/><canvas moz-opaque/></div>" +
            "<div class='favicon'><img/></div>" +
            "<span class='tab-title'>&nbsp;</span>" +
            "<div class='close'></div>" +
            "<div class='expander'></div>";
    this._fragment = document.createDocumentFragment();
    this._fragment.appendChild(div);

    return this._fragment;
  },

  // ----------
  // Function: isComplete
  // Return whether the xul:tab has fully loaded.
  isComplete: function TabItems_update(tab) {
    // If our readyState is complete, but we're showing about:blank,
    // and we're not loading about:blank, it means we haven't really
    // started loading. This can happen to the first few tabs in a
    // page.
    Utils.assertThrow(tab, "tab");
    return (
      tab.linkedBrowser.contentDocument.readyState == 'complete' &&
      !(tab.linkedBrowser.contentDocument.URL == 'about:blank' &&
        tab._tabViewTabItem.url != 'about:blank')
    );
  },

  // ----------
  // Function: update
  // Takes in a xul:tab.
  update: function TabItems_update(tab) {
    try {
      Utils.assertThrow(tab, "tab");
      Utils.assertThrow(!tab.pinned, "shouldn't be an app tab");
      Utils.assertThrow(tab._tabViewTabItem, "should already be linked");

      let shouldDefer = (
        this.isPaintingPaused() ||
        this._tabsWaitingForUpdate.hasItems() ||
        Date.now() - this._lastUpdateTime < this._heartbeatTiming
      );

      if (shouldDefer) {
        this._tabsWaitingForUpdate.push(tab);
        this.startHeartbeat();
      } else
        this._update(tab);
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: _update
  // Takes in a xul:tab.
  //
  // Parameters:
  //   tab - a xul tab to update
  //   options - an object with additional parameters, see below
  //
  // Possible options:
  //   force - true to always update the tab item even if it's incomplete
  _update: function TabItems__update(tab, options) {
    try {
      if (this._pauseUpdateForTest)
        return;

      Utils.assertThrow(tab, "tab");

      // ___ get the TabItem
      Utils.assertThrow(tab._tabViewTabItem, "must already be linked");
      let tabItem = tab._tabViewTabItem;

      // Even if the page hasn't loaded, display the favicon and title

      // ___ icon
      if (this.shouldLoadFavIcon(tab.linkedBrowser)) {
        let iconUrl = tab.image;
        if (!iconUrl)
          iconUrl = Utils.defaultFaviconURL;

        if (iconUrl != tabItem.$favImage[0].src)
          tabItem.$favImage[0].src = iconUrl;

        iQ(tabItem.$fav[0]).show();
      } else {
        if (tabItem.$favImage[0].hasAttribute("src"))
          tabItem.$favImage[0].removeAttribute("src");
        iQ(tabItem.$fav[0]).hide();
      }

      // ___ label
      let label = tab.label;
      let $name = tabItem.$tabTitle;
      if ($name.text() != label)
        $name.text(label);

      // ___ remove from waiting list now that we have no other
      // early returns
      this._tabsWaitingForUpdate.remove(tab);

      // ___ URL
      let tabUrl = tab.linkedBrowser.currentURI.spec;
      if (tabUrl != tabItem.url) {
        let oldURL = tabItem.url;
        tabItem.url = tabUrl;
        tabItem.save();
      }

      // ___ Make sure the tab is complete and ready for updating.
      if (!this.isComplete(tab) && (!options || !options.force)) {
        // If it's incomplete, stick it on the end of the queue
        this._tabsWaitingForUpdate.push(tab);
        return;
      }

      // ___ thumbnail
      let $canvas = tabItem.$canvas;
      if (!tabItem.canvasSizeForced) {
        let w = $canvas.width();
        let h = $canvas.height();
        if (w != tabItem.$canvas[0].width || h != tabItem.$canvas[0].height) {
          tabItem.$canvas[0].width = w;
          tabItem.$canvas[0].height = h;
        }
      }

      this._lastUpdateTime = Date.now();
      tabItem._lastTabUpdateTime = this._lastUpdateTime;

      tabItem.tabCanvas.paint();

      // ___ cache
      if (tabItem.isShowingCachedData())
        tabItem.hideCachedData();

      // ___ notify subscribers that a full update has completed.
      tabItem._sendToSubscribers("updated");
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: shouldLoadFavIcon
  // Takes a xul:browser and checks whether we should display a favicon for it.
  shouldLoadFavIcon: function TabItems_shouldLoadFavIcon(browser) {
    return !(browser.contentDocument instanceof window.ImageDocument) &&
           gBrowser.shouldLoadFavIcon(browser.contentDocument.documentURIObject);
  },

  // ----------
  // Function: link
  // Takes in a xul:tab, creates a TabItem for it and adds it to the scene. 
  link: function TabItems_link(tab, options) {
    try {
      Utils.assertThrow(tab, "tab");
      Utils.assertThrow(!tab.pinned, "shouldn't be an app tab");
      Utils.assertThrow(!tab._tabViewTabItem, "shouldn't already be linked");
      new TabItem(tab, options); // sets tab._tabViewTabItem to itself
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // Function: unlink
  // Takes in a xul:tab and destroys the TabItem associated with it. 
  unlink: function TabItems_unlink(tab) {
    try {
      Utils.assertThrow(tab, "tab");
      Utils.assertThrow(tab._tabViewTabItem, "should already be linked");
      // note that it's ok to unlink an app tab; see .handleTabUnpin

      if (tab._tabViewTabItem == GroupItems.getActiveOrphanTab())
        GroupItems.setActiveOrphanTab(null);

      this.unregister(tab._tabViewTabItem);
      tab._tabViewTabItem._sendToSubscribers("close");
      tab._tabViewTabItem.$container.remove();
      tab._tabViewTabItem.removeTrenches();
      Items.unsquish(null, tab._tabViewTabItem);

      tab._tabViewTabItem = null;
      Storage.saveTab(tab, null);

      this._tabsWaitingForUpdate.remove(tab);
    } catch(e) {
      Utils.log(e);
    }
  },

  // ----------
  // when a tab becomes pinned, destroy its TabItem
  handleTabPin: function TabItems_handleTabPin(xulTab) {
    this.unlink(xulTab);
  },

  // ----------
  // when a tab becomes unpinned, create a TabItem for it
  handleTabUnpin: function TabItems_handleTabUnpin(xulTab) {
    this.link(xulTab);
    this.update(xulTab);
  },

  // ----------
  // Function: startHeartbeat
  // Start a new heartbeat if there isn't one already started.
  // The heartbeat is a chain of setTimeout calls that allows us to spread
  // out update calls over a period of time.
  // _heartbeat is used to make sure that we don't add multiple 
  // setTimeout chains.
  startHeartbeat: function TabItems_startHeartbeat() {
    if (!this._heartbeat) {
      let self = this;
      this._heartbeat = setTimeout(function() {
        self._checkHeartbeat();
      }, this._heartbeatTiming);
    }
  },

  // ----------
  // Function: _checkHeartbeat
  // This periodically checks for tabs waiting to be updated, and calls
  // _update on them.
  // Should only be called by startHeartbeat and resumePainting.
  _checkHeartbeat: function TabItems__checkHeartbeat() {
    this._heartbeat = null;

    if (this.isPaintingPaused() || !UI.isIdle)
      return;

    let accumTime = 0;
    let items = this._tabsWaitingForUpdate.getItems();
    // Do as many updates as we can fit into a "perceived" amount
    // of time, which is tunable.
    while (accumTime < this._maxTimeForUpdating && items.length) {
      let updateBegin = Date.now();
      this._update(items.pop());
      let updateEnd = Date.now();

      // Maintain a simple average of time for each tabitem update
      // We can use this as a base by which to delay things like
      // tab zooming, so there aren't any hitches.
      let deltaTime = updateEnd - updateBegin;
      accumTime += deltaTime;
    }

    if (this._tabsWaitingForUpdate.hasItems())
      this.startHeartbeat();
  },

  // ----------
  // Function: pausePainting
  // Tells TabItems to stop updating thumbnails (so you can do
  // animations without thumbnail paints causing stutters).
  // pausePainting can be called multiple times, but every call to
  // pausePainting needs to be mirrored with a call to <resumePainting>.
  pausePainting: function TabItems_pausePainting() {
    this.paintingPaused++;
    if (this._heartbeat) {
      clearTimeout(this._heartbeat);
      this._heartbeat = null;
    }
  },

  // ----------
  // Function: resumePainting
  // Undoes a call to <pausePainting>. For instance, if you called
  // pausePainting three times in a row, you'll need to call resumePainting
  // three times before TabItems will start updating thumbnails again.
  resumePainting: function TabItems_resumePainting() {
    this.paintingPaused--;
    Utils.assert(this.paintingPaused > -1, "paintingPaused should not go below zero");
    if (!this.isPaintingPaused())
      this.startHeartbeat();
  },

  // ----------
  // Function: isPaintingPaused
  // Returns a boolean indicating whether painting
  // is paused or not.
  isPaintingPaused: function TabItems_isPaintingPaused() {
    return this.paintingPaused > 0;
  },

  // ----------
  // Function: pauseReconnecting
  // Don't reconnect any new tabs until resume is called.
  pauseReconnecting: function TabItems_pauseReconnecting() {
    Utils.assertThrow(!this._reconnectingPaused, "shouldn't already be paused");

    this._reconnectingPaused = true;
  },
  
  // ----------
  // Function: resumeReconnecting
  // Reconnect all of the tabs that were created since we paused.
  resumeReconnecting: function TabItems_resumeReconnecting() {
    Utils.assertThrow(this._reconnectingPaused, "should already be paused");

    this._reconnectingPaused = false;
    this.items.forEach(function(item) {
      if (!item._reconnected)
        item._reconnect();
    });
  },
  
  // ----------
  // Function: reconnectingPaused
  // Returns true if reconnecting is paused.
  reconnectingPaused: function TabItems_reconnectingPaused() {
    return this._reconnectingPaused;
  },
  
  // ----------
  // Function: register
  // Adds the given <TabItem> to the master list.
  register: function TabItems_register(item) {
    Utils.assert(item && item.isAnItem, 'item must be a TabItem');
    Utils.assert(this.items.indexOf(item) == -1, 'only register once per item');
    this.items.push(item);
  },

  // ----------
  // Function: unregister
  // Removes the given <TabItem> from the master list.
  unregister: function TabItems_unregister(item) {
    var index = this.items.indexOf(item);
    if (index != -1)
      this.items.splice(index, 1);
  },

  // ----------
  // Function: getItems
  // Returns a copy of the master array of <TabItem>s.
  getItems: function TabItems_getItems() {
    return Utils.copy(this.items);
  },

  // ----------
  // Function: saveAll
  // Saves all open <TabItem>s.
  //
  // Parameters:
  //   saveImageData - true to include thumbnail pixels (and page title as well); default false
  saveAll: function TabItems_saveAll(saveImageData) {
    var items = this.getItems();
    items.forEach(function(item) {
      item.save(saveImageData);
    });
  },

  // ----------
  // Function: storageSanity
  // Checks the specified data (as returned by TabItem.getStorageData or loaded from storage)
  // and returns true if it looks valid.
  // TODO: check everything
  storageSanity: function TabItems_storageSanity(data) {
    var sane = true;
    if (!Utils.isRect(data.bounds)) {
      Utils.log('TabItems.storageSanity: bad bounds', data.bounds);
      sane = false;
    }

    return sane;
  },
  
  // ----------
  // Function: _getWidthForHeight
  // Private method that returns the tabitem width given a height.
  // Set options.hideTitle=true to measure without a title.
  // Default is to measure with a title.
  _getWidthForHeight: function TabItems__getWidthForHeight(height, options) {    
    let titleSize = (options !== undefined && options.hideTitle === true) ? 
      0 : TabItems.fontSizeRange.max;
    return Math.max(0, Math.max(TabItems.minTabHeight, height - titleSize)) * 
      TabItems.invTabAspect;
  },

  // ----------
  // Function: _getHeightForWidth
  // Private method that returns the tabitem height given a width.
  // Set options.hideTitle=false to measure without a title.
  // Default is to measure with a title.
  _getHeightForWidth: function TabItems__getHeightForWidth(width, options) {
    let titleSize = (options !== undefined && options.hideTitle === true) ? 
      0 : TabItems.fontSizeRange.max;
    return Math.max(0, Math.max(TabItems.minTabWidth,width)) *
      TabItems.tabAspect + titleSize;
  },
  
  // ----------
  // Function: calcValidSize
  // Pass in a desired size, and receive a size based on proper title
  // size and aspect ratio.
  calcValidSize: function TabItems_calcValidSize(size, options) {
    Utils.assert(Utils.isPoint(size), 'input is a Point');
    let retSize = new Point(0,0);
    if (size.x==-1) {
      retSize.x = this._getWidthForHeight(size.y, options);
      retSize.y = size.y;
    } else if (size.y==-1) {
      retSize.x = size.x;
      retSize.y = this._getHeightForWidth(size.x, options);
    } else {
      let fitHeight = this._getHeightForWidth(size.x, options);
      let fitWidth = this._getWidthForHeight(size.y, options);

      // Go with the smallest final dimension.
      if (fitWidth < size.x) {
        retSize.x = fitWidth;
        retSize.y = size.y;
      } else {
        retSize.x = size.x;
        retSize.y = fitHeight;
      }
    }
    return retSize;
  }
};

// ##########
// Class: TabPriorityQueue
// Container that returns tab items in a priority order
// Current implementation assigns tab to either a high priority
// or low priority queue, and toggles which queue items are popped
// from. This guarantees that high priority items which are constantly
// being added will not eclipse changes for lower priority items.
function TabPriorityQueue() {
};

TabPriorityQueue.prototype = {
  _low: [], // low priority queue
  _high: [], // high priority queue

  // ----------
  // Function: clear
  // Empty the update queue
  clear: function TabPriorityQueue_clear() {
    this._low = [];
    this._high = [];
  },

  // ----------
  // Function: hasItems
  // Return whether pending items exist
  hasItems: function TabPriorityQueue_hasItems() {
    return (this._low.length > 0) || (this._high.length > 0);
  },

  // ----------
  // Function: getItems
  // Returns all queued items, ordered from low to high priority
  getItems: function TabPriorityQueue_getItems() {
    return this._low.concat(this._high);
  },

  // ----------
  // Function: push
  // Add an item to be prioritized
  push: function TabPriorityQueue_push(tab) {
    // Push onto correct priority queue.
    // It's only low priority if it's in a stack, and isn't the top,
    // and the stack isn't expanded.
    // If it already exists in the destination queue,
    // leave it. If it exists in a different queue, remove it first and push
    // onto new queue.
    let item = tab._tabViewTabItem;
    if (item.parent && (item.parent.isStacked() &&
      !item.parent.isTopOfStack(item) &&
      !item.parent.expanded)) {
      let idx = this._high.indexOf(tab);
      if (idx != -1) {
        this._high.splice(idx, 1);
        this._low.unshift(tab);
      } else if (this._low.indexOf(tab) == -1)
        this._low.unshift(tab);
    } else {
      let idx = this._low.indexOf(tab);
      if (idx != -1) {
        this._low.splice(idx, 1);
        this._high.unshift(tab);
      } else if (this._high.indexOf(tab) == -1)
        this._high.unshift(tab);
    }
  },

  // ----------
  // Function: pop
  // Remove and return the next item in priority order
  pop: function TabPriorityQueue_pop() {
    let ret = null;
    if (this._high.length)
      ret = this._high.pop();
    else if (this._low.length)
      ret = this._low.pop();
    return ret;
  },

  // ----------
  // Function: peek
  // Return the next item in priority order, without removing it
  peek: function TabPriorityQueue_peek() {
    let ret = null;
    if (this._high.length)
      ret = this._high[this._high.length-1];
    else if (this._low.length)
      ret = this._low[this._low.length-1];
    return ret;
  },

  // ----------
  // Function: remove
  // Remove the passed item
  remove: function TabPriorityQueue_remove(tab) {
    let index = this._high.indexOf(tab);
    if (index != -1)
      this._high.splice(index, 1);
    else {
      index = this._low.indexOf(tab);
      if (index != -1)
        this._low.splice(index, 1);
    }
  }
};

// ##########
// Class: TabCanvas
// Takes care of the actual canvas for the tab thumbnail
// Does not need to be accessed from outside of tabitems.js
function TabCanvas(tab, canvas) {
  this.tab = tab;
  this.canvas = canvas;
};

TabCanvas.prototype = {
  // ----------
  // Function: paint
  paint: function TabCanvas_paint(evt) {
    var w = this.canvas.width;
    var h = this.canvas.height;
    if (!w || !h)
      return;

    if (!this.tab.linkedBrowser.contentWindow) {
      Utils.log('no tab.linkedBrowser.contentWindow in TabCanvas.paint()');
      return;
    }

    let ctx = this.canvas.getContext("2d");
    let tempCanvas = TabItems.tempCanvas;
    let bgColor = '#fff';

    if (w < tempCanvas.width) {
      // Small draw case where nearest-neighbor algorithm breaks down in Windows
      // First draw to a larger canvas (150px wide), and then draw that image
      // to the destination canvas.
      let tempCtx = tempCanvas.getContext("2d");
      this._drawWindow(tempCtx, tempCanvas.width, tempCanvas.height, bgColor);

      // Now copy to tabitem canvas.
      try {
        this._fillCanvasBackground(ctx, w, h, bgColor);
        ctx.drawImage(tempCanvas, 0, 0, w, h);
      } catch (e) {
        Utils.error('paint', e);
      }
    } else {
      // General case where nearest neighbor algorithm looks good
      // Draw directly to the destination canvas
      this._drawWindow(ctx, w, h, bgColor);
    }
  },

  // ----------
  // Function: _fillCanvasBackground
  // Draws a rectangle of <width>x<height> with color <bgColor> to the given
  // canvas context.
  _fillCanvasBackground: function TabCanvas__fillCanvasBackground(ctx, width, height, bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  },

  // ----------
  // Function: _drawWindow
  // Draws contents of the tabs' browser window to the given canvas context.
  _drawWindow: function TabCanvas__drawWindow(ctx, width, height, bgColor) {
    this._fillCanvasBackground(ctx, width, height, bgColor);

    let rect = this._calculateClippingRect(width, height);
    let scaler = width / rect.width;

    ctx.save();
    ctx.scale(scaler, scaler);

    try {
      let win = this.tab.linkedBrowser.contentWindow;
      ctx.drawWindow(win, rect.left, rect.top, rect.width, rect.height,
                     bgColor, ctx.DRAWWINDOW_DO_NOT_FLUSH);
    } catch (e) {
      Utils.error('paint', e);
    }

    ctx.restore();
  },

  // ----------
  // Function: _calculateClippingRect
  // Calculate the clipping rect that will be projected to the tab's
  // thumbnail canvas.
  _calculateClippingRect: function TabCanvas__calculateClippingRect(origWidth, origHeight) {
    let win = this.tab.linkedBrowser.contentWindow;

    // TODO BUG 631593: retrieve actual scrollbar width
    // 25px is supposed to be width of the vertical scrollbar
    let maxWidth = Math.max(1, win.innerWidth - 25);
    let maxHeight = win.innerHeight;

    let height = Math.min(maxHeight, Math.floor(origHeight * maxWidth / origWidth));
    let width = Math.floor(origWidth * height / origHeight);

    // very short pages in combination with a very wide browser window force us
    // to extend the clipping rect and add some empty space around the thumb
    let factor = 0.7;
    if (width < maxWidth * factor) {
      width = maxWidth * factor;
      height = Math.floor(origHeight * width / origWidth);
    }

    let left = win.scrollX + Math.max(0, Math.round((maxWidth - width) / 2));
    let top = win.scrollY;

    return new Rect(left, top, width, height);
  },

  // ----------
  // Function: toImageData
  toImageData: function TabCanvas_toImageData() {
    return this.canvas.toDataURL("image/png", "");
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is drag.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: drag.js

// ----------
// Variable: drag
// The Drag that's currently in process.
var drag = {
  info: null,
  zIndex: 100,
  lastMoveTime: 0
};

//----------
//Variable: resize
//The resize (actually a Drag) that is currently in process
var resize = {
  info: null,
  lastMoveTime: 0
};

// ##########
// Class: Drag (formerly DragInfo)
// Helper class for dragging <Item>s
//
// ----------
// Constructor: Drag
// Called to create a Drag in response to an <Item> draggable "start" event.
// Note that it is also used partially during <Item>'s resizable method as well.
//
// Parameters:
//   item - The <Item> being dragged
//   event - The DOM event that kicks off the drag
//   isFauxDrag - (boolean) true if a faux drag, which is used when simply snapping.
function Drag(item, event, isFauxDrag) {
  Utils.assert(item && (item.isAnItem || item.isAFauxItem), 
      'must be an item, or at least a faux item');

  this.item = item;
  this.el = item.container;
  this.$el = iQ(this.el);
  this.parent = this.item.parent;
  this.startPosition = new Point(event.clientX, event.clientY);
  this.startTime = Date.now();

  this.item.isDragging = true;
  this.item.setZ(999999);

  this.safeWindowBounds = Items.getSafeWindowBounds();

  Trenches.activateOthersTrenches(this.el);

  if (!isFauxDrag) {
    // When a tab drag starts, make it the focused tab.
    if (this.item.isAGroupItem) {
      var tab = UI.getActiveTab();
      if (!tab || tab.parent != this.item) {
        if (this.item._children.length)
          UI.setActiveTab(this.item._children[0]);
      }
    } else if (this.item.isATabItem) {
      UI.setActiveTab(this.item);
    }
  }
};

Drag.prototype = {
  // ----------
  // Function: snapBounds
  // Adjusts the given bounds according to the currently active trenches. Used by <Drag.snap>
  //
  // Parameters:
  //   bounds             - (<Rect>) bounds
  //   stationaryCorner   - which corner is stationary? by default, the top left in LTR mode,
  //                        and top right in RTL mode.
  //                        "topleft", "bottomleft", "topright", "bottomright"
  //   assumeConstantSize - (boolean) whether the bounds' dimensions are sacred or not.
  //   keepProportional   - (boolean) if assumeConstantSize is false, whether we should resize
  //                        proportionally or not
  //   checkItemStatus    - (boolean) make sure this is a valid item which should be snapped
  snapBounds: function Drag_snapBounds(bounds, stationaryCorner, assumeConstantSize, keepProportional, checkItemStatus) {
    if (!stationaryCorner)
      stationaryCorner = UI.rtl ? 'topright' : 'topleft';
    var update = false; // need to update
    var updateX = false;
    var updateY = false;
    var newRect;
    var snappedTrenches = {};

    // OH SNAP!

    // if we aren't holding down the meta key or have trenches disabled...
    if (!Keys.meta && !Trenches.disabled) {
      // snappable = true if we aren't a tab on top of something else, and
      // there's no active drop site...
      let snappable = !(this.item.isATabItem &&
                       this.item.overlapsWithOtherItems()) &&
                       !iQ(".acceptsDrop").length;
      if (!checkItemStatus || snappable) {
        newRect = Trenches.snap(bounds, stationaryCorner, assumeConstantSize,
                                keepProportional);
        if (newRect) { // might be false if no changes were made
          update = true;
          snappedTrenches = newRect.snappedTrenches || {};
          bounds = newRect;
        }
      }
    }

    // make sure the bounds are in the window.
    newRect = this.snapToEdge(bounds, stationaryCorner, assumeConstantSize,
                              keepProportional);
    if (newRect) {
      update = true;
      bounds = newRect;
      Utils.extend(snappedTrenches, newRect.snappedTrenches);
    }

    Trenches.hideGuides();
    for (var edge in snappedTrenches) {
      var trench = snappedTrenches[edge];
      if (typeof trench == 'object') {
        trench.showGuide = true;
        trench.show();
      }
    }

    return update ? bounds : false;
  },

  // ----------
  // Function: snap
  // Called when a drag or mousemove occurs. Set the bounds based on the mouse move first, then
  // call snap and it will adjust the item's bounds if appropriate. Also triggers the display of
  // trenches that it snapped to.
  //
  // Parameters:
  //   stationaryCorner   - which corner is stationary? by default, the top left in LTR mode,
  //                        and top right in RTL mode.
  //                        "topleft", "bottomleft", "topright", "bottomright"
  //   assumeConstantSize - (boolean) whether the bounds' dimensions are sacred or not.
  //   keepProportional   - (boolean) if assumeConstantSize is false, whether we should resize
  //                        proportionally or not
  snap: function Drag_snap(stationaryCorner, assumeConstantSize, keepProportional) {
    var bounds = this.item.getBounds();
    bounds = this.snapBounds(bounds, stationaryCorner, assumeConstantSize, keepProportional, true);
    if (bounds) {
      this.item.setBounds(bounds, true);
      return true;
    }
    return false;
  },

  // --------
  // Function: snapToEdge
  // Returns a version of the bounds snapped to the edge if it is close enough. If not,
  // returns false. If <Keys.meta> is true, this function will simply enforce the
  // window edges.
  //
  // Parameters:
  //   rect - (<Rect>) current bounds of the object
  //   stationaryCorner   - which corner is stationary? by default, the top left in LTR mode,
  //                        and top right in RTL mode.
  //                        "topleft", "bottomleft", "topright", "bottomright"
  //   assumeConstantSize - (boolean) whether the rect's dimensions are sacred or not
  //   keepProportional   - (boolean) if we are allowed to change the rect's size, whether the
  //                                  dimensions should scaled proportionally or not.
  snapToEdge: function Drag_snapToEdge(rect, stationaryCorner, assumeConstantSize, keepProportional) {

    var swb = this.safeWindowBounds;
    var update = false;
    var updateX = false;
    var updateY = false;
    var snappedTrenches = {};

    var snapRadius = (Keys.meta ? 0 : Trenches.defaultRadius);
    if (rect.left < swb.left + snapRadius ) {
      if (stationaryCorner.indexOf('right') > -1 && !assumeConstantSize)
        rect.width = rect.right - swb.left;
      rect.left = swb.left;
      update = true;
      updateX = true;
      snappedTrenches.left = 'edge';
    }

    if (rect.right > swb.right - snapRadius) {
      if (updateX || !assumeConstantSize) {
        var newWidth = swb.right - rect.left;
        if (keepProportional)
          rect.height = rect.height * newWidth / rect.width;
        rect.width = newWidth;
        update = true;
      } else if (!updateX || !Trenches.preferLeft) {
        rect.left = swb.right - rect.width;
        update = true;
      }
      snappedTrenches.right = 'edge';
      delete snappedTrenches.left;
    }
    if (rect.top < swb.top + snapRadius) {
      if (stationaryCorner.indexOf('bottom') > -1 && !assumeConstantSize)
        rect.height = rect.bottom - swb.top;
      rect.top = swb.top;
      update = true;
      updateY = true;
      snappedTrenches.top = 'edge';
    }
    if (rect.bottom > swb.bottom - snapRadius) {
      if (updateY || !assumeConstantSize) {
        var newHeight = swb.bottom - rect.top;
        if (keepProportional)
          rect.width = rect.width * newHeight / rect.height;
        rect.height = newHeight;
        update = true;
      } else if (!updateY || !Trenches.preferTop) {
        rect.top = swb.bottom - rect.height;
        update = true;
      }
      snappedTrenches.top = 'edge';
      delete snappedTrenches.bottom;
    }

    if (update) {
      rect.snappedTrenches = snappedTrenches;
      return rect;
    }
    return false;
  },

  // ----------
  // Function: drag
  // Called in response to an <Item> draggable "drag" event.
  drag: function Drag_drag(event) {
    this.snap(UI.rtl ? 'topright' : 'topleft', true);

    if (this.parent && this.parent.expanded) {
      var distance = this.startPosition.distance(new Point(event.clientX, event.clientY));
      if (distance > 100) {
        this.parent.remove(this.item);
        this.parent.collapse();
      }
    }
  },

  // ----------
  // Function: stop
  // Called in response to an <Item> draggable "stop" event.
  //
  // Parameters:
  //  immediately - bool for doing the pushAway immediately, without animation
  stop: function Drag_stop(immediately) {
    Trenches.hideGuides();
    this.item.isDragging = false;

    if (this.parent && this.parent != this.item.parent &&
       this.parent.isEmpty()) {
      this.parent.close();
    }

    if (this.parent && this.parent.expanded)
      this.parent.arrange();

    if (this.item.parent)
      this.item.parent.arrange();

    if (!this.item.parent) {
      this.item.setZ(drag.zIndex);
      drag.zIndex++;

      this.item.pushAway(immediately);
    }

    Trenches.disactivate();
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is trench.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: trench.js

// ##########
// Class: Trench
//
// Class for drag-snapping regions; called "trenches" as they are long and narrow.

// Constructor: Trench
//
// Parameters:
//   element - the DOM element for Item (GroupItem or TabItem) from which the trench is projected
//   xory - either "x" or "y": whether the trench's <position> is along the x- or y-axis.
//     In other words, if "x", the trench is vertical; if "y", the trench is horizontal.
//   type - either "border" or "guide". Border trenches mark the border of an Item.
//     Guide trenches extend out (unless they are intercepted) and act as "guides".
//   edge - which edge of the Item that this trench corresponds to.
//     Either "top", "left", "bottom", or "right".
function Trench(element, xory, type, edge) {
  //----------
  // Variable: id
  // (integer) The id for the Trench. Set sequentially via <Trenches.nextId>
  this.id = Trenches.nextId++;

  // ---------
  // Variables: Initial parameters
  //   element - (DOMElement)
  //   parentItem - <Item> which projects this trench; to be set with setParentItem
  //   xory - (string) "x" or "y"
  //   type - (string) "border" or "guide"
  //   edge - (string) "top", "left", "bottom", or "right"
  this.el = element;
  this.parentItem = null;
  this.xory = xory; // either "x" or "y"
  this.type = type; // "border" or "guide"
  this.edge = edge; // "top", "left", "bottom", or "right"

  this.$el = iQ(this.el);

  //----------
  // Variable: dom
  // (array) DOM elements for visible reflexes of the Trench
  this.dom = [];

  //----------
  // Variable: showGuide
  // (boolean) Whether this trench will project a visible guide (dotted line) or not.
  this.showGuide = false;

  //----------
  // Variable: active
  // (boolean) Whether this trench is currently active or not.
  // Basically every trench aside for those projected by the Item currently being dragged
  // all become active.
  this.active = false;
  this.gutter = Items.defaultGutter;

  //----------
  // Variable: position
  // (integer) position is the position that we should snap to.
  this.position = 0;

  //----------
  // Variables: some Ranges
  //   range - (<Range>) explicit range; this is along the transverse axis
  //   minRange - (<Range>) the minimum active range
  //   activeRange - (<Range>) the currently active range
  this.range = new Range(0,10000);
  this.minRange = new Range(0,0);
  this.activeRange = new Range(0,10000);
};

Trench.prototype = {
  //----------
  // Variable: radius
  // (integer) radius is how far away we should snap from
  get radius() this.customRadius || Trenches.defaultRadius,

  setParentItem: function Trench_setParentItem(item) {
    if (!item.isAnItem) {
      Utils.assert(false, "parentItem must be an Item");
      return false;
    }
    this.parentItem = item;
    return true;
  },

  //----------
  // Function: setPosition
  // set the trench's position.
  //
  // Parameters:
  //   position - (integer) px center position of the trench
  //   range - (<Range>) the explicit active range of the trench
  //   minRange - (<Range>) the minimum range of the trench
  setPosition: function Trench_setPos(position, range, minRange) {
    this.position = position;

    var page = Items.getPageBounds(true);

    // optionally, set the range.
    if (Utils.isRange(range)) {
      this.range = range;
    } else {
      this.range = new Range(0, (this.xory == 'x' ? page.height : page.width));
    }

    // if there's a minRange, set that too.
    if (Utils.isRange(minRange))
      this.minRange = minRange;

    // set the appropriate bounds as a rect.
    if (this.xory == "x") // vertical
      this.rect = new Rect(this.position - this.radius, this.range.min, 2 * this.radius, this.range.extent);
    else // horizontal
      this.rect = new Rect(this.range.min, this.position - this.radius, this.range.extent, 2 * this.radius);

    this.show(); // DEBUG
  },

  //----------
  // Function: setActiveRange
  // set the trench's currently active range.
  //
  // Parameters:
  //   activeRange - (<Range>)
  setActiveRange: function Trench_setActiveRect(activeRange) {
    if (!Utils.isRange(activeRange))
      return false;
    this.activeRange = activeRange;
    if (this.xory == "x") { // horizontal
      this.activeRect = new Rect(this.position - this.radius, this.activeRange.min, 2 * this.radius, this.activeRange.extent);
      this.guideRect = new Rect(this.position, this.activeRange.min, 0, this.activeRange.extent);
    } else { // vertical
      this.activeRect = new Rect(this.activeRange.min, this.position - this.radius, this.activeRange.extent, 2 * this.radius);
      this.guideRect = new Rect(this.activeRange.min, this.position, this.activeRange.extent, 0);
    }
    return true;
  },

  //----------
  // Function: setWithRect
  // Set the trench's position using the given rect. We know which side of the rect we should match
  // because we've already recorded this information in <edge>.
  //
  // Parameters:
  //   rect - (<Rect>)
  setWithRect: function Trench_setWithRect(rect) {

    if (!Utils.isRect(rect))
      Utils.error('argument must be Rect');

    // First, calculate the range for this trench.
    // Border trenches are always only active for the length of this range.
    // Guide trenches, however, still use this value as its minRange.
    if (this.xory == "x")
      var range = new Range(rect.top - this.gutter, rect.bottom + this.gutter);
    else
      var range = new Range(rect.left - this.gutter, rect.right + this.gutter);

    if (this.type == "border") {
      // border trenches have a range, so set that too.
      if (this.edge == "left")
        this.setPosition(rect.left - this.gutter, range);
      else if (this.edge == "right")
        this.setPosition(rect.right + this.gutter, range);
      else if (this.edge == "top")
        this.setPosition(rect.top - this.gutter, range);
      else if (this.edge == "bottom")
        this.setPosition(rect.bottom + this.gutter, range);
    } else if (this.type == "guide") {
      // guide trenches have no range, but do have a minRange.
      if (this.edge == "left")
        this.setPosition(rect.left, false, range);
      else if (this.edge == "right")
        this.setPosition(rect.right, false, range);
      else if (this.edge == "top")
        this.setPosition(rect.top, false, range);
      else if (this.edge == "bottom")
        this.setPosition(rect.bottom, false, range);
    }
  },

  //----------
  // Function: show
  //
  // Show guide (dotted line), if <showGuide> is true.
  //
  // If <Trenches.showDebug> is true, we will draw the trench. Active portions are drawn with 0.5
  // opacity. If <active> is false, the entire trench will be
  // very translucent.
  show: function Trench_show() { // DEBUG
    if (this.active && this.showGuide) {
      if (!this.dom.guideTrench)
        this.dom.guideTrench = iQ("<div/>").addClass('guideTrench').css({id: 'guideTrench'+this.id});
      var guideTrench = this.dom.guideTrench;
      guideTrench.css(this.guideRect);
      iQ("body").append(guideTrench);
    } else {
      if (this.dom.guideTrench) {
        this.dom.guideTrench.remove();
        delete this.dom.guideTrench;
      }
    }

    if (!Trenches.showDebug) {
      this.hide(true); // true for dontHideGuides
      return;
    }

    if (!this.dom.visibleTrench)
      this.dom.visibleTrench = iQ("<div/>")
        .addClass('visibleTrench')
        .addClass(this.type) // border or guide
        .css({id: 'visibleTrench'+this.id});
    var visibleTrench = this.dom.visibleTrench;

    if (!this.dom.activeVisibleTrench)
      this.dom.activeVisibleTrench = iQ("<div/>")
        .addClass('activeVisibleTrench')
        .addClass(this.type) // border or guide
        .css({id: 'activeVisibleTrench'+this.id});
    var activeVisibleTrench = this.dom.activeVisibleTrench;

    if (this.active)
      activeVisibleTrench.addClass('activeTrench');
    else
      activeVisibleTrench.removeClass('activeTrench');

    visibleTrench.css(this.rect);
    activeVisibleTrench.css(this.activeRect || this.rect);
    iQ("body").append(visibleTrench);
    iQ("body").append(activeVisibleTrench);
  },

  //----------
  // Function: hide
  // Hide the trench.
  hide: function Trench_hide(dontHideGuides) {
    if (this.dom.visibleTrench)
      this.dom.visibleTrench.remove();
    if (this.dom.activeVisibleTrench)
      this.dom.activeVisibleTrench.remove();
    if (!dontHideGuides && this.dom.guideTrench)
      this.dom.guideTrench.remove();
  },

  //----------
  // Function: rectOverlaps
  // Given a <Rect>, compute whether it overlaps with this trench. If it does, return an
  // adjusted ("snapped") <Rect>; if it does not overlap, simply return false.
  //
  // Note that simply overlapping is not all that is required to be affected by this function.
  // Trenches can only affect certain edges of rectangles... for example, a "left"-edge guide
  // trench should only affect left edges of rectangles. We don't snap right edges to left-edged
  // guide trenches. For border trenches, the logic is a bit different, so left snaps to right and
  // top snaps to bottom.
  //
  // Parameters:
  //   rect - (<Rect>) the rectangle in question
  //   stationaryCorner   - which corner is stationary? by default, the top left.
  //                        "topleft", "bottomleft", "topright", "bottomright"
  //   assumeConstantSize - (boolean) whether the rect's dimensions are sacred or not
  //   keepProportional - (boolean) if we are allowed to change the rect's size, whether the
  //                                dimensions should scaled proportionally or not.
  //
  // Returns:
  //   false - if rect does not overlap with this trench
  //   newRect - (<Rect>) an adjusted version of rect, if it is affected by this trench
  rectOverlaps: function Trench_rectOverlaps(rect,stationaryCorner,assumeConstantSize,keepProportional) {
    var edgeToCheck;
    if (this.type == "border") {
      if (this.edge == "left")
        edgeToCheck = "right";
      else if (this.edge == "right")
        edgeToCheck = "left";
      else if (this.edge == "top")
        edgeToCheck = "bottom";
      else if (this.edge == "bottom")
        edgeToCheck = "top";
    } else { // if trench type is guide or barrier...
      edgeToCheck = this.edge;
    }

    rect.adjustedEdge = edgeToCheck;

    switch (edgeToCheck) {
      case "left":
        if (this.ruleOverlaps(rect.left, rect.yRange)) {
          if (stationaryCorner.indexOf('right') > -1)
            rect.width = rect.right - this.position;
          rect.left = this.position;
          return rect;
        }
        break;
      case "right":
        if (this.ruleOverlaps(rect.right, rect.yRange)) {
          if (assumeConstantSize) {
            rect.left = this.position - rect.width;
          } else {
            var newWidth = this.position - rect.left;
            if (keepProportional)
              rect.height = rect.height * newWidth / rect.width;
            rect.width = newWidth;
          }
          return rect;
        }
        break;
      case "top":
        if (this.ruleOverlaps(rect.top, rect.xRange)) {
          if (stationaryCorner.indexOf('bottom') > -1)
            rect.height = rect.bottom - this.position;
          rect.top = this.position;
          return rect;
        }
        break;
      case "bottom":
        if (this.ruleOverlaps(rect.bottom, rect.xRange)) {
          if (assumeConstantSize) {
            rect.top = this.position - rect.height;
          } else {
            var newHeight = this.position - rect.top;
            if (keepProportional)
              rect.width = rect.width * newHeight / rect.height;
            rect.height = newHeight;
          }
          return rect;
        }
    }

    return false;
  },

  //----------
  // Function: ruleOverlaps
  // Computes whether the given "rule" (a line segment, essentially), given by the position and
  // range arguments, overlaps with the current trench. Note that this function assumes that
  // the rule and the trench are in the same direction: both horizontal, or both vertical.
  //
  // Parameters:
  //   position - (integer) a position in px
  //   range - (<Range>) the rule's range
  ruleOverlaps: function Trench_ruleOverlaps(position, range) {
    return (this.position - this.radius < position &&
           position < this.position + this.radius &&
           this.activeRange.overlaps(range));
  },

  //----------
  // Function: adjustRangeIfIntercept
  // Computes whether the given boundary (given as a position and its active range), perpendicular
  // to the trench, intercepts the trench or not. If it does, it returns an adjusted <Range> for
  // the trench. If not, it returns false.
  //
  // Parameters:
  //   position - (integer) the position of the boundary
  //   range - (<Range>) the target's range, on the trench's transverse axis
  adjustRangeIfIntercept: function Trench_adjustRangeIfIntercept(position, range) {
    if (this.position - this.radius > range.min && this.position + this.radius < range.max) {
      var activeRange = new Range(this.activeRange);

      // there are three ways this can go:
      // 1. position < minRange.min
      // 2. position > minRange.max
      // 3. position >= minRange.min && position <= minRange.max

      if (position < this.minRange.min) {
        activeRange.min = Math.min(this.minRange.min,position);
      } else if (position > this.minRange.max) {
        activeRange.max = Math.max(this.minRange.max,position);
      } else {
        // this should be impossible because items can't overlap and we've already checked
        // that the range intercepts.
      }
      return activeRange;
    }
    return false;
  },

  //----------
  // Function: calculateActiveRange
  // Computes and sets the <activeRange> for the trench, based on the <GroupItems> around.
  // This makes it so trenches' active ranges don't extend through other groupItems.
  calculateActiveRange: function Trench_calculateActiveRange() {

    // set it to the default: just the range itself.
    this.setActiveRange(this.range);

    // only guide-type trenches need to set a separate active range
    if (this.type != 'guide')
      return;

    var groupItems = GroupItems.groupItems;
    var trench = this;
    groupItems.forEach(function(groupItem) {
      if (groupItem.isDragging) // floating groupItems don't block trenches
        return;
      if (trench.el == groupItem.container) // groupItems don't block their own trenches
        return;
      var bounds = groupItem.getBounds();
      var activeRange = new Range();
      if (trench.xory == 'y') { // if this trench is horizontal...
        activeRange = trench.adjustRangeIfIntercept(bounds.left, bounds.yRange);
        if (activeRange)
          trench.setActiveRange(activeRange);
        activeRange = trench.adjustRangeIfIntercept(bounds.right, bounds.yRange);
        if (activeRange)
          trench.setActiveRange(activeRange);
      } else { // if this trench is vertical...
        activeRange = trench.adjustRangeIfIntercept(bounds.top, bounds.xRange);
        if (activeRange)
          trench.setActiveRange(activeRange);
        activeRange = trench.adjustRangeIfIntercept(bounds.bottom, bounds.xRange);
        if (activeRange)
          trench.setActiveRange(activeRange);
      }
    });
  }
};

// ##########
// Class: Trenches
// Singelton for managing all <Trench>es.
var Trenches = {
  // ---------
  // Variables:
  //   nextId - (integer) a counter for the next <Trench>'s <Trench.id> value.
  //   showDebug - (boolean) whether to draw the <Trench>es or not.
  //   defaultRadius - (integer) the default radius for new <Trench>es.
  //   disabled - (boolean) whether trench-snapping is disabled or not.
  nextId: 0,
  showDebug: false,
  defaultRadius: 10,
  disabled: false,

  // ---------
  // Variables: snapping preferences; used to break ties in snapping.
  //   preferTop - (boolean) prefer snapping to the top to the bottom
  //   preferLeft - (boolean) prefer snapping to the left to the right
  preferTop: true,
  get preferLeft() { return !UI.rtl; },

  trenches: [],

  // ---------
  // Function: getById
  // Return the specified <Trench>.
  //
  // Parameters:
  //   id - (integer)
  getById: function Trenches_getById(id) {
    return this.trenches[id];
  },

  // ---------
  // Function: register
  // Register a new <Trench> and returns the resulting <Trench> ID.
  //
  // Parameters:
  // See the constructor <Trench.Trench>'s parameters.
  //
  // Returns:
  //   id - (int) the new <Trench>'s ID.
  register: function Trenches_register(element, xory, type, edge) {
    var trench = new Trench(element, xory, type, edge);
    this.trenches[trench.id] = trench;
    return trench.id;
  },

  // ---------
  // Function: registerWithItem
  // Register a whole set of <Trench>es using an <Item> and returns the resulting <Trench> IDs.
  //
  // Parameters:
  //   item - the <Item> to project trenches
  //   type - either "border" or "guide"
  //
  // Returns:
  //   ids - array of the new <Trench>es' IDs.
  registerWithItem: function Trenches_registerWithItem(item, type) {
    var container = item.container;
    var ids = {};
    ids.left = Trenches.register(container,"x",type,"left");
    ids.right = Trenches.register(container,"x",type,"right");
    ids.top = Trenches.register(container,"y",type,"top");
    ids.bottom = Trenches.register(container,"y",type,"bottom");

    this.getById(ids.left).setParentItem(item);
    this.getById(ids.right).setParentItem(item);
    this.getById(ids.top).setParentItem(item);
    this.getById(ids.bottom).setParentItem(item);

    return ids;
  },

  // ---------
  // Function: unregister
  // Unregister one or more <Trench>es.
  //
  // Parameters:
  //   ids - (integer) a single <Trench> ID or (array) a list of <Trench> IDs.
  unregister: function Trenches_unregister(ids) {
    if (!Array.isArray(ids))
      ids = [ids];
    var self = this;
    ids.forEach(function(id) {
      self.trenches[id].hide();
      delete self.trenches[id];
    });
  },

  // ---------
  // Function: activateOthersTrenches
  // Activate all <Trench>es other than those projected by the current element.
  //
  // Parameters:
  //   element - (DOMElement) the DOM element of the Item being dragged or resized.
  activateOthersTrenches: function Trenches_activateOthersTrenches(element) {
    this.trenches.forEach(function(t) {
      if (t.el === element)
        return;
      if (t.parentItem && (t.parentItem.isAFauxItem ||
         t.parentItem.isDragging ||
         t.parentItem.isDropTarget))
        return;
      t.active = true;
      t.calculateActiveRange();
      t.show(); // debug
    });
  },

  // ---------
  // Function: disactivate
  // After <activateOthersTrenches>, disactivates all the <Trench>es again.
  disactivate: function Trenches_disactivate() {
    this.trenches.forEach(function(t) {
      t.active = false;
      t.showGuide = false;
      t.show();
    });
  },

  // ---------
  // Function: hideGuides
  // Hide all guides (dotted lines) en masse.
  hideGuides: function Trenches_hideGuides() {
    this.trenches.forEach(function(t) {
      t.showGuide = false;
      t.show();
    });
  },

  // ---------
  // Function: snap
  // Used to "snap" an object's bounds to active trenches and to the edge of the window.
  // If the meta key is down (<Key.meta>), it will not snap but will still enforce the rect
  // not leaving the safe bounds of the window.
  //
  // Parameters:
  //   rect               - (<Rect>) the object's current bounds
  //   stationaryCorner   - which corner is stationary? by default, the top left.
  //                        "topleft", "bottomleft", "topright", "bottomright"
  //   assumeConstantSize - (boolean) whether the rect's dimensions are sacred or not
  //   keepProportional   - (boolean) if we are allowed to change the rect's size, whether the
  //                                  dimensions should scaled proportionally or not.
  //
  // Returns:
  //   (<Rect>) - the updated bounds, if they were updated
  //   false - if the bounds were not updated
  snap: function Trenches_snap(rect,stationaryCorner,assumeConstantSize,keepProportional) {
    // hide all the guide trenches, because the correct ones will be turned on later.
    Trenches.hideGuides();

    var updated = false;
    var updatedX = false;
    var updatedY = false;

    var snappedTrenches = {};

    for (var i in this.trenches) {
      var t = this.trenches[i];
      if (!t.active || t.parentItem.isDropTarget)
        continue;
      // newRect will be a new rect, or false
      var newRect = t.rectOverlaps(rect,stationaryCorner,assumeConstantSize,keepProportional);

      if (newRect) { // if rectOverlaps returned an updated rect...

        if (assumeConstantSize && updatedX && updatedY)
          break;
        if (assumeConstantSize && updatedX && (newRect.adjustedEdge == "left"||newRect.adjustedEdge == "right"))
          continue;
        if (assumeConstantSize && updatedY && (newRect.adjustedEdge == "top"||newRect.adjustedEdge == "bottom"))
          continue;

        rect = newRect;
        updated = true;

        // register this trench as the "snapped trench" for the appropriate edge.
        snappedTrenches[newRect.adjustedEdge] = t;

        // if updatedX, we don't need to update x any more.
        if (newRect.adjustedEdge == "left" && this.preferLeft)
          updatedX = true;
        if (newRect.adjustedEdge == "right" && !this.preferLeft)
          updatedX = true;

        // if updatedY, we don't need to update x any more.
        if (newRect.adjustedEdge == "top" && this.preferTop)
          updatedY = true;
        if (newRect.adjustedEdge == "bottom" && !this.preferTop)
          updatedY = true;

      }
    }

    if (updated) {
      rect.snappedTrenches = snappedTrenches;
      return rect;
    }
    return false;
  },

  // ---------
  // Function: show
  // <Trench.show> all <Trench>es.
  show: function Trenches_show() {
    this.trenches.forEach(function(t) {
      t.show();
    });
  },

  // ---------
  // Function: toggleShown
  // Toggle <Trenches.showDebug> and trigger <Trenches.show>
  toggleShown: function Trenches_toggleShown() {
    this.showDebug = !this.showDebug;
    this.show();
  }
};
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ui.js.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Ian Gilman <ian@iangilman.com>
 * Aza Raskin <aza@mozilla.com>
 * Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 * Ehsan Akhgari <ehsan@mozilla.com>
 * Raymond Lee <raymond@appcoast.com>
 * Sean Dunn <seanedunn@yahoo.com>
 * Tim Taubert <tim.taubert@gmx.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// **********
// Title: ui.js

let Keys = { meta: false };

// ##########
// Class: UI
// Singleton top-level UI manager.
let UI = {
  // Constant: DBLCLICK_INTERVAL
  // Defines the maximum time (in ms) between two clicks for it to count as
  // a double click.
  DBLCLICK_INTERVAL: 500,

  // Constant: DBLCLICK_OFFSET
  // Defines the maximum offset (in pixels) between two clicks for it to count as
  // a double click.
  DBLCLICK_OFFSET: 5,

  // Variable: _frameInitialized
  // True if the Tab View UI frame has been initialized.
  _frameInitialized: false,

  // Variable: _pageBounds
  // Stores the page bounds.
  _pageBounds: null,

  // Variable: _closedLastVisibleTab
  // If true, the last visible tab has just been closed in the tab strip.
  _closedLastVisibleTab: false,

  // Variable: _closedSelectedTabInTabView
  // If true, a select tab has just been closed in TabView.
  _closedSelectedTabInTabView: false,

  // Variable: restoredClosedTab
  // If true, a closed tab has just been restored.
  restoredClosedTab: false,

  // Variable: _reorderTabItemsOnShow
  // Keeps track of the <GroupItem>s which their tab items' tabs have been moved
  // and re-orders the tab items when switching to TabView.
  _reorderTabItemsOnShow: [],

  // Variable: _reorderTabsOnHide
  // Keeps track of the <GroupItem>s which their tab items have been moved in
  // TabView UI and re-orders the tabs when switcing back to main browser.
  _reorderTabsOnHide: [],

  // Variable: _currentTab
  // Keeps track of which xul:tab we are currently on.
  // Used to facilitate zooming down from a previous tab.
  _currentTab: null,

  // Variable: _lastClick
  // Keeps track of the time of last click event to detect double click.
  // Used to create tabs on double-click since we cannot attach 'dblclick'
  _lastClick: 0,

  // Variable: _eventListeners
  // Keeps track of event listeners added to the AllTabs object.
  _eventListeners: {},

  // Variable: _cleanupFunctions
  // An array of functions to be called at uninit time
  _cleanupFunctions: [],
  
  // Constant: _maxInteractiveWait
  // If the UI is in the middle of an operation, this is the max amount of
  // milliseconds to wait between input events before we no longer consider
  // the operation interactive.
  _maxInteractiveWait: 250,

  // Variable: _privateBrowsing
  // Keeps track of info related to private browsing, including: 
  //   transitionMode - whether we're entering or exiting PB
  //   wasInTabView - whether TabView was visible before we went into PB
  _privateBrowsing: {
    transitionMode: "",
    wasInTabView: false 
  },
  
  // Variable: _storageBusyCount
  // Used to keep track of how many calls to storageBusy vs storageReady.
  _storageBusyCount: 0,

  // Variable: isDOMWindowClosing
  // Tells wether we already received the "domwindowclosed" event and the parent
  // windows is about to close.
  isDOMWindowClosing: false,

  // ----------
  // Function: init
  // Must be called after the object is created.
  init: function UI_init() {
    try {
      let self = this;

      // initialize the direction of the page
      this._initPageDirection();

      // ___ storage
      Storage.init();
      let data = Storage.readUIData(gWindow);
      this._storageSanity(data);
      this._pageBounds = data.pageBounds;

      // ___ hook into the browser
      gWindow.addEventListener("tabviewshow", function() {
        self.showTabView(true);
      }, false);

      // ___ currentTab
      this._currentTab = gBrowser.selectedTab;

      // ___ exit button
      iQ("#exit-button").click(function() {
        self.exit();
        self.blurAll();
      });

      // When you click on the background/empty part of TabView,
      // we create a new groupItem.
      iQ(gTabViewFrame.contentDocument).mousedown(function(e) {
        if (iQ(":focus").length > 0) {
          iQ(":focus").each(function(element) {
            // don't fire blur event if the same input element is clicked.
            if (e.target != element && element.nodeName == "INPUT")
              element.blur();
          });
        }
        if (e.originalTarget.id == "content") {
          // Create an orphan tab on double click
          if (Date.now() - self._lastClick <= self.DBLCLICK_INTERVAL && 
              (self._lastClickPositions.x - self.DBLCLICK_OFFSET) <= e.clientX &&
              (self._lastClickPositions.x + self.DBLCLICK_OFFSET) >= e.clientX &&
              (self._lastClickPositions.y - self.DBLCLICK_OFFSET) <= e.clientY &&
              (self._lastClickPositions.y + self.DBLCLICK_OFFSET) >= e.clientY) {
            GroupItems.setActiveGroupItem(null);
            TabItems.creatingNewOrphanTab = true;

            let newTab = 
              gBrowser.loadOneTab("about:blank", { inBackground: true });

            let box = 
              new Rect(e.clientX - Math.floor(TabItems.tabWidth/2),
                       e.clientY - Math.floor(TabItems.tabHeight/2),
                       TabItems.tabWidth, TabItems.tabHeight);
            newTab._tabViewTabItem.setBounds(box, true);
            newTab._tabViewTabItem.pushAway(true);
            GroupItems.setActiveOrphanTab(newTab._tabViewTabItem);

            TabItems.creatingNewOrphanTab = false;
            newTab._tabViewTabItem.zoomIn(true);

            self._lastClick = 0;
            self._lastClickPositions = null;
            gTabView.firstUseExperienced = true;
          } else {
            self._lastClick = Date.now();
            self._lastClickPositions = new Point(e.clientX, e.clientY);
            self._createGroupItemOnDrag(e);
          }
        }
      });

      iQ(window).bind("unload", function() {
        self.uninit();
      });

      gWindow.addEventListener("tabviewhide", function() {
        self.exit();
      }, false);

      // ___ setup key handlers
      this._setTabViewFrameKeyHandlers();

      // ___ add tab action handlers
      this._addTabActionHandlers();

      // ___ groups
      GroupItems.init();
      GroupItems.pauseArrange();
      let hasGroupItemsData = GroupItems.load();

      // ___ tabs
      TabItems.init();
      TabItems.pausePainting();

      if (!hasGroupItemsData)
        this.reset();

      // ___ resizing
      if (this._pageBounds)
        this._resize(true);
      else
        this._pageBounds = Items.getPageBounds();

      iQ(window).resize(function() {
        self._resize();
      });

      // ___ setup observer to save canvas images
      function domWinClosedObserver(subject, topic, data) {
        if (topic == "domwindowclosed" && subject == gWindow) {
          self.isDOMWindowClosing = true;
          if (self.isTabViewVisible())
            GroupItems.removeHiddenGroups();
          TabItems.saveAll(true);
          self._save();
        }
      }
      Services.obs.addObserver(
        domWinClosedObserver, "domwindowclosed", false);
      this._cleanupFunctions.push(function() {
        Services.obs.removeObserver(domWinClosedObserver, "domwindowclosed");
      });

      // ___ Done
      this._frameInitialized = true;
      this._save();

      // fire an iframe initialized event so everyone knows tab view is 
      // initialized.
      let event = document.createEvent("Events");
      event.initEvent("tabviewframeinitialized", true, false);
      dispatchEvent(event);      
    } catch(e) {
      Utils.log(e);
    } finally {
      GroupItems.resumeArrange();
    }
  },

  uninit: function UI_uninit() {
    // call our cleanup functions
    this._cleanupFunctions.forEach(function(func) {
      func();
    });
    this._cleanupFunctions = [];

    // additional clean up
    TabItems.uninit();
    GroupItems.uninit();
    Storage.uninit();

    this._removeTabActionHandlers();
    this._currentTab = null;
    this._pageBounds = null;
    this._reorderTabItemsOnShow = null;
    this._reorderTabsOnHide = null;
    this._frameInitialized = false;
  },

  // Property: rtl
  // Returns true if we are in RTL mode, false otherwise
  rtl: false,

  // Function: reset
  // Resets the Panorama view to have just one group with all tabs
  reset: function UI_reset() {
    let padding = Trenches.defaultRadius;
    let welcomeWidth = 300;
    let pageBounds = Items.getPageBounds();
    pageBounds.inset(padding, padding);

    let $actions = iQ("#actions");
    if ($actions) {
      pageBounds.width -= $actions.width();
      if (UI.rtl)
        pageBounds.left += $actions.width() - padding;
    }

    // ___ make a fresh groupItem
    let box = new Rect(pageBounds);
    box.width = Math.min(box.width * 0.667,
                         pageBounds.width - (welcomeWidth + padding));
    box.height = box.height * 0.667;
    if (UI.rtl) {
      box.left = pageBounds.left + welcomeWidth + 2 * padding;
    }

    GroupItems.groupItems.forEach(function(group) {
      group.close();
    });
    
    let options = {
      bounds: box,
      immediately: true
    };
    let groupItem = new GroupItem([], options);
    let items = TabItems.getItems();
    items.forEach(function(item) {
      if (item.parent)
        item.parent.remove(item);
      groupItem.add(item, {immediately: true});
    });
    GroupItems.setActiveGroupItem(groupItem);
  },

  // Function: blurAll
  // Blurs any currently focused element
  //
  blurAll: function UI_blurAll() {
    iQ(":focus").each(function(element) {
      element.blur();
    });
  },

  // ----------
  // Function: isIdle
  // Returns true if the last interaction was long enough ago to consider the
  // UI idle. Used to determine whether interactivity would be sacrificed if 
  // the CPU was to become busy.
  //
  isIdle: function UI_isIdle() {
    let time = Date.now();
    let maxEvent = Math.max(drag.lastMoveTime, resize.lastMoveTime);
    return (time - maxEvent) > this._maxInteractiveWait;
  },

  // ----------
  // Function: getActiveTab
  // Returns the currently active tab as a <TabItem>
  //
  getActiveTab: function UI_getActiveTab() {
    return this._activeTab;
  },

  // ----------
  // Function: setActiveTab
  // Sets the currently active tab. The idea of a focused tab is useful
  // for keyboard navigation and returning to the last zoomed-in tab.
  // Hitting return/esc brings you to the focused tab, and using the
  // arrow keys lets you navigate between open tabs.
  //
  // Parameters:
  //  - Takes a <TabItem>
  setActiveTab: function UI_setActiveTab(tabItem) {
    if (tabItem == this._activeTab)
      return;

    if (this._activeTab) {
      this._activeTab.makeDeactive();
      this._activeTab.removeSubscriber(this, "close");
    }
    this._activeTab = tabItem;

    if (this._activeTab) {
      let self = this;
      this._activeTab.addSubscriber(this, "close", function(closedTabItem) {
        if (self._activeTab == closedTabItem)
          self.setActiveTab(null);
      });

      this._activeTab.makeActive();
    }
  },

  // ----------
  // Function: isTabViewVisible
  // Returns true if the TabView UI is currently shown.
  isTabViewVisible: function UI_isTabViewVisible() {
    return gTabViewDeck.selectedIndex == 1;
  },

  // ---------
  // Function: _initPageDirection
  // Initializes the page base direction
  _initPageDirection: function UI__initPageDirection() {
    let chromeReg = Cc["@mozilla.org/chrome/chrome-registry;1"].
                    getService(Ci.nsIXULChromeRegistry);
    let dir = chromeReg.isLocaleRTL("global");
    document.documentElement.setAttribute("dir", dir ? "rtl" : "ltr");
    this.rtl = dir;
  },

  // ----------
  // Function: showTabView
  // Shows TabView and hides the main browser UI.
  // Parameters:
  //   zoomOut - true for zoom out animation, false for nothing.
  showTabView: function UI_showTabView(zoomOut) {
    if (this.isTabViewVisible())
      return;

    // initialize the direction of the page
    this._initPageDirection();

    var self = this;
    var currentTab = this._currentTab;
    var item = null;

    this._reorderTabItemsOnShow.forEach(function(groupItem) {
      groupItem.reorderTabItemsBasedOnTabOrder();
    });
    this._reorderTabItemsOnShow = [];

//@line 446 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/ui.js"
    gTabViewDeck.selectedIndex = 1;
    gWindow.TabsInTitlebar.allowedBy("tabview-open", false);
    gTabViewFrame.contentWindow.focus();

    gBrowser.updateTitlebar();
//@line 454 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/ui.js"
    let event = document.createEvent("Events");
    event.initEvent("tabviewshown", true, false);

    Storage.saveVisibilityData(gWindow, "true");

    // Close the active group if it was empty. This will happen when the
    // user returns to Panorama after looking at an app tab, having
    // closed all other tabs. (If the user is looking at an orphan tab, then
    // there is no active group for the purposes of this check.)
    let activeGroupItem = null;
    if (!GroupItems.getActiveOrphanTab()) {
      activeGroupItem = GroupItems.getActiveGroupItem();
      if (activeGroupItem && activeGroupItem.closeIfEmpty())
        activeGroupItem = null;
    }

    if (zoomOut && currentTab && currentTab._tabViewTabItem) {
      item = currentTab._tabViewTabItem;
      // If there was a previous currentTab we want to animate
      // its thumbnail (canvas) for the zoom out.
      // Note that we start the animation on the chrome thread.

      // Zoom out!
      item.zoomOut(function() {
        if (!currentTab._tabViewTabItem) // if the tab's been destroyed
          item = null;

        self.setActiveTab(item);

        if (activeGroupItem && item.parent)
          activeGroupItem.setTopChild(item);

        self._resize(true);
        dispatchEvent(event);

        // Flush pending updates
        GroupItems.flushAppTabUpdates();

        TabItems.resumePainting();
      });
    } else {
      self.setActiveTab(null);
      dispatchEvent(event);

      // Flush pending updates
      GroupItems.flushAppTabUpdates();

      TabItems.resumePainting();
    }
  },

  // ----------
  // Function: hideTabView
  // Hides TabView and shows the main browser UI.
  hideTabView: function UI_hideTabView() {
    if (!this.isTabViewVisible())
      return;

    // another tab might be select if user decides to stay on a page when
    // a onclose confirmation prompts.
    GroupItems.removeHiddenGroups();
    TabItems.pausePainting();

    this._reorderTabsOnHide.forEach(function(groupItem) {
      groupItem.reorderTabsBasedOnTabItemOrder();
    });
    this._reorderTabsOnHide = [];

//@line 528 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/ui.js"
    gTabViewDeck.selectedIndex = 0;
    gWindow.TabsInTitlebar.allowedBy("tabview-open", true);
    gBrowser.contentWindow.focus();

    gBrowser.updateTitlebar();
//@line 536 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/ui.js"
    Storage.saveVisibilityData(gWindow, "false");

    let event = document.createEvent("Events");
    event.initEvent("tabviewhidden", true, false);
    dispatchEvent(event);
  },

//@line 568 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/ui.js"

  // ----------
  // Function: storageBusy
  // Pauses the storage activity that conflicts with sessionstore updates and 
  // private browsing mode switches. Calls can be nested. 
  storageBusy: function UI_storageBusy() {
    if (!this._storageBusyCount) {
      TabItems.pauseReconnecting();
      GroupItems.pauseAutoclose();
    }
    
    this._storageBusyCount++;
  },
  
  // ----------
  // Function: storageReady
  // Resumes the activity paused by storageBusy, and updates for any new group
  // information in sessionstore. Calls can be nested. 
  storageReady: function UI_storageReady() {
    this._storageBusyCount--;
    if (!this._storageBusyCount) {
      let hasGroupItemsData = GroupItems.load();
      if (!hasGroupItemsData)
        this.reset();
  
      TabItems.resumeReconnecting();
      GroupItems._updateTabBar();
      GroupItems.resumeAutoclose();
    }
  },

  // ----------
  // Function: _addTabActionHandlers
  // Adds handlers to handle tab actions.
  _addTabActionHandlers: function UI__addTabActionHandlers() {
    var self = this;

    // session restore events
    function handleSSWindowStateBusy() {
      self.storageBusy();
    }
    
    function handleSSWindowStateReady() {
      self.storageReady();
    }
    
    gWindow.addEventListener("SSWindowStateBusy", handleSSWindowStateBusy, false);
    gWindow.addEventListener("SSWindowStateReady", handleSSWindowStateReady, false);

    this._cleanupFunctions.push(function() {
      gWindow.removeEventListener("SSWindowStateBusy", handleSSWindowStateBusy, false);
      gWindow.removeEventListener("SSWindowStateReady", handleSSWindowStateReady, false);
    });

    // Private Browsing:
    // When transitioning to PB, we exit Panorama if necessary (making note of the
    // fact that we were there so we can return after PB) and make sure we
    // don't reenter Panorama due to all of the session restore tab
    // manipulation (which otherwise we might). When transitioning away from
    // PB, we reenter Panorama if we had been there directly before PB.
    function pbObserver(aSubject, aTopic, aData) {
      if (aTopic == "private-browsing") {
        // We could probably do this in private-browsing-change-granted, but
        // this seems like a nicer spot, right in the middle of the process.
        if (aData == "enter") {
          // If we are in Tab View, exit. 
          self._privateBrowsing.wasInTabView = self.isTabViewVisible();
          if (self.isTabViewVisible())
            self.goToTab(gBrowser.selectedTab);
        }
      } else if (aTopic == "private-browsing-change-granted") {
        if (aData == "enter" || aData == "exit") {
          self._privateBrowsing.transitionMode = aData;
          self.storageBusy();
        }
      } else if (aTopic == "private-browsing-transition-complete") {
        // We use .transitionMode here, as aData is empty.
        if (self._privateBrowsing.transitionMode == "exit" &&
            self._privateBrowsing.wasInTabView)
          self.showTabView(false);

        self._privateBrowsing.transitionMode = "";
        self.storageReady();
      }
    }

    Services.obs.addObserver(pbObserver, "private-browsing", false);
    Services.obs.addObserver(pbObserver, "private-browsing-change-granted", false);
    Services.obs.addObserver(pbObserver, "private-browsing-transition-complete", false);

    this._cleanupFunctions.push(function() {
      Services.obs.removeObserver(pbObserver, "private-browsing");
      Services.obs.removeObserver(pbObserver, "private-browsing-change-granted");
      Services.obs.removeObserver(pbObserver, "private-browsing-transition-complete");
    });

    // TabOpen
    this._eventListeners.open = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      // if it's an app tab, add it to all the group items
      if (tab.pinned)
        GroupItems.addAppTab(tab);
    };
    
    // TabClose
    this._eventListeners.close = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      // if it's an app tab, remove it from all the group items
      if (tab.pinned)
        GroupItems.removeAppTab(tab);
        
      if (self.isTabViewVisible()) {
        // just closed the selected tab in the TabView interface.
        if (self._currentTab == tab)
          self._closedSelectedTabInTabView = true;
      } else {
        // If we're currently in the process of entering private browsing,
        // we don't want to go to the Tab View UI. 
        if (self._privateBrowsing.transitionMode)
          return; 
          
        // if not closing the last tab
        if (gBrowser.tabs.length > 1) {
          // Don't return to TabView if there are any app tabs
          for (let a = 0; a < gBrowser.tabs.length; a++) {
            let theTab = gBrowser.tabs[a]; 
            if (theTab.pinned && gBrowser._removingTabs.indexOf(theTab) == -1) 
              return;
          }

          var groupItem = GroupItems.getActiveGroupItem();

          // 1) Only go back to the TabView tab when there you close the last
          // tab of a groupItem.
          let closingLastOfGroup = (groupItem && 
              groupItem._children.length == 1 && 
              groupItem._children[0].tab == tab);

          // 2) Take care of the case where you've closed the last tab in
          // an un-named groupItem, which means that the groupItem is gone (null) and
          // there are no visible tabs. 
          let closingUnnamedGroup = (groupItem == null &&
              gBrowser.visibleTabs.length <= 1); 

          // 3) When a blank tab is active while restoring a closed tab the
          // blank tab gets removed. The active group is not closed as this is
          // where the restored tab goes. So do not show the TabView.
          let closingBlankTabAfterRestore =
            (tab && tab._tabViewTabIsRemovedAfterRestore);

          if ((closingLastOfGroup || closingUnnamedGroup) &&
              !closingBlankTabAfterRestore) {
            // for the tab focus event to pick up.
            self._closedLastVisibleTab = true;
            self.showTabView();
          }
        }
      }
    };

    // TabMove
    this._eventListeners.move = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      let activeGroupItem = GroupItems.getActiveGroupItem();
      if (activeGroupItem)
        self.setReorderTabItemsOnShow(activeGroupItem);
    };

    // TabSelect
    this._eventListeners.select = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      self.onTabSelect(tab);
    };

    // TabPinned
    this._eventListeners.pinned = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      TabItems.handleTabPin(tab);
      GroupItems.addAppTab(tab);
    };

    // TabUnpinned
    this._eventListeners.unpinned = function(tab) {
      if (tab.ownerDocument.defaultView != gWindow)
        return;

      TabItems.handleTabUnpin(tab);
      GroupItems.removeAppTab(tab);

      let groupItem = tab._tabViewTabItem.parent;
      if (groupItem)
        self.setReorderTabItemsOnShow(groupItem);
    };

    // Actually register the above handlers
    for (let name in this._eventListeners)
      AllTabs.register(name, this._eventListeners[name]);
  },

  // ----------
  // Function: _removeTabActionHandlers
  // Removes handlers to handle tab actions.
  _removeTabActionHandlers: function UI__removeTabActionHandlers() {
    for (let name in this._eventListeners)
      AllTabs.unregister(name, this._eventListeners[name]);
  },

  // ----------
  // Function: goToTab
  // Selects the given xul:tab in the browser.
  goToTab: function UI_goToTab(xulTab) {
    // If it's not focused, the onFocus listener would handle it.
    if (gBrowser.selectedTab == xulTab)
      this.onTabSelect(xulTab);
    else
      gBrowser.selectedTab = xulTab;
  },

  // ----------
  // Function: onTabSelect
  // Called when the user switches from one tab to another outside of the TabView UI.
  onTabSelect: function UI_onTabSelect(tab) {
    let currentTab = this._currentTab;
    this._currentTab = tab;

    // if the last visible tab has just been closed, don't show the chrome UI.
    if (this.isTabViewVisible() &&
        (this._closedLastVisibleTab || this._closedSelectedTabInTabView ||
         this.restoredClosedTab)) {
      if (this.restoredClosedTab) {
        // when the tab view UI is being displayed, update the thumb for the 
        // restored closed tab after the page load
        tab.linkedBrowser.addEventListener("load", function (event) {
          tab.linkedBrowser.removeEventListener("load", arguments.callee, true);
          TabItems._update(tab);
        }, true);
      }
      this._closedLastVisibleTab = false;
      this._closedSelectedTabInTabView = false;
      this.restoredClosedTab = false;
      return;
    }
    // reset these vars, just in case.
    this._closedLastVisibleTab = false;
    this._closedSelectedTabInTabView = false;
    this.restoredClosedTab = false;

    // if TabView is visible but we didn't just close the last tab or
    // selected tab, show chrome.
    if (this.isTabViewVisible())
      this.hideTabView();

    // another tab might be selected when hideTabView() is invoked so a
    // validation is needed.
    if (this._currentTab != tab)
      return;

    let oldItem = null;
    let newItem = null;

    if (currentTab && currentTab._tabViewTabItem)
      oldItem = currentTab._tabViewTabItem;

    // update the tab bar for the new tab's group
    if (tab && tab._tabViewTabItem) {
      if (!TabItems.reconnectingPaused()) {
        newItem = tab._tabViewTabItem;
        GroupItems.updateActiveGroupItemAndTabBar(newItem);
      }
    } else {
      // No tabItem; must be an app tab. Base the tab bar on the current group.
      // If no current group or orphan tab, figure it out based on what's
      // already in the tab bar.
      if (!GroupItems.getActiveGroupItem() && !GroupItems.getActiveOrphanTab()) {
        for (let a = 0; a < gBrowser.tabs.length; a++) {
          let theTab = gBrowser.tabs[a]; 
          if (!theTab.pinned) {
            let tabItem = theTab._tabViewTabItem; 
            if (tabItem.parent) 
              GroupItems.setActiveGroupItem(tabItem.parent);
            else 
              GroupItems.setActiveOrphanTab(tabItem); 
              
            break;
          }
        }
      }

      if (GroupItems.getActiveGroupItem() || GroupItems.getActiveOrphanTab())
        GroupItems._updateTabBar();
    }
  },

  // ----------
  // Function: setReorderTabsOnHide
  // Sets the groupItem which the tab items' tabs should be re-ordered when
  // switching to the main browser UI.
  // Parameters:
  //   groupItem - the groupItem which would be used for re-ordering tabs.
  setReorderTabsOnHide: function UI_setReorderTabsOnHide(groupItem) {
    if (this.isTabViewVisible()) {
      var index = this._reorderTabsOnHide.indexOf(groupItem);
      if (index == -1)
        this._reorderTabsOnHide.push(groupItem);
    }
  },

  // ----------
  // Function: setReorderTabItemsOnShow
  // Sets the groupItem which the tab items should be re-ordered when
  // switching to the tab view UI.
  // Parameters:
  //   groupItem - the groupItem which would be used for re-ordering tab items.
  setReorderTabItemsOnShow: function UI_setReorderTabItemsOnShow(groupItem) {
    if (!this.isTabViewVisible()) {
      var index = this._reorderTabItemsOnShow.indexOf(groupItem);
      if (index == -1)
        this._reorderTabItemsOnShow.push(groupItem);
    }
  },
  
  // ----------
  updateTabButton: function UI__updateTabButton() {
    let groupsNumber = gWindow.document.getElementById("tabviewGroupsNumber");
    let exitButton = document.getElementById("exit-button");
    let numberOfGroups = GroupItems.groupItems.length;

    groupsNumber.setAttribute("groups", numberOfGroups);
    exitButton.setAttribute("groups", numberOfGroups);
  },

  // ----------
  // Function: getClosestTab
  // Convenience function to get the next tab closest to the entered position
  getClosestTab: function UI_getClosestTab(tabCenter) {
    let cl = null;
    let clDist;
    TabItems.getItems().forEach(function (item) {
      if (item.parent && item.parent.hidden)
        return;
      let testDist = tabCenter.distance(item.bounds.center());
      if (cl==null || testDist < clDist) {
        cl = item;
        clDist = testDist;
      }
    });
    return cl;
  },

  // ----------
  // Function: _setTabViewFrameKeyHandlers
  // Sets up the key handlers for navigating between tabs within the TabView UI.
  _setTabViewFrameKeyHandlers: function UI__setTabViewFrameKeyHandlers() {
    var self = this;

    iQ(window).keyup(function(event) {
      if (!event.metaKey) 
        Keys.meta = false;
    });

    iQ(window).keydown(function(event) {
      if (event.metaKey) 
        Keys.meta = true;

      if ((iQ(":focus").length > 0 && iQ(":focus")[0].nodeName == "INPUT") || 
          isSearchEnabled())
        return;

      function getClosestTabBy(norm) {
        if (!self.getActiveTab())
          return null;
        var centers =
          [[item.bounds.center(), item]
             for each(item in TabItems.getItems()) if (!item.parent || !item.parent.hidden)];
        var myCenter = self.getActiveTab().bounds.center();
        var matches = centers
          .filter(function(item){return norm(item[0], myCenter)})
          .sort(function(a,b){
            return myCenter.distance(a[0]) - myCenter.distance(b[0]);
          });
        if (matches.length > 0)
          return matches[0][1];
        return null;
      }

      var norm = null;
      switch (event.keyCode) {
        case KeyEvent.DOM_VK_RIGHT:
          norm = function(a, me){return a.x > me.x};
          break;
        case KeyEvent.DOM_VK_LEFT:
          norm = function(a, me){return a.x < me.x};
          break;
        case KeyEvent.DOM_VK_DOWN:
          norm = function(a, me){return a.y > me.y};
          break;
        case KeyEvent.DOM_VK_UP:
          norm = function(a, me){return a.y < me.y}
          break;
      }

      if (norm != null) {
        var nextTab = getClosestTabBy(norm);
        if (nextTab) {
          if (nextTab.isStacked && !nextTab.parent.expanded)
            nextTab = nextTab.parent.getChild(0);
          self.setActiveTab(nextTab);
        }
        event.stopPropagation();
        event.preventDefault();
      } else if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
        let activeGroupItem = GroupItems.getActiveGroupItem();
        if (activeGroupItem && activeGroupItem.expanded)
          activeGroupItem.collapse();
        else 
          self.exit();

        event.stopPropagation();
        event.preventDefault();
      } else if (event.keyCode == KeyEvent.DOM_VK_RETURN ||
                 event.keyCode == KeyEvent.DOM_VK_ENTER) {
        let activeTab = self.getActiveTab();
        if (activeTab)
          activeTab.zoomIn();

        event.stopPropagation();
        event.preventDefault();
      } else if (event.keyCode == KeyEvent.DOM_VK_TAB) {
        // tab/shift + tab to go to the next tab.
        var activeTab = self.getActiveTab();
        if (activeTab) {
          var tabItems = (activeTab.parent ? activeTab.parent.getChildren() :
                          [activeTab]);
          var length = tabItems.length;
          var currentIndex = tabItems.indexOf(activeTab);

          if (length > 1) {
            if (event.shiftKey) {
              if (currentIndex == 0)
                newIndex = (length - 1);
              else
                newIndex = (currentIndex - 1);
            } else {
              if (currentIndex == (length - 1))
                newIndex = 0;
              else
                newIndex = (currentIndex + 1);
            }
            self.setActiveTab(tabItems[newIndex]);
          }
        }
        event.stopPropagation();
        event.preventDefault();
      } else if (event.keyCode == KeyEvent.DOM_VK_SLASH) {
        // the / event handler for find bar is defined in the findbar.xml
        // binding.  To keep things in its own module, we handle our slash here.
        self.enableSearch(event);
      } else if (event.keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
        // prevent navigating backward in the selected tab's history
        event.stopPropagation();
        event.preventDefault();
      }
    });
  },

  // ----------
  // Function: enableSearch
  // Enables the search feature.
  // Parameters:
  //   event - the event triggers this action.
  enableSearch: function UI_enableSearch(event) {
    if (!isSearchEnabled()) {
      ensureSearchShown();
      SearchEventHandler.switchToInMode();
      
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
    }
  },

  // ----------
  // Function: _createGroupItemOnDrag
  // Called in response to a mousedown in empty space in the TabView UI;
  // creates a new groupItem based on the user's drag.
  _createGroupItemOnDrag: function UI__createGroupItemOnDrag(e) {
    const minSize = 60;
    const minMinSize = 15;

    let lastActiveGroupItem = GroupItems.getActiveGroupItem();
    GroupItems.setActiveGroupItem(null);

    var startPos = { x: e.clientX, y: e.clientY };
    var phantom = iQ("<div>")
      .addClass("groupItem phantom activeGroupItem dragRegion")
      .css({
        position: "absolute",
        zIndex: -1,
        cursor: "default"
      })
      .appendTo("body");

    var item = { // a faux-Item
      container: phantom,
      isAFauxItem: true,
      bounds: {},
      getBounds: function FauxItem_getBounds() {
        return this.container.bounds();
      },
      setBounds: function FauxItem_setBounds(bounds) {
        this.container.css(bounds);
      },
      setZ: function FauxItem_setZ(z) {
        // don't set a z-index because we want to force it to be low.
      },
      setOpacity: function FauxItem_setOpacity(opacity) {
        this.container.css("opacity", opacity);
      },
      // we don't need to pushAway the phantom item at the end, because
      // when we create a new GroupItem, it'll do the actual pushAway.
      pushAway: function () {},
    };
    item.setBounds(new Rect(startPos.y, startPos.x, 0, 0));

    var dragOutInfo = new Drag(item, e);

    function updateSize(e) {
      var box = new Rect();
      box.left = Math.min(startPos.x, e.clientX);
      box.right = Math.max(startPos.x, e.clientX);
      box.top = Math.min(startPos.y, e.clientY);
      box.bottom = Math.max(startPos.y, e.clientY);
      item.setBounds(box);

      // compute the stationaryCorner
      var stationaryCorner = "";

      if (startPos.y == box.top)
        stationaryCorner += "top";
      else
        stationaryCorner += "bottom";

      if (startPos.x == box.left)
        stationaryCorner += "left";
      else
        stationaryCorner += "right";

      dragOutInfo.snap(stationaryCorner, false, false); // null for ui, which we don't use anyway.

      box = item.getBounds();
      if (box.width > minMinSize && box.height > minMinSize &&
         (box.width > minSize || box.height > minSize))
        item.setOpacity(1);
      else
        item.setOpacity(0.7);

      e.preventDefault();
    }

    function collapse() {
      let center = phantom.bounds().center();
      phantom.animate({
        width: 0,
        height: 0,
        top: center.y,
        left: center.x
      }, {
        duration: 300,
        complete: function() {
          phantom.remove();
        }
      });
      GroupItems.setActiveGroupItem(lastActiveGroupItem);
    }

    function finalize(e) {
      iQ(window).unbind("mousemove", updateSize);
      item.container.removeClass("dragRegion");
      dragOutInfo.stop();
      let box = item.getBounds();
      if (box.width > minMinSize && box.height > minMinSize &&
         (box.width > minSize || box.height > minSize)) {
        var bounds = item.getBounds();

        // Add all of the orphaned tabs that are contained inside the new groupItem
        // to that groupItem.
        var tabs = GroupItems.getOrphanedTabs();
        var insideTabs = [];
        for each(let tab in tabs) {
          if (bounds.contains(tab.bounds))
            insideTabs.push(tab);
        }

        var groupItem = new GroupItem(insideTabs,{bounds:bounds});
        GroupItems.setActiveGroupItem(groupItem);
        phantom.remove();
        dragOutInfo = null;
        gTabView.firstUseExperienced = true;
      } else {
        collapse();
      }
    }

    iQ(window).mousemove(updateSize)
    iQ(gWindow).one("mouseup", finalize);
    e.preventDefault();
    return false;
  },

  // ----------
  // Function: _resize
  // Update the TabView UI contents in response to a window size change.
  // Won't do anything if it doesn't deem the resize necessary.
  // Parameters:
  //   force - true to update even when "unnecessary"; default false
  _resize: function UI__resize(force) {
    if (!this._pageBounds)
      return;

    // Here are reasons why we *won't* resize:
    // 1. Panorama isn't visible (in which case we will resize when we do display)
    // 2. the screen dimensions haven't changed
    // 3. everything on the screen fits and nothing feels cramped
    if (!force && !this.isTabViewVisible())
      return;

    let oldPageBounds = new Rect(this._pageBounds);
    let newPageBounds = Items.getPageBounds();
    if (newPageBounds.equals(oldPageBounds))
      return;

    if (!this.shouldResizeItems())
      return;

    var items = Items.getTopLevelItems();

    // compute itemBounds: the union of all the top-level items' bounds.
    var itemBounds = new Rect(this._pageBounds);
    // We start with pageBounds so that we respect the empty space the user
    // has left on the page.
    itemBounds.width = 1;
    itemBounds.height = 1;
    items.forEach(function(item) {
      var bounds = item.getBounds();
      itemBounds = (itemBounds ? itemBounds.union(bounds) : new Rect(bounds));
    });

    if (newPageBounds.width < this._pageBounds.width &&
        newPageBounds.width > itemBounds.width)
      newPageBounds.width = this._pageBounds.width;

    if (newPageBounds.height < this._pageBounds.height &&
        newPageBounds.height > itemBounds.height)
      newPageBounds.height = this._pageBounds.height;

    var wScale;
    var hScale;
    if (Math.abs(newPageBounds.width - this._pageBounds.width)
         > Math.abs(newPageBounds.height - this._pageBounds.height)) {
      wScale = newPageBounds.width / this._pageBounds.width;
      hScale = newPageBounds.height / itemBounds.height;
    } else {
      wScale = newPageBounds.width / itemBounds.width;
      hScale = newPageBounds.height / this._pageBounds.height;
    }

    var scale = Math.min(hScale, wScale);
    var self = this;
    var pairs = [];
    items.forEach(function(item) {
      var bounds = item.getBounds();
      bounds.left += (UI.rtl ? -1 : 1) * (newPageBounds.left - self._pageBounds.left);
      bounds.left *= scale;
      bounds.width *= scale;

      bounds.top += newPageBounds.top - self._pageBounds.top;
      bounds.top *= scale;
      bounds.height *= scale;

      pairs.push({
        item: item,
        bounds: bounds
      });
    });

    Items.unsquish(pairs);

    pairs.forEach(function(pair) {
      pair.item.setBounds(pair.bounds, true);
      pair.item.snap();
    });

    this._pageBounds = Items.getPageBounds();
    this._save();
  },
  
  // ----------
  // Function: shouldResizeItems
  // Returns whether we should resize the items on the screen, based on whether
  // the top-level items fit in the screen or not and whether they feel
  // "cramped" or not.
  // These computations may be done using cached values. The cache can be
  // cleared with UI.clearShouldResizeItems().
  shouldResizeItems: function UI_shouldResizeItems() {

    let newPageBounds = Items.getPageBounds();
    
    // If we don't have cached cached values...
    if (this._minimalRect === undefined || this._feelsCramped === undefined) {

      // Loop through every top-level Item for two operations:
      // 1. check if it is feeling "cramped" due to squishing (a technical term),
      // 2. union its bounds with the minimalRect
      let feelsCramped = false;
      let minimalRect = new Rect(0, 0, 1, 1);
      
      Items.getTopLevelItems()
        .forEach(function UI_shouldResizeItems_checkItem(item) {
          let bounds = new Rect(item.getBounds());
          feelsCramped = feelsCramped || (item.userSize &&
            (item.userSize.x > bounds.width || item.userSize.y > bounds.height));
          bounds.inset(-Trenches.defaultRadius, -Trenches.defaultRadius);
          minimalRect = minimalRect.union(bounds);
        });
      
      // ensure the minimalRect extends to, but not beyond, the origin
      minimalRect.left = 0;
      minimalRect.top  = 0;
  
      this._minimalRect = minimalRect;
      this._feelsCramped = feelsCramped;
    }

    return this._minimalRect.width > newPageBounds.width ||
      this._minimalRect.height > newPageBounds.height ||
      this._feelsCramped;
  },
  
  // ----------
  // Function: clearShouldResizeItems
  // Clear the cache of whether we should resize the items on the Panorama
  // screen, forcing a recomputation on the next UI.shouldResizeItems()
  // call.
  clearShouldResizeItems: function UI_clearShouldResizeItems() {
    delete this._minimalRect;
    delete this._feelsCramped;
  },

  // ----------
  // Function: exit
  // Exits TabView UI.
  exit: function UI_exit() {
    let self = this;
    let zoomedIn = false;

    if (isSearchEnabled()) {
      let matcher = createSearchTabMacher();
      let matches = matcher.matched();

      if (matches.length > 0) {
        matches[0].zoomIn();
        zoomedIn = true;
      }
      hideSearch(null);
    }

    if (!zoomedIn) {
      let unhiddenGroups = GroupItems.groupItems.filter(function(groupItem) {
        return (!groupItem.hidden && groupItem.getChildren().length > 0);
      });
      // no pinned tabs, no visible groups and no orphaned tabs: open a new
      // group. open a blank tab and return
      if (!unhiddenGroups.length && !GroupItems.getOrphanedTabs().length) {
        let emptyGroups = GroupItems.groupItems.filter(function (groupItem) {
          return (!groupItem.hidden && !groupItem.getChildren().length);
        });
        let group = (emptyGroups.length ? emptyGroups[0] : GroupItems.newGroup());
        if (!gBrowser._numPinnedTabs) {
          group.newTab();
          return;
        }
      }

      // If there's an active TabItem, zoom into it. If not (for instance when the
      // selected tab is an app tab), just go there.
      let activeTabItem = this.getActiveTab();
      if (!activeTabItem) {
        let tabItem = gBrowser.selectedTab._tabViewTabItem;
        if (tabItem) {
          if (!tabItem.parent || !tabItem.parent.hidden) {
            activeTabItem = tabItem;
          } else { // set active tab item if there is at least one unhidden group
            if (unhiddenGroups.length > 0)
              activeTabItem = unhiddenGroups[0].getActiveTab();
          }
        }
      }

      if (activeTabItem) {
        activeTabItem.zoomIn();
      } else {
        if (gBrowser._numPinnedTabs > 0) {
          if (gBrowser.selectedTab.pinned) {
            self.goToTab(gBrowser.selectedTab);
          } else {
            Array.some(gBrowser.tabs, function(tab) {
              if (tab.pinned) {
                self.goToTab(tab);
                return true;
              }
              return false
            });
          }
        }
      }
    }
  },

  // ----------
  // Function: storageSanity
  // Given storage data for this object, returns true if it looks valid.
  _storageSanity: function UI__storageSanity(data) {
    if (Utils.isEmptyObject(data))
      return true;

    if (!Utils.isRect(data.pageBounds)) {
      Utils.log("UI.storageSanity: bad pageBounds", data.pageBounds);
      data.pageBounds = null;
      return false;
    }

    return true;
  },

  // ----------
  // Function: _save
  // Saves the data for this object to persistent storage
  _save: function UI__save() {
    if (!this._frameInitialized)
      return;

    var data = {
      pageBounds: this._pageBounds
    };

    if (this._storageSanity(data))
      Storage.saveUIData(gWindow, data);
  },

  // ----------
  // Function: _saveAll
  // Saves all data associated with TabView.
  // TODO: Save info items
  _saveAll: function UI__saveAll() {
    this._save();
    GroupItems.saveAll();
    TabItems.saveAll();
  }
};

// ----------
UI.init();
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is search.js.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Aza Raskin <aza@mozilla.com>
 * Raymond Lee <raymond@raysquare.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/* ******************************
 *
 * This file incorporates work from:
 * Quicksilver Score (qs_score):
 * http://rails-oceania.googlecode.com/svn/lachiecox/qs_score/trunk/qs_score.js
 * This incorporated work is covered by the following copyright and
 * permission notice:
 * Copyright 2008 Lachie Cox
 * Licensed under the MIT license.
 * http://jquery.org/license
 *
 *  ***************************** */

// **********
// Title: search.js
// Implementation for the search functionality of Firefox Panorama.

// ----------
// Function: scorePatternMatch
// Given a pattern string, returns a score between 0 and 1 of how well
// that pattern matches the original string. It mimics the heuristics
// of the Mac application launcher Quicksilver.
function scorePatternMatch(pattern, matched, offset) {
  offset = offset || 0;
  pattern = pattern.toLowerCase();
  matched = matched.toLowerCase();
 
  if (pattern.length == 0) return 0.9;
  if (pattern.length > matched.length) return 0.0;

  for (var i = pattern.length; i > 0; i--) {
    var sub_pattern = pattern.substring(0,i);
    var index = matched.indexOf(sub_pattern);

    if (index < 0) continue;
    if (index + pattern.length > matched.length + offset) continue;

    var next_string = matched.substring(index+sub_pattern.length);
    var next_pattern = null;

    if (i >= pattern.length)
      next_pattern = '';
    else
      next_pattern = pattern.substring(i);
 
    var remaining_score = 
      scorePatternMatch(next_pattern, next_string, offset + index);
 
    if (remaining_score > 0) {
      var score = matched.length-next_string.length;

      if (index != 0) {
        var j = 0;

        var c = matched.charCodeAt(index-1);
        if (c == 32 || c == 9) {
          for (var j = (index - 2); j >= 0; j--) {
            c = matched.charCodeAt(j);
            score -= ((c == 32 || c == 9) ? 1 : 0.15);
          }
        } else {
          score -= index;
        }
      }
   
      score += remaining_score * next_string.length;
      score /= matched.length;
      return score;
    }
  }
  return 0.0;  
}

// ##########
// Class: TabUtils
// 
// A collection of helper functions for dealing with both
// <TabItem>s and <xul:tab>s without having to worry which
// one is which.
var TabUtils = {
  // ---------
  // Function: _nameOfTab
  // Given a <TabItem> or a <xul:tab> returns the tab's name.
  nameOf: function TabUtils_nameOfTab(tab) {
    // We can have two types of tabs: A <TabItem> or a <xul:tab>
    // because we have to deal with both tabs represented inside
    // of active Panoramas as well as for windows in which
    // Panorama has yet to be activated. We uses object sniffing to
    // determine the type of tab and then returns its name.     
    return tab.label != undefined ? tab.label : tab.$tabTitle[0].innerHTML;
  },
  
  // ---------
  // Function: URLOf
  // Given a <TabItem> or a <xul:tab> returns the URL of tab
  URLOf: function TabUtils_URLOf(tab) {
    // Convert a <TabItem> to <xul:tab>
    if(tab.tab != undefined)
      tab = tab.tab;
    return tab.linkedBrowser.currentURI.spec;
  },

  // ---------
  // Function: favURLOf
  // Given a <TabItem> or a <xul:tab> returns the URL of tab's favicon.
  faviconURLOf: function TabUtils_faviconURLOf(tab) {
    return tab.image != undefined ? tab.image : tab.$favImage[0].src;
  },
  
  // ---------
  // Function: focus
  // Given a <TabItem> or a <xul:tab>, focuses it and it's window.
  focus: function TabUtils_focus(tab) {
    // Convert a <TabItem> to a <xul:tab>
    if (tab.tab != undefined) tab = tab.tab;
    tab.ownerDocument.defaultView.gBrowser.selectedTab = tab;
    tab.ownerDocument.defaultView.focus();    
  }
};

// ##########
// Class: TabMatcher
// 
// A singleton class that allows you to iterate over
// matching and not-matching tabs, given a case-insensitive
// search term.
function TabMatcher(term) { 
  this.term = term; 
}

TabMatcher.prototype = {  
  // ---------
  // Function: _filterAndSortMatches
  // Given an array of <TabItem>s and <xul:tab>s returns a new array
  // of tabs whose name matched the search term, sorted by lexical
  // closeness.  
  _filterAndSortForMatches: function TabMatcher__filterAndSortForMatches(tabs) {
    var self = this;
    tabs = tabs.filter(function(tab){
      let name = TabUtils.nameOf(tab);
      let url = TabUtils.URLOf(tab);
      return name.match(self.term, "i") || url.match(self.term, "i");
    });

    tabs.sort(function sorter(x, y){
      var yScore = scorePatternMatch(self.term, TabUtils.nameOf(y));
      var xScore = scorePatternMatch(self.term, TabUtils.nameOf(x));
      return yScore - xScore; 
    });
    
    return tabs;
  },
  
  // ---------
  // Function: _filterForUnmatches
  // Given an array of <TabItem>s returns an unsorted array of tabs whose name
  // does not match the the search term.
  _filterForUnmatches: function TabMatcher__filterForUnmatches(tabs) {
    var self = this;
    return tabs.filter(function(tab) {
      var name = tab.$tabTitle[0].innerHTML;
      let url = TabUtils.URLOf(tab);
      return !name.match(self.term, "i") && !url.match(self.term, "i");
    });
  },
  
  // ---------
  // Function: _getTabsForOtherWindows
  // Returns an array of <TabItem>s and <xul:tabs>s representing that
  // tabs from all windows but the currently focused window. <TabItem>s
  // will be returned for windows in which Panorama has been activated at
  // least once, while <xul:tab>s will be return for windows in which
  // Panorama has never been activated.
  _getTabsForOtherWindows: function TabMatcher__getTabsForOtherWindows(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");    
    var currentWindow = wm.getMostRecentWindow("navigator:browser");
    
    var allTabs = [];    
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      // This function gets tabs from other windows: not the one you currently
      // have focused.
      if (win != currentWindow) {
        // If TabView is around iterate over all tabs, else get the currently
        // shown tabs...
        
        let tvWindow = win.TabView.getContentWindow();
        if (tvWindow)
          allTabs = allTabs.concat( tvWindow.TabItems.getItems() );
        else
          // win.gBrowser.tabs isn't a proper array, so we can't use concat
          for (var i=0; i<win.gBrowser.tabs.length; i++) allTabs.push( win.gBrowser.tabs[i] );
      } 
    }
    return allTabs;    
  },
  
  // ----------
  // Function: matchedTabsFromOtherWindows
  // Returns an array of <TabItem>s and <xul:tab>s that match the search term
  // from all windows but the currently focused window. <TabItem>s will be
  // returned for windows in which Panorama has been activated at least once,
  // while <xul:tab>s will be return for windows in which Panorama has never
  // been activated.
  // (new TabMatcher("app")).matchedTabsFromOtherWindows();
  matchedTabsFromOtherWindows: function TabMatcher_matchedTabsFromOtherWindows(){
    if (this.term.length < 2)
      return [];
    
    var tabs = this._getTabsForOtherWindows();
    tabs = this._filterAndSortForMatches(tabs);
    return tabs;
  },
  
  // ----------
  // Function: matched
  // Returns an array of <TabItem>s which match the current search term.
  // If the term is less than 2 characters in length, it returns
  // nothing.
  matched: function TabMatcher_matched() {
    if (this.term.length < 2)
      return [];
      
    var tabs = TabItems.getItems();
    tabs = this._filterAndSortForMatches(tabs);
    return tabs;    
  },
  
  // ----------
  // Function: unmatched
  // Returns all of <TabItem>s that .matched() doesn't return.
  unmatched: function TabMatcher_unmatched() {
    var tabs = TabItems.getItems();
    if (this.term.length < 2)
      return tabs;
      
    return this._filterForUnmatches(tabs);
  },

  // ----------
  // Function: doSearch
  // Performs the search. Lets you provide three functions.
  // The first is on all matched tabs in the window, the second on all unmatched
  // tabs in the window, and the third on all matched tabs in other windows.
  // The first two functions take two parameters: A <TabItem> and its integer index
  // indicating the absolute rank of the <TabItem> in terms of match to
  // the search term. The last function also takes two paramaters, but can be
  // passed both <TabItem>s and <xul:tab>s and the index is offset by the
  // number of matched tabs inside the window.
  doSearch: function TabMatcher_doSearch(matchFunc, unmatchFunc, otherFunc) {
    var matches = this.matched();
    var unmatched = this.unmatched();
    var otherMatches = this.matchedTabsFromOtherWindows();
    
    matches.forEach(function(tab, i) {
      matchFunc(tab, i);
    });

    otherMatches.forEach(function(tab,i) {
      otherFunc(tab, i+matches.length);      
    });
    
    unmatched.forEach(function(tab, i) {
      unmatchFunc(tab, i);
    });    
  }
};

// ##########
// Class: SearchEventHandlerClass
// 
// A singleton class that handles all of the
// event handlers.
function SearchEventHandlerClass() { 
  this.init(); 
}

SearchEventHandlerClass.prototype = {
  // ----------
  // Function: init
  // Initializes the searchbox to be focused, and everything
  // else to be hidden, and to have everything have the appropriate
  // event handlers;
  init: function () {
    var self = this;
    iQ("#searchbox")[0].focus(); 
    iQ("#search").hide();
    iQ("#searchshade").hide().click(function(event) {
      if ( event.target.id != "searchbox")
        hideSearch();
    });
    
    iQ("#searchbox").keyup(function() {
      performSearch();
    });
    
    iQ("#searchbutton").mousedown(function() {
      self.initiatedBy = "buttonclick";
      ensureSearchShown();
      self.switchToInMode();      
    });
    
    this.initiatedBy = "";
    this.currentHandler = null;
    this.switchToBeforeMode();
  },
  
  // ----------
  // Function: beforeSearchKeyHandler
  // Handles all keydown before the search interface is brought up.
  beforeSearchKeyHandler: function (event) {
    // Only match reasonable text-like characters for quick search.
    if (event.altKey || event.ctrlKey || event.metaKey)
      return;

    if ((event.keyCode > 0 && event.keyCode <= event.DOM_VK_DELETE) ||
        event.keyCode == event.DOM_VK_CONTEXT_MENU ||
        event.keyCode == event.DOM_VK_SLEEP ||
        (event.keyCode >= event.DOM_VK_F1 &&
         event.keyCode <= event.DOM_VK_SCROLL_LOCK) ||
        event.keyCode == event.DOM_VK_META ||
        event.keyCode == 91 || // 91 = left windows key
        event.keyCode == 92 || // 92 = right windows key
        (!event.keyCode && !event.charCode)) {
      return;
    }

    // If we are already in an input field, allow typing as normal.
    if (event.target.nodeName == "INPUT")
      return;

    this.switchToInMode();
    this.initiatedBy = "keydown";
    ensureSearchShown(true);
  },

  // ----------
  // Function: inSearchKeyHandler
  // Handles all keydown while search mode.
  inSearchKeyHandler: function (event) {
    let term = iQ("#searchbox").val();
    if ((event.keyCode == event.DOM_VK_ESCAPE) || 
        (event.keyCode == event.DOM_VK_BACK_SPACE && term.length <= 1 && this.initiatedBy == "keydown")) {
      hideSearch(event);
      return;
    }

    let matcher = createSearchTabMacher();
    let matches = matcher.matched();
    let others =  matcher.matchedTabsFromOtherWindows();
    if ((event.keyCode == event.DOM_VK_RETURN || 
         event.keyCode == event.DOM_VK_ENTER) && 
         (matches.length > 0 || others.length > 0)) {
      hideSearch(event);
      if (matches.length > 0) 
        matches[0].zoomIn();
      else
        TabUtils.focus(others[0]);
    }
  },

  // ----------
  // Function: switchToBeforeMode
  // Make sure the event handlers are appropriate for
  // the before-search mode. 
  switchToBeforeMode: function switchToBeforeMode() {
    let self = this;
    if (this.currentHandler)
      iQ(window).unbind("keydown", this.currentHandler);
    this.currentHandler = function(event) self.beforeSearchKeyHandler(event);
    iQ(window).keydown(this.currentHandler);
  },
  
  // ----------
  // Function: switchToInMode
  // Make sure the event handlers are appropriate for
  // the in-search mode.   
  switchToInMode: function switchToInMode() {
    let self = this;
    if (this.currentHandler)
      iQ(window).unbind("keydown", this.currentHandler);
    this.currentHandler = function(event) self.inSearchKeyHandler(event);
    iQ(window).keydown(this.currentHandler);
  }
};

var TabHandlers = {
  onMatch: function(tab, index){
    tab.addClass("onTop");
    index != 0 ? tab.addClass("notMainMatch") : tab.removeClass("notMainMatch");

    // Remove any existing handlers before adding the new ones.
    // If we don't do this, then we may add more handlers than
    // we remove.
    tab.$canvas
      .unbind("mousedown", TabHandlers._hideHandler)
      .unbind("mouseup", TabHandlers._showHandler);

    tab.$canvas
      .mousedown(TabHandlers._hideHandler)
      .mouseup(TabHandlers._showHandler);
  },
  
  onUnmatch: function(tab, index){
    tab.$container.removeClass("onTop");
    tab.removeClass("notMainMatch");

    tab.$canvas
      .unbind("mousedown", TabHandlers._hideHandler)
      .unbind("mouseup", TabHandlers._showHandler);
  },
  
  onOther: function(tab, index){
    // Unlike the other on* functions, in this function tab can
    // either be a <TabItem> or a <xul:tab>. In other functions
    // it is always a <TabItem>. Also note that index is offset
    // by the number of matches within the window.
    let item = iQ("<div/>")
      .addClass("inlineMatch")
      .click(function(event){
        hideSearch(event);
        TabUtils.focus(tab);
      });
    
    iQ("<img/>")
      .attr("src", TabUtils.faviconURLOf(tab) )
      .appendTo(item);
    
    iQ("<span/>")
      .text( TabUtils.nameOf(tab) )
      .appendTo(item);
      
    index != 0 ? item.addClass("notMainMatch") : item.removeClass("notMainMatch");      
    item.appendTo("#results");
    iQ("#otherresults").show();    
  },
  
  _hideHandler: function(event){
    iQ("#search").fadeOut();
    iQ("#searchshade").fadeOut();
    TabHandlers._mouseDownLocation = {x:event.clientX, y:event.clientY};
  },
  
  _showHandler: function(event){
    // If the user clicks on a tab without moving the mouse then
    // they are zooming into the tab and we need to exit search
    // mode.
    if (TabHandlers._mouseDownLocation.x == event.clientX &&
        TabHandlers._mouseDownLocation.y == event.clientY){
      hideSearch();
      return;
    }

    iQ("#searchshade").show();    
    iQ("#search").show();
    iQ("#searchbox")[0].focus();
    // Marshal the search.
    setTimeout(performSearch, 0);
  },
  
  _mouseDownLocation: null
};

function createSearchTabMacher() {
  return new TabMatcher(iQ("#searchbox").val());
}

function hideSearch(event){
  iQ("#searchbox").val("");
  iQ("#searchshade").hide();
  iQ("#search").hide();

  iQ("#searchbutton").css({ opacity:.8 });

//@line 518 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/search.js"

  performSearch();
  SearchEventHandler.switchToBeforeMode();

  if (event){
    event.preventDefault();
    event.stopPropagation();
  }

  // Return focus to the tab window
  UI.blurAll();
  gTabViewFrame.contentWindow.focus();

  let newEvent = document.createEvent("Events");
  newEvent.initEvent("tabviewsearchdisabled", false, false);
  dispatchEvent(newEvent);
}

function performSearch() {
  let matcher = new TabMatcher(iQ("#searchbox").val());

  // Remove any previous other-window search results and
  // hide the display area.
  iQ("#results").empty();
  iQ("#otherresults").hide();
  iQ("#otherresults>.label").text(tabviewString("search.otherWindowTabs"));

  matcher.doSearch(TabHandlers.onMatch, TabHandlers.onUnmatch, TabHandlers.onOther);
}

// ----------
// Function: ensureSearchShown
// Ensure the search feature is displayed.  If not, display it.
// Parameters:
//  - a boolean indicates whether this is triggered by a keypress or not
function ensureSearchShown(activatedByKeypress) {
  var $search = iQ("#search");
  var $searchShade = iQ("#searchshade");
  var $searchbox = iQ("#searchbox");
  iQ("#searchbutton").css({ opacity: 1 });

  if (!isSearchEnabled()) {
    $searchShade.show();
    $search.show();

//@line 566 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/tabview/search.js"

    // NOTE: when this function is called by keydown handler, next keypress
    // event or composition events of IME will be fired on the focused editor.

    function dispatchTabViewSearchEnabledEvent() {
      let newEvent = document.createEvent("Events");
      newEvent.initEvent("tabviewsearchenabled", false, false);
      dispatchEvent(newEvent);
    };

    if (activatedByKeypress) {
      // set the focus so key strokes are entered into the textbox.
      $searchbox[0].focus();
      dispatchTabViewSearchEnabledEvent(); 
    } else {
      // marshal the focusing, otherwise it ends up with searchbox[0].focus gets
      // called before the search button gets the focus after being pressed.
      setTimeout(function setFocusAndDispatchSearchEnabledEvent() {
        $searchbox[0].focus();
        dispatchTabViewSearchEnabledEvent();
      }, 0);
    }
  }
}

function isSearchEnabled() {
  return iQ("#search").css("display") != "none";
}

var SearchEventHandler = new SearchEventHandlerClass();

// Features to add:
// (1) Make sure this looks good on Windows. Bug 594429
// (2) Group all of the highlighted tabs into a group? Bug 594434

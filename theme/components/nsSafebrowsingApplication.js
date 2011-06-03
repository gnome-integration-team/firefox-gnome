const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

// This is copied from toolkit/components/content/js/lang.js.
// It seems cleaner to copy this rather than #include from so far away.
Function.prototype.inherits = function(parentCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = parentCtor.prototype;
  this.superClass_ = parentCtor.prototype;
  this.prototype = new tempCtor();
}  

//@line 36 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/application.js"

// We instantiate this variable when we create the application.
var gDataProvider = null;

// An instance of our application is a PROT_Application object. It
// basically just populates a few globals and instantiates wardens,
// the listmanager, and the about:blocked error page.

/**
 * An instance of our application. There should be exactly one of these.
 * 
 * Note: This object should instantiated only at profile-after-change
 * or later because the listmanager and the cryptokeymanager need to
 * read and write data files. Additionally, NSS isn't loaded until
 * some time around then (Moz bug #321024).
 *
 * @constructor
 */
function PROT_Application() {
  this.debugZone= "application";

//@line 83 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/application.js"
  
  // expose some classes
  this.PROT_PhishingWarden = PROT_PhishingWarden;
  this.PROT_MalwareWarden = PROT_MalwareWarden;

  // Load data provider pref values
  gDataProvider = new PROT_DataProvider();

  // expose the object
  this.wrappedJSObject = this;
}

var gInitialized = false;
PROT_Application.prototype.initialize = function() {
  if (gInitialized)
    return;
  gInitialized = true;

  var obs = Cc["@mozilla.org/observer-service;1"].
            getService(Ci.nsIObserverService);
  obs.addObserver(this, "xpcom-shutdown", true);

  // XXX: move table names to a pref that we originally will download
  // from the provider (need to workout protocol details)
  this.malwareWarden = new PROT_MalwareWarden();
  this.malwareWarden.registerBlackTable("goog-malware-shavar");
  this.malwareWarden.maybeToggleUpdateChecking();

  this.phishWarden = new PROT_PhishingWarden();
  this.phishWarden.registerBlackTable("goog-phish-shavar");
  this.phishWarden.maybeToggleUpdateChecking();
}

PROT_Application.prototype.observe = function(subject, topic, data) {
  switch (topic) {
    case "xpcom-shutdown":
      this.malwareWarden.shutdown();
      this.phishWarden.shutdown();
      break;
  }
}

/**
 * @param name String The type of url to get (either Phish or Error).
 * @return String the report phishing URL (localized).
 */
PROT_Application.prototype.getReportURL = function(name) {
  return gDataProvider["getReport" + name + "URL"]();
}

PROT_Application.prototype.QueryInterface = function(iid) {
  if (iid.equals(Ci.nsISupports) ||
      iid.equals(Ci.nsISupportsWeakReference) ||
      iid.equals(Ci.nsIObserver))
    return this;

  throw Components.results.NS_ERROR_NO_INTERFACE;
}
//@line 37 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/globalstore.js"


// A class that encapsulates data provider specific values.  The
// root of the provider pref tree is browser.safebrowsing.provider.
// followed by a number, followed by specific properties.  The properties
// that a data provider can supply are:
//
// name: The name of the provider
// keyURL: Before we send URLs in enhanced mode, we need to encrypt them
// reportURL: When shown a warning bubble, we send back the user decision
//            (get me out of here/ignore warning) to this URL (strip cookies
//            first).  This is optional.
// gethashURL: Url for requesting complete hashes from the provider.
// reportGenericURL: HTML page for general user feedback
// reportPhishURL: HTML page for notifying the provider of a new phishing page
// reportErrorURL: HTML page for notifying the provider of a false positive

const kDataProviderIdPref = 'browser.safebrowsing.dataProvider';
const kProviderBasePref = 'browser.safebrowsing.provider.';

//@line 58 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/globalstore.js"
const MOZ_OFFICIAL_BUILD = true;
//@line 62 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/globalstore.js"

const MOZ_PARAM_LOCALE = /\{moz:locale\}/g;
const MOZ_PARAM_CLIENT = /\{moz:client\}/g;
const MOZ_PARAM_BUILDID = /\{moz:buildid\}/g;
const MOZ_PARAM_VERSION = /\{moz:version\}/g;

/**
 * Information regarding the data provider.
 */
function PROT_DataProvider() {
  this.prefs_ = new G_Preferences();

  this.loadDataProviderPrefs_();
  
  // Watch for changes in the data provider and update accordingly.
  this.prefs_.addObserver(kDataProviderIdPref,
                          BindToObject(this.loadDataProviderPrefs_, this));

  // Watch for when anti-phishing is toggled on or off.
  this.prefs_.addObserver(kPhishWardenEnabledPref,
                          BindToObject(this.loadDataProviderPrefs_, this));
}

/**
 * Populate all the provider variables.  We also call this when whenever
 * the provider id changes.
 */
PROT_DataProvider.prototype.loadDataProviderPrefs_ = function() {
  // Currently, there's no UI for changing local list provider so we
  // hard code the value for provider 0.
  this.updateURL_ = this.getUrlPref_(
        'browser.safebrowsing.provider.0.updateURL');

  var id = this.prefs_.getPref(kDataProviderIdPref, null);

  // default to 0
  if (null == id)
    id = 0;
  
  var basePref = kProviderBasePref + id + '.';

  this.name_ = this.prefs_.getPref(basePref + "name", "");

  // Urls used to get data from a provider
  this.keyURL_ = this.getUrlPref_(basePref + "keyURL");
  this.reportURL_ = this.getUrlPref_(basePref + "reportURL");
  this.gethashURL_ = this.getUrlPref_(basePref + "gethashURL");

  // Urls to HTML report pages
  this.reportGenericURL_ = this.getUrlPref_(basePref + "reportGenericURL");
  this.reportErrorURL_ = this.getUrlPref_(basePref + "reportErrorURL");
  this.reportPhishURL_ = this.getUrlPref_(basePref + "reportPhishURL");
  this.reportMalwareURL_ = this.getUrlPref_(basePref + "reportMalwareURL")
  this.reportMalwareErrorURL_ = this.getUrlPref_(basePref + "reportMalwareErrorURL")

  // Propagate the changes to the list-manager.
  this.updateListManager_();
}

/**
 * The list manager needs urls to operate.  It needs a url to know where the
 * table updates are, and it needs a url for decrypting enchash style tables.
 */
PROT_DataProvider.prototype.updateListManager_ = function() {
  var listManager = Cc["@mozilla.org/url-classifier/listmanager;1"]
                      .getService(Ci.nsIUrlListManager);

  // If we add support for changing local data providers, we need to add a
  // pref observer that sets the update url accordingly.
  listManager.setUpdateUrl(this.getUpdateURL());

  // setKeyUrl has the side effect of fetching a key from the server.
  // This shouldn't happen if anti-phishing/anti-malware is disabled.
  var isEnabled = this.prefs_.getPref(kPhishWardenEnabledPref, false) ||
                  this.prefs_.getPref(kMalwareWardenEnabledPref, false);
  if (isEnabled) {
    listManager.setKeyUrl(this.keyURL_);
  }

  listManager.setGethashUrl(this.getGethashURL());
}

/**
 * Lookup the value of a URL from prefs file and do parameter substitution.
 */
PROT_DataProvider.prototype.getUrlPref_ = function(prefName) {
  var url = this.prefs_.getPref(prefName);

  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                          .getService(Components.interfaces.nsIXULAppInfo);

  var mozClientStr = this.prefs_.getPref("browser.safebrowsing.clientid",
                                         MOZ_OFFICIAL_BUILD ? 'navclient-auto-ffox' : appInfo.name);

  var versionStr = this.prefs_.getPref("browser.safebrowsing.clientver",
                                       appInfo.version);

  // Parameter substitution
  url = url.replace(MOZ_PARAM_LOCALE, this.getLocale_());
  url = url.replace(MOZ_PARAM_CLIENT, mozClientStr);
  url = url.replace(MOZ_PARAM_BUILDID, appInfo.appBuildID);
  url = url.replace(MOZ_PARAM_VERSION, versionStr);
  return url;
}

/**
 * @return String the browser locale (similar code is in nsSearchService.js)
 */
PROT_DataProvider.prototype.getLocale_ = function() {
  const localePref = "general.useragent.locale";
  var locale = this.getLocalizedPref_(localePref);
  if (locale)
    return locale;

  // Not localized
  var prefs = new G_Preferences();
  return prefs.getPref(localePref, "");
}

/**
 * @return String name of the localized pref, null if none exists.
 */
PROT_DataProvider.prototype.getLocalizedPref_ = function(aPrefName) {
  // G_Preferences doesn't know about complex values, so we use the
  // xpcom object directly.
  var prefs = Cc["@mozilla.org/preferences-service;1"]
              .getService(Ci.nsIPrefBranch);
  try {
    return prefs.getComplexValue(aPrefName, Ci.nsIPrefLocalizedString).data;
  } catch (ex) {
  }
  return "";
}

//////////////////////////////////////////////////////////////////////////////
// Getters for the remote provider pref values mentioned above.
PROT_DataProvider.prototype.getName = function() {
  return this.name_;
}

PROT_DataProvider.prototype.getUpdateURL = function() {
  return this.updateURL_;
}

PROT_DataProvider.prototype.getGethashURL = function() {
  return this.gethashURL_;
}

PROT_DataProvider.prototype.getReportGenericURL = function() {
  return this.reportGenericURL_;
}
PROT_DataProvider.prototype.getReportErrorURL = function() {
  return this.reportErrorURL_;
}
PROT_DataProvider.prototype.getReportPhishURL = function() {
  return this.reportPhishURL_;
}
PROT_DataProvider.prototype.getReportMalwareURL = function() {
  return this.reportMalwareURL_;
}
PROT_DataProvider.prototype.getReportMalwareErrorURL = function() {
  return this.reportMalwareErrorURL_;
}
//@line 37 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/list-warden.js"

// A warden that knows how to register lists with a listmanager and keep them
// updated if necessary.  The ListWarden also provides a simple interface to
// check if a URL is evil or not.  Specialized wardens like the PhishingWarden
// inherit from it.
//
// Classes that inherit from ListWarden are responsible for calling
// enableTableUpdates or disableTableUpdates.  This usually entails
// registering prefObservers and calling enable or disable in the base
// class as appropriate.
//

/**
 * Abtracts the checking of user/browser actions for signs of
 * phishing. 
 *
 * @constructor
 */
function PROT_ListWarden() {
  this.debugZone = "listwarden";
  var listManager = Cc["@mozilla.org/url-classifier/listmanager;1"]
                      .getService(Ci.nsIUrlListManager);
  this.listManager_ = listManager;

  // Once we register tables, their respective names will be listed here.
  this.blackTables_ = [];
  this.whiteTables_ = [];
}

PROT_ListWarden.IN_BLACKLIST = 0
PROT_ListWarden.IN_WHITELIST = 1
PROT_ListWarden.NOT_FOUND = 2

/**
 * Tell the ListManger to keep all of our tables updated
 */

PROT_ListWarden.prototype.enableBlacklistTableUpdates = function() {
  for (var i = 0; i < this.blackTables_.length; ++i) {
    this.listManager_.enableUpdate(this.blackTables_[i]);
  }
}

/**
 * Tell the ListManager to stop updating our tables
 */

PROT_ListWarden.prototype.disableBlacklistTableUpdates = function() {
  for (var i = 0; i < this.blackTables_.length; ++i) {
    this.listManager_.disableUpdate(this.blackTables_[i]);
  }
}

/**
 * Tell the ListManager to update whitelist tables.  They may be enabled even
 * when other updates aren't, for performance reasons.
 */
PROT_ListWarden.prototype.enableWhitelistTableUpdates = function() {
  for (var i = 0; i < this.whiteTables_.length; ++i) {
    this.listManager_.enableUpdate(this.whiteTables_[i]);
  }
}

/**
 * Tell the ListManager to stop updating whitelist tables.
 */
PROT_ListWarden.prototype.disableWhitelistTableUpdates = function() {
  for (var i = 0; i < this.whiteTables_.length; ++i) {
    this.listManager_.disableUpdate(this.whiteTables_[i]);
  }
}

/**
 * Register a new black list table with the list manager
 * @param tableName - name of the table to register
 * @returns true if the table could be registered, false otherwise
 */

PROT_ListWarden.prototype.registerBlackTable = function(tableName) {
  var result = this.listManager_.registerTable(tableName, false);
  if (result) {
    this.blackTables_.push(tableName);
  }
  return result;
}

/**
 * Register a new white list table with the list manager
 * @param tableName - name of the table to register
 * @returns true if the table could be registered, false otherwise
 */

PROT_ListWarden.prototype.registerWhiteTable = function(tableName) {
  var result = this.listManager_.registerTable(tableName, false);
  if (result) {
    this.whiteTables_.push(tableName);
  }
  return result;
}
//@line 36 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/phishing-warden.js"


// The warden checks request to see if they are for phishy pages. It
// does so by querying our locally stored blacklists.
// 
// When the warden notices a problem, it queries all browser views
// (each of which corresopnds to an open browser window) to see
// whether one of them can handle it. A browser view can handle a
// problem if its browser window has an HTMLDocument loaded with the
// given URL and that Document hasn't already been flagged as a
// problem. For every problematic URL we notice loading, at most one
// Document is flagged as problematic. Otherwise you can get into
// trouble if multiple concurrent phishy pages load with the same URL.
//
// Since we check URLs very early in the request cycle (in a progress
// listener), the URL might not yet be associated with a Document when
// we determine that it is phishy. So the the warden retries finding
// a browser view to handle the problem until one can, or until it
// determines it should give up (see complicated logic below).
//
// The warden has displayers that the browser view uses to render
// different kinds of warnings (e.g., one that's shown before a page
// loads as opposed to one that's shown after the page has already
// loaded).
//
// Note: There is a single warden for the whole application.
//
// TODO better way to expose displayers/views to browser view

const kPhishWardenEnabledPref = "browser.safebrowsing.enabled";

/**
 * Abtracts the checking of user/browser actions for signs of
 * phishing. 
 *
 * @param progressListener nsIDocNavStartProgressListener
 * @param tabbrowser XUL tabbrowser element
 * @constructor
 */
function PROT_PhishingWarden() {
  PROT_ListWarden.call(this);

  this.debugZone = "phishwarden";

  // Use this to query preferences
  this.prefs_ = new G_Preferences();

  // We need to know whether we're enabled and whether we're in advanced
  // mode, so reflect the appropriate preferences into our state.

  // Global preference to enable the phishing warden
  this.phishWardenEnabled_ = this.prefs_.getPref(kPhishWardenEnabledPref, null);

  // Get notifications when the phishing warden enabled pref changes
  var phishWardenPrefObserver = 
    BindToObject(this.onPhishWardenEnabledPrefChanged, this);
  this.prefs_.addObserver(kPhishWardenEnabledPref, phishWardenPrefObserver);

  G_Debug(this, "phishWarden initialized");
}

PROT_PhishingWarden.inherits(PROT_ListWarden);

PROT_PhishingWarden.prototype.QueryInterface = function(iid) {
  if (iid.equals(Ci.nsISupports) || 
      iid.equals(Ci.nsISupportsWeakReference))
    return this;
  throw Components.results.NS_ERROR_NO_INTERFACE;
}

/**
 * Cleanup on shutdown.
 */
PROT_PhishingWarden.prototype.shutdown = function() {
  this.prefs_.removeAllObservers();
  this.listManager_ = null;
}

/**
 * When a preference (either advanced features or the phishwarden
 * enabled) changes, we might have to start or stop asking for updates. 
 * 
 * This is a little tricky; we start or stop management only when we
 * have complete information we can use to determine whether we
 * should.  It could be the case that one pref or the other isn't set
 * yet (e.g., they haven't opted in/out of advanced features). So do
 * nothing unless we have both pref values -- we get notifications for
 * both, so eventually we will start correctly.
 */ 
PROT_PhishingWarden.prototype.maybeToggleUpdateChecking = function() {
  var phishWardenEnabled = this.prefs_.getPref(kPhishWardenEnabledPref, null);

  G_Debug(this, "Maybe toggling update checking. " +
          "Warden enabled? " + phishWardenEnabled);

  // Do nothing unless both prefs are set.  They can be null (unset), true, or
  // false.
  if (phishWardenEnabled === null)
    return;

  // We update and save to disk all tables
  if (phishWardenEnabled === true) {
    this.enableBlacklistTableUpdates();
    this.enableWhitelistTableUpdates();
  } else {
    // Anti-phishing is off, disable table updates
    this.disableBlacklistTableUpdates();
    this.disableWhitelistTableUpdates();
  }
}

/**
 * Deal with a user changing the pref that says whether we should 
 * enable the phishing warden (i.e., that SafeBrowsing is active)
 *
 * @param prefName Name of the pref holding the value indicating whether
 *                 we should enable the phishing warden
 */
PROT_PhishingWarden.prototype.onPhishWardenEnabledPrefChanged = function(
                                                                    prefName) {
  // Just to be safe, ignore changes to sub prefs.
  if (prefName != "browser.safebrowsing.enabled")
    return;

  this.phishWardenEnabled_ = 
    this.prefs_.getPref(prefName, this.phishWardenEnabled_);
  this.maybeToggleUpdateChecking();
}
//@line 37 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/content/malware-warden.js"

// This warden manages updates to the malware list

const kMalwareWardenEnabledPref = "browser.safebrowsing.malware.enabled";

function PROT_MalwareWarden() {
  PROT_ListWarden.call(this);

  this.debugZone = "malwarewarden";

  // Use this to query preferences
  this.prefs_ = new G_Preferences();

  // Global preference to enable the malware warden
  this.malwareWardenEnabled_ =
    this.prefs_.getPref(kMalwareWardenEnabledPref, null);

  // Get notifications when the malware warden enabled pref changes
  var malwareWardenPrefObserver =
    BindToObject(this.onMalwareWardenEnabledPrefChanged, this);
  this.prefs_.addObserver(kMalwareWardenEnabledPref, malwareWardenPrefObserver);

  // Add a test chunk to the database
  var testData = "mozilla.com/firefox/its-an-attack.html";

  var testUpdate =
    "n:1000\ni:test-malware-simple\nad:1\n" +
    "a:1:32:" + testData.length + "\n" +
    testData;
    
  testData = "mozilla.com/firefox/its-a-trap.html";
  testUpdate +=
    "n:1000\ni:test-phish-simple\nad:1\n" +
    "a:1:32:" + testData.length + "\n" +
    testData;

  var dbService_ = Cc["@mozilla.org/url-classifier/dbservice;1"]
                   .getService(Ci.nsIUrlClassifierDBService);

  var listener = {
    QueryInterface: function(iid)
    {
      if (iid.equals(Ci.nsISupports) ||
          iid.equals(Ci.nsIUrlClassifierUpdateObserver))
        return this;
      throw Cr.NS_ERROR_NO_INTERFACE;
    },

    updateUrlRequested: function(url) { },
    streamFinished: function(status) { },
    updateError: function(errorCode) { },
    updateSuccess: function(requestedTimeout) { }
  };

  try {
    dbService_.beginUpdate(listener,
                           "test-malware-simple,test-phish-simple", "");
    dbService_.beginStream("", "");
    dbService_.updateStream(testUpdate);
    dbService_.finishStream();
    dbService_.finishUpdate();
  } catch(ex) {
    // beginUpdate will throw harmlessly if there's an existing update
    // in progress, ignore failures.
  }
  G_Debug(this, "malwareWarden initialized");
}

PROT_MalwareWarden.inherits(PROT_ListWarden);

/**
 * Cleanup on shutdown.
 */
PROT_MalwareWarden.prototype.shutdown = function() {
  this.prefs_.removeAllObservers();

  this.listManager_ = null;
}

/**
 * When a preference changes, we might have to start or stop asking for
 * updates.
 */
PROT_MalwareWarden.prototype.maybeToggleUpdateChecking = function() {
  var malwareWardenEnabled = this.prefs_.getPref(kMalwareWardenEnabledPref,
                                                 null);

  G_Debug(this, "Maybe toggling update checking. " +
          "Warden enabled? " + malwareWardenEnabled);

  // Do nothing unless thre pref is set
  if (malwareWardenEnabled === null)
    return;

  // We update and save to disk all tables
  if (malwareWardenEnabled === true) {
    this.enableBlacklistTableUpdates();
  } else {
    // Anti-malware is off, disable table updates
    this.disableBlacklistTableUpdates();
  }
}

/**
 * Deal with a user changing the pref that says whether we should 
 * enable the malware warden.
 *
 * @param prefName Name of the pref holding the value indicating whether
 *                 we should enable the malware warden
 */
PROT_MalwareWarden.prototype.onMalwareWardenEnabledPrefChanged = function(
                                                                    prefName) {
  // Just to be safe, ignore changes to sub prefs.
  if (prefName != kMalwareWardenEnabledPref)
    return;

  this.malwareWardenEnabled_ =
    this.prefs_.getPref(prefName, this.malwareWardenEnabled_);
  this.maybeToggleUpdateChecking();
}
//@line 20 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/components/safebrowsing/src/nsSafebrowsingApplication.js"

var modScope = this;
function Init() {
  var jslib = Cc["@mozilla.org/url-classifier/jslib;1"]
              .getService().wrappedJSObject;
  modScope.G_Debug = jslib.G_Debug;
  modScope.G_Assert = jslib.G_Assert;
  modScope.G_Alarm = jslib.G_Alarm;
  modScope.G_ConditionalAlarm = jslib.G_ConditionalAlarm;
  modScope.G_ObserverWrapper = jslib.G_ObserverWrapper;
  modScope.G_Preferences = jslib.G_Preferences;
  modScope.PROT_XMLFetcher = jslib.PROT_XMLFetcher;
  modScope.BindToObject = jslib.BindToObject;
  modScope.G_Protocol4Parser = jslib.G_Protocol4Parser;
  modScope.PROT_UrlCrypto = jslib.PROT_UrlCrypto;
  modScope.RequestBackoff = jslib.RequestBackoff;
  
  // We only need to call Init once
  modScope.Init = function() {};
}

function SafeBrowsingApplication()
{
}
SafeBrowsingApplication.prototype = {
  classID: Components.ID("{c64d0bcb-8270-4ca7-a0b3-3380c8ffecb5}"),
  _xpcom_factory: {
    createInstance: function(outer, iid) {
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      Init();
      return new PROT_Application();
    }
  },
};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([SafeBrowsingApplication]);

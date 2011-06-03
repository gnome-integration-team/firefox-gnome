//@line 39 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/aboutDialog.js"

// Services = object with smart getters for common XPCOM services
Components.utils.import("resource://gre/modules/Services.jsm");

function init(aEvent)
{
  if (aEvent.target != document)
    return;

  try {
    var distroId = Services.prefs.getCharPref("distribution.id");
    if (distroId) {
      var distroVersion = Services.prefs.getCharPref("distribution.version");
      var distroAbout = Services.prefs.getComplexValue("distribution.about",
        Components.interfaces.nsISupportsString);

      var distroField = document.getElementById("distribution");
      distroField.value = distroAbout;
      distroField.style.display = "block";

      var distroIdField = document.getElementById("distributionId");
      distroIdField.value = distroId + " - " + distroVersion;
      distroIdField.style.display = "block";
    }
  }
  catch (e) {
    // Pref is unset
  }

  // Include the build ID if this is a "pre" (i.e. non-release) build
  let version = Services.appinfo.version;
  if (version.indexOf("pre") != -1) {
    let buildID = Services.appinfo.appBuildID;
    let buildDate = buildID.slice(0,4) + "-" + buildID.slice(4,6) + "-" + buildID.slice(6,8);
    document.getElementById("version").value += " (" + buildDate + ")";
  }

//@line 77 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/aboutDialog.js"
  // Hide the Charlton trademark attribution for non-en-US/en-GB
  // DO NOT REMOVE without consulting people involved with bug 616193
  let chromeRegistry = Components.classes["@mozilla.org/chrome/chrome-registry;1"].
                       getService(Components.interfaces.nsIXULChromeRegistry);
  let currentLocale = chromeRegistry.getSelectedLocale("global");
  if (currentLocale != "en-US" && currentLocale != "en-GB") {
    document.getElementById("extra-trademark").hidden = true;
  }
//@line 86 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/aboutDialog.js"

//@line 90 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/aboutDialog.js"

//@line 96 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/aboutDialog.js"
}


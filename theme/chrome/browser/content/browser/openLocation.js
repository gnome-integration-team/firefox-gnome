//@line 41 "/builddir/build/BUILD/firefox-4.0.1/mozilla-2.0/browser/base/content/openLocation.js"

var browser;
var dialog = {};
var pref = null;
try {
  pref = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefBranch);
} catch (ex) {
  // not critical, remain silent
}

Components.utils.import("resource:///modules/openLocationLastURL.jsm");

function onLoad()
{
  dialog.input         = document.getElementById("dialog.input");
  dialog.open          = document.documentElement.getButton("accept");
  dialog.openWhereList = document.getElementById("openWhereList");
  dialog.openTopWindow = document.getElementById("currentWindow");
  dialog.bundle        = document.getElementById("openLocationBundle");

  if ("arguments" in window && window.arguments.length >= 1)
    browser = window.arguments[0];
   
  dialog.openWhereList.selectedItem = dialog.openTopWindow;

  if (pref) {
    try {
      var useAutoFill = pref.getBoolPref("browser.urlbar.autoFill");
      if (useAutoFill)
        dialog.input.setAttribute("completedefaultindex", "true");
    } catch (ex) {}

    try {
      var value = pref.getIntPref("general.open_location.last_window_choice");
      var element = dialog.openWhereList.getElementsByAttribute("value", value)[0];
      if (element)
        dialog.openWhereList.selectedItem = element;
      dialog.input.value = gOpenLocationLastURL.value;
    }
    catch(ex) {
    }
    if (dialog.input.value)
      dialog.input.select(); // XXX should probably be done automatically
  }

  doEnabling();
}

function doEnabling()
{
    dialog.open.disabled = !dialog.input.value;
}

function open()
{
  var url;
  var postData = {};
  if (browser)
    url = browser.getShortcutOrURI(dialog.input.value, postData);
  else
    url = dialog.input.value;

  try {
    // Whichever target we use for the load, we allow third-party services to
    // fixup the URI
    switch (dialog.openWhereList.value) {
      case "0":
        browser.loadURI(url, null, postData.value, true);
        break;
      case "1":
        window.opener.delayedOpenWindow(getBrowserURL(), "all,dialog=no",
                                        url, postData.value, null, null, true);
        break;
      case "3":
        browser.delayedOpenTab(url, null, null, postData.value, true);
        break;
    }
  }
  catch(exception) {
  }

  if (pref) {
    gOpenLocationLastURL.value = dialog.input.value;
    pref.setIntPref("general.open_location.last_window_choice", dialog.openWhereList.value);
  }

  // Delay closing slightly to avoid timing bug on Linux.
  window.close();
  return false;
}

function createInstance(contractid, iidName)
{
  var iid = Components.interfaces[iidName];
  return Components.classes[contractid].createInstance(iid);
}

const nsIFilePicker = Components.interfaces.nsIFilePicker;
function onChooseFile()
{
  try {
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, dialog.bundle.getString("chooseFileDialogTitle"), nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterHTML | nsIFilePicker.filterText |
                     nsIFilePicker.filterAll | nsIFilePicker.filterImages | nsIFilePicker.filterXML);

    if (fp.show() == nsIFilePicker.returnOK && fp.fileURL.spec && fp.fileURL.spec.length > 0)
      dialog.input.value = fp.fileURL.spec;
  }
  catch(ex) {
  }
  doEnabling();
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Original code:
 * browser/components/preferences/in-content/preferences.js */

"use strict";

addEventListener("DOMContentLoaded", function onLoad() {
  removeEventListener("DOMContentLoaded", onLoad);
  init_all();
});

function init_all() {
  let categories = document.getElementById("categories");
  categories.addEventListener("select", event => gotoPref(event.target.value));

  gotoPref("paneGeneral");
}

function gotoPref(page) {
  window.history.replaceState(page, document.title);
  search(page, "data-category");
}

function search(aQuery, aAttribute) {
  let elements = document.getElementById("mainPrefPane").children;
  for (let element of elements) {
    let attributeValue = element.getAttribute(aAttribute);
    element.hidden = (attributeValue != aQuery);
  }
}

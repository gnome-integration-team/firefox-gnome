# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
import datetime

start_time = 0

def start_timer():
    global start_time
    start_time = int(round(time.time()*1000))

def log(operation=None, message=None, timestamp=True):
    current_time = int(round(time.time()*1000))
    d = datetime.timedelta(milliseconds=current_time-start_time)
    m = d.seconds // 60
    s = d.seconds - (m * 60)
    ms = d.microseconds//10000
    timestamp = "{:02}:{:02}.{:02}".format(m, s, ms)
    if operation:
        print("{}  {:^15s} {}".format(timestamp, operation, message))
    else:
        print("{}  {}".format(timestamp, message))


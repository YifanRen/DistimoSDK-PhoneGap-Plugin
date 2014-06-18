/*
* Copyright (c) 2013 BlackBerry Limited
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

module.exports = {
	start: function(success, fail, args, env) {
		var error,
			result = new PluginResult(args, env);

		args = JSON.parse(decodeURIComponent(args["input"]));
		if (args.sdkKey) {
			error = distimo.start(args.sdkKey);
		}

		if (error) {
			result.error(error, false);
		} else {
			result.ok(true, false);
		}
	},

	version: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		result.ok(distimo.getVersion(), false);
	},

	logUserRegistered: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		distimo.logUserRegistered();
		result.ok(true, false);
	},

	logExternalPurchaseWithCurrency: function(success, fail, args, env) {

	},

	logBannerClick: function(success, fail, args, env) {

	},

	setUserID: function(success, fail, args, env) {

	},

	openAppLink: function(success, fail, args, env) {

	}
};

var distimo = (function() {
	var VERSION = "2.6",
		kDistimo = "Distimo",
		kUserRegistered = "UserRegistered";
		kStoredEvents = "StoredEvents";

	var publicKey, privateKey, uuid, imei, backgroundMode;

	var debugLogger = (function() {
		return {
			var logs = [];
			
			var add = function(str) {
				logs[logs.length] = str;
			}
			var append = function(str) {
				logs[log.length - 1] = logs[log.length - 1] + " " + str;
			}
		}
	})();

	var Event = function(name, params, postData) {
		this.name = name;
		this.params = params; // id, timestamp, checksum, bundleID, appVersion, sdkVersion
		this.postData = postData;
	};

	var eventManager = (function() {
		var INITIAL_DELAY = 1000,
			MAX_DELAY = 32000;

		var delay = INITIAL_DELAY,
			busy = false,
			queue = new Array();

		function nextEvent() {
			if (queue.length > 0) {
				var event = queue.shift();
				// send to https://a.distimo.mobi/e/
				// callback to timeout(delay, nextEvent())
			} else {
				busy = false;
			}
		}

		function queueEvent(event) {
			queue[queue.length] = event;

			if (!busy) {
				busy = true;
				nextEvent();
			}
		}

		function storeEvent(event) {

		}

		return {
			logEvent: function(event) {
				// if (backgroundMode) {
				// 	storeEvent(event);
				// } else {
					queueEvent(event);
				// }
			}
		};
	})();

	var storageManager = (function() {
		var getStorage = function() {
			if (window.localStorage) {
				if (!window.localStorage.getItem(kDistimo)) {
					window.localStorage.setItem(kDistimo, { kStoredEvents: {} });
				}
				return window.localStorage.getItem(kDistimo);
			} else {
				return false;
			}
		}

		return {
			set: function(key, value) {
				var distimoStorage = getStorage();
				if (distimoStorage) {
					distimoStorage[key] = value;
					window.localStorage.setItem(kDistimo, distimoStorage);
				}
			},

			get: function(key) {
				var distimoStorage = getStorage();
				if (distimoStorage) {
					return distimoStorage[key];
				}
			}
		};
	})();

	return {
		debug: function () {
			var str = "";
			for (var i = 0; i < debugLogger.logs.length; i ++) {
				str += debugLogger.logs[i] + "<br />";
			}
			str += "Public Key: " + publicKey + "<br />";
			str += "Private Key: " + privateKey + "<br />";
			str += "UUID: " + uuid + "<br />";
			str += "IMEI: " + imei + "<br />";

			return str;
		},

		start: function(sdkKey) {
			debugLogger.add("start(" + sdkKey + ")");

			var error;

			// public key, private key
			if (sdkKey.length > 12) {
				publicKey = sdkKey.substring(0, 4);
				privateKey = sdkKey.substring(4);
			} else {
				error = "Please provide a valid SDK Key, you can create one at https://analytics.distimo.com/settings/sdk.";
			}
			
			// UUID
			uuid = Utility.getUUID();
			if (!uuid) {
				error = "Unable to retrieve device pin.";
			}

			// device ID
			imei = Utility.getIMEI();
			if (!imei) {
				error = "Unable to retrieve IMEI number.";
			}

			// TODO: listen to application events
			//
			// cordova.addDocumentEventHandler("pause");
			// cordova.addDocumentEventHandler("resume");
			//
			// document.addEventListener("pause", function() {
			// 	backgroundMode = true;
			// });
			// document.addEventListener("resume", function() {
			// 	backgroundMode = false;
			// });
			backgroundMode = false;
			
			// TODO: uncaught exception handler
			
			if (error) {
				debugLogger.append("fail");
			} else {
				debugLogger.append("success");
			}
			return error;
		},

		getVersion: function() {
			debugLogger.add("getVersion()");
			return VERSION;
		},

		logUserRegistered: function() {
			debugLogger.add("logUserRegistered");

			var registered = storageManager.get(kUserRegistered) === true;

			if (!registered) {
				var registeredEvent = new Event(kUserRegistered, null, null);
				eventManager.logEvent(registeredEvent);
				storageManager.set(kUserRegistered, true);
				dubugLogger.append("registered");
				
			} else {
				debugLogger.append("already exists");
			}
		}


	};
})();



// -- Utility Functions -- //

Utility = {
	getUUID: function() {
		var str = "";
		try {
			str = window.qnx.webplatform.device.devicePin;
			// TODO: encrypt or hash
		} catch (e) {
			return null;
		}
		return str;
	},

	getIMEI: function() {
		var str = "";
		try {
			str = window.qnx.webplatform.device.IMEI;
			// TODO: encrypt or hash
		} catch (e) {
			return null;
		}
		return str;
	}
};

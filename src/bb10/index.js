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
	debug: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		result.ok(distimo.debug(), false);
	},

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
		args = JSON.parse(decodeURIComponent(args["input"]));
		distimo.logUserRegistered(args.callIdentifier);
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
		DEBUG = true,
		kDistimo = "Distimo",
		kUserRegistered = "UserRegistered",
		kStoredEvents = "StoredEvents";

	var publicKey, privateKey, uuid, imei, backgroundMode;

	var debugLogger = (function() {
		var logs = [];

		return {
			getLogs: function() {
				return logs;
			},
			
			add: function(str) {
				if (DEBUG) {
					logs[logs.length] = str;
				}
			},
			
			append: function(str) {
				if (DEBUG) {
					logs[logs.length - 1] = logs[logs.length - 1] + "->" + str;
				}
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
			queue = [];

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
			debug: function() {
				if (DEBUG) {
					var str = "";
					for (var i = 0; i < queue.length; i ++) {
						str += i + ": " + queue[i].name + "\n";
					}
					return str;
				}
			},

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
				var distimoStorage = window.localStorage.getItem(kDistimo);
				if (!distimoStorage) {
					distimoStorage = { kStoredEvents: {} };
					window.localStorage.setItem(kDistimo, distimoStorage);
				}
				return distimoStorage;
			} else {
				return false;
			}
		}

		return {
			debug: function() {
				if (DEBUG) {
					var distimoStorage = getStorage();
					if (distimoStorage) {
						return JSON.stringify(distimoStorage, null, 4);
					}
				}
			},

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
		debug: function() {
			if (DEBUG) {
				var str = "";

				var logs = debugLogger.getLogs();
				if (logs.length > 0) {
					str += "\n\n********** Logs **********\n"
					for (var i = 0; i < logs.length; i ++) {
						str += logs[i] + "\n";
					}
					str += "**************************\n\n\n"
				}
				
				if (publicKey) {
					str += "Public Key: " + publicKey + "\n";
				}

				if (privateKey) {
					str += "Private Key: " + privateKey + "\n";
				}

				if (uuid) {
					str += "UUID: " + uuid + "\n";
				}

				if (imei) {
					str += "IMEI: " + imei + "\n";
				}

				str += "\n\n******* Event Queue *******\n"
				str += eventManager.debug() + "\n";
				str += "**************************\n\n\n"

				str += "\n\n****** Local Storage ******\n"
				str += storageManager.debug() + "\n";
				str += "**************************\n\n\n"

				return str;
			}
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

		logUserRegistered: function(callIdentifier) {
			debugLogger.add("logUserRegistered(" + callIdentifier + ")");

			var registered = storageManager.get(kUserRegistered) === true;

			if (!registered) {
				var registeredEvent = new Event(kUserRegistered + callIdentifier, null, null);
				eventManager.logEvent(registeredEvent);
				storageManager.set(kUserRegistered, true);
				debugLogger.append("registered");

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

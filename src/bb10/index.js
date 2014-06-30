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
		distimo.logUserRegistered();
		result.ok(true, false);
	},

	logExternalPurchaseWithCurrency: function(success, fail, args, env) {
		// var result = new PluginResult(args, env);
		// args = JSON.parse(decodeURIComponent(args["input"]));
		// distimo.logExternalPurchaseWithCurrency(args.productID, args.currencyCode, args.price, args.quantity);
		// result.ok(true, false);
	},

	logBannerClick: function(success, fail, args, env) {
		// var result = new PluginResult(args, env);
		// args = JSON.parse(decodeURIComponent(args["input"]));
		// distimo.logBannerClick(args.publisher);
		// result.ok(true, false);
	},

	setUserID: function(success, fail, args, env) {
		// var result = new PluginResult(args, env);
		// args = JSON.parse(decodeURIComponent(args["input"]));
		// distimo.setUserID(args.userID);
		// result.ok(true, false);
	},

	openAppLink: function(success, fail, args, env) {
		// var result = new PluginResult(args, env);
		// args = JSON.parse(decodeURIComponent(args["input"]));
		// distimo.openAppLink(args.applinkHandle, args.campaignHandle);
		// result.ok(true, false);
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
		var self = this;

		self.name = name; // An event must have a name
		self.params = params; // { id, timestamp, checksum, bundleID, appVersion, sdkVersion }
		self.postData = postData;

		// self.bundleID = 
		// self.appVersion = 
		self.sdkVersion = VERSION;
		self.timestamp = new Date().getTime();

		self.urlParamString = function() {
			var result = self.urlParamPayload();
			result += "&ct=" + new Date().getTime();
			// result += "&cs=" + // get checksum
		};

		self.urlParamPayload = function() {
			var result = "en=" + self.name;
			
			result += "&lt=" + self.timestamp;
			// result += "&av=" + self.appVersion;
			result += "&sv=" + self.sdkVersion;
			// result += "&bu=" + self.bundleID;
			result += "&oi=" + publicKey;
			result += "&uu=" + uuid;
			result += "&hu=" + imei;
			// result += "&es=" + "a";
			// result += "&ep=" + // encode all params

			return result;
		};
	};

	var eventManager = (function() {
		var INITIAL_DELAY = 1000,
			MAX_DELAY = 32000;

		var delay = INITIAL_DELAY,
			busy = false,
			queue = [];

		function nextEvent() {
			if (queue.length > 0) {
				var event = queue[0];

				var xhr = new XMLHttpRequest();
				xhr.open("POST", "https://a.distimo.mobi/e/", true);
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.onreadystatechange = function() {
					if(xhr.readyState == 4) {
						if (xhr.status == 200) {
							queue.shift();
							delay = INITIAL_DELAY;
							setTimeout(nextEvent, delay);
						} else {
							if (delay < MAX_DELAY) {
								delay *= 2;
							}
							setTimeout(nextEvent, delay);
						}
					}
				};
				//xhr.send(event);
			} else {
				busy = false;
			}
		}

		function queueEvent(event) {
			if (event) {
				queue[queue.length] = event;
			}

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
		var defaultStorage = JSON.stringify({ kStoredEvents: {} });

		var getStorage = function() {
			if (window.localStorage) {
				var item = window.localStorage.getItem(kDistimo);
				if (item) {
					return JSON.parse(item);
				} else {
					window.localStorage.setItem(kDistimo, defaultStorage);
					return JSON.parse(defaultStorage);
				}
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

			clear: function() {
				window.localStorage.setItem(kDistimo, defaultStorage);
			},

			set: function(key, value) {
				var distimoStorage = getStorage();
				if (distimoStorage) {
					distimoStorage[key] = value;
					window.localStorage.setItem(kDistimo, JSON.stringify(distimoStorage));
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

			if (DEBUG) {
				storageManager.clear();
			}
			
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
			debugLogger.add("logUserRegistered()");

			var registered = storageManager.get(kUserRegistered) === true;

			if (!registered) {
				var registeredEvent = new Event(kUserRegistered, null, null);
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

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

var _config = require("./../../lib/config"),
	_appEvents = require("./../../lib/events/applicationEvents");

module.exports = {
	debug: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		result.ok(distimo.debug(), false);
	},

	start: function(success, fail, args, env) {
		var error,
			result = new PluginResult(args, env);

		var sdkKey = JSON.parse(decodeURIComponent(args[0]));
		if (sdkKey) {
			error = distimo.start(sdkKey);
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
		var result = new PluginResult(args, env);

		// args = [productID, currencyCode, price, quantity];
		var productID = JSON.parse(decodeURIComponent(args[0])),
		    currencyCode = JSON.parse(decodeURIComponent(args[1])),
		    price = JSON.parse(decodeURIComponent(args[2])),
		    quantity = JSON.parse(decodeURIComponent(args[3]));

		distimo.logExternalPurchaseWithCurrency(productID, currencyCode, price, quantity);
		result.ok(true, false);
	},

	logBannerClick: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		var publisher = JSON.parse(decodeURIComponent(args[0]));
		distimo.logBannerClick(publisher);
		result.ok(true, false);
	},

	setUserID: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		var userID = JSON.parse(decodeURIComponent(args[0]));
		distimo.setUserID(userID);
		result.ok(true, false);
	},

	openAppLink: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		var applinkHandle = JSON.parse(decodeURIComponent(args[0])),
		    campaignHandle = JSON.parse(decodeURIComponent(args[1]));
		var callback = function (error) {
			if (error) {
				result.error(error, false);
			} else {
				result.ok(true, false);
			}
		};
		distimoJS.getInstance().openAppLink( result.callbackId, applinkHandle, campaignHandle, callback);
	}
};

var distimo = (function() {
	var VERSION = "2.6",
		DEBUG = true,
		kDistimo = "Distimo",
		kUserRegistered = "UserRegistered",
		kExternalPurchase = "ExternalPurchase",
		kBannerClick = "BannerClick",
		kUserID = "UserID",
		kStoredEvents = "StoredEvents";

	var publicKey, privateKey, uuid, imei;

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
		};
	})();

	var Event = function(name, params, postData) {
		var self = this;

		// self.id required?
		self.name = name; // An event must have a name
		self.params = params;
		self.postData = postData;

		self.bundleID = _config.id;
		self.appVersion = _config.version;
		self.sdkVersion = VERSION;
		self.timestamp = new Date().getTime();

		self.encodedParams = encodeURIComponent((function() { // encodeURI? encodeURIComponent?
			var result = "";
			for (var key in self.params) {
				var value = encodeURIComponent(self.params[key]);
				key = encodeURIComponent(key);
				if (result.length > 0) {
					result += ";";
				}
				result += key + "=" + value;
			}
			
			return result;
		})());

		self.urlParamPayload = (function() {
			var result = "en=" + self.name;
			
			result += "&lt=" + self.timestamp;
			result += "&av=" + self.appVersion;
			result += "&sv=" + self.sdkVersion;
			result += "&bu=" + self.bundleID;
			result += "&oi=" + publicKey;
			result += "&uu=" + uuid;
			result += "&hu=" + imei;
			result += "&es=" + "b"; // ask Distimo team for this
			result += "&ep=" + self.encodedParams;

			return result;
		})();

		self.checksum = (function() {
			var getPayload = Utility.md5(self.urlParamPayload);
			
			var payload;
			if (self.postData) {
				var postPayload = Utility.md5(self.postData);
				payload = Utility.md5(getPayload + postPayload);
			} else {
				payload = getPayload;
			}
			
			return Utility.md5(payload + privateKey);
		})();

		self.urlParamString = function() {
			var result = self.urlParamPayload;
			result += "&ct=" + new Date().getTime();
			result += "&cs=" + self.checksum;
			return result;
		};
	};

	var eventManager = (function() {
		var INITIAL_DELAY = 1000,
			MAX_DELAY = 32000;

		var delay = INITIAL_DELAY,
			busy = false,
			backgroundMode = false;

		_appEvents.addEventListener("inactive", function() {
			backgroundMode = true;
		});

		_appEvents.addEventListener("active", function() {
			backgroundMode = false;
			trigger();
		});

		function sendEvent() {
			var storedEvents = storageManager.get(kStoredEvents);
			if (!backgroundMode && storedEvents !== undefined && storedEvents.length > 0) {
				var event = storedEvents[0];
				var urlString = "https://a.distimo.mobi/e/?" + event.urlParamString();

				var xhr = new XMLHttpRequest();
				xhr.open("POST", urlString, true);
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.onreadystatechange = function() {
					if(xhr.readyState == 4) {
						if (xhr.status == 200) {
							dequeueEvent();
							delay = INITIAL_DELAY;
							setTimeout(sendEvent, delay);
						} else {
							if (delay < MAX_DELAY) {
								delay *= 2;
							}
							setTimeout(sendEvent, delay);
						}
					}
				};
				// debugLogger.add("POST: " + urlString);
				// xhr.send(postData);
			} else {
				busy = false;
			}
		}

		function enqueueEvent(event) {
			if (event) {
				var storedEvents = storageManager.get(kStoredEvents);
				if (storedEvents !== undefined) {
					storedEvents[storedEvents.length] = event;
					storageManager.set(kStoredEvents, storedEvents);
				}
			}
		}

		function dequeueEvent() {
			var storedEvents = storageManager.get(kStoredEvents);
			if (storedEvents !== undefined && storedEvents.length > 0) {
				storedEvents.shift();
				storageManager.set(kStoredEvents, storedEvents);
			}
		}

		function trigger() {
			if (!busy) {
				busy = true;
				sendEvent();
			}
		}

		return {
			debug: function() {
				if (DEBUG) {
					var storedEvents = storageManager.get(kStoredEvents);
					if (storedEvents !== undefined) {
						var str = "";
						for (var i = 0; i < storedEvents.length; i ++) {
							str += i + ": " + storedEvents[i].name + "\n";
						}
						return str;
					}
				}
			},

			logEvent: function(event) {
				enqueueEvent(event);

				if (!backgroundMode) {
					trigger();	
				}
			}
		};
	})();

	var storageManager = (function() {
		var defaultStorage = {};
		defaultStorage[kStoredEvents] = [];
		defaultStorage = JSON.stringify(defaultStorage);

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

				if (_config) {
					str += "ID: " + _config.id + "\n";
					str += "Version: " + _config.version + "\n";
				}

				str += "MD5(hello): " + Utility.md5("hello") + "\n";
				
				str += "\n\n******* Event Queue *******\n";
				str += eventManager.debug() + "\n";
				str += "**************************\n\n\n";

				str += "\n\n****** Local Storage ******\n";
				str += storageManager.debug() + "\n";
				str += "**************************\n\n\n";

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

			if (DEBUG) {
				// storageManager.clear();
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
		},

		logExternalPurchaseWithCurrency: function(productID, currency, price, quantity) {
			debugLogger.add("logExternalPurchaseWithCurrency(" + productID + ", " + currency + ", " + price + ", " + quantity + ")");

			var params = {};
			params["productID"] = productID;
			params["currency"] = currency;
			params["price"] = price;
			params["quantity"] = quantity;

			var purchaseEvent = new Event(kExternalPurchase, params, null);
			eventManager.logEvent(purchaseEvent);

			debugLogger.append("sent");
		},

		logBannerClick: function(publisher) {
			debugLogger.add("logBannerClick(" + publisher + ")");

			var bannerEvent = new Event(kBannerClick, {"publisher": publisher}, null);
			eventManager.logEvent(bannerEvent);

			debugLogger.append("sent");
		},

		setUserID: function(newUserID) {
			debugLogger.add("setUserID(" + newUserID + ")");

			var isStringEmpty = function(str) {
				return (!newUserID || newUserID.length === 0);
			};

			if (isStringEmpty(newUserID)) {
				debugLogger.append("empty");
				return;
			}

			var storedUserID = storageManager.get(kUserID);

			if (isStringEmpty(storedUserID) || newUserID != storedUserID) {
				var userIDEvent = new Event(kUserID, {"id" : newUserID}, null);
				eventManager.logEvent(userIDEvent);
				storageManager.set(kUserID, newUserID);
				debugLogger.append("new user id set");

			} else {
				debugLogger.append("already set as " + newUserID);
			}
		}
	};
})();


///////////////////////////////////////////////////////////////////
// JavaScript wrapper for JNEXT plugin for connection
///////////////////////////////////////////////////////////////////

JNEXT.distimoJS = function () {
	var self = this,
		hasInstance = false;

	self.getId = function () {
		return self.m_id;
	};

	self.init = function () {
		if (!JNEXT.require("libDistimo")) {
			return false;
		}

		self.m_id = JNEXT.createObject("libDistimo.DistimoJS");

		if (self.m_id === "") {
			return false;
		}

		JNEXT.registerEvents(self);
	};

	self.redirecting = false;

	self.openAppLink = function(callbackId, applinkHandle, campaignHandle, callback){

		// Only one redirect simultaneously
		if (self.redirecting) {
			return;
		}
		self.redirecting = true;

		var applkUri = "http://app.lk/" + applinkHandle + "/redirect";
		if (campaignHandle) {
			applkUri = applkUri + "?x=" + campaignHandle;
		}

		var userAgent = navigator.userAgent;
		var args = {userAgent: userAgent, applkUri: applkUri };
		var appId = JNEXT.invoke(self.m_id, "openAppLink " + callbackId + " " +  JSON.stringify(args));

		var request;

		if (appId) {
			var appworldUri = "appworld://content/" + appId;
			request = {target:'sys.appworld', action:'bb.action.OPEN', uri: appworldUri};
		} else {
			// here we fail to get app world uri; in this case, open appLink uri in browser and
			// page will be redirected & app world will be invoked.
			request = {target:'sys.browser', action:'bb.action.OPEN', uri: applkUri};
		}
		window.qnx.webplatform.getApplication().invocation.invoke(request, callback);

		self.redirecting = false;

	};

	// ************************
	// End of methods to edit
	// ************************
	self.m_id = "";

	self.getInstance = function () {
		if (!hasInstance) {
			hasInstance = true;
			self.init();
		}
		return self;
	};

};

distimoJS = new JNEXT.distimoJS();

// -- Utility Functions -- //

Utility = {
	gseCrypto: null,

	getUUID: function() {
		var str = "";
		try {
			str = window.qnx.webplatform.device.devicePin;
		} catch (e) {
			return null;
		}
		return Utility.md5(str);
	},

	getIMEI: function() {
		var str = "";
		try {
			str = window.qnx.webplatform.device.IMEI;
		} catch (e) {
			return null;
		}
		return Utility.md5(str);
	},

	md5: function(str) {
		if (this.gseCrypto === null) {
			this.gseCrypto = new JNEXT.GSECrypto();
		}

		var input = {
				"alg" : "md5",
				"input" : {
					"b64" : btoa(str)
				}
			};
		var output = this.gseCrypto.getInstance().hash(null, input);
		output = JSON.parse(output);
		return output["output"]["hex"];
	}
};

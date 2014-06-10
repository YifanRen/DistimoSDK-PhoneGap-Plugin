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
			result.ok(distimo.debugString(), false);
		}
	},

	version: function(success, fail, args, env) {
		var result = new PluginResult(args, env);
		result.ok(distimo.getVersion(), false);
	},

	logUserRegistered: function(success, fail, args, env) {

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
	var VERSION = "2.6";

	var publicKey, privateKey, uuid, imei, eventManager;

	return {
		debugString: function () {
			return "new: " + publicKey + " " + privateKey + " " + uuid + " " + imei;
		},

		start: function(sdkKey) {
			// public key, private key
			if (sdkKey.length <= 12) {
				return "Please provide a valid SDK Key, you can create one at https://analytics.distimo.com/settings/sdk.";
			}
			publicKey = sdkKey.substring(0, 4);
			privateKey = sdkKey.substring(4);
			
			// UUID
			uuid = Utility.getUUID();
			if (!uuid) {
				return "Unable to retrieve device pin.";
			}

			// device ID
			imei = Utility.getIMEI();
			if (!imei) {
				return "Unable to retrieve IMEI number.";
			}
			
			// event manager
			eventManager = new EventManager();

			// uncaught exception handler
			
			return;
		},

		getVersion: function() {
			return VERSION;
		},

		logUserRegistered: function() {
			// Get UUID
			// Then log "UserRegistered"
		}
	};
})();



// - Event Manager -- //

// An event: id, name, params, postData, timestamp, checksum, bundleID, appVersion, sdkVersion	

EventManager = function() {
	var INITIAL_DELAY = 1000,
		MAX_DELAY = 32000;

	var delay = INITIAL_DELAY,
		eventQueue = [];

	function queueEvent(event) {
		
	}

	function storeEvent(event) {

	}

	return {
		logEvent: function(event) {
			var isApplicationActive = true;
			if (isApplicationActive) {
				queueEvent(event);
			} else {
				storeEvent(event);
			}
		}
	};
};



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

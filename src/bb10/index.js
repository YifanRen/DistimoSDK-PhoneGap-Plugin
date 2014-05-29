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

var distimo;

module.exports = {
	start: function (success, fail, args, env) {
		var success = false,
			result = new PluginResult(args, env);

		args = JSON.parse(decodeURIComponent(args["input"]));
		if (args.sdkKey) {
			success = distimo.createInstance(args.sdkKey);
		}

		if (success) {
			result.ok(distimo.getInstance().sdkKey, false);
		} else {
			result.error("Please provide a valid SDK Key, you can create one at https://analytics.distimo.com/settings/sdk.", false);
		}
	},

	version: function (success, fail, args, env) {
		var result = new PluginResult(args, env);
		result.ok(distimo.getInstance().getVersion(), false);
	},

	logUserRegistered: function (success, fail, args, env) {

	},

	logExternalPurchaseWithCurrency: function (success, fail, args, env) {

	},

	logBannerClick: function (success, fail, args, env) {

	},

	setUserID: function (success, fail, args, env) {

	},

	openAppLink: function (success, fail, args, env) {

	}
};

Distimo = function () {
	var self = this,
		hasInstance = false,
		VERSION = "2.6";

	self.publicKey = "";
	self.privateKey = "";
	self.eventManager = null;


	// -- Lifespan -- //

	// Note: consider using getInstance + init for more apparent singleton structure.

	self.createInstance = function (sdkKey) {
		if (!hasInstance) {
			// public key, private key
			self.publicKey = sdkKey.substring(0, 4);
			self.privateKey = sdkKey.substring(4);
			
			// UUID
			
			// device ID
			
			// event manager
			self.eventManager = new EventManager();

			// uncaught exception handler
			
			// Mark instantiated
			hasInstance = true;
			return true;
		}
		return false;
	}

	self.getInstance = function () {
		if (hasInstance) {
			return self;
		}
		return null;
	};


	// -- Version Info -- //

	self.getVersion = function () {
		return VERSION;
	};


	// -- Event Calls -- //

	self.logUserRegistered = function () {
		// Get UUID
		// Then log "UserRegistered"
	}

};

distimo = new Distimo();


// - Event -- //

Event = function (args) {
	// To be filled; requires: id, name, params, postData, timestamp, checksum, bundleID, appVersion, sdkVersion
};

EventManager = function () {
	var self = this,
		hasInstance = false,
		INITIAL_DELAY = 1000,
		MAX_DELAY = 32000;

	self.delay = INITIAL_DELAY;
	self.eventQueue = [];

	// TODO: sort out public & private methods, and apply closure

	self.sendEvent = function (event) {

	}

	self.storeEvent = function (event) {

	}
};

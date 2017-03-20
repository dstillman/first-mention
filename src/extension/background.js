/*
 * Copyright © 2016-2017 Dan Stillman
 * https://github.com/dstillman/first-mention
 *
 * First Mention is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import FirstMention from "./firstMention";
//import Cache from "./cache";
import handleContentMessage from "./handleContentMessage";

if (FirstMention.cacheEnabled) {
	FirstMention.cache = new Cache();
}

//
// Set up listeners for messages from content code
//
if (FirstMention.isBrowserExt) {
	// Open tab on first run
	function handleInstalled(details) {
		if (details.reason == 'install') {
			chrome.tabs.create({
				url: chrome.runtime.getURL('installed.html')
			});
		}
	}
	chrome.runtime.onInstalled.addListener(handleInstalled);
	
	// Main message listener
	chrome.runtime.onMessage.addListener(handleContentMessage);
}
else if (FirstMention.isSafari) {
	// Open tab on first run
	if (!safari.extension.settings.hasRun) {
		safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + 'installed.html';
		safari.extension.settings.hasRun = true;
	}
	
	// Main message listener
	safari.application.addEventListener("message", function (event) {
		var request = {
			event: event.name,
			data: event.message
		};
		var sender = {
			tab: {
				id: null
			},
			url: null
		};
		handleContentMessage(
			request,
			sender,
			function sendResponse(data) {
				event.target.page.dispatchMessage(event.name + "Response", data);
			}
		);
	}, false);
}

//
// Manage page cache
//
if (FirstMention.cacheEnabled) {
	if (FirstMention.isBrowserExt) {
		chrome.tabs.onRemoved.addListener(function (tabID, removeInfo) {
			FirstMention.cache.purgeTab(tabID);
		});
	}
	else if (FirstMention.isSafari) {
		// TODO
	}
}

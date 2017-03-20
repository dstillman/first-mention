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
import Utils from "./utils";

/**
 * Handle a message from the content code
 */
export default function (request, sender, sendResponse) {
	console.log(request.event + " called");
	
	// Add page text to cache
	if (request.event == 'textExtracted') {
		FirstMention.cache.addPage(sender.tab.id, sender.url, request.data.text);
	}
	// Handle a click on a word
	else if (request.event == 'textClicked') {
		console.log("Text clicked");
		console.log(request.data.nodeText);
		let obj = Utils.getCapitalizedWordAtOffset(request.data.nodeText, request.data.nodeOffset);
		sendResponse(obj || {});
	}
	else if (request.event == 'findText') {
		// Remove partial clicked word from page text before
		let before = request.data.pageTextBefore
			.substr(0, request.data.pageTextBefore.length - request.data.wordOffset);
		
		// First look in previous text on the current page
		let matches = Utils.findTextInContext(request.data.text, before, request.data.after);
		console.log("Matches");
		console.log(matches);
		
		// If not found, check previous pages
		if (!matches && FirstMention.cacheEnabled) {
			console.log("Checking previous pages");
			let t = new Date();
			let matches = FirstMention.cache.findText(
				sender.tab.id,
				sender.url,
				request.data.text,
				before,
				request.data.context,
				request.data.after
			);
			console.log((new Date() - t) + " ms")
		}
		
		console.log("Sending response");
		sendResponse(matches ? matches[0] : null);
	}
	else if (request.event == 'closeTab') {
		safari.application.activeBrowserWindow.activeTab.close();
	}
}

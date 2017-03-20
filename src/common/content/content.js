/*
 * Copyright © 2016-2017 Dan Stillman
 * https://github.com/dstillman/first-mention
 *
 * First Mention is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import FirstMention from "../background/firstMention";
import ContentUtils from "./contentUtils";
/* IF_BOOKMARKLET
import handleContentMessage from "../background/handleContentMessage"
IF_BOOKMARKLET */

if (FirstMention.isSafari && FirstMention.isExtension) {
	// Every message used should be defined here, with a "Response" suffix
	var _messageCallbacks = {
		textClickedResponse: null,
		findTextResponse: null
	};
	
	// Listen for *Response messages from the background page and call the respective callback
	safari.self.addEventListener("message", function (event) {
		if (_messageCallbacks[event.name]) {
			_messageCallbacks[event.name](event.message);
			_messageCallbacks[event.name] = null;
		}
	}, false);
}


function sendMessage(name, data) {
	console.log("Calling " + name);
	
	if (FirstMention.isExtension) {
		if (FirstMention.isFirefox) {
			// WebExtensions support promises natively
			return browser.runtime.sendMessage({
				event: name,
				data
			});
		}
		else if (FirstMention.isBrowserExt) {
			// Fake a promise in Chrome
			return new Promise(function (resolve, reject) {
				chrome.runtime.sendMessage(
					{
						event: name,
						data
					},
					resolve
				);
			});
		}
		else if (FirstMention.isSafari) {
			let promise = new Promise(function (resolve, reject) {
				// If message supports a response, set resolve handler to response callback
				if (_messageCallbacks[name + "Response"] !== undefined) {
					_messageCallbacks[name + "Response"] = resolve;
				}
				else {
					resolve();
				}
			});
			safari.self.tab.dispatchMessage(name, data);
			return promise;
		}
	}
	else if (FirstMention.isBookmarklet) {
		let request = {
			event: name,
			data
		};
		let sender = {
			tab: {
				id: null
			},
			url: null
		};
		return new Promise(function (resolve, reject) {
			// Run handler directly
			return handleContentMessage(request, sender, resolve);
		});
	}
};

// Extract page text for cache
if (FirstMention.cacheEnabled) {
	sendMessage(
		'textExtracted',
		{
			text: ContentUtils.extractPageText()
		}
	);
}

// Add tooltip CSS to bookmarklet page
if (FirstMention.isBookmarklet) {
	console.log("Initializing bookmarklet");
	
	let link = document.createElement("link");
	link.href = "https://first-mention.s3.amazonaws.com/bookmarklet/first_mention.css";
	link.type = "text/css";
	link.rel = "stylesheet";
	document.getElementsByTagName("head")[0].appendChild(link);
}

async function onClick(event) {
	if (getSelection().toString().length) {
		console.log("Ignoring selection");
		return;
	}
	
	if (event.type == 'touchstart') {
		var x = event.touches[0].clientX;
		var y = event.touches[0].clientY;
	}
	else if (event.type == 'touchend') {
		var x = event.changedTouches[0].clientX;
		var y = event.changedTouches[0].clientY;
	}
	else {
		var x = event.clientX;
		var y = event.clientY;
	}
	
	var { node, offset } = ContentUtils.getNodeAndOffsetAtPoint(x, y) || {};
	if (!node || !offset) {
		return;
	}
	var nodeText = node.textContent;
	if (nodeText.trim() === "") {
		console.log("Ignoring click on empty node");
		return;
	}
	
	let { word, before, after, wordOffset } = await sendMessage(
		'textClicked',
		{
			nodeText,
			nodeOffset: offset
		}
	);
	if (!word) {
		console.log("Ignoring clicked word");
		return;
	}
	
	let foundText = await sendMessage(
		'findText',
		{
			text: word,
			before: before,
			after: after,
			pageTextBefore: ContentUtils.extractPageTextBeforeNodeAndOffset(node, offset),
			wordOffset: wordOffset
		}
	);
	if (foundText) {
		ContentUtils.showPanel(event.pageX, event.pageY, foundText, word);
	}
}

// Add click listener
if (!('ontouchstart' in document.documentElement)) {
	window.addEventListener('click', event => onClick(event), false);
}
else {
	let dragging = false;
	let waiting = false;
	let timeoutID;
	document.body.addEventListener('touchstart', event => dragging = false);
	document.body.addEventListener('touchmove', event => dragging = true);
	document.body.addEventListener('touchend', function (event) {
		// Don't trigger click unless it's been 300 ms since the last tap and 300 ms elapses before
		// another tap
		if (timeoutID || waiting) {
			console.log("Clearing timeout");
			if (timeoutID) {
				clearTimeout(timeoutID);
			}
			timeoutID = setTimeout(() => {
				//console.log("Time is up");
				timeoutID = null;
			}, 300);
			return;
		}
		
		if (dragging) {
			console.log("Ignoring drag");	
			timeoutID = setTimeout(() => {
				//console.log("Drag time is up");
				timeoutID = null;
			}, 1000);
			return;
		}
		
		if (ContentUtils.panelShowing()) {
			console.log("Panel already shown");
			return;
		}
		
		waiting = true;
		setTimeout(() => {
			waiting = false;
			if (timeoutID) {
				console.log("Ignoring multi-tap");
				return;
			}
			console.log("Simulating click");
			onClick(event);
		}, 300);
	});
}

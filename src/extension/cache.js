/*
 * Copyright © 2016-2017 Dan Stillman
 * https://github.com/dstillman/first-mention
 *
 * First Mention is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import Utils from "./utils";

export default function TextCache() {
	var _maxCachedPagesPerTab = 15;
	var _cache = {};
	var _mru = {};
	
	function getBaseURL(url) {
		return url.match(/^[^?]+\??/)[0];
	}
	
	return {
		addPage: function (tabID, url, text) {
			console.log("-");
			console.log(tabID);
			console.log(url);
			console.log(text);
			
			if (!_cache[tabID]) {
				_cache[tabID] = {};
				_mru[tabID] = [];
			}
			
			if (_cache[tabID][url]) {
				console.log(url + " is already cached");
				return;
			}
			
			console.log("==================================");
			console.log(text);
			console.log("==================================");
			
			// TODO: Handle back/forward
			// TODO: Clear after navigating several domains away?
			
			_cache[tabID][url] = text;
			_mru[tabID].push(url);
			while (_mru[tabID].length > _maxCachedPagesPerTab) {
				let clearURL = _mru[tabID].shift();
				console.log("Purging " + clearURL + " from text cache");
				delete _cache[tabID][clearURL];
			}
		},
		
		
		findText: function (tabID, url, text, beforeText, beforeContext, afterText) {
			var matches = [];
			var mru = _mru[tabID];
			var cache = _cache[tabID];
			
			if (cache === undefined) {
				console.log("Text cache not found for tab " + tabID);
				return;
			}
			
			console.log("Cached pages: " + mru.length);
			
			for (let i = 0; i < mru.length - 1; i++) {
				// Skip current page
				if (mru[i] == url) {
					continue;
				}
				// Skip URLs that are different before the query string
				if (getBaseURL(mru[i]) != getBaseURL(url)) {
					console.log("Skipping " + getBaseURL(mru[i]));
					continue;
				}
				
				console.log("Searching cached text from " + mru[i]);
				
				let m = Utils.findTextInContext(
					text,
					beforeText,
					beforeContext,
					afterText,
					cache[mru[i]]
				);
				if (!m) {
					console.log("No matches");
					continue;
				}
				console.log("Context Matches:");
				console.log(m);
				matches = matches.concat(m);
			}
			
			if (matches.length) {
				return matches;
			}
			return [];
		},
		
		
		purgeTab: function (tabID) {
			console.log("Removing page cache for tab " + tabID);
			delete _cache[tabID];
			delete _mru[tabID];
		}
	};
};

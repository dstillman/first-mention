/*
 * **** BEGIN LICENSE BLOCK ****
 *
 * Copyright © 2016-2017 Dan Stillman
 * https://github.com/dstillman/first-mention
 *
 * First Mention is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * **** END LICENSE BLOCK ****
 */

import XRegExp from 'xregexp';
import wordBlacklist from './wordBlacklist';

export default {
	// Should match contentUtils.js
	delimiters: "\\s\.,:;…?!\"'“”‘’«»「」\\-—()[\\]{}\\\\/",
	closingPunctuation: ".…!?\"”»」)\\]}",
	endingPunctuation: ".…!?",
	
	
	/**
	 * Given a string of text and a character offset from the beginning, check if the word at the offset
	 * begins with a capital letter. If so, return the word and the text before and after it.
	 *
	 * @param {string} text
	 * @param {number} offset
	 * @return {object} - Object with 'word', 'before', 'after', and 'wordOffset'
	 */
	getCapitalizedWordAtOffset: function (text, offset) {
		var beforeText = text.substr(0, offset);
		var afterText = text.substr(offset);
		console.log("Before text: " + beforeText);
		console.log("After text: " + afterText);
		
		if (beforeText.endsWith(" ") || afterText.startsWith(" ")) {
			console.log("No word selected");
			return false;
		}
		
		var beforeMatches, afterMatches;
		beforeMatches = beforeText.match(new RegExp(
			"[^" + this.delimiters + "]*$"
		));
		
		afterMatches = afterText.match(new RegExp(
			"^[^" + this.delimiters + "]*"
		));
		
		var word = beforeMatches[0] + afterMatches[0];
		
		if (!word.length) {
			console.log("No word selected");
			return false;
		}
		
		if (!this._isCapitalized(word[0])) {
			console.log("'" + word + "' is not capitalized");
			return false;
		}
		
		if (this._isBlacklisted(word)) {
			console.log(`Ignoring blacklisted word '${word}'`);
			return false;
		}
		
		return {
			word,
			before: beforeText.substr(0, beforeText.length - beforeMatches[0].length),
			after: afterText.substr(afterMatches[0].length),
			wordOffset: beforeMatches[0].length
		};
	},
	
	
	// Should match ContentUtils.getWordPosition()
	getWordPosition: function (text, word) {
		var quotedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		return text.search(new RegExp(quotedWord + '[' + this.delimiters + ']'));
	},
	
	
	/**
	 * Given a word and text before and after, return the sentence containing the first previous
	 * occurrence of the word
	 *
	 * @param {string} searchText - Text to search for (i.e., the capitalized word that was clicked)
	 * @param {string} pageText - Page text to search, up to right before the search text
	 * @param {string} afterText - Node text immediately after the search text, in case the match is in
	 *     the same sentence
	 * @return {String[]}
	 */
	findTextInContext: function (searchText, pageText, afterText) {
		console.log("Cached text:\n\n" + pageText + "\n");
		console.log("Search text: " + searchText);
		
		var pos = this.getWordPosition(pageText, searchText);
		if (pos == -1) {
			console.log("Not found in page");
			return null;
		}
		console.log("Found search text at position " + pos);
		
		var space = '\\s+';
		var spaceRE = new RegExp(space);
		var closingPunctRE = new RegExp("[" + this.closingPunctuation + "]");
		var endPunctRE = new RegExp("[" + this.endingPunctuation + "]");
		var sentenceEndRE = new RegExp("(" + closingPunctRE.source + "+)(?:\\s*$|\\s(?![-–—]))");
		
		// Search backwards to find sentence end
		var start = 0;
		if (pos > 0) {
			// Get position of newline before position, and don't seek before that
			//let min = pos - pageText.substr(0, pos).match(/\n?([^\n]*)$/)[1].length;
			let min = 0;
			start = pos;
			
			let foundCapital = true;
			let foundSpace = false;
			let requireSpace = true;
			let stopOnNewline = false;
			function reset() {
				foundCapital = false;
				foundSpace = false;
			}
			for (let i = pos - 1; i >= min; i--) {
				let char = pageText[i];
				
				// Stop if we encounter multiple newlines in a row without intervening non-space chars
				if (char == "\n") {
					if (stopOnNewline) {
						break;
					}
					stopOnNewline = true;
				}
				
				let isSpace = spaceRE.test(char);
				// If not a space, allow newlines again, because textContent can include newlines
				if (!isSpace) {
					stopOnNewline = false;
				}
				
				if (!foundCapital) {
					if (this._isCapitalized(char)) {
						foundCapital = true;
						start = i;
					}
					else {
						//console.log("Resetting for no capital");
						reset();
					}
					continue;
				}
				
				if (!foundSpace) {
					if (isSpace) {
						foundSpace = true;
					}
					// Ignore leading punctuation before a capital (e.g., quotation marks)
					else if (!this._isAlphaNum(char)) {
						start = i;
						continue;
					}
					// Ignore multiple capital letters in a row
					else if (this._isCapitalized(char)) {
						start = i;
						foundCapital = true;
					}
					else {
						//console.log("Resetting for no space");
						reset();
					}
					continue;
				}
				
				// Continue through strings of capitals
				if (this._isCapitalized(char)) {
					reset();
					foundCapital = true;
					start = i;
					continue;
				}
				
				if (isSpace) {
					continue;
				}
				
				// Stop at periods followed by numeric citations, with or without spaces
				if (char == "]") {
					let remainder = pageText.substr(0, i);
					if (remainder.match(/\. *\[[0-9]+$/)) {
						break;
					}
				}
				
				if (endPunctRE.test(char)) {
					// Check for known abbreviations
					if (char == ".") {
						let remainder = pageText.substr(0, i);
						let abbrLen = this._endsInAbbreviation(remainder);
						if (abbrLen) {
							i -= (abbrLen - 1);
							continue;
						}
						
						if (remainder.length > 2
								&& this._isCapitalized(remainder[remainder.length - 1])
								&& spaceRE.test(remainder[remainder.length - 2])) {
							start = i - 3;
							i = i - 2;
							continue;
						}
					}
					/*if (char == "?") {
						if (i < pos - 1) {
							let str = pageText.substr(i + 1, 3);
							if (/^[’”]+/) {
								reset();
								continue;
							}
						}
					}*/
					break;
				}
				
				if (closingPunctRE.test(char)) {
					continue;
				}
				
				// Skip punctuation
				if (!this._isAlphaNum(char) && ":".indexOf(char) == -1) {
					continue;
				}
				
				reset();
			}
		}
		
		var addedBack = false;
		
		// Start after matched word and find the end of the sentence it's a part of
		var afterStart = pos + searchText.length;
		var skipOffset = 0;
		var end = pageText.length;
		while (afterStart + skipOffset < pageText.length - 1) {
			let currentRemainder = pageText.substr(afterStart + skipOffset);
			//console.log("Current remainder: " + currentRemainder);
			
			// Look for a sentence ending
			let endMatches = currentRemainder.match(sentenceEndRE);
			if (!endMatches) {
				// If we reached the end without finding a sentence end, and we haven't yet added back
				// the search word and the text after it, the match was in the same sentence, and we
				// need to add back the rest and keep going.
				if (!addedBack) {
					// Add back search text
					pageText += searchText;
					
					if (afterText) {
						pageText += afterText;
					}
					addedBack = true;
					continue;
				}
				break;
			}
			let len = endMatches.index + 1 + endMatches[1].length;
			let currentRemainderToEndMatch = currentRemainder.substr(0, len);
			//console.log("Remainder to end match: " + currentRemainderToEndMatch);
			let nextRemainder = pageText.substr(
				afterStart + skipOffset + currentRemainderToEndMatch.length
			);
			if (nextRemainder.length) {
				//console.log("Next remainder: " + nextRemainder);
			}
			
			// Check for various things after the supposed sentence ending that indicate that the
			// sentence isn't done
			let afterEndMatch = currentRemainder.substr(len - 1).trim();
			if (afterEndMatch.length) {
				// lowercase letter ("foo. bar")
				if (this._isLowerCase(afterEndMatch)) {
					console.log("Lowercase letter found after ending -- continuing");
					skipOffset += len;
					continue;
				}
			}
			
			// If the match ends in an abbreviation, keep looking
			let abbrLen = this._endsInAbbreviation(currentRemainder.substr(0, endMatches.index));
			if (abbrLen) {
				console.log("Abbreviation found before ending -- continuing");
				skipOffset += len;
				continue;
			}
			
			abbrLen = this._endsInPossibleAbbreviation(currentRemainder.substr(0, endMatches.index));
			if (abbrLen) {
				// Don't stop at possible abbreviation if next word is a number
				if (nextRemainder.match(/^[0-9]/)) {
					skipOffset += len;
					continue;
				}
			}
			
			end = afterStart + skipOffset + len;
			break;
		}
		end -= start;
		
		var text = pageText.substr(start, end).trim();
		// Strip numeric citations ("foo.[1]")
		text = text.replace(/ *\[[0-9]+\]$/, "");
		console.log(text);
		
		return [text];
	},
	
	
	_isCapitalized: function (string) {
		return string[0] !== string[0].toLowerCase();
	},
	
	
	_isLowerCase: function (string) {
		return string[0] !== string[0].toUpperCase();
	},
	
	
	_isAlphaNum: function (string) {
		let char = string[0];
		return this._isCapitalized(char) || this._isLowerCase(char) || /[0-9]+/.test(char);
	},
	
	
	_isBlacklisted: function (word) {
		return wordBlacklist.has(word.toLowerCase());
	},
	
	
	/**
	 * @return {number} - Length of matched abbreviation, or 0 if none
	 */
	_endsInAbbreviation: function (string) {
		// Single capital letter
		if (string.length == 1) {
			let re = XRegExp("\\p{Uppercase_Letter}");
			if (XRegExp.match(string, re)) {
				return 1;
			}
		}
		
		// Not a letter, followed by a single capital letter
		var re = XRegExp("(?:\\PL\\p{Uppercase_Letter})$");
		var match = XRegExp.match(string, re);
		if (match) {
			return match[0].length;
		}
		
		// From https://github.com/stanfordnlp/CoreNLP/blob/f569983c8ad4e7890139b77775865cce1b82d4dc/src/edu/stanford/nlp/international/french/process/FrenchLexer.flex#L411
		var abbrRE = /(?:Mr|Mrs|Ms|Miss|Drs?|Profs?|Sens?|Reps?|Attys?|Lt|Col|Gen|Messrs|Govs?|Adm|Rev|Maj|Sgt|Cpl|Pvt|Mt|Capt|Ste?|Ave|Pres|Lieut|Hon|Brig|Co?mdr|Pfc|Spc|Supts?|Det|M|MM|Mme|Mmes|Mlle|Mlles)$/;
		match = string.match(abbrRE);
		return match ? match[0].length : 0;
	},
	
	
	_endsInPossibleAbbreviation: function (string) {
		// Not a letter, followed by a capital letter, followed by 1-4 lowercase letters
		var re = XRegExp("(?:\\PL\\p{Uppercase_Letter}\\p{Lowercase_Letter}{1,4})$");
		var match = XRegExp.match(string, re);
		return match ? match[0].length : 0;
	},
	
	
	_escapeRegExp: function (string) {
		return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}
};

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

export default {
	// Should match utils.js
	delimiters: "\\s\.,:;…?!\"'“”‘’«»「」\\-—()[\\]{}\\\\/",
	
	/**
	 * Extra page text for multi-page articles
	 *
	 * Currently unused
	 */
	extractPageText: function () {
		var text = "", tempText = "";
		var minChars = 150;
		
		// Look for first <article>
		// TODO: multi-article pages
		elems = document.getElementsByTagName("article");
		if (elems.length && elems[0].textContent >= minChars) {
			console.log("Using <article> text");
			return this.getCleanText(elems[0]);
		}
		
		// Look for a <main>
		var elems = document.getElementsByTagName("main");
		if (elems.length) {
			// Get all <p> text within <main>
			elems = elems[0].getElementsByTagName("p");
			tempText = "";
			for (let i = 0; i < elems.length; i++) {
				tempText += this.getCleanText(elems[i]) + "\n\n";
			}
			if (tempText.length > minChars) {
				console.log("Using all <p> text within <main>");
				return tempText;
			}
		}
		
		
		// See if there's an id="main" that gets us less (but still enough) content.
		// The id is meaningless, of course, but some sites (e.g., NYT) use it.
		var main = document.getElementById('main') || document.getElementById('Main') || document.getElementById('MAIN');
		if (main) {
			// Get all <p> text within id="main"
			elems = main.querySelectorAll(":not(aside) p");
			tempText = "";
			for (let i = 0; i < elems.length; i++) {
				tempText += this.getCleanText(elems[i]) + "\n\n";
			}
			if (tempText.length > minChars) {
				console.log('Using all <p> text with id="main"');
				return tempText;
			}
		}
		
		// Concatenate all <p> text
		elems = document.querySelectorAll(":not(aside) p, :not(aside) p+ul li, :not(aside) p+ol li");
		tempText = "";
		for (let i = 0; i < elems.length; i++) {
			tempText += this.getCleanText(elems[i]) + "\n\n";
		}
		if (tempText.length > minChars) {
			console.log("Using all <p> and <li> text");
			return tempText;
		}
		
		console.log("Using all body text");
		return this.getCleanText(document.body);
	},
	
	
	extractPageTextBeforeNodeAndOffset: function (node, offset) {
		console.log("Extracting page text before");
		
		var currentNode = node;
		var container;
		var beforeContainer = true;
		
		// Get text of node up to offset
		var text = node.textContent.substr(0, offset);
		
		// Find container of node
		while (currentNode = currentNode.parentNode) {
			if (this.isBlockElement(currentNode) || currentNode == document.body) {
				console.log("Container is " + currentNode.tagName);
				container = currentNode;
				break;
			}
		}
		var containerIsParagraph = container.tagName == "P";
		var paragraphFound = false;
		
		// Walk backwards in the tree to get page text
		var treeWalker = document.createTreeWalker(
			document,
			NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
			{
				acceptNode: function (currentNode) {
					if (currentNode.tagName) {
						console.log(`Checking node ${currentNode.tagName}: ${currentNode.innerHTML.substr(0, 100)}`);
					}
					
					if (currentNode.namespaceURI == 'http://www.w3.org/2000/svg') {
						return NodeFilter.FILTER_REJECT;
					}
					
					// Skip all children of some nodes
					if (currentNode.nodeType != Node.TEXT_NODE) {
						switch (currentNode.tagName) {
						case 'ASIDE':
						case 'BUTTON':
						case 'FORM':
						case 'HEAD':
						case 'FIGCAPTION':
							console.log("Rejecting");
							return NodeFilter.FILTER_REJECT;
						}
						
						if (currentNode.className.includes('caption')) {
							return NodeFilter.FILTER_REJECT;
						}
					}
					
					// Until we reach the container, accept only text nodes
					if (beforeContainer) {
						if (currentNode == container) {
							beforeContainer = false;
							console.log("Reached container");
							return NodeFilter.FILTER_SKIP;
						}
						if (currentNode.nodeType != Node.TEXT_NODE) {
							return NodeFilter.FILTER_SKIP;
						}
						console.log("Accepting text node: " + currentNode.nodeValue);
						return NodeFilter.FILTER_ACCEPT;
					}
					
					// After we reach the container, accept certain elements
					if (currentNode.nodeType != Node.TEXT_NODE) {
						// If clicked text is contained within a paragraph, or we found a paragraph
						// previously, only accept paragraphs. (We only accept divs in the first place
						// because some sites have terrible markup with divs instead of paragraphs,
						// but they're much riskier to use.)
						if (containerIsParagraph || paragraphFound) {
							if (currentNode.tagName == "P") {
								if (!this.elementIsVisible(currentNode)) return NodeFilter.FILTER_REJECT;
								
								console.log("Accepting <p>: " + currentNode.textContent);
								return NodeFilter.FILTER_ACCEPT;
							}
						}
						else if (currentNode.tagName == "P") {
							if (!this.elementIsVisible(currentNode)) return NodeFilter.FILTER_REJECT;
							
							paragraphFound = true;
							console.log("Accepting <p>: " + currentNode.textContent);
							return NodeFilter.FILTER_ACCEPT;
						}
						// Otherwise accept divs with text too
						else if (this.isTextContainer(currentNode)) {
							if (!this.elementIsVisible(currentNode)) return NodeFilter.FILTER_REJECT;
							
							console.log(`Accepting <div> (${currentNode.id}): ${currentNode.textContent}`);
							return NodeFilter.FILTER_ACCEPT;
						}
					}
					
					return NodeFilter.FILTER_SKIP;
				}.bind(this)
			}
		);
		treeWalker.currentNode = node;
		while (currentNode = treeWalker.previousNode()) {
			// Every time we each a block element, add newlines
			if (this.isBlockElement(currentNode)) {
				text = "\n\n" + text;
			}
			
			let nodeText = this.getCleanText(currentNode);
			text = nodeText + text;
		}
		
		return text.replace(/\n{2,}/g, "\n\n")
			.replace(/ +/g, " ");
	},
	
	
	getCleanText: function (elem) {
		// If text node, return directly as long as it's not in a <script>
		if (elem.nodeType == Node.TEXT_NODE) {
			if (elem.parentNode.tagName == 'SCRIPT') {
				return "";
			}
			return elem.textContent;
		}
		
		elem = elem.cloneNode(true);
		var elementsToRemove = ['script', 'style', 'aside'];
		elementsToRemove.forEach(function (name) {
			let elems = elem.getElementsByTagName(name);
			while (elems.length) {
				try {
					elems[0].parentNode.removeChild(elems[0]);
				}
				catch (e) {
					console.log(e);
				}
			}
		});
		// Add newline before <br>, since textContent ignores it
		var doc = elem.ownerDocument;
		Array.from(elem.getElementsByTagName('br')).forEach(el => {
			el.parentNode.insertBefore(doc.createTextNode('\n'), el);
		});
		return elem.textContent;
	},
	
	
	getNodeAndOffsetAtPoint: function (x, y) {
		var range;
		var textNode;
		var offset;
		
		// Standard
		if (document.caretPositionFromPoint) {
			range = document.caretPositionFromPoint(x, y);
			textNode = range.offsetNode;
			offset = range.offset;
		}
		// WebKit
		else if (document.caretRangeFromPoint) {
			range = document.caretRangeFromPoint(x, y);
			if (!range) {
				return;
			}
			textNode = range.startContainer;
			offset = range.startOffset;
		}
		
		if (!this.isClickableNode(textNode)) {
			return;
		}
		
		return {
			node: textNode,
			offset
		};
	},
	
	
	isClickableNode: function (node) {
		if (node.nodeType != Node.TEXT_NODE) {
			console.log("Ignoring click on non-text node");
			return false;
		}
		
		var foundValidContainer = false;
		while (node = node.parentNode) {
			let tag = node.tagName.toLowerCase();
			// Ignore text within certain elements
			if (tag == 'a' || tag == 'button' || tag == 'label') {
				console.log(`Ignoring text within ${tag}`);
				return false;
			}
			if (node.getAttribute('contenteditable') == 'true') {
				console.log("Ignoring click in editable node");
				return false;
			}
			if (!foundValidContainer) {
				if (tag == 'p') {
					console.log("Found <p> ancestor");
					foundValidContainer = true;
					continue;
				}
				if (this.isTextContainer(node)) {
					console.log(`Found <${node.tagName}> ancestor`);
					foundValidContainer = true;
					continue;
				}
			}
			if (tag == 'body') {
				break;
			}
		}
		return foundValidContainer;
	},
	
	
	isBlockElement: function (element) {
		if (element.nodeType != Node.ELEMENT_NODE) {
			return false;
		}
		// <p> is always a block
		// TODO: others?
		if (element.tagName == "P") {
			return true;
		}
		console.log((element.currentStyle || window.getComputedStyle(element, "")).display == 'block');
		return (element.currentStyle || window.getComputedStyle(element, "")).display == 'block';
	},
	
	
	isTextContainer: function (element) {
		if (element.tagName == "P") return true;
		if (element.tagName == "DIV") {
			let len = 0;
			// TEMP: Can remove Array.from at some point
			Array.from(element.childNodes).forEach(el => {
				if (el.nodeType == Node.TEXT_NODE) {
					len += el.nodeValue.trim().length;
				}
			});
			if (len > 90) {
				return true;
			}
		}
		return false
	},
	
	
	isInlineTextElement: function (element) {
		return [
			'A',
			'B',
			'EM',
			'I',
			'STRONG'
		].includes(element.tagName);
	},
	
	
	elementIsVisible: function (element) {
		return element.offsetParent !== null;
	},
	
	
	// Should match Utils.getWordPosition()
	getWordPosition: function (text, word) {
		var quotedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		return text.search(new RegExp(quotedWord + '[' + this.delimiters + ']'));
	},
	
	
	makeParagraphWithHighlight: function (text, word) {
		var index = this.getWordPosition(text, word);
		var p = document.createElement('p');
		var mark = document.createElement('mark');
		mark.appendChild(document.createTextNode(word));
		p.appendChild(document.createTextNode(text.substr(0, index)));
		p.appendChild(mark);
		p.appendChild(document.createTextNode(text.substr(index + word.length)));
		return p;
	},
	
	
	_panel: null,
	showPanel: function (x, y, text, word) {
		var p = this.makeParagraphWithHighlight(text, word);
		
		if (this._panel) {
			this._panel.content(p);
		}
		else {
			this._panel = new Tooltip(p, {
				auto: true,
				baseClass: 'first-mention-tooltip'
			});
			this._panel.type('light');
		}
		
		// Click listeners
		var dragging = false;
		var onClick = (event) => {
			// Keep open until other click event has had a chance to see that the panel is open
			// so it can ignore the click
			setTimeout(() => this._panel.hide(), 1);
			
			if (!('ontouchstart' in document.documentElement)) {
				document.body.removeEventListener('click', onClick);
			}
			else {
				document.body.removeEventListener('touchmove', onTouchMove);
				document.body.removeEventListener('touchend', onTouchEnd);
			}
			this._panel.element.removeEventListener('click', onPanelClick);
			event.stopPropagation();
		};
		var onTouchMove = () => dragging = true;
		var onTouchEnd = (event) => {
			if (dragging) {
				dragging = false;
				return;
			}
			dragging = false;
			onClick(event);
		};
		var onPanelClick = (event) => {
			if (getSelection().toString().length) {
				console.log("Text selected -- not closing popup");
				event.stopPropagation();
				return;
			}
			onClick(event);
		};
		
		if (!('ontouchstart' in document.documentElement)) {
			document.body.addEventListener('click', onClick);
		}
		else {
			document.body.addEventListener('touchmove', onTouchMove);
			document.body.addEventListener('touchend', onTouchEnd);
		}
		this._panel.element.addEventListener('click', onPanelClick);
		// Make click events work normally
		if (FirstMention.isiOS) {
			this._panel.element.style.cursor = 'pointer';
		}
		this._panel.show(x, y);
		
		// Make sure the left edge isn't less than 0. This messes up the arrow but keeps the popup
		// within view on some mobile pages. (It would be better to fix this in the tooltip code.)
		if (this._panel.element.style.left.startsWith("-")) {
			this._panel.element.style.left = "0";
		}
	},
	
	panelShowing: function () {
		return this._panel && !this._panel.hidden;
	}
};

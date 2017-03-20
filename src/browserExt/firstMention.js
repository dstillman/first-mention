export default new function () {
	this.isExtension = true;
	this.isBrowserExt = true;
	
	// Browser check adopted from:
	// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
	// Firefox 1.0+
	this.isFirefox = typeof InstallTrigger !== 'undefined';
	// Edge 20+
	this.isEdge = !this.isIE && !!window.StyleMedia;
	// Chrome and Chromium
	this.isChrome = window.navigator.userAgent.indexOf("Chrome") !== -1 || window.navigator.userAgent.indexOf("Chromium") !== -1;
	
	this.cacheEnabled = false;
};

export default new function () {
	this.isExtension = false;
	this.isBookmarklet = true;
	
	var ua = window.navigator.userAgent;
	
	// Browser check adopted from:
	// http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
	// Firefox 1.0+
	this.isFirefox = typeof InstallTrigger !== 'undefined';
	// At least Safari 10+
	this.isSafari = typeof safari !== 'undefined';
	// Internet Explorer 6-11
	this.isIE = /*@cc_on!@*/false || !!document.documentMode;
	// Edge 20+
	this.isEdge = !this.isIE && !!window.StyleMedia;
	// Chrome and Chromium
	this.isChrome = ua.includes('Chrome') || ua.includes('Chromium');
	this.isiOS = ua.includes('iPad') || ua.includes('iPhone');
	
	this.cacheEnabled = false;
};

// A click outside the iframe won't close the panel if it's open inside,
// so simulate a click on the panel.
window.addEventListener('click', function () {
	if (document.getElementById('demo').contentDocument) {
		var panel = document.getElementById('demo').contentDocument.querySelector('.first-mention-tooltip');
		if (panel) {
			panel.click();
		}
	}
});

document.getElementById('demo').onload = function (event) {
	var iframe = event.target;
	iframe.style.height = 'calc('
		+ iframe.contentWindow.document.getElementsByTagName('p')[0].scrollHeight + 'px'
		+ ' + 3.5em)';
};

document.getElementById('close-tab').onclick = function (event) {
	if (typeof safari !== 'undefined') {
		safari.self.tab.dispatchMessage('closeTab');
	}
	else {
		chrome.tabs.getCurrent(function (tab) {
			chrome.tabs.remove(tab.id, function () {});
		})
	}
};

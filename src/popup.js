const allSources = new Map();
const actionHandler = {};

const buildSourceItem = function buildSourceItem (source, key) {
	const item = document.createElement('pre');
	const a = document.createElement('a');

	a.id = key;
	a.href = '#';
	a.textContent = source.excerpt;

	item.appendChild(a);
	item.classList.add('item');

	if (source.downloaded) {
		item.classList.add('downloaded');
	}

	return item;
};

// Update and display all JSONs.
actionHandler.update = function actionUpdateSources (sources) {
	Object.keys(sources).forEach(key => allSources.set(key, sources[key]));

	const ol = document.getElementById('sources');
	ol.innerHTML = '';

	allSources.forEach((source, key) => ol.appendChild(buildSourceItem(source, key)));
};

actionHandler.download = function actionDownloadJSON (key, url) {
	chrome.downloads.download({
		url     : url,
		filename: 'extracted.json',
		saveAs  : true
	}, () => {
		chrome.tabs.sendMessage(this.tab.id, {action: 'downloaded', args: [key]});

		const a = document.getElementByID('#' + key);
		if (a) {
			a.parentNode.classList.add('downloaded');
		}
	});
};

// Add sources to list of all sources. extract_json.js is
// injected into all frames of the active tab, so this listener may be called
// multiple times.
chrome.runtime.onMessage.addListener(function (message, sender, callback) {
	if (!message || !message.action || !actionHandler[message.action]) {
		return;
	}

	// Use `sender.tab.url` fro something?

	const args = (message.args && message.args.slice()) || [];
	args.push(callback);

	actionHandler[message.action].apply(sender, message.args || []);
});

// Set up event handlers and inject extract_json.js into all frames in the active
// tab.
window.onload = function () {
	document.addEventListener('mouseenter', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		const id = element.id;
		chrome.tabs.query({active: true, currentWindow: true}, function (activeTabs) {
			chrome.tabs.sendMessage(activeTabs[0].id, {action: 'scrollTo', args: [id]});
		});
	}, {capture: true});

	document.addEventListener('click', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		const id = element.id;
		chrome.tabs.query({active: true, currentWindow: true}, function (activeTabs) {
			// Call `scrollTo` again, to stay at this element
			chrome.tabs.sendMessage(activeTabs[0].id, {action: 'scrollTo', args: [id]});
			chrome.tabs.sendMessage(activeTabs[0].id, {action: 'download', args: [id]});
		});
	}, {capture: true});

	document.addEventListener('mouseleave', function () {
		chrome.tabs.query({active: true, currentWindow: true}, function (activeTabs) {
			chrome.tabs.sendMessage(activeTabs[0].id, {action: 'scrollBack', args: []});
		});
	}, {capture: true});

	chrome.tabs.query({active: true, currentWindow: true}, function (activeTabs) {
		chrome.tabs.executeScript(activeTabs[0].id, {file: 'extract_json.js', allFrames: true});
	});
};


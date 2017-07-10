/* global __extractJSON:true */
// The popup injects this script into all frames in the active tab.
// Prevent multiple initializations.
// eslint-disable-next-line
var __extractJSON = __extractJSON || (function () {
	const actionHandler = {};
	let lastScrollY = window.scrollY;

	const downloads = new Map();

	actionHandler.scrollTo = function actionScrollTo (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		const box = pre && pre.getBoundingClientRect();
		lastScrollY = window.scrollY;
		window.scroll(0, (box && box.top) + lastScrollY);
	};

	actionHandler.scrollBack = function actionScrollBack () {
		window.scroll(0, lastScrollY);
	};

	actionHandler.update = function actionUpdate (template) {
		// eslint-disable-next-line no-new-func
		const generate = template && new Function('return `' + template + '`;');
		const extract = function (js, text) {
			if (generate) {
				return generate.call(js);
			}

			return text.match(/^[^\n]*\n[^\n]*\n[^\n]*\n/); // Show only three first lines
		};

		chrome.runtime.sendMessage({
			action: 'update',
			args  : [Array.from(document.getElementsByTagName('pre')).reduce(function (result, pre) {
				const data = pre.textContent;
				const id = performance.now().toString();

				try {
					// Parse it just to be sure it is a valid JSON...
					// ... and if it is, add it to result...
					result[id] = {
						excerpt   : extract(JSON.parse(data), data),
						downloaded: pre.getAttribute('data-extracted-json-downloaded')
					};
					// ... and mark this PRE element, so we can quickly scroll to it when needed.
					pre.setAttribute('data-extracted-json-id', id);
				}
				catch (e) {
					// Nothing. Ignore this data.
				}

				return result;
			}, {})]
		});
	};

	actionHandler.download = function actionDownload (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		if (!pre) {
			return;
		}

		const blob = new Blob([pre.textContent], {type: 'data:attachment/text'});
		const url = window.URL.createObjectURL(blob);

		downloads.set(id, url);

		// Send message back, to download using "Save As..." dialog:
		chrome.runtime.sendMessage({action: 'download', args: [id, url]});

		// Use link + click to download automatically, without "Save As..." dialog:
		// const a = document.createElement('a');
		// a.href = url;
		// a.download = 'extracted.json';
		// a.click();
		// window.URL.revokeObjectURL(url);
	};

	actionHandler.downloaded = function actionDownloaded (id) {
		const url = downloads.get(id);

		if (!url) {
			return;
		}

		downloads.delete(id);
		window.URL.revokeObjectURL(url);

		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		if (pre) {
			pre.setAttribute('data-extracted-json-downloaded', true);
		}
	};

	function onMessage (message) {
		if (!message || !message.action || !actionHandler[message.action]) {
			return;
		}

		actionHandler[message.action].apply(undefined, message.args || []);
	}

	chrome.runtime.onMessage.addListener(onMessage);

	return actionHandler.update;
})();

__extractJSON();

/* global XAPI */
// background.js injects this script into all frames in the active tab.
// Prevent multiple initializations.
// eslint-disable-next-line
var __extractJSON = __extractJSON || (function () {
	const actionHandler = {
		_port       : null,
		_lastScrollY: window.scrollY,
		scrollTo    : actionScrollTo,
		scrollBack  : actionScrollBack,
		extract     : actionExtract,
		download    : actionDownload,
		downloaded  : actionDownloaded
	};

	function actionScrollTo (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		const box = pre && pre.getBoundingClientRect();
		this._lastScrollY = window.scrollY;
		window.scroll(0, (box && box.top) + this._lastScrollY);
	}

	function actionScrollBack () {
		window.scroll(0, this._lastScrollY);
	}

	function actionExtract (template) {
		// eslint-disable-next-line no-new-func
		const generate = template && new Function('return `' + template + '`;');
		const extract = function (js, text) {
			if (generate) {
				return generate.call(js);
			}

			return text.match(/^[^\n]*\n[^\n]*\n[^\n]*\n/); // Show only three first lines
		};

		this._port.postMessage({
			to    : 'popup',
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
					// Nothing. Ignore this data, remove our attributes, if there were any.
					pre.removeAttribute('data-extracted-json-id');
					pre.removeAttribute('data-extracted-json-downloaded');
				}

				return result;
			}, {})]
		});
	}

	function actionDownload (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		if (!pre) {
			return;
		}

		// Send message back, to download using "Save As..." dialog:
		this._port.postMessage({action: 'download', args: [id, pre.textContent]});
	}

	function actionDownloaded (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		if (pre) {
			pre.setAttribute('data-extracted-json-downloaded', true);
		}
	}

	function onMessage (message) {
		if (!message || !message.action || !actionHandler[message.action]) {
			return;
		}

		actionHandler[message.action].apply(actionHandler, message.args || []);
	}

	function onDisconnect (port) {
		port.onMessage.removeListener(onMessage);
		port.onDisconnect.removeListener(onDisconnect);

		if (actionHandler._port === port) {
			port.postMessage({action: 'message', message: 'content disconnected'});
			actionHandler._port.disconnect();
			actionHandler._port = null;
		}
	}

	return function connect () {
		if (actionHandler._port) {
			actionHandler._port.disconnect();
		}

		actionHandler._port = XAPI.runtime.connect({name: 'source'});
		actionHandler._port.onMessage.addListener(onMessage);
		actionHandler._port.onDisconnect.addListener(onDisconnect);
	};
})();

__extractJSON();

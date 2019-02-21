/* eslint-env mocha, browser */
/* global XAPI:readable */

/**
 * background.js injects this script into all frames in the active tab.
 * Prevent multiple initializations.
 */

// eslint-disable-next-line
var __extractJSON = __extractJSON || (function () {
	const actionHandler = {
		_port       : null,
		_lastScrollY: window.scrollY,
		mousewheel  : actionMouseWheel,
		scrollTo    : actionScrollTo,
		scrollBack  : actionScrollBack,
		extract     : actionExtract,
		download    : actionDownload,
		downloaded  : actionDownloaded
	};

	function _generateId (index) {
		const a = new Uint32Array(1);
		window.crypto.getRandomValues(a);
		return index + '-' + a.join('');
	}

	function actionMouseWheel (delta = {deltaX: 0, deltaY: 0}) {
		window.scroll(window.scrollX + (delta.deltaX || 0), window.scrollY + (delta.deltaY || 0));
	}

	function actionScrollTo (id) {
		const pre = document.querySelector(`pre[data-extracted-json-id="${id}"]`);
		const box = pre && pre.getBoundingClientRect();
		this._lastScrollY = window.scrollY;
		window.scroll(0, (box && box.top) + this._lastScrollY);
	}

	function actionScrollBack () {
		window.scroll(0, this._lastScrollY);
	}

	function actionExtract () {
		const extract = function (data, text) {
			return text.match(/^[^\n]*\n[^\n]*\n[^\n]*\n/); // Show only three first lines
		};

		this._port.postMessage({
			to    : 'popup',
			action: 'update',
			args  : [Array.from(document.getElementsByTagName('pre')).reduce(function (result, pre, index) {
				const src = pre.textContent;
				const srcId = pre.getAttribute('data-extracted-json-id');
				const id = srcId || _generateId(index);

				try {
					// Parse it just to be sure it is a valid JSON...
					const data = JSON.parse(src);
					// ... and if it is, add it to result...
					result[id] = {
						type      : Array.isArray(data) ? 'array(' + data.length + ')' : 'object',
						excerpt   : extract(data, src),
						downloaded: pre.getAttribute('data-extracted-json-downloaded')
					};
					// ... and mark this PRE element, so we can quickly scroll to it when needed.
					if (id !== srcId) {
						pre.setAttribute('data-extracted-json-id', id);
					}
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

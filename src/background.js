/* global XAPI */
(function () {
	const clients = {
		popup : null,
		source: null
	};

	const handlers = {
		source: {
			download: actionDownloadJSON
		}
	};

	const downloads = new Map();

	function actionDownloadJSON (from, key, data) {
		const blob = new Blob([data], {type: 'data:attachment/text'});
		const url = window.URL.createObjectURL(blob);
		const port = clients[from];

		if (!port) {
			console.error('BACKGROUND: Unknown client requested download', from, key, data);
			return;
		}

		XAPI(XAPI.downloads.download, {
			url     : url,
			filename: 'extracted.json',
			saveAs  : true
		})
			.then(downloadId => {
				downloads.set(downloadId, {
					url,
					key,
					port
				});
				return true;
			})
			.catch(e => console.error('BACKGROUND: Download failure', e));
	}

	function onDownloadChange (download) {
		const info = downloads.get(download.id);
		if (!info || !download.state) {
			return;
		}

		if (download.state.current === 'in_progress') {
			return;
		}

		if (download.state.current === 'complete') {
			info.port.postMessage({action: 'downloaded', args: [info.key]});
		}

		window.URL.revokeObjectURL(info.url);
		downloads.delete(download.id);
	}

	function onMessage (from, message) {
		if (!message || !message.action) {
			console.error('BACKGROUND: Unknown message', from, message);
			return;
		}

		if (message.to && clients[message.to]) {
			clients[message.to].postMessage(message);
			return;
		}

		const handler = handlers[from] && handlers[from][message.action];
		if (!handler) {
			console.error('BACKGROUND: No message handler found', from, message);
			return;
		}

		const args = message.args || [];
		handler(from, ...args);
	}

	XAPI.runtime.onConnect.addListener(function (port) {
		clients[port.name] = port;
		const handleMessage = onMessage.bind(null, port.name);

		port.onMessage.addListener(handleMessage);
		port.onDisconnect.addListener(port => {
			port.onMessage.removeListener(handleMessage);
			clients[port.name] = null;
		});

		if (port.name === 'popup') {
			XAPI.tabs.executeScript({file: 'XAPI.js', allFrames: true});
			XAPI.tabs.executeScript({file: 'content.js', allFrames: true});
		}
		else if (port.name === 'source') {
			port.postMessage({action: 'extract'});
		}
	});

	XAPI.downloads.onChanged.addListener(onDownloadChange);

	// Chrome does not support loading SVG icon from manifest,
	// but it does supoort it when loaded from script:
	// https://bugs.chromium.org/p/chromium/issues/detail?id=29683#c34
	XAPI.browserAction.setIcon({
		path: 'icon.svg'
	});
})();

/* global XAPI */
window.onload = function () {
	const allSources = new Map();
	const actionHandler = {
		update: actionUpdateSources
	};

	var backend = XAPI.runtime.connect({name: 'popup'});
	backend.onMessage.addListener(onMessage);
	backend.onDisconnect.addListener(onDisconnect);

	function buildSourceItem (source, key) {
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
	}

	// Update and display all JSONs.
	function actionUpdateSources (sources) {
		Object.keys(sources).forEach(key => allSources.set(key, sources[key]));

		const ol = document.getElementById('sources');
		ol.innerHTML = '';

		allSources.forEach((source, key) => ol.appendChild(buildSourceItem(source, key)));
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

		if (port === backend) {
			backend = null;
		}
	}

	document.addEventListener('mouseenter', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		const id = element.id;
		backend.postMessage({to: 'source', action: 'scrollTo', args: [id]});
	}, {capture: true});

	document.addEventListener('click', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		const id = element.id;
		backend.postMessage({to: 'source', action: 'scrollTo', args: [id]});
		backend.postMessage({to: 'source', action: 'download', args: [id]});
	}, {capture: true});

	document.addEventListener('mouseleave', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		backend.postMessage({to: 'source', action: 'scrollBack', args: []});
	}, {capture: true});
};


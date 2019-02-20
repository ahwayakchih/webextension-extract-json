/* eslint-env mocha, browser */
/* global XAPI:readable */
window.onload = function () {
	const allSources = new Map();
	const actionHandler = {
		update: actionUpdateSources
	};

	const $sources = document.getElementById('sources');
	const emptyHTML = $sources && $sources.removeChild($sources.firstChild);

	var backend = XAPI.runtime.connect({name: 'popup'});
	backend.onMessage.addListener(onMessage);
	backend.onDisconnect.addListener(onDisconnect);

	function buildSourceItem (source, key) {
		const item = document.createElement('pre');
		const a = document.createElement('a');

		a.id = key;
		a.href = '#';
		a.textContent = source.type + ': ' + source.excerpt;

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

		$sources.innerHTML = '';
		allSources.forEach((source, key) => $sources.appendChild(buildSourceItem(source, key)));

		if (allSources.size < 1) {
			$sources.appendChild(emptyHTML);
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

	document.addEventListener('wheel', function (event) {
		const element = event.target;

		if (!element || !element.matches || !element.matches('a')) {
			return;
		}

		const delta = {
			deltaX: event.deltaX,
			deltaY: event.deltaY
		};
		backend.postMessage({to: 'source', action: 'mousewheel', args: [delta]});
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


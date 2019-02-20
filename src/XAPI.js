/* eslint-env mocha, browser */
/* global XAPI:writeable */
/* exported XAPI */
// eslint-disable-next-line
var XAPI = XAPI || (function () {
	const API = typeof browser === 'undefined' ? chrome : browser;
	const THENABLE = typeof browser !== 'undefined';

	const MAP = new WeakMap();
	if (API.downloads) {
		MAP.set(API.downloads.download, {target: API.downloads});
	}

	return Object.assign(function (action, ...params) {
		const errorStack = new Error('XAPI CALL ERROR');
		const passedCallback = typeof params[params.length - 1] === 'function' ? params.pop() : null;
		const mapped = MAP.get(action);
		const f = (mapped && mapped.action) || action;

		if (THENABLE) {
			return f.apply(mapped && mapped.target, params);
		}

		if (!mapped) {
			console.warn(new Error('UNMAPPED API CALL'));
			console.warn(action, params);
			const result = f(...params);
			if (typeof result.then === 'function') {
				return result;
			}

			return Promise.resolve(result);
		}

		return new Promise((resolve, reject) => {
			params.push((...result) => {
				const error = API.runtime.lastError;
				if (error) {
					console.error(new Error(error));
					console.error(errorStack);
					console.error(f, params);
					reject(error);
				}
				else {
					if (passedCallback) {
						passedCallback.apply(mapped, result);
					}
					resolve(...result);
				}
			});

			f.apply(mapped.target, params);
		});
	}, API);
})();

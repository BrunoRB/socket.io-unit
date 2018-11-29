'use strict';

let CONNECTEDS = [];

class SocketioUnit {

	static _getSocketEmitP(cb, client) {
		return function(event, ...data) {
			return new Promise(function(resolve, reject) {
				let pCb = function(...results) {
					let res = cb(...results);
					if (res instanceof Promise) {
						res.then(resolve).catch(reject);
					}
					else {
						reject('The handler function must be async or return a Promise.');
					}
				}

				if (data.length) {
					client.emit(event, ...data, pCb);
				}
				else {
					client.emit(event, pCb);
				}
			});
		}
	}

	/**
	 * Get all connected clients.
	 *
	 * @returns {Array} list of socket.io-client objects
	 */
	static getAllClients() {
		return CONNECTEDS;
	}

	/**
	 * Disconnect all connected clients.
	 *
	 * @returns {Promise}
	 */
	static disconnectAll() {
		let pArr = CONNECTEDS.map(c => {
			return c.disconnectP();
		});

		return Promise.all(pArr);
	}

	/**
	 *
	 * @param {string} url Socket server url
	 * @param {Function} cb Function that will handle the server
	 * 	acknowledgement (https://socket.io/docs/#Sending-and-getting-data-acknowledgements).
	 * 	It should return a Promise. ex:
	 * 	<pre>
	 * 		new SocketioUnit(url, (serverAckStatus, serverAckData) => {
	 *			if (serverAckStatus) { return Promise.resolve(serverAckData) }
	 *			else { return Promise.reject(serverAckData) }
	 * 		});
	 * 	</pre>
	 * @param {Number} timeout How much time, in milliseconds, to wait for a connection (default = 2000)
	 * @param {Object} params socket.io-client connection parameters, see https://socket.io/docs/client-api/#new-Manager-url-options
	 */
	constructor(url, cb, timeout = 2000, params = {}) {
		if (!url) {
			throw `Invalid url ${url}`;
		}
		else if (!cb || typeof cb !== 'function') {
			throw `Invalid cb`;
		}
		else if (isNaN(parseInt(timeout, 10)) || timeout <= 0) {
			throw 'Invalid timeout';
		}
		else if (typeof params !== 'object') {
			throw `Invalid params`;
		}

		this._url = url;
		this._cb = cb;
		this._timeout = timeout;
		this._params = params;
	}

	async _augmentClient(client) {
		client.emitP = SocketioUnit._getSocketEmitP(this._cb, client);

		client.on('disconnect', function() {
			CONNECTEDS = CONNECTEDS.filter(c => c.id !== client.id);
		});

		client.onP = async function(event) {
			return new Promise(function(innerRes) {
				client.once(event, function(...data) {
					innerRes(...data);
				});
			});
		};

		client.disconnectP = async function() {
			var p = new Promise(function(innerRes) {
				client.on('disconnect', innerRes);
			});
			client.disconnect();
			return p;
		};

		client.reconnectP = async function() {
			return new Promise(function(resolve, reject) {
				let _c = null;
				client.once('connect', function() {
					CONNECTEDS.push(_c);
					resolve(_c);
				});
				client.once('reconnect_error', function() {
					reject(_c);
				});
				client.once('reconnect_failed', function() {
					reject(_c);
				});
				_c = client.open();
			});
		};
	}

	/**
	 * Connect a client to a socket server.
	 *
	 * @returns {Object} a socket.io-client wrapped in a Promise and augmented with the
	 * 	`onP`, `emitP` and `disconnectP` methods (P stands for `Promise`).
	 */
	async connect() {
		const io = require('socket.io-client');

		let params = {transports: ['websocket', 'polling']};
		for (let i in this._params) {
			params[i] = this._params[i];
		}

		let client = io(this._url, params);

		return new Promise((resolve, reject) => {
			this._augmentClient(client);

			let t = setTimeout(() => {
				reject(`Could not estabilish a connection after ${this._timeout}ms`);
			}, this._timeout);

			client.once('error', function(e) {
				clearTimeout(t);
				client.disconnect();
				reject(e);
			});
			client.once('connect', function() {
				clearTimeout(t);
				client.off('error');
				CONNECTEDS.push(client);
				resolve(client);
			});
			client.once('connect_error', function(e) {
				clearTimeout(t);
				reject(e);
			});
		});
	}

	/**
	 * Connect `n` clients to a socket server.
	 *
	 * @param {Number} n default = 2
	 * @returns {Array} [this.connect(), this.connect(), ...]
	 */
	async connectMany(n = 2) {
		return Promise.all(new Array(n).fill(0).map(() => this.connect()));
	}
}

module.exports = SocketioUnit;
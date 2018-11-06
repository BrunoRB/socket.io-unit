'use strict';

let CONNECTEDS = [];

class SocketioUnit {

	static _getSocketEmitP(cb, client) {
		return function(event, ...data) {
			return new Promise(function(resolve, reject) {
				let pCb = function(...results) {
					try {
						resolve(cb(...results));
					}
					catch (e) {
						reject(e);
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
	 * 	It should return the server data in case of success, else it should throw an exception. ex	:
	 * 	<pre>
	 * 		return function(serverAckStatus, serverAckData) {
	 *			if (serverAckStatus) { return serverAckData } else { throw 'some failure message (maybe something from the server0'; }
	 * 		}
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
			client.emitP = SocketioUnit._getSocketEmitP(this._cb, client);

			client.on('disconnect', function() {
				CONNECTEDS = CONNECTEDS.filter(c => c.id !== client.id);
			});

			client.onP = async function(event) {
				return new Promise(function(innerRes) {
					client.on(event, function(...data) {
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

			let t = setTimeout(() => {
				reject(`Could not estabilish a connection after ${this._timeout}ms`);
			}, this._timeout);
			client.once('connect', function() {
				clearTimeout(t);
				CONNECTEDS.push(client);
				resolve(client);
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
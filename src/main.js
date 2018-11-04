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
					catch(e) {
						reject(e);
					}
 				};
				if (data.length) {
					client.emit(event, ...data, pCb);
				}
				else {
					client.emit(event, pCb);
				}
			});
		}
	}

	static getAllClients() {
		return CONNECTEDS;
	}

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
	 * 	acknowledgement (https://socket.io/docs/#Sending-and-getting-data-acknowledgements). TODO ex:
	 * 	<pre>
	 * 		return function(serverAckStatus, serverAckData) {
	 *
	 * 		}
	 * 	</pre>
	 * @param {Object} params
	 */
	constructor(url, cb, params = {}) {
		if (!url) {
			throw `Invalid url ${url}`;
		}
		else if (!cb || typeof cb !== 'function') {
			throw `Invalid cb`;
		}

		this._url = url;
		this._cb = cb;
		this._params = params;
	}

	/**
	 * Connect a client to a socket server.
	 *
	 * @returns {Object} a socket.io-client object augmented with the `onP`, `emitP` and `disconnectP` methods (P stands for `Promise`).
	 */
	async connect() {
		const io = require('socket.io-client');

		const timeout = this._params.timeout || 2000;

		let client = io(this._url, {'transports': ['websocket']});

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
				reject('Took too much time');
			}, timeout);
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
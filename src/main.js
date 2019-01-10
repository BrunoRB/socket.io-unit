'use strict';

let CONNECTEDS = [];

class SocketioUnit {

	constructor(client, cb) {
		this.client = client;
		this.cb = cb;
	}

	/**
	 * Promise based version of the `on` method https://socket.io/docs/client-api/#socket-on-eventName-callback
	 *
	 * @param {String} event
	 * @returns {Promise}
	 */
	async on(event) {
		return new Promise((innerRes) => {
			this.client.once(event, function(...data) {
				innerRes(data);
			});
		});
	}

	/**
	 *
	 * Promise based version of the `emit` method https://socket.io/docs/client-api/#socket-emit-eventName-%E2%80%A6args-ack
	 *
	 * @param {String} event
	 * @param  {...any} data
	 * @returns {Promise}
	 */
	async emit(event, ...data) {
		return new Promise((resolve, reject) => {
			let pCb = (...results) => {
				let res = this.cb(...results);
				if (res instanceof Promise) {
					res.then(resolve).catch(reject);
				}
				else {
					reject('The handler function must be async or return a Promise.');
				}
			}

			if (data.length) {
				this.client.emit(event, ...data, pCb);
			}
			else {
				this.client.emit(event, pCb);
			}
		});
	}

	/**
	 * @returns {Promise}
	 */
	async disconnect() {
		var p = new Promise((innerRes) => {
			this.client.on('disconnect', innerRes);
		});
		this.client.disconnect();
		return p;
	}

	/**
	 * TODO
	 *
	 * @returns {Promise}
	 */
	async reconnect() {
		throw 'TODO, Not working as intented';
		/*
		return new Promise((resolve, reject) => {
			let _c = null;
			this.client.once('connect', function() {
				CONNECTEDS.push(_c);
				resolve(_c);
			});
			this.client.once('reconnect_error', function() {
				reject(_c);
			});
			this.client.once('reconnect_failed', function() {
				reject(_c);
			});
			_c = this.client.open();
		});
		*/
	}
}

module.exports = class SocketioUnitManager {

	/**
	 * Get all connected clients.
	 *
	 * @returns {Array} list of SocketioUnit objects
	 */
	static getAll() {
		return CONNECTEDS;
	}

	/**
	 * Disconnect all connected clients.
	 *
	 * @returns {Promise}
	 */
	static disconnectAll() {
		let pArr = CONNECTEDS.map(c => {
			return c.disconnect();
		});

		return Promise.all(pArr);
	}

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

		this._params = {transports: ['websocket', 'polling']};
		for (let i in params) {
			this._params[i] = params[i];
		}
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
	async connect() {
		const io = require('socket.io-client');
		this.client = io(this._url, this._params);

		let client = this.client;

		await new Promise((resolve, reject) => {
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
				resolve(client);
			});
			client.once('connect_error', function(e) {
				clearTimeout(t);
				reject(e);
			});
		});

		let testClient =  new SocketioUnit(client, this._cb);

		CONNECTEDS.push(testClient);
		client.on('disconnect', function() {
			CONNECTEDS = CONNECTEDS.filter(c => c.client.id !== client.id);
		});

		return testClient;
	}

	/**
	 * Connect `n` clients to a socket server.
	 *
	 * @param {Number} n
	 * @returns {Array} [this.connect(), this.connect(), ...]
	 */
	async connectMany(n) {
		return Promise.all(new Array(n).fill(0).map(() => this.connect()));
	}
};
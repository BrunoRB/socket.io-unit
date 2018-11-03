'use strict';

let CONNECTEDS = [];

class SocketioUnit {

	static _getSocketEmitP(cb, client) {
		return function(event, ...data) {
			return new Promise(function(resolve, reject) {
				if (data.length) {
					client.emit(event, ...data, cb(resolve, reject));
				}
				else {
					client.emit(event, cb(resolve, reject));
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

	async connectMany(n = 2) {
		return Promise.all(new Array(n).fill(0).map(() => this.connect()));
	}
}

module.exports = SocketioUnit;
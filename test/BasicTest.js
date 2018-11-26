'use strict';

const assert = require('assert');
const fs = require('fs');
const SocketioUnit = require(__dirname + '/../src/main.js');
const URL = `http://localhost:${process.env.SOCKET_PORT || 8080}`;

let so = new SocketioUnit(
	URL,
	result => {
		if (result.status === true) {
			return Promise.resolve(result);
		}
		else {
			return Promise.reject(JSON.stringify(result));
		}
	}
);

afterEach(function() {
	return SocketioUnit.disconnectAll();
});

describe('Test connection', function() {
	it('should establish a basic connection', async function() {
		let client = await so.connect();
		assert.ok(client.connected);
	});

	it('should establish a namespace connection', async function() {
		let client = await so.connect(`${URL}/clientNamespace`);
		assert.ok(client.connected);
	});

	it('should disconnect all clients', async function() {
		let client = await so.connect();
		let client2 = await so.connect(`${URL}/clientNamespace`);
		assert.ok(client.connected);
		assert.ok(client2.connected);

		await SocketioUnit.disconnectAll();

		assert.ok(!client.connected);
		assert.ok(!client2.connected);
	});

	it('should reject the connection in case of an error', async function() {
		let ok = false;
		try {
			await new SocketioUnit(`${URL}/failureNamespace`).connect();
		}
		catch(e) {
			ok = true;
		}

		assert.ok(ok, 'Should have failed');
	});

	xit('should manually reconnect a disconnected client', async function() {
		let client = await so.connect();
		await client.disconnectP();
		assert.ok(!client.connected);
		await client.reconnectP();

		assert.ok(client.connected);
	});
});

describe('Test emitP', function() {

	it('should "return" the message "hi" for emit(sayHi)', async function() {
		let client = await so.connect();
		let data = await client.emitP('sayHi');
		assert.ok(data.status);
		assert.equal('hi', data.message);
	});

	it('should create a file named `fName` with contents `c` for emit(createFile, fName, c)', async function() {
		let client = await so.connect();
		let fileName = 'mytest.txt';
		let contents = Math.random();
		let data = await client.emitP('createFile', fileName, contents);

		assert.ok(data.status);
		assert.ok(data.path.endsWith(fileName));
		assert.equal(contents, fs.readFileSync(data.path, 'utf-8'))
	});

	it('should reject the promise', async function() {
		try {
			let client = await so.connect();
			await client.emitP('shouldFail');
		}
		catch (e) {
			assert.ok(true);
			return;
		}

		assert.fail('an exception should have been thrown');
	});

	it('should "return" the message "hi" for emit(sayHi) for all clients', async function() {
		let clients = await so.connectMany(5);
		let results = await Promise.all(clients.map(c => c.emitP('sayHi')));
		assert.ok(results.every(r => r.message === 'hi'));
	});
});

describe('Test onP', function() {
	it('should receive a xpong after emitting xping', async function() {
		let client = await so.connect();
		let pongPromise = client.onP('xpong');
		await client.emitP('xping');
		let pongResult = await pongPromise;
		assert.equal('ping ok', pongResult);
	});

	it('should receive "broadcasted!" for all clients listening to "broadcastToAll"', async function() {
		let clients = await so.connectMany(5);

		let pArr = clients.map(c => c.onP('broadcastToAll'));

		await clients[0].emitP('broadcastToAll');

		let results = await Promise.all(pArr);
		assert.equal(5, results.length);

		assert.ok(results.every(r => r === 'broadcasted!'));
	});
});
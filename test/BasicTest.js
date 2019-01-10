'use strict';

const assert = require('assert');
const fs = require('fs');
const SocketioUnit = require(__dirname + '/../src/main.js');
const URL = `http://localhost:${process.env.SOCKET_PORT || 8080}`;

const callbackHandler = result => {
	if (result.status === true) {
		return Promise.resolve(result);
	}
	else {
		return Promise.reject(JSON.stringify(result));
	}
};

let so = new SocketioUnit(URL, callbackHandler);

afterEach(function() {
	return SocketioUnit.disconnectAll();
});

describe('Test connection', function() {
	it('should establish a basic connection', async function() {
		let testClient = await so.connect();
		assert.ok(testClient.client.connected);
	});

	it('should establish a namespace connection', async function() {
		let testClient = await so.connect(`${URL}/clientNamespace`, callbackHandler);
		assert.ok(testClient.client.connected);
	});

	it('should disconnect all clients', async function() {
		let testClient = await so.connect();
		let testClient2 = await so.connect(`${URL}/clientNamespace`, callbackHandler);
		assert.ok(testClient.client.connected);
		assert.ok(testClient2.client.connected);

		await SocketioUnit.disconnectAll();

		assert.ok(!testClient.connected);
		assert.ok(!testClient2.connected);
	});

	it('should reject the connection in case of an error', async function() {
		let ok = false;
		try {
			await new SocketioUnit(`${URL}/failureNamespace`, callbackHandler).connect();
		}
		catch (e) {
			ok = true;
		}
		assert.ok(ok, 'Should have failed');
	});

	xit('should manually reconnect a disconnected client', async function() {
		let testClient = await so.connect();
		await testClient.disconnect();
		assert.ok(!testClient.connected);

		testClient = await testClient.reconnectP();
		assert.ok(testClient.connected);
	});
});

describe('Test emit', function() {

	it('should "return" the message "hi" for emit(sayHi)', async function() {
		let testClient = await so.connect();
		let data = await testClient.emit('sayHi');
		assert.ok(data.status);
		assert.equal('hi', data.message);
	});

	it('should create a file named `fName` with contents `c` for emit(createFile, fName, c)', async function() {
		let testClient = await so.connect();
		let fileName = 'mytest.txt';
		let contents = Math.random();
		let data = await testClient.emit('createFile', fileName, contents);

		assert.ok(data.status);
		assert.ok(data.path.endsWith(fileName));
		assert.equal(contents, fs.readFileSync(data.path, 'utf-8'))
	});

	it('should reject the promise', async function() {
		try {
			let testClient = await so.connect();
			await testClient.emit('shouldFail');
		}
		catch (e) {
			assert.ok(true);
			return;
		}

		assert.fail('an exception should have been thrown');
	});

	it('should "return" the message "hi" for emit(sayHi) for all clients', async function() {
		let clients = await so.connectMany(5);
		let results = await Promise.all(clients.map(c => c.emit('sayHi')));
		assert.ok(results.every(r => r.message === 'hi'));
	});
});

describe('Test on', function() {
	it('should receive a xpong after emitting xping', async function() {
		let testClient = await so.connect();
		let pongPromise = testClient.on('xpong');
		await testClient.emit('xping');
		let pongResult = await pongPromise;
		assert.deepEqual(['1', '2', '3'], pongResult);
	});

	it('should receive "broadcasted!" for all clients listening to "broadcastToAll"', async function() {
		let clients = await so.connectMany(5);

		let pArr = clients.map(c => c.on('broadcastToAll'));

		await clients[0].emit('broadcastToAll');

		let results = await Promise.all(pArr);
		assert.equal(5, results.length);

		assert.ok(results.every(r => r[0] === 'broadcasted!'));
	});
});
# socket.io-unit

Unit testing for `socket.io` servers.

## Install

`yarn add socket.io-unit`

## How to use

First you need to make sure that all your socket.io server endpoints have and [acknowledgement callback](https://socket.io/docs/#Sending-and-getting-data-acknowledgements) as the last parameter, and that it's always called. Example:

```javascript
socket.on('createFile', function(fileName, contents, cb) {
	if (something) {
		let filePath = path.join(os.tmpdir(), fileName);
		fs.writeFileSync(filePath, contents);
		cb({status: true, path: filePath});

		socket.emit('some-event', 10);
	}
	else {
		cb({status: false, message: 'Failed for some reason'});
	}
});
```

Then as the second parameter for `SocketioUnit` you should pass a function that handles the acknowledgement, returning either a resolved or rejected `Promise`:

```javascript
const SocketioUnit = require('socket.io-unit');
let URL	= 'https://localhost:3000';

let so = new SocketioUnit(
	URL,
	// result is something like: {status: true|false, message: '', ...}
	(result) => {
		if (result.status === true) {
			return Promise.resolve(result);
		}
		else {
			return Promise.reject(result.message);
		}
	}
);
```

Now you can connect clients with the `.connect()` method:

```javascript

let client1 = await so.connect();
let client2 = await so.connect();
let client3 = await so.connect();

```

Each client is an augmented version of a common [`socket.io client`](https://socket.io/docs/client-api/#Socket). They have the `emitP`, `onP` and `disconnectP` methods, which are just "promisified" versions of the standard ones:

```javascript


let eventData = await client1.onP('some-event');

let ackData = await client2.emitP('createFile');

await client3.disconnectP();
```

Check [test-server.js](test-server.js) for a server example and [test/BasicTest.js](test/BasicTest.js) for examples using the [Mocha](https://mochajs.org/) test framework.


## API


### static disconnectAll() -> Promise

Disconnect all `socket.io-unit` connected clients.

### static getAllClients() -> [client1, client2, ...]

Return all `socket.io-unit` connected clients.

<h3 id="constructor-siu">new SocketioUnit(url, handlerFunction, timeout = 2000, parameters = {})</h3>

 - `url`: [server url](https://socket.io/docs/client-api/#new-Manager-url-options).
 - `handlerFunction`: Function that handles the [server
 acknowledgement](https://socket.io/docs/#Sending-and-getting-data-acknowledgements).
 - `timeout`: how much time to wait for the server connection.
 - `parameters`: [options](https://socket.io/docs/client-api/#new-Manager-url-options).

### .connect() -> Promise

Return a connected `socket.io-client` object wrapped in a Promise and augmented with the
`onP`, `emitP` and `disconnectP` methods.

### .connectMany(_n = 2_) -> [Promise1, Promise2, ..., Promise _n_]

_n_ * `.connect`.

### .emitP() -> Promise

Promise based version of the [`emit`](https://socket.io/docs/client-api/#socket-emit-eventName-%E2%80%A6args-ack) method.

```javascript
// server
socket.on('ev', function(arg1, arg2, cb) {
	cb({status: true, data: 'some data'});
});
```
```javascript
// client
let result = await client1.emitP('ev');
assert.ok(result.status);
assert.equal('some data', result.data);
```

Note that in order for it to work you need to define a proper `handler function` in the [`constructor`](#constructor-siu).

### .onP() -> Promise

Promise based verison of the [`on`](https://socket.io/docs/client-api/#socket-on-eventName-callback) method. If successful the promise will resolve with an array that contains the values emitted by the server, example:

```javascript
// server
socket.emit('someEvent', 'hi');
socket.emit('secondEvent', 'foo', 'bar');
```
```javascript
// client
let data = await client1.onP('someEvent');
assert.equal('hi', data[0]);

let [foo, bar] = await client1.onP('secondEvent');

assert.equal('foo', foo);
assert.equal('bar', bar);
```

### .disconnectP() -> Promise

Promise based verison of the [`disconnect`](https://socket.io/docs/client-api/#socket-disconnect) method.
The promise being resolved doesn't guarantee that the server has acknowledged the disconnection.


## Tests

First start the test server with `yarn run server` then run `yarn run test`.
The default used port is `8080`, you can change that with the `SOCKET_PORT` env var:
- `SOCKET_PORT=2000 yarn run server`.
- `SOCKET_PORT=2000 yarn run test`.

Use `yarn run lint` to run the linter.

## License

[The MIT License](LICENSE)

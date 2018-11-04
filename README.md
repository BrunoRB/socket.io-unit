# socket.io-unit

Unit testing for `socket.io` servers.

## Install

`yarn add socket.io-unit`

## How to use

First you need to make sure that all your socket.io server endpoints have and [acknowledgement callback](https://socket.io/docs/#Sending-and-getting-data-acknowledgements) as the last parameter, and that it's always called, ex:

```javascript
socket.on('createFile', function(fileName, contents, cb) {
	if (something) {
		let filePath = path.join(os.tmpdir(), fileName);
		fs.writeFileSync(filePath, contents);
		cb({status: true, path: filePath});
	}
	else {
		cb({status: false, message: 'Failed for some reason'});
	}
});
```

Then as the second parameter for `socket.io-unit` you should pass a function that handles the acknowledgement:

```javascript
const SocketioUnit = require('socket.io-unit');

let so = new SocketioUnit(
	URL,
	function(result) {
		if (result.status === true) {
			return result;
		}
		else {
			throw result.message;
		}
	}
);
```

As in the example the function will receive the server data that was passed to "`cb`", then in case of a success it should return some of that data and in a failure it should throw an exception.
Note that what the data passed to `cb` is is up to you.

The `socket.io-unit` instance is simple connected [`socket.io client`](https://socket.io/docs/client-api/#Socket) object augmented with three new methods: `emitP`, `onP` and `disconnectP`, which are just "promisified" versions of the standard methods, examples:

```javascript
let data = await so.emitP('createFile');
let data2 = await so.onP('some event emitted by the server');

await.disconnectP(); // disconnect the client
```


Check [test-server.js](test-server.js) for a server example and [test/BasicTest.js](test/BasicTest.js) for examples using the [Mocha](https://mochajs.org/) test framework.


## API


### static disconnectAll() -> Promise

Disconnect all `socket.io-unit` connected clients.

### static getAllClients() -> [client1, client2, ...]

Return all `socket.io-unit` connected clients.

### new SocketioUnit(url, handlerFunction, timeout = 2000, parameters = {})

 - `url`: [server url](https://socket.io/docs/client-api/#new-Manager-url-options).
 - `handlerFunction`: Function that handles the [server
 acknowledgement](https://socket.io/docs/#Sending-and-getting-data-acknowledgements).
 - `timeout`: how much time to wait for the server connectin.
 - `parameters`: [options](https://socket.io/docs/client-api/#new-Manager-url-options).

### .connect() -> Promise

Return a connected socket.io-client wrapped in a Promise and augmented with the
`onP`, `emitP` and `disconnectP` methods (P stands for `Promise`).

### .connectMany(_n = 2_) -> [Promise1, Promise2, ..., Promise _n_]

_n_ * `.connect`.

## Tests

First start the test server with `yarn run server` then run `yarn run test`.
The default used port is `8080`, you can change that with the `SOCKET_PORT` env var:
- `SOCKET_PORT=2000 yarn run server`.
- `SOCKET_PORT=2000 yarn run test`.

Use `yarn run lint` to run the linter.

## License

[The MIT License](LICENSE)
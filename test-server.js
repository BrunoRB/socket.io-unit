const app = require('http').createServer()
const io = require('socket.io')(app);
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = process.env.SOCKET_PORT || 8080;
console.info(`Starting socket server at ${PORT}`);
app.listen(PORT);

io.on('connection', function (socket) {
	console.info('Connected', socket.id);

	socket.on('sayHi', function(cb) {
		cb({status: true, message: 'hi'});
	});

	socket.on('createFile', function(fileName, contents, cb) {
		let temp = os.tmpdir();
		let filePath = path.join(temp, fileName);
		fs.writeFileSync(filePath, contents);
		cb({status: true, path: filePath});
	});

	socket.on('shouldFail', function(cb) {
		cb({status: false});
	});

	socket.on('xping', function(cb) {
		socket.emit('xpong', 'ping ok');
		cb({status: true});
	});

	socket.on('broadcastToAll', function(cb) {
		io.emit('broadcastToAll', 'broadcasted!');
		cb({status: true});
	});
});

io.of('/clientNamespace').on('connection', function () {
	console.log('Connected to /clientNamespace');
});
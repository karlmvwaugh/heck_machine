

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/heck_machine.html', (req, res) => {
    res.sendFile(__dirname + '/heck_machine.html');
});
app.get('/heck_machine.js', (req, res) => {
    res.sendFile(__dirname + '/heck_machine.js');
});
app.get('/d3.min.js', (req, res) => {
    res.sendFile(__dirname + '/libs/d3.min.js');
});
app.get('/cracked.js', (req, res) => {
    res.sendFile(__dirname + '/libs/cracked.js');
});



var state = {
    tremelo: { frequency: 4},
    pitch: {frequency: 0.15},
    pitch2: {gain: 5},
    delay: {delay: 0.5, feedback: 0.3},
    squareWave: {frequency: 150},
    squareOsc: {gain: 10, frequency: 0.1},
    tremelo2: {frequency: 0.5, gain: 0.3},
    users: {count: 0}
};

io.on('connection', (socket) => {
    state.users.count = state.users.count + 1;
    console.log('a user connected' + state.users.count);
    var msg = { valueName: 'users', property: 'count', value: state.users.count};
    socket.broadcast.emit('dial move', msg);
    socket.emit('whole state', state);


    socket.on('dial move', (msg) => {
        console.log("Msg: " + msg.valueName + ":" + msg.property + "=" + msg.value);

        state[msg.valueName][msg.property] = msg.value;

        socket.broadcast.emit('dial move', msg);
    });

    socket.on('disconnect', () => {
        state.users.count = state.users.count - 1;
        console.log('a user disconnected ' + state.users.count);

        var msg = { valueName: 'users', property: 'count', value: state.users.count};
        socket.broadcast.emit('dial move', msg);
    });



});

http.listen(3000, () => {
    console.log('listening on *:3000');
});



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
    users: {count: 0}
};

const activeConnections = {};

const drifters = [
    {valueName: 'tremelo', property: 'frequency', min: 0, max: 20, step: 0.01},
    {valueName: 'lowpass1', property: 'frequency', min: 0, max: 500, step: 0.5},
    {valueName: 'lowpass1', property: 'q', min: 0, max: 66, step: 0.02},
    {valueName: 'pitch', property: 'frequency', min: 0, max: 2, step: 0.005},
    {valueName: 'pitch2', property: 'gain', min: 0, max: 100, step: 0.1},
    {valueName: 'delay', property: 'delay', min: 0, max: 2, step: 0.002},
    {valueName: 'delay', property: 'feedback', min: 0, max: 1, step: 0.001},
    {valueName: 'drySignal', property: 'gain', min: 0, max: 1, step: 0.001},


    {valueName: 'squareWave', property: 'frequency', min: 0, max: 200, step: 0.2},
    {valueName: 'squareOsc', property: 'frequency', min: 0, max: 20, step: 0.05},
    {valueName: 'squareOsc', property: 'gain', min: 0, max: 100, step: 0.1},
    {valueName: 'tremelo2', property: 'frequency', min: 0, max: 20, step: 0.05},
    {valueName: 'tremelo2', property: 'gain', min: 0, max: 1, step: 0.001},
    {valueName: 'delay2', property: 'delay', min: 0, max: 2, step: 0.002},
    {valueName: 'delay2', property: 'feedback', min: 0, max: 1, step: 0.001},
    {valueName: 'drySignal2', property: 'gain', min: 0, max: 1, step: 0.001}
];


const driftLoop = function() {
    for (var key in activeConnections) {
        if (activeConnections.hasOwnProperty(key)) {
            var socket = activeConnections[key];

            var msg = { valueName: 'users', property: 'count', value: state.users.count};
            socket.emit('dial move', msg);

            drifters.map(driftSetting => {
                if (state[driftSetting.valueName] && state[driftSetting.valueName][driftSetting.property]) {
                    console.log("changing " + driftSetting.valueName + ":" + driftSetting.property);
                    state[driftSetting.valueName][driftSetting.property] += driftSetting.step * (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random());

                    var msg = {valueName: driftSetting.valueName, property: driftSetting.property, value: state[driftSetting.valueName][driftSetting.property]}
                    socket.emit('dial move', msg);
                }
            });

        }
    }


    setTimeout(driftLoop, 1000);
};

driftLoop();

const randomKey = function() {
    return "a" + Math.round(Math.random() * 10000);
};


io.on('connection', (socket) => {
    const connectionId = randomKey();
    activeConnections[connectionId] = socket;

    state.users.count = state.users.count + 1;
    //console.log('a user connected' + state.users.count);
    var msg = { valueName: 'users', property: 'count', value: state.users.count};
    socket.broadcast.emit('dial move', msg);
    socket.emit('whole state', state);


    socket.on('dial move', (msg) => {
        //console.log("Msg: " + msg.valueName + ":" + msg.property + "=" + msg.value);

        if (!state[msg.valueName]) {
            state[msg.valueName] = {};
        }

        state[msg.valueName][msg.property] = msg.value;

        //update drift settings

        socket.broadcast.emit('dial move', msg);
    });

    socket.on('disconnect', () => {
        state.users.count = state.users.count - 1;
        //console.log('a user disconnected ' + state.users.count);

        delete activeConnections[connectionId];
    });

    socket.on('typed', (msg) => {
        socket.broadcast.emit('typed', msg);
    })



});

http.listen(3000, () => {
    console.log('listening on *:3000');
});


var initted = false;
var container = null;
var effectiveWidth;
var paddingWidth;
var effectiveHeight;
var socket;

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


var initSocket = function() {

    socket = io();

    socket.on('dial move', (msg) => {
        controls.reciever(msg.valueName, msg.property, msg.value);
    });

    socket.on('whole state', (receivedState) => {
        console.log(receivedState);
        for (var key in receivedState) {
            if (receivedState.hasOwnProperty(key)) {
                state[key] = receivedState[key];


                for (var subkey in state[key]) {
                    if (state[key].hasOwnProperty(subkey)) {
                        controls.reciever(key, subkey, state[key][subkey]);
                    }
                }
            }
        }
    });
};

var controls = {
    callbacks: {},
    clickList: [],
    clicker: function(event) {
        var x = event.clientX;
        var y = event.clientY;
        controls.clickList.map(clickMethod => clickMethod(x, y));
    },
    reciever: function(valueName, property, value) {
        console.log(valueName + "set to" + value);

        controls.callbacks[valueName][property](value);
        state[valueName][property] = value;
    },
    dispatcher: function(valueName, property, value) {
        controls.reciever(valueName, property, value);
        socket.emit('dial move', {valueName: valueName, property: property, value: value});
    },
    setCallbacks: function(valueName, property, callback) {
        if (!controls.callbacks[valueName]) {
            controls.callbacks[valueName] = {}
        }

        controls.callbacks[valueName][property] = callback;
    }
};


const initD3 = function() {
        var width = document.body.clientWidth;
        effectiveWidth = width * 0.9;
        paddingWidth = width*0.05;
        var height = document.body.clientHeight;
        console.log("!" + document.body.clientHeight);
        if (height < 1000) {
            height = 1000;
        }

        effectiveHeight = height;
        console.log(width + ":" + height);
        var centre = {x: width/2, y: height/2};

        var svg = d3.select("#screen").append("svg").attr("width",width).attr("height", height);
        var screen = d3.select("#screen");
        screen.style("background", "#010203");

        var container = svg.append("g");

        return container;
    };

const initSounds = function() {
    __().sine({id: "sine", frequency: 150})
        .gain({id: "gain", gain: 1})
        .delay({delay: 0.5, feedback: 0.3, cutoff: 1500, id: "delay"})
        .gain({id: "MG1", gain: 0.6})

        .dac();


    __().lfo({id: "tremelo", frequency:4 ,modulates:"gain",gain:1,type:"square"}).connect("#gain");
    __().lfo({id: "pitch", frequency:0.15 ,modulates:"frequency",gain:100,type:"sine"}).connect("#sine");
    __().lfo({id: "pitch2", frequency:0.1 ,modulates:"gain",gain:5,type:"sine"}).connect("#pitch");


    __().square({id: "squareWave", frequency:150,gain:1})
        .gain({id: "gain2", gain: 1})
        .delay({delay: 2, feedback: 0.5, cutoff: 1500, id: "delay2"})
        .gain({id: "MG2", gain: 0.3})
        .dac();

     __().lfo({id: "squareOsc", frequency:0.1 ,modulates:"frequency",gain:10,type:"sine"}).connect("#squareWave");
    __().lfo({id: "tremelo2", frequency:0.5 ,modulates:"gain",gain:0.3, type:"sine"}).connect("#gain");
};

const buildSlideControl = function(valueName, property, minimumValue, maximumValue, width, startWidth, height, startHeight) {
    var getCoord = function(value) {
        const share = (value - minimumValue) / (maximumValue - minimumValue);

        return share*width + startWidth;
    };

    var currentValue = state[valueName][property];

    var ellipseIsGreen = true;

    var getDuration = function() {
        var share = (currentValue - minimumValue) / (maximumValue - minimumValue);
        return (1 - share) * 4900 + 100;
    };

    var ellipse = container.append("ellipse")
        .attr("cx", startWidth + width/2)
        .attr("cy", startHeight + height/2)
        .attr("rx", width/2)
        .attr("ry", height/2)
        .attr("fill", "black")
        .style("opacity", 1); //0.5 if we want them to overlap

    var circle = container
        .append("circle")
        .attr("id", valueName)
        .attr("r", 10)
        .attr("fill", "black")
        .attr("stroke", "none")
        .attr("stroke-width", "0px")
        .attr("cx", getCoord(currentValue))
        .attr("cy", startHeight + (height/2))
        .style("opacity", 1);

    var colourLoop = function() {
        var duration = getDuration();
        ellipse.transition().duration(duration)
            .attr("fill", ellipseIsGreen ? "purple" : "green");

        circle.transition().duration(duration)
            .attr("fill", ellipseIsGreen ? "orange" : "red");


        ellipseIsGreen = !ellipseIsGreen;

        window.setTimeout(colourLoop, duration);
    };

    colourLoop();

    const coordsInRange = function (x, y) {
        return (x > startWidth && x < startWidth + width && y > startHeight && y < startHeight + height);
    };

    const clickFunction = function(x, y) {
      if (coordsInRange(x, y)) {
          var xShare = (x - startWidth) / (width);

          var newValue = xShare * (maximumValue - minimumValue) + minimumValue;
          controls.dispatcher(valueName, property, newValue);
      }
    };

    controls.clickList.push(clickFunction);

    const updateFunction = function (updateValue) {
        console.log(updateValue + ":" + getCoord(updateValue));
        currentValue = updateValue;

        const attrObject = {};
        attrObject[property] = updateValue;
        __("#" + valueName).attr(attrObject);

        circle.transition().duration(100).attr("cx", getCoord(updateValue));
    };
    controls.setCallbacks(valueName, property, updateFunction);
};

var countDisplay = function() {
    var text = container.append("text")
        .text(state.users.count)
        .attr("x", effectiveWidth - paddingWidth)
        .attr("y", effectiveHeight - paddingWidth)
        .attr("fill", "white");

    const updateFunction = function (updateValue) {
        currentValue = updateValue;
        text.transition().duration(100).text(state.users.count);
    };

    controls.setCallbacks("users", "count", updateFunction);
};

container = initD3();

const init = function(event) {
    if (initted) {
        controls.clicker(event);
        return;
    }
    initted = true;

    initSounds();

    var leftPad = 2*paddingWidth / 3;
    var itemWidth = effectiveWidth / 2;
    var secondPad = itemWidth + 2*leftPad;

    buildSlideControl("tremelo", "frequency",1, 10, itemWidth, leftPad, 30, 30);
    buildSlideControl("pitch", "frequency", 0.05, 2, itemWidth, leftPad, 30, 60);
    buildSlideControl("pitch2", "gain",5, 100, itemWidth, leftPad, 30, 90);
    buildSlideControl("delay", "delay",0.05, 2, itemWidth, leftPad, 30, 120);
    buildSlideControl("delay", "feedback",0, 0.8, itemWidth, leftPad, 30, 150);

    buildSlideControl("squareWave", "frequency",20, 200, itemWidth, secondPad, 30, 30);
    buildSlideControl("squareOsc", "gain",1, 100, itemWidth, secondPad, 30, 60);
    buildSlideControl("squareOsc", "frequency",0, 1, itemWidth, secondPad, 30, 90);
    buildSlideControl("tremelo2", "frequency",0.1, 2, itemWidth, secondPad, 30, 120);
    buildSlideControl("tremelo2", "gain",0, 0.7, itemWidth, secondPad, 30, 150);
    countDisplay();
    __("#sine").play();
    __("#squareWave").play();

    window.setTimeout(initSocket, 100);
    // initSocket();

    //*
    // CHANGES:
    // kaos pad section
    // mini-chat window,
    // online counter (working ish)
    // more controls on current things (osc speed, depth, second delay time etc.)
    // weclome page
    // Names on the controls
    // Different colourings on different control sections (perhaps?) (colourschemes)
    // relative volume controls. /. crossfade for 2 sections
    // interrupted transitions occasionally (colour transition interrupting position transition? do it with groupings?)
    //
    //
    // Break into seperate git project
    // Work out how to deploy this mofo
    //
    // *//


};

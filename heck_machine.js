
var initted = false;
var container = null;
var effectiveWidth;
var paddingWidth;
var effectiveHeight;
var socket;

var state = {
    crossfade: {volume: 0.3},
    tremelo: { frequency: 4},
    lowpass1: {frequency: 150},
    pitch: {frequency: 0.15},
    pitch2: {gain: 5},
    delay: {delay: 0.5, feedback: 0.3},
    drySignal: {gain: 1},
    squareWave: {frequency: 150},
    squareOsc: {gain: 10, frequency: 0.1},
    tremelo2: {frequency: 0.5, gain: 0.3},
    kaosGain: {gain: 0},
    kaosSquare: {frequency: 400},
    kaosDelay: {delay: 1},
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
    mouseIsDown: false,
    effectCallbacks: {},
    sliderCallbacks: [],
    mouseOverCallbacks: [],
    mouseDown: function(event) {
        var x = event.clientX;
        var y = event.clientY;
        controls.sliderCallbacks.map(clickMethod => clickMethod(x, y));
    },
    mouseUp: function(event) {
    },
    mouseMove: function(event) {
        var x = event.clientX;
        var y = event.clientY;

      if (event.buttons === 1 || event.buttons === 3) {
          controls.sliderCallbacks.map(clickMethod => clickMethod(x, y));
      }


      controls.mouseOverCallbacks.map(clickMethod => clickMethod(x, y));
    },
    reciever: function(valueName, property, value) {
        controls.effectCallbacks[valueName][property](value);
        state[valueName][property] = value;
    },
    dispatcher: function(valueName, property, value) {
        controls.reciever(valueName, property, value);
        socket.emit('dial move', {valueName: valueName, property: property, value: value});
    },
    setCallbacks: function(valueName, property, callback) {
        if (!controls.effectCallbacks[valueName]) {
            controls.effectCallbacks[valueName] = {}
        }

        controls.effectCallbacks[valueName][property] = callback;
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
    //kaos pad
    __().saw({id: "kaosSquare", frequency:400,gain:1})
        .lowpass({id: "kaosLowPass", frequency: 500})
        .gain({id: "kaosGain", gain: 0});


    __().gain({id: "MG3", gain: 1})
        .dac();
    __().delay({delay: 1, feedback: 0.3, cutoff: 1500, id: "kaosDelay"}).connect("#MG3");





    __("#kaosGain").connect("#kaosDelay");
    __("#kaosGain").connect("#MG3");



//left panel
    __().gain({id: "MG1", gain: 0.7})
        .dac();

    __().sine({id: "sine", frequency: 150})
        .lowpass({id: "lowpass1", frequency: 500})
        .gain({id: "gain", gain: 1});

    __().delay({delay: 0.5, feedback: 0.3, cutoff: 1500, id: "delay"}).connect("#MG1");

    __("#gain").gain({id: "drySignal", gain: 1}).connect("#MG1");
    __("#gain").connect("#delay");

    __().lfo({id: "tremelo", frequency:4 ,modulates:"gain",gain:1,type:"square"}).connect("#gain");
    __().lfo({id: "pitch", frequency:0.15 ,modulates:"frequency",gain:100,type:"sine"}).connect("#sine");
    __().lfo({id: "pitch2", frequency:0.1 ,modulates:"gain",gain:5,type:"sine"}).connect("#pitch");


    //second
    __().gain({id: "MG2", gain: 0.3})
        .dac();

    __().delay({delay: 2, feedback: 0.5, cutoff: 1500, id: "delay2"})
        .connect("#MG2");


    __().square({id: "squareWave", frequency:150,gain:1})
        .gain({id: "gain2", gain: 1});

    __("#gain2").connect("#delay2");
    __("#gain2").gain({id: "drySignal2", gain: 1}).connect("#MG2");

     __().lfo({id: "squareOsc", frequency:0.1 ,modulates:"frequency",gain:10,type:"sine"}).connect("#squareWave");
    __().lfo({id: "tremelo2", frequency:0.5 ,modulates:"gain",gain:0.3, type:"sine"}).connect("#gain2");




};

const buildSlideControl = function(description, valueName, property, minimumValue, maximumValue, width, startWidth, height, startHeight) {
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

    container.append("text")
        .text(description)
        .attr("x", startWidth + 100)
        .attr("y", startHeight + 18)
        .style("font-size", "14px")
        .attr("fill", "white")
        .style("opacity", 0.7);


    var circleGroup = container.append("g")
        .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")");

    var circle = circleGroup
        .append("circle")
        .attr("id", valueName)
        .attr("r", 10)
        .attr("fill", "black")
        .attr("stroke", "none")
        .attr("stroke-width", "0px")
        .attr("cx", 0)
        .attr("cy", 0)
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

    controls.sliderCallbacks.push(clickFunction);

    const updateFunction = function (updateValue) {
        console.log(updateValue + ":" + getCoord(updateValue));
        currentValue = updateValue;

        __("#" + valueName).ramp(updateValue,0.1,property);

        circleGroup.transition()
            .duration(100)
            .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")")
            .ease("linear");
    };
    controls.setCallbacks(valueName, property, updateFunction);
};

const buildCrossFadeControl = function(description, width, startWidth, height, startHeight) {
    var getCoord = function(value) {
        return value*width + startWidth;
    };

    var currentValue = state.crossfade.volume;

    var ellipseIsGreen = true;

    var ellipse = container.append("ellipse")
        .attr("cx", startWidth + width/2)
        .attr("cy", startHeight + height/2)
        .attr("rx", width/2)
        .attr("ry", height/2)
        .attr("fill", "red")
        .style("opacity", 1); //0.5 if we want them to overlap

    container.append("text")
        .text(description)
        .attr("x", startWidth + 100)
        .attr("y", startHeight + 18)
        .style("font-size", "14px")
        .attr("fill", "white")
        .style("opacity", 0.7);


    var circleGroup = container.append("g")
        .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")");

    var circle = circleGroup
        .append("circle")
        .attr("id", "crossfade")
        .attr("r", 10)
        .attr("fill", "black")
        .attr("stroke", "none")
        .attr("stroke-width", "0px")
        .attr("cx", 0)
        .attr("cy", 0)
        .style("opacity", 1);

    // var colourLoop = function() {
    //     var duration = getDuration();
    //     ellipse.transition().duration(duration)
    //         .attr("fill", ellipseIsGreen ? "purple" : "green");
    //
    //     circle.transition().duration(duration)
    //         .attr("fill", ellipseIsGreen ? "orange" : "red");
    //
    //
    //     ellipseIsGreen = !ellipseIsGreen;
    //
    //     window.setTimeout(colourLoop, duration);
    // };
    //
    // colourLoop();

    const coordsInRange = function (x, y) {
        return (x > startWidth && x < startWidth + width && y > startHeight && y < startHeight + height);
    };

    const clickFunction = function(x, y) {
        if (coordsInRange(x, y)) {
            var newValue = (x - startWidth) / (width);

            controls.dispatcher("crossfade", "volume", newValue);
        }
    };

    controls.sliderCallbacks.push(clickFunction);

    const updateFunction = function (updateValue) {
        console.log(updateValue + ":" + getCoord(updateValue));
        currentValue = updateValue;

        __("#MG1").ramp((1 - currentValue),0.2,"gain");
        __("#MG2").ramp(currentValue,0.2,"gain");

        circleGroup.transition().duration(100).attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")");
    };
    controls.setCallbacks("crossfade", "volume", updateFunction);
};


const buildKaosControl = function(width, startWidth, height, startHeight) {
    // var currentValue = state[valueName][property];

    var square = container.append("rect")
        .attr("x", startWidth)
        .attr("y", startHeight)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "grey")
        .style("opacity", 1); //0.5 if we want them to overlap



    const coordsInRange = function (x, y) {
        return (x > startWidth && x < startWidth + width && y > startHeight && y < startHeight + height);
    };

    const clickFunction = function(x, y) {
        if (coordsInRange(x, y)) {
            controls.dispatcher("kaosGain", "gain", 1);


            var xShare = (x - startWidth) / (width);
            var freq = 150 + 350*xShare;
            controls.dispatcher("kaosSquare", "frequency", freq);



            var yShare = (y - startHeight) / height;
            var delay = 100 + 1500*(1-yShare);
            controls.dispatcher("kaosDelay", "delay", delay);
        } else {
            controls.dispatcher("kaosGain", "gain", 0);
        }
    };

    controls.mouseOverCallbacks.push(clickFunction);

    const gainFunction = function (updateValue) {
        currentValue = updateValue;

        __("#kaosGain").ramp(updateValue, 0.1, "gain");
        // __("#" + valueName).ramp(updateValue,0.1,property);
        //
        // circleGroup.transition()
        //     .duration(100)
        //     .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")")
        //     .ease("linear");
    };
    controls.setCallbacks("kaosGain", "gain", gainFunction);

    const freqFunction = function (updateValue) {
        currentValue = updateValue;

        __("#kaosSquare").ramp(updateValue, 0.1, "frequency");
        // __("#" + valueName).ramp(updateValue,0.1,property);
        //
        // circleGroup.transition()
        //     .duration(100)
        //     .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")")
        //     .ease("linear");
    };
    controls.setCallbacks("kaosSquare", "frequency", freqFunction);

    const delayFunction = function (updateValue) {
        currentValue = updateValue;

        //__("#kaosDelay").ramp(updateValue, 0.1, "delay");
        __("#kaosLowpass").ramp(updateValue, 0.1, "frequency");


        // __("#" + valueName).ramp(updateValue,0.1,property);
        //
        // circleGroup.transition()
        //     .duration(100)
        //     .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")")
        //     .ease("linear");
    };
    controls.setCallbacks("kaosDelay", "delay", delayFunction);
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

var homeScreen = function() {
    var position = (paddingWidth + effectiveWidth)/2 - 140;

    container.append("text")
        .text("Heck Machine by Karl M V Waugh")
        .attr("x", position)
        .attr("y", 100)
        .style("font-size", "34px")
        .attr("fill", "white");

    container.append("text")
        .text("A Synth Room For All To Share")
        .attr("x", position)
        .attr("y", 130)
        .style("font-size", "24px")
        .attr("fill", "white");

    container.append("text")
        .text("Click Anywhere To Begin!")
        .attr("x", position)
        .attr("y", 160)
        .style("font-size", "24px")
        .attr("fill", "white");
};

container = initD3();
homeScreen();

const mouseDown = function(event) {
    if (initted) {
        controls.mouseDown(event);
    }
};

const mouseUp = function(event) {
    if (initted) {
        controls.mouseUp(event);
    }
};

const mouseMove = function(event) {
    if (initted) {
        controls.mouseMove(event);
    }
};

const init = function(event) {
    if (initted) {
        //controls.mouseDown(event);
        return;
    }
    initted = true;

    container.selectAll("text").transition().duration(500).style("opacity", 0).remove();

    initSounds();

    var leftPad = 2*paddingWidth / 3;
    var itemWidth = effectiveWidth / 2;
    var secondPad = itemWidth + 2*leftPad;

    buildSlideControl("Tremelo Speed", "tremelo", "frequency",0, 20, itemWidth, leftPad, 30, 30);
    buildSlideControl("Low Pass", "lowpass1", "frequency",0, 500, itemWidth, leftPad, 30, 60);
    buildSlideControl("Pitch Wobble Speed", "pitch", "frequency", 0, 2, itemWidth, leftPad, 30, 90);
    buildSlideControl("Pitch Wobble Amount", "pitch2", "gain",0, 100, itemWidth, leftPad, 30, 120);
    buildSlideControl("Delay Time", "delay", "delay",0, 2, itemWidth, leftPad, 30, 150);
    buildSlideControl("Delay Feedback", "delay", "feedback",0, 1, itemWidth, leftPad, 30, 180);
    buildSlideControl("Dry Delay", "drySignal", "gain",0, 1, itemWidth, leftPad, 30, 210);


    buildSlideControl("Frequency", "squareWave", "frequency",0, 200, itemWidth, secondPad, 30, 30);
    buildSlideControl("Pitch Wobble Speed", "squareOsc", "frequency",0, 20, itemWidth, secondPad, 30, 60);
    buildSlideControl("Pitch Wobble Amount", "squareOsc", "gain",0, 100, itemWidth, secondPad, 30, 90);
    buildSlideControl("Tremelo Speed", "tremelo2", "frequency",0, 20, itemWidth, secondPad, 30, 120);
    buildSlideControl("Tremelo Amount", "tremelo2", "gain",0, 1, itemWidth, secondPad, 30, 150);

    buildCrossFadeControl("Cross Fade", effectiveWidth, paddingWidth, 30, 240);

    var kaosWidth = itemWidth*4/5;
    buildKaosControl(kaosWidth, leftPad, kaosWidth, 280);

    countDisplay();
    __("#sine").play();
    __("#squareWave").play();
    __("#kaosSquare").play();

    window.setTimeout(initSocket, 100);
    // initSocket();

    //*
    // CHANGES:
    // kaos pad section
    // mini-chat window,
    // online counter (working ish)
    // more controls on current things (osc speed, depth, second delay time etc.) - dry delay etc
    // Different colourings on different control sections (perhaps?) (colourschemes)
    // relative volume controls. /. crossfade for 2 sections
    // REWIRE second to allow more controls.
    //
    // Work out how to deploy this mofo (ish - does it change on change)
    // Drag the dials.
    //
    // make new settings easier to insert (agnostic backend/state model)
    // logarhythmic and/or linear scales on different sliders
    //
    // *//


};

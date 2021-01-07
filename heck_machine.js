
var initted = false;
var container = null;
var effectiveWidth;
var paddingWidth;
var effectiveHeight;
var socket = { emit: function(){}};

const getTypingColour = function() {
  //200-255
    // 135-255
    // 100-255

    const first = 220 + Math.round(Math.random()*35);
    const second = 180 + Math.round(Math.random()*75);
    const third = 140 + Math.round(Math.random()*115);

    var coin1 = Math.random();
    var coin2 = Math.random();

    var r = coin1 < (1/3) ? first : coin1 < (2/3) ? second : third;

    var remainingFirst = (r === first) ? second : first;
    var remainingSecond = (r === third) ? second : third;

    var g = coin2 < (1/2) ? remainingFirst : remainingSecond;

    var b = (g === remainingFirst) ? remainingSecond : remainingFirst;

    return  "rgb(" + r + ", " + g + ", " + b + ")";

};

const typingColour = getTypingColour();



var state = {
    crossfade: {volume: 0.3},
    tremelo: { frequency: 2},
    lowpass1: {frequency: 150, q: 0},
    pitch: {frequency: 0.15},
    pitch2: {gain: 5},
    delay: {delay: 0.5, feedback: 0.3},
    drySignal: {gain: 1},
    squareWave: {frequency: 66},
    squareOsc: {gain: 10, frequency: 0.1},
    tremelo2: {frequency: 0.5, gain: 0.3},
    // kaosGain: {gain: 0},
    // kaosSquare: {frequency: 400},
    // kaosDelay: {delay: 1},
    kaos: { settings: {
            on: false,
            x: 0,
            y: 0,
            freq: 150,
            lowpass: 300,
            split: 0
        }},
    delay2: {delay: 0.5, feedback: 0.3},
    drySignal2: {gain: 1},
    users: {count: 0}
};


var initSocket = function() {

    socket = io();

    socket.on('dial move', (msg) => {
        controls.reciever(msg.valueName, msg.property, msg.value);
    });

    socket.on('typed', (msg) => {
        controls.typed(msg);
    });

    socket.on('whole state', (receivedState) => {
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
    keyPressCallbacks: [],
    mouseDown: function(event) {
        var x = event.clientX;
        var y = event.clientY;
        controls.sliderCallbacks.map(clickMethod => clickMethod(x, y));
    },
    mouseMove: function(event) {
        var x = event.clientX;
        var y = event.clientY;

        var isMouseButtonDown = event.buttons === 1 || event.buttons === 3

      if (isMouseButtonDown) {
          controls.onDragCallbacks.map(clickMethod => clickMethod(x, y));
      }


      controls.mouseOverCallbacks.map(clickMethod => clickMethod(x, y, isMouseButtonDown));
    },
    touchStart: function(event) {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];

            var x = touch.clientX;
            var y = touch.clientY;
            controls.sliderCallbacks.map(clickMethod => clickMethod(x, y));
        }



    },
    touchMove: function(event) {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            var x = touch.clientX;
            var y = touch.clientY;
            controls.sliderCallbacks.map(clickMethod => clickMethod(x, y));
            controls.mouseOverCallbacks.map(clickMethod => clickMethod(x, y));
        }
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
    },
    keyPress: function(event) {
        const msg = { letter: event.key, colour: typingColour};
        socket.emit('typed', msg);
        controls.keyPressCallbacks.map(clickMethod => clickMethod(msg.letter, msg.colour));
    },
    typed: function(msg) {

        controls.keyPressCallbacks.map(clickMethod => clickMethod(msg.letter, msg.colour));
    }
};


const initD3 = function() {
        var width = document.body.clientWidth;
        effectiveWidth = width * 0.9;
        paddingWidth = width*0.05;
        var height = document.body.clientHeight;
        if (height < 500) {
            height = 500;
        }

        effectiveHeight = height;
        var centre = {x: width/2, y: height/2};

        var svg = d3.select("#screen").append("svg").attr("width",width).attr("height", height);
        var screen = d3.select("#screen");
        screen.style("background", "#010203");

        return svg.append("g");
    };

const initSounds = function() {
    //kaos pad
    __().gain({id: "mute", gain: 1}).dac();

    __().saw({id: "kaosSaw", frequency:400,gain:1})
        .gain({id: "kaosSawVolume", gain: 1})
        .lowpass({id: "kaosLowPass", frequency: 500})
        .gain({id: "kaosTremGain", gain: 1})
        .gain({id: "kaosGain", gain: 0});

    __().sine({id: "kaosSine", frequency: 400, gain: 0})
        .gain({id: "kaosSineVolume", gain: 0})
        .connect("kaosLowpass");


    __().gain({id: "MG3", gain: 1})
        .gain({id: "MG4", gain: 0.8}) //private adjustment
        .connect("#mute");
    __().delay({delay: 1, feedback: 0.3, cutoff: 1500, id: "kaosDelay"}).connect("#MG3");

    __().lfo({id: "kaosTremelo", frequency:8 ,modulates:"gain",gain:1,type:"sine"}).connect("#kaosTremGain");




    __("#kaosGain").connect("#kaosDelay");
    __("#kaosGain").connect("#MG3");



//left panel
    __().gain({id: "MG1", gain: 0.7})
        .connect("#mute");

    __().sine({id: "sine", frequency: 150})
        .lowpass({id: "lowpass1", frequency: 500, q: 0})
        .gain({id: "gain", gain: 1});

    __().delay({delay: 0.5, feedback: 0.3, cutoff: 1500, id: "delay"}).connect("#MG1");

    __("#gain").gain({id: "drySignal", gain: 1}).connect("#MG1");
    __("#gain").connect("#delay");

    __().lfo({id: "tremelo", frequency:4 ,modulates:"gain",gain:1,type:"square"}).connect("#gain");
    __().lfo({id: "pitch", frequency:0.15 ,modulates:"frequency",gain:100,type:"sine"}).connect("#sine");
    __().lfo({id: "pitch2", frequency:0.1 ,modulates:"gain",gain:5,type:"sine"}).connect("#pitch");


    //second
    __().gain({id: "MG2", gain: 0.3})
        .connect("#mute");

    __().delay({delay: 2, feedback: 0.5, cutoff: 1500, id: "delay2"})
        .connect("#MG2");


    __().square({id: "squareWave", frequency:150,gain:1})
        .gain({id: "gain2", gain: 1});

    __("#gain2").connect("#delay2");
    __("#gain2").gain({id: "drySignal2", gain: 1}).connect("#MG2");

     __().lfo({id: "squareOsc", frequency:0.1 ,modulates:"frequency",gain:10,type:"sine"}).connect("#squareWave");
    __().lfo({id: "tremelo2", frequency:0.5 ,modulates:"gain",gain:0.3, type:"sine"}).connect("#gain2");
};

const colourScheme = {
    0: {upDial: "#AA00FF", downDial: "#00FFA0", upDot: "#FFAA00", downDot: "#FF000A"},
    1: {upDial: "#0AAA0A", downDial: "#FF00AA", upDot: "#00AAFF", downDot: "#F0A0F0"}
};

const buildSlideControl = function(description, valueName, property, minimumValue, maximumValue, width, startWidth, height, startHeight, colourSchemeNumber) {
    var getCoord = function(value) {
        const share = (value - minimumValue) / (maximumValue - minimumValue);

        return share*width + startWidth;
    };

    var currentValue = state[valueName][property];

    var ellipseIsUp = true;

    var getDuration = function() {
        var share = (currentValue - minimumValue) / (maximumValue - minimumValue);


        return (1 - share) * 4950 + 50;
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
        .style("opacity", 0.7)
        .style("pointer-events", "none");


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

    const colours = colourScheme[colourSchemeNumber];

    var colourLoop = function() {
        var duration = getDuration();

        ellipse.transition().duration(duration)
            .attr("fill", ellipseIsUp ? colours.upDial : colours.downDial);

        circle.transition().duration(duration)
            .attr("fill", ellipseIsUp ? colours.upDot : colours.downDot);


        ellipseIsUp = !ellipseIsUp;

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
    const updateSynthAndVisuals = function (updateValue) {
        currentValue = updateValue;

        __("#" + valueName).ramp(updateValue,0.1,property);

        circleGroup.transition()
            .duration(100)
            .attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")")
            .ease("linear");
    };
    controls.setCallbacks(valueName, property, updateSynthAndVisuals);
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
        .style("opacity", 0.7)
        .style("pointer-events", "none");

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
        currentValue = updateValue;

        __("#MG1").ramp((1 - currentValue),0.2,"gain");
        __("#MG2").ramp(currentValue,0.2,"gain");

        circleGroup.transition().duration(100).attr("transform", "translate(" + getCoord(currentValue) + ","  + (startHeight + (height/2)) + ")");
    };
    controls.setCallbacks("crossfade", "volume", updateFunction);
};


const buildKaosControl = function(width, startWidth, height, startHeight) {
    // var currentValue = state[valueName][property];
    var myId = Math.round(Math.random()*1000);

    var square = container.append("rect")
        .attr("x", startWidth)
        .attr("y", startHeight)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "grey")
        .style("opacity", 1); //0.5 if we want them to overlap

    const releaseTheNode = function(x, y, id) {
      var node = container.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 0)
          .attr("fill", "none")
          .attr("stroke", id === myId ? "red" : "green")
          .attr("stroke-width", "1px")
          .style("opacity", 1);

      node.transition().duration(5000)
          .attr("r", 1000)
          .style("opacity", 0)
          .remove();
    };

    const coordsInRange = function (x, y) {
        return (x > startWidth && x < startWidth + width && y > startHeight && y < startHeight + height);
    };

    const clickFunction = function(x, y, isMouseButtonDown) {
        if (coordsInRange(x, y)) {
            var xShare = (x - startWidth) / (width);
            var freq = 150 + 350*xShare;

            var yShare = (y - startHeight) / height;
            var obj = {
                on: !isMouseButtonDown,
                x: xShare,
                y: yShare,
                freq: freq,
                split: yShare,
                id: myId
            };

            controls.dispatcher("kaos", "settings", obj);
        } else {
            var previous = state.kaos.settings;
            var obj = {
                on: false,
                x: previous.x,
                y: previous.y,
                freq: previous.freq,
                split: previous.split,
                id: myId
            };

            controls.dispatcher("kaos", "settings", obj);
        }
    };

    controls.mouseOverCallbacks.push(clickFunction);

    const callback = function (updateValue) {
        const gain = updateValue.on ? 1 : 0;

        __("#kaosGain").ramp(gain, 0.1, "gain");
        __("#kaosSaw").ramp(updateValue.freq, 0.1, "frequency");
        __("#kaosSine").ramp(updateValue.freq, 0.1, "frequency");

        __("#kaosSawVolume").ramp(1 - updateValue.split, 0.1, "gain");
        __("#kaosSineVolume").ramp(updateValue.split, 0.1, "gain");
        __("#kaosTremelo").ramp(1 - updateValue.split, 0.1, "gain");

        if (updateValue.on) {
            var xValue = updateValue.x*width + startWidth;
            var yValue = updateValue.y*height + startHeight;
            //            var xShare = (x - startWidth) / (width);
            //             var freq = 150 + 350*xShare;
            //
            //             var yShare = (y - startHeight) / height;

            releaseTheNode(xValue, yValue, updateValue.id);
            var red = Math.round(updateValue.y * 255);
            var blue = Math.round(updateValue.x * 255);
            var newColour = "rgb(" + red + ", 0, " + blue + ")";
            square.transition().duration(100).attr("fill", newColour);
        } else {
            square.transition().duration(100).attr("fill", "grey");
        }

        // __("#kaosLowpass").ramp(updateValue.lowpass, 0.1, "frequency");

    };

    controls.setCallbacks("kaos", "settings", callback);
};

const buildMuteControl = function(width, startWidth, height, startHeight) {
    //width, startWidth, height, startHeight
    var button = container.append("ellipse")
        .attr("cx", startWidth + width/2)
        .attr("cy", startHeight + height/2)
        .attr("rx", width/2)
        .attr("ry", height/2)
        .attr("fill", "green")
        .style("opacity", 1); //0.5 if we want them to overlap

    var text = container.append("text")
        .text("Mute")
        .attr("x", startWidth + 5)
        .attr("y", startHeight + 15)
        .style("font-size", "14px")
        .attr("fill", "white")
        .style("opacity", 0.7)
        .style("pointer-events", "none");

    const coordsInRange = function (x, y) {
        return (x > startWidth && x < startWidth + width && y > startHeight && y < startHeight + height);
    };

    var isMuted = false;
    var cantMute = false;

    const clickFunction = function(x, y) {
        if (coordsInRange(x, y)) {
            if (cantMute) {
                return;
            }

            cantMute = true;
            window.setTimeout(function () {
                cantMute = false
            }, 1000);

            //mute/unmute
           if (isMuted) {
               __("#mute").ramp(1,0.1,"gain");
               button.transition().duration(100).attr("fill", "green");
               text.transition().duration(100).text("Mute");
           } else {
               __("#mute").ramp(0,0.1,"gain");
               button.transition().duration(100).attr("fill", "red");
               text.transition().duration(100).text("Unmute");
           }

           isMuted = !isMuted;
        }
    };

    controls.sliderCallbacks.push(clickFunction);

};

const buildTypewriter = function(width, startWidth, height, startHeight) {
  var cursor = {x: startWidth, y: startHeight};
  var fadeTime = 20000;

  const incrementCursor =  function () {
        cursor.x += 15;
        if (cursor.x > startWidth + width) {
            cursor.x = startWidth;
            cursor.y += 15;
        }

        if (cursor.y > startHeight + height) {
            cursor.y = startHeight;
        }
  };


  const returnCarage = function() {
    cursor.x = startWidth;
    cursor.y += 15;

    if (cursor.y > startHeight + height) {
      cursor.y = startHeight;
    }
  };

  const callback = function(letter, colour) {
      if (letter === "Enter") {
          returnCarage();
          return;
      }

      const typed  = container.append("text")
          .text(letter)
          .attr("x", cursor.x)
          .attr("y", cursor.y)
          .style("font-size", "28px")
          .attr("fill", colour)
          .style("opacity", 0.7)
          .style("pointer-events", "none");



      typed.transition().duration(fadeTime).attr("x", 0).attr("y", 0).style("opacity", 0).remove();

      incrementCursor();
  };

    controls.keyPressCallbacks.push(callback);

};

var countDisplay = function() {
    var text = container.append("text")
        .text(state.users.count)
        .attr("x", effectiveWidth + paddingWidth)
        .attr("y", 25)
        .attr("fill", "white")
        .style("pointer-events", "none");;

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

    container.append("text")
        .text("All changes made are shared by all users")
        .attr("x", position)
        .attr("y", 210)
        .style("font-size", "20px")
        .attr("fill", "white");

    container.append("text")
        .text("Except for a mute button in the top left")
        .attr("x", position)
        .attr("y", 240)
        .style("font-size", "20px")
        .attr("fill", "white");

    container.append("text")
        .text("Click, drag, move and type to change things....")
        .attr("x", position)
        .attr("y", 270)
        .style("font-size", "20px")
        .attr("fill", "white");

    container.append("text")
        .text("built over a few days Christmas 2020")
        .attr("x", position)
        .attr("y", 330)
        .style("font-size", "20px")
        .attr("fill", "white");
};

container = initD3();
homeScreen();


const init = function() {
    if (initted) {
        //controls.mouseDown(event);
        return;
    }
    initted = true;

    document.body.addEventListener('mousedown', function (e) {
        controls.mouseDown(e);
    });

    document.body.addEventListener('mousemove', function (e) {
        controls.mouseMove(e);
    });

    document.body.addEventListener('keypress', function (e) {
        controls.keyPress(e);
    });

    document.body.addEventListener('touchstart', function (e) {
        controls.touchStart(e);
    });

    document.body.addEventListener('touchmove', function (e) {
        controls.touchMove(e);
    });

    container.selectAll("text").transition().duration(500).style("opacity", 0).remove();

    initSounds();

    var leftPad = 2*paddingWidth / 3;
    var itemWidth = effectiveWidth / 2;
    var secondPad = itemWidth + 2*leftPad;
    var itemHeight = 20;
    var initalHeight = 10;
    var heightFor = (i) => i*itemHeight + initalHeight;

    buildMuteControl(initalHeight*2, initalHeight, initalHeight*2, initalHeight);
    buildSlideControl("Tremelo Speed", "tremelo", "frequency",0, 20, itemWidth, leftPad, itemHeight, heightFor(1), 0);
    buildSlideControl("Low Pass", "lowpass1", "frequency",0, 500, itemWidth, leftPad, itemHeight, heightFor(2), 0);
    buildSlideControl("Q", "lowpass1", "q",0, 66, itemWidth, leftPad, itemHeight, heightFor(3), 0);
    buildSlideControl("Pitch Wobble Speed", "pitch", "frequency", 0, 2, itemWidth, leftPad, itemHeight, heightFor(4), 0);
    buildSlideControl("Pitch Wobble Amount", "pitch2", "gain",0, 100, itemWidth, leftPad, itemHeight, heightFor(5), 0);
    buildSlideControl("Delay Time", "delay", "delay",0, 2, itemWidth, leftPad, itemHeight, heightFor(6), 0);
    buildSlideControl("Delay Feedback", "delay", "feedback",0, 1, itemWidth, leftPad, itemHeight, heightFor(7), 0);
    buildSlideControl("Dry Delay", "drySignal", "gain",0, 1, itemWidth, leftPad, itemHeight, heightFor(8), 0);


    buildSlideControl("Frequency", "squareWave", "frequency",0, 200, itemWidth, secondPad, itemHeight, heightFor(1), 1);
    buildSlideControl("Pitch Wobble Speed", "squareOsc", "frequency",0, 20, itemWidth, secondPad, itemHeight, heightFor(2), 1);
    buildSlideControl("Pitch Wobble Amount", "squareOsc", "gain",0, 100, itemWidth, secondPad, itemHeight, heightFor(3), 1);
    buildSlideControl("Tremelo Speed", "tremelo2", "frequency",0, 20, itemWidth, secondPad, itemHeight, heightFor(4), 1);
    buildSlideControl("Tremelo Amount", "tremelo2", "gain",0, 1, itemWidth, secondPad, itemHeight, heightFor(5), 1);
    buildSlideControl("Delay Time", "delay2", "delay",0, 2, itemWidth, secondPad, itemHeight, heightFor(6), 1);
    buildSlideControl("Delay Feedback", "delay2", "feedback",0, 1, itemWidth, secondPad, itemHeight, heightFor(7), 1);
    buildSlideControl("Dry Delay", "drySignal2", "gain",0, 1, itemWidth, secondPad, itemHeight, heightFor(8), 1);

    buildCrossFadeControl("Cross Fade", effectiveWidth, paddingWidth, 30, 190);

    var kaosWidth = itemWidth*7/10;
    buildKaosControl(kaosWidth, leftPad*2, kaosWidth, 220);

    buildTypewriter(effectiveWidth - kaosWidth, kaosWidth + 2*leftPad + 30, 200, 250);

    countDisplay();
    __("#sine").play();
    __("#squareWave").play();
    __("#kaosSquare").play();

    window.setTimeout(initSocket, 100);
    // initSocket();

    //*
    // CHANGES:
    // ADD REVERB, allow ambience controls.
    //
    // Work out how to deploy this mofo (ish - does it change on change)
    // logarhythmic and/or linear scales on different sliders
    // the drag sticks to the sliders
    // Kaos pad mute
    // *//


};

const delayedInit = function() {
  window.setTimeout(init, 100);
};

var checkTemp = require('./checkTemp.js');
var sensor = {
    socket: "localhost:3000",
    location: "London"
  };
var currentTemp = "";

checkTemp.checkTemp(sensor.socket, function(tempObject){
    //if (err) console.log('There was an error',err.message);
    currentTemp=tempObject;
    console.log("Current temp = " + JSON.stringify(currentTemp));
});
console.log("Current temp = " + JSON.stringify(currentTemp));

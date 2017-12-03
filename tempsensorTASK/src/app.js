//import tools
var checkTemp = require('./checkTemp.js');
var taskRouter = require('cce-task-routing');

//define parameters
var socialminer = '10.10.10.5';
var sensor = {
  socket: "10.10.10.212:3000",
  location: "London"
};

//parse arguments
//args.interval = temperature poll interval, default 5s
//args.threshold = temperature threshold, default 10ºC
//args.offline= offline mode for testing without TR API calls

var args = parseArguments();

//define vars
var currentTemp;
var trend;
var active = true;
var taskRefURL;

//init taskrouter
console.log("Initializing Task Router...")
if (!args.offline) taskRouter.init(socialminer, 100000, false);

//Inittialize sensor data
console.log("Initializing sensor data...")

//Initialise current temperature
currentTemp = checkTemp.checkTempSync(sensor.socket);
console.log("Checking current temperature on sensor = " + currentTemp)

//console.log("Current temp = " + currentTemp);

//start the loop
var refreshIntervalId = setInterval(dothisforever,args.interval*1000);


function dothisforever () {
  //check temperature
  var newTemp = checkTemp.checkTempSync(sensor.socket);
  //console.log("Current temp = " + currenttemp + " - New temp = " + newtemp)
  
  //Exit the program if Error happens
  if (newTemp==="ERR") {
    console.log("Exiting due to ERROR");
    clearInterval(refreshIntervalId);
  }


  //if newtemp higher than currenttemp, termperature is rising
  if (newTemp > currentTemp) {
    trend = "rising";
  //if we are currently active, which means that NO task has been sent yet, then check if newtemp is above threshold
    if (active) {
  // if newtemp is above threshold, send TASK and deactivate
      if (newTemp >= args.threshold) {
        console.log("Temperature rose ABOVE threshold(-" + args.threshold + "°C-)");
        console.log("Previous temperature = " + currentTemp + "°C - New temperature = " + newTemp + "°C");
        //send task
        console.log("sending TASK and deactivating");
        if (!args.offline) {
          console.log("actually sending");
          tempTaskRequest(sensor);
        }
        active=false;
      }
    }

  } else {
    trend="dropping";
    if (!active && (newTemp < args.threshold)) {
      console.log("Temperature dropped BELOW threshold(-" + args.threshold + "°C-)");
      console.log("Previous temperature = " + currentTemp + "°C - New temperature = " + newTemp + "°C");
      console.log("sending Cancel TASK and activating");
      if (!args.offline) {
        console.log("actually sending");
        tempTaskCancel();
      }
      active=true;
//TODO Send API call to cancel the TASK
    }
  }
  
  currentTemp = newTemp;
}



function tempTaskRequest(sensorParameters){
  // create an ordered array of call variables
  var callVarsArray = [sensor.socket, sensor.location, "callVar_value_3",
                       "callVar_value_4", "callVar_value_5", "callVar_value_6"];

  // create an ordered array of ECC variables
  var eccVarsArray = ["eccVar_value_1", "eccVar_value_2", "eccVar_value_3",
                      "eccVar_value_4", "eccVar_value_5", "eccVar_value_6"];

  // for `other` variables, create a javascript Map (ES05 spec.)
  var otherVarsMap = new Map();
  //otherVarsMap.set("podRefURL", "https://cs.com/context/pod/v1/podId/b066c3c0-c346-11e5-b3dd-3f1450b33459");
  //otherVarsMap.set("Social_Security_No", "876587357461");

  // The call to create a task returns a Promise, which when resolved
  // provides the Ref URL of the newly created Task (in case of success)
  var createRequest = taskRouter.createTaskRequest('someName', 'someTitle',
                                                      'someDescription', 'TR_TEMP',
                                                      callVarsArray, eccVarsArray, otherVarsMap, false);

  // define behavior on how to resolve the Promise
  createRequest.then (function(response) {
      // the `response` is a String that contains the refURL of the newly created task.
      console.log('Task created successfully. RefURL of created task = ' + response);
      // Preserve this and use it for all further operations on the same task.
      taskRefURL = response;
  }).catch (function(error) {
      console.log('Oops! Something went wrong.');
  });

}

function tempTaskCancel(){
  // The call to cancel a task returns a Promise, however there is no data 
  // in the response that is useful beyond the result of the request (success/failure) 
  var cancelRequest = taskRouter.cancelTaskRequest(taskRefURL);

  // define behavior on how to resolve the Promise 
  cancelRequest.then (function(response) {
    // the `response` does not really contain any data. Just indicates a successful cancellation. 
    console.log('Task with RefURL \'' + taskRefURL + '\' cancelled successfully.');
  }).catch (function(error) {
    console.log('Oops! Something went wrong.' + error);
  });
}


function parseArguments() {
  var ArgumentParser = require('argparse').ArgumentParser;
  var parser = new ArgumentParser({
    version: '0.3.1',
    addHelp: true,
    description: 'Temperature sensor CCE Task Routing API client'
  });
  parser.addArgument(['-i', '--interval'], {
    action: 'store',
    type: 'int',
    required: false,
    help: 'Interval in seconds for which you want to poll the sensor for temperature',
    dest: 'interval',
    defaultValue: 5
  });
  parser.addArgument(['-t', '--threshold'], {
    action: 'store',
    type: 'int',
    required: false,
    help: 'Temperature threshold in which you trigger TASK request in celcius',
    dest: 'threshold',
    defaultValue: 10
  });
  parser.addArgument(['-o', '--offline'], {
    action: 'storeTrue',
    help: 'Run in offline mode, no TASK will ever be sent',
    dest: 'offline'
  });
  var args = parser.parseArgs();
  return args;
}
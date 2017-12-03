var Client = require('node-rest-client').Client;

//GET temperature in a sync way using deasync package
function checkTempSync(socket){
  var sync = true;
  var temp = null;
  var responseData = {};
  var options = {
    mimetypes: {
            json: ["application/json"]
    }
  };
  var client = new Client(options);
  
  var req = client.get(prepareURL(socket), function (data, response) {
    responseData = data;
    sync = false;
  });
  req.on('requestTimeout', function (req) {
    console.log('request has expired');
    req.abort();
    responseData.temperature = "ERR";
    sync = false;
  });
 
  req.on('responseTimeout', function (res) {
    console.log('response has expired');
    responseData.temperature = "ERR";
    sync = false;
  });

  req.on('error', function (err) {
    console.log('request error: ' + err.message);
    responseData.temperature = "ERR";
    sync = false;
  });

  while(sync) {require('deasync').sleep(100);}
  return responseData.temperature;
}


//GET temperature in async function
function checkTemp (socket,callback){
  var options = {
    mimetypes: {
            json: ["application/json"]
    }
  };
  var client = new Client(options);
  var responseData = {};

  var req = client.get(prepareURL(socket), function (data, response) {
    responseData=data;
    callback(responseData);
  });

  req.on('requestTimeout', function (req) {
    console.log('request has expired');
    req.abort();
  });
 
  req.on('responseTimeout', function (res) {
    console.log('response has expired');
  });

  req.on('error', function (err) {
    console.log('request error', err);
  });

}


// Parse the URL
function prepareURL(socket){
  return "http://" + socket + "/temp";
}


module.exports.checkTemp = checkTemp;
module.exports.checkTempSync = checkTempSync;
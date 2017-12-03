var renderer = require("./renderer.js");
var readtemp = require ('./readTemp.js');

//2. Handle HTTP route GET / and update the temperature
function home(request, response) {
  //if url == "/" && GET
  if (request.url === "/") {
    //get the temperature from the file
      //on "end"
        //show temperature
      //on "error"
        //show error

    readtemp.readtemp(modifier,function(err,temp){
      if (err) {
        console.log('There was an error',err.message);
        response.statusCode = 503;
        response.end("There was an error" + err.message);
      }

      console.log(temp);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/html');
      renderer.view("header", {}, response);
      renderer.view("temperature", {temperature: temp}, response);
      renderer.view("footer", {}, response);
      response.end();
    });
  }
}


//3. Handle HTTP route GET /temp as an API request and return temperature in JSON format
function temp(request, response, modifier) {
  //if url == "/temp" && GET
  if (request.url === "/temp") {

    readtemp.readtemp(modifier,function(err,temp){
      if (err) {
        console.log('There was an error',err.message);
        response.statusCode = 503;
        response.end("There was an error" + err.message);
      }
      //myObj = {"temperature":temp};
      console.log({"temperature":temp});
      //var myJSON = JSON.stringify(myObj);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({"temperature":temp}));
    });
  }
}

module.exports.home=home;
module.exports.temp=temp;

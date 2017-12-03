//Reusable async function that returns TEMP in the format XX.XX
//3. Function that handles reading of temperature from file
  // read from file
    //format into float with 2 decimals XX.XX

function readtemp(modifier,callback) {
    //tools needed
    var fs = require('fs');
    
    //variables
    var sensorserialnum="28-0516a4906fff";
    var path="/sys/bus/w1/devices/"
    var file="w1_slave";

    //if in demo mode, we change path to current dir
    if (modifier) {
      sensorserialnum = "";
      path=".";
    }
    

    fs.readFile(path + sensorserialnum + "/" + file,'utf8',function(err,data){
      if (err) return callback(err);
      //Let's parse the data, we only need temperature which is the last key=value pair in the second line t=XXXXX
      //1st we get the second line
      var secondline = data.split("\n")[1];
      //2nd we get the last text which is allways the 10th string if we split by " "
      var temperaturestring = secondline.split(" ")[9].split("=")[1];
      //3rd convert to float and divide by 1000
      var temperaturefloat = parseFloat(temperaturestring) / 1000;
      //4th return temperature with 2 decimals in degrees Celcius
      return callback(null,temperaturefloat.toFixed(2));
    });
}

module.exports.readtemp = readtemp;

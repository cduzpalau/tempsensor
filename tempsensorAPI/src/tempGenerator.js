var fridge = [0,0,1,0,0,0,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,15,15,14,14,13,13,13,12,12,12,11,11,11,10,10,9,9,8,8,7,7,6,6,5,5,4,4,3,3,2,2,1,1,0,0,0];

var fs = require('fs');
var interval = 1000;
var tempindex = 0;

setInterval(updateTemp,interval);

function updateTemp(){
    var data = "\n" + "00 00 00 00 00 00 00 00 00 t=" + pad(fridge[tempindex]) + "000"
    fs.writeFileSync('./w1_slave',data);
    console.log(data);
    if (tempindex===fridge.length-1){
        tempindex=0;
    }else{
        tempindex++;
    }
}

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}

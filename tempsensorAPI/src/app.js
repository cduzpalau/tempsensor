var router = require('./router.js');

//Problem: Dynamically show temperature from temperature sensor. Temperature is writen to a file at a particular interaval
//Solution: Use Node.js to perform

//0. Parse Arguments
//Only 1 optional argument to run using demo mode which gets temperature from a local file rather than from temperature sensor
var args = parseArguments();

//1. Create a web Server
const http = require('http');

const port = 3000;

const server = http.createServer((request, response) => {
  router.home(request, response, args.modifier);
  router.temp(request, response, args.modifier);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

function parseArguments() {
  var ArgumentParser = require('argparse').ArgumentParser;
  var parser = new ArgumentParser({
    version: '0.2.1',
    addHelp: true,
    description: 'Temperature sensor API, GET / for tempertature'
  });
  parser.addArgument(['-d', '--demo'], {
    action: 'storeTrue',
    help: 'Run in demo mode, no real temperature sensor needed',
    dest: 'modifier'
  });

  return parser.parseArgs();
}

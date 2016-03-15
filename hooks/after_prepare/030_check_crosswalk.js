#!/usr/bin/env node
var fs = require('fs')
var file = 'platforms/android/assets/xwalk-command-line';

// function to write the file
writeFile = function() {
  fs.writeFile(file, 'xwalk --ignore-gpu-blacklist', function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file " + file + " was created.");
});
}

// check if the file exists
fs.exists(file, function(exists) {
    if(exists) {
        // read the content of the file
        fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
          return console.log(err);
        }
        // check if the content is the good one
        if (data != 'xwalk --ignore-gpu-blacklist') {
          writeFile();
        }
      });
    } else {
        writeFile();
    }
});
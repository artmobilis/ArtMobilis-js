#!/usr/bin/env node

var xml2js = require('xml2js');
var fs = require('fs');
var path = require('path');

var parser = new xml2js.Parser();

var target_file = '../../platforms/android/AndroidManifest.xml';

var missing_perms = [
'android.permission.CAMERA',
'android.permission.ACCESS_COARSE_LOCATION',
'android.permission.ACCESS_FINE_LOCATION',
'android.permission.ACCESS_LOCATION_EXTRA_COMMANDS'
];

var existing_perms = [];

// source : http://stackoverflow.com/a/28701988
function xmlFileToJs(filename, cb) {
    var filepath = path.normalize(path.join(__dirname, filename));
    fs.readFile(filepath, 'utf8', function (err, xmlStr) {
        if (err) throw (err);
        xml2js.parseString(xmlStr, {}, cb);
    });    
}

function jsToXmlFile(filename, obj, cb) {
    var filepath = path.normalize(path.join(__dirname, filename));
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(obj);
    fs.writeFile(filepath, xml, cb);
}

// check if file exists
fs.stat('platforms/android/AndroidManifest.xml', function (err, stats) {
    if (!err) {
        if (stats.isFile()) {
            // run the check
            xmlFileToJs(target_file, function (err, obj) {
                if (err) throw (err);
                // get perms
                var perms = obj.manifest['uses-permission'];
                // fill existing perms
                for(var i = 0; i < perms.length; i++) {
                  existing_perms.push(perms[i].$['android:name']);
                }
                // check if missing_perms are in existing_perms
                for(var i = 0; i < missing_perms.length; i++) {
                    if (existing_perms.indexOf(missing_perms[i]) < 0) {
                        var new_perm = { '$': { 'android:name': missing_perms[i] } };
                        obj.manifest['uses-permission'].push(new_perm);
                        console.log("Perm added : " + missing_perms[i]);
                    }
                }
                // write result to the file
                jsToXmlFile(target_file, obj, function (err) {
                    if (err) console.log(err);
                })
            });
        }
    }
});
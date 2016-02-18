cordova.define("cordova-plugin-screen-orientation.screenorientation.android", function(require, exports, module) { var exec = require('cordova/exec'),
    screenOrientation = {};

screenOrientation.setOrientation = function(orientation) {
    exec(null, null, "YoikScreenOrientation", "screenOrientation", ['set', orientation]);
};

module.exports = screenOrientation;
});

/**
 * @class dataArrayFactory
 * @memberOf angular_module.dataLoading
 */
//

angular.module('dataLoading')

.factory('dataArrayFactory', function() {

  function Parse(json, parse) {
    if (!(json instanceof Array))
      return Promise.reject('failed to parse array: not an array');

    return Promise.all(json.map(function(elem) {
      return parse(elem);
    }));
  }

  function Load(url, parse) {
    return new Promise(function(resolve, reject) {

      var loader = new AM.JsonLoader();

      loader.Load(url, function() {
        Parse(loader.json, parse).then(resolve, reject);
      }, function() {
        reject('failed to load data array: ' + url);
      });

    });
  }


  return {
    Parse: Parse,
    Load: Load
  };
})
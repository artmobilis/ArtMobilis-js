/**
 * @class journeyFactory
 * @memberOf angular_module.dataLoading
 */

angular.module('dataLoading')

.factory('journeyFactory', ['dataArrayFactory', function(dataArrayFactory) {

  /**
   * @typedef {object} Journey
   * @property {string} name
   * @property {value[]} pois
   */


  function Create(name, pois) {
    var journey = {
      name: name || 'unnamed journey',
      pois: []
    }

    if (pois) {
      for (var i = 0, c = pois.length; i < c; ++i) {
        var poi = pois[i];
        journey.pois.push(poi);
      }
    }

    return journey;
  }

  function Load(url) {
    return new Promise(function(resolve, reject) {

      var loader = new AM.JsonLoader();

      loader.Load(url, function() {
        Parse(loader.json).then(resolve, reject);
      }, function() {
        reject('failed to load journey: ' + url);
      });

    });
  }

  function Parse(json) {
    return new Promise(function(resolve, reject) {
      if (typeof json === 'object') {
        var result = Create(json.name, json.pois);
        if (result)
          resolve(result);
        else
          reject('failed to create journey');
      }
      else
        reject('failed to parse journey json: not an object');
    });
  }

  var LoadArray = function(url) { return dataArrayFactory.Load(url, Parse); };
  var ParseArray = function(json) { return dataArrayFactory.Parse(json, Parse); };

  return {
    Create: Create,
    Load: Load,
    Parse: Parse,
    LoadArray: LoadArray,
    ParseArray: ParseArray
  };


}])
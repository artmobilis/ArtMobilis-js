angular.module('data')

.factory('DataManagerSvc', ['dataJourneyFactory', 'PATHS', function(dataJourneyFactory, PATHS) {


  function DataManagerSvc() {

    var _data_journey = dataJourneyFactory.Create();
    var _load_promise = Promise.resolve();

    function LoadData(url, type) {
      _load_promise = _load_promise.then(function() {

        return dataJourneyFactory.LoadData(url, type, _data_journey)
        .then(function(data_journey) {
          _data_journey = data_journey;
        });

      });

      return _load_promise;
    }

    function ParseData(json, type) {
      _load_promise = _load_promise.then(function() {

        return dataJourneyFactory.ParseData(json, type, _data_journey)
        .then(function(data_journey) {
          _data_journey = data_journey;
        });

      })

      return _load_promise;
    }

    function Clear() {
      _data_journey = dataJourneyFactory.Create();
    }

    function GetData() {
      return _data_journey;
    }

    function LoadPresets() {
      LoadData(PATHS.JOURNEY, 'journey');
      LoadData(PATHS.POIS, 'poi_array');
      LoadData(PATHS.MARKERS, 'marker_array');
      LoadData(PATHS.CONTENTS, 'content_array');
      LoadData(PATHS.OBJECTS, 'object_array');
      LoadData(PATHS.CHANNELS, 'channel_array');

      return _load_promise;
    }

    function GetLoadPromise() {
      return _load_promise;
    }

    this.LoadData = LoadData;
    this.ParseData = ParseData;
    this.Clear = Clear;
    this.GetData = GetData;
    this.LoadPresets = LoadPresets;
    this.GetLoadPromise = GetLoadPromise;

  }


  return new DataManagerSvc();


}])
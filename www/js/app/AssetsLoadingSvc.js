angular.module('starter')

.service('AssetsLoadingSvc', ['DataManagerSvc', function(DataManagerSvc) {


  var _loaded = false;


  function Load() {
    if (!_loaded) {
      _loaded = true;

      DataManagerSvc.LoadData('assets/journey.json', 'data_journey');
    }
  }

  this.Load = Load;


}])
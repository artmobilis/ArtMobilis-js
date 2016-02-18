angular.module('starter')

.service('JourneyManagerSvc', function(CoordinatesConverterSvc, GeolocationSvc, DataManagerSvc) {
  var that = this;

  this.MODE_NAVIGATION = 0;
  this.MODE_POI = 1;
  this.MODE_NAVIGATION_FORCED = 2;

  var _journey;
  var _position = { x: 0, y: 0 };

  var _current_poi;
  var _current_marker;
  var _mode = this.MODE_NAVIGATION;

  var _running = false;

  var _object_loader = new ObjectLoaderAM();

  function DispatchEventModeChange() {
    var event = new Event('journey_mode_change');
    document.dispatchEvent(event);
  }

  function IsEnteringPOI(poi) {
    var d_max = poi.radius * poi.radius;
    var poi_pos = poi.position;
    var dx = poi_pos.x - _position.x;
    var dy = poi_pos.y - _position.y;
    var d = dx * dx + dy * dy;
    return (d < d_max);
  }

  function IsLeavingPOI(poi) {
    var coef = 1.2;

    var radius = poi.radius * coef;
    var d_max = radius * radius;
    var poi_pos = poi.position;
    var dx = poi_pos.x - _position.x;
    var dy = poi_pos.y - _position.y;
    var d = dx * dx + dy * dy;
    return (d > d_max);
  }

  function FindEnteringPOI() {
    var pois = _journey.GetPOIs();
    for (poi of pois) {
      if (IsEnteringPOI(poi)) {
        return poi;
      }
    }
    return undefined;
  }

  function GoToPOI(poi) {
    _mode = that.MODE_POI;
    _current_poi = poi;
    DispatchEventModeChange();
  }

  function GoToNavigation() {
    _mode = that.MODE_NAVIGATION;
    _current_poi = undefined;
    DispatchEventModeChange();
  }

  function GoToNavigationForced() {
    _mode = that.MODE_NAVIGATION_FORCED;
    DispatchEventModeChange();
  }

  function SetMode() {
    if (!_journey)
      return;

    switch (_mode) {

      case that.MODE_NAVIGATION:
      var poi = FindEnteringPOI();
      if (poi)
        GoToPOI(poi);
      break;

      case that.MODE_POI:
      if (IsLeavingPOI(_current_poi))
        GoToNavigation();
      break;

      case that.MODE_NAVIGATION_FORCED:
      if (IsLeavingPOI(_current_poi))
        GoToNavigation();
      break;
    }
  }

  function OnDeviceMove(event) {
    _position.x = event.detail.x;
    _position.y = event.detail.y;
    SetMode();
  }

  this.SetJourney = function(journey) {
    _journey = journey;
    _mode = that.MODE_NAVIGATION;

    for (poi of _journey.GetPOIs()) {
      poi.position = CoordinatesConverterSvc.ConvertLocalCoordinates(poi.latitude, poi.longitude);
    }
  };

  this.GetMode = function() {
    return _mode;
  };

  this.GetCurrentPOI = function() {
    if (_mode === that.MODE_POI || _mode === that.MODE_TRACKING) {
      return _current_poi;
    }
    return undefined;
  };

  this.Start = function() {
    if (!_running) {
      _running = true;
      document.addEventListener('device_move_xy', OnDeviceMove, false);
      _mode = that.MODE_NAVIGATION;
      DispatchEventModeChange();
      GeolocationSvc.Start();
    }
  };

  this.Stop = function() {
    if (_running) {
      document.removeEventListener('device_move_xy', OnDeviceMove, false);
      _running = false;
      _journey = undefined;
    }
  };

  this.Running = function() {
    return _running;
  };

  this.GetLandmarks = function() {
    var object = new THREE.Object3D();

    for (poi of _journey.GetPOIs()) {
      if (poi.landmark) {
        var landmark_obj = DataManagerSvc.tracking_data_manager.GetObject(poi.landmark.object);
        if (!landmark_obj)
          continue;

        landmark_obj = landmark_obj.clone();
        if (poi.landmark.height) landmark_obj.position.y = poi.landmark.height;
        landmark_obj.position.x = poi.position.x;
        landmark_obj.position.z = poi.position.y;
        if (poi.landmark.scale) {
          landmark_obj.scale.x = poi.landmark.scale;
          landmark_obj.scale.y = poi.landmark.scale;
          landmark_obj.scale.z = poi.landmark.scale;
        }

        object.add(landmark_obj);
      }
    }

    return object;
  };

  this.ForceNavigationMode = function(force_navigation) {
    if (!force_navigation) {
      if (_current_poi)
        GoToPOI(_current_poi);
      else
        GoToNavigation();
    }
    else {
      if (_mode == that.MODE_POI)
        GoToNavigationForced();
    }
  };

  
})
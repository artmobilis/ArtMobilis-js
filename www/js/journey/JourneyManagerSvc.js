angular.module('journey')

.service('JourneyManagerSvc', ['CoordinatesConverterSvc', 'GeolocationSvc', 'DataManagerSvc',
  function(CoordinatesConverterSvc, GeolocationSvc, DataManagerSvc) {
  var that = this;

  this.MODE_NAVIGATION = 0;
  this.MODE_POI = 1;
  this.MODE_NAVIGATION_FORCED = 2;

  var _position = { x: 0, y: 0 };

  var _current_poi;
  var _current_marker;
  var _mode = this.MODE_NAVIGATION;

  var _running = false;

  var _object_loader = new AMTHREE.ObjectLoader();

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

  function FindEnteringPOI(journey, pois) {
    for (poi_id of journey.pois) {
      var poi = pois[poi_id];
      if (!poi) continue;

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
    var data_journey = DataManagerSvc.GetData();
    var pois = data_journey.pois;
    var journey = data_journey.journey;

    switch (_mode) {

      case that.MODE_NAVIGATION:
      var poi = FindEnteringPOI(journey, pois);
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

  this.Reset = function() {
    _mode = that.MODE_NAVIGATION;
  };

  this.SetPoisPosition = function(pois) {
    for (var i = 0, c = pois.length; i < c; ++i) {
      var poi = pois[i];
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
      GeolocationSvc.Start();
      DispatchEventModeChange();
    }
  };

  this.Stop = function() {
    if (_running) {
      GeolocationSvc.Stop();
      document.removeEventListener('device_move_xy', OnDeviceMove, false);
      _running = false;
    }
  };

  this.Running = function() {
    return _running;
  };

  this.GetPOILandmarks = function() {
    var object = new THREE.Object3D();

    var pois = DataManagerSvc.GetData().pois;
    var objects = DataManagerSvc.GetData().objects;

    for (poi_id in pois) {
      var poi = pois[poi_id];

      if (poi.landmark) {
        var landmark_obj = objects[poi.landmark.object];
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

  this.GetPOIChannelsLandmarks = function() {
    var poi = _current_poi;

    var landmarks = new THREE.Object3D();
    var objects = DataManagerSvc.GetData().objects;

    for (channel of poi.channels) {
      var obj = objects[channel.object];
      if (typeof obj !== 'undefined') {
        obj = obj.clone();
        var position = CoordinatesConverterSvc.ConvertLocalCoordinates(channel.longitude, channel.latitude);
        obj.position.x = position.x;
        obj.position.z = position.y;
        obj.y = channel.altitude || 0;
        obj.scale.x = obj.scale.y = obj.scale.z = channel.scale || 1;
        landmarks.add(obj);
      }
    }

    return landmarks;
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

  
}])
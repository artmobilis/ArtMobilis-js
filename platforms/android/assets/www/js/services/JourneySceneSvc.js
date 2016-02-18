angular.module('starter')

.service('JourneySceneSvc', function($ionicPlatform, JourneyManagerSvc, DataManagerSvc,
  MarkerDetectorSvc, CameraSvc, LoadingSvc, CoordinatesConverterSvc) {
  var that = this;

  var _image_loader = new ImageLoader();
  var _camera_video_element = CameraSvc.GetVideoElement();

  var _running = false;
  var _loading = false;

  var _journey;

  var _loading_manager = new LoadingManager();
  var _starting_manager = new LoadingManager();

  var _canvas = document.createElement('canvas');
  var _scene = new Scene( {
    gps_converter: function(latitude, longitude) {
      return CoordinatesConverterSvc.ConvertLocalCoordinates(latitude, longitude);
    },
    canvas: _canvas,
    fov: (ionic.Platform.isWebView()) ? 80 : 40
  } );
  _scene.SetFullWindow();
  _scene.AddObject(new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 ));

  var _orientation_control = new DeviceOrientationControl(_scene.GetCamera());

  var _tracked_obj_manager = new TrackedObjManager( { camera: _scene.GetCamera() } );

  var _poi_limit_obj = new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 64),
    new THREE.MeshBasicMaterial( { color: 0x41A3DC, opacity: 0.5, transparent: true, side: THREE.DoubleSide } ));
  _poi_limit_obj.position.y = -3;
  _poi_limit_obj.rotation.x = 1.5708;

  var _landmarks;


  function AddPOIMarkers() {
    var poi = JourneyManagerSvc.GetCurrentPOI();
    if (!poi)
      return;

    DataManagerSvc.OnLoad(function() {

      for (poi_channel of poi.channels) {
        var channel_uuid = poi_channel.uuid;
        var channel = DataManagerSvc.tracking_data_manager.GetChannel(channel_uuid);
        var marker = DataManagerSvc.tracking_data_manager.GetMarker(channel.marker);

        MarkerDetectorSvc.AddMarker(marker.img, poi_channel.uuid);

        var object = DataManagerSvc.tracking_data_manager.BuildChannelContents(channel_uuid);

        _tracked_obj_manager.Add(object, channel_uuid, function(o) {

          o.traverse(function(s) {
            if (s instanceof THREE.Mesh
              && s.material
              && s.material.map
              && s.material.map.play)
              s.material.map.play();
          });

          _scene.AddObject(o);
        }, function(o) {

          o.traverse(function(s) {
            if (s instanceof THREE.Mesh
              && s.material
              && s.material.map
              && s.material.map.stop)
              s.material.map.stop();
          });

          _scene.RemoveObject(o);
        });

      }
      
    });
  }

  function OnEnterPOI() {
    AddPOIMarkers();

    var poi = JourneyManagerSvc.GetCurrentPOI();

    _poi_limit_obj.scale.x = _poi_limit_obj.scale.y = _poi_limit_obj.scale.z = poi.radius;
    _poi_limit_obj.position.x = poi.position.x;
    _poi_limit_obj.position.z = poi.position.y;
    _scene.AddObject(_poi_limit_obj);
  }

  function OnExitPOI() {
    _scene.RemoveObject(_poi_limit_obj);

    MarkerDetectorSvc.ClearMarkers();
    _tracked_obj_manager.Clear();
  }

  function OnJourneyModeChange() {
    var mode = JourneyManagerSvc.GetMode();

    switch (mode) {

      case JourneyManagerSvc.MODE_NAVIGATION:
      case JourneyManagerSvc.MODE_NAVIGATION_FORCED:
      OnExitPOI();
      break;

      case JourneyManagerSvc.MODE_POI:
      OnEnterPOI();
      break;
    }
  }

  function StartCamera() {
    if (!CameraSvc.IsActive()) {

      _loading_manager.Start();
      LoadingSvc.Start();

      CameraSvc.Start(function() {
        _loading_manager.End();
        LoadingSvc.End();
      });

    }
  }

  function StartMarkerDetector() {
    if (!MarkerDetectorSvc.Started()) {
      MarkerDetectorSvc.Start(_camera_video_element);
    }
  }

  function LoadData() {

    LoadingSvc.Start();
    _loading_manager.Start();
    DataManagerSvc.LoadChannelsPresets();
    DataManagerSvc.OnLoad(function() {
      LoadingSvc.End();
      _loading_manager.End();
    });

    if (!_journey) {
      var filename = './assets/journey.json';

      LoadingSvc.Start();
      _loading_manager.Start();

      _journey = new Journey();
      _journey.Load(filename, function() {

        JourneyManagerSvc.SetJourney(_journey);

        AddLandmarks();

        LoadingSvc.End();
        _loading_manager.End();

      }, function(e) {
        console.warn('JourneySceneSvc: loading failed: ' + e);
        LoadingSvc.End();
        _loading_manager.End();
      });
    }
  }

  function LoadNavigationScene() {
    _loading_manager.Start();
    LoadingSvc.Start();

    _scene.Load('./assets/navigation_scene.json', function() {
      _loading_manager.End();
      LoadingSvc.End();
    });
  }

  function AddLandmarks() {
    LoadingSvc.Start();
    _loading_manager.Start();

    DataManagerSvc.OnLoad(function() {
      _landmarks = JourneyManagerSvc.GetLandmarks();
      _scene.AddObject(_landmarks);
      _loading_manager.End();
      LoadingSvc.End();
    });
  }


  function Load() {
    _loading_manager.Start();
    LoadingSvc.Start();

    $ionicPlatform.ready(function() {

      StartCamera();

      LoadData();

      StartMarkerDetector();

      LoadNavigationScene();

      _loading_manager.End();
      LoadingSvc.End();
    });
  }

  function OnDeviceMove(e) {
    var body = _scene.GetCameraBody();
    body.position.x = e.detail.x;
    body.position.z = e.detail.y;
  }

  this.Start = function() {
    if (that.Started())
      return;

    _starting_manager.Start();
    LoadingSvc.Start();
    _starting_manager.OnEnd(function() {
      LoadingSvc.End();
    });

    Load();

    _loading_manager.OnEnd(function() {
      JourneyManagerSvc.Start();

      document.addEventListener('journey_mode_change', OnJourneyModeChange, false);

      document.addEventListener('device_move_xy', OnDeviceMove, false);
      _orientation_control.Connect();

      _running = true;

      LoadingSvc.End();
      _starting_manager.End();
    });
  };

  this.Started = function() {
    return _running || _starting_manager.IsLoading();
  };

  this.Stop = function() {
    if (!that.Started())
      return;
    
    _starting_manager.OnEnd(function() {
      document.removeEventListener('journey_mode_change', OnJourneyModeChange, false);
      document.removeEventListener('device_move_xy', OnDeviceMove, false);
      _orientation_control.Disconnect();
      _running = false;
      MarkerDetectorSvc.Stop();
      CameraSvc.Stop();
    });
  };

  this.GetCanvas = function() {
    return _canvas;
  };

  function UpdateTracking() {
    MarkerDetectorSvc.Update();

    var tags = MarkerDetectorSvc.GetTags();
    var marker_corners = MarkerDetectorSvc.GetMarker();

    for (tag of tags) {
      console.log('tag detected: ' + tag.id);
      for (poi_channel of JourneyManagerSvc.GetCurrentPOI().channels) {
        var channel = DataManagerSvc.tracking_data_manager.GetChannel(poi_channel.uuid);
        var marker = DataManagerSvc.tracking_data_manager.GetMarker(channel.marker);
        if (marker.is_tag && marker.tag_id === tag.id) {
          MarkerDetectorSvc.SetTransform(tag);
          _tracked_obj_manager.TrackCompose(poi_channel.uuid,
            MarkerDetectorSvc.position,
            MarkerDetectorSvc.quaternion,
            MarkerDetectorSvc.scale);
        }
      }
    }

    if (marker_corners) {
      console.log('marker detected: ' + marker_corners.uuid);
      MarkerDetectorSvc.SetTransform(marker_corners);
      _tracked_obj_manager.TrackCompose(marker_corners.uuid,
        MarkerDetectorSvc.position,
        MarkerDetectorSvc.quaternion,
        MarkerDetectorSvc.scale);
    }

    _tracked_obj_manager.Update();
  };

  this.Update = function() {

    _orientation_control.Update();

    if (JourneyManagerSvc.GetMode() === JourneyManagerSvc.MODE_POI)
      UpdateTracking();

    _scene.Update();

    _scene.Render();

    MarkerDetectorSvc.Empty();
  };


})
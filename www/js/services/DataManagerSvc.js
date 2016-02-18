angular.module('starter')

.service('DataManagerSvc', [function() {
  var that = this;

  var _contents_loader = new JsonLoader();
  var _markers_loader = new JsonLoader();
  var _channels_loader = new JsonLoader();
  var _loading_manager = new LoadingManager();

  var _presets_loaded = false;


  function GetPath(url) {
    return that.origin + '/' + url;
  }


  this.origin = './assets';
  this.tracking_data_manager = new TrackingDataManager();


  this.LoadMarkers = function(url) {
    _loading_manager.Start();
    _markers_loader.Load(GetPath(url), function() {
      that.tracking_data_manager.ParseMarkers(_markers_loader.json);
      _loading_manager.End();
    }, function(error) {
      console.log('DataManagerSvc: failed to load markers: ' + error);
      _loading_manager.End();
    });
  };

  this.LoadContents = function(url) {
    _loading_manager.Start();
    _contents_loader.Load(GetPath(url), function() {
      that.tracking_data_manager.ParseContents(_contents_loader.json);
      _loading_manager.End();
    }, function(error) {
      console.log('DataManagerSvc: failed to load contents: ' + error);
      _loading_manager.End();
    });
  };

  this.LoadChannels = function(url) {
    _loading_manager.Start();
    _channels_loader.Load(GetPath(url), function() {
      that.tracking_data_manager.ParseChannels(_channels_loader.json);
      _loading_manager.End();
    }, function(error) {
      console.log('DataManagerSvc: failed to load channels: ' + error);
      _loading_manager.End();
    });
  };

  this.LoadContentsAssets = function(url) {
    _loading_manager.Start();
    this.tracking_data_manager.LoadContentsAssets(GetPath(url));
    this.tracking_data_manager.OnLoadContentsAssets(function() {
      _loading_manager.End();
    });
  };

  this.OnLoad = function(on_load) {
    _loading_manager.OnEnd(on_load);
  };

  this.IsLoading = function() {
    return _loading_manager.IsLoading();
  };

  this.LoadChannelsPresets = function() {
    if (!_presets_loaded) {
      _presets_loaded = true;
      that.LoadContentsAssets('contents_objects.json');
      that.LoadMarkers('markers.json');
      that.LoadContents('contents.json');
      that.LoadChannels('channels.json');
    }
  };

}])
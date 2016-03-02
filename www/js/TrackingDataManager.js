TrackingDataManager = function() {

  var that = this;

  var _markers = {};
  var _contents_container = {};
  var _channels = {};

  var _loading_manager = new THREE.LoadingManager();
  var _object_loader = new AMTHREE.ObjectLoader(_loading_manager);

  var _objects = {};

  var _on_load_assets_callbacks = [];
  var _assets_loaded = false;
  

  this.AddMarker = function(url, uuid, name, tag_id, is_image) {
    _markers[uuid] =
    {
      img: url,
      name: name || 'unnamed marker',
      is_tag: (tag_id != undefined),
      is_image: (is_image == true),
      tag_id: tag_id
    };
  };

  this.AddContents = function(object, uuid, name) {
    _contents_container[uuid] =
    {
      object: object,
      name: name || 'unnamed contents'
    };
  };

  this.AddChannel = function(marker_id, contents_transforms, uuid, name) {

    marker_id = marker_id || 0;
    contents_transforms = contents_transforms || [];
    arguments.callee.uuid_max = arguments.callee.uuid_max || 0;

    while (typeof(_channels[that.AddChannel.uuid_max]) !== 'undefined')
      ++that.AddChannel.uuid_max;

    var id = uuid || that.AddChannel.uuid_max;

    var channel = 
    {
      marker: marker_id,
      contents: [],
      name: name || 'unnamed channel'
    };

    for (uuid in _channels) {
      if (_channels[uuid].marker == channel.marker)
        delete _channels[uuid];
    }

    _channels[id] = channel;

    for (contents_transform of contents_transforms) {
      that.AddContentsToChannel(id, contents_transform);
    }

    return id;
  };

  this.GetMarker = function(uuid) {
    return _markers[uuid];
  };

  this.GetContents = function(uuid) {
    return _contents_container[uuid];
  };

  this.GetChannel = function(uuid) {
    return _channels[uuid];
  };

  this.GetObject = function(uuid) {
    if (_objects[uuid])
      return _objects[uuid].mesh;
    else
      return undefined;
  };

  this.ParseMarkers = function(json) {
    if (typeof(json) === 'undefined')
      return false;

    for (elem of json) {
      if (typeof(elem.uuid) === 'undefined')
        console.warn('TrackingDataManager: failed to parse marker: uuid undefined');
      else if (typeof(elem.url) === 'undefined')
        console.warn('TrackingDataManager: failed to parse marker "' + elem.uuid + '": url undefined');
      else {
        that.AddMarker(elem.url, elem.uuid, elem.name, (elem.is_tag) ? elem.tag_id : undefined, elem.is_image);
      }
    }

    return true;
  };

  this.ParseContents = function(json) {
    if (typeof(json) === 'undefined')
      return false;

    for (elem of json) {
      if (typeof(elem.uuid) === 'undefined')
        console.warn('TrackingDataManager: failed to parse contents: "uuid" undefined');
      else if (typeof(elem.object) === 'undefined')
        console.warn('TrackingDataManager: failed to parse contents "' + elem.uuid + '": "object" undefined');
      else {
        that.AddContents(elem.object, elem.uuid, elem.name);
      }
    }

    return true;
  };

  this.ParseChannels = function(json) {
    if (!Array.isArray(json)) {
      console.warn('TrackingDataManager: ParseChannels: json isnt an array');
      return false;
    }

    for (elem of json) {
      if (typeof(elem.marker) === 'undefined')
        console.warn('TrackingDataManager: failed to parse channel "' + elem.uuid + '": "marker" undefined');
      else if (typeof(elem.contents) === 'undefined')
        console.warn('TrackingDataManager: failed to parse channel "' + elem.uuid + '": "contents" undefined');
      else {
        that.AddChannel(elem.marker, elem.contents, elem.uuid, elem.name);
      }
    }

    return true;
  };

  this.ParseConfig = function(json) {
    that.ParseMarkers(json.markers);
    that.ParseContents(json.contents);
    that.ParseChannels(json.channels);
  };

  this.ChannelsToJson = function() {
    var channels_json = [];

    for (uuid in _channels) {

      var channel = _channels[uuid];

      channels_json.push( {
        uuid: uuid,
        marker: channel.marker,
        contents: channel.contents,
        name: channel.name
      } );

    }

    return channels_json;
  };

  this.MarkersToJson = function() {
    var markers_json = [];

    for (uuid in _markers) {

      var m = _markers[uuid];

      markers_json.push( {
        uuid: uuid,
        url: m.img,
        name: m.name,
        is_tag: m.is_tag,
        tag_id: m.tag_id
      } );

    }

    return markers_json;
  };

  this.ContentsToJson = function() {
    var contents_json = [];

    for (uuid in _contents_container) {

      var c = _contents_container[uuid];

      contents_json.push( {
        uuid: uuid,
        object: c.object,
        name: c.name
      } );
    }

    return contents_json;
  };

  this.ToJson = function() {
    var json = {
      markers: that.MarkersToJson(),
      contents: that.ContentsToJson(),
      channels: that.ChannelsToJson()
    };

    return json;
  };

  this.GetChannelContainer = function() {
    return _channels;
  };

  this.GetContentsContainer = function() {
    return _contents_container;
  };

  this.GetMarkerContainer = function() {
    return _markers;
  };

  this.LoadContentsAssets = function(url, root_path) {
    _assets_loaded = false;

    root_path = root_path || '';
    _object_loader.root = root_path;

    var OnLoadThreeScene = function(root) {
      _loading_manager.onLoad = function() {

        root.traverse(function(child) {
          if (child.geometry)
            child.geometry.computeBoundingSphere();
        });

        var box = new THREE.Box3();
        var sphere = new THREE.Sphere();

        while (root.children.length != 0) {

          var elem = root.children[0];
          root.remove(elem);

          var obj = {};
          var mesh = new THREE.Object3D();
          mesh.add(elem);

          box.setFromObject(elem);
          box.getBoundingSphere(sphere);

          mesh.scale.multiplyScalar(1 / sphere.radius);

          sphere.center.divideScalar(sphere.radius);
          mesh.position.sub(sphere.center);

          obj.mesh = new THREE.Object3D();
          obj.mesh.add(mesh);

          _objects[elem.uuid] = obj;
        }

        if (typeof(THREE.Animation) !== 'undefined') {
          root.traverse( function ( child ) {
            if ( child instanceof THREE.SkinnedMesh ) {
              var animation = new THREE.Animation( child, child.geometry.animation );
              animation.play();
            }
          } );
        }

        _assets_loaded = true;
        for (callback of _on_load_assets_callbacks) {
          callback();
          if (!_assets_loaded)
            break;
        }
        _on_load_assets_callbacks = [];

      };
    };

    _object_loader.Load(url, OnLoadThreeScene);
  };

  this.OnLoadContentsAssets = function(callback) {
    if (_assets_loaded)
      callback();
    else
      _on_load_assets_callbacks.push(callback);
  };

  this.Clean = function() {
    for (uuid in _channels) {
      var channel = _channels[uuid];

      if (typeof _markers[channel.marker] === 'undefined') {
        delete _channels[uuid];
        continue;
      }

      for (contents of channel.contents) {
        if (typeof _contents_container[contents.uuid] === 'undefined') {
          delete _channels[uuid];
          break;
        }
      }
    }
  };

  this.AddContentsToChannel = function(channel_uuid, contents_transform) {
    var channel = that.GetChannel(channel_uuid);
    var contents = that.GetContents(contents_transform.uuid) || {};

    if (typeof contents_transform.uuid !== 'undefined') {
      var pos = contents_transform.position || {};
      var rot = contents_transform.rotation || {};
      var channel_contents = {
        uuid: contents_transform.uuid,
        position: { x: pos.x || 0, y: pos.y || 0, z: pos.z || 0 },
        rotation: { x: rot.x || 0, y: rot.y || 0, z: rot.z || 0 },
        scale: contents_transform.scale || 1,
        name: contents_transform.name || contents.name || ''
      };

      channel.contents.push(channel_contents);
    }
  };

  this.BuildChannelContents = function(channel_uuid) {

    var channel = _channels[channel_uuid];
    var contents_transforms = channel.contents;

    var object = new THREE.Object3D();

    for (transform of contents_transforms) {

      var contents = that.GetContents(transform.uuid);

      if (typeof (contents) === 'undefined' || typeof (contents.object) === 'undefined')
        continue;
      var contents_mesh = that.GetObject(contents.object);
      if (typeof (contents_mesh) === 'undefined')
        continue;

      var mesh = contents_mesh.clone();

      mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
      mesh.scale.multiplyScalar(transform.scale);

      object.add(mesh);
    }

    return object;
  };

  this.UpdateAnimations = function() {
    var callbacks = _object_loader.GetOnUpdateCallbacks();
    for (callback of callbacks)
      callback();
  };

};
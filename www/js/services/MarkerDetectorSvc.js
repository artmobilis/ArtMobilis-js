angular.module('starter')

.service('MarkerDetectorSvc', function() {
  var that = this;

  var _worker;

  var _canvas = document.createElement('canvas');
  var _ctx = _canvas.getContext('2d');
  var _image = new Image();
  var _marker;
  var _tags = [];
  var _video;

  var _frame = 0;
  var _frame_worker = 0;

  var _image_loader = new AM.ImageLoader();

  var _on_added_callbacks = {};

  this.video_scale_down = 1;

  this.position = new THREE.Vector3();
  this.rotation = new THREE.Euler();
  this.quaternion = new THREE.Quaternion();
  this.scale = new THREE.Vector3();

  this.Start = function(video_element) {
    if (!_worker) {
      _frame = 0;
      _frame_worker = 0;

      _video = video_element;
      _worker = new Worker('js/MarkerDetectorWorker.js');
      _worker.onmessage = function(e) {

        switch (e.data.cmd) {

          case 'markers':
          _marker = e.data.marker;
          _tags = e.data.tags; 
          _frame_worker = e.data.frame;
          break;

          case 'marker_added':
          var callback = _on_added_callbacks[e.data.uuid];
          if (callback) {
            delete _on_added_callbacks[e.data.uuid];
            callback();
          }
          break;
        }
      }
    }
  };

  this.Update = function() {

    if (_worker && _video instanceof HTMLVideoElement
      && _video.readyState === _video.HAVE_ENOUGH_DATA
      && (_frame - _frame_worker < 2)) {

      ++_frame;

      _canvas.width = _video.videoWidth / that.video_scale_down;
      _canvas.height = _video.videoHeight / that.video_scale_down;
      _ctx.drawImage(_video, 0, 0, _canvas.width, _canvas.height);

      var image = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);

      var obj_data = {
        cmd: 'new_img',
        image: image,
        frame: _frame
      };
      _worker.postMessage(obj_data, [image.data.buffer]);

    }
  };

  this.Stop = function() {
    if (_worker) {
      _worker.terminate();
      _worker = undefined;
      _video = undefined;
    }
  };

  this.Started = function() {
    return _worker !== undefined;
  };

  this.GetMarker = function() {
    return _marker;
  };

  this.GetTags = function() {
    return _tags;
  };

  this.Empty = function() {
    _marker = undefined;
    _tags.length = 0;
  };

  this.SetTransform = function(marker, model_size) {
    model_size = model_size || 1;

    var corners = [];
    for (var i = 0; i < marker.corners.length; ++i) {
      corners.push( {
        x: marker.corners[i].x - (_canvas.width / 2),
        y: (_canvas.height / 2) - marker.corners[i].y,
      } );
    }

    var posit = new POS.Posit(model_size, _canvas.width);
    var pose = posit.pose(corners);

    if (pose === null) return;


    var rot = pose.bestRotation;
    var translation = pose.bestTranslation;

    that.scale.x = model_size;
    that.scale.y = model_size;
    that.scale.z = model_size;

    that.rotation.x = -Math.asin(-rot[1][2]);
    that.rotation.y = -Math.atan2(rot[0][2], rot[2][2]);
    that.rotation.z = Math.atan2(rot[1][0], rot[1][1]);

    that.position.x = translation[0];
    that.position.y = translation[1];
    that.position.z = -translation[2];

    that.quaternion.setFromEuler(that.rotation);
  };

  this.AddMarker = function(url, uuid, on_end) {
    if (_worker) {

      if (_on_added_callbacks[uuid]) {
        if (on_end)
          on_end();
        return;
      }

      _on_added_callbacks[uuid] = on_end;

      _image_loader.GetImageData(url, function(url, uuid) {
        return function(image_data) {

          var msg = {
            cmd: 'add_marker',
            image_data: image_data,
            uuid: uuid,
            name: url
          };

          _worker.postMessage(msg, [msg.image_data.data.buffer]);

        }
      }(url, uuid), true);

    } else
      if (on_end) on_end();
  };

  this.ClearMarkers = function() {
    if (_worker) {
      _worker.postMessage( { cmd: 'clear' } );
    }
  };

  this.ActiveMarker = function(uuid, bool) {
    if (_worker) {
      var cmd = (bool) ? 'active' : 'desactive';
      _worker.postMessage( { cmd: cmd, uuid: uuid } );
    }
  };

  this.ActiveAllMarkers = function(bool) {
    if (_worker) {
      var cmd = (bool) ? 'active_all' : 'desactive_all';
      _worker.postMessage( { cmd: cmd } );
    }
  };


})
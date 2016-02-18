navigator.getUserMedia = navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia;

window.URL = window.URL || window.webkitURL;


FrontCamGrabbing = function() {
  var that = this;

  var _stream;
  var _dom_element = document.createElement('video');

  var _loading = false;
  var _on_loading_end;
  var _on_error;


  _dom_element.setAttribute('autoplay', true);

  _dom_element.style.zIndex = -1;
  _dom_element.style.position = 'absolute';

  _dom_element.style.top = '0px';
  _dom_element.style.left = '0px';
  _dom_element.style.width = '100%';
  _dom_element.style.height = '100%';


  function WaitHaveEnoughData() {
    if (_dom_element.readyState === _dom_element.HAVE_ENOUGH_DATA) {
      _loading = false;
      if (_on_loading_end)
        _on_loading_end();
    }
    else
      window.requestAnimationFrame(WaitHaveEnoughData);
  }

  function OnGetSources(on_error) {
    return function(source_infos) {

      var constraints = {
        video: true,
        audio: false
      };

      for (var i = 0; i != source_infos.length; ++i) {
        var sourceInfo = source_infos[i];
        if (sourceInfo.kind == "video" && sourceInfo.facing == "environment") {
          constraints.video = {
            optional: [{sourceId: sourceInfo.id}]
          }
        }
      }

      navigator.getUserMedia(constraints, function(stream) {
        _stream = stream;
        _dom_element.src = window.URL.createObjectURL(stream);
        WaitHaveEnoughData();
      }, function(error) {
        console.error("Cant getUserMedia()! due to ", error);
        if (on_error)
          on_error();
      });

    }
  }

  function GetSourcesMST(on_error) {
    if (typeof (MediaStreamTrack) !== 'undefined'
      && typeof(MediaStreamTrack.getSources) !== 'undefined') {

      MediaStreamTrack.getSources(OnGetSources(on_error));
    
    }
    else if (on_error)
      on_error();
  }

  function GetSourcesMD(on_error) {
    if (typeof(navigator.mediaDevices) !== 'undefined'
      && typeof(navigator.mediaDevices.enumerateDevices) !== 'undefined') {

      navigator.mediaDevices.enumerateDevices().then(OnGetSources(on_error));

    }
    else if (on_error)
      on_error();
  }

  this.domElement = _dom_element;

  this.Start = function(on_loading_end, on_error) {
    if (!that.IsActive() && !_loading) {
      _loading = true;
      _on_loading_end = on_loading_end;
      _on_error = on_error;
      GetSourcesMST(function() {
        GetSourcesMD(function() {
          if (_on_error)
            _on_error();
          if (_on_loading_end)
            _on_loading_end();
        });
      });
    }
    else
      on_loading_end();
  };

  this.Stop = function() {
    if (_stream) {
      _stream.getTracks()[0].stop();
      _stream = undefined;
    }
  };

  this.IsActive = function() {
    return _stream !== undefined;
  };
};
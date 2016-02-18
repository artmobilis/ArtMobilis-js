window = self;

// aruco
importScripts('../lib/ArtMobilib/ArtMobilib/aruco/cv.js');
importScripts('../lib/ArtMobilib/ArtMobilib/aruco/aruco.js');
importScripts('../lib/ArtMobilib/ArtMobilib/aruco/svd.js');
importScripts('../lib/ArtMobilib/ArtMobilib/aruco/posit1.js');

// jsfeat
importScripts('../lib/ArtMobilib/ArtMobilib/jsfeat/jsfeat.js');
importScripts('../lib/ArtMobilib/ArtMobilib/jsfeat/compatibility.js');
importScripts('../lib/ArtMobilib/ArtMobilib/jsfeat/profiler.js');

// ArtMobilib
importScripts('../lib/ArtMobilib/ArtMobilib/CornerDetector.js');
importScripts('../lib/ArtMobilib/ArtMobilib/ImageMarkers.js');
importScripts('../lib/ArtMobilib/ArtMobilib/MarkerContainer.js');
importScripts('../lib/ArtMobilib/ArtMobilib/MarkerMatcher.js');
importScripts('../lib/ArtMobilib/ArtMobilib/webcamConverter.js');
importScripts('../lib/ArtMobilib/ArtMobilib/MarkerManager.js');



var _detector = new AR.Detector();

var _marker_manager = new MarkerManager();


function SendResult(tags, marker, frame) {
  var msg = {
    cmd: 'markers',
    tags: tags,
    marker: marker,
    frame: frame
  };

  postMessage(msg);
}

function DetectMarkerImage(image_data) {
  if (_marker_manager.ProcessImageData(image_data)) {
    return { corners: _marker_manager.matcher.corners, uuid: _marker_manager.GetId() };
  }
  return undefined;
}

function DetectTags(image) {
  return _detector.detect(image);
}

function AddMarker(image_data, uuid, name) {
  _marker_manager.AddMarkerFromData(image_data, uuid, name);
  var msg = {
    cmd: 'marker_added',
    uuid: uuid
  };
  postMessage(msg);
}


onmessage = function(e) {
  var cmd = e.data.cmd;

  switch (cmd) {
    case 'new_img':
      var tags = DetectTags(e.data.image);
      var marker = DetectMarkerImage(e.data.image);
      SendResult(tags, marker, e.data.frame);
    break;
    case 'add_marker':
      AddMarker(e.data.image_data, e.data.uuid, e.data.name);
    break;
    case 'clear':
      _marker_manager.ClearMarkers();
    break;
  }
};
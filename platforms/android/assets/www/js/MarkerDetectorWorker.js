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

importScripts('../lib/AM/ArtMobilib.js');



var _detector = new AR.Detector();

// var _marker_manager = new MarkerManager();

var _marker_tracker = new AM.MarkerTracker();

_marker_tracker.SetParameters({
  laplacian_threshold: 30,
  eigen_threshold: 25,
  detection_corners_max: 150,
  match_threshold: 60,
  num_train_levels: 3,
  image_size_max: 512,
  training_corners_max: 50,
  blur: true
});


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
  // if (_marker_manager.ProcessImageData(image_data)) {
  //   return { corners: _marker_manager.matcher.corners, uuid: _marker_manager.GetId() };
  // }

  _marker_tracker.Log();
  _marker_tracker.ComputeImage(image_data);
  if (_marker_tracker.Match()) {
    return { corners: _marker_tracker.GetPose(), uuid: _marker_tracker.GetMatchUuid() };
  }

  return undefined;
}

function DetectTags(image) {
  return _detector.detect(image);
}

function AddMarker(image_data, uuid, name) {
  // _marker_manager.AddMarkerFromData(image_data, uuid, name);

  _marker_tracker.AddMarker(image_data, uuid);

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
      // _marker_manager.ClearMarkers();
      _marker_tracker.ClearMarkers();
    break;

    case 'active_all':
      _marker_tracker.ActiveAllMarkers(true);
    break;

    case 'desactive_all':
      _marker_tracker.ActiveAllMarkers(false);
    break;

    case 'active':
      _marker_tracker.ActiveMarker(e.data.uuid, true);
    break;

    case 'desactive':
      _marker_tracker.ActiveMarker(e.data.uuid, false);
    break;

  }
};
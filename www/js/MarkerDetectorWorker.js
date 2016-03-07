window = self;

// aruco
importScripts('../lib/aruco/cv.js');
importScripts('../lib/aruco/aruco.js');
importScripts('../lib/aruco/svd.js');
importScripts('../lib/aruco/posit1.js');

// jsfeat
importScripts('../lib/jsfeat/jsfeat.js');

importScripts('../lib/ArtMobilib/artmobilib.js');



var _tag_detector = new AR.Detector();
var _tag_detector_enabled = true;

var _marker_tracker = new AM.MarkerTracker();
var _marker_tracker_enabled = true;

_marker_tracker.SetParameters({
  laplacian_threshold: 30,
  eigen_threshold: 25,
  detection_corners_max: 200,
  match_threshold: 40,
  num_train_levels: 3,
  image_size_max: 256,
  training_corners_max: 150,
  blur: true,
  blur_size: 5
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
  _marker_tracker.Log();

  _marker_tracker.ComputeImage(image_data);
  if (_marker_tracker.Match()) {
    return { corners: _marker_tracker.GetPose(), uuid: _marker_tracker.GetMatchUuid() };
  }

  return undefined;
}

function DetectTags(image) {
  return _tag_detector.detect(image);
}



function OnNewImage(data) {

  var tags;
  if (_tag_detector_enabled)
    tags = DetectTags(data.image);
  else
    tags = [];

  var marker;
  if (_marker_tracker_enabled)
    marker = DetectMarkerImage(data.image);

  SendResult(tags, marker, data.frame);
}

function AddMarker(data) {
  _marker_tracker.AddMarker(data.image_data, data.uuid);

  var msg = {
    cmd: 'marker_added',
    uuid: data.uuid
  };
  postMessage(msg);
}

function Clear() {
  _marker_tracker.ClearMarkers();
}

function ActiveAll(data) {
  _marker_tracker.ActiveAllMarkers(data.value);
}

function Active(data) {
  _marker_tracker.ActiveMarker(data.uuid, data.value);
}

function EnableTagDetection(data) {
  _tag_detector_enabled = data.value;
}

function EnableImageDetection(data) {
  _marker_tracker_enabled = data.value;
}

var _commands = {
  new_img: OnNewImage,
  add_marker: AddMarker,
  clear: Clear,
  active_all: ActiveAll,
  active: Active,
  enable_tag_detection: EnableTagDetection,
  enable_image_detection: EnableImageDetection
}

onmessage = function(e) {
  var cmd = e.data.cmd;

  var fun = _commands[cmd];
  if (fun) fun(e.data);
};
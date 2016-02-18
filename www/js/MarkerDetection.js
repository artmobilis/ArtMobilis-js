MarkerDetection = function() {
  var that = this;

  var _width = 640;
  var _height = 480;

  var _corners = [];
  var _laplacian_threshold = 30;
  var _min_eigen_value_threshold = 25;

  var _count = 0;

  var _max_corners = _width * _height;

  var _proc_img;

  for(var i = 0; i < _max_corners, ++i) {
    _corners.push(new jsfeat.keypoint_t(0, 0, 0, 0));
  }


  var SetProcImg = function() {
    var gray_img;

    return function(image_data) {
      if (!gray_img) {
        gray_img = new jsfeat.matrix(image_data.width, image_data.height, jsfeat.U8_t | jsfeat.C1_t);
      }
      jsfeat.imgproc.grayscale(image_data.data, image_data.width, image_data.height, gray_img);
      if (!_proc_img)
        _proc_img = new jsfeat.matrix(_width, _height, jsfeat.U8_t | jsfeat.C1_t);
      jsfeat.imgproc.resample(gray_img, _proc_img, _width, _height);
    }
  }();


  this.Detect = function(image_data) {
    jsfeat.yape06.laplacian_threshold = _laplacian_threshold;
    jsfeat.yape06.min_eigen_value_threshold = _min_eigen_value_threshold;

    SetProcImg(image_data);

    _count = jsfeat.yape06.detect(_proc_img, _corners);
  };
}
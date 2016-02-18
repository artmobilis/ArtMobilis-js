ImageLoader = function() {

  var _canvas = document.createElement('canvas');
  var _ctx = _canvas.getContext('2d');


  this.GetImageData = function(url, on_load, width, height) {
    var img = new Image();
    
    img.onload = function(img, on_load, width, height) {
      return function() {
        _canvas.width = width || img.width;
        _canvas.height = height || img.height;

        _ctx.drawImage(img, 0, 0, _canvas.width, _canvas.height);

        var image_data = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);

        on_load(image_data);
      }
    }(img, on_load, width, height);
    img.src = url;
  };

};
ImageLoader = function() {

  var _canvas = document.createElement('canvas');
  var _ctx = _canvas.getContext('2d');


  this.GetImageData = function(url, on_load, square) {
    var img = new Image();
    
    img.onload = function(img, on_load, square) {
      return function() {

        if (square) {
          var size = Math.max(img.width, img.height);
          var x = (size - img.width)  / 2;
          var y = (size - img.height) / 2;

          _canvas.width = size;
          _canvas.height = size;

          _ctx.drawImage(img, x, y);
        }
        else {
          _canvas.width = img.width;
          _canvas.height = img.height;

          _ctx.drawImage(img, 0, 0, _canvas.width, _canvas.height);
        }

        var image_data = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);

        on_load(image_data);
      }
    }(img, on_load, square);
    img.src = url;
  };

};
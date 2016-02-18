var JsonLoader = function() {
  var that = this;

  var _loading = false;
  var _on_load;
  var _on_error;
  var _on_progress;
  var _url;

  var _xhr;

  function OnEnd(callback) {
    _loading = false;
    _on_progress = undefined;
    _on_error = undefined;
    _on_load = undefined;
    _xhr = undefined;
    _url = undefined;
    that.progress = 0;
    if (callback)
      callback();
  }

  function OnLoad() {
    try
    {
      that.json = JSON.parse(_xhr.responseText);
      OnEnd(_on_load);
    }
    catch(e)
    {
      that.json = {};
      OnEnd(_on_error);
    }
  }

  function OnError(e) {
    console.log('JsonLoader failed to open file: ' + url);
    OnEnd(_on_error);
  }

  function OnProgress(e) {
    that.progress = (e.loaded / e.total) * 100;
    if (_on_progress)
      _on_progress();
  }


  this.json = {};
  this.progress = 0;

  this.IsLoading = function() {
    return _loading;
  };

  this.Load = function(url, on_load, on_error, on_progress) {
    if (!_loading) {
      _loading = true;

      _on_load = on_load;
      _on_error = on_error;
      _on_progress = on_progress;
      _url = url;

      _xhr = new XMLHttpRequest();
      _xhr.onprogress = OnProgress;
      _xhr.open("GET", url, true);
      _xhr.onload = OnLoad;
      _xhr.onerror = OnError;
      _xhr.send(null);
    }
  };
};
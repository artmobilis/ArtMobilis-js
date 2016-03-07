LoadingManager = function() {

  var _end_callbacks = [];
  var _progress_callbacks = [];
  var _loading = 0;

  function ProgressCallback() {
    for (fun of _progress_callbacks)
      fun();
  }
  

  this.Start = function(nbr) {
    nbr = nbr || 1;
    _loading += nbr;
    ProgressCallback();
  };

  this.End = function(nbr) {
    nbr = nbr || 1;
    if (_loading > 0) {
      _loading -= nbr;
      ProgressCallback();
    }
    if (_loading <= 0) {
      _loading = 0;
      for(fun of _end_callbacks)
        fun();
      _end_callbacks.length = 0;
      _progress_callbacks.length = 0;
    }
  };

  this.OnEnd = function(callback) {
    if (_loading > 0) {
      _end_callbacks.push(callback);
    }
    else
      callback();
  };

  this.OnProgress = function(callback) {
    if (_loading > 0) {
      _progress_callbacks.push(callback);
    }
    else
      callback();
  };

  this.IsLoading = function() {
    return _loading > 0;
  };

  this.GetRemaining = function() {
    return _loading;
  };

};
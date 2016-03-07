angular.module('starter')

.service('LoadingSvc', function() {
  var that = this;

  var _loading_manager = new AM.LoadingManager();

  var _end_nbr;
  var _loading_nbr;

  this.Start = function(nbr) {
    if (!nbr || nbr <= 0)
      nbr = 1;
    if (!that.IsLoading())
      Reset();
    _loading_nbr += nbr;
    _loading_manager.Start(nbr);
  };

  this.End = function(nbr) {
    if (!nbr || nbr <= 0)
      nbr = 1;
    _end_nbr += nbr;
    _loading_manager.End(nbr);
  };

  this.GetProgress = function() {
    if (_loading_nbr > 0) {
      return 100 * _end_nbr / _loading_nbr;
    }
    return 100;
  };

  this.IsLoading = function() {
    return _loading_manager.IsLoading();
  };

  this.OnEnd = function(callback) {
    _loading_manager.OnEnd(callback);
  };

  this.OnProgress = function(callback) {
    _loading_manager.OnProgress(callback);
  };

  function Reset() {
    _loading_nbr = 0;
    _end_nbr = 0;
  }
  
})
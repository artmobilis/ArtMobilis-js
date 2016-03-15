angular.module('starter')

.controller('LoadingCtrl', function($scope, $state, $stateParams, LoadingSvc) {
  var _running = false;
  var _progress = 0;
  var _speed = 0;


  $scope.progress = 0;

  LoadingSvc.OnProgress(function() {
    _progress = LoadingSvc.GetProgress();
  })

  $scope.$on('$destroy', function() {
    _running = false;
  });

  _running = true;
  function loop() {
    if (_running) {

      if ($scope.progress >= 100 && $stateParams.next_state) {
        $state.go($stateParams.next_state, $stateParams.next_state_params);
      }

      if ($scope.progress < _progress) {
        _speed += 0.1;
        $scope.progress += _speed;
        if ($scope.progress > _progress)
          $scope.progress = _progress;
      }
      else if ($scope.progress > _progress) {
        $scope.progress = _progress;
        _speed = 0;
      }
      else
        _speed = 0;
      $scope.$apply();
      window.requestAnimationFrame(loop);
    }
  }
  window.requestAnimationFrame(loop);

})
angular.module('artmobilis').controller('menuController',
  ['$scope',
    'globals',
    function (
      $scope,
      globals
      ) {
        // version
        $scope.getUserMedia = globals.config.device.getUsermedia;
}]);
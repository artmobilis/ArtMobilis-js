angular.module('artmobilis').controller('AProposController',
  ['$scope',
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    function (
      $scope,
      $location,
      $cordovaGeolocation,
      $stateParams
      ) {
        $scope.$on("$ionicView.loaded", function (e) {

        });

        $scope.$on("$ionicView.beforeLeave", function (e) {

        });
        var hasMed = function hasMed() {

            navigator.getUserMedia = (navigator.getUserMedia ||
               navigator.webkitGetUserMedia ||
               navigator.mozGetUserMedia ||
               navigator.msGetUserMedia);

            if (window.hasUserMedia()) {
                $scope.usermedia = "Browser supports getUserMedia.";
            } else {
                $scope.usermedia = "Browser does not support getUserMedia.";
            }

        };

        var hasGPS = function hasGPS() {

            navigator.getUserMedia = (navigator.getUserMedia ||
               navigator.webkitGetUserMedia ||
               navigator.mozGetUserMedia ||
               navigator.msGetUserMedia);

            if (window.hasUserMedia()) {
                $scope.gps = "Browser supports getUserMedia.";
            } else {
                $scope.gps = "Browser does not support getUserMedia.";
            }

        };

        $scope.$on('$ionicView.enter', function (e) {
            hasMed();
            hasGPS();

        });

    }]);
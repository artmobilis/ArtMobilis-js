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
        var hasUserMedia = function hasUserMedia() {

            navigator.getUserMedia = (navigator.getUserMedia ||
               navigator.webkitGetUserMedia ||
               navigator.mozGetUserMedia ||
               navigator.msGetUserMedia);

            if (window.hasUserMedia()) {
                $scope.usermedia = "getUserMedia supported by the browser.";
            } else {
                $scope.usermedia = "getUserMedia is not supported by the browser</em>";
            }
        };

        var hasGeolocation = function hasGeolocation() {

          if (navigator.geolocation) {
              $scope.gps = "Geolocation supported by the browser.";
              navigator.geolocation.getCurrentPosition(showPosition, showGeolocError);
          } else {
              $scope.gps = "Geolocation is not supported by the browser.";
          }

        };

        function showPosition(position) {
            $scope.gps += "Lat:" + position.coords.latitude +
            "Long:" + position.coords.longitude;
        }

        function showGeolocError(error) {
          switch(error.code) {
            case error.PERMISSION_DENIED:
                $scope.gps += " User denied the request for Geolocation."
                break;
            case error.POSITION_UNAVAILABLE:
                $scope.gps += " Location information is unavailable."
                break;
            case error.TIMEOUT:
                $scope.gps += " The request to get user location timed out."
                break;
            case error.UNKNOWN_ERROR:
                $scope.gps += " An unknown error occurred."
                break;
          }
}

        $scope.$on('$ionicView.enter', function (e) {
            hasUserMedia();
            hasGeolocation();

        });

    }]);
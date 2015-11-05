angular.module('artmobilis').controller('AProposController',
  ['$scope',
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    'globals',
    function (
      $scope,
      $location,
      $cordovaGeolocation,
      $stateParams,
      globals
      ) {
        $scope.$on("$ionicView.loaded", function (e) {
          // get the config
          console.log(globals.config);
          console.log(globals.journey);
        });

        $scope.$on("$ionicView.beforeLeave", function (e) {

        });
        
        // OnLine/Offline
        {
          if(navigator.onLine){ // always respond true under firefox41 + linux
            $scope.infoOnline = "The browser is online.";
            }
            else {
            $scope.infoOnline = "The browser is offline.";
          }
        }

        // Browser Type
        {
          $scope.infoBrowser = navigator.userAgent;
        }

        // Browser size & Screen Res
        {
          var screenResolution = '', screenColorDepth = '';
          if (self.screen) {
            screenResolution = screen.width + ' x ' + screen.height;
            screenColorDepth = screen.colorDepth + ' bit';
          }

          var bsw = '', bsh = '';
          if (window.innerWidth){
            bsw = window.innerWidth;
            bsh = window.innerHeight;
          }
          else if (document.documentElement){
            bsw = document.documentElement.clientWidth;
            bsh = document.documentElement.clientHeight;
          }
          else if (document.body){
            bsw = document.body.clientWidth;
            bsh = document.body.clientHeight;
          }
          if (bsw != '' && bsh != ''){
            $scope.infoSize = "Screen resolution :" + screenResolution + " , color depth :" + screenColorDepth + " , browser size :" + bsw + ' x ' + bsh + ".";
          }
        }

        // hasUserMedia
        var getInfoUserMedia = function getInfoUserMedia() {
          navigator.getUserMedia = (navigator.getUserMedia ||
             navigator.webkitGetUserMedia ||
             navigator.mozGetUserMedia ||
             navigator.msGetUserMedia);

          if (window.hasUserMedia()) {
              $scope.infoUsermedia = "getUserMedia supported by the browser.";
          } else {
              $scope.infoUsermedia = "getUserMedia is not supported by the browser";
          }
        };

        // hasGeolocation
        var getInfoGeolocation = function getInfoGeolocation() {
          if (navigator.geolocation) {
              $scope.infoGps = "Geolocation supported by the browser.";
              navigator.geolocation.getCurrentPosition(getGeolocPosition, getGeolocError);
          } else {
              $scope.infoGps = "Geolocation is not supported by the browser.";
          }
        };

        function getGeolocPosition(position) {
          $scope.infoGps += "Lat:" + position.coords.latitude +
          "Long:" + position.coords.longitude;
        }

        function getGeolocError(error) {
          switch(error.code) {
            case error.PERMISSION_DENIED:
                $scope.infoGps += " User denied the request for Geolocation."
                break;
            case error.POSITION_UNAVAILABLE:
                $scope.infoGps += " Location information is unavailable."
                break;
            case error.TIMEOUT:
                $scope.infoGps += " The request to get user location timed out."
                break;
            case error.UNKNOWN_ERROR:
                $scope.infoGps += " An unknown error occurred."
                break;
          }
        }

        // platform
        var getInfoPlatform = function getInfoPlatform() {
            $scope.infoPlatform = "Platform:" + ionic.Platform.platform();
        };

        $scope.$on('$ionicView.enter', function (e) {
            getInfoUserMedia();
            getInfoGeolocation();
            getInfoPlatform();

        });

    }]);
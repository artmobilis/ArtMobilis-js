angular.module('artmobilis').controller('aboutController',
  ['$scope',
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    'APP_VERSION',
    'globals',
    function (
      $scope,
      $location,
      $cordovaGeolocation,
      $stateParams,
      APP_VERSION,
      globals
      ) {
        // version
        $scope.appVersion = APP_VERSION;

        // platform
        $scope.infoPlatform = ionic.Platform.platform();

        // OnLine/Offline
        $scope.online = navigator.onLine;// always respond true under firefox41 + linux

        // Browser Type
        $scope.infoBrowser = navigator.userAgent;

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
            $scope.infoSize = "Résolution écran : " + screenResolution + " , profondeur de couleurs :" + screenColorDepth + " , taille du navigateur :" + bsw + ' x ' + bsh + ".";
          }
        }

        // hasUserMedia
        if (globals.config.device.getUsermedia) {
            $scope.infoUsermedia = "getUserMedia est supporté par le navigateur.";
        } else {
            $scope.infoUsermedia = "getUserMedia n'est pas supporté par le navigateur.";
        }

        // hasGeolocation
        var getInfoGeolocation = function getInfoGeolocation() {
          if (navigator.geolocation) {
              $scope.infoGps = "La géolocalisation est supportée par le navigateur.";
              navigator.geolocation.getCurrentPosition(getGeolocPosition, getGeolocError);
          } else {
              $scope.infoGps = "La géolocalisation n'est pas supportée par le navigateur.";
          }
        };

        function getGeolocPosition(position) {
          $scope.infoGps += " Lat:" + position.coords.latitude +
          " / Long:" + position.coords.longitude;
        }

        function getGeolocError(error) {
          switch(error.code) {
            case error.PERMISSION_DENIED:
                $scope.infoGps += " L'utilisateur a refusé la géolocalisation."
                break;
            case error.POSITION_UNAVAILABLE:
                $scope.infoGps += " Les informations de géolocalisation sont inaccessibles."
                break;
            case error.TIMEOUT:
                $scope.infoGps += " La demande de géolocalisation a expirée."
                break;
            case error.UNKNOWN_ERROR:
                $scope.infoGps += " Erreur inatendue."
                break;
          }
        }

        $scope.$on('$ionicView.enter', function (e) {
            getInfoGeolocation();
        });

        $scope.$on("$ionicView.loaded", function (e) {

        });

        $scope.$on("$ionicView.beforeLeave", function (e) {

        });

    }]);
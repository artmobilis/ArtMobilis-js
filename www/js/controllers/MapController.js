//old source : http://tombatossals.github.io/angular-leaflet-directive/examples/json/paths.json
angular.module('artmobilis').controller('MapController',
  ['$scope',
    "$http",
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    'InstructionsService',
    'globals',
    function (
      $scope,
      $http,
      $location,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      InstructionsService,
      globals
      ) {

        // init icons
        var local_icons = globals.config.map.icons;

        // init paths
        globals.journey.properties.itinerary.paths = {
          'markers': {
            'color': '#F00',
            'weight': 8,
            'latlngs': []
          },
          'poi': {
            'color': '#F0F',
            'weight': 8,
            'latlngs': []
          }
        };

        // init markers
        globals.journey.properties.itinerary.markers = [];

        // get markers
        angular.forEach(globals.journey.marker, function(value, key) {
          // get marker
          var marker = {
            'lat': value.geolocLat,
            'lng': value.geolocLng,
            'message': value.name,
            'icon': value.geolocIcon,
            'focus': false,
            'draggable': false
          };
          globals.journey.properties.itinerary.markers.push(marker);
          // get path
          var latlng = {
            'lat': value.geolocLat,
            'lng': value.geolocLng
          };
          globals.journey.properties.itinerary.paths.markers.latlngs.push(latlng);
        });

        // get pois
        angular.forEach(globals.journey.poi, function(value, key) {
          // get poi
          var poi = {
            'lat': value.geolocLat,
            'lng': value.geolocLng,
            'message': value.name,
            'icon': value.geolocIcon,
            'focus': false,
            'draggable': false
          };
          if (value.id == 0) {
            poi.focus = true;
          }
          globals.journey.properties.itinerary.markers.push(poi);
          // get path
          var latlng = {
            'lat': value.geolocLat,
            'lng': value.geolocLng
          };
          globals.journey.properties.itinerary.paths.poi.latlngs.push(latlng);
        });

        // get center
        var center = {
          'lat': globals.journey.properties.territory.center.geolocLat,
          'lng': globals.journey.properties.territory.center.geolocLng,
          'zoom': globals.config.map.center.zoom
        };

        // send values to the view
        angular.extend($scope, {
          center:     center,
          defaults:   globals.config.map.defaults,
          legend:     globals.config.map.legend,
          icons:      local_icons,
          markers:    globals.journey.properties.itinerary.markers,
          itinerary:  globals.journey.properties.itinerary.paths
        });

        /**
         * Ionic on
         */
        $scope.$on("$ionicView.loaded", function (e) {

        });

        /**
         * popupClick
         * @param destinationUrl
         */
        $scope.popupClick = function (destinationUrl) {
            console.log("popupClick url:" + destinationUrl);
            if (destinationUrl === 'undefined') {
                console.log("popupClick url undefined");
            } else {
                $location.path(destinationUrl);
            }
        }

        /**
         * Center map on specific saved location
         * @param locationKey
         */
        $scope.goTo = function (locationKey) {

        };

        /**
         * show location
         * @param locationKey
         */
        $scope.show = function (locationKey) {


        };

        /**
         * Center map on user's current position
         */
        $scope.locate = function () {
          $cordovaGeolocation
            .getCurrentPosition()
            .then(function (position) {
              $scope.center.lat = position.coords.latitude;
              $scope.center.lng = position.coords.longitude;
              $scope.center.zoom = 16;
              var now = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                message: "Vous êtes ici",
                icon: local_icons.here_icon,
                focus: true,
                draggable: false
              };
              $scope.markers.push(now);
            }, function (err) {
              // error
              console.log("Error getting position!");
              console.log(err);
            });
        };

    }]);
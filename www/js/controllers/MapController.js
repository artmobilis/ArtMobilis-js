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
        // set defaults
        $scope.center = globals.config.map.center;
        $scope.defaults = globals.config.map.defaults;
        $scope.itinerary = {};
        $scope.legend = globals.config.map.legend;

        // markers icons
        var local_icons = globals.config.map.icons;
        $scope.icons = local_icons;

        // init paths
        globals.journey.properties.itinerary.paths = {};
        globals.journey.properties.itinerary.paths.markers = {};
        globals.journey.properties.itinerary.paths.markers.color = "#F00";
        globals.journey.properties.itinerary.paths.markers.weight = 8;
        globals.journey.properties.itinerary.paths.markers.latlngs = [];
        globals.journey.properties.itinerary.paths.poi = {};
        globals.journey.properties.itinerary.paths.poi.color = "#F0F";
        globals.journey.properties.itinerary.paths.poi.weight = 8;
        globals.journey.properties.itinerary.paths.poi.latlngs = [];

        // markers
        globals.journey.properties.itinerary.markers = [];

        angular.forEach(globals.journey.marker, function(value, key) {
          var marker = {};
          marker.lat = value.geolocLat;
          marker.lng = value.geolocLng;
          marker.message = value.name;
          marker.icon = local_icons.red_icon;
          marker.focus = false;
          marker.draggable = false;
          globals.journey.properties.itinerary.markers.push(marker);
          // get path
          var latlng = {};
          latlng.lat = value.geolocLat;
          latlng.lng = value.geolocLng;
          globals.journey.properties.itinerary.paths.markers.latlngs.push(latlng);
        });

        // poi
        angular.forEach(globals.journey.poi, function(value, key) {
          var poi = {};
          poi.lat = value.geolocLat;
          poi.lng = value.geolocLng;
          poi.message = value.name;
          poi.icon = local_icons.purple_icon;
          if (value.id == 0) {
            poi.focus = true;
          }
          poi.draggable = false;
          globals.journey.properties.itinerary.markers.push(poi);
          // get path
          var latlng = {};
          latlng.lat = value.geolocLat;
          latlng.lng = value.geolocLng;
          globals.journey.properties.itinerary.paths.poi.latlngs.push(latlng);
        });
        $scope.markers = globals.journey.properties.itinerary.markers;
        $scope.itinerary = globals.journey.properties.itinerary.paths;

        $scope.$on("$ionicView.loaded", function (e) {
            console.log("loaded");
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
                  $scope.center.zoom = 12;

                  $scope.markers.now = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      message: "You are here",
                      icon: local_icons.here_icon,
                      focus: true,
                      draggable: false
                  };

              }, function (err) {
                  // error
                  console.log("Error getting position!");
                  console.log(err);
              });

        };

    }]);
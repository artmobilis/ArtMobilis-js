//http://tombatossals.github.io/angular-leaflet-directive/examples/json/paths.json
angular.module('artmobilis').controller('MapController',
  ['$scope',
    "$http",
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    function (
      $scope,
      $http,
      $location,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      InstructionsService
      ) {
        //
        angular.extend($scope, {
            center: {
                lng: 7.2868098,
                lat: 43.7141482,
                zoom: 14
            },
            defaults: {
                tileLayer: 'http://tile.stamen.com/watercolor/{z}/{x}/{y}.png',
                maxZoom: 20,
                zoomControlPosition: 'bottomleft'
            },
            parcours: {}
        });
        $scope.$on("$ionicView.loaded", function (e) {

            console.log("loaded");
            $scope.loadPaths();
        });
        $scope.loadPaths = function loadPaths() {
            console.log("loadPaths");
            $http.get("json/itineraire.json").success(function (data) {
                console.log("loadPaths ok" + data);
                $scope.parcours = data;
                $scope.markers = data;
                // modify marker data
                for (var key in $scope.markers) {
                    if ($scope.markers.hasOwnProperty(key)) {
                        var obj = $scope.markers[key];
                        for (var prop in obj) {
                            // important check that this is objects own property 
                            // not from prototype prop inherited
                            if (obj.hasOwnProperty(prop)) {
                                //console.log(prop + " = " + obj[prop]);
                                if (prop === "icon") obj[prop] = eval(obj[prop]);
                            }
                        }
                        obj.focus = true;
                    }
                }
            });
        };

        // legende
        $scope.legend = {
            position: 'bottomleft',
            colors: ['#F00'],
            labels: ['Le hublot']
        };
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
        // icones markers
        var local_icons = {
            default_icon: {},
            ici_icon: {
                iconSize: [138, 95],
                shadowSize: [50, 64],
                iconAnchor: [22, 94],
                shadowAnchor: [4, 62]
            },
            blue_icon: {
                iconUrl: 'img/icones/marker-icon-blue.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            orange_icon: {
                iconUrl: 'img/icones/marker-icon-orange.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            green_icon: {
                iconUrl: 'img/icones/marker-icon-green.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            grey_icon: {
                iconUrl: 'img/icones/marker-icon-grey.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            red_icon: {
                iconUrl: 'img/icones/marker-icon-red.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            purple_icon: {
                iconUrl: 'img/icones/marker-icon-purple.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            },
            yellow_icon: {
                iconUrl: 'img/icones/marker-icon-yellow.png',
                shadowUrl: 'img/icones/markers_shadow.png',
                iconAnchor: [11, 38]
            }
        };
        $scope.icons = local_icons;
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
                      message: "Vous êtes ici",
                      icon: local_icons.ici_icon,
                      focus: true,
                      draggable: false
                  };

              }, function (err) {
                  // error
                  console.log("Erreur de position!");
                  console.log(err);
              });

        };

    }]);
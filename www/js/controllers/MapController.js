angular.module('artmobilis').controller('MapController',
  ['$scope',
    '$location',
    '$cordovaGeolocation',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    'LocationsService',
    'InstructionsService',
    function (
      $scope,
      $location,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      LocationsService,
      InstructionsService
      ) {
        $scope.$on('$ionicView.enter', function (e) {

        });
        $scope.$on("$ionicView.loaded", function (e) {
          
            $scope.locations = LocationsService.savedLocations;
            //$scope.newLocation;

            $scope.map = {
                defaults: {
                    tileLayer: 'http://tile.stamen.com/watercolor/{z}/{x}/{y}.png',
                    maxZoom: 18,
                    zoomControlPosition: 'bottomleft'
                },
                markers: {},
                events: {
                    map: {
                        enable: ['context'],
                        logic: 'emit'
                    }
                }
            };

            for (var i = LocationsService.savedLocations.length - 1; i >= 0; i--) {
                $scope.show(i);
            };

            $scope.goTo(0); 

            
        });

        $scope.$on("$ionicView.beforeLeave", function (e) {

        });
 

        var Location = function () {
            if (!(this instanceof Location)) return new Location();
            this.lat = "";
            this.lng = "";
            this.name = "";
        };
        // legende
        /* Paysages=green
        Histoire=red
        Religieux=grey
        Vernaculaire=yellow
        Artistique =purple
        Contemporain=orange*/
        $scope.legend = {
            position: 'bottomleft',
            colors: ['#40bf58', '#d0464a', '#983bb2'],
            labels: ['Paysages', 'Histoire', 'Artistique']
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
            leaf_icon: {
                iconUrl: 'img/icones/marker-icon-blue.png',
                iconSize: [38, 95], // size of the icon
                shadowSize: [50, 64], // size of the shadow
                iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
                shadowAnchor: [4, 62],  // the same for the shadow
                popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
            },
            text_icon: {
                type: 'div',
                iconSize: [230, 0],
                html: 'Using <strong>Bold text as an icon</strong>: Lisbon',
                popupAnchor: [0, 0]
            },
            ici_icon: {
                backgroundColor: 'green',
                iconSize: [138, 95],
                shadowSize: [50, 64],
                iconAnchor: [22, 94],
                shadowAnchor: [4, 62]
            },
            blue_icon: {
                iconUrl: 'img/icones/marker-icon-blue.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            orange_icon: {
                iconUrl: 'img/icones/marker-icon-orange.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            green_icon: {
                iconUrl: 'img/icones/marker-icon-green.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            grey_icon: {
                iconUrl: 'img/icones/marker-icon-grey.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            red_icon: {
                iconUrl: 'img/icones/marker-icon-red.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            purple_icon: {
                iconUrl: 'img/icones/marker-icon-purple.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            },
            yellow_icon: {
                iconUrl: 'img/icones/marker-icon-yellow.png',
                shadowUrl: 'img/icones/markers_shadow.png'
            }
        };
        $scope.icons = local_icons;
        /**
         * Center map on specific saved location
         * @param locationKey
         */
        $scope.goTo = function (locationKey) {

            var poi = LocationsService.savedLocations[locationKey];

            $scope.map.center = {
                lat: poi.lat,
                lng: poi.lng,
                zoom: 12
            };
            // https://github.com/coryasilva/Leaflet.ExtraMarkers
            $scope.map.markers[locationKey] = {
                lat: poi.lat,
                lng: poi.lng,
                message: '<span><a ng-click="popupClick(\'' + poi.url + '\')"><img ng-src="' + poi.vignette + '"></img>' + poi.name + '<br />' + poi.sousTitre + '</a></span><br />',
                icon: eval(poi.icon),
                focus: true,
                draggable: false,
                getMessageScope: function () { return $scope; }
            };

        };
        /**
         * show location
         * @param locationKey
         */
        $scope.show = function (locationKey) {

            var poi = LocationsService.savedLocations[locationKey];
            console.log(poi.icon);

            //console.log("redMarker " + redMarker);icon: {iconUrl: 'img/icones/' + poi.icon}
            $scope.map.markers[locationKey] = {
                lat: poi.lat,
                lng: poi.lng,
                icon: eval(poi.icon),
                message: '<span><a ng-click="popupClick(\'' + poi.url + '\')"><img ng-click="popupClick(\'' + poi.url + '\')" ng-src="' + poi.vignette + '"></img>' + poi.name + '<br />' + poi.sousTitre + '</a></span><br />',
                focus: false,
                draggable: false,
                getMessageScope: function () { return $scope; }
            };

        };


        /**
         * Center map on user's current position
         */
        $scope.locate = function () {

            $cordovaGeolocation
              .getCurrentPosition()
              .then(function (position) {
                  $scope.map.center.lat = position.coords.latitude;
                  $scope.map.center.lng = position.coords.longitude;
                  $scope.map.center.zoom = 15;

                  $scope.map.markers.now = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      message: "Vous êtes ici<i class=\"fa fa-camera-retro fa-lg\" ></i>",
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
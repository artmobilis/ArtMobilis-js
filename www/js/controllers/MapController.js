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
                maxZoom: 18,
                zoomControlPosition: 'bottomleft'
            },
            parcours: {}
        });
        $scope.$on("$ionicView.loaded", function (e) {

            console.log("loaded");
            $scope.loadPaths();
        });
        /*
                   $scope.markers[locationKey] = {
                lat: poi.lat,
                lng: poi.lng,
                message: '<span><img ng-src="' + poi.vignette + '"></img><h3>' + poi.name + '</h3><br />' + poi.sousTitre + '</span><br />',
                icon: eval(poi.icon),
                focus: true,
                draggable: false,
                getMessageScope: function () { return $scope; }
            };
        */
        $scope.loadPaths = function loadPaths() {
            console.log("loadPaths");
            $http.get('json/parcours.json').success(function (data) {
                console.log("loadPaths ok" +  data);

                $scope.parcours = {};
                $scope.markers = {};
                // ajout markers
                for (var i = 0; i < data.length; i++) {
                    var parcours = data[i].latlngs;
                    var latlong = parcours[0];
                    if (latlong[0] !== undefined) {
                        $scope.markers[i] = {
                            lat: latlong[1],
                            lng: latlong[0],
                            message: "<span><h3>" + data[i].message + "</h3>",
                            icon: local_icons.purple_icon,
                            focus: true,
                            draggable: false,
                            getMessageScope: function () { return $scope; }
                        };
                    }
                }
                
                $scope.parcours = data;
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
                // $location.path(destinationUrl);
            }
        }
        // icones markers
        var local_icons = {
            default_icon: {},
            text_icon: {
                type: 'div',
                iconSize: [230, 0],
                html: 'Using <strong>Bold text as an icon</strong>',
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
// générer les marqueurs avec http://terpconnect.umd.edu/~jwelsh12/enes100/markergen.html
// explications http://iplimage.com/blog/create-markers-aruco/
// TODO MediaStream.stop()' is deprecated and will be removed in M47, around November 2015. Please use 'MediaStream.active' instead.
angular.module('artmobilis').controller('ARController',
  ['$scope',
    '$cordovaGeolocation',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    'ARService',
    'globals',
    function (
      $scope,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      ARService,
      globals
      ) {
        console.log(globals.config);
          console.log(globals.journey);
        $scope.isVideo = false;
        $scope.initialized = false;
        $scope.requestId = undefined;
        $scope.video = null;
        // this has to be done BEFORE webcam authorization
        $scope.channel = {
            videoHeight: 800,
            videoWidth: 600,
            video: null // Will reference the video element on success
        };
        $scope.video = $scope.channel.video;
        $scope.foundMarkerId = -1;
        $scope.alpha = 0.3;

        // http://ionicframework.com/docs/api/directive/ionView/
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        $scope.$on('$ionicView.enter', function (e) {
            // start webcam when back on the page, not the first time
            if ($scope.initialized) {
                $scope.$broadcast('START_WEBCAM');
            }
            $scope.initialized = true;
            startAnimation();
        });
        $scope.$on("$ionicView.loaded", function (e) {

            // canevas
            $scope.canvas = angular.element(document.getElementById('canevas'));
            $scope.ctx = $scope.canvas[0].getContext("2d");
            $scope.detector = new AR.Detector();

        });

        $scope.$on("$ionicView.beforeLeave", function (e) {
            stopAnimation();
            $scope.$broadcast('STOP_WEBCAM');
        });

        $scope.channel = {};
        $scope.onError = function (err) {
            $scope.infos = "webcam onError";
            //console.log("webcam onError");
        };
        $scope.onStream = function (stream) {
            //$scope.infos = "webcam onStream";
            //console.log("webcam onStream, frame:" + $scope.framecount);
        };
        $scope.onSuccess = function () {
            //$scope.infos = "webcam onSuccess";
            //console.log("webcam onSuccess, frame:" + $scope.framecount);
        };
        // remplace le placeholder par un canvas créé par glfx
        var initGlfx = function initGlfx() {

            var placeholder = document.getElementById('placeholder');
            // Try to get a WebGL canvas
            try {
                $scope.canvasGlfx = fx.canvas();
            } catch (e) {
                placeholder.innerHTML = e;
                return;
            }
            $scope.canvasGlfx.replace(placeholder);
        };
        // affiche l'image du marker id correspondant
        $scope.showMarker = function (markerId) {

            $scope.poi = ARService.marqueurs[markerId];
            if ($scope.poi !== undefined) {
                // init glfx if needed
                if ($scope.canvasGlfx === undefined) {
                    initGlfx();
                }
                if ($scope.canvasGlfx !== undefined) {
                    // check if a video url exists
                    if ($scope.poi.video === undefined) {
                        // it's an image src only
                        $scope.isVideo = false;
                        $scope.glfxImage = new Image();
                        $scope.glfxImage.src = $scope.poi.vignette;
                        $scope.glfxImage.onload = function () {
                            $scope.texture = $scope.canvasGlfx.texture($scope.glfxImage);
                        }
                    } else {
                        // it's a video
                        if ($scope.glfxVideo === undefined) {
                            // load image fallback
                            $scope.glfxImage = new Image();
                            $scope.glfxImage.src = $scope.poi.vignette;
                            $scope.glfxImage.onload = function () {
                                $scope.texture = $scope.canvasGlfx.texture($scope.glfxImage);
                            }
                            try {
                                $scope.glfxVideo = new Video();
                            } catch (e) {
                                $scope.glfxVideo = document.createElement('video');
                            }
                            $scope.glfxVideo.src = $scope.poi.video;
                            $scope.glfxVideo.load();
                            $scope.glfxVideo.play();
                        }
                        //$scope.infos = $scope.poi.video;
                        if ($scope.glfxVideo !== undefined) {
                            if ($scope.glfxVideo.videoWidth > 0) {
                                $scope.glfxVideo.loop = true;
                                $scope.texture = $scope.canvasGlfx.texture($scope.glfxVideo);
                                $scope.isVideo = true;

                            }
                        }

                    }
                }
            }
        };
        function startAnimation() {
            if (!$scope.requestId) {
                tick();
            }
        }

        function stopAnimation() {
            if ($scope.requestId) {
                window.cancelAnimationFrame($scope.requestId);
                $scope.requestId = undefined;
            }
        }
        // animation loop
        function tick() {
            $scope.video = $scope.channel.video;
            if ($scope.video) {
                if ($scope.video.width > 0) {
                    //console.log("video width" + $scope.video.width);
                    var videoData = getVideoData(0, 0, $scope.video.width, $scope.video.height);
                    $scope.ctx.putImageData(videoData, 0, 0);
                    $scope.imageData = $scope.ctx.getImageData(0, 0, $scope.canvas[0].width, $scope.canvas[0].height);
                    $scope.markers = $scope.detector.detect($scope.imageData);
                    $scope.drawCorners($scope.markers);
                    // adapt alpha depending on marker found
                    if ($scope.foundMarkerId > -1) {
                        $scope.showMarker($scope.foundMarkerId);
                        if ($scope.alpha < 1.0) $scope.alpha += 0.1;
                    } else {
                        if ($scope.alpha > 0.0) $scope.alpha -= 0.05;
                    }
                    if ($scope.alpha > 0.0) {
                        // $scope.drawId($scope.markers);
                        // glfx
                        var scaleW = 1.0;
                        var scaleH = 1.0;
                        var tw = 1.0;
                        var th = 1.0;
                        var validTexture = false;

                        if ($scope.isVideo) {
                            // video
                            if ($scope.canvasGlfx !== undefined && $scope.glfxVideo !== undefined && $scope.glfxVideo.videoWidth > 0 && $scope.corners !== undefined) {
                                tw = $scope.glfxVideo.videoWidth;
                                th = $scope.glfxVideo.videoHeight;
                                scaleW = tw / $scope.canvas[0].width;
                                scaleH = th / $scope.canvas[0].height;
                                validTexture = true;
                            }
                        } else {
                            // image
                            if ($scope.canvasGlfx !== undefined && $scope.glfxImage !== undefined && $scope.glfxImage.width > 0 && $scope.corners !== undefined) {
                                tw = $scope.glfxImage.width;
                                th = $scope.glfxImage.height;
                                scaleW = tw / $scope.canvas[0].width;
                                scaleH = th / $scope.canvas[0].height;
                                validTexture = true;
                            }
                        }
                        if (validTexture) {
                            $scope.canvasGlfx.draw($scope.texture).perspective([0, 0, tw, 0, tw, th, 0, th], [$scope.corners[0].x * scaleW, $scope.corners[0].y * scaleH, $scope.corners[1].x * scaleW, $scope.corners[1].y * scaleH, $scope.corners[2].x * scaleW, $scope.corners[2].y * scaleH, $scope.corners[3].x * scaleW, $scope.corners[3].y * scaleH]).alpha($scope.alpha).update();

                        }
                    }

                }
            }
            $scope.requestId = requestAnimationFrame(tick);
        }

        var getVideoData = function getVideoData(x, y, w, h) {
            var hiddenCanvas = document.createElement('canvas');
            hiddenCanvas.width = $scope.video.width;
            hiddenCanvas.height = $scope.video.height;
            var ctx = hiddenCanvas.getContext('2d');
            ctx.drawImage($scope.video, 0, 0, $scope.video.width, $scope.video.height);
            return ctx.getImageData(x, y, w, h);
        };
        $scope.drawCorners = function (markers) {
            var corners, corner, i, j;
            // init $scope.foundMarkerId to -1 to avoid redraw
            $scope.foundMarkerId = -1;

            $scope.ctx.lineWidth = 3;
            if (markers.length > 0) {
                $scope.corners = markers[0].corners;
                $scope.foundMarkerId = markers[0].id.toString();
                $scope.infos = "id: " + $scope.foundMarkerId;
            }
            /*for (i = 0; i !== markers.length; ++i) {
                corners = markers[i].corners;

                $scope.ctx.strokeStyle = "red";
                $scope.ctx.beginPath();

                for (j = 0; j !== corners.length; ++j) {
                    corner = corners[j];
                    $scope.ctx.moveTo(corner.x, corner.y);
                    corner = corners[(j + 1) % corners.length];
                    $scope.ctx.lineTo(corner.x, corner.y);
                }

                $scope.ctx.stroke();
                $scope.ctx.closePath();

                $scope.ctx.strokeStyle = "green";
                $scope.ctx.strokeRect(corners[0].x, corners[0].y, 4, 4);
                $scope.ctx.strokeStyle = "yellow";
                $scope.ctx.strokeRect(corners[1].x, corners[1].y, 4, 4);
                $scope.ctx.strokeStyle = "purple";
                $scope.ctx.strokeRect(corners[2].x, corners[2].y, 4, 4);
                $scope.ctx.strokeStyle = "blue";
                $scope.ctx.strokeRect(corners[3].x, corners[3].y, 4, 4);

                // selectionner les coins du 1e marker  
                if (i == 0) {
                    $scope.foundMarkerId = markers[i].id.toString();
                    $scope.corners = markers[i].corners;
                    $scope.ctx.lineWidth = 1;
                }
            }*/
        }

        /*$scope.drawId = function (markers) {
            var corners, corner, x, y, i, j;
            $scope.ctx.lineWidth = 1;

            for (i = 0; i !== markers.length; ++i) {
                corners = markers[i].corners;

                x = Infinity;
                y = Infinity;

                for (j = 0; j !== corners.length; ++j) {
                    $scope.ctx.strokeStyle = "green";
                    corner = corners[j];

                    x = Math.min(x, corner.x);
                    y = Math.min(y, corner.y);
                    $scope.ctx.strokeText(corner.x + "," + corner.y, corner.x, corner.y)
                }

                $scope.ctx.strokeStyle = "blue";
                $scope.ctx.strokeText(markers[i].id, x, y)
            }
        }*/
    }]);
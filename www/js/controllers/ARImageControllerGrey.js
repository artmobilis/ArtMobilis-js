angular.module('artmobilis').controller('ARImageController',
  [ '$scope',
    '$cordovaGeolocation',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    'LocationsService',
    'InstructionsService',
    function(
      $scope,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      LocationsService,
      InstructionsService
      ) {
        // lets do some fun
        var video = document.getElementById('webcam');
        var canvas = document.getElementById('canvas');
        var timeproc = document.getElementById('timeproc');

        try {
            var attempts = 0;
            var readyListener = function (event) {
                findVideoSize();
            };
            var findVideoSize = function () {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    video.removeEventListener('loadeddata', readyListener);
                    onDimensionsReady(video.videoWidth, video.videoHeight);
                } else {
                    if (attempts < 10) {
                        attempts++;
                        setTimeout(findVideoSize, 200);
                    } else {
                        onDimensionsReady(640, 480);
                    }
                }
            };
            var onDimensionsReady = function (width, height) {
                demo_app(width, height);
                compatibility.requestAnimationFrame(tick);
            };

            video.addEventListener('loadeddata', readyListener);

            compatibility.getUserMedia({ video: true }, function (stream) {
                try {
                    video.src = compatibility.URL.createObjectURL(stream);
                } catch (error) {
                    video.src = stream;
                }
                setTimeout(function () {
                    video.play();
                    demo_app();

                    compatibility.requestAnimationFrame(tick);
                }, 500);
            }, function (error) {
                console.log("error gum");
                //$('#canvas').hide();
                //$('#log').hide();
                //$('#no_rtc').html('<h4>WebRTC not available.</h4>');
                //$('#no_rtc').show();
            });
        } catch (error) {
                console.log("error a");
            //$('#canvas').hide();
            //$('#log').hide();
            //$('#no_rtc').html('<h4>Something goes wrong...</h4>');
            //$('#no_rtc').show();
        }

        var stat = new profiler();
        stat.add("grayscale");

        var gui, ctx, canvasWidth, canvasHeight;
        var img_u8;

        function demo_app(videoWidth, videoHeight) {
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;
            ctx = canvas.getContext('2d');

            ctx.fillStyle = "rgb(0,255,0)";
            ctx.strokeStyle = "rgb(0,255,0)";

            img_u8 = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
        }

        function tick() {
            compatibility.requestAnimationFrame(tick);
            stat.new_frame();
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                ctx.drawImage(video, 0, 0, 640, 480);
                var imageData = ctx.getImageData(0, 0, 640, 480);

                stat.start("grayscale");
                jsfeat.imgproc.grayscale(imageData.data, 640, 480, img_u8);
                stat.stop("grayscale");

                // render result back to canvas
                var data_u32 = new Uint32Array(imageData.data.buffer);
                var alpha = (0xff << 24);
                var i = img_u8.cols * img_u8.rows, pix = 0;
                while (--i >= 0) {
                    pix = img_u8.data[i];
                    data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
                }

                ctx.putImageData(imageData, 0, 0);
                timeproc.innerHTML = stat.log();
            }
        }

        this.timeproc = function timeproc() {
            return timeproc;
        };

        $scope.saveReference = function () {
            console.log("save image : %s\n", $scope.refname);
        }

        //$(window).unload(function () {
        //    video.pause();
        //    video.src = null;
        //});


    }]);
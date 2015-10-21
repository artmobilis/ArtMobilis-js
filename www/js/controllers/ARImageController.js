angular.module('artmobilis').controller('ARImageController',
  ['$scope',
    '$cordovaGeolocation',
  //  '$cordovaFile',
    '$stateParams',
    '$ionicModal',
    '$ionicPopup',
    'LocationsService',
    'InstructionsService',
    function (
      $scope,
      $cordovaGeolocation,
      $stateParams,
      $ionicModal,
      $ionicPopup,
      LocationsService,
      InstructionsService
      ) {
        var imWidth = 640, imHeight = 480; // size of pipeline processing

        $scope.isVideo = false;
        $scope.initialized = false;
        $scope.requestId = undefined;
        $scope.video = null;
        // this has to be done BEFORE webcam authorization
        $scope.channel = {
            videoHeight: imHeight,
            videoWidth: imWidth,
            video: null // Will reference the video element on success
        };
        $scope.video = $scope.channel.video;
        var canvas2d;
        var canvas3D;
        var container;
        var timeproc;
        var matchingresult;


        // http://ionicframework.com/docs/api/directive/ionView/
        // With the new view caching in Ionic, Controllers are only called
        // when they are recreated or on app start, instead of every page change.
        // To listen for when this page is active (for example, to refresh data),
        // listen for the $ionicView.enter event:
        $scope.$on('$ionicView.enter', function (e) {
            //$scope.infos = "$ionicView.enter";

            // start webcam when back on the page, not the first time
            if ($scope.initialized) {
                $scope.$broadcast('START_WEBCAM');
            } else {

            }
            $scope.initialized = true;
            startAnimation();
        });
        $scope.$on("$ionicView.loaded", function (e) {
            setTimeout(function () {
                // canvas2d
                canvas2d = document.getElementById('canvas2d');
                canvas3D = document.getElementById('canvas3d');
                container = document.getElementById('container');
                timeproc = document.getElementById('timeproc');
                matchingresult = document.getElementById('matchingresult');

                main_app($scope.video.width, $scope.video.height);
            }, 500);
        });

        $scope.$on("$ionicView.beforeLeave", function (e) {
            stopAnimation();
            $scope.$broadcast('STOP_WEBCAM');
        });

        //$scope.channel = {};
        $scope.onError = function (err) {
            $scope.infos = "webcam onError";
            //console.log("webcam onError");
        };
        $scope.onStream = function (stream) {
            //$scope.infos = "webcam onStream";
        };
        $scope.onSuccess = function () {
            //$scope.infos = "webcam onSuccess";
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

        /////////////////////
        // global data
        /////////////////////

        // point match structure
        var match_t = (function () {
            function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
                if (typeof screen_idx === "undefined") { screen_idx = 0; }
                if (typeof pattern_lev === "undefined") { pattern_lev = 0; }
                if (typeof pattern_idx === "undefined") { pattern_idx = 0; }
                if (typeof distance === "undefined") { distance = 0; }

                this.screen_idx = screen_idx;
                this.pattern_lev = pattern_lev;
                this.pattern_idx = pattern_idx;
                this.distance = distance;
            }
            return match_t;
        })();

        // JSfeat
        var gui, options, ctx;
        var img_u8, img_u8_smooth, screen_corners, num_corners, screen_descriptors;
        var pattern_corners, pattern_descriptors, pattern_preview;
        var matches, homo3x3, match_mask;
        var num_train_levels = 4;
        var maxCorners = 2000, maxMatches = 2000;
        var trained_8u;
        var nb_trained = 0, current_pattern = -1;
        var templateX = 400, templateY = 600;

        // ARuco
        var posit;
        var renderer3d;
        var scene1, scene2;
        var camera1, camera2;
        var plane, model1, model2, model3, texture;
        var step = 0.0;
        var modelSize = 35.0; //millimeters

        // shared data
        var shape_pts;

        var stat = new profiler();

        var demo_opt = function () {
            this.blur_size = 5;
            this.lap_thres = 30;
            this.eigen_thres = 25;
            this.match_threshold = 48;
        }

        /////////////////////
        // Corners detection
        /////////////////////

        function detect_keypoints(img, corners, max_allowed) {
            // detect features
            var count = jsfeat.yape06.detect(img, corners, 17);

            // sort by score and reduce the count if needed
            if (count > max_allowed) {
                jsfeat.math.qsort(corners, 0, count - 1, function (a, b) { return (b.score < a.score); });
                count = max_allowed;
            }

            // calculate dominant orientation for each keypoint
            for (var i = 0; i < count; ++i) {
                corners[i].angle = ic_angle(img, corners[i].x, corners[i].y);
            }

            return count;
        }

        // central difference using image moments to find dominant orientation
        var u_max = new Int32Array([15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0]);
        function ic_angle(img, px, py) {
            var half_k = 15; // half patch size
            var m_01 = 0, m_10 = 0;
            var src = img.data, step = img.cols;
            var u = 0, v = 0, center_off = (py * step + px) | 0;
            var v_sum = 0, d = 0, val_plus = 0, val_minus = 0;

            // Treat the center line differently, v=0
            for (u = -half_k; u <= half_k; ++u)
                m_10 += u * src[center_off + u];

            // Go line by line in the circular patch
            for (v = 1; v <= half_k; ++v) {
                // Proceed over the two lines
                v_sum = 0;
                d = u_max[v];
                for (u = -d; u <= d; ++u) {
                    val_plus = src[center_off + u + v * step];
                    val_minus = src[center_off + u - v * step];
                    v_sum += (val_plus - val_minus);
                    m_10 += u * (val_plus + val_minus);
                }
                m_01 += v * v_sum;
            }

            return Math.atan2(m_01, m_10);
        }

        // estimate homography transform between matched points
        function find_transform(matches, count, id) {
            // motion kernel
            var mm_kernel = new jsfeat.motion_model.homography2d();
            // ransac params
            var num_model_points = 4;
            var reproj_threshold = 3;
            var ransac_param = new jsfeat.ransac_params_t(num_model_points,
                                                          reproj_threshold, 0.5, 0.99);

            var pattern_xy = [];
            var screen_xy = [];

            // construct correspondences
            for (var i = 0; i < count; ++i) {
                var m = matches[i];
                var s_kp = screen_corners[m.screen_idx];
                var p_kp = pattern_corners[id][m.pattern_lev][m.pattern_idx];
                pattern_xy[i] = { "x": p_kp.x, "y": p_kp.y };
                screen_xy[i] = { "x": s_kp.x, "y": s_kp.y };
            }

            // estimate motion
            var ok = false;
            ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel,
                                                pattern_xy, screen_xy, count, homo3x3[id], match_mask[id], 1000);

            // extract good matches and re-estimate
            var good_cnt = 0;
            if (ok) {
                for (var i = 0; i < count; ++i) {
                    if (match_mask[id].data[i]) {
                        pattern_xy[good_cnt].x = pattern_xy[i].x;
                        pattern_xy[good_cnt].y = pattern_xy[i].y;
                        screen_xy[good_cnt].x = screen_xy[i].x;
                        screen_xy[good_cnt].y = screen_xy[i].y;
                        good_cnt++;
                    }
                }
                // run kernel directly with inliers only
                mm_kernel.run(pattern_xy, screen_xy, homo3x3[id], good_cnt);
            } else {
                jsfeat.matmath.identity_3x3(homo3x3[id], 1.0);
            }

            return good_cnt;
        }

        // non zero bits count
        function popcnt32(n) {
            n -= ((n >> 1) & 0x55555555);
            n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
            return (((n + (n >> 4)) & 0xF0F0F0F) * 0x1010101) >> 24;
        }

        // naive brute-force matching.
        // each on screen point is compared to all pattern points
        // to find the closest match
        function match_pattern(id) {
            var q_cnt = screen_descriptors.rows;
            var query_du8 = screen_descriptors.data;
            var query_u32 = screen_descriptors.buffer.i32; // cast to integer buffer
            var qd_off = 0;
            var qidx = 0, lev = 0, pidx = 0, k = 0;
            var num_matches = 0;

            for (qidx = 0; qidx < q_cnt; ++qidx) {
                var best_dist = 256;
                var best_dist2 = 256;
                var best_idx = -1;
                var best_lev = -1;

                for (lev = 0; lev < num_train_levels; ++lev) {
                    var lev_descr = pattern_descriptors[id][lev];
                    var ld_cnt = lev_descr.rows;
                    var ld_i32 = lev_descr.buffer.i32; // cast to integer buffer
                    var ld_off = 0;

                    for (pidx = 0; pidx < ld_cnt; ++pidx) {

                        var curr_d = 0;
                        // our descriptor is 32 bytes so we have 8 Integers
                        for (k = 0; k < 8; ++k) {
                            curr_d += popcnt32(query_u32[qd_off + k] ^ ld_i32[ld_off + k]);
                        }

                        if (curr_d < best_dist) {
                            best_dist2 = best_dist;
                            best_dist = curr_d;
                            best_lev = lev;
                            best_idx = pidx;
                        } else if (curr_d < best_dist2) {
                            best_dist2 = curr_d;
                        }

                        ld_off += 8; // next descriptor
                    }
                }

                // filter out by some threshold
                if (best_dist < options.match_threshold) {
                    matches[id][num_matches].screen_idx = qidx;
                    matches[id][num_matches].pattern_lev = best_lev;
                    matches[id][num_matches].pattern_idx = best_idx;
                    num_matches++;
                }
                //

                /* filter using the ratio between 2 closest matches
                if(best_dist < 0.8*best_dist2) {
                    matches[id][num_matches].screen_idx = qidx;
                    matches[id][num_matches].pattern_lev = best_lev;
                    matches[id][num_matches].pattern_idx = best_idx;
                    num_matches++;
                }
                */

                qd_off += 8; // next query descriptor
            }

            return num_matches;
        }

        // project/transform rectangle corners with 3x3 Matrix
        function tCorners(M, w, h) {
            var pt = [{ 'x': 0, 'y': 0 }, { 'x': w, 'y': 0 }, { 'x': w, 'y': h }, { 'x': 0, 'y': h }];
            var z = 0.0, i = 0, px = 0.0, py = 0.0;

            for (; i < 4; ++i) {
                px = M[0] * pt[i].x + M[1] * pt[i].y + M[2];
                py = M[3] * pt[i].x + M[4] * pt[i].y + M[5];
                z = M[6] * pt[i].x + M[7] * pt[i].y + M[8];
                pt[i].x = px / z;
                pt[i].y = py / z;
            }

            return pt;
        }

        /////////////////////
        // Pattern Training
        /////////////////////

        // using <img>
        var load_trained_patterns = function (name) {
            var img2 = document.getElementById(name);
            var contx = container.getContext('2d');
            contx.drawImage(img2, 0, 0, templateX, templateY);
            var imageData = contx.getImageData(0, 0, templateX, templateY);

            trained_8u = new jsfeat.matrix_t(templateX, templateY, jsfeat.U8_t | jsfeat.C1_t);
            jsfeat.imgproc.grayscale(imageData.data, templateX, templateY, trained_8u);
            trainpattern(trained_8u); // le pattern doit etre plus grand que 512*512 dans au moins une dimension (sinon pas de rescale et rien ne se passe)
        };

        // using direct link
        var load_trained_patterns2 = function (name) {
            img = new Image();
            img.onload = function () {
                var contx = container.getContext('2d');
                contx.drawImage(img, 0, 0, templateX, templateY);

                var imageData = contx.getImageData(0, 0, templateX, templateY);
                trained_8u = new jsfeat.matrix_t(templateX, templateY, jsfeat.U8_t | jsfeat.C1_t);
                jsfeat.imgproc.grayscale(imageData.data, templateX, templateY, trained_8u);
                trainpattern(trained_8u); // le pattern doit etre plus grand que 512*512 dans au moins une dimension (sinon pas de rescale et rien ne se passe)
            }
            img.src = name;
        };

        $scope.train_pattern = function () {
            trainpattern(img_u8);
        };

        // train a pattern: extract corners multiscale, compute descriptor, store result 
        trainpattern = function (img) {
            var lev = 0, i = 0;
            var sc = 1.0;
            var max_pattern_size = 512;
            var max_per_level = 300;
            var sc_inc = Math.sqrt(2.0); // magic number ;)
            var lev0_img = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.U8_t | jsfeat.C1_t);
            var lev_img = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.U8_t | jsfeat.C1_t);
            var new_width = 0, new_height = 0;
            var lev_corners, lev_descr;
            var corners_num = 0;

            var sc0 = Math.min(max_pattern_size / img.cols, max_pattern_size / img.rows);
            new_width = (img.cols * sc0) | 0;
            new_height = (img.rows * sc0) | 0;

            // alloc matches
            matches[nb_trained] = [];
            var i = maxMatches;
            while (--i >= 0) {
                matches[nb_trained][i] = new match_t();
            }

            // transform matrix
            homo3x3[nb_trained] = new jsfeat.matrix_t(3, 3, jsfeat.F32C1_t);
            match_mask[nb_trained] = new jsfeat.matrix_t(500, 1, jsfeat.U8C1_t);

            // be carefull nothing done if size <512
            jsfeat.imgproc.resample(img, lev0_img, new_width, new_height);

            // prepare preview
            pattern_preview[nb_trained] = new jsfeat.matrix_t(new_width >> 1, new_height >> 1, jsfeat.U8_t | jsfeat.C1_t);
            jsfeat.imgproc.pyrdown(lev0_img, pattern_preview[nb_trained]);

            pattern_corners[nb_trained] = [];
            pattern_descriptors[nb_trained] = [];

            for (lev = 0; lev < num_train_levels; ++lev) {
                pattern_corners[nb_trained][lev] = [];
                lev_corners = pattern_corners[nb_trained][lev];

                // preallocate corners array
                i = (new_width * new_height) >> lev;
                while (--i >= 0) {
                    lev_corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
                }

                pattern_descriptors[nb_trained][lev] = new jsfeat.matrix_t(32, max_per_level, jsfeat.U8_t | jsfeat.C1_t);
            }

            // do the first level
            lev_corners = pattern_corners[nb_trained][0];
            lev_descr = pattern_descriptors[nb_trained][0];

            jsfeat.imgproc.gaussian_blur(lev0_img, lev_img, options.blur_size | 0); // this is more robust
            corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
            jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

            console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

            sc /= sc_inc;

            // lets do multiple scale levels
            // we can use Canvas context draw method for faster resize 
            // but its nice to demonstrate that you can do everything with jsfeat
            for (lev = 1; lev < num_train_levels; ++lev) {
                lev_corners = pattern_corners[nb_trained][lev];
                lev_descr = pattern_descriptors[nb_trained][lev];

                new_width = (lev0_img.cols * sc) | 0;
                new_height = (lev0_img.rows * sc) | 0;

                jsfeat.imgproc.resample(lev0_img, lev_img, new_width, new_height);
                jsfeat.imgproc.gaussian_blur(lev_img, lev_img, options.blur_size | 0);
                corners_num = detect_keypoints(lev_img, lev_corners, max_per_level);
                jsfeat.orb.describe(lev_img, lev_corners, corners_num, lev_descr);

                // fix the coordinates due to scale level
                for (i = 0; i < corners_num; ++i) {
                    lev_corners[i].x *= 1. / sc;
                    lev_corners[i].y *= 1. / sc;
                }

                console.log("train " + lev_img.cols + "x" + lev_img.rows + " points: " + corners_num);

                sc /= sc_inc;
            }

            nb_trained++;
        };

        /////////////////////
        // Demo initialisation
        /////////////////////

        function main_app(videoWidth, videoHeight) {

            //pb first time 300*150 by default
            // here we will eed to make something clever to resize canvas so that
            // 1. it fulfill screen
            // 2. it keeps capture proportion
            // certainly: rescale to fit border ad center in other coord
            canvas2d.width = canvas3d.width = window.innerWidth;
            canvas2d.height = canvas3d.height = window.innerHeight;
            //canvas2d.width = canvas3d.width = imWidth;
            //canvas2d.height = canvas3d.height = imHeight;

            ctx = canvas2d.getContext('2d');

            ctx.fillStyle = "rgb(0,255,0)";
            ctx.strokeStyle = "rgb(0,255,0)";

            // JSfeat Orb detection+matching part
            img_u8 = new jsfeat.matrix_t(imWidth, imHeight, jsfeat.U8_t | jsfeat.C1_t);
            img_u8_smooth = new jsfeat.matrix_t(imWidth, imHeight, jsfeat.U8_t | jsfeat.C1_t);            // after blur

            // we will limit to 500 strongest points
            screen_descriptors = new jsfeat.matrix_t(32, 500, jsfeat.U8_t | jsfeat.C1_t);

            // recorded detection results for each pattern
            pattern_descriptors = [];
            pattern_preview = [];
            screen_corners = [];
            pattern_corners = [];
            matches = [];

            // transform matrix
            homo3x3 = [];
            match_mask = [];

            // live displayed corners
            var i = maxCorners; // 2000 corners maximum
            while (--i >= 0)
                screen_corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);

            // Aruco part
            posit = new POS.Posit(modelSize, canvas2d.width);

            createRenderers();
            createScenes();

            options = new demo_opt();
            /* gui = new dat.GUI();
             gui.add(options, "blur_size", 3, 9).step(1);
             gui.add(options, "lap_thres", 1, 100);
             gui.add(options, "eigen_thres", 1, 100);
             gui.add(options, "match_threshold", 16, 128);
             gui.add(options, "train_pattern");*/

            stat.add("grayscale");
            stat.add("gauss blur");
            stat.add("keypoints");
            stat.add("orb descriptors");
            stat.add("matching");
            stat.add("Posit");
            stat.add("update");


            //load_trained_patterns2("http://localhost:4400/img/trained/vsd1.jpg");
            //load_trained_patterns2("http://localhost:4400/img/trained/3Dtricart.jpg");
            load_trained_patterns("trained0");
            load_trained_patterns("trained1");
            load_trained_patterns("trained2");
        }

        /////////////////////
        // Threejs initialisation
        /////////////////////

        function createRenderers() {
            renderer3d = new THREE.WebGLRenderer({ canvas: canvas3D, alpha: true });
            renderer3d.setClearColor(0xffffff, 0);
            renderer3d.setSize(canvas2d.width, canvas2d.height);

            // to project direct texture
            scene1 = new THREE.Scene();
            camera1 = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
            scene1.add(camera1);

            // for 3d projection
            scene2 = new THREE.Scene();
            camera2 = new THREE.PerspectiveCamera(40, canvas2d.width / canvas2d.height, 1, 1000); // be carefull, projection only works if we keep width>heigth (landscape)
            scene2.add(camera2);
        };

        function render() {
            renderer3d.autoClear = false;
            renderer3d.clear();
            //renderer3d.render(scene1, camera1);
            renderer3d.render(scene2, camera2);
        };

        function createScenes() {
            plane = createPlane();
            scene2.add(plane);

            texture = createTexture();
            scene1.add(texture);

            model1 = createModel1();
            model2 = createModel2();
            model3 = createModel3();
            scene2.add(model1);
            scene2.add(model2);
            scene2.add(model3);
        };

        function createPlane() {
            var object = new THREE.Object3D(),
                geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
                material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.5 }),
                mesh = new THREE.Mesh(geometry, material);

            object.add(mesh);

            return object;
        };

        function createTexture() {
            var texture = new THREE.Texture(video),
                object = new THREE.Object3D(),
                geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
                material = new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false }),
                mesh = new THREE.Mesh(geometry, material);

            object.position.z = -1;

            object.add(mesh);

            return object;
        };

        function createModel1() {
            var object = new THREE.Object3D();
            var geometry = new THREE.SphereGeometry(0.2, 15, 15, Math.PI);
            var texture = THREE.ImageUtils.loadTexture("img/casa.jpg");
            var material = new THREE.MeshBasicMaterial({ map: texture });
            var mesh = new THREE.Mesh(geometry, material);

            object.add(mesh);

            return object;
        };

        function createModel2() {
            var object = new THREE.Object3D();
            var geometry = new THREE.SphereGeometry(0.2, 15, 15, Math.PI);
            var texture = THREE.ImageUtils.loadTexture("img/3DVTech.jpg");
            var material = new THREE.MeshBasicMaterial({ map: texture });
            var mesh = new THREE.Mesh(geometry, material);

            object.add(mesh);

            return object;
        };


        function createModel3() {
            var object = new THREE.Object3D();
            var geometry = new THREE.SphereGeometry(0.2, 15, 15, Math.PI);
            var texture = THREE.ImageUtils.loadTexture("img/ARTmobilis.jpg");
            var material = new THREE.MeshBasicMaterial({ map: texture });
            var mesh = new THREE.Mesh(geometry, material);

            object.add(mesh);

            return object;
        };

        /////////////////////
        // video live Processing
        /////////////////////
        var getVideoData = function getVideoData(x, y, w, h) {
            var hiddenCanvas = document.createElement('canvas');
            hiddenCanvas.width = $scope.video.width;
            hiddenCanvas.height = $scope.video.height;
            var hctx = hiddenCanvas.getContext('2d');
            hctx.drawImage($scope.video, 0, 0, $scope.video.width, $scope.video.height);
            return hctx.getImageData(x, y, w, h);
        };

        // put ImgData in a hidden canvas to then write it with resizing on canvas
        var resizeImData = function ( canvas , imgData ) {
            var hiddenCanvas = document.createElement('canvas');
            hiddenCanvas.width = imWidth;
            hiddenCanvas.height = imHeight;
            var hctx = hiddenCanvas.getContext('2d');
            var cctx = canvas.getContext('2d');
            hctx.putImageData(imgData, 0, 0);
            cctx.drawImage(hiddenCanvas,0,0,canvas.width, canvas.height);
        };

        function tick() {
            stat.new_frame();
            $scope.video = $scope.channel.video;

            if ($scope.video) {
                if ($scope.video.width > 0) {

                    var videoData = getVideoData(0, 0, imWidth, imHeight);
                    ctx.putImageData(videoData, 0, 0);

                    var imageData = ctx.getImageData(0, 0, imWidth, imHeight);

                    stat.start("grayscale");
                    jsfeat.imgproc.grayscale(imageData.data, imWidth, imHeight, img_u8);
                    stat.stop("grayscale");

                    stat.start("gauss blur");
                    jsfeat.imgproc.gaussian_blur(img_u8, img_u8_smooth, options.blur_size | 0);
                    stat.stop("gauss blur");

                    jsfeat.yape06.laplacian_threshold = options.lap_thres | 0;
                    jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres | 0;

                    stat.start("keypoints");
                    num_corners = detect_keypoints(img_u8_smooth, screen_corners, 500);
                    stat.stop("keypoints");

                    stat.start("orb descriptors");
                    jsfeat.orb.describe(img_u8_smooth, screen_corners, num_corners, screen_descriptors);
                    stat.stop("orb descriptors");

                    // render result back to canvas
                    var data_u32 = new Uint32Array(imageData.data.buffer);
                    render_corners(screen_corners, num_corners, data_u32, imWidth);

                    // render pattern and matches
                    var num_matches = [];
                    var good_matches = 0;

                    // search for the rigth pattern
                    stat.start("matching");
                    var id = 0;
                    var str, found = false;
                    for (id = 0; id < nb_trained; ++id) {
                        num_matches[id] = match_pattern(id);
                        str += "<br>Id : " + id + " nbMatches : " + num_matches[id];
                        if (num_matches[id] < 20 || found)
                            continue;

                        good_matches = find_transform(matches[id], num_matches[id], id);
                        str += " nbGood : " + good_matches;
                        if (good_matches > 8) {
                            current_pattern = id;
                            found = true;
                        }
                    }
                    matchingresult.innerHTML = str;
                    stat.stop("matching");

                    // display last detected pattern
                    if (pattern_preview[current_pattern]) {
                        render_mono_image(pattern_preview[current_pattern].data, data_u32, pattern_preview[current_pattern].cols, pattern_preview[current_pattern].rows, imWidth);
                    }

                    resizeImData(canvas2d,imageData);

                    // display matching result and 3d when detection
                    if (num_matches[current_pattern]) { // last detected
                        render_matches(ctx, matches[current_pattern], num_matches[current_pattern]);
                        if (found) {
                            render_pattern_shape(ctx);
                            updateScenes(shape_pts);
                            render();
                        }
                        else
                            renderer3d.clear();
                    }

                    timeproc.innerHTML = stat.log();
                }
            }
            $scope.requestId = requestAnimationFrame(tick);
        }

        /////////////////////
        // 3D Pose and rendering
        /////////////////////
        var textureVideo;//, material, materials = [], mesh;
        var video = document.getElementById('videoTexture');
        textureVideo = new THREE.VideoTexture(video);
        textureVideo.minFilter = THREE.LinearFilter;
        textureVideo.magFilter = THREE.LinearFilter;
        textureVideo.format = THREE.RGBFormat;

        function updateScenes(corners) {
            var corners, corner, pose, i;

            var scaleX = canvas2d.width / imWidth, scaleY = canvas2d.height / imHeight;
            for (i = 0; i < corners.length; ++i) {
                corner = corners[i];
                corner.x = corner.x * scaleX - (canvas2d.width / 2);
                corner.y = (canvas2d.height / 2) - corner.y*scaleY;
            }

            stat.start("Posit");
            pose = posit.pose(corners);
            stat.stop("Posit");

            stat.start("update");
            updateObject(plane, pose.bestRotation, pose.bestTranslation);
            updateObject(model1, pose.bestRotation, pose.bestTranslation);
            updateObject(model2, pose.bestRotation, pose.bestTranslation);
            updateObject(model3, pose.bestRotation, pose.bestTranslation);
            updatePose("pose1", pose.bestError, pose.bestRotation, pose.bestTranslation);
            stat.stop("update");

            //plane.visible = false;
            model1.visible = (current_pattern === 0);
            model2.visible = (current_pattern === 1);
            model3.visible = (current_pattern === 2);

            step += 0.025;
            model1.rotation.y -= step;
            model2.rotation.y -= step;
            model3.rotation.y -= step;

            texture.children[0].material.map.needsUpdate = true;
        };

        function updateObject(object, rotation, translation) {
            object.scale.x = modelSize;
            object.scale.y = modelSize;
            object.scale.z = modelSize;

            object.rotation.x = -Math.asin(-rotation[1][2]);
            object.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
            object.rotation.z = Math.atan2(rotation[1][0], rotation[1][1]);

            object.position.x = translation[0];
            object.position.y = translation[1];
            object.position.z = -translation[2];
        };

        function updatePose(id, error, rotation, translation) {
            var yaw = -Math.atan2(rotation[0][2], rotation[2][2]);
            var pitch = -Math.asin(-rotation[1][2]);
            var roll = Math.atan2(rotation[1][0], rotation[1][1]);

            var d = document.getElementById(id);
            d.innerHTML = " error: " + error
                        + "<br/>"
                        + " x: " + (translation[0] | 0)
                        + " y: " + (translation[1] | 0)
                        + " z: " + (translation[2] | 0)
                        + "<br/>"
                        + " yaw: " + Math.round(-yaw * 180.0 / Math.PI)
                        + " pitch: " + Math.round(-pitch * 180.0 / Math.PI)
                        + " roll: " + Math.round(roll * 180.0 / Math.PI);
        };


        /////////////////////
        // Drawers
        /////////////////////

        function render_matches(ctx, matches, count) {
            if (current_pattern == -1) return;

            var scaleX = canvas2d.width / imWidth, scaleY = canvas2d.height / imHeight;
            for (var i = 0; i < count; ++i) {
                var m = matches[i];
                var s_kp = screen_corners[m.screen_idx];
                var p_kp = pattern_corners[current_pattern][m.pattern_lev][m.pattern_idx];
                if (match_mask[current_pattern].data[i]) {
                    ctx.strokeStyle = "rgb(0,255,0)";
                } else {
                    ctx.strokeStyle = "rgb(255,0,0)";
                }
                ctx.beginPath();
                ctx.moveTo(s_kp.x * scaleX, s_kp.y * scaleY);
                ctx.lineTo(p_kp.x * 0.5 * scaleX, p_kp.y * 0.5 * scaleY); // our preview is downscaled
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        function render_pattern_shape(ctx) {
            // get the projected pattern corners
            var scaleX = canvas2d.width / imWidth, scaleY = canvas2d.height / imHeight;
            shape_pts = tCorners(homo3x3[current_pattern].data, pattern_preview[current_pattern].cols * 2, pattern_preview[current_pattern].rows * 2);

            ctx.strokeStyle = "rgb(0,255,0)";
            ctx.beginPath();

            ctx.moveTo(shape_pts[0].x * scaleX, shape_pts[0].y * scaleY);
            ctx.lineTo(shape_pts[1].x * scaleX, shape_pts[1].y * scaleY);
            ctx.lineTo(shape_pts[2].x * scaleX, shape_pts[2].y * scaleY);
            ctx.lineTo(shape_pts[3].x * scaleX, shape_pts[3].y * scaleY);
            ctx.lineTo(shape_pts[0].x * scaleX, shape_pts[0].y * scaleY);

            ctx.lineWidth = 4;
            ctx.stroke();
        }

        function render_corners(corners, count, img, step) {
            var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
            for (var i = 0; i < count; ++i) {
                var x = corners[i].x;
                var y = corners[i].y;
                var off = (x + y * step);
                img[off] = pix;
                img[off - 1] = pix;
                img[off + 1] = pix;
                img[off - step] = pix;
                img[off + step] = pix;
            }
        }

        function render_mono_image(src, dst, sw, sh, dw) {
            var alpha = (0xff << 24);
            for (var i = 0; i < sh; ++i) {
                for (var j = 0; j < sw; ++j) {
                    var pix = src[i * sw + j];
                    dst[i * dw + j] = alpha | (pix << 16) | (pix << 8) | pix;
                }
            }
        }


        this.timeproc = function timeproc() {
            return timeproc;
        };

    }]);
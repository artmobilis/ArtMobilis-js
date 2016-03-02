var AM = AM || {};

AM.Detection = function() {
    var that = this;
    var _params = {
        laplacian_threshold: 30,
        eigen_threshold: 25,
        detection_corners_max: 500,
        border_size: 3,
        fast_threshold: 40
    };
    var _screen_corners = [];
    var _num_corners = 0;
    var _width = 0;
    var _height = 0;
    var _screen_descriptors = new jsfeat.matrix_t(32, _params.detection_corners_max, jsfeat.U8_t | jsfeat.C1_t);
    function AllocateCorners(width, height) {
        var i = width * height;
        if (i > _screen_corners.length) {
            while (--i >= 0) {
                _screen_corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
            }
        }
    }
    this.Detect = function(img) {
        _width = img.cols;
        _height = img.rows;
        AllocateCorners(_width, _height);
        _num_corners = AM.DetectKeypointsYape06(img, _screen_corners, _params.detection_corners_max, _params.laplacian_threshold, _params.eigen_threshold);
        jsfeat.orb.describe(img, _screen_corners, _num_corners, _screen_descriptors);
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
    };
    this.GetDescriptors = function() {
        return _screen_descriptors;
    };
    this.GetNumCorners = function() {
        return _num_corners;
    };
    this.GetCorners = function() {
        return _screen_corners;
    };
    this.GetImageWidth = function() {
        return _width;
    };
    this.GetImageHeight = function() {
        return _height;
    };
};

AM.IcAngle = function() {
    var u_max = new Int32Array([ 15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3, 0 ]);
    return function(img, px, py) {
        var half_k = 15;
        var m_01 = 0, m_10 = 0;
        var src = img.data, step = img.cols;
        var u = 0, v = 0, center_off = py * step + px | 0;
        var v_sum = 0, d = 0, val_plus = 0, val_minus = 0;
        for (u = -half_k; u <= half_k; ++u) m_10 += u * src[center_off + u];
        for (v = 1; v <= half_k; ++v) {
            v_sum = 0;
            d = u_max[v];
            for (u = -d; u <= d; ++u) {
                val_plus = src[center_off + u + v * step];
                val_minus = src[center_off + u - v * step];
                v_sum += val_plus - val_minus;
                m_10 += u * (val_plus + val_minus);
            }
            m_01 += v * v_sum;
        }
        return Math.atan2(m_01, m_10);
    };
}();

AM.DetectKeypointsPostProc = function(img, corners, count, max_allowed) {
    if (count > max_allowed) {
        jsfeat.math.qsort(corners, 0, count - 1, function(a, b) {
            return b.score < a.score;
        });
        count = max_allowed;
    }
    for (var i = 0; i < count; ++i) {
        corners[i].angle = AM.IcAngle(img, corners[i].x, corners[i].y);
    }
    return count;
};

AM.DetectKeypointsYape06 = function(img, corners, max_allowed, laplacian_threshold, eigen_threshold) {
    jsfeat.yape06.laplacian_threshold = laplacian_threshold;
    jsfeat.yape06.min_eigen_value_threshold = eigen_threshold;
    var count = jsfeat.yape06.detect(img, corners, 17);
    count = AM.DetectKeypointsPostProc(img, corners, count, max_allowed);
    return count;
};

AM.DetectKeypointsFast = function(img, corners, max_allowed, threshold, border_size) {
    jsfeat.fast_corners.set_threshold(threshold);
    var count = jsfeat.fast_corners.detect(img, corners, border_size || 3);
    count = AM.DetectKeypointsPostProc(img, corners, count, max_allowed);
    return count;
};

var AM = AM || {};

AM.ImageFilter = function() {
    var that = this;
    var _img_u8;
    var _img_u8_smooth;
    var _params = {
        blur_size: 3,
        blur: true
    };
    this.Filter = function(image_data) {
        var width = image_data.width;
        var height = image_data.height;
        if (_img_u8) _img_u8.resize(width, height, jsfeat.U8_t | jsfeat.C1_t); else _img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        if (_img_u8_smooth) _img_u8_smooth.resize(width, height, jsfeat.U8_t | jsfeat.C1_t); else _img_u8_smooth = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(image_data.data, width, height, _img_u8);
        if (_params.blur) jsfeat.imgproc.gaussian_blur(_img_u8, _img_u8_smooth, _params.blur_size);
    };
    this.SetMaxImageSize = function(value) {
        _image_size_max = value;
    };
    this.SetBlurSize = function(value) {
        _blur_size = value;
    };
    this.GetFilteredImage = function() {
        if (_params.blur) return _img_u8_smooth; else return _img_u8;
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
    };
};

var AM = AM || {};

AM.MarkerTracker = function() {
    var that = this;
    var _training = new AM.Training();
    var _trained_images = {};
    var _image_filter = new AM.ImageFilter();
    var _detection = new AM.Detection();
    var _matching = new AM.Matching();
    var _pose = new AM.Pose();
    var _match_found = false;
    var _matching_image;
    var _params = {
        match_min: 8
    };
    var _profiler = new profiler();
    _profiler.add("filter");
    _profiler.add("detection");
    _profiler.add("matching");
    _profiler.add("pose");
    this.ComputeImage = function(image_data) {
        _profiler.new_frame();
        _profiler.start("filter");
        _image_filter.Filter(image_data);
        _profiler.stop("filter");
        _profiler.start("detection");
        _detection.Detect(_image_filter.GetFilteredImage());
        _profiler.stop("detection");
    };
    this.Match = function() {
        _profiler.start("matching");
        _match_found = false;
        _matching.SetScreenDescriptors(_detection.GetDescriptors());
        _matching_image = undefined;
        for (uuid in _trained_images) {
            var trained_image = _trained_images[uuid];
            _matching.Match(trained_image.GetDescriptorsLevels());
            var count = _matching.GetNumMatches();
            _match_found = count >= _params.match_min;
            if (!_match_found) continue;
            var good_count = _pose.Pose(_matching.GetMatches(), count, _detection.GetCorners(), trained_image.GetCornersLevels());
            _match_found = good_count >= _params.match_min;
            if (_match_found) {
                _matching_image = trained_image;
                break;
            }
        }
        _profiler.stop("matching");
        return _match_found;
    };
    this.GetMatchUuid = function() {
        return _matching_image.GetUuid();
    };
    this.GetPose = function() {
        if (_match_found) {
            _profiler.start("pose");
            var pose = _pose.GetPoseCorners(_matching_image.GetWidth(), _matching_image.GetHeight());
            _profiler.stop("pose");
            return pose;
        }
        return undefined;
    };
    this.AddMarker = function(image_data, uuid) {
        _training.Train(image_data);
        var trained_image = new AM.TrainedImage(uuid);
        _training.SetResultToTrainedImage(trained_image);
        _training.Empty();
        _trained_images[uuid] = trained_image;
    };
    this.RemoveMarker = function(uuid) {
        if (_trained_images[uuid]) {
            delete _trained_images[uuid];
        }
    };
    this.ActiveMarker = function(uuid, bool) {
        if (_trained_images[uuid]) _trained_images[uuid].Active(bool);
    };
    this.ActiveAllMarkers = function(bool) {
        for (uuid in _trained_images) {
            _trained_images[uuid].Active(bool);
        }
    };
    this.ClearMarkers = function() {
        _trained_images = {};
    };
    this.GetScreenCorners = function() {
        return _detection.GetCorners();
    };
    this.GetNumScreenCorners = function() {
        return _detection.GetNumCorners();
    };
    this.Log = function() {
        console.log(_profiler.log());
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
        _training.SetParameters(params);
        _image_filter.SetParameters(params);
        _detection.SetParameters(params);
        _matching.SetParameters(params);
    };
};

var AM = AM || {};

AM.Matching = function() {
    var that = this;
    var _screen_descriptors;
    var _num_matches;
    var _matches = [];
    var _params = {
        match_threshold: 48
    };
    this.SetScreenDescriptors = function(screen_descriptors) {
        _screen_descriptors = screen_descriptors;
    };
    this.Match = function(pattern_descriptors) {
        function popcnt32(n) {
            n -= n >> 1 & 1431655765;
            n = (n & 858993459) + (n >> 2 & 858993459);
            return (n + (n >> 4) & 252645135) * 16843009 >> 24;
        }
        function MatchPattern(screen_descriptors, pattern_descriptors) {
            var q_cnt = screen_descriptors.rows;
            var query_du8 = screen_descriptors.data;
            var query_u32 = screen_descriptors.buffer.i32;
            var qd_off = 0;
            var num_matches = 0;
            _matches.length = 0;
            for (var qidx = 0; qidx < q_cnt; ++qidx) {
                var best_dist = 256;
                var best_dist2 = 256;
                var best_idx = -1;
                var best_lev = -1;
                for (var lev = 0; lev < pattern_descriptors.length; ++lev) {
                    var lev_descr = pattern_descriptors[lev];
                    var ld_cnt = lev_descr.rows;
                    var ld_i32 = lev_descr.buffer.i32;
                    var ld_off = 0;
                    for (var pidx = 0; pidx < ld_cnt; ++pidx) {
                        var curr_d = 0;
                        for (var k = 0; k < 8; ++k) {
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
                        ld_off += 8;
                    }
                }
                if (best_dist < _params.match_threshold) {
                    while (_matches.length <= num_matches) {
                        _matches.push(new AM.match_t());
                    }
                    _matches[num_matches].screen_idx = qidx;
                    _matches[num_matches].pattern_lev = best_lev;
                    _matches[num_matches].pattern_idx = best_idx;
                    num_matches++;
                }
                qd_off += 8;
            }
            return num_matches;
        }
        _num_matches = MatchPattern(_screen_descriptors, pattern_descriptors);
        return _num_matches;
    };
    this.GetMatches = function() {
        return _matches;
    };
    this.GetNumMatches = function() {
        return _num_matches;
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
    };
};

AM.match_t = function() {
    function match_t(screen_idx, pattern_lev, pattern_idx, distance) {
        this.screen_idx = screen_idx || 0;
        this.pattern_lev = pattern_lev || 0;
        this.pattern_idx = pattern_idx || 0;
        this.distance = distance || 0;
    }
    return match_t;
}();

var AM = AM || {};

AM.Pose = function() {
    var that = this;
    var _good_count = 0;
    var _homo3x3 = new jsfeat.matrix_t(3, 3, jsfeat.F32C1_t);
    var _match_mask = new jsfeat.matrix_t(500, 1, jsfeat.U8C1_t);
    function find_transform(matches, count, homo3x3, match_mask, screen_corners, pattern_corners) {
        var mm_kernel = new jsfeat.motion_model.homography2d();
        var num_model_points = 4;
        var reproj_threshold = 3;
        var ransac_param = new jsfeat.ransac_params_t(num_model_points, reproj_threshold, .5, .99);
        var pattern_xy = [];
        var screen_xy = [];
        for (var i = 0; i < count; ++i) {
            var m = matches[i];
            var s_kp = screen_corners[m.screen_idx];
            var p_kp = pattern_corners[m.pattern_lev][m.pattern_idx];
            pattern_xy[i] = {
                x: p_kp.x,
                y: p_kp.y
            };
            screen_xy[i] = {
                x: s_kp.x,
                y: s_kp.y
            };
        }
        var ok = false;
        ok = jsfeat.motion_estimator.ransac(ransac_param, mm_kernel, pattern_xy, screen_xy, count, homo3x3, match_mask, 1e3);
        var good_cnt = 0;
        if (ok) {
            for (var i = 0; i < count; ++i) {
                if (match_mask.data[i]) {
                    pattern_xy[good_cnt].x = pattern_xy[i].x;
                    pattern_xy[good_cnt].y = pattern_xy[i].y;
                    screen_xy[good_cnt].x = screen_xy[i].x;
                    screen_xy[good_cnt].y = screen_xy[i].y;
                    good_cnt++;
                }
            }
            mm_kernel.run(pattern_xy, screen_xy, homo3x3, good_cnt);
        } else {
            jsfeat.matmath.identity_3x3(homo3x3, 1);
        }
        return good_cnt;
    }
    function tCorners(M, w, h) {
        var pt = [ {
            x: 0,
            y: 0
        }, {
            x: w,
            y: 0
        }, {
            x: w,
            y: h
        }, {
            x: 0,
            y: h
        } ];
        var z = 0, px = 0, py = 0;
        for (var i = 0; i < 4; ++i) {
            px = M[0] * pt[i].x + M[1] * pt[i].y + M[2];
            py = M[3] * pt[i].x + M[4] * pt[i].y + M[5];
            z = M[6] * pt[i].x + M[7] * pt[i].y + M[8];
            pt[i].x = px / z;
            pt[i].y = py / z;
        }
        return pt;
    }
    this.Pose = function(matches, count, screen_corners, pattern_corners) {
        _good_count = find_transform(matches, count, _homo3x3, _match_mask, screen_corners, pattern_corners);
        return _good_count;
    };
    this.GetGoodCount = function() {
        return _good_count;
    };
    this.GetPoseCorners = function(marker_width, marker_height) {
        return tCorners(_homo3x3.data, marker_width, marker_height);
    };
};

AM.PosePosit = function() {
    this.posit = new POS.Posit(10, 1);
    this.pose;
};

AM.PosePosit.prototype.Set = function(corners, model_size, image_width, image_height) {
    model_size = model_size || 35;
    var corners2 = [];
    for (var i = 0; i < corners.length; ++i) {
        var x = corners[i].x - image_width / 2;
        var y = image_height / 2 - corners[i].y;
        corners2.push({
            x: x,
            y: y
        });
    }
    this.pose = this.posit.pose(corners2);
};

AM.PosePosit.prototype.SetFocalLength = function(value) {
    this.posit.focalLength = value;
};

AM.PoseThree = function() {
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3();
};

AM.PoseThree.prototype.Set = function(posit_pose, model_size) {
    model_size = model_size || 35;
    var rot = posit_pose.bestRotation;
    var translation = posit_pose.bestTranslation;
    this.scale.x = model_size;
    this.scale.y = model_size;
    this.scale.z = model_size;
    this.rotation.x = -Math.asin(-rot[1][2]);
    this.rotation.y = -Math.atan2(rot[0][2], rot[2][2]);
    this.rotation.z = Math.atan2(rot[1][0], rot[1][1]);
    this.position.x = translation[0];
    this.position.y = translation[1];
    this.position.z = -translation[2];
    this.quaternion.setFromEuler(this.rotation);
};

var AM = AM || {};

AM.TrainedImage = function(uuid) {
    var that = this;
    var _empty = true;
    var _corners_levels = [];
    var _descriptors_levels = [];
    var _width = 0;
    var _height = 0;
    var _uuid = uuid;
    var _active = true;
    this.GetCorners = function(level) {
        return _corners_levels[level];
    };
    this.GetDescriptors = function(level) {
        return _corners_levels[level];
    };
    this.GetLevelNbr = function() {
        return Math.min(_descriptors_levels.length, _corners_levels.length);
    };
    this.GetCornersLevels = function() {
        return _corners_levels;
    };
    this.GetDescriptorsLevels = function() {
        return _descriptors_levels;
    };
    this.GetWidth = function() {
        return _width;
    };
    this.GetHeight = function() {
        return _height;
    };
    this.Set = function(corners_levels, descriptors_levels, width, height) {
        _empty = false;
        _corners_levels = corners_levels;
        _descriptors_levels = descriptors_levels;
        _width = width;
        _height = height;
    };
    this.IsEmpty = function() {
        return _empty;
    };
    this.Empty = function() {
        _empty = true;
        _corners_levels = [];
        _descriptors_levels = [];
    };
    this.SetUuid = function(uuid) {
        _uuid = uuid;
    };
    this.GetUuid = function() {
        return _uuid;
    };
    this.Active = function(bool) {
        _active = bool == true;
    };
    this.IsActive = function(bool) {
        return _active;
    };
};

var AM = AM || {};

AM.Training = function() {
    var that = this;
    var _descriptors_levels;
    var _corners_levels;
    var _width = 0;
    var _height = 0;
    var _params = {
        num_train_levels: 3,
        blur_size: 3,
        image_size_max: 512,
        training_corners_max: 200,
        laplacian_threshold: 30,
        eigen_threshold: 25
    };
    var _scale_increment = Math.sqrt(2);
    function TrainLevel(img, level_img, level, scale) {
        var corners = _corners_levels[level];
        var descriptors = _descriptors_levels[level];
        if (level !== 0) {
            RescaleDown(img, level_img, scale);
            jsfeat.imgproc.gaussian_blur(level_img, level_img, _params.blur_size);
        } else {
            jsfeat.imgproc.gaussian_blur(img, level_img, _params.blur_size);
        }
        var corners_num = AM.DetectKeypointsYape06(level_img, corners, _params.training_corners_max, _params.laplacian_threshold, _params.eigen_threshold);
        corners.length = corners_num;
        jsfeat.orb.describe(level_img, corners, corners_num, descriptors);
        if (level !== 0) {
            for (i = 0; i < corners_num; ++i) {
                corners[i].x *= 1 / scale;
                corners[i].y *= 1 / scale;
            }
        }
        console.log("train " + level_img.cols + "x" + level_img.rows + " points: " + corners_num);
    }
    function RescaleDown(src, dst, scale) {
        if (scale < 1) {
            var new_width = Math.round(src.cols * scale);
            var new_height = Math.round(src.rows * scale);
            jsfeat.imgproc.resample(src, dst, new_width, new_height);
        } else {
            dst.resize(src.cols, src.rows);
            src.copy_to(dst);
        }
    }
    function AllocateCornersDescriptors(width, height) {
        for (var level = 0; level < _params.num_train_levels; ++level) {
            _corners_levels[level] = [];
            var corners = _corners_levels[level];
            var i = width * height >> level;
            while (--i >= 0) {
                corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0, -1);
            }
            _descriptors_levels[level] = new jsfeat.matrix_t(32, _params.training_corners_max, jsfeat.U8_t | jsfeat.C1_t);
        }
    }
    this.Train = function(image_data) {
        var level = 0;
        var scale = 1;
        _descriptors_levels = [];
        _corners_levels = [];
        var gray = new jsfeat.matrix_t(image_data.width, image_data.height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(image_data.data, image_data.width, image_data.height, gray, jsfeat.COLOR_RGBA2GRAY);
        var scale_0 = Math.min(_params.image_size_max / image_data.width, _params.image_size_max / image_data.height);
        var img = new jsfeat.matrix_t(image_data.width * scale_0, image_data.height * scale_0, jsfeat.U8_t | jsfeat.C1_t);
        _width = img.cols;
        _height = img.rows;
        RescaleDown(gray, img, scale_0);
        AllocateCornersDescriptors(img.cols, img.rows);
        var level_img = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.U8_t | jsfeat.C1_t);
        TrainLevel(img, level_img, 0, scale);
        for (level = 1; level < _params.num_train_levels; ++level) {
            scale /= _scale_increment;
            TrainLevel(img, level_img, level, scale);
        }
    };
    this.SetBlurSize = function(value) {
        _params.blur_size = value;
    };
    this.SetMaxImageSize = function(value) {
        _params.image_size_max = value;
    };
    this.SetResultToTrainedImage = function(trained_image) {
        trained_image.Set(_corners_levels, _descriptors_levels, _width, _height);
    };
    this.IsEmpty = function() {
        return !_descriptors_levels || !_corners_levels;
    };
    this.Empty = function() {
        _descriptors_levels = undefined;
        _corners_levels = undefined;
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
    };
};
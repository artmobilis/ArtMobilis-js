var compatibility = function() {
    var lastTime = 0, isLittleEndian = true, URL = window.URL || window.webkitURL || window.mozURL || window.msURL, requestAnimationFrame = function(callback, element) {
        var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
        return requestAnimationFrame.call(window, callback, element);
    }, cancelAnimationFrame = function(id) {
        var cancelAnimationFrame = window.cancelAnimationFrame || function(id) {
            clearTimeout(id);
        };
        return cancelAnimationFrame.call(window, id);
    }, getUserMedia = function(options, success, error) {
        var getUserMedia = window.navigator.getUserMedia || window.navigator.mozGetUserMedia || window.navigator.webkitGetUserMedia || window.navigator.msGetUserMedia || function(options, success, error) {
            error();
        };
        return getUserMedia.call(window.navigator, options, success, error);
    }, detectEndian = function() {
        var buf = new ArrayBuffer(8);
        var data = new Uint32Array(buf);
        data[0] = 4278190080;
        isLittleEndian = true;
        if (buf[0] === 255) {
            isLittleEndian = false;
        }
        return isLittleEndian;
    };
    return {
        URL: URL,
        requestAnimationFrame: requestAnimationFrame,
        cancelAnimationFrame: cancelAnimationFrame,
        getUserMedia: getUserMedia,
        detectEndian: detectEndian,
        isLittleEndian: isLittleEndian
    };
}();

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

window.URL = window.URL || window.webkitURL;

var AM = AM || {};

AM.FrontCamGrabbing = function() {
    var that = this;
    var _stream;
    var _dom_element = document.createElement("video");
    var _loading = false;
    var _on_loading_end;
    var _on_error;
    _dom_element.setAttribute("autoplay", true);
    _dom_element.style.zIndex = -1;
    _dom_element.style.position = "absolute";
    _dom_element.style.top = "0px";
    _dom_element.style.left = "0px";
    _dom_element.style.width = "100%";
    _dom_element.style.height = "100%";
    function WaitHaveEnoughData() {
        if (_dom_element.readyState === _dom_element.HAVE_ENOUGH_DATA) {
            _loading = false;
            if (_on_loading_end) _on_loading_end();
        } else window.requestAnimationFrame(WaitHaveEnoughData);
    }
    function OnGetSources(on_error) {
        return function(source_infos) {
            var constraints = {
                video: true,
                audio: false
            };
            for (var i = 0; i != source_infos.length; ++i) {
                var sourceInfo = source_infos[i];
                if (sourceInfo.kind == "video" && sourceInfo.facing == "environment") {
                    constraints.video = {
                        optional: [ {
                            sourceId: sourceInfo.id
                        } ]
                    };
                }
            }
            navigator.getUserMedia(constraints, function(stream) {
                _stream = stream;
                _dom_element.src = window.URL.createObjectURL(stream);
                WaitHaveEnoughData();
            }, function(error) {
                console.error("Cant getUserMedia()! due to ", error);
                if (on_error) on_error();
            });
        };
    }
    function GetSourcesMST(on_error) {
        if (typeof MediaStreamTrack !== "undefined" && typeof MediaStreamTrack.getSources !== "undefined") {
            MediaStreamTrack.getSources(OnGetSources(on_error));
        } else if (on_error) on_error();
    }
    function GetSourcesMD(on_error) {
        if (typeof navigator.mediaDevices !== "undefined" && typeof navigator.mediaDevices.enumerateDevices !== "undefined") {
            navigator.mediaDevices.enumerateDevices().then(OnGetSources(on_error));
        } else if (on_error) on_error();
    }
    this.domElement = _dom_element;
    this.Start = function(on_loading_end, on_error) {
        if (!that.IsActive() && !_loading) {
            _loading = true;
            _on_loading_end = on_loading_end;
            _on_error = on_error;
            GetSourcesMST(function() {
                GetSourcesMD(function() {
                    if (_on_error) _on_error();
                    if (_on_loading_end) _on_loading_end();
                });
            });
        } else on_loading_end();
    };
    this.Stop = function() {
        if (_stream) {
            _stream.getTracks()[0].stop();
            _stream = undefined;
        }
    };
    this.IsActive = function() {
        return _stream !== undefined;
    };
};

var AM = AM || {};

AM.ImageLoader = function() {
    var _canvas = document.createElement("canvas");
    var _ctx = _canvas.getContext("2d");
    this.GetImageData = function(url, on_load, square) {
        var img = new Image();
        img.onload = function(img, on_load, square) {
            return function() {
                if (square) {
                    var size = Math.max(img.width, img.height);
                    var x = (size - img.width) / 2;
                    var y = (size - img.height) / 2;
                    _canvas.width = size;
                    _canvas.height = size;
                    _ctx.drawImage(img, x, y);
                } else {
                    _canvas.width = img.width;
                    _canvas.height = img.height;
                    _ctx.drawImage(img, 0, 0, _canvas.width, _canvas.height);
                }
                var image_data = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
                on_load(image_data);
            };
        }(img, on_load, square);
        img.src = url;
    };
};

var AM = AM || {};

AM.JsonLoader = function() {
    var that = this;
    var _loading = false;
    var _on_load;
    var _on_error;
    var _on_progress;
    var _url;
    var _xhr;
    function OnEnd(callback) {
        _loading = false;
        _on_progress = undefined;
        _on_error = undefined;
        _on_load = undefined;
        _xhr = undefined;
        _url = undefined;
        that.progress = 0;
        if (callback) callback();
    }
    function OnLoad() {
        try {
            that.json = JSON.parse(_xhr.responseText);
            OnEnd(_on_load);
        } catch (e) {
            that.json = {};
            OnEnd(_on_error);
        }
    }
    function OnError(e) {
        console.log("JsonLoader failed to open file: " + url);
        OnEnd(_on_error);
    }
    function OnProgress(e) {
        that.progress = e.loaded / e.total * 100;
        if (_on_progress) _on_progress();
    }
    this.json = {};
    this.progress = 0;
    this.IsLoading = function() {
        return _loading;
    };
    this.Load = function(url, on_load, on_error, on_progress) {
        if (!_loading) {
            _loading = true;
            _on_load = on_load;
            _on_error = on_error;
            _on_progress = on_progress;
            _url = url;
            _xhr = new XMLHttpRequest();
            _xhr.onprogress = OnProgress;
            _xhr.open("GET", url, true);
            _xhr.onload = OnLoad;
            _xhr.onerror = OnError;
            _xhr.send(null);
        }
    };
};

var AM = AM || {};

AM.LoadingManager = function() {
    var _end_callbacks = [];
    var _progress_callbacks = [];
    var _loading = 0;
    function DoCallbacks(array) {
        for (var i = 0, c = array.length; i < c; ++i) array[i]();
    }
    this.Start = function(nbr) {
        nbr = nbr || 1;
        _loading += nbr;
        DoCallbacks(_progress_callbacks);
    };
    this.End = function(nbr) {
        nbr = nbr || 1;
        if (_loading > 0) {
            _loading -= nbr;
            DoCallbacks(_progress_callbacks);
        }
        if (_loading <= 0) {
            _loading = 0;
            DoCallbacks(_end_callbacks);
            _end_callbacks.length = 0;
            _progress_callbacks.length = 0;
        }
    };
    this.OnEnd = function(callback) {
        if (_loading > 0) {
            _end_callbacks.push(callback);
        } else callback();
    };
    this.OnProgress = function(callback) {
        if (_loading > 0) {
            _progress_callbacks.push(callback);
        } else callback();
    };
    this.IsLoading = function() {
        return _loading > 0;
    };
    this.GetRemaining = function() {
        return _loading;
    };
};

var AM = AM || {};

(function() {
    var stopwatch = function() {
        "use strict";
        function stopwatch() {
            this.start_time = 0;
            this.stop_time = 0;
            this.run_time = 0;
            this.running = false;
        }
        stopwatch.prototype.start = function() {
            this.start_time = new Date().getTime();
            this.running = true;
        };
        stopwatch.prototype.stop = function() {
            this.stop_time = new Date().getTime();
            this.run_time = this.stop_time - this.start_time;
            this.running = false;
        };
        stopwatch.prototype.get_runtime = function() {
            return this.run_time;
        };
        stopwatch.prototype.reset = function() {
            this.run_time = 0;
        };
        return stopwatch;
    }();
    var ring_buffer = function() {
        "use strict";
        function ring_buffer(size) {
            this.arr = new Int32Array(size);
            this.begin = 0;
            this.end = -1;
            this.num_el = 0;
            this.arr_size = size;
        }
        ring_buffer.prototype.push_back = function(elem) {
            if (this.num_el < this.arr_size) {
                this.end++;
                this.arr[this.end] = elem;
                this.num_el++;
            } else {
                this.end = (this.end + 1) % this.arr_size;
                this.begin = (this.begin + 1) % this.arr_size;
                this.arr[this.end] = elem;
            }
        };
        ring_buffer.prototype.get = function(i) {
            return this.arr[(this.begin + i) % this.arr_size];
        };
        ring_buffer.prototype.size = function() {
            return this.num_el;
        };
        return ring_buffer;
    }();
    var profiler = function() {
        "use strict";
        var count_frames = 0;
        var ringbuff = new ring_buffer(20);
        function profiler() {
            this.fps = 0;
            this.timers = [];
            this.frame_timer = new stopwatch();
        }
        profiler.prototype.add = function(subj) {
            this.timers.push([ subj, new stopwatch() ]);
        };
        profiler.prototype.new_frame = function() {
            ++count_frames;
            var i = 0;
            var n = this.timers.length | 0;
            for (i = 0; i < n; ++i) {
                var sw = this.timers[i][1];
                sw.reset();
            }
            if (count_frames >= 1) {
                this.frame_timer.stop();
                ringbuff.push_back(this.frame_timer.get_runtime());
                var size = ringbuff.size();
                var sum = 0;
                for (i = 0; i < size; ++i) {
                    sum += ringbuff.get(i);
                }
                this.fps = size / sum * 1e3;
                this.frame_timer.start();
            }
        };
        profiler.prototype.find_task = function(subj) {
            var n = this.timers.length | 0;
            var i = 0;
            for (i = 0; i < n; ++i) {
                var pair = this.timers[i];
                if (pair[0] === subj) {
                    return pair;
                }
            }
            return null;
        };
        profiler.prototype.start = function(subj) {
            var task = this.find_task(subj);
            task[1].start();
        };
        profiler.prototype.stop = function(subj) {
            var task = this.find_task(subj);
            task[1].stop();
        };
        profiler.prototype.log = function() {
            var n = this.timers.length | 0;
            var i = 0;
            var str = "<strong>FPS: " + this.fps.toFixed(2) + "</strong>";
            for (i = 0; i < n; ++i) {
                var pair = this.timers[i];
                str += "<br/>" + pair[0] + ": " + pair[1].get_runtime() + "ms";
            }
            return str;
        };
        profiler.prototype.log2 = function() {
            var n = this.timers.length | 0;
            var i = 0;
            var str = "FPS: " + this.fps.toFixed(2) + "  ";
            for (i = 0; i < n; ++i) {
                var pair = this.timers[i];
                str += pair[0] + ": " + pair[1].get_runtime() + "ms  ";
            }
            return str;
        };
        return profiler;
    }();
    AM.Profiler = profiler;
})();

var AM = AM || {};

AM.DeviceLockScreenOrientation = function() {
    var _ready = false;
    var _enabled = true;
    var _pending_commands = [];
    document.addEventListener("deviceready", OnDeviceReady, false);
    function OnDeviceReady() {
        if (window.cordova) {
            ExecPendingCommands();
            _ready = true;
        } else _enabled = false;
    }
    function ExecPendingCommands() {
        for (var i = 0, c = _pending_commands.length; i < c; ++i) {
            _pending_commands[i]();
        }
        _pending_commands.length = 0;
    }
    function Command(func) {
        if (_enabled) {
            if (_ready) func(); else _pending_commands.push(func);
        }
    }
    function LockLandscapeDoit() {
        screen.lockOrientation("landscape-primary");
    }
    function LockPortraitDoit() {
        screen.lockOrientation("portrait-primary");
    }
    function UnlockDoit() {
        screen.unlockOrientation();
    }
    this.LockLandscape = function() {
        Command(LockLandscapeDoit);
    };
    this.LockPortrait = function() {
        Command(LockPortraitDoit);
    };
    this.Unlock = function() {
        Command(UnlockDoit);
    };
};

var AM = AM || {};

AM.DeviceOrientationControl = function(object) {
    var that = this;
    this.object = object;
    this.object.rotation.reorder("YXZ");
    var _first_event_ignored = false;
    var _enabled = false;
    var _screen_orientation = 0;
    var _smooth = new this.CoefMethod();
    var OnDeviceOrientationChangeEvent = function(event) {
        if (_first_event_ignored) {
            _smooth.OnOrientationChange(event);
            _enabled = true;
        } else _first_event_ignored = true;
    };
    var OnScreenOrientationChangeEvent = function() {
        _screen_orientation = window.orientation || 0;
    };
    this.Connect = function() {
        OnScreenOrientationChangeEvent();
        window.addEventListener("orientationchange", OnScreenOrientationChangeEvent, false);
        window.addEventListener("deviceorientation", OnDeviceOrientationChangeEvent, false);
    };
    this.Disconnect = function() {
        window.removeEventListener("orientationchange", OnScreenOrientationChangeEvent, false);
        window.removeEventListener("deviceorientation", OnDeviceOrientationChangeEvent, false);
        _enabled = false;
    };
    this.Update = function() {
        var SetObjectQuaternion = function() {
            var zee = new THREE.Vector3(0, 0, 1);
            var euler = new THREE.Euler();
            var q0 = new THREE.Quaternion();
            var q1 = new THREE.Quaternion(-Math.sqrt(.5), 0, 0, Math.sqrt(.5));
            return function(quaternion, alpha, beta, gamma, orient) {
                euler.set(beta, alpha, -gamma, "YXZ");
                quaternion.setFromEuler(euler);
                quaternion.multiply(q1);
                quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
            };
        }();
        if (_enabled) {
            var orient = _screen_orientation ? THREE.Math.degToRad(_screen_orientation) : 0;
            _smooth.Update();
            SetObjectQuaternion(that.object.quaternion, _smooth.alpha, _smooth.beta, _smooth.gamma, orient);
        }
    };
};

AM.DeviceOrientationControl.prototype.PowerMethod = function() {
    var that = this;
    var _event;
    var _power = 2;
    this.alpha = 0;
    this.beta = 0;
    this.gamma = 0;
    this.OnOrientationChange = function(e) {
        _event = e;
    };
    function power_lerp_rad(a, b, power) {
        var diff = AM.DeviceOrientationControl.prototype.Mod2Pi(b - a);
        var sign = Math.sign(diff);
        var coef = Math.abs(diff / Math.PI);
        coef = Math.pow(coef, power);
        return AM.DeviceOrientationControl.prototype.Mod2Pi(a + coef * Math.PI * sign);
    }
    this.Update = function() {
        that.alpha = power_lerp_rad(that.alpha, THREE.Math.degToRad(_event.alpha), _power);
        that.beta = power_lerp_rad(that.beta, THREE.Math.degToRad(_event.beta), _power);
        that.gamma = power_lerp_rad(that.gamma, THREE.Math.degToRad(_event.gamma), _power);
    };
};

AM.DeviceOrientationControl.prototype.CoefMethod = function() {
    var that = this;
    this.coef = .2;
    this.alpha = 0;
    this.beta = 0;
    this.gamma = 0;
    var _event = false;
    this.OnOrientationChange = function(e) {
        _event = e;
    };
    function lerp_rad(a, b, coef) {
        return a + AM.DeviceOrientationControl.prototype.Mod2Pi(b - a) * coef;
    }
    this.Update = function() {
        if (_event) {
            var alpha = lerp_rad(that.alpha, THREE.Math.degToRad(_event.alpha), that.coef);
            var beta = lerp_rad(that.beta, THREE.Math.degToRad(_event.beta), that.coef);
            var gamma = lerp_rad(that.gamma, THREE.Math.degToRad(_event.gamma), that.coef);
            that.alpha = alpha;
            that.beta = beta;
            that.gamma = gamma;
        }
    };
};

AM.DeviceOrientationControl.prototype.AverageMethod = function() {
    var that = this;
    this.history = [];
    this.history_max = 10;
    this.alpha = 0;
    this.beta = 0;
    this.gamma = 0;
    this.OnOrientationChange = function(event) {
        if (that.history.length > that.history_max) that.history.shift();
        that.history.push(event);
    };
    this.Update = function(alpha, beta, gamma) {
        var alpha = 0;
        var beta = 0;
        var gamma = 0;
        if (that.history.length != 0) {
            for (var i = 0, c = that.history.length; i < c; i++) {
                alpha += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].alpha);
                beta += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].beta);
                gamma += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].gamma);
            }
            alpha /= that.history.length;
            beta /= that.history.length;
            gamma /= that.history.length;
            that.alpha = THREE.Math.degToRad(alpha);
            that.beta = THREE.Math.degToRad(beta);
            that.gamma = THREE.Math.degToRad(gamma);
        }
    };
};

AM.DeviceOrientationControl.prototype.Mod2Pi = function() {
    var n = Math.PI;
    var k = Math.PI * 2;
    return function(val) {
        if (val > n) {
            do {
                val -= k;
            } while (val > n);
        } else if (val < -n) {
            do {
                val += k;
            } while (val < -n);
        }
        return val;
    };
}();

AM.DeviceOrientationControl.prototype.Mod360 = function(val) {
    val = val % 360;
    return val < 180 ? val : val - 360;
};

var AM = AM || {};

AM.GeographicCoordinatesConverter = function(latitude, longitude) {
    var that = this;
    var _origin = {
        latitude: 0,
        longitude: 0
    };
    this.GetLocalCoordinates = function(latitude, longitude) {
        var medium_latitude = (_origin.latitude + latitude) / 2;
        var pos = {
            x: 0,
            y: 0
        };
        pos.x = (longitude - _origin.longitude) * that.EARTH_RADIUS * Math.cos(medium_latitude);
        pos.y = (latitude - _origin.latitude) * -that.EARTH_RADIUS;
        return pos;
    };
    this.GetLocalCoordinatesFromDegres = function(latitude, longitude) {
        return that.GetLocalCoordinates(THREE.Math.degToRad(latitude), THREE.Math.degToRad(longitude));
    };
    this.SetOrigin = function(latitude, longitude) {
        _origin.latitude = latitude;
        _origin.longitude = longitude;
    };
    this.SetOriginFromDegres = function(latitude, longitude) {
        _origin.latitude = THREE.Math.degToRad(latitude);
        _origin.longitude = THREE.Math.degToRad(longitude);
    };
    this.GetOrigin = function() {
        return _origin;
    };
    this.SetOrigin(latitude || 0, longitude || 0);
};

AM.GeographicCoordinatesConverter.prototype.EARTH_RADIUS = 6371e3;

var AM = AM || {};

AM.GeolocationControl = function(object, geoConverter) {
    var that = this;
    var _to_update = false;
    var _target_position = new THREE.Vector3();
    var _watch_id = 0;
    var _coordinates_converter = geoConverter;
    var _accuracy = .1;
    this.object = object;
    this.interpolation_coefficient = .02;
    this.retry_connection_ms = 1e3;
    function OnSuccess(pos) {
        _target_position.copy(_coordinates_converter.GetLocalCoordinatesFromDegres(pos.coords.latitude, pos.coords.longitude));
        _to_update = true;
    }
    function OnError(error) {
        console.warn("geolocation failed: " + error.message);
        window.setTimeout(that.Connect, that.retry_connection_ms);
    }
    this.Connect = function() {
        _watch_id = navigator.geolocation.watchPosition(OnSuccess, OnError);
    };
    this.Disconnect = function() {
        navigator.geolocation.clearWatch(_watch_id);
        _to_update = false;
    };
    this.Update = function() {
        if (_to_update) {
            var diffX = _target_position.x - that.object.position.x;
            var diffZ = _target_position.z - that.object.position.z;
            var distance_sq = diffX * diffX + diffZ * diffZ;
            if (distance_sq < _accuracy * _accuracy) {
                _to_update = false;
            } else {
                diffX *= that.interpolation_coefficient;
                diffZ *= that.interpolation_coefficient;
                that.object.position.x += diffX;
                that.object.position.z += diffZ;
            }
        }
    };
};

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.GifTexture = function(src) {
        THREE.Texture.call(this);
        this.minFilter = THREE.NearestMipMapNearestFilter;
        this.imageElement = document.createElement("img");
        var scriptTag = document.getElementsByTagName("script");
        scriptTag = scriptTag[scriptTag.length - 1];
        scriptTag.parentNode.appendChild(this.imageElement);
        this.imageElement.width = this.imageElement.naturalWidth;
        this.imageElement.height = this.imageElement.naturalHeight;
        if (src) this.setGif(src);
    };
    AMTHREE.GifTexture.prototype = Object.create(THREE.Texture.prototype);
    AMTHREE.GifTexture.prototype.constructor = AMTHREE.GifTexture;
    AMTHREE.GifTexture.prototype.play = function() {
        this.anim.play();
        this.image = this.gifCanvas;
    };
    AMTHREE.GifTexture.prototype.update = function() {
        this.needsUpdate = true;
    };
    AMTHREE.GifTexture.prototype.stop = function() {
        this.anim.move_to(0);
        this.image = undefined;
    };
    AMTHREE.GifTexture.prototype.pause = function() {
        this.anim.pause();
    };
    AMTHREE.GifTexture.prototype.setGif = function(src) {
        this.imageElement.src = src;
        this.anim = new SuperGif({
            gif: this.imageElement,
            auto_play: false
        });
        this.anim.load();
        this.gifCanvas = this.anim.get_canvas();
        this.gifCanvas.style.display = "none";
    };
} else {
    AMTHREE.GifTexture = function() {
        console.warn("GifTexture.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.ImagePlane = function(url) {
        THREE.Mesh.call(this);
        this.geometry = new THREE.PlaneGeometry(1, 1);
        this.material = new THREE.MeshBasicMaterial({
            side: 2
        });
        if (url) this.setUrl(url);
    };
    AMTHREE.ImagePlane.prototype = Object.create(THREE.Mesh.prototype);
    AMTHREE.ImagePlane.prototype.constructor = AMTHREE.ImagePlane;
    AMTHREE.ImagePlane.prototype.clone = function() {
        var clone = new this.constructor(this.src).copy(this);
        clone.material.map = this.material.map.clone();
        return clone;
    };
    AMTHREE.ImagePlane.prototype.setUrl = function(url) {
        this.url = url;
        this.material.map = new THREE.TextureLoader().load(url, function(texture) {
            texture.minFilter = THREE.NearestMipMapLinearFilter;
            texture.needsUpdate = true;
        });
    };
} else {
    AMTHREE.ImagePlane = function() {
        console.warn("ImagePlane.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.ObjectLoader = function(manager) {
        var that = this;
        this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
        this.constants = {};
        this.geometries = {};
        this.materials = {};
        this.animations = [];
        this.images = {};
        this.videos = {};
        this.textures = {};
        this.json = {};
        this.root;
        this.Load = function(url, on_load_object) {
            var loader = new THREE.XHRLoader(that.manager);
            loader.load(url, function(on_load_object) {
                return function(text) {
                    that.json = JSON.parse(text);
                    on_load_object(that.Parse(that.json));
                };
            }(on_load_object));
        };
        this.Parse = function(json) {
            that.json = json;
            that.ParseConstants(json.constants);
            that.ParseGeometries(json.geometries);
            that.ParseImages(json.images);
            that.ParseVideos(json.videos);
            that.ParseTextures(json.textures);
            that.ParseMaterials(json.materials);
            that.ParseAnimations(json.animations);
            var object = that.ParseObject(json.object);
            object.animations = that.animations;
            return object;
        };
        this.ParseConstants = function(json) {
            data = json !== undefined ? json : {};
            that.constants.asset_path = that.root ? that.root + "/" : "";
            if (data.asset_path) that.constants.asset_path = that.constants.asset_path + data.asset_path + "/";
            that.constants.image_path = that.constants.asset_path + (data.image_path !== undefined ? data.image_path : "");
            that.constants.video_path = that.constants.asset_path + (data.video_path !== undefined ? data.video_path : "");
            that.constants.model_path = that.constants.asset_path + (data.model_path !== undefined ? data.model_path : "");
        };
        this.ParseMaterials = function(json) {
            if (json !== undefined) {
                var loader = new THREE.MaterialLoader();
                loader.setTextures(that.textures);
                for (var i = 0, l = json.length; i < l; i++) {
                    var material = loader.parse(json[i]);
                    that.materials[material.uuid] = material;
                }
            }
        };
        this.ParseAnimations = function(json) {
            if (json === undefined) return;
            that.animations = [];
            for (var i = 0; i < json.length; i++) {
                var clip = THREE.AnimationClip.parse(json[i]);
                that.animations.push(clip);
            }
        };
        this.ParseImages = function(json) {
            function LoadImage(url) {
                that.manager.itemStart(url);
                return loader.load(url, function() {
                    that.manager.itemEnd(url);
                });
            }
            if (json !== undefined && json.length > 0) {
                var manager = new THREE.LoadingManager();
                var loader = new THREE.ImageLoader(manager);
                for (var i = 0, l = json.length; i < l; i++) {
                    var image = json[i];
                    if (image.url === undefined) console.warn('AMTHREE.ObjectLoader: no "url" specified for image ' + i); else if (image.uuid === undefined) console.warn('AMTHREE.ObjectLoader: no "uuid" specified for image ' + i); else {
                        var url = that.constants.image_path + "/" + image.url;
                        that.images[image.uuid] = LoadImage(url);
                    }
                }
            }
        };
        this.ParseVideos = function(json) {
            if (json !== undefined) {
                for (var i = 0, l = json.length; i < l; i++) {
                    var video = json[i];
                    if (video.url === undefined) console.warn('AMTHREE.ObjectLoader: no "url" specified for video ' + i); else if (video.uuid === undefined) console.warn('AMTHREE.ObjectLoader: no "uuid" specified for video ' + i); else {
                        var data = {
                            url: that.constants.video_path + "/" + video.url,
                            uuid: video.uuid,
                            width: video.width || 640,
                            height: video.height || 480
                        };
                        that.videos[video.uuid] = data;
                    }
                }
            }
        };
        this.ParseTextures = function(json) {
            if (typeof SuperGif == "undefined") console.warn("AMTHREE.ObjectLoader: SuperGif is undefined");
            function ParseConstant(value) {
                if (typeof value === "number") return value;
                console.warn("AMTHREE.ObjectLoader.parseTexture: Constant should be in numeric form.", value);
                return THREE[value];
            }
            if (json !== undefined) {
                for (var i = 0, l = json.length; i < l; i++) {
                    var data = json[i];
                    if (data.image === undefined && data.video === undefined) {
                        console.warn('AMTHREE.ObjectLoader: No "image" nor "video" specified for', data.uuid);
                        continue;
                    }
                    if (data.image !== undefined) {
                        if (that.images[data.image] === undefined) {
                            console.warn("AMTHREE.ObjectLoader: Undefined image", data.image);
                            continue;
                        }
                        var image = that.images[data.image];
                        if (data.animated !== undefined && data.animated) {
                            if (typeof SuperGif == "undefined") continue;
                            var texture = new AMTHREE.GifTexture(image.src);
                        } else {
                            var texture = new THREE.Texture(image);
                            texture.needsUpdate = true;
                        }
                    } else {
                        if (that.videos[data.video] === undefined) {
                            console.warn("AMTHREE.ObjectLoader: Undefined video", data.video);
                            continue;
                        }
                        var video_data = that.videos[data.video];
                        var texture = new AMTHREE.VideoTexture({
                            src: video_data.url,
                            width: video_data.width,
                            height: video_data.height,
                            loop: data.loop,
                            autoplay: data.autoplay
                        });
                    }
                    texture.uuid = data.uuid;
                    if (data.name !== undefined) texture.name = data.name;
                    if (data.mapping !== undefined) texture.mapping = ParseConstant(data.mapping);
                    if (data.offset !== undefined) texture.offset = new THREE.Vector2(data.offset[0], data.offset[1]);
                    if (data.repeat !== undefined) texture.repeat = new THREE.Vector2(data.repeat[0], data.repeat[1]);
                    if (data.minFilter !== undefined) texture.minFilter = ParseConstant(data.minFilter); else texture.minFilter = THREE.LinearFilter;
                    if (data.magFilter !== undefined) texture.magFilter = ParseConstant(data.magFilter);
                    if (data.anisotropy !== undefined) texture.anisotropy = data.anisotropy;
                    if (Array.isArray(data.wrap)) {
                        texture.wrapS = ParseConstant(data.wrap[0]);
                        texture.wrapT = ParseConstant(data.wrap[1]);
                    }
                    that.textures[data.uuid] = texture;
                }
            }
        };
        this.ParseGeometries = function(json) {
            if (json !== undefined) {
                var geometry_loader = new THREE.JSONLoader();
                var buffer_geometry_loader = new THREE.BufferGeometryLoader();
                for (var i = 0, l = json.length; i < l; i++) {
                    var data = json[i];
                    var geometry;
                    switch (data.type) {
                      case "PlaneGeometry":
                      case "PlaneBufferGeometry":
                        geometry = new THREE[data.type](data.width, data.height, data.widthSegments, data.heightSegments);
                        break;

                      case "BoxGeometry":
                      case "CubeGeometry":
                        geometry = new THREE.BoxGeometry(data.width, data.height, data.depth, data.widthSegments, data.heightSegments, data.depthSegments);
                        break;

                      case "CircleBufferGeometry":
                        geometry = new THREE.CircleBufferGeometry(data.radius, data.segments, data.thetaStart, data.thetaLength);
                        break;

                      case "CircleGeometry":
                        geometry = new THREE.CircleGeometry(data.radius, data.segments, data.thetaStart, data.thetaLength);
                        break;

                      case "CylinderGeometry":
                        geometry = new THREE.CylinderGeometry(data.radiusTop, data.radiusBottom, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength);
                        break;

                      case "SphereGeometry":
                        geometry = new THREE.SphereGeometry(data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
                        break;

                      case "SphereBufferGeometry":
                        geometry = new THREE.SphereBufferGeometry(data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
                        break;

                      case "DodecahedronGeometry":
                        geometry = new THREE.DodecahedronGeometry(data.radius, data.detail);
                        break;

                      case "IcosahedronGeometry":
                        geometry = new THREE.IcosahedronGeometry(data.radius, data.detail);
                        break;

                      case "OctahedronGeometry":
                        geometry = new THREE.OctahedronGeometry(data.radius, data.detail);
                        break;

                      case "TetrahedronGeometry":
                        geometry = new THREE.TetrahedronGeometry(data.radius, data.detail);
                        break;

                      case "RingGeometry":
                        geometry = new THREE.RingGeometry(data.innerRadius, data.outerRadius, data.thetaSegments, data.phiSegments, data.thetaStart, data.thetaLength);
                        break;

                      case "TorusGeometry":
                        geometry = new THREE.TorusGeometry(data.radius, data.tube, data.radialSegments, data.tubularSegments, data.arc);
                        break;

                      case "TorusKnotGeometry":
                        geometry = new THREE.TorusKnotGeometry(data.radius, data.tube, data.radialSegments, data.tubularSegments, data.p, data.q, data.heightScale);
                        break;

                      case "BufferGeometry":
                        geometry = buffer_geometry_loader.parse(data);
                        break;

                      case "Geometry":
                        geometry = geometry_loader.parse(data.data, this.texturePath).geometry;
                        break;

                      default:
                        console.warn('AMTHREE.ObjectLoader: Unsupported geometry type "' + data.type + '"');
                        continue;
                    }
                    geometry.uuid = data.uuid;
                    if (data.name !== undefined) geometry.name = data.name;
                    that.geometries[data.uuid] = geometry;
                }
            }
        };
        this.ParseObject = function() {
            if (THREE.ColladaLoader) {
                var collada_loader = new THREE.ColladaLoader();
                collada_loader.options.convertUpAxis = true;
            } else console.warn("AMTHREE.ObjectLoader: THREE.ColladaLoader undefined");
            if (THREE.OBJLoader) var obj_loader = new THREE.OBJLoader(); else console.warn("AMTHREE.ObjectLoader: THREE.OBJLoader undefined");
            if (THREE.OBJMTLLoader) var obj_mtl_loader = new THREE.OBJMTLLoader(); else console.warn("AMTHREE.ObjectLoader: THREE.OBJMTLLoader undefined");
            function SetAttributes(object, data) {
                var matrix = new THREE.Matrix4();
                object.uuid = data.uuid;
                if (data.name !== undefined) object.name = data.name;
                if (data.matrix !== undefined) {
                    matrix.fromArray(data.matrix);
                    matrix.decompose(object.position, object.quaternion, object.scale);
                } else {
                    if (data.position !== undefined) object.position.fromArray(data.position);
                    if (data.rotation !== undefined) object.rotation.fromArray(data.rotation);
                    if (data.scale !== undefined) object.scale.fromArray(data.scale);
                    if (data.scaleXYZ !== undefined) {
                        object.scale.x *= data.scaleXYZ;
                        object.scale.y *= data.scaleXYZ;
                        object.scale.z *= data.scaleXYZ;
                    }
                }
                if (data.castShadow !== undefined) object.castShadow = data.castShadow;
                if (data.receiveShadow !== undefined) object.receiveShadow = data.receiveShadow;
                if (data.visible !== undefined) object.visible = data.visible;
                if (data.userData !== undefined) object.userData = data.userData;
            }
            return function(data, parent) {
                var object;
                function getGeometry(name) {
                    if (name === undefined) return undefined;
                    if (that.geometries[name] === undefined) {
                        console.warn("AMTHREE.ObjectLoader: Undefined geometry", name);
                    }
                    return that.geometries[name];
                }
                function getMaterial(name) {
                    if (name === undefined) return undefined;
                    if (that.materials[name] === undefined) {
                        console.warn("AMTHREE.ObjectLoader: Undefined material", name);
                    }
                    return that.materials[name];
                }
                switch (data.type) {
                  case "Scene":
                    object = new THREE.Scene();
                    break;

                  case "PerspectiveCamera":
                    object = new THREE.PerspectiveCamera(data.fov, data.aspect, data.near, data.far);
                    break;

                  case "OrthographicCamera":
                    object = new THREE.OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);
                    break;

                  case "AmbientLight":
                    object = new THREE.AmbientLight(data.color);
                    break;

                  case "DirectionalLight":
                    object = new THREE.DirectionalLight(data.color, data.intensity);
                    break;

                  case "PointLight":
                    object = new THREE.PointLight(data.color, data.intensity, data.distance, data.decay);
                    break;

                  case "SpotLight":
                    object = new THREE.SpotLight(data.color, data.intensity, data.distance, data.angle, data.exponent, data.decay);
                    break;

                  case "HemisphereLight":
                    object = new THREE.HemisphereLight(data.color, data.groundColor, data.intensity);
                    break;

                  case "Mesh":
                    object = new THREE.Mesh(getGeometry(data.geometry), getMaterial(data.material));
                    break;

                  case "LOD":
                    object = new THREE.LOD();
                    break;

                  case "Line":
                    object = new THREE.Line(getGeometry(data.geometry), getMaterial(data.material), data.mode);
                    break;

                  case "PointCloud":
                  case "Points":
                    object = new THREE.Points(getGeometry(data.geometry), getMaterial(data.material));
                    break;

                  case "Sprite":
                    object = new THREE.Sprite(getMaterial(data.material));
                    break;

                  case "Group":
                    object = new THREE.Group();
                    break;

                  case "OBJ":
                    if (typeof obj_loader == "undefined") {
                        console.warn("AMTHREE.ObjectLoader: failed to load " + data.uuid + ": THREE.OBJLoader is undefined");
                        return undefined;
                    }
                    object = new THREE.Object3D();
                    var url = that.constants.model_path + "/" + data.url;
                    that.manager.itemStart(url);
                    obj_loader.load(url, function(object, data, manager, url) {
                        return function(model) {
                            object.copy(model);
                            object.traverse(function(child) {
                                if (child.geometry) child.geometry.computeBoundingSphere();
                            });
                            SetAttributes(object, data);
                            manager.itemEnd(url);
                        };
                    }(object, data, that.manager, url));
                    break;

                  case "OBJMTL":
                    if (typeof obj_mtl_loader == "undefined") {
                        console.warn("AMTHREE.ObjectLoader: failed to load " + data.uuid + ": THREE.OBJMTLLoader is undefined");
                        return undefined;
                    }
                    object = new THREE.Group();
                    var obj_url = that.constants.model_path + "/" + data.objUrl;
                    var mtl_url = that.constants.model_path + "/" + data.mtlUrl;
                    that.manager.itemStart(obj_url);
                    that.manager.itemStart(mtl_url);
                    obj_mtl_loader.load(obj_url, mtl_url, function(object, data, manager, obj_url, mtl_url) {
                        return function(model) {
                            object.copy(model);
                            object.traverse(function(child) {
                                if (child.geometry) child.geometry.computeBoundingSphere();
                            });
                            SetAttributes(object, data);
                            manager.itemEnd(obj_url);
                            manager.itemEnd(mtl_url);
                        };
                    }(object, data, that.manager, obj_url, mtl_url));
                    break;

                  case "Collada":
                    if (typeof collada_loader === "undefined") {
                        console.warn("ObjectLoader: failed to load " + data.uuid + ": THREE.ColladaLoader is undefined");
                        return undefined;
                    }
                    object = new THREE.Group();
                    var url = that.constants.model_path + "/" + data.url;
                    console.log(url);
                    that.manager.itemStart(url);
                    collada_loader.load(url, function(object, data, manager, url) {
                        return function(collada) {
                            var dae = collada.scene;
                            object.copy(dae);
                            if (typeof THREE.Animation !== "undefined") {
                                object.traverse(function(child) {
                                    if (child instanceof THREE.SkinnedMesh) {
                                        var animation = new THREE.Animation(child, child.geometry.animation);
                                        animation.play();
                                    }
                                });
                            }
                            SetAttributes(object, data);
                            manager.itemEnd(url);
                        };
                    }(object, data, manager, url));

                  case "Sound":
                    object = new AMTHREE.Sound(data.url);
                    break;

                  case "ImagePlane":
                    var url;
                    if (that.constants.image_path) url = that.constants.image_path + "/" + data.url; else url = data.url;
                    object = new AMTHREE.ImagePlane(url);
                    break;

                  default:
                    object = new THREE.Object3D();
                }
                SetAttributes(object, data);
                if (data.children !== undefined) {
                    for (var child in data.children) {
                        var o = that.ParseObject(data.children[child], object);
                        if (o !== undefined) {
                            object.add(o);
                        }
                    }
                }
                if (data.type === "LOD") {
                    var levels = data.levels;
                    for (var l = 0; l < levels.length; l++) {
                        var level = levels[l];
                        var child = object.getObjectByProperty("uuid", level.object);
                        if (child !== undefined) {
                            object.addLevel(child, level.distance);
                        }
                    }
                }
                if (parent !== undefined) parent.add(object);
                return object;
            };
        }();
    };
} else {
    AMTHREE.ObjectLoader = function() {
        console.warn("ObjectLoader.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.Scene = function(parameters) {
        if (typeof AMTHREE.ObjectLoader === "undefined") console.warn("AMTHREE.Scene: AMTHREE.ObjectLoader undefined");
        parameters = parameters || {};
        var that = this;
        var _renderer = new THREE.WebGLRenderer({
            alpha: true,
            canvas: parameters.canvas
        });
        var _three_scene = new THREE.Scene();
        var _camera = new THREE.PerspectiveCamera(parameters.fov || 80, _renderer.domElement.width / _renderer.domElement.height, 1e-4, 1e4);
        var _camera_body = new THREE.Object3D();
        var _obj_loader;
        var _loading_manager = new THREE.LoadingManager();
        _camera_body.add(_camera);
        _three_scene.add(_camera_body);
        if (!parameters.canvas) {
            _renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(_renderer.domElement);
        }
        _renderer.setClearColor(10066383, 0);
        if (typeof AMTHREE.ObjectLoader !== "undefined") _obj_loader = new AMTHREE.ObjectLoader(_loading_manager);
        this.gps_converter = parameters.gps_converter;
        this.Clear = function() {
            _three_scene.children = [];
            _three_scene.copy(new THREE.Scene(), false);
        };
        function OnWindowResize() {
            _camera.aspect = window.innerWidth / window.innerHeight;
            _camera.updateProjectionMatrix();
            _renderer.setSize(window.innerWidth, window.innerHeight);
        }
        this.SetFullWindow = function() {
            window.addEventListener("resize", OnWindowResize, false);
            OnWindowResize();
        };
        this.StopFullWindow = function() {
            window.removeEventListener("resize", OnWindowResize, false);
        };
        this.Render = function() {
            _renderer.render(_three_scene, _camera);
        };
        this.Update = function() {
            var clock = new THREE.Clock();
            return function() {
                if (THREE.AnimationHandler) THREE.AnimationHandler.update(clock.getDelta());
                AMTHREE.UpdateAnimatedTextures(_three_scene);
            };
        }();
        this.AddObject = function(object) {
            MoveObjectToGPSCoords(object);
            _three_scene.add(object);
        };
        this.RemoveObject = function(object) {
            _three_scene.remove(object);
        };
        var OnLoadThreeScene = function(on_load_assets) {
            return function(new_scene) {
                var OnLoadAssets = function(new_scene) {
                    return function() {
                        while (new_scene.children.length) {
                            var child = new_scene.children[0];
                            new_scene.remove(child);
                            that.AddObject(child);
                        }
                        _three_scene.copy(new_scene, false);
                        AMTHREE.PlayAnimations(_three_scene);
                        if (on_load_assets) on_load_assets();
                    };
                }(new_scene);
                _loading_manager.onLoad = OnLoadAssets;
            };
        };
        this.Parse = function(json, on_load_assets) {
            if (_obj_loader) {
                var on_load_scene = new OnLoadThreeScene(on_load_assets);
                var new_scene = _obj_loader.parse(json);
                on_load_scene(new_scene);
            } else console.warn("AMTHREE.Scene: Parse failed: AMTHREE.ObjectLoader undefined");
        };
        this.Load = function(url, on_load_assets) {
            if (_obj_loader) _obj_loader.Load(url, new OnLoadThreeScene(on_load_assets)); else console.warn("AMTHREE.Scene: Load failed: AMTHREE.ObjectLoader undefined");
        };
        this.GetCamera = function() {
            return _camera;
        };
        this.GetCameraBody = function() {
            return _camera_body;
        };
        this.GetScene = function() {
            return _three_scene;
        };
        this.GetRenderer = function() {
            return _renderer;
        };
        this.ResizeRenderer = function(width, height) {
            _renderer.setSize(width, height);
            _camera.aspect = _renderer.domElement.width / _renderer.domElement.height;
            _camera.updateProjectionMatrix();
        };
        function MoveObjectToGPSCoords(object) {
            if (that.gps_converter) {
                if (object.userData !== undefined && object.position !== undefined) {
                    var data = object.userData;
                    if (data.latitude !== undefined && data.longitude !== undefined) {
                        var pos = that.gps_converter(data.latitude, data.longitude);
                        object.position.z = pos.y;
                        object.position.x = pos.x;
                    }
                    if (data.altitude !== undefined) {
                        object.position.y = data.altitude;
                    }
                }
            }
        }
    };
} else {
    AMTHREE.Scene = function() {
        console.warn("Scene.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.Sound = function(src) {
        THREE.Object3D.call(this);
        this.src = src;
        this.audio = new Audio();
        this.audio.loop = true;
        this.playing = false;
    };
    AMTHREE.Sound.prototype = Object.create(THREE.Object3D.prototype);
    AMTHREE.Sound.prototype.constructor = AMTHREE.Sound;
    AMTHREE.Sound.prototype.play = function() {
        this.playing = true;
        this.audio.src = this.src;
        this.audio.play();
    };
    AMTHREE.Sound.prototype.stop = function() {
        this.audio.src = "";
        this.playing = false;
    };
    AMTHREE.Sound.prototype.pause = function() {
        this.audio.pause();
        this.playing = false;
    };
    AMTHREE.Sound.prototype.setSrc = function(src) {
        this.src = src;
        if (this.isPlaying()) this.play();
    };
    AMTHREE.Sound.prototype.isPlaying = function() {
        return this.playing;
    };
    AMTHREE.Sound.prototype.clone = function() {
        return new AMTHREE.Sound(this.src);
    };
    AMTHREE.Sound.prototype.copy = function(sound) {
        this.setSrc(sound.src);
    };
    AMTHREE.SoundsCall = function(object, fun) {
        object.traverse(function(s) {
            if (s instanceof AMTHREE.Sound && s[fun]) s[fun]();
        });
    };
    AMTHREE.PlaySounds = function(object) {
        AMTHREE.SoundsCall(object, "play");
    };
    AMTHREE.PauseSounds = function(object) {
        AMTHREE.SoundsCall(object, "pause");
    };
    AMTHREE.StopSounds = function(object) {
        AMTHREE.SoundsCall(object, "stop");
    };
} else {
    AMTHREE.Sound = function() {
        console.warn("Sound.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.TrackedObjManager = function(parameters) {
        parameters = parameters || {};
        var that = this;
        var _clock = new THREE.Clock(true);
        var _holder = new AMTHREE.TrackedObjManager.prototype.Holder();
        function UpdateLerpMethod() {
            _holder.ForEach(function(elem) {
                if (elem.enabled) {
                    var obj = elem.object;
                    var target = elem.target;
                    obj.position.lerp(target.position, that.lerp_factor);
                    obj.quaternion.slerp(target.quaternion, that.lerp_factor);
                    obj.scale.lerp(target.scale, that.lerp_factor);
                }
            });
        }
        var _update_method = UpdateLerpMethod;
        this.camera = parameters.camera;
        this.lerp_factor = parameters.lerp_factor || .2;
        this.timeout = parameters.timeout || 6;
        this.Add = function(object, uuid, on_enable, on_disable) {
            _holder.Add(object, uuid, on_enable, on_disable);
        };
        this.Remove = function(uuid) {
            _holder.Remove(uuid);
        };
        this.Clear = function() {
            _holder.Clear();
        };
        this.Update = function() {
            _holder.UpdateElapsed(_clock.getDelta());
            _holder.CheckTimeout(that.timeout);
            _update_method();
        };
        this.Track = function() {
            var new_matrix = new THREE.Matrix4();
            return function(uuid, matrix) {
                if (that.camera) {
                    var elem = _holder.Get(uuid);
                    if (elem) {
                        var target = elem.target;
                        new_matrix.copy(that.camera.matrixWorld);
                        new_matrix.multiply(matrix);
                        new_matrix.decompose(target.position, target.quaternion, target.scale);
                        if (!elem.enabled) {
                            new_matrix.decompose(elem.object.position, elem.object.quaternion, elem.object.scale);
                        }
                        _holder.Track(uuid);
                        return true;
                    } else console.warn("TrackedObjManager: object " + uuid + " not found");
                } else console.warn("TrackedObjManager: camera is undefined");
                return false;
            };
        }();
        this.TrackCompose = function() {
            var matrix = new THREE.Matrix4();
            return function(uuid, position, quaternion, scale) {
                matrix.compose(position, quaternion, scale);
                return that.Track(uuid, matrix);
            };
        }();
        this.TrackComposePosit = function() {
            var position = new THREE.Vector3();
            var euler = new THREE.Euler();
            var quaternion = new THREE.Quaternion();
            var scale = new THREE.Vector3();
            return function(uuid, translation_pose, rotation_pose, model_size) {
                position.x = translation_pose[0];
                position.y = translation_pose[1];
                position.z = -translation_pose[2];
                euler.x = -Math.asin(-rotation_pose[1][2]);
                euler.y = -Math.atan2(rotation_pose[0][2], rotation_pose[2][2]);
                euler.z = Math.atan2(rotation_pose[1][0], rotation_pose[1][1]);
                scale.x = model_size;
                scale.y = model_size;
                scale.z = model_size;
                quaternion.setFromEuler(euler);
                return that.TrackCompose(uuid, position, quaternion, scale);
            };
        }();
        this.GetObject = function(uuid) {
            var elem = _holder.get(uuid);
            if (elem) {
                return elem.object;
            }
            return undefined;
        };
    };
    AMTHREE.TrackedObjManager.prototype.Holder = function() {
        var that = this;
        var _objects = {};
        this.Add = function(object, uuid, on_enable, on_disable) {
            _objects[uuid] = {
                object: object,
                target: {
                    position: object.position.clone(),
                    quaternion: object.quaternion.clone(),
                    scale: object.scale.clone()
                },
                elapsed: 0,
                on_enable: on_enable,
                on_disable: on_disable,
                enabled: false
            };
        };
        this.Remove = function(uuid) {
            var elem = _objects[uuid];
            if (elem.enabled) {
                if (elem.on_disable) elem.on_disable(elem.object);
            }
            delete _objects[uuid];
        };
        this.Clear = function() {
            for (uuid in _objects) that.Remove(uuid);
        };
        this.Track = function(uuid) {
            var elem = _objects[uuid];
            elem.elapsed = 0;
            if (!elem.enabled) {
                elem.enabled = true;
                if (elem.on_enable) elem.on_enable(elem.object);
            }
        };
        this.UpdateElapsed = function(elapsed) {
            for (uuid in _objects) {
                _objects[uuid].elapsed += elapsed;
            }
        };
        this.CheckTimeout = function(timeout) {
            for (uuid in _objects) {
                var elem = _objects[uuid];
                if (elem.enabled && elem.elapsed > timeout) {
                    if (elem.on_disable) elem.on_disable(elem.object);
                    elem.enabled = false;
                }
            }
        };
        this.ForEach = function(fun) {
            for (uuid in _objects) {
                fun(_objects[uuid]);
            }
        };
        this.Get = function(uuid) {
            return _objects[uuid];
        };
    };
} else {
    AMTHREE.TrackedObjManager = function() {
        console.warn("TrackedObjManager.js: THREE undefined");
    };
}

var AMTHREE = AMTHREE || {};

AMTHREE.AnimatedTextureCall = function(object, fun) {
    object.traverse(function(s) {
        if (s.material && s.material.map && s.material.map[fun]) s.material.map[fun]();
    });
};

AMTHREE.PlayAnimatedTextures = function(object) {
    AMTHREE.AnimatedTextureCall(object, "play");
};

AMTHREE.StopAnimatedTextures = function(object) {
    AMTHREE.AnimatedTextureCall(object, "stop");
};

AMTHREE.PauseAnimatedTextures = function(object) {
    AMTHREE.AnimatedTextureCall(object, "pause");
};

AMTHREE.UpdateAnimatedTextures = function(object) {
    AMTHREE.AnimatedTextureCall(object, "update");
};

AMTHREE.WorldToCanvasPosition = function(position, camera, canvas) {
    var vec = new THREE.Vector3();
    vec.copy(position);
    vec.project(camera);
    var x = Math.round((vec.x + 1) * canvas.width / 2);
    var y = Math.round((-vec.y + 1) * canvas.height / 2);
    return {
        x: x,
        y: y,
        z: vec.z
    };
};

AMTHREE.PlayAnimations = function(object) {
    object.traverse(function(child) {
        if (child instanceof THREE.SkinnedMesh) {
            var animation = new THREE.Animation(child, child.geometry.animation);
            animation.play();
        }
    });
};

var AMTHREE = AMTHREE || {};

if (typeof THREE !== "undefined") {
    AMTHREE.VideoTexture = function(params) {
        THREE.Texture.call(this);
        this.minFilter = THREE.NearestMipMapNearestFilter;
        this.videoElement = document.createElement("video");
        this.setVideo(params);
    };
    AMTHREE.VideoTexture.prototype = Object.create(THREE.Texture.prototype);
    AMTHREE.VideoTexture.prototype.constructor = AMTHREE.VideoTexture;
    AMTHREE.VideoTexture.prototype.copy = function(source) {
        THREE.Texture.prototype.copy.call(this, source);
        var params = {};
        if (source.videoElement) {
            params.width = source.videoElement.width;
            params.height = source.videoElement.height;
            params.loop = source.videoElement.loop;
            params.autoplay = source.videoElement.autoplay;
        }
        params.src = source.src;
        this.setVideo(params);
        return this;
    };
    AMTHREE.VideoTexture.prototype.clone = function() {
        return new this.constructor().copy(this);
    };
    AMTHREE.VideoTexture.prototype.play = function() {
        if (this.videoElement && !this.playing) {
            if (!this.paused) {
                this.videoElement.src = this.src;
            }
            this.videoElement.play();
            this.image = this.videoElement;
            this.playing = true;
        }
    };
    AMTHREE.VideoTexture.prototype.update = function() {
        if (this.videoElement && this.videoElement.readyState == this.videoElement.HAVE_ENOUGH_DATA) {
            this.needsUpdate = true;
        }
    };
    AMTHREE.VideoTexture.prototype.pause = function() {
        if (this.videoElement && !this.videoElement.paused) {
            this.videoElement.pause();
            this.playing = false;
        }
    };
    AMTHREE.VideoTexture.prototype.stop = function() {
        if (this.videoElement) {
            this.pause();
            this.videoElement.src = "";
            this.image = undefined;
            this.needsUpdate = true;
        }
    };
    AMTHREE.VideoTexture.prototype.setVideo = function(params) {
        this.stop();
        if (params) {
            this.src = params.src;
            this.videoElement.width = params.width;
            this.videoElement.height = params.height;
            this.videoElement.autoplay = typeof params.autoplay !== "undefined" ? params.autoplay : false;
            this.videoElement.loop = typeof params.loop !== "undefined" ? params.loop : true;
        }
        this.playing = false;
        if (this.videoElement.autoplay) this.play();
    };
} else {
    AMTHREE.VideoTexture = function() {
        console.warn("VideoTexture.js: THREE undefined");
    };
}

var AM = AM || {};

AM.Detection = function() {
    var _params = {
        laplacian_threshold: 30,
        eigen_threshold: 25,
        detection_corners_max: 500,
        border_size: 3,
        fast_threshold: 48
    };
    var _screen_corners = [];
    var _num_corners = 0;
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
        AllocateCorners(img.cols, img.rows);
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
    var _img_u8;
    var _params = {
        blur_size: 3,
        blur: true
    };
    this.Filter = function(image_data) {
        var width = image_data.width;
        var height = image_data.height;
        if (_img_u8) _img_u8.resize(width, height, jsfeat.U8_t | jsfeat.C1_t); else _img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(image_data.data, width, height, _img_u8);
        if (_params.blur) jsfeat.imgproc.gaussian_blur(_img_u8, _img_u8, _params.blur_size);
    };
    this.GetFilteredImage = function() {
        return _img_u8;
    };
    this.SetParameters = function(params) {
        for (name in params) {
            if (typeof _params[name] !== "undefined") _params[name] = params[name];
        }
    };
};

var AM = AM || {};

AM.MarkerTracker = function() {
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
    var _profiler = new AM.Profiler();
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
        _matching_image = undefined;
        _matching.SetScreenDescriptors(_detection.GetDescriptors());
        for (uuid in _trained_images) {
            var trained_image = _trained_images[uuid];
            if (!trained_image.IsActive()) continue;
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
        _active = bool === true;
    };
    this.IsActive = function() {
        return _active;
    };
};

var AM = AM || {};

AM.Training = function() {
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
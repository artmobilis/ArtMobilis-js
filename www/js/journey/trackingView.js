angular.module('journey')

.directive('trackingView', ['CameraSvc', 'JourneySceneSvc',
  function(CameraSvc, JourneySceneSvc) {
    return {
      restrict: 'E',
      template: '<div/>',
      link: function(scope, element, attr) {

        var that = this;

        var _div = element.children[0];

        var _camera_video_element = CameraSvc.GetVideoElement();
        var _camera_video_element_appended = false;
        var _scene;
        var _canvas = JourneySceneSvc.GetCanvas();
        var _canvas_appended = false;

        var _device_lock_screen = new AM.DeviceLockScreenOrientation();

        var _running = false;
        var _destroyed = false;


        attr.$observe('run', function(run) {
          if (run === 'true' && !_running) {
            _running = true;
            Loop();
          }
        })

        _device_lock_screen.LockPortrait();


        document.body.appendChild(_canvas);
        _canvas_appended = true;

        document.body.appendChild(_camera_video_element);
        _camera_video_element_appended = true;


        scope.$on('$destroy', function() {
          _running = false;
          _destroyed = true;
          if (_camera_video_element_appended) {
            document.body.removeChild(_camera_video_element);
            _camera_video_element_appended = false;
          }
          if (_canvas_appended) {
            document.body.removeChild(_canvas);
            _canvas_appended = false;
          }
          _device_lock_screen.Unlock();
        });


        function Loop() {
          if (_running && !_destroyed) {
            window.requestAnimationFrame(Loop);
            if (JourneySceneSvc.Started())
              JourneySceneSvc.Update();
          }
        }

      }
    }
  }
])
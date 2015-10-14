/**
 * Webcam Directive
 *
 * (c) Jonas Hartmann http://jonashartmann.github.io/webcam-directive
 * License: MIT
 *
 * @version: 3.0.0
 * Rear camera fix: https://github.com/sysart/webcam-directive
 */
'use strict';

(function() {
  // GetUserMedia is not yet supported by all browsers
  // Until then, we need to handle the vendor prefixes
  navigator.getMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

  // Checks if getUserMedia is available on the client browser
  window.hasUserMedia = function hasUserMedia() {
      if (navigator.getMedia === false ) $scope.erreur="window.hasUserMedia false";
    return navigator.getMedia ? true : false;
  };
})();

angular.module('webcam', [])
  .directive('webcam', function () {
    return {
      template: '<div class="webcam" ng-transclude></div>',
      restrict: 'E',
      replace: true,
      transclude: true,
      scope:
      {
        onError: '&',
        onStream: '&',
        onStreaming: '&',
        placeholder: '=',
        cameraid: '=',
        config: '=channel'
      },
      link: function postLink($scope, element) {
        var videoElem = null,
            videoStream = null,
            placeholder = null;

        $scope.config = $scope.config || {};

        var _removeDOMElement = function _removeDOMElement(DOMel) {
          if (DOMel) {
            angular.element(DOMel).remove();
          }
        };

        var onDestroy = function onDestroy() {
          if (!!videoStream && typeof videoStream.stop === 'function') {
            videoStream.stop();
          }
          if (!!videoElem) {
            delete videoElem.src;
          }
        };

        // called when camera stream is loaded
        var onSuccess = function onSuccess(stream) {
          videoStream = stream;

          // Firefox supports a src object
          if (navigator.mozGetUserMedia) {
            videoElem.mozSrcObject = stream;
          } else {
            var vendorURL = window.URL || window.webkitURL;
            videoElem.src = vendorURL.createObjectURL(stream);
          }

          /* Start playing the video to show the stream from the webcam */
          videoElem.play();
          $scope.config.video = videoElem;

          /* Call custom callback */
          if ($scope.onStream) {
            $scope.onStream({stream: stream});
          }
        };

        // called when any error happens
        var onFailure = function onFailure(err) {
            _removeDOMElement(placeholder);
            $scope.erreur = "The following error occured: " + err;

          /* Call custom callback */
          if ($scope.onError) {
            $scope.onError({err:err});
          }

          return;
        };

        var startWebcam = function startWebcam() {
          videoElem = document.createElement('video');
          videoElem.setAttribute('class', 'webcam-live');
          videoElem.setAttribute('id', 'video');// not in sysart fork
          videoElem.setAttribute('autoplay', '');
          element.append(videoElem);

          if ($scope.placeholder) {
            placeholder = document.createElement('img');
            placeholder.setAttribute('class', 'webcam-loader');
            placeholder.src = $scope.placeholder;
            element.append(placeholder);
          }

          // Default variables
          var isStreaming = false,
            width = element.width = $scope.config.videoWidth || 320,
            height = element.height = 0;

          // Check the availability of getUserMedia across supported browsers
          if (!window.hasUserMedia()) {
            $scope.erreur = "Browser does not support getUserMedia." ;
            onFailure({code:-1, msg: 'Browser does not support getUserMedia.'});
            return;
          }

          var videoSources = [];

          function gotSources(sourceInfos) {
              for (var i = 0; i !== sourceInfos.length; ++i) {
                  var sourceInfo = sourceInfos[i];
                  if (sourceInfo.kind === 'video') {
                      $scope.infos = "sourceInfo:" + sourceInfo.id;
                      console.log("sourceInfo:" + sourceInfo.id);
                      // TODO quick and dirty fix for now
                      if (sourceInfo.label !== "Spout Cam") videoSources.push(sourceInfo); 
                  }
              }
              // force cameraid within videoSources bounds
              if (videoSources.length > 0 && $scope.cameraid >= videoSources.length) $scope.cameraid = videoSources.length - 1;
              var mediaConstraint;

              if ($scope.cameraid !== undefined) {
                  mediaConstraint = { video: { optional: [{ sourceId: videoSources[$scope.cameraid].id }] }, audio: false };
              } else {
                  mediaConstraint = { video: true, audio: false };
              }
              navigator.getMedia(mediaConstraint, onSuccess, onFailure);
          }

          if (typeof MediaStreamTrack !== 'undefined') {
              if (typeof MediaStreamTrack.getSources !== 'undefined') {
                  MediaStreamTrack.getSources(gotSources);
              } else {
                  var mediaConstraint = { video: true, audio: false };
                  navigator.getMedia(mediaConstraint, onSuccess, onFailure);
              }
          }
          /* Start streaming the webcam data when the video element can play
           * It will do it only once
           */
          videoElem.addEventListener('canplay', function() {
            if (!isStreaming) {
              var scale = width / videoElem.videoWidth;
              height = (videoElem.videoHeight * scale) ||
                        $scope.config.videoHeight;
              videoElem.setAttribute('width', width);
              videoElem.setAttribute('height', height);
              isStreaming = true;

              $scope.config.video = videoElem;

              _removeDOMElement(placeholder);

              /* Call custom callback */
              if ($scope.onStreaming) {
                $scope.onStreaming();
              }
            }
          }, false);
        };

        var stopWebcam = function stopWebcam() {
            $scope.infos = "stopWebcam";

          onDestroy();
          videoElem.remove();
        };

        $scope.$on('$destroy', onDestroy);
        $scope.$on('START_WEBCAM', startWebcam);
        $scope.$on('STOP_WEBCAM', stopWebcam);

        startWebcam();

      }
    };
  });

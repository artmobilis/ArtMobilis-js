angular.module('starter')

.directive('progressBar', function() {
  return {
    restrict: 'E',
    template: '<progress max="100"/>',
    link: function(scope, element, attr) {

      var _progress_bar = element.children()[0];
      var _progress = 0;


      function Update() {
        _progress_bar.value = _progress;
      }

      attr.$observe('value', function(attr_progress) {
        if (attr_progress < 0)
          _progress = 0;
        else if (attr_progress > 100)
          _progress = 100;
        else
          _progress = attr_progress;


        Update();
      });

      Update();

    }
  };
})
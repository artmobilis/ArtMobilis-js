angular.module('artmobilis').controller('ContactController',
  ['$scope',
    'globals',
    function (
      $scope,
      globals
      ) {
        console.log(globals.config);
          console.log(globals.journey);

    }]);
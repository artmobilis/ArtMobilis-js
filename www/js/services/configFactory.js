angular.module('artmobilis').factory('configFactory', function($http, $q) {
  var config = false;
  var deferred = $q.defer();
  if (config !== false) {
    deferred.resolve(config);
  }
  else {
    $http.get('data/config.json')
      .success(function(data, status) {
        config = data;
        deferred.resolve(config);
      })
      .error(function(data, status) {
        deferred.reject('Error loading config file.');
      });
  }
  return deferred.promise;
});

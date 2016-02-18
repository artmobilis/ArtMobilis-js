angular.module('starter')

.service('CoordinatesConverterSvc', function() {
  var _converter = new GeographicCoordinatesConverter();
  _converter.SetOriginFromDegres(43.714253, 7.2890073);

  this.ConvertLocalCoordinates = function(latitude, longitude) {
    var pos = _converter.GetLocalCoordinatesFromDegres(latitude, longitude);
    return pos;
  };
})
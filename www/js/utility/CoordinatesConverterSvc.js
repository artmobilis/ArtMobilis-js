angular.module('utility')

.constant('ORIGIN_COORDINATES', {
  LATITUDE: 43.714253,
  LONGITUDE: 7.2890073
})

.service('CoordinatesConverterSvc', ['ORIGIN_COORDINATES', function(ORIGIN_COORDINATES) {
  var _converter = new AM.GeographicCoordinatesConverter();
  _converter.SetOriginFromDegres(ORIGIN_COORDINATES.LATITUDE, ORIGIN_COORDINATES.LONGITUDE);

  this.ConvertLocalCoordinates = function(latitude, longitude) {
    var pos = _converter.GetLocalCoordinatesFromDegres(latitude, longitude);
    return pos;
  };
}])
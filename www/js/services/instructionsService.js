angular.module('artmobilis').factory('InstructionsService', [ function() {

  var instructionsObj = {};

  instructionsObj.instructions = {
    newLocations : {
      text : 'Pour ajouter une position, restez appuyé sur la carte',
      seen : true
    }
  };

  return instructionsObj;

}]);
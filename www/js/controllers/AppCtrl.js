angular.module('starter')

.controller('AppCtrl', function($state) {
  $state.go('main');
})
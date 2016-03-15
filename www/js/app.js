// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'journey'])

.run(['$ionicPlatform', 'DataManagerSvc', 'LoadingSvc', function($ionicPlatform, DataManagerSvc, LoadingSvc) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

  });
}])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/');

  $stateProvider.state('app', {
    url: '/',
    templateUrl: 'templates/app.html',
    controller: 'AppCtrl'
  })

  .state('main', {
    url: '/mainmenu',
    templateUrl: 'templates/main_menu.html',
    controller: 'MainMenuCtrl'
  })

  .state('tracking', {
    url: '/tracking',
    templateUrl: 'templates/tracking_view.html',
    controller: 'TrackingViewCtrl'
  })

  .state('loading', {
    url: '/loading/:next_state',
    templateUrl: 'templates/loading.html',
    controller: 'LoadingCtrl'
  })

}])
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('artmobilis', ['ionic', 'leaflet-directive', 'ngCordova', 'igTruncate', 'webcam'])

// whitelist for images
  .config(function ($compileProvider) {
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);
  })
  .run(function ($ionicPlatform, configFactory, journeyFactory, globals) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        window.cordova.plugins.Keyboard.disableScroll(true);
      }

      if(window.StatusBar) {
        StatusBar.styleDefault();
      }
      // get config
      configFactory.then(
        function(data){
          globals.config = data;
        },
        function(msg) {
          console.log(msg);
        });
      // get journey
      journeyFactory.then(
        function(data){
          globals.journey = data;
        },
        function(msg) {
          console.log(msg);
        });
    });
  }) 

  .config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

      .state('app', {
        url: "/app",
        abstract: true,
        templateUrl: "templates/menu.html"
      })

      .state('app.carte', {
        url: "/carte",
        views: {
          'menuContent' :{
              templateUrl: "templates/map.html",
              controller: 'MapController'
          }
        }
      })
      .state('app.ar', {
        url: "/ar",
        views: {
          'menuContent' :{
            templateUrl: "templates/ar.html",
            controller: 'ARController'
          }
        }
      })
      .state('app.arimage', {
        url: "/arimage",
        views: {
          'menuContent' :{
            templateUrl: "templates/arimage.html",
            controller: 'ARImageController'
          }
        }
      })
      .state('app.apropos', {
        url: "/apropos",
        views: {
          'menuContent' :{
            templateUrl: "templates/apropos.html",
            controller: 'AProposController'
          }
        }
      })
       .state('app.contact', {
        url: "/contact",
        views: {
          'menuContent' :{
            templateUrl: "templates/contact.html",
            controller: 'ContactController'
          }
        }
      })
      .state('app.accueil', {
          url: '/accueil',
          views: {
              'menuContent': {
                  templateUrl: 'templates/accueil.html'
              }
          }
      })

    $urlRouterProvider.otherwise("/app/carte");
  });
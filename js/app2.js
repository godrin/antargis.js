define([],function() {
  // current app/router for angular
  var app = angular.module("App",['ngRoute','angularSoundManager','cfp.hotkeys']);

  app.config(function($routeProvider) {
    $routeProvider.when('/intro', {
      templateUrl:'intro.html'
    })
    .when('/credits', {
      templateUrl: 'credits.html'
    })
    .when('/campaign/:name', {
      templateUrl: 'game.html',
      controller:'GameController'
    })
    .when('/menu', {
      templateUrl: 'menu.html'
    })
    .otherwise({
      redirectTo: '/intro'
    });
  });

  return app;
});

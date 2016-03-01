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
      templateUrl: 'menu.html',
      controller:'MenuController'
    })
    .otherwise({
      redirectTo: '/intro'
    });
  });

  app.controller('MenuController', function(hotkeys, $scope) {
    $scope.menu = [
      {href:'#/intro', title:'Intro'},
      {href:'#/campaign/tutorial', title:'Tutorial'},
      {href:'#/campaign/first', title:'Campaign'},
      {href:'#/credits', title:'Credits'}
   ]; 

   var hkbind = hotkeys.bindTo($scope);

   _.each($scope.menu, function(entry,index) {
     hkbind.add({
       combo: ''+(index+1),
       description: entry.title,
       callback: function() {
         location.href = entry.href;
       }
     });
   });
  });


  return app;
});

define([],function(r) {
  var app = angular.module("App",['ngRoute','angularSoundManager','cfp.hotkeys']);

  app.config(function($routeProvider) {
    $routeProvider.when('/intro', {
      templateUrl:'intro.html',
      controller: 'IntroController'
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

  app.directive('intro', function() {
    return  { 
      controller:function($element, $scope, hotkeys) {
        $element.addClass('page-intro');
        $scope.screen = 0;

        function finish() {
          location.hash="/menu";
        }

        function incScreen() {
          console.log("INC");
          $scope.screen = $scope.screen + 1;
          if($scope.screen >= $(".screen",$element).length) {
            finish();
          } else {
            $($(".screen",$element)[$scope.screen]).show();
          }
        }

        hotkeys.bindTo($scope)
        .add({
          combo: 'esc',
          description: 'blah blah',
          callback: finish
        })

        $scope.finish = finish;

        $(".screen",$element).hide();
        $($(".screen",$element)[0]).show();
        _.each(['webkitAnimationIteration','animationiteration'],function(evName) {
          $(".screen").on(evName, function() {
            $($(".screen",$element)[$scope.screen]).hide();
            $scope.$apply(incScreen);

          });
        });
      }
    };
  });
  app.controller('IntroController',function($scope) {
  });

  return app;
});

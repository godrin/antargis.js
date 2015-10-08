define(['angular-resource', 'angular-route', 'underscore'],function(r) {
  var app = angular.module("App",['ngRoute']);

  app.config(function($routeProvider) {
    $routeProvider.when('/intro', {
      templateUrl:'intro.html',
      controller: 'IntroController'
    })
    .when('/credits', {
      templateUrl: 'credits.html'
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
      controller:function($element, $scope) {
        $element.addClass('page-intro');
        $scope.screen = 0;
        $(".screen",$element).hide();
        $($(".screen",$element)[0]).show();
        _.each(['webkitAnimationIteration','animationiteration'],function(evName) {
          $(".screen").on(evName, function() {
            $($(".screen",$element)[$scope.screen]).hide();
            $scope.$apply(function() {
              $scope.screen = $scope.screen + 1;
              if($scope.screen >= $(".screen",$element).length) {
                location.hash="/menu";
              } else {
                $($(".screen",$element)[$scope.screen]).show();
              }
            });

          });
        });
      }
    };
  });
  app.controller('IntroController',function($scope) {
  });

  return app;
});

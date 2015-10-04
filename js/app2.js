define(['angular-resource', 'angular-route'],function(r) {
  var app = angular.module("App",['ngRoute']);

  app.config(function($routeProvider) {
    $routeProvider.when('/intro', {
      templateUrl:'intro.html',
      controller: 'IntroController'
    });
  });

  app.directive('intro', function() {
    return  { 
      controller:function($element, $scope) {
        $element.addClass('page-intro');
        $scope.screen = 0;
        $(".screen",$element).hide();
        $($(".screen",$element)[0]).show();
        $(".screen").on("animationiteration",function() {
          $($(".screen",$element)[$scope.screen]).hide();
          $scope.$apply(function() {
            $scope.screen = $scope.screen + 1;
            if($scope.screen >= $(".screen",$element).length) {
              location.hash="xy";
            } else {
              $($(".screen",$element)[$scope.screen]).show();
            }
          });

        });
      }
    };
  });
  app.controller('IntroController',function($scope) {
  });

  return app;
});

define([],function() {
  angular.module('myApp', ['ngResource'])
  .controller('LevelController', ['$scope', '$resource', '$location',
    function ($scope, $resource, $location) {
      $scope.levels = $resource('js/config/level.json').query();
        $scope.curlevel = 'tests/fetch.js';
        $scope.$watch("level",function(x) {
          console.log("XXX",x);
          //        $location.search("level",$scope.level);
        });
    }]);

    angular.element(document).ready(function() {
      angular.bootstrap(document, ['myApp']);
    });
});

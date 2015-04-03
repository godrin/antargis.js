define([],function() {
  function LevelController($scope, $resource, $location) {
    $scope.levels = $resource('js/config/level.json').query();
    $scope.curlevel = 'tests/fetch.js';
    $scope.$watch("level",function(x) {
      console.debug("angular.level level changed",x);
    });
  }
  LevelController.$inject=['$scope', '$resource', '$location'];

  return LevelController;
});

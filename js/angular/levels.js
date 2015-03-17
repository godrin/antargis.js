define([],function() {
  function LevelController($scope, $resource, $location) {
    $scope.levels = $resource('js/config/level.json').query();
    $scope.curlevel = 'tests/fetch.js';
    $scope.$watch("level",function(x) {
      console.log("XXX",x);
    });
  }
  LevelController.$inject=['$scope', '$resource', '$location'];

  return LevelController;
});

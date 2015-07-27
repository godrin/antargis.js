define([],function() {

  function Controller($scope, world) {
    $scope.world = world;

    $scope.togglePause = function() {
      $scope.world.pause = ! $scope.world.pause;
    }
  }

  return Controller;
});



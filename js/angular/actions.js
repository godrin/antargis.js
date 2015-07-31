define([],function() {

  function Controller($scope, world) {
    $scope.world = world;
    $scope.actions = ["dismiss", "recruit"];

    $scope.doAction = function(which) {
      var job;
      job = new Jobs.ml.Move(world.selectedEntity,lastPos);
      world.selectedEntity.pushJob(job);
    }
  }

  return Controller;
});


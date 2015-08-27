define(["jobs"],function(Jobs) {

  function Controller($scope, world) {
    $scope.world = world;
    $scope.actions = ["dismiss", "recruit", "rest"];

    $scope.doAction = function(which) {
    alert("doAction");
      var job;
      job = new Jobs.hl.Rest(world.selectedEntity,10,true);
//      job = new Jobs.ml.Move(world.selectedEntity,lastPos);
          world.selectedEntity.resetJobs();
      world.selectedEntity.pushJob(job);
      return false;
    }
  }

  return Controller;
});


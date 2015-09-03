define(["jobs"], function(Jobs) {

  function Controller($scope, world) {
    $scope.world = world;
    $scope.actions = ["dismiss", "recruit", "rest"];

    $scope.doAction = function(which) {
      var job;
      console.log("doAction", which);
      if (which == "dismiss") {
        job = new Jobs.hl.Dismiss(world.selectedEntity);
      } else if (which == "rest") {
        job = new Jobs.hl.Rest(world.selectedEntity, 10, true);
        //      job = new Jobs.ml.Move(world.selectedEntity,lastPos);
      }
      console.log("JOB",job);
      world.selectedEntity.resetJobs();
      if (job)
        world.selectedEntity.pushHlJob(job);
      return false;
    }
  }

  return Controller;
});

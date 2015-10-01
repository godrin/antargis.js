define(["jobs"], function(Jobs) {

  function Controller($scope, world) {
    $scope.world = world;
    $scope.actions = ["dismiss", "recruit", "rest"];

    $scope.doAction = function(which) {
      var job;
      var hero = $scope.world.getSelectedHero();
      console.log("doAction", which);
      if (which == "dismiss") {
        job = new Jobs.hl.Dismiss(hero);
      } else if (which == "recruit") {
        job = new Jobs.hl.Recruit(hero, world.selectedEntity);
      } else if (which == "rest") {
        job = new Jobs.hl.Rest(hero, 10, true);
        //      job = new Jobs.ml.Move(world.selectedEntity,lastPos);
      }
      console.log("JOB",job);
      hero.resetJobs();
      if (job)
        hero.pushHlJob(job);
      return false;
    }
  }

  return Controller;
});

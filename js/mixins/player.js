define(["jobs"], function(Jobs) {
  return {
    ai:function() {
      console.log("PLAYER.AI");
      this.resetJobs();
      this.pushHlJob(new Jobs.hl.Rest(this,10,true));
    }
  };
});


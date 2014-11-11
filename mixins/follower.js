define([],function() {
  return {
    onNoJob:function() {
      // has no job

      if(this.boss && this.boss.assignMeJob)
        this.boss.assignMeJob(this);
      //console.log("has no job");

      if(this.world.search)
        this.world.search("boss");
    }
  };
});

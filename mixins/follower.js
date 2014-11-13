define([],function() {
  return {
    onNoMlJob:function() {
      // has no job

      if(this.boss && this.boss.assignMeJob)
        this.boss.assignMeJob(this);
      //console.log("has no job");

      if(this.world.search) {
        var f=this.world.search({mixinNames:"boss"},this.pos);
        if(f.length>0)
          this.boss=f[0];
      }
    }
  };
});

define([],function() {
  return {
    onNoMlJob:function() {
      if(!this.boss)
        if(this.world.search) {
          var f=this.world.search({mixinNames:"boss"},this.pos);
          if(f.length>0) {
            this.boss=f[0];
            this.boss.addFollower(this);
          }
        }
        if(this.boss && this.boss.assignMeJob)
          this.boss.assignMeJob(this);

    }
  };
});

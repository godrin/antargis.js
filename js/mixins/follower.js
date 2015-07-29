define([],function() {
  return {
    checkBoss: function() {
      if(!this.boss) {
        if(this.world.search) {
          var f=this.world.search({mixinNames:"boss"},this.pos);
          if(f.length>0) {
            this.boss=f[0];
            this.boss.addFollower(this);
          }
        }
      }
      else if(typeof(this.boss)=="string") {
        if(this.world.search) {
          var f=this.world.search({name:this.boss},this.pos);
          if(f.length>0) {
            this.boss=f[0];
            this.boss.addFollower(this);
          }
        }
      }
    },
    onNoJob:function() {
      this.checkBoss();
      if(this.boss && this.boss.assignMeJob)
        this.boss.assignMeJob(this);
    }
  };
});

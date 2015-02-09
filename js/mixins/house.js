define(["jobs"],function(Jobs) {
  return {
    needed:{
      wood:1,
      stone:1,
      water:1,
      food:1
    },
    resourcesNeeded:function() {
      var self=this;
      var currentlyNeeded=[];
      _.each(this.needed,function(v,k) {
      console.log("NEEDED",v,k,self.resources);
        var times=v-(self.resources[k]||0);
        if(times>0) {
          _.times(times,function() {
            currentlyNeeded.push(k);
          });
        }
      });
      console.log("NEEDED",currentlyNeeded);
      return currentlyNeeded;
    },


    ai:function() {

      var needed=this.resourcesNeeded();

      if(needed.length>0) {
      console.log("JOBS",Jobs);
        this.pushHlJob(new Jobs.hl.Fetch(this));
        return;
      }



      console.log("AI");
      return;
      this.resourcesNeeded();

      console.log("FORM",this.formation);
      var newPos=this.formation.getPos(this,e);

      console.log("ASSIGN ME JOB");
      if(e.pos.distanceTo(newPos)>0.1)
        e.newMlJob("move",newPos);
      else {
        console.log("NEW REST!");
        var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.pos,e.pos));
        e.newMlJob("rest",5, dir);
      }
    },
    addFollower:function(follower) {
      this.followers.push(follower);
    }
  };
});


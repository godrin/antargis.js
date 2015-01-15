define(["mixins/mljobs/fetch.js"],function(MlFetchJob) {
  return {
    needed:{
      wood:5,
      stone:5
    },
    resourcesNeeded:function() {
      var self=this;
      var needed=_.map(this.needed,function(v,k) {
        return v-self.resources[k];
      });
      console.log("NEEDED",needed);
    },

    assignMeJob:function(e) {

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


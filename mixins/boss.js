define(["mixins/formations/rest.js", "angle"],function(RestFormation, Angle) {
  return {
    followers:[],
    formation:new RestFormation(),
    assignMeJob:function(e) {
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

define(["mixins/formations/base.js"],function(RestFormation) {
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
        e.newMlJob("rest",5);
      }
    },
    addFollower:function(follower) {
      this.followers.push(follower);
    }
  };
});

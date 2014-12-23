define(["mixins/formations/rest.js", "angle",
  "mixins/mljobs/rest",
  "mixins/mljobs/move",
  ],function(RestFormation, Angle,
    MlRestJob,
    MlMoveJob
  ) {
    return {
      followers:[],
      formation:new RestFormation(),
      assignMeJob:function(e) {
        console.log("FORM",this.formation);
        var newPos=this.formation.getPos(this,e);

        console.log("ASSIGN ME JOB");
        if(e.pos.distanceTo(newPos)>0.1)
          e.pushJob(new MlMoveJob(e,newPos)); //newMlJob("move",newPos);
        else {
          console.log("NEW REST!");
          var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.pos,e.pos));
          e.pushJob(new MlRestJob(e,5,dir)); //newMlJob("rest",5, dir);
        }
      },
      addFollower:function(follower) {
        this.followers.push(follower);
      }
    };
  });

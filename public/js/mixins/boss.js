define(["mixins/formations/rest.js", "angle",
  "mixins/mljobs/rest",
  "mixins/mljobs/move",
  "mixins/hljobs/rest"
  ],function(RestFormation, Angle,
    MlRestJob,
    MlMoveJob,
    HlRestJob
  ) {
    return {
      followers:[],
      assignMeJob:function(e) {
        if(!this.hljob) {
        console.log("AIIII",this);
          if(this.ai)
            this.ai();
          if(!this.hljob) 
            this.hljob=new HlRestJob(this,10,false);
        }

        if(this.hljob) {
          this.hljob.assignMeJob(e);
        }
      },
      addFollower:function(follower) {
        this.followers.push(follower);
      }
    };
  });

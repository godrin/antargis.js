define(["formations", "angle",
  "jobs",
  ],function(Formations, Angle,
    Jobs
  ) {
    return {
      followers:[],
      pushHlJob:function(job) {
        this.hljob=job;
      },
      clearHlJob:function() {
        delete this.hljob;
      },
      assignMeJob:function(e) {
        if(!this.hljob) {
          console.log("AIIII",this);
          if(this.ai)
            this.ai();
          if(!this.hljob) 
            this.hljob=new Jobs.hl.Rest(this,10,false);
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

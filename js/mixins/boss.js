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
      onNoJob:function() {
        var boss = this;
        if(this.boss)
          boss = this.boss;
        if(boss && boss.assignMeJob)
          boss.assignMeJob(this);
      },
      assignMeJob:function(e) {
        console.log("assignMeJob",e.name,this);
        if(!this.hljob) {
          if(this.ai)  {
            this.ai();
          }
          if(!this.hljob) {
            this.hljob=new Jobs.hl.Rest(this,10,this.isA("hero"));
            console.debug("boss - No hljob created, resting for 10 seconds");
          }
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

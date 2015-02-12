define(["jobs"],function(Jobs) {
  return {
    resourcesNeeded:function() {
      if(!this.needed)
        return [];
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

    },
    addFollower:function(follower) {
      this.followers.push(follower);
    }
  };
});


define(["jobs"],function(Jobs) {
  return {
    // FIXME: maybe move this to other mixin/class - may be used by hero too 
    resourcesNeeded:function() {
      if(!this.needed)
        return [];
      var self=this;
      var currentlyNeeded=[];
      _.each(this.needed,function(v,k) {
        var times=v-(self.resources[k]||0);
        if(times>0) {
          _.times(times,function() {
            currentlyNeeded.push(k);
          });
        }
      });
      return currentlyNeeded;
    },

    ai:function() {
      var needed=this.resourcesNeeded();

      if(needed.length>0) {
        if(Jobs.hl.Invent.applyable(this, needed)) {
          this.pushHlJob(new Jobs.hl.Invent(this));
        } else {
          this.pushHlJob(new Jobs.hl.Fetch(this));
        }
      }

    },
    addFollower:function(follower) {
      this.followers.push(follower);
    }
  };
});


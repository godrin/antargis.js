define(["hl/base", "ml", "ll"], function(Base, ml, ll) {
  var DismissJob = function(entity) {
    Base.apply(this, arguments);
    this.entity = entity;
    this.toDismisscount = Math.floor(entity.followers.length / 3);
  };
  DismissJob.prototype = Object.create(Base.prototype);
  DismissJob.prototype.name = "hlDismiss";

  DismissJob.prototype.assignMeJob = function(e) {
    console.log("DISMISSxxx",this.toDismisscount);
    var self = this;
    // just run once
    if (this.toDismisscount > 0) {

      _.each(this.entity.followers, function(e) {
        if (self.toDismisscount > 0) {
          self.entity.dismiss(e);
          self.toDismisscount--;
        }
      });

      this.toDismisscount = 0;
    }
    this.entity.clearHlJob();
  };
  return DismissJob;
});

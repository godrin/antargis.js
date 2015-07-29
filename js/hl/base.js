define([],function() {
  var Base=function() {
  };
  Base.prototype.commonStart = function() {
    var self=this;
    if(!this.started) {
      this.started=true;
      _.each(this.entity.followers,function(e) {
        self.assignMeJob(e);
      });
      self.assignMeJob(this.entity);

      return true;
    }
  };
  Base.prototype.onFrame=function(delta) {
    if(!this.ready)
      if(!this.commonStart()) {
        console.log("ONFRAME",this.ready);
        this.assignMeJob(this.entity);
      }
  };

  return Base;
});


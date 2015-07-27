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
    var self=this;
    if(this.done) {
      this.ready=true;
    }
    else {
      console.log("FIRST",this.done);
      this.done=true;
      _.each(this.entity.followers,function(e) {
        self.assignMeJob(e);
      });
    }
  };

  return Base;
});


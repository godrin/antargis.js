define([],function() {
  var Job=function(entity, time) {
    this.entity=entity;
    this.time=time;
    this.done=0;
  };

  // maybe implement using setTimeout ?
  Job.prototype.onFrame=function(delta) {
    this.done+=delta;
    if(this.done>this.time) {
      this.ready=true;
      return this.done-this.time;
    }
    return -1;
  };
  return Job;
});


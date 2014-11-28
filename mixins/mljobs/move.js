define([],function() {
  var Job=function(entity, pos) {
    this.entity=entity;
    this.mltargetPos=pos;
  };
  Job.prototype.createLlJob=function() {
    var distance = this.mltargetPos.distanceTo(this.entity.pos);
    if(distance<0.1) {
      this.ready=true;
    } else {
      this.entity.setMesh("walk");
      this.entity.newLlJob("move",this.mltargetPos);
    }
  };

  return Job;
});

define(["ll"],function(ll) {
  var Job=function(entity, pos) {
    this.entity=entity;
    this.mltargetPos=pos;
  };
  Job.prototype.onFrame=function(delta) {
    var distance = this.mltargetPos.distanceTo(this.entity.pos);
    if(distance<0.1) {
      this.ready=true;
    } else {
      this.entity.setMesh("walk");
      console.log("E",this.entity);
      this.entity.pushJob(new ll.Move(this.entity,this.mltargetPos));
    }
    return delta;
  };

  return Job;
});

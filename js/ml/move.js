define(["ll"],function(ll) {
  var Job=function(entity, pos, meshType) {
    this.entity=entity;
    this.mltargetPos=pos;
    if(!meshType)
      meshType = "walk";
    this.meshType = meshType;
  };
  Job.prototype.name="mlMove";
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

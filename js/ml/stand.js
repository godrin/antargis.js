define(["ll"],function(ll) {
  var Job=function(entity, length, direction) {
    this.entity = entity;
    this.length = length;
    this.direction = direction;
    this.done=false;
  };
  Job.prototype.name="mlStand";
  Job.prototype.onFrame=function(delta) {
    if(this.direction && this.entity.rotation!=this.direction) {
      this.entity.rotation=this.direction;
      this.entity.updateMeshPos();
    }

    if(!this.done){
      this.entity.setMesh("stand");
      this.entity.pushJob(new ll.Rest(this.entity,this.length));
      this.done=true
    } else {
      this.ready=true;
    }
    return delta;
  };

  return Job;
});


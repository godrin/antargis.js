define([],function() {
  var Job=function(entity, length, direction) {
    this.entity = entity;
    this.length = length;
    this.direction = direction;
    this.done=false;
  };
  Job.prototype.createLlJob=function() {
    if(this.direction && this.entity.rotation!=this.direction) {
      this.entity.rotation=this.direction;
      this.entity.updateMeshPos();
    }

    if(this.entity.meshName!="sit" && this.entity.meshName!="sitdown") {
      this.entity.playAnimation("sitdown");
    }else if(!this.done){
      this.entity.setMesh("sit");
      this.entity.newLlJob("rest",this.length);
      this.done=true
    } else {
      this.ready=true;
    }
  };

  return Job;
});

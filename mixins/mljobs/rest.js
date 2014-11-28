define([],function() {
  var Job=function(entity,length) {
    this.entity=entity;
    this.length=length;
    this.done=false;
  };
  Job.prototype.createLlJob=function() {
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

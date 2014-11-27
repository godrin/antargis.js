define([],function() {
  var Job=function(entity) {
    this.entity=entity;
  };
  Job.prototype.createLlJob=function() {
    if(this.entity.meshName!="sit" && this.entity.meshName!="sitdown") {
      this.entity.playAnimation("sitdown");
    }else {
      this.entity.setMesh("sit");
      this.entity.newLlJob("rest",10);
    }
  };

  return Job;
});

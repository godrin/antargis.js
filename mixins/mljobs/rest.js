define([],function() {
  var Job=function(entity) {
    this.entity=entity;
  };
  Job.prototype.createLlJob=function() {
    if(this.entity.meshType=="rest")
      this.entity.setMesh("default");
    else
      this.entity.setMesh("rest");
    this.entity.newLlJob("rest",10);

  };

  return Job;
});

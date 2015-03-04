define(["ml"],function(ml) {
  var Job=function(entity) {
    this.entity = entity;
  };

  Job.prototype.assignMeJob=function(e) {
    console.log("invent - ASSIGN FETCH MLJOB",e);
  };

  return Job;

});

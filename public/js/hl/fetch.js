define(["ml"],function(ml) {
  var Job=function(entity) {
    this.entity = entity;
  };

  Job.prototype.assignMeJob=function(e) {
    console.log("ASSIGN FETCH MLJOB",e);
    e.pushJob(new ml.Rest(e,5,0));
  };

  Job.prototype.onFrame=function(delta) {
    console.log("FIXME hljob-fetch-onframe");


  };

  return Job;


});

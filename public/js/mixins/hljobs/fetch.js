define(["mixins/mljobs/fetch"],function(MLFetchJob) {
  var Job=function(entity) {
    this.entity = entity;
  };

  Job.prototype.assignMeJob=function(e) {
    console.log("ASSIGN FETCH MLJOB");
  };

  Job.prototype.onFrame=function(delta) {
    console.log("FIXME hljob-fetch-onframe");


  };

  return Job;


});

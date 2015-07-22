define(["jobs"],function(Jobs) {
  return {
    jobs:[], 
    pushJob:function(job) {
      this.jobs.push(job);
      this.updateCurrentJob();
    },
    resetJobs:function() {
      this.jobs=[];
      this.updateCurrentJob();
    },
    updateCurrentJob:function() {
      this.currentJob = this.jobs[this.jobs.length-1];
    },
    onFrame:function(delta) {
      while(delta>0 && this.jobs.length>0) {
        var job=this.jobs[this.jobs.length-1];
        delta=job.onFrame(delta);
        if(job.ready) {
          this.jobs.pop();
          this.updateCurrentJob();
        }
      }
      if(delta>0) {
        if(this.onNoJob) {
          this.onNoJob(delta);
        }
      }
    } ,
    playAnimation:function(name) {
      this.resetJobs();
      this.pushJob(new Jobs.ll.Rest(this,20));
      this.setMesh(name);
    },
    animationFinished:function() {
      this.resetJobs();
    }
  };
});



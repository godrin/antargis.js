import RestJob from "../ll/rest";

let job = {
  jobs: null,
  pushJob: function (job) {
    if (!this.jobs)
      this.jobs = [];
    if (this.jobs[this.jobs.length - 1] && this.jobs[this.jobs.length - 1].ready) {
      throw "Job is ready - dont' push!";
    }
    this.jobs.push(job);
    this.updateCurrentJob();
    if (this.currentJob.init)
      this.currentJob.init();
  },
  resetNonHlJobs: function () {
    if (this.jobs)
      this.jobs = _.filter(this.jobs, function (job) {
        return job.assignMeJob;
      });
  },
  resetJobs: function () {
    this.jobs = [];
    this.updateCurrentJob();
  },
  updateCurrentJob: function () {
    if (this.jobs)
      this.currentJob = this.jobs[this.jobs.length - 1];
  },
  tick: function (delta) {
    while (this.jobs && delta > 0 && this.jobs.length > 0) {
      var job = this.jobs[this.jobs.length - 1];
      delta = job.onFrame(delta);
      if (job.ready) {
        if (job.assignMeJob) {
          console.log("JOB READY!!!", this.jobs);
        }
        this.jobs.pop();
        this.updateCurrentJob();
      }
    }
    if (delta > 0) {
      if (this.onNoJob) {
        this.onNoJob(delta);
      }
    }
  },
  playAnimation: function (name) {
    //FIXME: set back to 20 (?)
    this.pushJob(new RestJob(this, 2));
    this.setMesh(name);
  },
  animationFinished: function () {
    this.resetJobs();
  }
};

const Job = () => job;

export {Job}



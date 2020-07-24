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
    if (this.getCurrentJob().init)
      this.getCurrentJob().init();
  },
	getCurrentJob: function() {
      return this.jobs[this.jobs.length - 1];
	},
  resetNonHlJobs: function () {
    if (this.jobs)
      this.jobs = _.filter(this.jobs, function (job) {
        return job.assignMeJob;
      });
  },
  resetJobs: function () {
    this.jobs = [];
  },
  tick: function (delta) {
    while (this.jobs && delta > 0 && this.jobs.length > 0) {
      var job = this.getCurrentJob();
      if(!(job.onFrame instanceof Function)) {
        console.error("Job.onFrame is not a function for",job);
        return;
      }
      delta = job.onFrame(delta);
      if (job.ready) {
        console.error("JOB IS READY", job, job.mode, this.jobs, this.jobs.length)
        if (job.assignMeJob) {
          console.log("JOB READY!!!", this.jobs);
        }
        this.jobs.pop();
				console.log("JOBS", this.jobs.map(j=>j.__proto__));
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



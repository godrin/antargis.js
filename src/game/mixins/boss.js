import {HLRestJob} from "../hl/rest";

let boss = {
  postLoad: function () {
    console.log("POSTLOAD");
    if (!this.followers)
      this.followers = [];
    else {
      // FIXME: retrieve objects from ids
    }
  },
  followers: null,
  // deprecated
  pushHlJob: function (job) {
    this.pushJob(job);
  },
  // deprecated
  clearHlJob: function () {
    this.resetJobs();
  },
  onNoJob: function () {
    var boss = this;
    if (this.boss)
      boss = this.boss;
    if (boss && boss.assignMeJob)
      boss.assignMeJob(this);
  },
  getHlJob: function () {
    if (this.jobs)
      for (var i = this.jobs.length - 1; i >= 0; i--) {
        if (this.jobs[i].assignMeJob)
          return this.jobs[i];
      }
  },
  assignMeJob: function (e) {
    var hljob = this.getHlJob();

    if (!hljob) {
      if (this.ai) {
        this.ai();
      }
      // try again
      hljob = this.getHlJob();
      if (!hljob) {
        this.pushHlJob(new HLRestJob(this, 10, this.isA("hero")));
        console.debug("boss - No hljob created, resting for 10 seconds");
      }
    }

    if (hljob) {
      hljob.assignMeJob(e);
    }
  },
  addFollower: function (follower) {
    this.followers.push(follower);
  },
  dismiss: function (follower) {
    this.followers = _.without(this.followers, follower);
    console.log("dismissed", follower, this.followers.length);
    delete follower.boss;
    follower.resetJobs();
  }
}

const Boss = () => boss;

export {Boss}

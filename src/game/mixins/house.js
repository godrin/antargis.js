import {HlInventJob} from '../hl/invent';
import {HlFetchJob} from '../hl/fetch';

let house = {
  // FIXME: maybe move this to other mixin/class - may be used by hero too
  resourcesNeeded: function () {
    if (!this.needed)
      return [];
    var currentlyNeeded = [];
    console.log("NEDDED", this.needed);
    for (var k in this.needed) {
      var v = this.needed[k];
      var times = v - (this.resources[k] || 0);
      if (times > 0) {
        for (var i = 0; i < times; i++) {
          currentlyNeeded.push(k);
        }
      }
    }
    return currentlyNeeded;
  },

  ai: function () {
    var needed = this.resourcesNeeded();

    if (needed.length > 0) {
      if (this.inventApplyable(needed)) {
        this.pushHlJob(this.createInventJob());
      } else {
        this.pushHlJob(this.createFetchJob());
      }
    }
  },
  inventApplyable: function(needed) {
    return HlInventJob.applyable(this, needed);
  },
  createInventJob: function () {
    return new HlInventJob(this);
  },
  createFetchJob: function () {
    return new HlFetchJob(this);
  },
  addFollower: function (follower) {
    this.followers.push(follower);
  }
};

let House = () => house;
export {House}

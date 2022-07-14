import {HLJob} from "./base.js";
import RestJob from "../ll/rest.js";
import {MLRestJob} from "../ml/rest.js";
import {MlFetchJob} from "../ml/fetch.js";

class HlFetchJob extends HLJob {
  constructor(entity, count) {
    super();
    this.entity = entity;
    this.count = count || 3;
  };

  selectResourceToGet() {
    var needed = _.shuffle(this.entity.resourcesNeeded());
    return needed[0];
  }

  nextEntityForResource(selectedResource) {
    var self = this;
    return this.entity.world.search(function (e) {
      return e.resources && e.resources[selectedResource] > 0 && e != self.entity && e.provides && _.includes(e.provides, selectedResource);
    }, this.entity.pos)[0];
  };

  assignMeJob(e) {
    if (!e.isA("follower")) {
      e.pushJob(new RestJob(e, 10));
      return;
    }

    this.count -= 1;
    var selectedResource = this.selectResourceToGet();
    if (selectedResource) {
      var nextEntity = this.nextEntityForResource(selectedResource);
      if (nextEntity) {
        e.pushJob(new MlFetchJob(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
        console.error("fetch - NO nextentity found for ", selectedResource);
      }
    }
    e.pushJob(new MLRestJob(e, 1, 0));
    if (this.count <= 0) {
      this.entity.clearHlJob();
    }
  };
}

export {HlFetchJob}

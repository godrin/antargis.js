import {HLJob} from "./base";
import RestJob from "../ll/rest";
import {MLRestJob} from "../ml/rest";

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
      console.debug("fetch - HAS RESOURCE", selectedResource, e, e.resources && e.resources[selectedResource] > 0, e.provides, e.resources);
      return e.resources && e.resources[selectedResource] > 0 && e != self.entity && e.provides && _.contains(e.provides, selectedResource);
    }, this.entity.pos)[0];
  };

  assignMeJob(e) {
    if (!e.isA("follower")) {
      e.pushJob(new RestJob(e, 10));
      return;
    }

    this.count -= 1;
    console.debug("fetch - ASSIGN FETCH MLJOB", e);
    var selectedResource = this.selectResourceToGet();
    if (selectedResource) {
      var nextEntity = this.nextEntityForResource(selectedResource);
      if (nextEntity) {
        e.pushJob(new ml.Fetch(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
        console.debug("fetch - NO nextentity found");
      }
    }
    e.pushJob(new MLRestJob(e, 1, 0));
    if (this.count <= 0) {
      this.entity.clearHlJob();
    }
  };
}

export {HlFetchJob}
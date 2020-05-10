import {MlInvent} from "../ml/invent";

class HlInventJob {
  constructor(entity) {
    this.entity = entity;
    this.producable = HlInventJob.applyable;
  }

  static applyable(e, needed) {
    let producable = _.filter(needed, function (resource) {
      if (e.production) {
        var ok = true;
        var prereq = e.production[resource];
        if (!prereq) {
          return false;
        }
        _.each(prereq, function (amount, res) {

          if (!e.resources[res] || e.resources[res] < amount) {
            ok = false;
          }
        });
        if (ok)
          return true;
      }
    });
    if (producable.length > 0) {
      return _.sample(producable);
    }
    return false;
  }

  assignMeJob(e) {
    console.log("assign me job ",e, this)
    var res = this.producable(this.entity, this.entity.resourcesNeeded());
    if (res) {
      e.pushJob(new MlInvent(e, res, this.entity));
    } else {
      this.entity.clearHlJob();
    }
  }
}

export { HlInventJob }

import {HLJob} from './base'
import { Formations} from "../formations";
import {MLRestJob} from "../ml/rest";

class HLRestJob extends HLJob {
  constructor(entity, length, formatted) {
    super();
    this.entity = entity;
    this.length = length;
    this.done = false;
    if (formatted) {
      this.formation = new Formations.Rest();
    } else {
      this.formation = new Formations.Null();
    }
  }

  assignMeJob(e) {
    if (!this.commonStart()) {
      e.resetNonHlJobs();
      var newPos = this.formation.getPos(this.entity, e);
      if (e.pos.distanceTo(newPos) > 0.1) {
        e.pushJob(new MlMoveJob(e, newPos));
      } else {
        var dir = this.formation.getDir(this.entity, e);
        e.pushJob(new MLRestJob(e, 5, dir));
      }
    }
  }
}

export {HLRestJob}

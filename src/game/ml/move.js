import {Move} from '../ll/move.js'

class MlMove {
  constructor(entity, pos, meshType) {
    this.entity = entity;
    this.mltargetPos = pos;
    if (!meshType) {
      meshType = "walk";
    }
    this.meshType = meshType;
  }

  onFrame(delta) {
    var distance = this.mltargetPos.distanceTo(this.entity.pos);
    if (distance < 0.1) {
      this.ready = true;
    } else {
      this.entity.setMesh("walk");
      this.entity.pushJob(new Move(this.entity, this.mltargetPos));
    }
    return delta;
  }

}

export {MlMove}

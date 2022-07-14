import {Move} from "../ll/move.js";
import RestJob from "../ll/rest.js";

class MlFetchJob {
   constructor(entity, resource, targetEntity, homeEntity) {
      this.entity = entity;
      this.homeEntity = homeEntity;
      this.resource = resource;
      this.amount = 1;
      this.targetEntity = targetEntity;
      this.mltargetPos = this.targetEntity.pos;
      console.debug("fromPos",entity.pos);
      this.fromPos = new THREE.Vector2().copy(entity.pos);
      console.debug("fromPos",entity.pos,this.fromPos);
      this.mode="gotoTarget";
      this.collectDistance=1;
    }

    gotoTarget() {
      var distance = this.mltargetPos.distanceTo(this.entity.pos);
      if(distance<=this.collectDistance+0.1) {
        this.mode="collectThings";
        return false;
      } else {
        this.entity.setMesh("walk");
        this.entity.pushJob(new Move(this.entity,this.mltargetPos,this.collectDistance));
        return true;
      }
    }

    collectThings() {
      // FIXME: select pick or axe or nothing depending on resource
      this.entity.setMesh("axe");
      this.entity.pushJob(new RestJob(this.entity,3)); //newLlJob("rest",3);
      this.mode="goBack";
      return true;
    }

    take() {
      this.targetEntity.give(this.resource,this.amount,this.entity);
    }

    goBack() {
      this.take();
      //FIXME: pick correct mesh
      this.entity.setMesh("walk");
      //this.entity.newLlJob("move",this.fromPos);
      this.entity.pushJob(new Move(this.entity,this.homeEntity.pos));
      this.mode="give";
      return true;
    }

    give() {
      this.ready=true;
      if(this.homeEntity)
        this.entity.give(this.resource,this.amount,this.homeEntity);
    }

    onFrame(delta) {
      var done=false;
      do {
      if(!this[this.mode])
      console.debug("MODE ",this.mode, "not found");
        done=this[this.mode]();
      } while(!done && !this.ready);
      return delta;
    }
  }

  export { MlFetchJob}


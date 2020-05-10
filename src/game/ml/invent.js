import RestJob from "../ll/rest";
import {MlMove} from "./move";
import {StateMachine} from "./state-machine";

class MlInvent extends StateMachine {
  constructor(entity, resource, homeEntity) {
    super("comeHome")
    console.debug("invent - ml ", arguments);
    this.entity = entity;
    this.homeEntity = homeEntity;
    this.resource = resource;
  }

  comeHome() {
    this.entity.pushJob(this.createMoveJob());
    this.mode = "produce";
    return true;
  }

  produce() {
    var self = this;
    var rule = this.homeEntity.production[this.resource];
    var ok = true;
    _.each(rule, function (amount, sourceResource) {
      if (!self.homeEntity.take(sourceResource, amount))
        ok = false;
    });
    if (ok) {
      this.entity.pushJob(this.createRestJob());
      if (this.homeEntity.incSmoke) {
        this.homeEntity.incSmoke();
      }
      this.mode = "productionFinished";
      return true;
    } else {
      // source resources got lost :-(
      this.setFinished()
    }
  }

  productionFinished() {
    console.debug("invent - productionFinished", this.resource, 1);
    if (this.homeEntity.decSmoke) {
      this.homeEntity.decSmoke();
    }
    this.homeEntity.increaseBy(this.resource, 1);
    this.ready = true;
  }

  createRestJob() {
    return new RestJob(this.entity, 3);
  }

  createMoveJob() {
    return new MlMove(this.entity, this.homeEntity.pos);
  }
}

export { MlInvent};

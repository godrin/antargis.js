import RestJob from "../ll/rest";

class MlMove {
  constructor(entity, resource, homeEntity) {
    console.debug("invent - ml ", arguments);
    this.entity = entity;
    this.homeEntity = homeEntity;
    this.resource = resource;
    this.mode = "comeHome";
  }

  comeHome() {
    console.debug("invent - HOME COME", this.entity);
    this.entity.pushJob(new MlMove(this.entity, this.homeEntity.pos));
    this.mode = "produce";
    return true;
  }

  produce() {
    var self = this;
    console.debug("invent - PRODUCE", this.entity);
    var rule = this.homeEntity.production[this.resource];
    var ok = true;
    _.each(rule, function (amount, sourceResource) {
      if (!self.homeEntity.take(sourceResource, amount))
        ok = false;
    });
    console.debug("invent - ok", ok);
    if (ok) {
      this.entity.pushJob(new RestJob(this.entity, 3));
      if (this.homeEntity.incSmoke)
        this.homeEntity.incSmoke();
      this.mode = "productionFinished";
      return true;
    } else {
      // source resources got lost :-(
      this.ready = true;
    }
  }

  productionFinished() {
    console.debug("invent - productionFinished", this.resource, 1);
    if (this.homeEntity.decSmoke)
      this.homeEntity.decSmoke();
    this.homeEntity.increaseBy(this.resource, 1);
    this.ready = true;
  }

  onFrame(delta) {
    var done = false;
    do {
      if (!this[this.mode])
        console.debug("MODE ", this.mode, "not found");
      done = this[this.mode]();
    } while (!done && !this.ready);
    return delta;
  }
}

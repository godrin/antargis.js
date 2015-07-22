define(["ll","ml/move"
  ],function(ll,MlMove) {
    var Job=function(entity, resource, homeEntity) {
      console.debug("invent - ml ",arguments);
      this.entity = entity;
      this.homeEntity = homeEntity;
      this.resource = resource;
      this.mode="comeHome";
    };
    Job.prototype.name="mlInvent";
    Job.prototype.comeHome=function() {
      console.debug("invent - HOME COME", this.entity);
      this.entity.pushJob(new MlMove(this.entity, this.homeEntity.pos));
      this.mode="produce";
      return true;
    };
    Job.prototype.produce=function() {
      var self=this;
      console.debug("invent - PRODUCE", this.entity);
      var rule = this.homeEntity.production[this.resource];
      var ok = true;
      _.each(rule,function(amount, sourceResource) {
        if(!self.homeEntity.take(sourceResource, amount)) 
          ok=false;
      });
      console.debug("invent - ok",ok);
      if(ok) {
        this.entity.pushJob(new ll.Rest(this.entity, 3));
        if(this.homeEntity.incSmoke)
          this.homeEntity.incSmoke();
        this.mode = "productionFinished";
        return true;
      } else {
        // source resources got lost :-(
          this.ready = true;
      }
    };
    Job.prototype.productionFinished=function() {
      console.debug("invent - productionFinished", this.resource, 1);
      if(this.homeEntity.decSmoke)
        this.homeEntity.decSmoke();
      this.homeEntity.increaseBy(this.resource, 1);
      this.ready = true;
    };

    Job.prototype.onFrame=function(delta) {
      var done=false;
      do {
        if(!this[this.mode])
          console.debug("MODE ",this.mode, "not found");
        done=this[this.mode]();
      } while(!done && !this.ready);
      return delta;
    };


    return Job;
  });

define(["mixins/lljobs/rest",
  "mixins/lljobs/move"
  ],function(LlRestJob,LlMoveJob) {
    var Job=function(entity, resource, targetEntity) {
      this.entity = entity;
      this.resource = resource;
      this.amount = 1;
      this.targetEntity = targetEntity;
      this.fromPos = entity.pos;
      this.mode="gotoTarget";
    };
    Job.prototype.gotoTarget=function() {
      var distance = this.mltargetPos.distanceTo(this.entity.pos);
      if(distance<0.1) {
        this.mode="collectThings";
        return false;
      } else {
        this.entity.setMesh("walk");
        this.entity.pushJob(new LlMoveJob(this.entity,this.mltargetPos,0.5));
        return true;
      }
    };
    Job.prototype.collectThings=function() {
      // FIXME: select pick or axe or nothing depending on resource
      this.entity.setMesh("pick");
      this.entity.pushJob(new LlRestJob(this.entity,3)); //newLlJob("rest",3);
      this.mode="goback";
      return true;
    };

    Job.prototype.take=function() {
      this.targetEntity.give(this.resource,this.amount,this.entity);
    };

    Job.prototype.goBack=function() {
      this.take();
      //FIXME: pick correct mesh
      this.entity.setMesh("walk");
      //this.entity.newLlJob("move",this.fromPos);
      this.entity.pushJob(new LlMoveJob(this.entity,this.fromPos));
      this.mode="give";
      return true;
    };

    Job.prototype.give=function() {
      this.ready=true;
      if(this.entity.boss)
        this.entity.give(this.resource,this.amount,this.entity.boss);
    };

    Job.prototype.onFrame=function(delta) {
      var done=false;
      do {
        done=this[this.mode]();
      } while(!done && !this.ready);
      return delta;
    };


    return Job;
  });


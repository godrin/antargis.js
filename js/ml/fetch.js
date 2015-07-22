define(["ll"
  ],function(ll) {
    var Job=function(entity, resource, targetEntity, homeEntity) {
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
    };
    Job.prototype.name="mlFetch";
    Job.prototype.gotoTarget=function() {
      var distance = this.mltargetPos.distanceTo(this.entity.pos);
      if(distance<=this.collectDistance+0.1) {
        this.mode="collectThings";
        return false;
      } else {
        this.entity.setMesh("walk");
        this.entity.pushJob(new ll.Move(this.entity,this.mltargetPos,this.collectDistance));
        return true;
      }
    };
    Job.prototype.collectThings=function() {
      // FIXME: select pick or axe or nothing depending on resource
      this.entity.setMesh("axe");
      this.entity.pushJob(new ll.Rest(this.entity,3)); //newLlJob("rest",3);
      this.mode="goBack";
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
      this.entity.pushJob(new ll.Move(this.entity,this.homeEntity.pos));
      this.mode="give";
      return true;
    };

    Job.prototype.give=function() {
      this.ready=true;
      if(this.homeEntity)
        this.entity.give(this.resource,this.amount,this.homeEntity);
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


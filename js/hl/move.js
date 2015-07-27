define(["formations",
  "angle",
  "ml"
  ],function(Formations, 
    Angle,
    ml
  ) {
    var Job=function(entity, pos, dist) {
      if(!dist)
        dist=0;
      this.entity = entity;
      this.pos = pos;
      this.dist = dist;
      this.state = "format";
      this.formation=new Formations.Move();
      this.waiting = [];
    };
    Job.prototype.name = "hlMove";
    Job.prototype.assignMeJob=function(e) {
      switch(this.state) {
        case "format":
          return this.moveToOrWait(e, this.formation.getPos(this.entity,e));
      }
    };
    Job.prototype.moveToOrWait = function(e, newPos) {
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new ml.Move(e,newPos));
      else {
        var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.entity.pos,e.pos));
        e.pushJob(new ml.Rest(e,5,dir));
        if(!_.has(this.waiting,e)) {
          this.waiting.push(e);
        }
      }
    };
    Job.prototype.onFrame=function(delta) {
      var self=this;
      if(this.done)
        this.ready=true;
      else {
        this.done=true;
        _.each(this.entity.followers,function(e) {
          self.assignMeJob(e);
        });
        this.entity.pushJob(new ml.Rest(e,5,dir));
      }
      if(this.waiting.length>50)
        this.ready=true;
    };
    return Job;
  });


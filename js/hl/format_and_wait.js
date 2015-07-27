define(["formations",
  "angle",
  "ml"
  ],function(Formations, 
    Angle,
    ml
  ) {
    var Job=function(entity, dir, pos, dist) {
      if(!dist)
        dist=0;
      this.entity = entity;
      this.dir = dir;
      this.pos = pos;
      this.dist = dist;
      this.state = "format";
      this.formation=new Formations.Move();
      this.waiting = [];
    };
    Job.prototype.name = "hlFormatAndWait";
    Job.prototype.assignMeJob=function(e) {
      switch(this.state) {
        case "format":
          return this.moveToOrWait(e, this.formation.getPos(this.entity,e));
      }
    };
    Job.prototype.moveToOrWait = function(e, newPos, dir) {
      e.resetNonHlJobs();
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new ml.Move(e,newPos));
      else {
        var dir=this.formation.getDir(this.entity,e);
        e.pushJob(new ml.Stand(e,5,dir));
        if(!_.has(this.waiting,e)) {
          this.waiting.push(e);
        }
      }
      this.checkReadyFormat();
    };
    Job.prototype.checkReadyFormat = function() {
      if(this.waiting.length==this.entity.followers.length+1) {
      console.log("READY",this.waiting.length,this.entity.followers.length);
        this.ready=true;
        }
    };
    Job.prototype.onFrame=function(delta) {
      var self=this;
      if(this.done) {
      //  this.ready=true;
      } else {
        this.done=true;
        _.each(this.entity.followers,function(e) {
          self.assignMeJob(e);
        });
        this.assignMeJob(this.entity);
      }
    };
    return Job;
  });



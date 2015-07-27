define(["formations",
  "angle",
  "ml",
  "hl/base"
  ],function(Formations, 
    Angle,
    ml,Base
  ) {
    var Job=function(entity, dir, pos, dist) {
      Base.apply(this, arguments);
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
    Job.prototype=Object.create(Base.prototype);
    Job.prototype.name = "hlFormatAndWait";
    Job.prototype.assignMeJob=function(e) {
      if(!this.commonStart()) {
        switch(this.state) {
          case "format":
            return this.moveToOrWait(e, this.formation.getPos(this.entity,e));
        }
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
    return Job;
  });



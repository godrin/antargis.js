define(["formations",
  "angle",
  "ml",
  "hl/base"
  ],function(Formations, 
    Angle,
    ml,Base
  ) {
    var Job=function(entity, dir) {
      Base.apply(this, arguments);
      this.entity = entity;
      this.dir = dir;
      this.formation=new Formations.Move(dir);
      this.waiting = [];
      console.log("NEW");
    };
    Job.prototype=Object.create(Base.prototype);
    Job.prototype.name = "hlFormatAndWait";
    Job.prototype.assignMeJob=function(e) {
      if(!this.commonStart()) {
        return this.moveToOrWait(e, this.formation.getPos(this.entity,e));
      }
    };
    Job.prototype.moveToOrWait = function(e, newPos) {
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
      if(this.waiting.length>=this.entity.followers.length+1) {
        console.log("READY",this.waiting.length,this.entity.followers.length);
//        alert("READY");
        this.ready=true;
      }
    };
    return Job;
  });



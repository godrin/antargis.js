define(["formations",
  "angle",
  "ml",
  "hl/base"
  ],function(Formations, 
    Angle,
    ml,Base
  ) {
    var Job=function(entity, length, formatted) {
      Base.apply(this,arguments);
      this.entity = entity;
      this.length = length;
      this.done=false;
      if(formatted)
        this.formation=new Formations.Rest();
      else
        this.formation=new Formations.Null();
    };
    Job.prototype=Object.create(Base.prototype);
    Job.prototype.name = "hlRest";
    Job.prototype.assignMeJob=function(e) {
      if(!this.commonStart()) {
        e.resetNonHlJobs();
        var newPos=this.formation.getPos(this.entity,e);
        if(e.pos.distanceTo(newPos)>0.1)
          e.pushJob(new ml.Move(e,newPos));
        else {
          var dir=this.formation.getDir(this.entity,e);
          e.pushJob(new ml.Rest(e,5,dir));
        }
      }
    };
    return Job;
  });

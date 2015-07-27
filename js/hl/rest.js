define(["formations",
  "angle",
  "ml"
  ],function(Formations, 
    Angle,
    ml
  ) {
    var Job=function(entity, length, formatted) {
      this.entity = entity;
      this.length = length;
      this.done=false;
      if(formatted)
        this.formation=new Formations.Rest();
      else
        this.formation=new Formations.Null();
    };
    Job.prototype.name = "hlRest";
    Job.prototype.assignMeJob=function(e) {
      e.resetNonHlJobs();
      var newPos=this.formation.getPos(this.entity,e);
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new ml.Move(e,newPos));
      else {
        var dir=this.formation.getDir(this.entity,e);
        e.pushJob(new ml.Rest(e,5,dir));
      }
    };
    Job.prototype.onFrame=function(delta) {
      var self=this;
      if(this.done) {
        this.ready=true;
      }
      else {
        console.log("FIRST",this.done);
        this.done=true;
        _.each(this.entity.followers,function(e) {
          self.assignMeJob(e);
        });
      }
    };
    return Job;
  });

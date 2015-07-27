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
      this.formation=new Formations.Move();
    };
    Job.prototype.name = "hlRest";
    Job.prototype.assignMeJob=function(e) {
      var newPos=this.formation.getPos(this.entity,e);
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new ml.Move(e,newPos));
      else {
        var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.entity.pos,e.pos));
        e.pushJob(new ml.Rest(e,5,dir));
      }
    };
    Job.prototype.onFrame=function(delta) {
      var self=this;
      if(this.done)
        this.ready=true;
      else {
      alert("FIRST");
        this.done=true;
        _.each(this.entity.followers,function(e) {
          self.assignMeJob(e);
        });
        //FIXME: Wofür ???
        this.entity.pushJob(new ml.Rest(this.entity,5,dir));
      }
    };
    return Job;
  });

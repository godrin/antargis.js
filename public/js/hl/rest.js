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
      console.log("SITPOS",formatted);
      if(formatted)
        this.formation=new Formations.Rest();
      else
        this.formation=new Formations.Null();
    };
    Job.prototype.assignMeJob=function(e) {
      var newPos=this.formation.getPos(this.entity,e);
      console.log("SITPOS",newPos,this.entity.pos);
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new ml.Move(e,newPos));
      else {
        console.log("NEW REST!");
        var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.entity.pos,e.pos));
        e.pushJob(new ml.Rest(e,5,dir)); //newMlJob("rest",5, dir);
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
    };
    return Job;
  });

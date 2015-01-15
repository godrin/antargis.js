define(["mixins/formations/rest.js",
  "mixins/formations/null.js",
  "angle",
  "mixins/mljobs/rest",
  "mixins/mljobs/move",
  ],function(RestFormation, 
    NullFormation,
    Angle,
    MlRestJob,
    MlMoveJob
  ) {
    var Job=function(entity, length, formatted) {
      this.entity = entity;
      this.length = length;
      this.done=false;
      console.log("SITPOS",formatted);
      if(formatted)
        this.formation=new RestFormation();
      else
        this.formation=new NullFormation();
    };
    Job.prototype.assignMeJob=function(e) {
      var newPos=this.formation.getPos(this.entity,e);
      console.log("SITPOS",newPos,this.entity.pos);
      if(e.pos.distanceTo(newPos)>0.1)
        e.pushJob(new MlMoveJob(e,newPos));
      else {
        console.log("NEW REST!");
        var dir=Angle.fromVector2(new THREE.Vector2().subVectors(this.entity.pos,e.pos));
        e.pushJob(new MlRestJob(e,5,dir)); //newMlJob("rest",5, dir);
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
        this.entity.pushJob(new MlRestJob(e,5,dir));
      }
    };
    return Job;
  });

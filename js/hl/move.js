define(["formations",
  "angle",
  "ml",
  "hl/format_and_wait",
  "hl/base"
  ],function(Formations, 
    Angle,
    ml,
    FormatAndWait,
    Base
  ) {
    var Job=function(entity, pos, dist) {
      Base.apply(this, arguments);
      if(!dist)
        dist=0;
      this.entity = entity;
      this.pos = pos;

      this.dir = Angle.fromVector2(new THREE.Vector2().subVectors(pos, this.entity.pos));
      this.dist = dist;
      this.formation=new Formations.Move(this.dir);
      this.waiting = [];
    };
    Job.prototype=Object.create(Base.prototype);
    Job.prototype.name = "hlMove";
    Job.prototype.init=function() {
      this.entity.pushJob(new FormatAndWait(this.entity, this.dir)); 
    };
    Job.prototype.assignMeJob=function(e) {
      if(!this.commonStart()) {
        var targetPos = this.formation.getPos(this.entity, e, this.pos);
        var curDist = targetPos.distanceTo(e.pos);
        if(Math.abs(curDist-this.dist)<0.03)
          this.ready=true;
        else {
          e.pushJob(new ml.Move(e, targetPos));
        }
      }
    };
    return Job;
  });


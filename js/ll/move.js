define(["angle"],function(Angle) {

  var tmpDir = new THREE.Vector2();

  var Job=function(entity, pos, distance) {
    this.entity=entity;
    this.speed=entity.speed||1;
    this.lltargetPos=pos;
    this.distance=distance||0;
    console.log("JOB SPEED",this.speed);

  };
  Job.prototype.name = "llMove";

  Job.prototype.onFrame=function(delta) {
    var e=this.entity;
    if(this.lltargetPos) {

      var distance = this.lltargetPos.distanceTo(e.pos);
      var togo=delta*this.speed;

      distance-=this.distance;

      if(distance<togo) {
        if(this.distance>0)
          e.pos=new THREE.Vector2().copy(this.lltargetPos).add(new THREE.Vector2().subVectors(this.lltargetPos,e.pos).setLength(-this.distance));
        else
          e.pos=new THREE.Vector2().copy(this.lltargetPos);
        delete this.lltargetPos;
        this.ready=true;
        // return rest time
        return (togo-distance)/this.speed;
      } else {
        tmpDir.subVectors(this.lltargetPos,e.pos).setLength(togo);
        e.pos.add(tmpDir);
        e.rotation=Angle.fromVector2(tmpDir);
      }

      e.updateMeshPos();
    } else {
      console.log("ERROR: no lltargetpos defined");

    }
    return -1;
  };
  return Job;
});

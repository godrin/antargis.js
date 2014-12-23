define(["angle"],function(Angle) {
 
  var Job=function(entity, pos, distance) {
    this.entity=entity;
    this.speed=entity.speed||3;
    this.lltargetPos=pos;
    this.distance=distance||0;
  };

  Job.prototype.onFrame=function(delta) {
    var e=this.entity;
    if(this.lltargetPos) {

      var distance = this.lltargetPos.distanceTo(e.pos);
      var togo=delta*this.speed;

      distance-=this.distance;

      if(distance<togo) {
        e.pos=this.lltargetPos;
        delete this.lltargetPos;
        this.ready=true;
        // return rest time
        return (togo-distance)/this.speed;
      } else {
        var dir=new THREE.Vector2().subVectors(this.lltargetPos,e.pos).setLength(togo);
        e.pos.add(dir);
        e.rotation=Angle.fromVector2(dir);
      }

      e.updateMeshPos();
    } else {

    }
    return 0;
  };
  return Job;
});

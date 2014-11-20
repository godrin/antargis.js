define([],function() {
  var Job=function(entity, pos) {
    this.entity=entity;
    this.speed=entity.speed||3;
    this.lltargetPos=pos;
  };

  Job.prototype.onFrame=function(delta) {
    var e=this.entity;
    if(this.lltargetPos) {

      var distance = this.lltargetPos.distanceTo(e.pos);
      var togo=delta*this.speed;

      if(distance<togo) {
        e.pos=this.lltargetPos;
        delete this.lltargetPos;
        this.ready=true;
        // return rest time
        return (togo-distance)/this.speed;
      } else {
        var dir=new THREE.Vector2().subVectors(this.lltargetPos,e.pos).setLength(togo);
        e.pos.add(dir);
        e.mesh.rotation.z=-Math.atan2(dir.x,dir.y)+Math.PI;
      }

      e.updateMeshPos();
    } else {

    }
    return 0;
  };
  return Job;
});

define([],function() {
  var Job=function(entity, pos) {
    this.entity=entity;
    this.speed=entity.speed||3;
    this.targetPos=pos;
  };

  Job.prototype.onFrame=function(delta) {
    var e=this.entity;
    if(this.targetPos) {

      var distance = this.targetPos.distanceTo(e.pos);
      var togo=delta*this.speed;

      if(distance<togo) {
        e.pos=this.targetPos;
        delete this.targetPos;
        this.ready=true;
        // return rest time
        return (togo-distance)/this.speed;
      } else {
        var dir=new THREE.Vector2().subVectors(this.targetPos,e.pos).setLength(togo);
        e.pos.add(dir);
        e.mesh.rotation.z=-Math.atan2(dir.x,dir.y)+Math.PI;
      }

      e.mesh.position.x = e.pos.x;
      e.mesh.position.y = e.pos.y;
      e.mesh.position.z = e.map.get("rock").interpolate(e.pos.x,e.pos.y);
    } else {

    }
    return 0;
  };
  return Job;
});

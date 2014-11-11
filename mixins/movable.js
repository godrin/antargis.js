define([],function() {

  return {
    speed:3,
    onFrame:function(delta) {
      if(this.targetPos) {

        var distance = this.targetPos.distanceTo(this.pos);
        var togo=delta*this.speed;

        if(distance<togo) {
          this.pos=this.targetPos;
          delete this.targetPos;
        } else {
          var dir=new THREE.Vector2().subVectors(this.targetPos,this.pos).setLength(togo);
          this.pos.add(dir);
          this.mesh.rotation.z=-Math.atan2(dir.x,dir.y)+Math.PI;
        }

        this.mesh.position.x = this.pos.x;
        this.mesh.position.y = this.pos.y;
        this.mesh.position.z = this.map.get("rock").interpolate(this.pos.x,this.pos.y);
      } else {
      
      }
    },
    moveTo:function(pos) {
      this.targetPos=pos;
    }
  };

});

define([],function() {

  var self={};

  self.init=function(entity) {

    if(!entity.speed)
      entity.speed=1;

    entity.onFrame=function(delta) {
      if(this.targetPos) {

        var distance = this.targetPos.distanceTo(this.pos);
        var togo=delta*this.speed;

        if(distance<togo) {
          this.pos=this.targetPos;
          delete this.targetPos;
        } else {
          var dir=new THREE.Vector2().subVectors(this.targetPos,this.pos).setLength(togo);
          this.pos.add(dir);
        }

        this.mesh.position.x = this.pos.x;
        this.mesh.position.y = this.pos.y;
      }
    };
    entity.moveTo=function(pos) {
      this.targetPos=pos;
      console.log("MOVE TO",pos,this);

    };
  };

  return self;
});

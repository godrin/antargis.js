define([],function() {
  return {
    onNoLlJob:function(delta) {
      if(Math.random()<0.5) {
        this.setMesh("walk");
        this.newLlJob("move",new THREE.Vector2(Math.random()*2-1,Math.random()*2-1).add(this.pos));
      } else {
        this.playAnimation("eat");
      }
    }
  };
});


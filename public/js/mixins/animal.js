define(["mixins/lljobs/move","mixins/lljobs/rest"],function(LlMoveJob,LlRestJob) {
  return {
    onNoJob:function(delta) {

      if(Math.random()<0.5) {
        this.setMesh("walk");
        var targetPos=new THREE.Vector2(Math.random()*2-1,Math.random()*2-1).add(this.pos);
        this.pushJob(new LlMoveJob(this,targetPos));
      } else {
        this.playAnimation("eat");
      }
    }
  };
});


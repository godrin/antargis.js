define(["base"],function(Base) {
  var Model=function(innerMeshes,outerNode, scene) {
    this.innerMeshes = innerMeshes;
    this.outerNode = outerNode;
    this.scene = scene;
    this.position=this.outerNode.position;
    this.rotation=this.outerNode.rotation;
  };

  Model.prototype.setEntity=function(entity) {
    _.each(this.innerMeshes,function(m) {
      m.userData.entity=entity;
    });
  };

  Model.prototype.detachFromScene=function() {
  };

  Model.prototype.setPos=function(x,y,z) {
    this.outerNode.position.x = x;
    this.outerNode.position.y = y;
    this.outerNode.position.z = z;
  };

  Model.prototype.enableParticles = function(type) {
    this.scene.particleGroup.addEmitter( Base.makeEmitter(new THREE.Vector3(0,0,0)));
  };

  Model.prototype.disableParticles = function(type) {
    console.log("DISABLE",type);
    this.scene.particleGroup.removeEmitter( this.emitter );
    delete this.emitter;

  };

  Model.prototype.remove=function() {
    // hook to remove animation-restarter-interval
    if(this.innerMeshes && this.innerMeshes.length>0) {
      _.each(this.innerMeshes,function(m) {
        if(m.beforeRemove)
          m.beforeRemove();
      });
    }
    this.scene.remove(this.outerNode);
    delete this.outerNode;
  };

  return Model;
});

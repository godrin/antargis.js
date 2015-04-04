define(["base"],function(Base) {
  var Model=function(innerMeshes,outerNode, scene, hoverRing, selectRing) {
    this.innerMeshes = innerMeshes;
    this.outerNode = outerNode;
    this.scene = scene;
    this.position=this.outerNode.position;
    this.rotation=this.outerNode.rotation;
    this.hoverRing = hoverRing;
    this.selectRing = selectRing;
  };

  Model.prototype.setEntity=function(entity) {
    _.each(this.innerMeshes,function(m) {
      m.userData.entity=entity;
    });
  };
    
  Model.prototype.hovered = function(val) {
    if(val === true || val === false) {
      this.hoverRing.visible = val;
    }
    return this.hoverRing.visible;
  };

  Model.prototype.selected= function(val) {
    if(val === true || val === false) {
      this.selectRing.visible = val;
    }
    return this.selectRing.visible;
  };

  Model.prototype.detachFromScene=function() {
  };

  Model.prototype.setPos=function(x,y,z) {
    this.outerNode.position.x = x;
    this.outerNode.position.y = y;
    this.outerNode.position.z = z;
  };

  Model.prototype.enableParticles = function(type) {
    if(!this.emitter) {
      console.log("model - ENABLE");
      var emitter = this.emitter = this.scene.particleGroup.getFromPool(); //addEmitter( Base.makeEmitter(new THREE.Vector3(0,0,0)));
//      emitter.position.copy(this.position);
      emitter.enable();
    }
  };

  Model.prototype.disableParticles = function(type) {
    if(this.emitter) {
      this.emitter.disable();
      console.log("model - DISABLE",type);
      delete this.emitter;
    }
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

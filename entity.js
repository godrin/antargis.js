define(["models", "config/entities", "mixins"],function(Models, Entities, Mixins) {

  var uid=11110;

  var Entity=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    _.extend(this,entity);
    var self=this;
    self.scene=scene;
    this.name=name;
    this.pos=new THREE.Vector2().copy(pos);
    this.uid=uid++;
    this.map=heightmap;
    this.resources=_.extend({},entity.resources);
    this.type=entity;

    if(entity.mixins) {
      self.mixins={};
      self.mixinNames=[];
      _.each(entity.mixins,function(mixin) {
        var found=Mixins[mixin];
        if(found) {
          self.mixins[mixin]=found;
          self.mixinNames.push(mixin);
          _.extend(self,found);
        }
      });
    }
    this.setMesh("default");
  };

  Entity.prototype.updateMeshPos=function() {
    if(this.mesh) {
      if(this.mesh && this.mesh.rotation && this.rotation)
        this.mesh.rotation.z=this.rotation;
      this.mesh.setPos(this.pos.x, this.pos.y, this.map.get("rock").interpolate(this.pos.x,this.pos.y));
    }
  };
  Entity.prototype.setMesh=function(name){


    var self=this;
    var entity=this.type;
    var meshType;
    var animation;
    this.meshName=name;

    if(entity.meshes) {
      var def=entity.meshes[name];
      meshType=def.mesh;
      animation=def.animation;
    } else if(entity.mesh)
      meshType=entity.mesh;
    else
      meshType=this.name;

    self.meshType=meshType;
    self.animation=animation;

    Models.load(meshType, animation, this, self.scene, function(mesh) {
      if(self.mesh) {
        self.mesh.remove();
      }
      if(mesh.type==self.meshType && mesh.animation==self.animation) {
        self.mesh=mesh;
        mesh.setEntity(self);
        self.updateMeshPos();
        if(self.animationFinished)
          self.mesh.animationFinished=_.bind(self.animationFinished,self);
      } else {
        mesh.remove();
      }
    });
  };

  Entity.prototype.hovered=function() {
  };

  Entity.prototype.give=function(what,amount,toEntity) {
    if(this.resources[what]>=amount) {
      this.resources[what]-=amount;
      toEntity.resources[what]=(toEntity.resource[what]||0)+amount;
    }
  };

  return Entity;
});

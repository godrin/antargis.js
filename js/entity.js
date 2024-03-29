define(["models", "config/entities", "mixins"],function(Models, Entities, Mixins) {

  var uid=11110;

  var Entity=function(heightmap, ops) {
    var entity=Entities[ops.type];
    if(!entity) {
      console.warn("Entity: No Entity-Type named "+ops.type+" found!");
      entity={};
    }

    _.extend(this,entity);
    _.extend(this,ops);
    var self = this;
    this.state = {};
    this.typeName = this.type;
    this.pos = new THREE.Vector2(this.pos.x,this.pos.y);
    this.uid = uid++;
    this.map = heightmap;
    // clone
    this.resources=_.extend({},this.resources);
    this.type=entity;
    if(!this.meshName)
      this.meshName="default";

    if(entity.mixins) {
      self.mixins={};
      self.mixinNames=[];
      self.mixinDef = entity.mixins;
      _.each(entity.mixins,function(mixin) {
        var found=Mixins[mixin];
        if(found) {
          self.mixins[mixin]=found;
          self.mixinNames.push(mixin);
          _.extend(self,found);
        }
      });
    }
  };

  Entity.prototype.postLoad = function() {
    _.each(self.mixins,function(mixin) {
      if(mixin.postLoad)
        mixin.postLoad.apply(this,[]);
    });
  };

  Entity.prototype.isA = function(mixin) {
    return this.mixinDef.indexOf(mixin)>=0;
  };

  Entity.prototype.setScene = function(scene) {
    this.scene = scene;
    this.setMesh(this.meshName);
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
      if(!def)
        console.warn("No Mesh of name '"+name+"' found in entity-def",entity);
      meshType=def.mesh;
      animation=def.animation;
    } else if(entity.mesh)
      meshType=entity.mesh;
    else
      meshType=this.typeName;

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
        self.mesh.hovered(self.state.hovered);
        self.mesh.selected(self.state.selected);
      } else {
        mesh.remove();
      }
    });
  };

  Entity.prototype.hovered=function(val) {
    return this.mesh.hovered(this.state.hovered = val);
  };
  Entity.prototype.selected=function(val) {
    return this.mesh.selected(this.state.selected = val);
  };

  Entity.prototype.increaseBy = function(what, amount) {
      this.resources[what]=(this.resources[what]||0)+amount;
  };
  
  Entity.prototype.take=function(what,amount) {
    if(this.resources[what]>=amount) {
      this.resources[what]-=amount;
      return true;
    }
    return false;
  };

  Entity.prototype.give=function(what,amount,toEntity) {
    if(this.resources[what]>=amount) {
      this.resources[what]-=amount;
      console.debug("GIVE TO",toEntity,what);
      toEntity.resources[what]=(toEntity.resources[what]||0)+amount;
      return true;
    }
    return false;
  };

  return Entity;
});

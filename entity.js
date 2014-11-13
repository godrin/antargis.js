define(["models", "entities", "mixins"],function(Models, Entities, Mixins) {

  var uid=11110;

  var Entity=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    var self=this;
    self.scene=scene;
    this.name=name;
    this.type=name;
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

  Entity.prototype.setMesh=function(name){

    var self=this;
    var entity=this.type;
    var mesh;

    if(entity.meshes)
      mesh=entity.meshes[name];
    else
      mesh=entity;

    var loadFct=mesh.type=="json"?"loadJSON":"load";
    Models[loadFct](mesh.mesh, mesh, function(objects) {
      console.log("OK");
      if(!(objects instanceof Array)) {
        objects=[objects];
      }
      _.each(objects,function(object) {

        var rotation=mesh.rotation;
        if(rotation) {
          if(rotation.x) {
            object.rotation.x=rotation.x;
          }
          if(rotation.y) {
            object.rotation.y=rotation.y;
          }
          if(rotation.z) {
            object.rotation.z=rotation.z;
          }
        }

        if(mesh.scale) 
          object.scale.set(mesh.scale,mesh.scale,mesh.scale);

        self.mesh=object;
        console.log("OBJJJJJ",object);
        var ud={entity:self};
        if(object.children.length>0)
          object.children[0].userData=ud;

        self.mesh=object;
        object.userData=ud;

        if(true) {
          var node=new THREE.Object3D();
          node.add(object);
          node.position.x = self.pos.x;
          node.position.y = self.pos.y;
          node.position.z = self.map.get("rock").interpolate(self.pos.x,self.pos.y);
          self.mesh=node;
          self.scene.add( node);
        } else
          self.scene.add( object );
      });
    });
  };

  Entity.prototype.hovered=function() {
  };


  return Entity;
});

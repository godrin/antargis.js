define(["models", "entities", "mixins"],function(Models, Entities, Mixins) {

  var uid=11110;

  var Entity=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    var self=this;
    this.name=name;
    this.pos=new THREE.Vector2().copy(pos);
    this.uid=uid++;
    this.map=heightmap;
    this.resources=_.extend({},entity.resources);
    var loadFct=entity.type=="json"?"loadJSON":"load";

    if(entity.mixins) {
      self.mixins=[];
      _.each(entity.mixins,function(mixin) {
        console.log("MIXIIN ",mixin);
        var found=Mixins[mixin];
        if(found) {
          console.log("FOUND",found);
          self.mixins.push(found);
          _.extend(self,found);
        }
      });
    }

    Models[loadFct](entity.mesh, entity, function(objects) {
      if(!(objects instanceof Array)) {
        objects=[objects];
      }
      _.each(objects,function(object) {

        var rotation=entity.rotation;
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

        if(entity.scale) 
          object.scale.set(entity.scale,entity.scale,entity.scale);

        this.mesh=object;
        console.log("OBJJJJJ",object);
        var ud={entity:self};
        if(object.children.length>0)
          object.children[0].userData=ud;

        self.mesh=object;
        object.userData=ud;

        if(true) {
          var node=new THREE.Object3D();
          node.add(object);
          node.position.x = pos.x;
          node.position.y = pos.y;
          node.position.z = heightmap.get("rock").interpolate(pos.x,pos.y);
          self.mesh=node;
          scene.add( node);
        } else
          scene.add( object );
      });
    });
  };

  Entity.prototype.hovered=function() {
    console.log("B hovered");
  };


  return Entity;
});

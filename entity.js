define(["models", "entities", "boss", "movable"],function(Models, Entities, Boss, Movable) {

  var uid=11110;
  var mixins={
    boss:Boss,
    movable:Movable
  };

  var Entity=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    var self=this;
    this.name=name;
    this.pos=new THREE.Vector2().copy(pos);
    this.uid=uid++;
    this.map=heightmap;
    var loadFct=entity.type=="json"?"loadJSON":"load";

    if(entity.mixins) {
      self.mixins=[];
      _.each(entity.mixins,function(mixin) {
        console.log("MIXIIN ",mixin);
        if(mixins[mixin]) {
          console.log("FOUND",mixins[mixin]);
          self.mixins.push(mixins[mixin]);
          mixins[mixin].init(self);
        }
      });
    }

    Models[loadFct](entity.mesh, entity, function(objects) {
      if(!(objects instanceof Array)) {
        objects=[objects];
      }
      _.each(objects,function(object) {
        object.position.x = pos.x;
        object.position.y = pos.y;
        object.position.z = heightmap.get("rock").interpolate(pos.x,pos.y);

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

        scene.add( object );
      });
    });
  };

  Entity.prototype.hovered=function() {
    console.log("B hovered");
  };


  return Entity;
});

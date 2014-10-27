define(["models", "entities"],function(Models, Entities) {

  var B=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    var loadFct=entity.type=="json"?"loadJSON":"load";

    Models[loadFct](entity.mesh, function(objects) {
      console.log("OOOO",objects);
      if(!(objects instanceof Array)) {
        objects=[objects];
      }
      console.log("OOOO2222",objects);
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

        scene.add( object );
      });
    });
  };


  return B;
});

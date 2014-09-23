define(["models", "entities"],function(Models, Entities) {

  var B=function(name,pos,scene,heightmap) {
    var entity=Entities[name];
    Models.load(entity.mesh, function(object) {
      object.position.x = pos.x;
      object.position.y = pos.y;
      object.position.z = heightmap.get("rock").interpolate(pos.x,pos.y);

      var rotation=entity.rotation;
      if(rotation) {
        if(rotation.z) {
          object.rotation.z=rotation.z;
        }
      }

      if(entity.scale) 
        object.scale.set(entity.scale,entity.scale,entity.scale);

      scene.add( object );
    });
  };


  return B;
});

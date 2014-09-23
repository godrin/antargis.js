define(["models"],function(Models) {

  var B=function(name,pos,scene,heightmap) {
  console.log("BBB",name,pos,scene,heightmap);
    Models.load("townhall_try2", function(object) {
    console.log("NAME",name,object);
      object.position.x = pos.x;
      object.position.y = pos.y;
      object.position.z = heightmap.get("rock").interpolate(pos.x,pos.y);
      //object.position.x=pos.x;
      //object.position.y=7;
      //object.position.z=pos.y;
      console.log("POS",object.position,pos);
    //  object.rotation.x=-3.14/2;
      object.rotation.z=+3.14*6/4+3.14;
    //object.geometry.verticesNeedUpdate = true;
    //object.geometry.normalsNeedUpdate = true;
    //console.log("OBJECT",object)
      scene.add( object );
    });
  };


  return B;
});

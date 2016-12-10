define([],function() {
  var Pick={};

  var projector = new THREE.Projector();
  var raycaster = new THREE.Raycaster();

  /*
  * mouse={x:12,y:12}
  * */
  Pick.pick=function(mouse, camera, scene) {
    // find intersections
    //
    // create a Ray with origin at the mouse position
    //   and direction into the scene (camera direction)
    //
    var vec=new THREE.Vector2();
    vec.x = mouse.rx;
    vec.y = mouse.ry;
    raycaster.setFromCamera( vec,camera); 

    // create an array containing all objects in the scene with which the ray intersects
    // intersect recursive !!! 
    var result = raycaster.intersectObjects( scene.children,true);
    return result;
  };

  return Pick;
});

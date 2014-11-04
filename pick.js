define([],function() {

  var projector = new THREE.Projector();
  var Pick={};

  /*
  * mouse={x:12,y:12}
  * */
  Pick.pick=function(mouse, camera, scene) {
    // find intersections
    //
    // create a Ray with origin at the mouse position
    //   and direction into the scene (camera direction)
    var vector = new THREE.Vector3( mouse.rx, mouse.ry, 0 );
    /*
    projector.unprojectVector( vector, camera );
    console.log("VVV2",vector);
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );*/

    var ray= projector.pickingRay( vector.clone(), camera );

    // create an array containing all objects in the scene with which the ray intersects
    
    // intersect recursive !!! 
    return ray.intersectObjects( scene.children,true);
  };

  return Pick;

});

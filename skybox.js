define([],function() {
  return {
    add:function(scene) {
      THREE.ImageUtils.loadTexture('bower_components/THREE.Terrain/demo/img/sky1.jpg', undefined, function(t1) {
        skyDome = new THREE.Mesh(
          new THREE.SphereGeometry(4096, 64, 64),
          new THREE.MeshBasicMaterial({map: t1, side: THREE.BackSide, fog: false})
        );
        scene.add(skyDome);
      }); 
    }
  };
});

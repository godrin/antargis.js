define(['bower_components/THREE.Terrain/build/THREE.Terrain.min.js'],function(TT) {
  return {

    createTerrain: function(scene, material) {
      var xS = 63, yS = 63;
      terrainScene = THREE.Terrain({
        easing: THREE.Terrain.Linear,
        frequency: 2.5,
        heightmap: THREE.Terrain.DiamondSquare,
        material: material||new THREE.MeshBasicMaterial({color: 0x5566aa}),
        maxHeight: 100,
        minHeight: -100,
        steps: 1,
        useBufferGeometry: false,
        xSegments: xS,
        xSize: 1024,
        ySegments: yS,
        ySize: 1024,
      });
      // Assuming you already have your global scene
      scene.add(terrainScene);
      return;
      var geo = terrainScene.children[0].geometry;

      //
      // // Add randomly distributed foliage
      decoScene = THREE.Terrain.ScatterMeshes(geo, {
        mesh: new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 6)),
        w: xS,
        h: yS,
        spread: 0.02,
        randomness: Math.random,
      });
      terrainScene.add(decoScene);

    },

    create:function(scene) {
      var that=this;
      console.log("TERRAIN create");
      THREE.ImageUtils.loadTexture('bower_components/THREE.Terrain/demo/img/sand1.jpg', undefined, function(t1) {
        THREE.ImageUtils.loadTexture('bower_components/THREE.Terrain/demo/img/grass1.jpg', undefined, function(t2) {
          THREE.ImageUtils.loadTexture('bower_components/THREE.Terrain/demo/img/stone1.jpg', undefined, function(t3) {
            THREE.ImageUtils.loadTexture('bower_components/THREE.Terrain/demo/img/snow1.jpg', undefined, function(t4) {
              blend = THREE.Terrain.generateBlendedMaterial([
                {texture: t1},
                {texture: t2, levels: [-80, -35, 20, 50]},
                {texture: t3, levels: [20, 50, 60, 85]},
                {texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
              ], scene);
              that.createTerrain(scene,blend);
            });
          });
        });
      });
    }
  };
});

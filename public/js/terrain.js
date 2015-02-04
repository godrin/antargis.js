define(['js/libs/THREE.Terrain.js',"heightmap"],function(TT,HeightMap) {
  return {

    createTerrain: function(options,scene, material,heightmap) {
      var options=_.extend({width:64,height:64},options);
      var xS = options.width-1, yS = options.height-1;

      if(!heightmap)
        heightmap=function(g,options) {
          console.log("OPTIONS",options);
          var xl = options.xSegments + 1,
          yl = options.ySegments + 1;
          for (i = 0; i < xl; i++) {
            for (j = 0; j < yl; j++) {
              g[j * xl + i].z += Math.random()*100;
            }
          }
        };
        if(false)
          material=new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
          });
        terrainScene = THREE.Terrain({
          easing: THREE.Terrain.Linear,
          frequency: 2.5,
          heightmap: heightmap, 
          //after: heightmap, 
          material: material||new THREE.MeshBasicMaterial({color: 0x5566aa}),
//          maxHeight: 100,
//          minHeight: -100,
//minHeight:0,//undefined,
//maxHeight:10, //undefined,
          steps: 1,
          useBufferGeometry: false,
          xSegments: xS,
          xSize: options.width,
          ySegments: yS,
          ySize: options.height,
          stretch:false,
          clamp:false
        });
        terrainScene.rotation.x=0;
        //terrainScene.rotation.z=3.1415;
        terrainScene.position.x+=options.width/2;
        terrainScene.position.y+=options.width/2;

        console.log("TS",terrainScene);
        // Assuming you already have your global scene
        scene.add(terrainScene);
        this.geo = terrainScene.children[0].geometry;
    },

    create:function(options,scene,heightmap) {
      var that=this;
      console.log("TERRAIN create");
      THREE.ImageUtils.loadTexture('models/sand1.jpg', undefined, function(t1) {
        THREE.ImageUtils.loadTexture('models/grass1.jpg', undefined, function(t2) {
          THREE.ImageUtils.loadTexture('models/stone1.jpg', undefined, function(t3) {
            THREE.ImageUtils.loadTexture('models/snow1.jpg', undefined, function(t4) {
              blend = THREE.Terrain.generateBlendedMaterial([
                {texture: t1},
                {texture: t2, levels: [-80, -35, 20, 50]},
                {texture: t3, levels: [20, 50, 60, 85]},
                {texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
              ], scene);
              that.createTerrain(options,scene,blend,heightmap);
            });
          });
        });
      });
    }
  };
});

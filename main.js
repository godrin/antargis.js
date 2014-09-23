require.config({
  paths: {
    'underscore':'bower_components/underscore/underscore-eamd'
  },
});

require(['base',"terrain","skybox","models","controls", "generator","heightmap", "building"],
  function(Base,Terrain,Skybox, Models, Controls, Generator, HeightMap, Building) {
    // Our Javascript will go here.
    Base.init();

    console.log("Terrain",Terrain);
    var geometry = new THREE.BoxGeometry(1,1,1);
    var scene=Base.scene;

    var light = new THREE.AmbientLight( 0x202020 ); // soft white light
    scene.add( light );

    // White directional light at half intensity shining from the top.

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
    directionalLight.position.set( 1, 0, 0.7 );
    scene.add( directionalLight );
    var w=64;
    var mapOptions={width:w,height:w};

    Skybox.add(scene);
    Generator(mapOptions, function(w,h,data) {

      data=HeightMap.pickGreen(w,h,data)

      var map=new HeightMap({width:w,height:w,map:{rock:data}});
      console.log("MAP2",map);

      var threeHeightMap=map.toThreeTerrain();

      Terrain.create(mapOptions,scene,threeHeightMap);

      new Building("townhall",{x:0,y:0},scene,map);
      new Building("townhall",{x:3,y:3},scene,map);
      new Building("townhall",{x:5,y:3},scene,map);
      Controls.init({
        move:function(d) {
          var x=Base.camera.position.x;
          var y=Base.camera.position.y+5;
          var h=map.get("rock").interpolate(x,y);
          if(!h)
            h=0;

          Base.camera.position.x-=d.dx*0.03;
          Base.camera.position.y+=d.dy*0.03;
          Base.camera.position.z=10+h;
        }
      });
      Base.render();
    });





  });

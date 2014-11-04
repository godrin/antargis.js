require(['base',"terrain","skybox","models","controls", "generator","heightmap", "level", "pick"],
  function(Base,Terrain,Skybox, Models, Controls, Generator, HeightMap, Level, Pick) {
    // Our Javascript will go here.
    Base.init();

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

      var threeHeightMap=map.toThreeTerrain();

      Terrain.create(mapOptions,scene,threeHeightMap);

      new Level(scene,map);

      var lastPickedEntity=null;

      Controls.init({
        resize:function(size) {
          Base.setSize(size);
        },
        hover:function(mouse) {
          //console.log("HVOER",mouse);
          var res=Pick.pick(mouse, Base.camera, Base.scene);

          console.log("PICK",res,res[0].object.id,mouse);
          if(res.length>0) {
            if(lastPickedEntity)
              lastPickedEntity.hovered(false);

            lastPickedEntity=res[0].object.entity;
            console.log("OBJ",res[0].object.userData,res[0].object.userData.entity.uid);
//            lastPickedEntity.hovered(true);
          }
        },
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

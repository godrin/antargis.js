requirejs.config({
  baseUrl:"js",
  packages:[
    'jobs',
    'formations',
    'll',
    'ml',
    'hl',
    'angular'
  ],
});

require(['base',"terrain","skybox","models","controls", "generator","heightmap", "level", "pick", 'world',
'jobs', 'angular'],
function(Base,Terrain,Skybox, Models, Controls, Generator, HeightMap, Level, Pick, World, Jobs, Gui, Inventory) {
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
    var world=new World();

    var threeHeightMap=map.toThreeTerrain();

    Terrain.create(mapOptions,scene,threeHeightMap);

    var levelName=location.hash.replace(/^#/,'');
    if(!levelName)
      levelName="tests/fetch.js";

    console.log("level",levelName);

    Level.load(levelName,scene, map, world,function() {

      var lastPickedEntity=null;
      var lastPos=null;
      var selectedEntity=null;

      Controls.init({
        resize:function(size) {
          Base.setSize(size);
        },
        hover:function(mouse) {
          var res=Pick.pick(mouse, Base.camera, Base.scene);

          if(res.length>0) {
            if(lastPickedEntity)
              lastPickedEntity.hovered(false);

            lastPickedEntity=res[0].object.userData.entity;
            if(lastPickedEntity) {
              lastPickedEntity.hovered(true);
            } else 
            {
              lastPos=new THREE.Vector2().copy(res[0].point);
            }
          }
        },
        click:function() {
          if(lastPickedEntity) {
            selectedEntity = lastPickedEntity;
            console.log("selected",selectedEntity);
          } else {
            console.log("CLICK",selectedEntity);


            if(selectedEntity && selectedEntity.pushJob) 
              selectedEntity.pushJob(new Jobs.ml.Move(selectedEntity,lastPos));
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
      Base.render({
        frameCallback:function(delta) {
          //console.log("DELTA",delta);
          _.each(world.entities,function(e) {
            if(e && e.onFrame)
              e.onFrame(delta);
          });
        }
      });
    });
  });
});

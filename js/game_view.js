define(["base", "terrain", "controls", "skybox", "pick", "jobs"],function(Base, Terrain, Controls, Skybox, Pick, Jobs) {
  "use strict";
  function GameView(el, world) {
    var base=new Base(el);
    var geometry = new THREE.BoxGeometry(1,1,1);
    var scene=base.scene;

    // soft white light
    var light = new THREE.AmbientLight( 0x202020 );
    scene.add( light );

    // White directional light at half intensity shining from the top.
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
    directionalLight.position.set( 1, 0, 0.7 );
    scene.add( directionalLight );

    Skybox.add(scene);

    var map = world.map;

    var threeHeightMap=map.toThreeTerrain();

    Terrain.create(map,scene,threeHeightMap);

    // FIXME: load all models beforehand
    world.initScene(scene);

    var lastPos=null;

    Controls.init({
      resize:function(size) {
        base.setSize(size);
      },
      hover:function(mouse) {
        var res=Pick.pick(mouse, base.camera, base.scene);

        if(res.length>0) {
          var entity=res[0].object.userData.entity;
          world.hover(entity);

          if(!entity) {
            lastPos=new THREE.Vector2().copy(res[0].point);
          }
        }
      },
      click:function() {
        if(world.hoveredEntity) {
          world.select(world.hoveredEntity);
        } else if(world.selectedEntity && world.selectedEntity.pushJob) {
          world.selectedEntity.pushJob(new Jobs.ml.Move(world.selectedEntity,lastPos));
        }
      },
      move:function(d) {
        var x=base.camera.position.x;
        var y=base.camera.position.y+5;
        var h=map.get("rock").interpolate(x,y);
        if(!h)
          h=0;

        base.camera.position.x-=d.dx*0.03;
        base.camera.position.y+=d.dy*0.03;
        base.camera.position.z=10+h;
      }
    });
    base.render({
      frameCallback:function(delta) {
        _.each(world.entities,function(e) {
          if(e && e.onFrame)
            e.onFrame(delta);
        });
      }
    });
  }

  return GameView;

});

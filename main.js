require(['base',"terrain","skybox","models","controls"],function(Base,Terrain,Skybox, Models, Controls) {
  // Our Javascript will go here.
  Base.init();

  console.log("Terrain",Terrain);
  var geometry = new THREE.BoxGeometry(1,1,1);
  var material = new THREE.MeshBasicMaterial( { color: 0x00af00 } );
  material=new THREE.MeshLambertMaterial({
    color: 'blue' 
  });
  var scene=Base.scene;

  var light = new THREE.AmbientLight( 0x404040 ); // soft white light
  scene.add( light );

  // White directional light at half intensity shining from the top.

  var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set( 1, 1, 0 );
  scene.add( directionalLight );

  // model
  Models.load("bakery", function(object) {
    object.position.y = 100;
    object.rotation.x=-3.14/2;
    object.rotation.z=-3.14/8;
    object.scale.set(30,30,30);
    scene.add( object );
  });
  Models.load("townhall_try2", function(object) {
    object.position.y = 100;
    object.position.z = 100;
    object.rotation.x=-3.14/2;
    object.rotation.z=+3.14*6/4+3.14;
    object.scale.set(30,30,30);
    scene.add( object );
  });

  Terrain.create(scene);
  console.log("GEO",Terrain.geo);

  Skybox.add(scene);

  Controls.init({
    move:function(d) {
      Base.camera.position.x-=d.dx*0.3;
      Base.camera.position.z-=d.dy*0.3;
    }
  });

  Base.render();

});

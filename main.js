require(['base',"terrain"],function(Base,Terrain) {
  // Our Javascript will go here.
  //

  Base.init();


  console.log("Terrain",Terrain);
  var geometry = new THREE.BoxGeometry(1,1,1);
  var material = new THREE.MeshBasicMaterial( { color: 0x00af00 } );
  material=new THREE.MeshLambertMaterial({
    color: 'blue' 
  });
  var cube = new THREE.Mesh( geometry, material );
  //scene.add( cube );
  var scene=Base.scene;

  var light = new THREE.AmbientLight( 0x404040 ); // soft white light
  scene.add( light );

  // White directional light at half intensity shining from the top.

  var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set( 1, 1, 0 );
  scene.add( directionalLight );


  var manager = new THREE.LoadingManager();
  manager.onProgress = function ( item, loaded, total ) {

    console.log( item, loaded, total );

  };

  var texture = new THREE.Texture();

  var loader = new THREE.ImageLoader( manager );
  loader.load( 'models/bakery.bmp', function ( image ) {

    texture.image = image;
    texture.needsUpdate = true;

  } );

  // model

  var loader = new THREE.OBJLoader( manager );
  loader.load( 'models/bakery.obj', function ( object ) {

    object.traverse( function ( child ) {

      if ( child instanceof THREE.Mesh ) {

        child.material.map = texture;

      }

    } );

    object.position.y = - 1;
    object.rotation.x=-3.14/2;
    object.rotation.z=-3.14/8;
    scene.add( object );
    console.log("ADDED");

  } );

  Terrain.create(scene);

  Base.render();

});

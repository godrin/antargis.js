define([],function() {

  var manager = new THREE.LoadingManager();
  manager.onProgress = function ( item, loaded, total ) {
    console.log("manager.onProgress", item, loaded, total );
  };
  var models={};
  var objloader = new THREE.OBJLoader( manager );
  var jsonloader = new THREE.JSONLoader( manager );
  var imageloader = new THREE.ImageLoader( manager );

  var callbacks={};
  function ensureLoop( animation ) {

    for ( var i = 0; i < animation.hierarchy.length; i ++ ) {

      var bone = animation.hierarchy[ i ];

      var first = bone.keys[ 0 ];
      var last = bone.keys[ bone.keys.length - 1 ];

      last.pos = first.pos;
      last.rot = first.rot;
      last.scl = first.scl;

    }

  }


  var o = {
    load:function(name, callback) {
      if(models[name])
        return callback(models[name].clone());

      if(callbacks[name]) {
        callbacks[name].push(callback);
        return;
      }
      else {
        callbacks[name]=[callback];

        console.log("Loading model", name);

        var texture = new THREE.Texture();

        imageloader.load( 'models/'+name+'.png', function ( image ) {

          texture.image = image;
          texture.needsUpdate = true;

        } );
        objloader.load( 'models/'+name+'.obj', function ( object ) {

          object.traverse( function ( child ) {

            if ( child instanceof THREE.Mesh ) {
              child.material.map = texture;
            }
          } );

          models[name]=object;

          $.each(callbacks[name],function(ke,cb) {
            cb(object.clone());
          });
        });
      }
    },
    loadJSON:function(name, callback) {
      if(models[name])
        return callback(models[name].clone());

      if(callbacks[name]) {
        callbacks[name].push(callback);
        return;
      }
      else {
        callbacks[name]=[callback];

        console.log("Loading model", name);

        var texture = new THREE.Texture();
        /*
        imageloader.load( 'models/'+name+'.png', function ( image ) {

        texture.image = image;
        texture.needsUpdate = true;

        } );
        */
        jsonloader.load('models/'+name +'.json' , function ( geometry, materials ) {

          console.log("GGG",geometry,materials);
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();

          ensureLoop( geometry.animation );
          for ( var i = 0, il = materials.length; i < il; i ++ ) {

            var originalMaterial = materials[ i ];
            console.log("MAT",originalMaterial);
            originalMaterial.skinning = true;
            }

          var material = new THREE.MeshFaceMaterial( materials );
          var mesh = new THREE.SkinnedMesh( geometry, material, false );

          var helper = new THREE.SkeletonHelper( mesh );
          helper.material.linewidth = 3;
          helper.visible = true;


          //scene.add( helper );
          //scene.add( mesh );
          if(true) {
            animation = new THREE.Animation( mesh, geometry.animation );
            animation.play();
            animation.update( 10 );
          }

          var object=mesh;
          models[name]=object;

          $.each(callbacks[name],function(ke,cb) {

                     cb([object]);
            //  cb(object.clone());
          });
        } );
      }
    }
  };
  return o;
});

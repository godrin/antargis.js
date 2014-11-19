define([],function() {

  var manager = new THREE.LoadingManager();
  manager.onProgress = function ( item, loaded, total ) {
    console.log("manager.onProgress", item, loaded, total );
  };
  var models={};
  var animations={};
  var objloader = new THREE.OBJLoader( manager );
  var jsonloader = new THREE.JSONLoader( manager );
  var imageloader = new THREE.ImageLoader( manager );

  var callbacks={};
  function ensureLoop( animation ) {
    return;
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
    load:function(name, options, callback) {
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
        var texName=name+".png";
        texName=name+".jpg";
        if(options.texture)
          texName=options.texture;
        texName="models/"+texName;

        imageloader.load( texName, function ( image ) {

          texture.image = image;
          texture.needsUpdate = true;

        } );
        objloader.load( 'models/'+name+'.obj', function ( object ) {
          console.log("OBJ ",arguments);

          object.traverse( function ( child ) {

            if ( child instanceof THREE.Mesh ) {
              child.material.map = texture;
              child.material.side = THREE.DoubleSide;
              if(options.transparent) {
                child.material.transparent= true;
                child.material.depthWrite= false;
              }
            }
          } );

          models[name]=object;

          $.each(callbacks[name],function(ke,cb) {
            cb(object.clone());
          });
        });
      }
    },

    // animate (cloned) mesh
    animate:function(mesh,name,options) {
      var self=this;
      var animation = new THREE.Animation( mesh, animations[name] );
      animation.data=animations[name];
      var scale=1
      if(options.timeScale)
        scale=options.timeScale;

      if(options.loop===false) {
        animation.loop=false;
      }
      animation.timeScale=scale;
      animation.play();

      // implement support for looping interval within global animation
      // have a look at entity also
      if(options.startFrame) {
        if(options.endFrame) { 
          var startAnimation=function() {
            animation.play(options.startFrame,1);
          };
          var stopAnimation=function() {
            animation.stop();
            if(mesh.animationFinished)
              mesh.animationFinished();
          };
          var time=1000*(options.endFrame-options.startFrame)/scale;
          startAnimation();
          if(options.loop!==false) {
            var interval=setInterval(startAnimation,time);
            mesh.beforeRemove=function() {
              clearInterval(interval);
            };
          } else {
            var timeout=setTimeout(stopAnimation,time);
            mesh.beforeRemove=function() {
              clearTimeout(interval);
            };
          }

        }
      }else
        animation.update( Math.random()*10 );
    },

    loadJSON:function(name, options, callback) {
      var self=this;
      if(models[name]) {

        var m=models[name].clone();
        this.animate(m,name,options);

        return callback(m);

      }

      if(callbacks[name]) {
        callbacks[name].push(callback);
        return;
      }
      else {
        callbacks[name]=[callback];

        console.log("Loading model", name);

        var texture = new THREE.Texture();
        jsonloader.load('models/'+name +'.json' , function ( geometry, materials ) {

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

          var object=mesh;
          models[name]=object;
          animations[name]=geometry.animation;

          $.each(callbacks[name],function(ke,cb) {
            var mesh=object.clone();
            console.log("CLONED",mesh,object);

            self.animate(mesh,name,options);
            cb(mesh);
          });
        } );
      }
    }
  };
  return o;
});

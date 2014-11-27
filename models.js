define(["model", "config/meshes"], function(Model, Meshes) {

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

    load:function(mesh, animation, entity, scene, callback) {
      var meshDef=Meshes[mesh];
      var loadfct=(meshDef.type=="json")?"loadJSON":"loadObj";

      this[loadfct](mesh, animation, function(objects) {
        if(!(objects instanceof Array)) {
          objects=[objects];
        }

        var node=new THREE.Object3D();
        _.each(objects,function(object) {
          var rotation=meshDef.rotation;
          if(rotation) {
            if(rotation.x) {
              object.rotation.x=rotation.x;
            }
            if(rotation.y) {
              object.rotation.y=rotation.y;
            }
            if(rotation.z) {
              object.rotation.z=rotation.z;
            }
          }
          
          var position=meshDef.position;
          if(position) {
            if(position.x) {
              object.position.x=position.x;
            }
            if(position.y) {
              object.position.y=position.y;
            }
            if(position.z) {
              object.position.z=position.z;
            }
          }

          if(meshDef.scale) 
            object.scale.set(meshDef.scale,meshDef.scale,meshDef.scale);

          var ud={entity:self};
          if(object.children.length>0)
            object.children[0].userData=ud;

          object.userData=ud;
          node.add(object);
        });
        scene.add(node);
        var newModel=new Model(objects, node, scene);
        newModel.name=mesh;
        newModel.type=mesh;
        newModel.animation=animation;
        callback(newModel);
      });
    },

    loadObj:function(name, dummy, callback) {
      var options = Meshes[name];
      var key=name;
      var mesh=options.mesh||name;


      if(models[key])
        return callback(models[key].clone());

      if(callbacks[key]) {
        callbacks[key].push(callback);
        return;
      }
      else {
        callbacks[name]=[callback];

        var texture = new THREE.Texture();
        var texName=mesh+".png";
        texName=mesh+".jpg";
        if(options.texture)
          texName=options.texture;
        texName="models/"+texName;

        imageloader.load( texName, function ( image ) {
          texture.image = image;
          texture.needsUpdate = true;
        });
        objloader.load( 'models/'+mesh+'.obj', function ( object ) {

          object.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
              child.material.map = texture;
              if(options.doublesided)
                child.material.side = THREE.DoubleSide;
              if(options.transparent) {
                child.material.transparent= true;
                child.material.depthWrite= false;
              }
            }
          } );

          models[key]=object;

          _.each(callbacks[name],function(cb) {
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
          console.log("ANIMAL stopANimation",mesh,mesh.animationFinished);
            animation.stop();
            if(mesh.userData && mesh.userData.entity && mesh.userData.entity.animationFinished)
              mesh.userData.entity.animationFinished();
          };
          var time=1000*(options.endFrame-options.startFrame)/scale;
          startAnimation();
          if(options.loop!==false) {
            var interval=setInterval(startAnimation,time);
            mesh.beforeRemove=function() {
              clearInterval(interval);
            };
          } else {
          console.log("ANIMAL DONT LOOP",arguments);
            var timeout=setTimeout(stopAnimation,time);
            mesh.beforeRemove=function() {
              clearTimeout(interval);
            };
          }

        }
      }else
        animation.update( Math.random()*10 );
    },

    loadJSON:function(name, animation, callback) {
      var options=_.extend({},Meshes[name]);
      if(Meshes[name].animations[animation])
        options=_.extend(options,Meshes[name].animations[animation]);
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
            if(options.doublesided) {
              //  originalMaterial.side = THREE.DoubleSide;
              console.log("DOUBLE");
            }
          }

          var material = new THREE.MeshFaceMaterial( materials );
          if(options.doublesided) 
            material.side = THREE.DoubleSide;


          if(options.wireframe) {
            material=new THREE.MeshBasicMaterial({
              wireframe: true,
              color: 'blue'
            });
          }
          if(options.defaultMaterial) {
            material= new THREE.MeshLambertMaterial({
              color: 'blue' 
            });
          }

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
        });
      }
    }
  };
  return o;
});

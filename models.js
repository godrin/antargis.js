define([],function() {

  var manager = new THREE.LoadingManager();
  manager.onProgress = function ( item, loaded, total ) {
    console.log("manager.onProgress", item, loaded, total );
  };
  var models={};
  var objloader = new THREE.OBJLoader( manager );
  var imageloader = new THREE.ImageLoader( manager );


  var callbacks={};

  var o = {
    load:function(name,callback) {
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

        imageloader.load( 'models/'+name+'.bmp', function ( image ) {

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

          for(var i in callbacks[name]) {
            console.log("I",i);
            callbacks[name][i](object.clone());
          }
        });
      }
    }
  };
  return o;
});

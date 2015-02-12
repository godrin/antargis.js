define([],function() {
      var clock = new THREE.Clock();
  var self={ 

    init:function() {
      self.scene = new THREE.Scene();
      var camera = self.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

      self.renderer = new THREE.WebGLRenderer();

      self.renderer.setSize( window.innerWidth, window.innerHeight );
      document.body.appendChild( self.renderer.domElement );
      
      camera.position.x = 16;
      camera.position.y = -5;
      camera.position.z = 10;
      camera.rotation.x = ( 10+32) * Math.PI / 180;
    },
    setSize:function(size) {
      self.camera.aspect = window.innerWidth / window.innerHeight;
      self.camera.updateProjectionMatrix();

      self.renderer.setSize( window.innerWidth, window.innerHeight );
    },

    render:function(options) {
      var lastTime=0;
      function render() {
        requestAnimationFrame(render);
        var time = (new Date()).getTime();
        var timeDiff = time - lastTime;
        lastTime = time;

        var delta =  clock.getDelta();
        var mydelta=timeDiff*0.001;
//        delta=timeDiff*0.001;
        //console.log("DELTA",delta,mydelta); //timeDiff*0.001, delta/(timeDiff*0.001));
        // use "Date" clock
        if(true)
        delta=mydelta;
        if(options && options.frameCallback)
          options.frameCallback(delta);

        // animate Collada model

        THREE.AnimationHandler.update( delta );
        self.renderer.render(self.scene, self.camera);
      }
      render();
    }
  };
  return self;
});

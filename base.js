define([],function() {
  var self={ 

    init:function() {
      self.scene = new THREE.Scene();
      var camera = self.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

      self.renderer = new THREE.WebGLRenderer();

      self.renderer.setSize( window.innerWidth, window.innerHeight );
      document.body.appendChild( self.renderer.domElement );
      self.camera.position.z = 5;
      self.camera.position.y = 2;

      self.camera.position.x=1;

      camera.position.x = 349;
      camera.position.y = 311;
      camera.position.z = 376;
      camera.rotation.x = -52 * Math.PI / 180;
//      camera.rotation.y = 35 * Math.PI / 180;
//      camera.rotation.z = 37 * Math.PI / 180;

      console.log("CAM",camera);

    },

    render:function() {
      //      console.log("RENDER");
      var lastTime=0;
      function render() {

        var time = (new Date()).getTime();
        var timeDiff = time - lastTime;
        lastTime = time;
        requestAnimationFrame(self.render);
        //cube.rotation.x += 0.1;
        //        cube.rotation.y += 1*timeDiff*0.001;
        self.renderer.render(self.scene, self.camera);
      }
      render();
    }
  };
  return self;
});

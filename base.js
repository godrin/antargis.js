define([],function() {
  var self={ 

    init:function() {
      self.scene = new THREE.Scene();
      self.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

      self.renderer = new THREE.WebGLRenderer();

      self.renderer.setSize( window.innerWidth, window.innerHeight );
      document.body.appendChild( self.renderer.domElement );
      self.camera.position.z = 5;
      self.camera.position.y = 2;

      self.camera.position.x=1;
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

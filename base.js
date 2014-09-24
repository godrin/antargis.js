define([],function() {
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

    render:function() {
      var lastTime=0;
      function render() {

        var time = (new Date()).getTime();
        var timeDiff = time - lastTime;
        lastTime = time;
        requestAnimationFrame(self.render);
        self.renderer.render(self.scene, self.camera);
      }
      render();
    }
  };
  return self;
});

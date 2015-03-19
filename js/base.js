define([],function() {
  var clock = new THREE.Clock();
  var Base =function(element) {
    var self=this;
    console.log("INIT");
    self.scene = new THREE.Scene();
    var camera = self.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

    self.renderer = new THREE.WebGLRenderer();

    self.renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( self.renderer.domElement );

    camera.position.x = 16;
    camera.position.y = -5;
    camera.position.z = 10;
    camera.rotation.x = ( 10+32) * Math.PI / 180;

    self.particleGroup = this.makeSPEGroup();
    if(false) {
      for(var c=0;c<10;c++) {
        self.particleGroup.addEmitter( this.makeEmitter(new THREE.Vector3(1,1,1)));
      }
    } else {
      self.particleGroup.addPool(10, this.emitterSettings, false);
    }
    self.scene.add( self.particleGroup.mesh );
    self.scene.particleGroup = self.particleGroup;

  };

  Base.prototype.makeSPEGroup = function() {
    var particleGroup = new SPE.Group({
      texture: THREE.ImageUtils.loadTexture('./images/smokeparticle.png'),
      maxAge: 4,
      blending: THREE.NormalBlending
    });
    return particleGroup;
  };

  Base.prototype.emitterSettings = {
    position: THREE.Vector3(1,1,1),
    positionSpread: new THREE.Vector3( 0, 0, 0 ),

    acceleration: new THREE.Vector3(0.03, 0, 0),
    accelerationSpread: new THREE.Vector3( 0.01, 0.01, 0 ),

    velocity: new THREE.Vector3(0, 0, 0.7),
    velocitySpread: new THREE.Vector3(0.3, 0.5, 0.2),

    colorStart: new THREE.Color(0xBBBBBB),

    colorStartSpread: new THREE.Vector3(0.2, 0.1, 0.1),
    colorEnd: new THREE.Color(0xAAAAAA),

    sizeStart: 0.5,
    sizeEnd: 4,
    opacityStart:1,
    opacityEnd:0.1,

    //particleCount: 2000,
    particlesPerSecond: 100,
    alive:0
  };

  Base.prototype.makeEmitter = function(pos) {
    var emitter = new SPE.Emitter(this.emitterSettings);
    return emitter;
  };

  Base.prototype.setSize = function(size) {
    var self = this;
    self.camera.aspect = window.innerWidth / window.innerHeight;
    self.camera.updateProjectionMatrix();

    self.renderer.setSize( window.innerWidth, window.innerHeight );
  };

  Base.prototype.render = function(options) {
    var self = this;
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
      if(delta>0.1)
        delta=0.1;
      if(options && options.frameCallback)
        options.frameCallback(delta);

      //          console.log("tiick",self.particleGroup,delta);
      self.particleGroup.tick( delta );
      // animate Collada model

      THREE.AnimationHandler.update( delta );
      self.renderer.render(self.scene, self.camera);
    }
    //render();
    requestAnimationFrame(render);
  };
  return Base;
});

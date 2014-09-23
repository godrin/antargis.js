define([],function() {

  var loadShader=function(name,callback) {
    $.get("shaders/"+name+".frag",function(frag) {
      $.get("shaders/map2d.vert",function(vert) {
        callback({fragmentShader:frag,vertexShader:vert});
      });
    });
  }

  var fct = function(options,datacallback) { 
    var container;
    var cameraRTT, camera, sceneRTT, renderer;
    var rtTexture, material, quad;
    var delta = 0.01;
    var w=64;
    var rtt=_.extend({
      width:w,
      height:w
    },options);

    loadShader("simplex3d",function(shader) {
      init(shader);
      animate();
    });

    function init(shader) {

      rtTexture = new THREE.WebGLRenderTarget( rtt.width, rtt.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

      cameraRTT = new THREE.OrthographicCamera( -rtt.width/2,  rtt.width/2, rtt.height/2, -rtt.height/2, -10000, 10000 );
      cameraRTT.position.z = 100;

      container = document.getElementById( 'container' );
      sceneRTT = new THREE.Scene();

      material = new THREE.ShaderMaterial( {

        uniforms: { 
          delta: { type:'f', value:Math.random()},
          viewport:{type:'v2',value:new THREE.Vector2(rtt.width,rtt.height)}

        },
        vertexShader: shader.vertexShader, 
        fragmentShader: shader.fragmentShader

      } );
      var plane = new THREE.PlaneGeometry( window.innerWidth, window.innerHeight );

      quad = new THREE.Mesh( plane, material );
      quad.position.z = -100;
      sceneRTT.add( quad );
      renderer = new THREE.WebGLRenderer();
      renderer.setSize( rtt.width,rtt.height);
      renderer.autoClear = false;

      // disable if render off screen is wished
      if(false)
        container.appendChild( renderer.domElement );

    }
    var framesDone=0;

    function animate() {
      if(!framesDone)
        framesDone=0;

      console.log("FR",framesDone);
      framesDone+=1;
      if(framesDone<1)
        requestAnimationFrame( animate );

      render();

    }

    function render() {

      if(false) {
        var time = Date.now() * 0.0015;
        if ( material.uniforms.time.value > 1 || material.uniforms.time.value < 0 ) {
          delta *= -1;
        }

        material.uniforms.time.value += delta;
      }
      renderer.clear();

      // Render first scene into texture

      renderer.render( sceneRTT, cameraRTT, rtTexture, true );
      var arr = new Uint8Array( rtt.width * rtt.height*4 );
      var gl = renderer.getContext();
      gl.readPixels( 0, 0, rtt.width, rtt.height, gl.RGBA, gl.UNSIGNED_BYTE, arr);
      if(datacallback)
        datacallback(rtt.width,rtt.height,arr);
      renderer.render( sceneRTT, cameraRTT );
    }
  };
  return fct;
});

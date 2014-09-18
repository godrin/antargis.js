define([],function() {

  var loadShader=function(name,callback) {
    $.get("shaders/"+name+".frag",function(frag) {
      $.get("shaders/map2d.vert",function(vert) {
        callback({fragmentShader:frag,vertexShader:vert});
      });
    });
  }

  var fct= function() {
    loadShader("simplex3d",function(options) {
      options=$.extend({
        uniforms:{
          delta:{type:'f',value:1.0},
          viewport:{type:'v2',value:new THREE.Vector2(256,256)}
        }
      },options);
      var m=new THREE.ShaderMaterial(options);
      console.log("M",m);

      var cameraRTT = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000 );
      cameraRTT.position.z = 100;
      var rtTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );
      var sceneRTT = new THREE.Scene();
    });
  };

  fct.test=function() { 

    var container, stats;

    var cameraRTT, camera, sceneRTT, scene, renderer, zmesh1, zmesh2;

    var mouseX = 0, mouseY = 0;

    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;

    var rtTexture, material, quad;

    var delta = 0.01;

    init();
    animate();

    function init() {

      var rtt={
        width:window.innerWidth,
        height:window.innerHeight
      };

      rtTexture = new THREE.WebGLRenderTarget( rtt.width, rtt.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

      cameraRTT = new THREE.OrthographicCamera( -rtt.width/2,  rtt.width/2, rtt.height/2, -rtt.height/2, -10000, 10000 );
      cameraRTT.position.z = 100;




      container = document.getElementById( 'container' );

      camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
      camera.position.z = 100;


      //scene = new THREE.Scene();
      sceneRTT = new THREE.Scene();

      material = new THREE.ShaderMaterial( {

        uniforms: { time: { type: "f", value: 0.0 } },
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragment_shader_pass_1' ).textContent

      } );
/*
      var materialScreen = new THREE.ShaderMaterial( {

        uniforms: { tDiffuse: { type: "t", value: rtTexture } },
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragment_shader_screen' ).textContent,

        depthWrite: false

      } );
*/
      var plane = new THREE.PlaneGeometry( window.innerWidth, window.innerHeight );

      quad = new THREE.Mesh( plane, material );
      quad.position.z = -100;
      sceneRTT.add( quad );

    //  var geometry = new THREE.TorusGeometry( 100, 25, 15, 30 );

    //  var mat1 = new THREE.MeshPhongMaterial( { color: 0x555555, specular: 0xffaa00, shininess: 5 } );
    //  var mat2 = new THREE.MeshPhongMaterial( { color: 0x550000, specular: 0xff2200, shininess: 5 } );
/*
      zmesh1 = new THREE.Mesh( geometry, mat1 );
      zmesh1.position.set( 0, 0, 100 );
      zmesh1.scale.set( 1.5, 1.5, 1.5 );
      sceneRTT.add( zmesh1 );

      zmesh2 = new THREE.Mesh( geometry, mat2 );
      zmesh2.position.set( 0, 150, 100 );
      zmesh2.scale.set( 0.75, 0.75, 0.75 );
      sceneRTT.add( zmesh2 );
*/
      /*quad = new THREE.Mesh( plane, materialScreen );
      quad.position.z = -100;
      sceneScreen.add( quad );
*/
      /*
      var n = 3,
      geometry = new THREE.SphereGeometry( 10, 64, 32 ),
      material2 = new THREE.MeshBasicMaterial( { color: 0xffffff, map: rtTexture } );

      for( var j = 0; j < n; j ++ ) {

        for( var i = 0; i < n; i ++ ) {

          mesh = new THREE.Mesh( geometry, material2 );

          mesh.position.x = ( i - ( n - 1 ) / 2 ) * 20;
          mesh.position.y = ( j - ( n - 1 ) / 2 ) * 20;
          mesh.position.z = 0;

          mesh.rotation.y = - Math.PI / 2;

          //scene.add( mesh );

        }

      }
*/
      renderer = new THREE.WebGLRenderer();
      renderer.setSize( rtt.width,rtt.height); //window.innerWidth, window.innerHeight );
      renderer.autoClear = false;

      container.appendChild( renderer.domElement );

      document.addEventListener( 'mousemove', onDocumentMouseMove, false );

    }

    function onDocumentMouseMove( event ) {

      mouseX = ( event.clientX - windowHalfX );
      mouseY = ( event.clientY - windowHalfY );

    }

    var framesDone=0;

    function animate() {
    if(!framesDone)
      framesDone=0;

      console.log("FR",framesDone);
      if(framesDone<200)
        requestAnimationFrame( animate );

      render();
      //stats.update();
      framesDone+=1;

    }

    function render() {

      var time = Date.now() * 0.0015;
/*

      camera.position.x += ( mouseX - camera.position.x ) * .05;
      camera.position.y += ( - mouseY - camera.position.y ) * .05;

      camera.lookAt( sceneRTT.position );

      if ( zmesh1 && zmesh2 ) {

        zmesh1.rotation.y = - time;
        zmesh2.rotation.y = - time + Math.PI / 2;

      }
*/
      if ( material.uniforms.time.value > 1 || material.uniforms.time.value < 0 ) {

        delta *= -1;

      }

      material.uniforms.time.value += delta;

      renderer.clear();

      // Render first scene into texture

      renderer.render( sceneRTT, cameraRTT, rtTexture, true );

      // Render full screen quad with generated texture

      //renderer.render( sceneScreen, cameraRTT );

      // Render second scene to screen
      // (using first scene as regular texture)

      renderer.render( sceneRTT, cameraRTT );

    }
  };
  return fct;
});

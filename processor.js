define([],function() {

  function makeRenderer(rtt) {
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( rtt.width,rtt.height);
    renderer.autoClear = false;
    return renderer;
  }

  function makeScene(material,w,h) {
    var sceneRTT=new THREE.Scene();
    var plane = new THREE.PlaneGeometry( w, h);

    quad = new THREE.Mesh( plane, material );
    quad.position.z = -100;
    sceneRTT.add( quad );
    return sceneRTT;
  }

  function makeCamera(rtt) {
    var cameraRTT = new THREE.OrthographicCamera( -rtt.width/2,  rtt.width/2, 
    rtt.height/2, -rtt.height/2, -10000, 10000 );
    cameraRTT.position.z = 100;
    return cameraRTT;
  }

  var p={};

  var shaders={};

  p.loadShaders=function(names,callback) {
    var vshader={};
    var fshader={};
    var done=0;
    function check() {
      if(done==names.length*2)
        callback(vshader,fshader);
    }
    _.each(names,function(name) {
      shaders[name]={};
      $.get("shaders/"+name+".frag",function(frag) {
        shaders[name].frag=frag;
        fshader[name]=frag;
        done+=1;
        check();
      });
      $.get("shaders/"+name+".vert",function(vert) {
        shaders[name].vert=vert;
        vshader[name]=vert;
        done+=1;
        check();
      });
    });
  }

  p.Texture=function(options) {
    this.width=options.width;
    this.height=options.height;

    this.texture= new THREE.WebGLRenderTarget( options.width, options.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );
    this.renderer = makeRenderer(this);
  };

  p.Texture.prototype.readData=function() {
    var arr = new Uint8Array( this.width * this.height*4 );
    var gl = this.renderer.getContext();
    gl.readPixels( 0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, arr);
    return arr;
  };

  p.Pass=function(shader, targetTexture) {
    this.target = targetTexture;
    this.material = new THREE.ShaderMaterial( {

      uniforms: { 
        delta: { type:'f', value:Math.random()},
        viewport:{type:'v2',value:new THREE.Vector2(this.target.width, this.target.height)}

      },
      vertexShader: shaders[shader].vert,
      fragmentShader: shaders[shader].frag
    } );
    this.sceneRTT = makeScene(this.material, this.target.width, this.target.height);
    this.cameraRTT = makeCamera(this.target);
  };

  function render(renderer, scene,camera,target,flag, callback) {
    requestAnimationFrame(function() {
      renderer.clear();
      renderer.render(scene,camera,target,flag);
      console.log(callback);
      if(callback)
        callback();
    });
  }

  p.Pass.prototype.run=function(uniforms,callback) {
    // update uniforms
    //FIXME ? possibily only override only values ?
    $.extend(this.material.uniforms,uniforms);

    console.log("UNIFORMS",this.material);

    //render
    render(this.target.renderer, this.sceneRTT, 
    this.cameraRTT, this.target.texture, true, callback );
  };

  p.Composer=function() {
  };

  function run() {

    var textureOptions={w:128,h:128};

    var rock=new p.Texture(textureOptions);
    var water=new p.Texture(textureOptions);
    var initpasses=[];
    var updatepasses=[];
    initpasses.push(new p.Pass("simplex3d",{seed:{type:'f',value:1.0}},rock));
    updatepasses.push(new p.Pass("watesimplex3d",{seed:{type:'f',value:1.0}},rock));

  }

  return p;

});

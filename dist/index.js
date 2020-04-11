(function () {
'use strict';

class Intro extends HTMLElement {
    connectedCallback() {
        this.current_screen = -1;
        this.screens = this.querySelectorAll("intro-screen");
        this.nextScreenHandler = this.nextScreen.bind(this);
        this.nextScreen();
    }

    isconnectedCallback() {
        this.unbindEvent(this.screens[this.current_screen]);
    }

    bindEvent(screen) {
        if(screen) {
            screen.addEventListener('webkitAnimationIteration', this.nextScreenHandler);
            screen.addEventListener('animationIteration', this.nextScreenHandler);
        }
    }

    unbindEvent(screen) {
        if(screen) {
            screen.removeEventListener('webkitAnimationIteration', this.nextScreenHandler);
            screen.removeEventListener('animationIteration', this.nextScreenHandler);
        }
    }

    nextScreen(ev) {
        this.unbindEvent(this.screens[this.current_screen]);
        if(this.current_screen == this.screens.length-1) {
            this.dispatchEvent(new Event('finished'));
            try {
                eval(this.getAttribute('onfinished'));
            } catch(e) {
                console.log("Error",e);
            }
        }
        this.current_screen = (this.current_screen + 1) % this.screens.length;
        this.bindEvent(this.screens[this.current_screen]);
        this.setVisibility();
    }

    setVisibility() {
        this.screens.forEach((screen, idx) => {
            if (this.current_screen == idx) {
                screen.classList.add("active");
            } else {
                screen.classList.remove("active");
            }
        });
    }
}

if (!customElements.get('ag-intro')) {
    customElements.define('ag-intro', Intro);
}

class Credits extends HTMLElement {
    connectedCallback() {

        this.handler = this.finished.bind(this);

        this.scrollTarget = this.querySelector(".credits");
        console.log("BIND...");

        this.scrollTarget.addEventListener('webkitAnimationIteration', this.handler);
        this.scrollTarget.addEventListener('animationIteration', this.handler);
    }

    disconnectedCallback() {
        this.scrollTarget.removeEventListener('webkitAnimationIteration', this.handler);
        this.scrollTarget.removeEventListener('animationIteration', this.handler);
    }


    finished(ev) {
        console.log("FINISHED");
        try {
            eval(this.getAttribute('onfinished'));
        } catch (e) {
            console.log("Error", e);
        }
    }
}

if (!customElements.get('ag-credits')) {
    customElements.define('ag-credits', Credits);
}

class TextureLoader {
    static getInstance() {
        if (!TextureLoader.instance) {
            TextureLoader.instance = new TextureLoader();
        }
        return TextureLoader.instance;
    }

    getTextures(urls) {
        return Promise.all(urls.map(url=>this.getTexture(url)));
    }

    getTexture(url) {
        return new Promise((resolve, reject) => {
            THREE.ImageUtils.loadTexture(url, null, resolve, reject);
        })
    }
}

const Terrain = THREE.Terrain;

class TerrainBuilder {

    static createTerrain(options, scene, material, heightmap) {
        var options = Object.assign({width: 64, height: 64}, options);
        var xS = options.width - 1, yS = options.height - 1;

        if (!heightmap)
            heightmap = function (g, options) {
                console.log("OPTIONS", options);
                var xl = options.xSegments + 1,
                    yl = options.ySegments + 1;
                for (i = 0; i < xl; i++) {
                    for (j = 0; j < yl; j++) {
                        g[j * xl + i].z += Math.random() * 100;
                    }
                }
            };
        //material = null;
        let terrainScene = Terrain({
            easing: Terrain.Linear,
            frequency: 2.5,
            heightmap: heightmap,
            //after: heightmap,
            material: material || new THREE.MeshBasicMaterial({color: 0x5566aa}),
//          maxHeight: 100,
//          minHeight: -100,
//minHeight:0,//undefined,
//maxHeight:10, //undefined,
            steps: 1,
            useBufferGeometry: false,
            xSegments: xS,
            xSize: options.width,
            ySegments: yS,
            ySize: options.height,
            stretch: false,
            clamp: false
        });
        terrainScene.rotation.x = 0;
        terrainScene.children[0].rotation.x = -Math.PI/2;
        //terrainScene.children[0].rotation.y = Math.PI/8;
        terrainScene.position.x += options.width / 2;
        terrainScene.position.z -= options.width / 2;

        console.log("TS", terrainScene);
        // Assuming you already have your global scene
        scene.add(terrainScene);
        this.geo = terrainScene.children[0].geometry;
    }

    static async create(options, scene, heightmap) {
        TextureLoader.getInstance().getTextures(['models/sand1.jpg', 'models/grass1.jpg', 'models/stone1.jpg', 'models/snow1.jpg'])
            .then((textures) => {
                const blend = TerrainBuilder.generateMaterial(scene, ...textures);
                TerrainBuilder.createTerrain(options, scene, blend, heightmap);
            });
    }
    static generateMaterial(scene, t1,t2,t3,t4) {
        return Terrain.generateBlendedMaterial([
            {texture: t1},
            {texture: t2, levels: [-80, -35, 20, 50]},
            {texture: t3, levels: [20, 50, 60, 85]},
            {
                texture: t4,
                glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'
            },
        ], scene);
    }
}

//var projector = new THREE.Projector();
var raycaster = new THREE.Raycaster();

var Pick = {
    /*
    * mouse={x:12,y:12}
    * */
    pick: function (mouse, camera, scene) {
        // find intersections
        //
        // create a Ray with origin at the mouse position
        //   and direction into the scene (camera direction)
        //
        var vec = new THREE.Vector2();
        vec.x = mouse.rx;
        vec.y = mouse.ry;
        raycaster.setFromCamera(vec, camera);

        // create an array containing all objects in the scene with which the ray intersects
        // intersect recursive !!!
        var result = raycaster.intersectObjects(scene.children, true);
        return result;
    }
};

function addSkybox(scene) {
    THREE.ImageUtils.loadTexture('models/sky1.jpg', undefined, function (t1) {
        const skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(4096, 64, 64),
            new THREE.MeshBasicMaterial({map: t1, side: THREE.BackSide, fog: false})
        );
        scene.add(skyDome);
    });
}

class AntScene {
    constructor() {
        // http://squarefeet.github.io/ShaderParticleEngine/
        this.emitterSettings = {
            position: new THREE.Vector3(-1, 1, 1),
            positionSpread: new THREE.Vector3(0, 0, 0),

            acceleration: new THREE.Vector3(0, -0.1, 0),
            accelerationSpread: new THREE.Vector3(0.01, 0.01, 0.01),

            velocity: new THREE.Vector3(0, 0.7, 0),
            velocitySpread: new THREE.Vector3(0.3, 0.5, 0.2),

            colorStart: new THREE.Color(0xBBBBBB),

            colorStartSpread: new THREE.Vector3(0.2, 0.1, 0.1),
            colorEnd: new THREE.Color(0xAAAAAA),

            sizeStart: 0.5,
            sizeEnd: 4,
            opacityStart: 1,
            opacityEnd: 0.1,

            //particleCount: 2000,
            particlesPerSecond: 100,
            alive: 1
        };

        this.emitterSettings = {
            maxAge: 5,
            //type: Math.random() * 4 | 0,
            position: {
                value: new THREE.Vector3(-1,0,0)
            },
            acceleration: {
                value: new THREE.Vector3(0,
                    -0.2,
                    0
                ),
                spread: new THREE.Vector3(0,0.1,0)
            },
            velocity: {
                value: new THREE.Vector3(
                    0,
                    1.4,
                    0
                ),
                spread: new THREE.Vector3(0.3,0.7,0.3)
            },
/*
            rotation: {
                axis: new THREE.Vector3(
                    getRandomNumber(1),
                    getRandomNumber(1),
                    getRandomNumber(1)
                ),
                angle:
                    Math.random() * Math.PI,
                center:
                    new THREE.Vector3(
                        getRandomNumber(100),
                        getRandomNumber(100),
                        getRandomNumber(100)
                    )
            },


            wiggle: {
                value: Math.random() * 20
            },
            drag: {
                value: Math.random()
            },
            */
            color: {
                value: [new THREE.Color(0x333333),new THREE.Color(0x777777),new THREE.Color(0x888888)],
                spread: new THREE.Vector3(0.3,0,0)
            },

            size: {

                value: [0.5, 0.7, 1]
            },
            particleCount: 100,
            opacity: {
                value: [1, 0.8, 0.0]
            },
            depthTest: true,
        };

        this.scene = new THREE.Scene();

        this.particleGroup = AntScene.makeSPEGroup();

        this.particleGroup.addPool(10, this.emitterSettings, true);

        var emitter = this.particleGroup.getFromPool();
        emitter.position.value = new THREE.Vector3(-2,0,0);
        emitter.enable();
        emitter = this.particleGroup.getFromPool();
        emitter.position.value = new THREE.Vector3(-4,0,0);
        emitter.enable();

        //this.scene.background.add(new Color("red"))
        this.scene.add(this.particleGroup.mesh);
        this.scene.particleGroup = this.particleGroup;
        console.log("PARTICLE", this.particleGroup);


        // soft white light
        var light = new THREE.AmbientLight(0x302020);
        this.scene.add(light);

        // White directional light at half intensity shining from the top.
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(1, 0.7, 0.7);
        this.scene.add(directionalLight);

        addSkybox(this.scene);


        this.createCube(this.scene, 0, 0);
        this.createCube(this.scene, 0, 4);
        this.createCube(this.scene, 4, 0);

        this.meshes = {};
        this.entities = [];
    }

    static makeSPEGroup() {
        return new SPE.Group({
            texture: { value: THREE.ImageUtils.loadTexture('./images/smokeparticle.png') },
            //maxAge: 4,
            //blending: THREE.NormalBlending
        })
    }

    createCube(scene, x, y) {
        var geometry = new THREE.BoxGeometry();
        var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x += x;
        cube.position.z += y;
        scene.add(cube);
    }

    tick(delta) {
        if (delta) {
            this.particleGroup.tick(delta);
        }
    }

    add(node) {
        //    this.entities.push(entity)

        console.log("ADD", node);
        this.scene.add(node);
    }

    remove(node) {
        this.scene.remove(node);
    }

    makeEmitter(pos) {
        return new SPE.Emitter(this.emitterSettings);
    }

    destroy() {
        this.destroyed = true;
    }
}

const clock = new THREE.Clock();

const clock$1 = new THREE.Clock();

class View  {
    constructor(el) {
        console.log("EL", el, this);
        this.el = el;
        this.renderer = new THREE.WebGLRenderer();

        // fixme: use el size
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        el.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
        this.setSize();

        this.camera.rotation.x = -(10 + 32) * Math.PI / 180;
        this.destroyed = false;
    }

    setSize() {
        this.camera.aspect = this.el.offsetWidth / this.el.offsetHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.el.offsetWidth, this.el.offsetHeight);
    }

    render(scene, options) {
        var lastTime = 0;
        console.log("RENDER", scene, options);

        var dorender= ()=> {
            // stop this rendering - because the scope / canvas is destroyed
            if (!this.destroyed) {
                if (this.hidden) {
                    setTimeout(dorender, 50);
                } else {
                    setTimeout(function () {
                        requestAnimationFrame(dorender);
                    }, 50);
                }
            }
            var time = (new Date()).getTime();
            var timeDiff = time - lastTime;
            lastTime = time;

            var delta;

            delta = timeDiff * 0.001;

            if (delta > 0.1)
                delta = 0.1;
            if (options && options.frameCallback)
                options.frameCallback(delta);

            scene.tick(delta);
            // animate Collada model

            //THREE.AnimationMixer.update(delta);
            this.renderer.render(scene.scene, this.camera);
        };

        requestAnimationFrame(dorender);
    }

    updateCamera(viewCenter, h) {
        this.camera.position.x = viewCenter.x;
        this.camera.position.y = viewCenter.z + h;
        this.camera.position.z = - viewCenter.y + viewCenter.z;
    }
}

/**
 * Gameview contains scene, view,
 */
class AgGameView extends HTMLElement {
  connectedCallback() {
    this.setupThree();

    this.controlProgress = true;
    if (this.getAttribute("control-progress")) {
      this.controlProgress = true;
    }

    console.log("AgGameView connected");

    window.addEventListener("resize", this.updateSize.bind(this));
    this.addEventListener("mousedown", this.mousedown.bind(this));
    this.addEventListener("mouseup", this.mouseup.bind(this));
    this.addEventListener("mousemove", this.mousemove.bind(this));
    this.addEventListener("wheel", this.wheel.bind(this));
    this.addEventListener("click", this.click.bind(this));
    this.addEventListener("world", this.worldCreated.bind(this));
    document.addEventListener("keydown", this.keydown.bind(this));
    document.addEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));

    this.viewCenter = {x: 0, y: 0, z: 10};

    this.moves = 0;
    this.view = new View(this);
    this.updateSize({target: window});

    this.updateCamera();
  }

  frameCallback(e) {
    this.tick(e);
    // this.scene.tick()
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.updateSize.bind(this));
    this.removeEventListener("mousedown", this.mousedown.bind(this));
    this.removeEventListener("mouseup", this.mouseup.bind(this));
    this.removeEventListener("mousemove", this.mousemove.bind(this));
    this.removeEventListener("wheel", this.wheel.bind(this));
    this.removeEventListener("click", this.click.bind(this));
    this.removeEventListener("world", this.worldCreated.bind(this));
    document.removeEventListener("keydown", this.keydown.bind(this));
    document.removeEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));
    view.destroyed = true;
  }

  async worldCreated(e) {
    this.world = e.world;
    const map = this.world.map;

    const threeHeightMap = map.toThreeTerrain();

    TerrainBuilder.create(map, this.scene, threeHeightMap);

    // FIXME: load all models beforehand
    await this.world.initScene(this.scene);
    this.startRenderLoop();
    this.updateCamera();
  }

  startRenderLoop() {
    this.view.render(this.scene, {frameCallback: this.frameCallback.bind(this)});
  }

  getVisibilityChangeEvent() {
    var hidden, visibilityChange;
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }
    return {visibilityChange, hidden};
  }

  setupThree() {
    this.scene = new AntScene(this.scene);
  }

  tick(delta) {
    if (this.controlProgress && !this.world.pause) {
      this.world.tick(delta);
    }
  }

  visibilityChange(ev) {
    if (ev.target[this.getVisibilityChangeEvent().hidden]) {
      world.pause = true;
      // hidden
    } else {
      world.pause = false;
      // visible
    }
  }

  updateSize(ev) {
    this.view.setSize({});
    this.containerWidth = ev.target.innerWidth;
    this.containerHeight = ev.target.innerHeight;
  }

  mouseup(e) {
    this.mouseisdown = false;
  }

  mousedown(e) {
    this.mouseisdown = true;
    this.ox = e.pageX;
    this.oy = e.pageY;
    this.moves = 0;
  }

  wheel(e) {
    this.viewCenter.z += e.deltaY * 0.1;
    if (this.viewCenter.z < 5) {
      this.viewCenter.z = 5;
    }
    this.updateCamera();
  }

  click(e) {
    //FIXME: move to world
    console.log("CLICK", e);
    const world = this.world;
    if (!world) {
      return;
    }
    if (world.hoveredEntity) {
      world.select(world.hoveredEntity);
    } else if (world.selectedEntity && world.selectedEntity.pushJob && world.selectedEntity.isA("hero") && world.selectedEntity.player == "human") {
      console.log("assign new move job");
      world.selectedEntity.resetJobs();
//          world.selectedEntity.pushJob(new Jobs.ml.Move(world.selectedEntity,lastPos));
      world.selectedEntity.pushHlJob(new Jobs.hl.Move(world.selectedEntity, lastPos));
    }
    console.log("SCENE", this.scene);
  }

  mousemove(e) {
    e.preventDefault();
    e.stopPropagation();
    this.moves += 1;
    if (this.mouseisdown) {
      const width = this.offsetWidth;
      const height = this.offsetHeight;
      this.move({dx: (e.pageX - this.ox) / width, dy: (e.pageY - this.oy) / height});
      this.ox = e.pageX;
      this.oy = e.pageY;
    }
    this.hover({
      x: e.pageX,
      y: e.pageY,
      rx: e.pageX / this.containerWidth * 2 - 1,
      ry: -e.pageY / this.containerHeight * 2 + 1,
    });
  }

  hover(mouse) {
    if (!this.world) {
      return;
    }
    var res = Pick.pick(mouse, this.view.camera, this.scene.scene);

    if (res.length > 0) {
      let entity = res[0].object.userData.entity;
      if (!entity) {
        entity = res[0].object.parent.userData.entity;
      }
      this.world.hover(entity);

      if (!entity) {
        this.lastPos = new THREE.Vector2().copy(res[0].point);
      }
    }
  }

  move(d) {
    this.viewCenter.x -= d.dx * this.viewCenter.z * 3;
    this.viewCenter.y += d.dy * this.viewCenter.z * 3;

    this.updateCamera();
  }

  updateCamera() {
    // FIXME: move to world
    var h;

    if (this.world && this.world.map) {
      h = this.world.map.get("rock").interpolate(this.viewCenter.x, this.viewCenter.y + this.viewCenter.z / 2);
    }
    if (h > 50 || h < 50) {
      h = 0;
    }

    this.view.updateCamera(this.viewCenter, h);
  }

  keydown(e) {
    console.log("KEYdown", e);
    if (e.keyCode == 27) {
      world.select(null);
    }
  }
}


if (!customElements.get('ag-game-view')) {
  customElements.define('ag-game-view', AgGameView);
}

// shamelessly stolen from https://davidwalsh.name/pubsub-javascript
// http://opensource.org/licenses/MIT license

class Events {
    constructor() {
        this.listeners = [];
    }

    subscribe(listener) {

        const listeners = this.listeners;

        // Add the listener to queue
        const index = listeners.push(listener) - 1;

        // Provide handle back for removal of topic
        return {
            remove: function() {
                delete listeners[index];
            }
        };
    }

    publish(info) {
        // Cycle through topics queue, fire!
        this.listeners.forEach((item)=> {
            item(info != undefined ? info : {});
        });
    }
}

class World {
  constructor(map) {
    this.map = map;
    this.entities = [];
    this.entitiesByType = {};
    if (!window.World)
      window.World = this;

    this.hovered = new Events();
    this.selected = new Events();
  }

  get width() {
    return this.map.width;
  }

  get height() {
    return this.map.height;
  }

  push(entity) {
    entity.world = this;
    this.entities.push(entity);
    if (!entity.mixinNames)
      console.warn("No mixins for ", entity);
    else {
      entity.mixinNames.forEach((name) => {
        if (!this.entitiesByType[name])
          this.entitiesByType[name] = [];
        this.entitiesByType[name].push(entity);
      });
    }
  }

  search(param, origin) {
    return _.chain(this.entities).filter((e) => {
      if (param instanceof Function) {
        return param(e);
      } else {
        for (var name in param) {
          var val = param[name];
          if (val instanceof Object) {
            console.log("OBJ", val);
          } else {
            if (e[name] instanceof Array) {
              if (!_.contains(e[name], val))
                return false;
            } else if (e[name] instanceof Object) {
              if (!e[name][val])
                return false;
            } else if (e[name] != val)
              return false;
          }
        }
      }
      return true;
    }).sortBy((e) => {
      if (origin instanceof THREE.Vector3)
        return e.pos.distanceTo(origin);
      return 1;
    }).value();
  }

  async initScene(scene) {
    console.log("=== initScene");
    this.entities.forEach(async e => {
      await e.setScene(scene);
    });
  }

  hover(entity) {
    if (this.hoveredEntity)
      this.hoveredEntity.hovered(false);

    this.hoveredEntity = entity;
    if (this.hoveredEntity) {
      this.hoveredEntity.hovered(true);
      this.hovered.publish(entity);
    }
  }

  select(entity) {
    if (this.selectedEntity)
      this.selectedEntity.selected(false);
    this.selectedEntity = entity;
    if (this.selectedEntity) {
      this.selectedEntity.selected(true);
      this.selected.publish(entity);
    }
  }

  getSelectedHero() {
    if (!this.selectedHero) {
      this.selectedHero = this.search({player: "human"})[0];
    }
    return this.selectedHero;
  }

  tick(delta) {
    this.entities.forEach((entity) => {
      if (entity.tick) {
        entity.tick(delta);
      }
    });
  }
}

var ArrayType = window.Float64Array || window.Array;

function createMap(w, h) {
  return new ArrayType(w * h);
}

class HeightMap {
  constructor(options) {
    this.options = Object.assign({
      width: 256,
      height: 256,
      map: {}
    }, options);

    this.map = this.options.map;

    if (!this.map.rock) {
      this.map.rock = createMap(this.options.width, this.options.height);
      this.generate();
    }
  };

  get width() {
    return this.options.width;
  }

  get height() {
    return this.options.height;
  }

  generate() {
    var x, y;
    var rock = this.get("rock");
    for (x = 0; x < this.options.width; x++)
      for (y = 0; y < this.options.height; y++) {
        var val = Math.sin(x * 0.3) + Math.sin(y * 0.15) * 2.0;///this.options.width;
        rock(x, y, val);
      }
  };

  get(type) {
    var w = this.options.width;
    var array = this.map[type];

    var fct = function (x, y, val) {
      var i = x + w * y;
      if (val)
        return array[i] = val;
      return array[i];
    };

    fct.interpolate = function (x, y) {
      var fx = Math.floor(x);
      var fy = Math.floor(y);
      var v00 = this(fx, fy);
      var v01 = this(fx, fy + 1);
      var v10 = this(fx + 1, fy);
      var v11 = this(fx + 1, fy + 1);
      var dx = x - fx;
      var dy = y - fy;
      return (v00 * (1 - dx) + v10 * dx) * (1 - dy) + (v01 * (1 - dx) + v11 * dx) * dy;
    };

    return fct;
  };

  pickGreen(w, h, data) {
    var a = new Array(w * h);
    var x, y;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        a[y * w + x] = data[(y * w + x) * 4 + 1] * 0.2;
      }
    }
    return a;
  };


  toThreeTerrain() {
    var self = this;
    return function (g, options) {
      const xl = options.xSegments + 1,
        yl = options.ySegments + 1;
      const rock = self.get("rock");
      for (let i = 0; i < xl; i++) {
        for (let j = 0; j < yl; j++) {
          g[(yl - j - 1) * xl + i].z += rock(i, j);
        }
      }
    };
  };

  /*
      toTexture() {
          // UNTESTED !!!!
          var rampTex = new THREE.DataTexture(data.pixels, data.width, data.height, THREE.RGBAFormat);
          rampTex.needsUpdate = true;
      };
  */

// FIXME this should moved somewhere else
  toCanvas(_type) {
    var type = _type || "rock";
    var canvas = document.createElement('canvas'),
      context = canvas.getContext('2d');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    var d = context.createImageData(canvas.width, canvas.height),
      data = d.data;
    var min, max;
    var accessor = this.get(type);
    for (var y = 0; y < this.options.height; y++) {
      for (var x = 0; x < this.options.width; x++) {
        var v = accessor(x, y);

        if (!min || min > v)
          min = v;
        if (!max || max < v)
          max = v;
      }
    }
    console.log("MMMM", min, max);

    for (var y = 0; y < this.options.height; y++) {
      for (var x = 0; x < this.options.width; x++) {
        var i = y * this.options.height + x;
        idx = i * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = Math.round(((accessor(x, y) - min) / (max - min)) * 255);
        data[idx + 3] = 255;
      }
    }
    context.putImageData(d, 0, 0);
    return canvas;
  }
}

function ajax(url, method = "GET", data = {}) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = () => {
            if (request.readyState === XMLHttpRequest.DONE) {

                if (request.status <= 299 && request.status !== 0) {
                    console.log("RESPONSE", request, typeof request.response);
                    var result = request.response;
                    try {
                        result = JSON.parse(result);
                    } catch (e) {

                    }

                    resolve(result);
                } else {
                    reject(request);
                }
            }
        };

        request.onerror = () => {
            reject(Error('Network Error'));
        };

        request.open(method, url, true);

        request.send(data);
    });
}

/** simplified version of THREE.Vector2. */

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  trunc(minx, miny, maxx, maxy) {
    return new Vector2(
      this.x < minx ? minx : (this.x > maxx ? maxx : this.x),
      this.y < miny ? miny : (this.y > maxy ? maxy : this.y),
    )
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v) {
    if (!v) {
      throw "Vector v not defined";
    }
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  distanceTo(v) {
    const dx = v.x - this.x, dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy)
  }

  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  }

  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }

  normalize() {
    return this.divideScalar(this.length() || 1);
  }

  divideScalar(s) {
    this.x /= s;
    this.y /= s;
    return this;
  }

  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

var uid = 11110;

class Entity {
  constructor(heightmap, ops) {

    var entity = ops.entityTypes[ops.type];
    if (!entity) {
      console.warn("Entity: No Entity-Type named " + ops.type + " found!");
      entity = {};
    }
    Object.assign(this, entity);
    Object.assign(this, ops);
    // FIXME: reduce complexity and references by removing models, map and so ???
    this.state = {};
    this.pos = new Vector2().copy(this.pos);
    this.typeName = this.type;
    this.uid = uid++;
    this.map = heightmap;
    // clone
    this.resources = Object.assign({}, this.resources);
    this.type = entity;
    if (!this.meshName)
      this.meshName = "default";

    if (entity.mixins) {
      this.mixins = {};
      this.mixinNames = [];
      this.mixinDef = entity.mixins;
      console.log("MIXINDEFS", ops.mixinDefs);
      entity.mixins.forEach(mixin => {
        var found = ops.mixinDefs[mixin];
        if (found) {
          found = found();
          this.mixins[mixin] = found;
          this.mixinNames.push(mixin);
          Object.assign(this, found);
          console.log("FOUND",found,this);
        } else {
          console.log("Mixin not found", mixin);
        }
      });
    }
  };

  get id() {
    return this.uid
  }

  runPostLoad() {
    for (var mixin in this.mixins) {
      if (this.mixins[mixin].postLoad) {
        this.mixins[mixin].postLoad.apply(this, []);
      }
    }
  }

  isA(mixin) {
    return this.mixinDef.indexOf(mixin) >= 0;
  }

  async setScene(scene) {
    this.scene = scene;
    return await this.setMesh(this.meshName);
  };

  computeMeshPos() {
    const h = this.map.get("rock").interpolate(this.pos.x, this.pos.y);
    return {x: this.pos.x, y: h, z: -this.pos.y};
  }

  updateMeshPos() {
    if (this.mesh) {
      if (this.mesh && this.mesh.rotation && this.rotation) {
        this.mesh.rotation.y = this.rotation;
      }
      const position = this.computeMeshPos();
      this.mesh.setPos(position.x, position.y, position.z);
    }
  };

  getMeshDef() {
    const entity = this.type;
    var meshType;
    var animation;

    if (this.type.meshes) {
      var def = entity.meshes[this.meshName];
      if (!def)
        console.warn("No Mesh of name '" + name + "' found in entity-def", entity);
      meshType = def.mesh;
      animation = def.animation;
    } else if (entity.mesh) {
      meshType = entity.mesh;
    } else {
      meshType = this.typeName;
    }
    return {meshType, animation};
  }

  setMesh(name) {

    if(name) {
      this.meshName = name;
    }

    const {meshType, animation} = this.getMeshDef();

    return this.modelLoader.load(meshType, animation).then((mesh) => {
      console.log("MODEL loaded", mesh, meshType, animation, this.scene);
      mesh.attachToScene(this.scene);
      //, this, self.scene, (mesh) => {

      if (this.mesh) {
        this.mesh.remove();
      }
      this.mesh = mesh;
      mesh.setEntity(this);
      this.updateMeshPos();
      if (this.animationFinished) {
        this.mesh.animationFinished = this.animationFinished.bind(this);
      }
      this.mesh.hovered(this.state.hovered);
      this.mesh.selected(this.state.selected);
      return this
    });
  };

  hovered(val) {
    return this.mesh.hovered(this.state.hovered = val);
  };

  selected(val) {
    return this.mesh.selected(this.state.selected = val);
  };

  increaseBy(what, amount) {
    this.resources[what] = (this.resources[what] || 0) + amount;
  };

  take(what, amount) {
    if (this.resources[what] >= amount) {
      this.resources[what] -= amount;
      return true;
    }
    return false;
  };

  give(what, amount, toEntity) {
    if (this.resources[what] >= amount) {
      this.resources[what] -= amount;
      console.debug("GIVE TO", toEntity, what);
      toEntity.resources[what] = (toEntity.resources[what] || 0) + amount;
      return true;
    }
    return false;
  }
}

var Meshes = {
  "bakery": {
    "mesh": "bakery3"
  },
  "big_stone": {
    "mesh": "big_stone3"
  },
  "crop_small": {
    "transparent": true,
    "scale": 2.2
  },
  "crop_med": {
    "transparent": true,
    "scale": 2.2
  },
  "crop_high": {
    "transparent": true,
    "scale": 2.2
  },
  "crop_tiny": {
    "mesh": "crop_tiny2",
    "transparent": true,
    "scale": 2.2
  },
  "farm": {
    "mesh": "farm2"
  },
  "fishing_hut": {
    "mesh": "fishing_hut2",
  },
  "grave": {
    "mesh": "grave2"
  },
  "hero": {
    "mesh": "hero_lp2"
  },
  "mine": {
    "mesh": "mine3"
  },
  "mill": {
    "mesh": "mill",
    "scale": 1
  },
  "townhall": {
    "mesh": "townhall_try3"
  },
  "tower": {
    "mesh": "tower2"
  },
  "man_pick": {
    "mesh": "man_pick",
    "texture": "man_fight.png",
    "scale": 0.07,
    "type": "json",
    "animations": {
      "pick": {
        "timeScale": 45,
        "startFrame": 1,
        "endFrame": 48,
        "events": [
          {
            "time": 35,
            "name": "pick"
          }
        ]
      }
    }
  },
  "man_axe": {
    "mesh": "man_axe",
    "texture": "man_fight.png",
    "scale": 0.07,
    "type": "json",
    "rotation": {
      "x": "3.14*0.5"
    },
    "animations": {
      "pick": {
        "timeScale": 40,
        "startFrame": 1,
        "endFrame": 35,
        "events": [
          {
            "time": 27,
            "name": "pick"
          }
        ]
      }
    }
  },
  "man_e_walk": {
    "mesh": "man_e_walk",
    "scale": 0.07,
    "type": "json",
    "rotation": {
      "x": "3.14*0.5"
    },
    "animations": {
      "sit": {
        "timeScale": 30,
        "startFrame": 20,
        "endFrame": 20,
        "animate": false
      },
      "sitdown": {
        "timeScale": 25,
        "startFrame": 1,
        "endFrame": 18,
        "loop": false
      },
      "stand": {
        "timeScale": 25,
        "startFrame": 40,
        "endFrame": 40
      },
      "walk": {
        "timeScale": 30,
        "startFrame": 45,
        "endFrame": 65
      },
      "default": {
        "timeScale": 10,
        "startFrame": 45,
        "endFrame": 65
      }
    }
  },
  "man_fight": {
    "mesh": "man_fight",
    "scale": 0.07,
    "type": "json",
    "rotation": {
      "x": "3.14*0.5"
    },
    "animations": {
      "fight": {
        "startFrame": 1,
        "endFrame": 41,
        "timeScale": 25,
        "events": [
          {
            "time": 18,
            "name": "sword"
          },
          {
            "time": 35,
            "name": "sword"
          },
          {
            "time": 20,
            "name": "ugh"
          }
        ]
      }
    }
  },
  "fir": {
    "mesh": "fir4"
  },
  "fir_old": {
    "mesh": "fir2",
    "texture": "fir5.png",
    "scale": 0.42,
    "doublesided": true,
    "transparent": true
  },

  "tree": {
    "mesh": "tree5",
    "scale": 0.2,
    "doublesided": true
  },
  "sheep": {
    "scale": 0.15,
//    "type": "json",
    "rotation": {
      "x": "3.14*0.5"
    },
    "texture": "sheep.png",
    "animations": {
      "default": {
        "timeScale": 25,
        "startFrame": 1,
        "endFrame": 45
      },
      "eat": {
        "timeScale": 25,
        "startFrame": 1,
        "endFrame": 45,
        "loop": false
      },
      "walk": {
        "timeScale": 60,
        "startFrame": 45,
        "endFrame": 100
      }
    }
  },
  "well": {
    "mesh": "well"
  },
  "workshop": {
    "mesh": "workshop2",
    "particles": {
      "smoke": {
        "position": {
          "x": 0,
          "y": 0,
          "z": 0
        }
      }
    }
  }
};

class Model {
    constructor(innerMeshes, outerNode, hoverRing, selectRing) {
        this.innerMeshes = innerMeshes;
        this.outerNode = outerNode;
        this.position = this.outerNode.position;
        this.rotation = this.outerNode.rotation;
        this.hoverRing = hoverRing;
        this.selectRing = selectRing;
    }

    attachToScene(scene) {
        this.scene = scene;
        {
            scene.add(this.outerNode);
        }
    }

    setEntity(entity) {
        _.each(this.innerMeshes, function (m) {
            m.userData.entity = entity;
        });

    }

    hovered(val) {
        if (val === true || val === false) {
            this.hoverRing.visible = val;
        }
        return this.hoverRing.visible;
    }

    selected(val) {
        if (val === true || val === false) {
            this.selectRing.visible = val;
        }
        return this.selectRing.visible;
    }

    detachFromScene() {
        scene.remove(this.outerNode);
    }

    setPos(x, y, z) {
        this.outerNode.position.x = x;
        this.outerNode.position.y = y;
        this.outerNode.position.z = z;
    }

    enableParticles(type) {
        if (!this.emitter) {
            console.log("model - ENABLE");
            var emitter = this.emitter = this.scene.particleGroup.getFromPool(); //addEmitter( Base.makeEmitter(new THREE.Vector3(0,0,0)));
            emitter.position.value = this.position;
            emitter.enable();
        }
    }

    disableParticles(type) {
        if (this.emitter) {
            this.emitter.disable();
            console.log("model - DISABLE", type);
            delete this.emitter;
        }
    }

    remove() {
        console.log("REMOVE ME FROM SCENE", this);
        // hook to remove animation-restarter-interval
        if (this.innerMeshes && this.innerMeshes.length > 0) {
            _.each(this.innerMeshes, function (m) {
                if (m.beforeRemove)
                    m.beforeRemove();
            });
        }
        this.scene.remove(this.outerNode);
        delete this.outerNode;
    }
}

// FIXME: not needed anymore?
function ensureLoop(animation) {
  return;
}

class ModelLoader {

  constructor(loaders = {}, manager = null, meshes = null) {
    Object.assign(this, _.pick(loaders, ['objLoader', 'jsonLoader', 'imageLoader']));

    if (!manager && THREE.LoadingManager) {
      manager = new THREE.LoadingManager();
    }
    if (meshes != null) {
      this.meshes = meshes;
    } else {
      this.meshes = Meshes;
    }
    manager.onProgress = function (item, loaded, total) {
      console.debug("manager.onProgress", item, loaded, total);
    };

    if (!this.jsonLoader) ;
    if (!this.imageLoader && THREE.ImageLoader) {
      this.imageLoader = new THREE.ImageLoader(manager);
    }

    if (!this.gltfLoader && THREE.GLTFLoader) {
      this.gltfLoader = new THREE.GLTFLoader();
    }

    // FIXME: add caching later on

    if (!this.textureLoader && THREE.TextureLoader) {
      this.textureLoader = new THREE.TextureLoader();
    }
  }

  static createRing(color) {
    const material = new THREE.MeshLambertMaterial({
      color: color,
      flatShading: THREE.FlatShading,
      transparent: true,
      opacity: 0.5
    });
    const hoverRing = new THREE.Mesh(new THREE.RingGeometry(1.3, 2, 20, 5, 0, Math.PI * 2), material);
    hoverRing.position.set(0, 0, 0.2);
    hoverRing.rotateOnAxis(new THREE.Vector3(1, 0, 0), -1.6);
    hoverRing.visible = false;
    return hoverRing
  }

  static createBox() {
    const material = new THREE.MeshLambertMaterial({
      color: 0xdd9900,
      flatShading: THREE.FlatShading,
      transparent: true,
      opacity: 0.5
    });
    return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  }

  async load(meshName, animationName) {
    return this.loadUncached(meshName, animationName).then(this.packIntoNode.bind(this))
  }

  async packIntoNode(options) {
    const {meshDef, mesh, meshName} = options;
    var objects;
    if (mesh.scene) {
      objects = mesh.scene;
    } else {
      objects = mesh.clone();
    }
    //let objects = mesh.scene

    objects = _.flatten([objects]);

    // enclose mesh within scene-node, so that it can be rotated and there can be several meshes
    // attached to one entity
    const node = new THREE.Object3D();

    _.each(objects, function (object) {
      node.add(object);
    });
    const newModel = new Model(objects, node);

    newModel.name = mesh;
    newModel.type = meshName;

    this.addRings(node, newModel);

    return newModel
  }

  addRings(node, newModel) {
    node.add(newModel.hoverRing = ModelLoader.createRing(0xdd9900));
    node.add(newModel.selectRing = ModelLoader.createRing(0xFF9900));
  }

  async loadUncached(mesh, animation) {
    const meshDef = this.meshes[mesh];
    if (!meshDef) {
      console.warn("No Mesh defined for name '" + mesh + "'");
    }
    const loadFct = (meshDef.type === "json") ? "loadJSON" : "loadObjComplete";

    if (loadFct == "loadJSON") {
      //FIXME
      return new Promise(_.identity);
    }

    return this[loadFct](mesh, animation)
  }


  async loadObj(meshName) {
    return new Promise((resolve, reject) => {

      if (this.gltfLoader) {
        this.gltfLoader.load(
          'models/' + meshName + '.gltf',
          mesh => {
            resolve({mesh, meshName});
          },
          (xhr) => {
            console.log(meshName + " " + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          reject);
      } else {
        this.objLoader.load(
          'models/' + meshName + '.obj',
          mesh => {
            resolve({mesh, meshName});
          },
          null,
          reject);
      }
    });
  }

  async loadObjComplete(name, dummy) {
    const meshDef = this.meshes[name];
    const meshName = (meshDef && meshDef.mesh) || name;
    console.log("Load texture", name, meshName);
    const meshObject = await this.loadObj(meshName);

    console.log("MODELOBJECT ", name, meshObject);

    return Object.assign({meshDef}, meshObject);
  }

  // animate (cloned) mesh
  animate(mesh, name, options) {
    const animation = new THREE.Animation(mesh, animations[name]);
    animation.data = animations[name];
    const scale = options.timeScale || 1;

    if (options.loop === false) {
      animation.loop = false;
    }
    animation.timeScale = scale;
    animation.play();

    // implement support for looping interval within global animation
    // have a look at entity also
    if (options.startFrame) {
      //animation.update( options.startFrame);
      if (options.animate === false && false) {
        animation.stop();
        animation.update(options.startFrame, 1);
      } else if (options.endFrame) {
        var startAnimation = function () {
          animation.play(options.startFrame, 1);
        };
        var stopAnimation = function () {
          console.debug("ANIMAL stopANimation", mesh, mesh.animationFinished);
          animation.stop();
          if (mesh.userData && mesh.userData.entity && mesh.userData.entity.animationFinished)
            mesh.userData.entity.animationFinished();
        };
        var time = 1000 * (options.endFrame - options.startFrame) / scale;
        startAnimation();
        if (options.loop !== false) {
          var interval = setInterval(startAnimation, time);
          mesh.beforeRemove = function () {
            animation.stop();
            clearInterval(interval);
          };
        } else {
          console.debug("ANIMAL DONT LOOP", arguments);
          var timeout = setTimeout(stopAnimation, time);
          mesh.beforeRemove = function () {
            animation.stop();
            clearTimeout(interval);
          };
        }

      }
    } else
      animation.update(Math.random() * 10);
  }

  loadJSON(name, animation) {
    var options = Object.assign({}, this.meshes[name]);

    // now override with options from animations-part
    if (options.animations[animation]) {
      options = Object.assign(options, options.animations[animation]);
    }

    return new Promise((resolve, reject) => {
      console.debug("Loading model", name);

      var texture = new THREE.Texture();
      this.jsonLoader.load('models/' + name + '.json', function (geometry, materials) {

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        ensureLoop(geometry.animation);
        for (var i = 0, il = materials.length; i < il; i++) {

          var originalMaterial = materials[i];
          console.debug("MAT", originalMaterial);
          originalMaterial.skinning = true;
          if (options.doublesided) {
            //  originalMaterial.side = THREE.DoubleSide;
            console.debug("DOUBLE");
          }
        }

        var material = new THREE.MeshFaceMaterial(materials);
        if (options.doublesided)
          material.side = THREE.DoubleSide;

        if (options.wireframe) {
          material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: 'blue'
          });
        }
        if (options.defaultMaterial) {
          material = new THREE.MeshLambertMaterial({
            color: 'blue'
          });
        }

        var mesh = new THREE.SkinnedMesh(geometry, material, false);

        animations[name] = geometry.animation;

        resolve(mesh);
      }, null, reject);
    });
  }
}

class Job {
    constructor(entity) {
        this._entity = entity;
        this._ready = false;
    }

    get ready() {
        return this._ready;
    }

    get entity() {
        return this._entity
    }

    setReady() {
        this._ready = true;
    }
}

class Angle {
  static fromVector2(dir) {
    return -Math.atan2(dir.x, dir.y) + Math.PI;
  }
}

var tmpDir = new Vector2();

class Move extends Job {
  constructor(entity, pos, distance) {
    super(entity);
    this.speed = entity.speed || 1;
    this.lltargetPos = pos;
    this.distance = distance || 0;
  }

  onFrame(delta) {
    var e = this.entity;
    if (this.lltargetPos) {

      var distance = this.lltargetPos.distanceTo(e.pos);
      var togo = delta * this.speed;

      distance -= this.distance;
      tmpDir.subVectors(this.lltargetPos, e.pos).setLength(togo);

      e.rotation = Angle.fromVector2(tmpDir);
      if (distance < togo) {
        if (this.distance > 0) {
          e.pos = new Vector2().copy(this.lltargetPos).add(new Vector2().subVectors(this.lltargetPos, e.pos).setLength(-this.distance));
        } else {
          e.pos = new Vector2().copy(this.lltargetPos);
        }

        e.updateMeshPos();
        delete this.lltargetPos;
        this.setReady();
        // return rest time
        return (togo - distance) / this.speed;
      } else {
        e.pos.add(tmpDir);
      }

      e.updateMeshPos();
    } else {
      console.error("ERROR: no lltargetpos defined");
      // use this maybe for following other entities
    }
    return -1;
  }
}

let animal = {
  onNoJob: function (delta) {
    console.log("ON NO JOB");
    if (this.shouldWalk()) {
      this.setMesh("walk");
      let targetPos = new Vector2(Math.random() * 2 - 1,
        Math.random() * 2 - 1).add(this.pos);

      if (this.world) {
        targetPos = targetPos.trunc(0, 0, this.world.width, this.world.height);
      }
      this.pushJob(new Move(this, targetPos));
    } else {
      this.playAnimation("eat");
    }
  },
  shouldWalk: function () {
    return (Math.random() < 0.5);
  }
};

const Animal = () => animal;

class RestJob extends Job {
    constructor(entity, time) {
        super(entity);
        this.time = time;
        this.doneTime = 0;
    }

    // maybe implement using setTimeout ?
    onFrame(delta) {
        this.doneTime += delta;
        if (this.doneTime > this.time) {
            this.setReady();
            return this.doneTime - this.time;
        }
        return -1;
    }
}

let job = {
  jobs: null,
  pushJob: function (job) {
    if (!this.jobs)
      this.jobs = [];
    if (this.jobs[this.jobs.length - 1] && this.jobs[this.jobs.length - 1].ready) {
      throw "Job is ready - dont' push!";
    }
    this.jobs.push(job);
    this.updateCurrentJob();
    if (this.currentJob.init)
      this.currentJob.init();
  },
  resetNonHlJobs: function () {
    if (this.jobs)
      this.jobs = _.filter(this.jobs, function (job) {
        return job.assignMeJob;
      });
  },
  resetJobs: function () {
    this.jobs = [];
    this.updateCurrentJob();
  },
  updateCurrentJob: function () {
    if (this.jobs)
      this.currentJob = this.jobs[this.jobs.length - 1];
  },
  tick: function (delta) {
    while (this.jobs && delta > 0 && this.jobs.length > 0) {
      var job = this.jobs[this.jobs.length - 1];
      delta = job.onFrame(delta);
      if (job.ready) {
        if (job.assignMeJob) {
          console.log("JOB READY!!!", this.jobs);
        }
        this.jobs.pop();
        this.updateCurrentJob();
      }
    }
    if (delta > 0) {
      if (this.onNoJob) {
        this.onNoJob(delta);
      }
    }
  },
  playAnimation: function (name) {
    //FIXME: set back to 20 (?)
    this.pushJob(new RestJob(this, 2));
    this.setMesh(name);
  },
  animationFinished: function () {
    this.resetJobs();
  }
};

const Job$1 = () => job;



var Mixin = /*#__PURE__*/Object.freeze({
__proto__: null,
animal: Animal,
job: Job$1
});

var EntityTypes = {
  "bakery": {
  },
  "crop": {
    "meshName": "tiny",
    "meshes": {
      "high": {
        "mesh": "crop_high"
      },
      "med": {
        "mesh": "crop_med"
      },
      "small": {
        "mesh": "crop_small"
      },
      "tiny": {
        "mesh": "crop_tiny"
      }
    }
  },
  "mill": {
  },
  "mine": {
  },
  "farm": {
  },
  "grave": {
  },
  "well": {
    "provides": [
      "water"
    ],
    "resources": {
      "water": 100
    }
  },
  "fishing_hut": {
    "mixins": [
      "boss",
      "job"
    ]
  },
  "workshop": {
    "needed": {
      "wood": 1,
      "stone": 1,
      "water": 1,
      "food": 1,
      "tool": 10
    },
    "production": {
      "tool": {
        "wood": 1,
        "stone": 1
      }
    },
    "mixins": [
      "boss",
      "job",
      "house",
      "smoke"
    ]
  },
  "townhall": {
    "needed": {
      "wood": 1,
      "stone": 1,
      "water": 1,
      "food": 1
    },
    "mixins": [
      "boss",
      "job",
      "house"
    ]
  },
  "hero": {
    "mixins": [
      "boss",
      "hero",
      "job",
      "player",
    ]
  },
  "tower": {
    "mixins": [
      "boss",
      "job",
      "house"
    ]
  },
  "man": {
    "meshes": {
      "sit": {
        "mesh": "man_e_walk",
        "animation": "sit"
      },
      "sitdown": {
        "mesh": "man_e_walk",
        "animation": "sitdown"
      },
      "stand": {
        "mesh": "man_e_walk",
        "animation": "stand"
      },
      "walk": {
        "mesh": "man_e_walk",
        "animation": "walk"
      },
      "default": {
        "mesh": "man_e_walk",
        "animation": "stand"
      },
      "fight": {
        "mesh": "man_fight",
        "animation": "fight"
      },
      "pick": {
        "mesh": "man_pick",
        "animation": "pick"
      },
      "axe": {
        "mesh": "man_axe",
        "animation": "axe"
      }
    },
    "mixins": [
      "job",
      "follower"
    ]
  },
  "fir": {
    "provides": [
      "wood"
    ],
    "resources": {
      "wood": 5
    }
  },
  "tree": {
  },
  "big_stone": {
    "provides": [
      "stone"
    ],
    "resources": {
      "stone": 20
    }
  },
  "sheep": {
    "mixins": [
      "job",
      "animal"
    ],
    "speed": 0.5,
    "meshes": {
      "default": {
        "mesh": "sheep",
        "animation": "eat"
      },
      "eat": {
        "mesh": "sheep",
        "animation": "eat"
      },
      "walk": {
        "mesh": "sheep",
        "animation": "walk"
      }
    }
  }
};

class WorldLoader {
  load(world, data, ops) {
    let basicOps = Object.assign({}, ops);

    if (!basicOps.modelLoader) {
      basicOps.modelLoader = new ModelLoader();
    }
    if (!basicOps.mixinDefs) {
      console.log("MIXIN DEFS", Mixin);
      basicOps.mixinDefs = Mixin;
    }
    if (!basicOps.entityTypes) {
      basicOps.entityTypes = EntityTypes;
    }

    data.forEach(entityDefinition =>
      world.push(new Entity(world.map, Object.assign({}, basicOps, entityDefinition)))
    );
    world.entities.forEach(entity => entity.postLoad && entity.postLoad());
  }
}

class WorldEvent extends Event {
    constructor(world) {
        super("world");
        this.world = world;
    }
}

class AgWorld extends HTMLElement {
    connectedCallback() {
        this.map = new HeightMap();
        this.world = new World(this.map);

        if (this.getAttribute("load")) {
            this.loadWorld(this.getAttribute("load")).then(this.inform.bind(this));
        }

        document[this.exposeName] = this.world;
    }

    disconnectedCallback() {
        delete document[this.exposeName];
    }

    inform() {
        this.querySelectorAll("*[inject-world]").forEach(e =>
            e.dispatchEvent(new WorldEvent(this.world)));
    }

    loadWorld(url) {
        return ajax(url).then(data =>
            new WorldLoader().load(this.world, data)
        )
    }
}

if (!customElements.get('ag-world')) {
    customElements.define('ag-world', AgWorld);
}

class AgEntityView extends HTMLElement {
    connectedCallback() {
        this.template = this.innerHTML;

        this.addEventListener("world", this.worldCreated.bind(this));
    }

    disconnectedCallback() {
        this.removeEventListener("world", this.worldCreated.bind(this));
        if (this.listener) {
            this.listener.remove();
        }
    }

    worldCreated(ev) {
        this.world = ev.world;
        const eventname = this.getAttribute("event") === "hovered" ? "hovered" : "selected";
        this.eventname = eventname;
        this.listener = this.world[eventname].subscribe(this.changed.bind(this));
    }

    changed(entity) {
        if (this.eventname == "selected") {
            console.log("ENTITY VIEW selected", entity, this);
        }
        if (this.entity != entity) {
            this.entity = entity;
            this.redraw();
        }
    }

    redraw() {
        this.innerHTML = eval('`' + this.template + '`');
    }
}

if (!customElements.get('ag-entity-view')) {
    customElements.define('ag-entity-view', AgEntityView);
}

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvd29ybGQuanMiLCJzcmMvZ2FtZS9oZWlnaHRtYXAuanMiLCJzcmMvYWpheC5qcyIsInNyYy9nYW1lL3ZlY3RvcjIuanMiLCJzcmMvZ2FtZS9lbnRpdHkuanMiLCJzcmMvY29uZmlnL21lc2hlcy5qcyIsInNyYy9iYXNlM2QvbW9kZWwuanMiLCJzcmMvYmFzZTNkL21vZGVsX2xvYWRlci5qcyIsInNyYy9nYW1lL2xsL2pvYi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL21peGlucy9hbmltYWwuanMiLCJzcmMvZ2FtZS9sbC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2pvYi5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS93b3JsZC1sb2FkZXIuanMiLCJzcmMvZWxlbWVudHMvYWctd29ybGQuanMiLCJzcmMvZWxlbWVudHMvYWctZW50aXR5LXZpZXcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgSW50cm8gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuY3VycmVudF9zY3JlZW4gPSAtMTtcbiAgICAgICAgdGhpcy5zY3JlZW5zID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiaW50cm8tc2NyZWVuXCIpO1xuICAgICAgICB0aGlzLm5leHRTY3JlZW5IYW5kbGVyID0gdGhpcy5uZXh0U2NyZWVuLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5uZXh0U2NyZWVuKClcbiAgICB9XG5cbiAgICBpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICB9XG5cbiAgICBiaW5kRXZlbnQoc2NyZWVuKSB7XG4gICAgICAgIGlmKHNjcmVlbikge1xuICAgICAgICAgICAgc2NyZWVuLmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpO1xuICAgICAgICAgICAgc2NyZWVuLmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1bmJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5leHRTY3JlZW4oZXYpIHtcbiAgICAgICAgdGhpcy51bmJpbmRFdmVudCh0aGlzLnNjcmVlbnNbdGhpcy5jdXJyZW50X3NjcmVlbl0pXG4gICAgICAgIGlmKHRoaXMuY3VycmVudF9zY3JlZW4gPT0gdGhpcy5zY3JlZW5zLmxlbmd0aC0xKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdmaW5pc2hlZCcpKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9ICh0aGlzLmN1cnJlbnRfc2NyZWVuICsgMSkgJSB0aGlzLnNjcmVlbnMubGVuZ3RoO1xuICAgICAgICB0aGlzLmJpbmRFdmVudCh0aGlzLnNjcmVlbnNbdGhpcy5jdXJyZW50X3NjcmVlbl0pXG4gICAgICAgIHRoaXMuc2V0VmlzaWJpbGl0eSgpXG4gICAgfVxuXG4gICAgc2V0VmlzaWJpbGl0eSgpIHtcbiAgICAgICAgdGhpcy5zY3JlZW5zLmZvckVhY2goKHNjcmVlbiwgaWR4KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X3NjcmVlbiA9PSBpZHgpIHtcbiAgICAgICAgICAgICAgICBzY3JlZW4uY2xhc3NMaXN0LmFkZChcImFjdGl2ZVwiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY3JlZW4uY2xhc3NMaXN0LnJlbW92ZShcImFjdGl2ZVwiKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWludHJvJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWludHJvJywgSW50cm8pO1xufVxuIiwiY2xhc3MgQ3JlZGl0cyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblxuICAgICAgICB0aGlzLmhhbmRsZXIgPSB0aGlzLmZpbmlzaGVkLmJpbmQodGhpcylcblxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IHRoaXMucXVlcnlTZWxlY3RvcihcIi5jcmVkaXRzXCIpXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQklORC4uLlwiKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcilcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuXG4gICAgZmluaXNoZWQoZXYpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGSU5JU0hFRFwiKVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZXZhbCh0aGlzLmdldEF0dHJpYnV0ZSgnb25maW5pc2hlZCcpKVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsIGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctY3JlZGl0cycpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1jcmVkaXRzJywgQ3JlZGl0cyk7XG59XG4iLCJjbGFzcyBUZXh0dXJlTG9hZGVyIHtcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghVGV4dHVyZUxvYWRlci5pbnN0YW5jZSkge1xuICAgICAgICAgICAgVGV4dHVyZUxvYWRlci5pbnN0YW5jZSA9IG5ldyBUZXh0dXJlTG9hZGVyKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFRleHR1cmVMb2FkZXIuaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgZ2V0VGV4dHVyZXModXJscykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodXJscy5tYXAodXJsPT50aGlzLmdldFRleHR1cmUodXJsKSkpO1xuICAgIH1cblxuICAgIGdldFRleHR1cmUodXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKHVybCwgbnVsbCwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRleHR1cmVMb2FkZXI7IiwiaW1wb3J0IFRleHR1cmVMb2FkZXIgZnJvbSBcIi4uL2Jhc2UzZC90ZXh0dXJlX2xvYWRlclwiO1xuXG5jb25zdCBUZXJyYWluID0gVEhSRUUuVGVycmFpbjtcblxuY2xhc3MgVGVycmFpbkJ1aWxkZXIge1xuXG4gICAgc3RhdGljIGNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIG1hdGVyaWFsLCBoZWlnaHRtYXApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt3aWR0aDogNjQsIGhlaWdodDogNjR9LCBvcHRpb25zKTtcbiAgICAgICAgdmFyIHhTID0gb3B0aW9ucy53aWR0aCAtIDEsIHlTID0gb3B0aW9ucy5oZWlnaHQgLSAxO1xuXG4gICAgICAgIGlmICghaGVpZ2h0bWFwKVxuICAgICAgICAgICAgaGVpZ2h0bWFwID0gZnVuY3Rpb24gKGcsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9QVElPTlNcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIHhsID0gb3B0aW9ucy54U2VnbWVudHMgKyAxLFxuICAgICAgICAgICAgICAgICAgICB5bCA9IG9wdGlvbnMueVNlZ21lbnRzICsgMTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgeWw7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ1tqICogeGwgKyBpXS56ICs9IE1hdGgucmFuZG9tKCkgKiAxMDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGlmIChmYWxzZSkge1xuICAgICAgICAgICAgLy8gZG9pbmcgd2lyZWZyYW1lIHRlcnJhaW5cbiAgICAgICAgICAgIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgICAgICAgICBjb2xvcjogMHhmZjAwMDAsXG4gICAgICAgICAgICAgICAgd2lyZWZyYW1lOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL21hdGVyaWFsID0gbnVsbDtcbiAgICAgICAgbGV0IHRlcnJhaW5TY2VuZSA9IFRlcnJhaW4oe1xuICAgICAgICAgICAgZWFzaW5nOiBUZXJyYWluLkxpbmVhcixcbiAgICAgICAgICAgIGZyZXF1ZW5jeTogMi41LFxuICAgICAgICAgICAgaGVpZ2h0bWFwOiBoZWlnaHRtYXAsXG4gICAgICAgICAgICAvL2FmdGVyOiBoZWlnaHRtYXAsXG4gICAgICAgICAgICBtYXRlcmlhbDogbWF0ZXJpYWwgfHwgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHg1NTY2YWF9KSxcbi8vICAgICAgICAgIG1heEhlaWdodDogMTAwLFxuLy8gICAgICAgICAgbWluSGVpZ2h0OiAtMTAwLFxuLy9taW5IZWlnaHQ6MCwvL3VuZGVmaW5lZCxcbi8vbWF4SGVpZ2h0OjEwLCAvL3VuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0ZXBzOiAxLFxuICAgICAgICAgICAgdXNlQnVmZmVyR2VvbWV0cnk6IGZhbHNlLFxuICAgICAgICAgICAgeFNlZ21lbnRzOiB4UyxcbiAgICAgICAgICAgIHhTaXplOiBvcHRpb25zLndpZHRoLFxuICAgICAgICAgICAgeVNlZ21lbnRzOiB5UyxcbiAgICAgICAgICAgIHlTaXplOiBvcHRpb25zLmhlaWdodCxcbiAgICAgICAgICAgIHN0cmV0Y2g6IGZhbHNlLFxuICAgICAgICAgICAgY2xhbXA6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICB0ZXJyYWluU2NlbmUucm90YXRpb24ueCA9IDA7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5yb3RhdGlvbi54ID0gLU1hdGguUEkvMjtcbiAgICAgICAgLy90ZXJyYWluU2NlbmUuY2hpbGRyZW5bMF0ucm90YXRpb24ueSA9IE1hdGguUEkvODtcbiAgICAgICAgdGVycmFpblNjZW5lLnBvc2l0aW9uLnggKz0gb3B0aW9ucy53aWR0aCAvIDI7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5wb3NpdGlvbi56IC09IG9wdGlvbnMud2lkdGggLyAyO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVFNcIiwgdGVycmFpblNjZW5lKTtcbiAgICAgICAgLy8gQXNzdW1pbmcgeW91IGFscmVhZHkgaGF2ZSB5b3VyIGdsb2JhbCBzY2VuZVxuICAgICAgICBzY2VuZS5hZGQodGVycmFpblNjZW5lKTtcbiAgICAgICAgdGhpcy5nZW8gPSB0ZXJyYWluU2NlbmUuY2hpbGRyZW5bMF0uZ2VvbWV0cnk7XG4gICAgfVxuXG4gICAgc3RhdGljIGFzeW5jIGNyZWF0ZShvcHRpb25zLCBzY2VuZSwgaGVpZ2h0bWFwKSB7XG4gICAgICAgIFRleHR1cmVMb2FkZXIuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlcyhbJ21vZGVscy9zYW5kMS5qcGcnLCAnbW9kZWxzL2dyYXNzMS5qcGcnLCAnbW9kZWxzL3N0b25lMS5qcGcnLCAnbW9kZWxzL3Nub3cxLmpwZyddKVxuICAgICAgICAgICAgLnRoZW4oKHRleHR1cmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmxlbmQgPSBUZXJyYWluQnVpbGRlci5nZW5lcmF0ZU1hdGVyaWFsKHNjZW5lLCAuLi50ZXh0dXJlcylcbiAgICAgICAgICAgICAgICBUZXJyYWluQnVpbGRlci5jcmVhdGVUZXJyYWluKG9wdGlvbnMsIHNjZW5lLCBibGVuZCwgaGVpZ2h0bWFwKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuICAgIHN0YXRpYyBnZW5lcmF0ZU1hdGVyaWFsKHNjZW5lLCB0MSx0Mix0Myx0NCkge1xuICAgICAgICByZXR1cm4gVGVycmFpbi5nZW5lcmF0ZUJsZW5kZWRNYXRlcmlhbChbXG4gICAgICAgICAgICB7dGV4dHVyZTogdDF9LFxuICAgICAgICAgICAge3RleHR1cmU6IHQyLCBsZXZlbHM6IFstODAsIC0zNSwgMjAsIDUwXX0sXG4gICAgICAgICAgICB7dGV4dHVyZTogdDMsIGxldmVsczogWzIwLCA1MCwgNjAsIDg1XX0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGV4dHVyZTogdDQsXG4gICAgICAgICAgICAgICAgZ2xzbDogJzEuMCAtIHNtb290aHN0ZXAoNjUuMCArIHNtb290aHN0ZXAoLTI1Ni4wLCAyNTYuMCwgdlBvc2l0aW9uLngpICogMTAuMCwgODAuMCwgdlBvc2l0aW9uLnopJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgXSwgc2NlbmUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGVycmFpbkJ1aWxkZXIiLCIvL3ZhciBwcm9qZWN0b3IgPSBuZXcgVEhSRUUuUHJvamVjdG9yKCk7XG52YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuXG52YXIgUGljayA9IHtcbiAgICAvKlxuICAgICogbW91c2U9e3g6MTIseToxMn1cbiAgICAqICovXG4gICAgcGljazogZnVuY3Rpb24gKG1vdXNlLCBjYW1lcmEsIHNjZW5lKSB7XG4gICAgICAgIC8vIGZpbmQgaW50ZXJzZWN0aW9uc1xuICAgICAgICAvL1xuICAgICAgICAvLyBjcmVhdGUgYSBSYXkgd2l0aCBvcmlnaW4gYXQgdGhlIG1vdXNlIHBvc2l0aW9uXG4gICAgICAgIC8vICAgYW5kIGRpcmVjdGlvbiBpbnRvIHRoZSBzY2VuZSAoY2FtZXJhIGRpcmVjdGlvbilcbiAgICAgICAgLy9cbiAgICAgICAgdmFyIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZlYy54ID0gbW91c2Uucng7XG4gICAgICAgIHZlYy55ID0gbW91c2Uucnk7XG4gICAgICAgIHJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKHZlYywgY2FtZXJhKTtcblxuICAgICAgICAvLyBjcmVhdGUgYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2JqZWN0cyBpbiB0aGUgc2NlbmUgd2l0aCB3aGljaCB0aGUgcmF5IGludGVyc2VjdHNcbiAgICAgICAgLy8gaW50ZXJzZWN0IHJlY3Vyc2l2ZSAhISFcbiAgICAgICAgdmFyIHJlc3VsdCA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHNjZW5lLmNoaWxkcmVuLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IFBpY2s7IiwiXG5mdW5jdGlvbiBhZGRTa3lib3goc2NlbmUpIHtcbiAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCdtb2RlbHMvc2t5MS5qcGcnLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh0MSkge1xuICAgICAgICBjb25zdCBza3lEb21lID0gbmV3IFRIUkVFLk1lc2goXG4gICAgICAgICAgICBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoNDA5NiwgNjQsIDY0KSxcbiAgICAgICAgICAgIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiB0MSwgc2lkZTogVEhSRUUuQmFja1NpZGUsIGZvZzogZmFsc2V9KVxuICAgICAgICApO1xuICAgICAgICBzY2VuZS5hZGQoc2t5RG9tZSk7XG4gICAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhZGRTa3lib3g7IiwiaW1wb3J0IGFkZFNreWJveCBmcm9tIFwiLi9za3lib3hcIjtcblxuZnVuY3Rpb24gZ2V0UmFuZG9tTnVtYmVyKCBiYXNlICkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogYmFzZSAtIChiYXNlLzIpO1xufVxuZnVuY3Rpb24gZ2V0UmFuZG9tQ29sb3IoKSB7XG4gICAgdmFyIGMgPSBuZXcgVEhSRUUuQ29sb3IoKTtcbiAgICBjLnNldFJHQiggTWF0aC5yYW5kb20oKSwgTWF0aC5yYW5kb20oKSwgTWF0aC5yYW5kb20oKSApO1xuICAgIHJldHVybiBjO1xufVxuY2xhc3MgQW50U2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBodHRwOi8vc3F1YXJlZmVldC5naXRodWIuaW8vU2hhZGVyUGFydGljbGVFbmdpbmUvXG4gICAgICAgIHRoaXMuZW1pdHRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgcG9zaXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKC0xLCAxLCAxKSxcbiAgICAgICAgICAgIHBvc2l0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKSxcblxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMC4xLCAwKSxcbiAgICAgICAgICAgIGFjY2VsZXJhdGlvblNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4wMSwgMC4wMSwgMC4wMSksXG5cbiAgICAgICAgICAgIHZlbG9jaXR5OiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLjcsIDApLFxuICAgICAgICAgICAgdmVsb2NpdHlTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywgMC41LCAwLjIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0OiBuZXcgVEhSRUUuQ29sb3IoMHhCQkJCQkIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0U3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjIsIDAuMSwgMC4xKSxcbiAgICAgICAgICAgIGNvbG9yRW5kOiBuZXcgVEhSRUUuQ29sb3IoMHhBQUFBQUEpLFxuXG4gICAgICAgICAgICBzaXplU3RhcnQ6IDAuNSxcbiAgICAgICAgICAgIHNpemVFbmQ6IDQsXG4gICAgICAgICAgICBvcGFjaXR5U3RhcnQ6IDEsXG4gICAgICAgICAgICBvcGFjaXR5RW5kOiAwLjEsXG5cbiAgICAgICAgICAgIC8vcGFydGljbGVDb3VudDogMjAwMCxcbiAgICAgICAgICAgIHBhcnRpY2xlc1BlclNlY29uZDogMTAwLFxuICAgICAgICAgICAgYWxpdmU6IDFcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmVtaXR0ZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIG1heEFnZTogNSxcbiAgICAgICAgICAgIC8vdHlwZTogTWF0aC5yYW5kb20oKSAqIDQgfCAwLFxuICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoLTEsMCwwKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjY2VsZXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMygwLFxuICAgICAgICAgICAgICAgICAgICAtMC4yLFxuICAgICAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsMC4xLDApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmVsb2NpdHk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIDEuNCxcbiAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgc3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjMsMC43LDAuMylcbiAgICAgICAgICAgIH0sXG4vKlxuICAgICAgICAgICAgcm90YXRpb246IHtcbiAgICAgICAgICAgICAgICBheGlzOiBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpLFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSksXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgYW5nbGU6XG4gICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJLFxuICAgICAgICAgICAgICAgIGNlbnRlcjpcbiAgICAgICAgICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMClcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfSxcblxuXG4gICAgICAgICAgICB3aWdnbGU6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5yYW5kb20oKSAqIDIwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZzoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnJhbmRvbSgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNvbG9yOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IFtuZXcgVEhSRUUuQ29sb3IoMHgzMzMzMzMpLG5ldyBUSFJFRS5Db2xvcigweDc3Nzc3NyksbmV3IFRIUkVFLkNvbG9yKDB4ODg4ODg4KV0sXG4gICAgICAgICAgICAgICAgc3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjMsMCwwKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc2l6ZToge1xuXG4gICAgICAgICAgICAgICAgdmFsdWU6IFswLjUsIDAuNywgMV1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXJ0aWNsZUNvdW50OiAxMDAsXG4gICAgICAgICAgICBvcGFjaXR5OiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IFsxLCAwLjgsIDAuMF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXB0aFRlc3Q6IHRydWUsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuXG4gICAgICAgIHRoaXMucGFydGljbGVHcm91cCA9IEFudFNjZW5lLm1ha2VTUEVHcm91cCgpO1xuXG4gICAgICAgIHRoaXMucGFydGljbGVHcm91cC5hZGRQb29sKDEwLCB0aGlzLmVtaXR0ZXJTZXR0aW5ncywgdHJ1ZSk7XG5cbiAgICAgICAgdmFyIGVtaXR0ZXIgPSB0aGlzLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKVxuICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gbmV3IFRIUkVFLlZlY3RvcjMoLTIsMCwwKVxuICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuICAgICAgICBlbWl0dGVyID0gdGhpcy5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKClcbiAgICAgICAgZW1pdHRlci5wb3NpdGlvbi52YWx1ZSA9IG5ldyBUSFJFRS5WZWN0b3IzKC00LDAsMClcbiAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcblxuICAgICAgICAvL3RoaXMuc2NlbmUuYmFja2dyb3VuZC5hZGQobmV3IENvbG9yKFwicmVkXCIpKVxuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0aGlzLnBhcnRpY2xlR3JvdXAubWVzaCk7XG4gICAgICAgIHRoaXMuc2NlbmUucGFydGljbGVHcm91cCA9IHRoaXMucGFydGljbGVHcm91cDtcbiAgICAgICAgY29uc29sZS5sb2coXCJQQVJUSUNMRVwiLCB0aGlzLnBhcnRpY2xlR3JvdXApO1xuXG5cbiAgICAgICAgLy8gc29mdCB3aGl0ZSBsaWdodFxuICAgICAgICB2YXIgbGlnaHQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MzAyMDIwKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHQpO1xuXG4gICAgICAgIC8vIFdoaXRlIGRpcmVjdGlvbmFsIGxpZ2h0IGF0IGhhbGYgaW50ZW5zaXR5IHNoaW5pbmcgZnJvbSB0aGUgdG9wLlxuICAgICAgICB2YXIgZGlyZWN0aW9uYWxMaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmZmLCAwLjcpO1xuICAgICAgICBkaXJlY3Rpb25hbExpZ2h0LnBvc2l0aW9uLnNldCgxLCAwLjcsIDAuNyk7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGRpcmVjdGlvbmFsTGlnaHQpO1xuXG4gICAgICAgIGFkZFNreWJveCh0aGlzLnNjZW5lKTtcblxuXG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCAwLCAwKTtcbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDAsIDQpO1xuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgNCwgMCk7XG5cbiAgICAgICAgdGhpcy5tZXNoZXMgPSB7fTtcbiAgICAgICAgdGhpcy5lbnRpdGllcyA9IFtdXG4gICAgfVxuXG4gICAgc3RhdGljIG1ha2VTUEVHcm91cCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTUEUuR3JvdXAoe1xuICAgICAgICAgICAgdGV4dHVyZTogeyB2YWx1ZTogVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZSgnLi9pbWFnZXMvc21va2VwYXJ0aWNsZS5wbmcnKSB9LFxuICAgICAgICAgICAgLy9tYXhBZ2U6IDQsXG4gICAgICAgICAgICAvL2JsZW5kaW5nOiBUSFJFRS5Ob3JtYWxCbGVuZGluZ1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGNyZWF0ZUN1YmUoc2NlbmUsIHgsIHkpIHtcbiAgICAgICAgdmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KCk7XG4gICAgICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MDBmZjAwfSk7XG4gICAgICAgIHZhciBjdWJlID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG1hdGVyaWFsKTtcbiAgICAgICAgY3ViZS5wb3NpdGlvbi54ICs9IHg7XG4gICAgICAgIGN1YmUucG9zaXRpb24ueiArPSB5O1xuICAgICAgICBzY2VuZS5hZGQoY3ViZSk7XG4gICAgfVxuXG4gICAgdGljayhkZWx0YSkge1xuICAgICAgICBpZiAoZGVsdGEpIHtcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVHcm91cC50aWNrKGRlbHRhKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkKG5vZGUpIHtcbiAgICAgICAgLy8gICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSlcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkFERFwiLCBub2RlKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQobm9kZSlcbiAgICB9XG5cbiAgICByZW1vdmUobm9kZSkge1xuICAgICAgICB0aGlzLnNjZW5lLnJlbW92ZShub2RlKVxuICAgIH1cblxuICAgIG1ha2VFbWl0dGVyKHBvcykge1xuICAgICAgICByZXR1cm4gbmV3IFNQRS5FbWl0dGVyKHRoaXMuZW1pdHRlclNldHRpbmdzKTtcbiAgICB9XG5cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbnRTY2VuZSIsImNvbnN0IGNsb2NrID0gbmV3IFRIUkVFLkNsb2NrKCk7XG5cbmNsYXNzIEJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG5cblxuXG4gICAgfVxuXG5cblxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2U7XG4iLCJpbXBvcnQgQmFzZSBmcm9tIFwiLi9iYXNlXCI7XG5cbmNvbnN0IGNsb2NrID0gbmV3IFRIUkVFLkNsb2NrKCk7XG5cbmNsYXNzIFZpZXcgIHtcbiAgICBjb25zdHJ1Y3RvcihlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVMXCIsIGVsLCB0aGlzKVxuICAgICAgICB0aGlzLmVsID0gZWxcbiAgICAgICAgdGhpcy5yZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKCk7XG5cbiAgICAgICAgLy8gZml4bWU6IHVzZSBlbCBzaXplXG4gICAgICAgIGNvbnN0IHdpZHRoID0gZWwub2Zmc2V0V2lkdGhcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0XG5cbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KVxuXG4gICAgICAgIHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDYwLCB3aWR0aCAvIGhlaWdodCwgMSwgMTAwMDApO1xuICAgICAgICB0aGlzLnNldFNpemUoKVxuXG4gICAgICAgIHRoaXMuY2FtZXJhLnJvdGF0aW9uLnggPSAtKDEwICsgMzIpICogTWF0aC5QSSAvIDE4MDtcbiAgICAgICAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTaXplKCkge1xuICAgICAgICB0aGlzLmNhbWVyYS5hc3BlY3QgPSB0aGlzLmVsLm9mZnNldFdpZHRoIC8gdGhpcy5lbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIHRoaXMuY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcblxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFNpemUodGhpcy5lbC5vZmZzZXRXaWR0aCwgdGhpcy5lbC5vZmZzZXRIZWlnaHQpO1xuICAgIH1cblxuICAgIHJlbmRlcihzY2VuZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJFTkRFUlwiLCBzY2VuZSwgb3B0aW9ucylcblxuICAgICAgICB2YXIgZG9yZW5kZXI9ICgpPT4ge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGlzIHJlbmRlcmluZyAtIGJlY2F1c2UgdGhlIHNjb3BlIC8gY2FudmFzIGlzIGRlc3Ryb3llZFxuICAgICAgICAgICAgaWYgKCF0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhpZGRlbikge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGRvcmVuZGVyLCA1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9yZW5kZXIpO1xuICAgICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdmFyIHRpbWVEaWZmID0gdGltZSAtIGxhc3RUaW1lO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSB0aW1lO1xuXG4gICAgICAgICAgICB2YXIgZGVsdGE7XG4gICAgICAgICAgICB2YXIgdXNlM2pzVGltZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAodXNlM2pzVGltZSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IGNsb2NrLmdldERlbHRhKCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZGVsdGEgPSB0aW1lRGlmZiAqIDAuMDAxO1xuXG4gICAgICAgICAgICBpZiAoZGVsdGEgPiAwLjEpXG4gICAgICAgICAgICAgICAgZGVsdGEgPSAwLjE7XG4gICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmZyYW1lQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mcmFtZUNhbGxiYWNrKGRlbHRhKTtcblxuICAgICAgICAgICAgc2NlbmUudGljayhkZWx0YSlcbiAgICAgICAgICAgIC8vIGFuaW1hdGUgQ29sbGFkYSBtb2RlbFxuXG4gICAgICAgICAgICAvL1RIUkVFLkFuaW1hdGlvbk1peGVyLnVwZGF0ZShkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcihzY2VuZS5zY2VuZSwgdGhpcy5jYW1lcmEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgfVxuXG4gICAgdXBkYXRlQ2FtZXJhKHZpZXdDZW50ZXIsIGgpIHtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueCA9IHZpZXdDZW50ZXIueDtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueSA9IHZpZXdDZW50ZXIueiArIGg7XG4gICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLnogPSAtIHZpZXdDZW50ZXIueSArIHZpZXdDZW50ZXIuejtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXc7IiwiaW1wb3J0IFRlcnJhaW5CdWlsZGVyIGZyb20gXCIuLi9saWJzL3RlcnJhaW5fYnVpbGRlclwiO1xuaW1wb3J0IFBpY2sgZnJvbSAnLi4vYmFzZTNkL3BpY2snXG5pbXBvcnQgQW50U2NlbmUgZnJvbSBcIi4uL2Jhc2UzZC9hbnQtc2NlbmVcIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuLi9iYXNlM2Qvdmlld1wiXG5cbi8qKlxuICogR2FtZXZpZXcgY29udGFpbnMgc2NlbmUsIHZpZXcsXG4gKi9cbmNsYXNzIEFnR2FtZVZpZXcgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMuc2V0dXBUaHJlZSgpO1xuXG4gICAgdGhpcy5jb250cm9sUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZShcImNvbnRyb2wtcHJvZ3Jlc3NcIikpIHtcbiAgICAgIHRoaXMuY29udHJvbFByb2dyZXNzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcIkFnR2FtZVZpZXcgY29ubmVjdGVkXCIpO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy51cGRhdGVTaXplLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCB0aGlzLm1vdXNlZG93bi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIHRoaXMubW91c2V1cC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5tb3VzZW1vdmUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgdGhpcy53aGVlbC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsIHRoaXMud29ybGRDcmVhdGVkLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHRoaXMuZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkudmlzaWJpbGl0eUNoYW5nZSwgdGhpcy52aXNpYmlsaXR5Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy52aWV3Q2VudGVyID0ge3g6IDAsIHk6IDAsIHo6IDEwfTtcblxuICAgIHRoaXMubW92ZXMgPSAwO1xuICAgIHRoaXMudmlldyA9IG5ldyBWaWV3KHRoaXMpO1xuICAgIHRoaXMudXBkYXRlU2l6ZSh7dGFyZ2V0OiB3aW5kb3d9KTtcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIGZyYW1lQ2FsbGJhY2soZSkge1xuICAgIHRoaXMudGljayhlKVxuICAgIC8vIHRoaXMuc2NlbmUudGljaygpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdmlldy5kZXN0cm95ZWQgPSB0cnVlXG4gIH1cblxuICBhc3luYyB3b3JsZENyZWF0ZWQoZSkge1xuICAgIHRoaXMud29ybGQgPSBlLndvcmxkO1xuICAgIGNvbnN0IG1hcCA9IHRoaXMud29ybGQubWFwO1xuXG4gICAgY29uc3QgdGhyZWVIZWlnaHRNYXAgPSBtYXAudG9UaHJlZVRlcnJhaW4oKTtcblxuICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZShtYXAsIHRoaXMuc2NlbmUsIHRocmVlSGVpZ2h0TWFwKTtcblxuICAgIC8vIEZJWE1FOiBsb2FkIGFsbCBtb2RlbHMgYmVmb3JlaGFuZFxuICAgIGF3YWl0IHRoaXMud29ybGQuaW5pdFNjZW5lKHRoaXMuc2NlbmUpO1xuICAgIHRoaXMuc3RhcnRSZW5kZXJMb29wKCk7XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKTtcbiAgfVxuXG4gIHN0YXJ0UmVuZGVyTG9vcCgpIHtcbiAgICB0aGlzLnZpZXcucmVuZGVyKHRoaXMuc2NlbmUsIHtmcmFtZUNhbGxiYWNrOiB0aGlzLmZyYW1lQ2FsbGJhY2suYmluZCh0aGlzKX0pXG4gIH1cblxuICBnZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKSB7XG4gICAgdmFyIGhpZGRlbiwgdmlzaWJpbGl0eUNoYW5nZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgICAgaGlkZGVuID0gXCJoaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaGlkZGVuID0gXCJtc0hpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwibXN2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwid2Via2l0dmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH1cbiAgICByZXR1cm4ge3Zpc2liaWxpdHlDaGFuZ2UsIGhpZGRlbn07XG4gIH1cblxuICBzZXR1cFRocmVlKCkge1xuICAgIHRoaXMuc2NlbmUgPSBuZXcgQW50U2NlbmUodGhpcy5zY2VuZSlcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICBpZiAodGhpcy5jb250cm9sUHJvZ3Jlc3MgJiYgIXRoaXMud29ybGQucGF1c2UpIHtcbiAgICAgIHRoaXMud29ybGQudGljayhkZWx0YSlcbiAgICB9XG4gIH1cblxuICB2aXNpYmlsaXR5Q2hhbmdlKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldFt0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLmhpZGRlbl0pIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gdHJ1ZVxuICAgICAgLy8gaGlkZGVuXG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gZmFsc2VcbiAgICAgIC8vIHZpc2libGVcbiAgICB9XG4gIH1cblxuICB1cGRhdGVTaXplKGV2KSB7XG4gICAgdGhpcy52aWV3LnNldFNpemUoe30pO1xuICAgIHRoaXMuY29udGFpbmVyV2lkdGggPSBldi50YXJnZXQuaW5uZXJXaWR0aDtcbiAgICB0aGlzLmNvbnRhaW5lckhlaWdodCA9IGV2LnRhcmdldC5pbm5lckhlaWdodFxuICB9XG5cbiAgbW91c2V1cChlKSB7XG4gICAgdGhpcy5tb3VzZWlzZG93biA9IGZhbHNlO1xuICB9XG5cbiAgbW91c2Vkb3duKGUpIHtcbiAgICB0aGlzLm1vdXNlaXNkb3duID0gdHJ1ZTtcbiAgICB0aGlzLm94ID0gZS5wYWdlWDtcbiAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB0aGlzLm1vdmVzID0gMDtcbiAgfVxuXG4gIHdoZWVsKGUpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueiArPSBlLmRlbHRhWSAqIDAuMTtcbiAgICBpZiAodGhpcy52aWV3Q2VudGVyLnogPCA1KSB7XG4gICAgICB0aGlzLnZpZXdDZW50ZXIueiA9IDVcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKVxuICB9XG5cbiAgY2xpY2soZSkge1xuICAgIC8vRklYTUU6IG1vdmUgdG8gd29ybGRcbiAgICBjb25zb2xlLmxvZyhcIkNMSUNLXCIsIGUpO1xuICAgIGNvbnN0IHdvcmxkID0gdGhpcy53b3JsZDtcbiAgICBpZiAoIXdvcmxkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh3b3JsZC5ob3ZlcmVkRW50aXR5KSB7XG4gICAgICB3b3JsZC5zZWxlY3Qod29ybGQuaG92ZXJlZEVudGl0eSk7XG4gICAgfSBlbHNlIGlmICh3b3JsZC5zZWxlY3RlZEVudGl0eSAmJiB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iICYmIHdvcmxkLnNlbGVjdGVkRW50aXR5LmlzQShcImhlcm9cIikgJiYgd29ybGQuc2VsZWN0ZWRFbnRpdHkucGxheWVyID09IFwiaHVtYW5cIikge1xuICAgICAgY29uc29sZS5sb2coXCJhc3NpZ24gbmV3IG1vdmUgam9iXCIpO1xuICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucmVzZXRKb2JzKCk7XG4vLyAgICAgICAgICB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iKG5ldyBKb2JzLm1sLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksbGFzdFBvcykpO1xuICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucHVzaEhsSm9iKG5ldyBKb2JzLmhsLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksIGxhc3RQb3MpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJTQ0VORVwiLCB0aGlzLnNjZW5lKVxuICB9XG5cbiAgbW91c2Vtb3ZlKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB0aGlzLm1vdmVzICs9IDE7XG4gICAgaWYgKHRoaXMubW91c2Vpc2Rvd24pIHtcbiAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5vZmZzZXRXaWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMub2Zmc2V0SGVpZ2h0O1xuICAgICAgdGhpcy5tb3ZlKHtkeDogKGUucGFnZVggLSB0aGlzLm94KSAvIHdpZHRoLCBkeTogKGUucGFnZVkgLSB0aGlzLm95KSAvIGhlaWdodH0pO1xuICAgICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgdGhpcy5ob3Zlcih7XG4gICAgICB4OiBlLnBhZ2VYLFxuICAgICAgeTogZS5wYWdlWSxcbiAgICAgIHJ4OiBlLnBhZ2VYIC8gdGhpcy5jb250YWluZXJXaWR0aCAqIDIgLSAxLFxuICAgICAgcnk6IC1lLnBhZ2VZIC8gdGhpcy5jb250YWluZXJIZWlnaHQgKiAyICsgMSxcbiAgICB9KTtcbiAgfVxuXG4gIGhvdmVyKG1vdXNlKSB7XG4gICAgaWYgKCF0aGlzLndvcmxkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBQaWNrLnBpY2sobW91c2UsIHRoaXMudmlldy5jYW1lcmEsIHRoaXMuc2NlbmUuc2NlbmUpO1xuXG4gICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgZW50aXR5ID0gcmVzWzBdLm9iamVjdC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICBlbnRpdHkgPSByZXNbMF0ub2JqZWN0LnBhcmVudC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICB9XG4gICAgICB0aGlzLndvcmxkLmhvdmVyKGVudGl0eSk7XG5cbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIHRoaXMubGFzdFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKCkuY29weShyZXNbMF0ucG9pbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1vdmUoZCkge1xuICAgIHRoaXMudmlld0NlbnRlci54IC09IGQuZHggKiB0aGlzLnZpZXdDZW50ZXIueiAqIDM7XG4gICAgdGhpcy52aWV3Q2VudGVyLnkgKz0gZC5keSAqIHRoaXMudmlld0NlbnRlci56ICogMztcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIHVwZGF0ZUNhbWVyYSgpIHtcbiAgICAvLyBGSVhNRTogbW92ZSB0byB3b3JsZFxuICAgIHZhciBoO1xuXG4gICAgaWYgKHRoaXMud29ybGQgJiYgdGhpcy53b3JsZC5tYXApIHtcbiAgICAgIGggPSB0aGlzLndvcmxkLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMudmlld0NlbnRlci54LCB0aGlzLnZpZXdDZW50ZXIueSArIHRoaXMudmlld0NlbnRlci56IC8gMik7XG4gICAgfVxuICAgIGlmIChoID4gNTAgfHwgaCA8IDUwKSB7XG4gICAgICBoID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXcudXBkYXRlQ2FtZXJhKHRoaXMudmlld0NlbnRlciwgaClcbiAgfVxuXG4gIGtleWRvd24oZSkge1xuICAgIGNvbnNvbGUubG9nKFwiS0VZZG93blwiLCBlKTtcbiAgICBpZiAoZS5rZXlDb2RlID09IDI3KSB7XG4gICAgICB3b3JsZC5zZWxlY3QobnVsbCk7XG4gICAgfVxuICB9XG59XG5cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWdhbWUtdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZ2FtZS12aWV3JywgQWdHYW1lVmlldyk7XG59XG4iLCIvLyBzaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9wdWJzdWItamF2YXNjcmlwdFxuLy8gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVCBsaWNlbnNlXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0gW11cbiAgICB9XG5cbiAgICBzdWJzY3JpYmUobGlzdGVuZXIpIHtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycztcblxuICAgICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpIC0gMTtcblxuICAgICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsaXN0ZW5lcnNbaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHB1Ymxpc2goaW5mbykge1xuICAgICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaCgoaXRlbSk9PiB7XG4gICAgICAgICAgICBpdGVtKGluZm8gIT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IEV2ZW50cyBmcm9tICcuLi9saWJzL2V2ZW50cydcblxuY2xhc3MgV29ybGQge1xuICBjb25zdHJ1Y3RvcihtYXApIHtcbiAgICB0aGlzLm1hcCA9IG1hcDtcbiAgICB0aGlzLmVudGl0aWVzID0gW107XG4gICAgdGhpcy5lbnRpdGllc0J5VHlwZSA9IHt9O1xuICAgIGlmICghd2luZG93LldvcmxkKVxuICAgICAgd2luZG93LldvcmxkID0gdGhpcztcblxuICAgIHRoaXMuaG92ZXJlZCA9IG5ldyBFdmVudHMoKTtcbiAgICB0aGlzLnNlbGVjdGVkID0gbmV3IEV2ZW50cygpXG4gIH1cblxuICBnZXQgd2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLndpZHRoO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGVpZ2h0O1xuICB9XG5cbiAgcHVzaChlbnRpdHkpIHtcbiAgICBlbnRpdHkud29ybGQgPSB0aGlzO1xuICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpO1xuICAgIGlmICghZW50aXR5Lm1peGluTmFtZXMpXG4gICAgICBjb25zb2xlLndhcm4oXCJObyBtaXhpbnMgZm9yIFwiLCBlbnRpdHkpO1xuICAgIGVsc2Uge1xuICAgICAgZW50aXR5Lm1peGluTmFtZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0pXG4gICAgICAgICAgdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXSA9IFtdO1xuICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdLnB1c2goZW50aXR5KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHNlYXJjaChwYXJhbSwgb3JpZ2luKSB7XG4gICAgcmV0dXJuIF8uY2hhaW4odGhpcy5lbnRpdGllcykuZmlsdGVyKChlKSA9PiB7XG4gICAgICBpZiAocGFyYW0gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICByZXR1cm4gcGFyYW0oZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIHBhcmFtKSB7XG4gICAgICAgICAgdmFyIHZhbCA9IHBhcmFtW25hbWVdO1xuICAgICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT0JKXCIsIHZhbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChlW25hbWVdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGVbbmFtZV0sIHZhbCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlW25hbWVdIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghZVtuYW1lXVt2YWxdKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZVtuYW1lXSAhPSB2YWwpXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pLnNvcnRCeSgoZSkgPT4ge1xuICAgICAgaWYgKG9yaWdpbiBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpXG4gICAgICAgIHJldHVybiBlLnBvcy5kaXN0YW5jZVRvKG9yaWdpbik7XG4gICAgICByZXR1cm4gMTtcbiAgICB9KS52YWx1ZSgpO1xuICB9XG5cbiAgYXN5bmMgaW5pdFNjZW5lKHNjZW5lKSB7XG4gICAgY29uc29sZS5sb2coXCI9PT0gaW5pdFNjZW5lXCIpO1xuICAgIHRoaXMuZW50aXRpZXMuZm9yRWFjaChhc3luYyBlID0+IHtcbiAgICAgIGF3YWl0IGUuc2V0U2NlbmUoc2NlbmUpO1xuICAgIH0pO1xuICB9XG5cbiAgaG92ZXIoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSlcbiAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKGZhbHNlKTtcblxuICAgIHRoaXMuaG92ZXJlZEVudGl0eSA9IGVudGl0eTtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KSB7XG4gICAgICB0aGlzLmhvdmVyZWRFbnRpdHkuaG92ZXJlZCh0cnVlKTtcbiAgICAgIHRoaXMuaG92ZXJlZC5wdWJsaXNoKGVudGl0eSlcbiAgICB9XG4gIH1cblxuICBzZWxlY3QoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkpXG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKGZhbHNlKTtcbiAgICB0aGlzLnNlbGVjdGVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKHRydWUpO1xuICAgICAgdGhpcy5zZWxlY3RlZC5wdWJsaXNoKGVudGl0eSlcbiAgICB9XG4gIH1cblxuICBnZXRTZWxlY3RlZEhlcm8oKSB7XG4gICAgaWYgKCF0aGlzLnNlbGVjdGVkSGVybykge1xuICAgICAgdGhpcy5zZWxlY3RlZEhlcm8gPSB0aGlzLnNlYXJjaCh7cGxheWVyOiBcImh1bWFuXCJ9KVswXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRIZXJvO1xuICB9XG5cbiAgdGljayhkZWx0YSkge1xuICAgIHRoaXMuZW50aXRpZXMuZm9yRWFjaCgoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5LnRpY2spIHtcbiAgICAgICAgZW50aXR5LnRpY2soZGVsdGEpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgV29ybGQ7XG4iLCJ2YXIgQXJyYXlUeXBlID0gd2luZG93LkZsb2F0NjRBcnJheSB8fCB3aW5kb3cuQXJyYXk7XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hcCh3LCBoKSB7XG4gIHJldHVybiBuZXcgQXJyYXlUeXBlKHcgKiBoKTtcbn1cblxuY2xhc3MgSGVpZ2h0TWFwIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgd2lkdGg6IDI1NixcbiAgICAgIGhlaWdodDogMjU2LFxuICAgICAgbWFwOiB7fVxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5tYXAgPSB0aGlzLm9wdGlvbnMubWFwO1xuXG4gICAgaWYgKCF0aGlzLm1hcC5yb2NrKSB7XG4gICAgICB0aGlzLm1hcC5yb2NrID0gY3JlYXRlTWFwKHRoaXMub3B0aW9ucy53aWR0aCwgdGhpcy5vcHRpb25zLmhlaWdodCk7XG4gICAgICB0aGlzLmdlbmVyYXRlKClcbiAgICB9XG4gIH07XG5cbiAgZ2V0IHdpZHRoKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuaGVpZ2h0O1xuICB9XG5cbiAgZ2VuZXJhdGUoKSB7XG4gICAgdmFyIHgsIHk7XG4gICAgdmFyIHJvY2sgPSB0aGlzLmdldChcInJvY2tcIik7XG4gICAgZm9yICh4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKVxuICAgICAgZm9yICh5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgICB2YXIgdmFsID0gTWF0aC5zaW4oeCAqIDAuMykgKyBNYXRoLnNpbih5ICogMC4xNSkgKiAyLjA7Ly8vdGhpcy5vcHRpb25zLndpZHRoO1xuICAgICAgICByb2NrKHgsIHksIHZhbCk7XG4gICAgICB9XG4gIH07XG5cbiAgZ2V0KHR5cGUpIHtcbiAgICB2YXIgdyA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLm1hcFt0eXBlXTtcblxuICAgIHZhciBmY3QgPSBmdW5jdGlvbiAoeCwgeSwgdmFsKSB7XG4gICAgICB2YXIgaSA9IHggKyB3ICogeTtcbiAgICAgIGlmICh2YWwpXG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9IHZhbDtcbiAgICAgIHJldHVybiBhcnJheVtpXTtcbiAgICB9O1xuXG4gICAgZmN0LmludGVycG9sYXRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHZhciBmeCA9IE1hdGguZmxvb3IoeCk7XG4gICAgICB2YXIgZnkgPSBNYXRoLmZsb29yKHkpO1xuICAgICAgdmFyIHYwMCA9IHRoaXMoZngsIGZ5KTtcbiAgICAgIHZhciB2MDEgPSB0aGlzKGZ4LCBmeSArIDEpO1xuICAgICAgdmFyIHYxMCA9IHRoaXMoZnggKyAxLCBmeSk7XG4gICAgICB2YXIgdjExID0gdGhpcyhmeCArIDEsIGZ5ICsgMSk7XG4gICAgICB2YXIgZHggPSB4IC0gZng7XG4gICAgICB2YXIgZHkgPSB5IC0gZnk7XG4gICAgICByZXR1cm4gKHYwMCAqICgxIC0gZHgpICsgdjEwICogZHgpICogKDEgLSBkeSkgKyAodjAxICogKDEgLSBkeCkgKyB2MTEgKiBkeCkgKiBkeTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZjdDtcbiAgfTtcblxuICBwaWNrR3JlZW4odywgaCwgZGF0YSkge1xuICAgIHZhciBhID0gbmV3IEFycmF5KHcgKiBoKTtcbiAgICB2YXIgeCwgeTtcbiAgICBmb3IgKHkgPSAwOyB5IDwgaDsgeSsrKSB7XG4gICAgICBmb3IgKHggPSAwOyB4IDwgdzsgeCsrKSB7XG4gICAgICAgIGFbeSAqIHcgKyB4XSA9IGRhdGFbKHkgKiB3ICsgeCkgKiA0ICsgMV0gKiAwLjI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhO1xuICB9O1xuXG5cbiAgdG9UaHJlZVRlcnJhaW4oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgY29uc3QgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgY29uc3Qgcm9jayA9IHNlbGYuZ2V0KFwicm9ja1wiKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHlsOyBqKyspIHtcbiAgICAgICAgICBnWyh5bCAtIGogLSAxKSAqIHhsICsgaV0ueiArPSByb2NrKGksIGopO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvKlxuICAgICAgdG9UZXh0dXJlKCkge1xuICAgICAgICAgIC8vIFVOVEVTVEVEICEhISFcbiAgICAgICAgICB2YXIgcmFtcFRleCA9IG5ldyBUSFJFRS5EYXRhVGV4dHVyZShkYXRhLnBpeGVscywgZGF0YS53aWR0aCwgZGF0YS5oZWlnaHQsIFRIUkVFLlJHQkFGb3JtYXQpO1xuICAgICAgICAgIHJhbXBUZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgICAgfTtcbiAgKi9cblxuLy8gRklYTUUgdGhpcyBzaG91bGQgbW92ZWQgc29tZXdoZXJlIGVsc2VcbiAgdG9DYW52YXMoX3R5cGUpIHtcbiAgICB2YXIgdHlwZSA9IF90eXBlIHx8IFwicm9ja1wiO1xuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjYW52YXMud2lkdGggPSB0aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gICAgdmFyIGQgPSBjb250ZXh0LmNyZWF0ZUltYWdlRGF0YShjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpLFxuICAgICAgZGF0YSA9IGQuZGF0YTtcbiAgICB2YXIgbWluLCBtYXg7XG4gICAgdmFyIGFjY2Vzc29yID0gdGhpcy5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspIHtcbiAgICAgICAgdmFyIHYgPSBhY2Nlc3Nvcih4LCB5KTtcblxuICAgICAgICBpZiAoIW1pbiB8fCBtaW4gPiB2KVxuICAgICAgICAgIG1pbiA9IHY7XG4gICAgICAgIGlmICghbWF4IHx8IG1heCA8IHYpXG4gICAgICAgICAgbWF4ID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJNTU1NXCIsIG1pbiwgbWF4KTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgIHZhciBpID0geSAqIHRoaXMub3B0aW9ucy5oZWlnaHQgKyB4O1xuICAgICAgICBpZHggPSBpICogNDtcbiAgICAgICAgZGF0YVtpZHhdID0gZGF0YVtpZHggKyAxXSA9IGRhdGFbaWR4ICsgMl0gPSBNYXRoLnJvdW5kKCgoYWNjZXNzb3IoeCwgeSkgLSBtaW4pIC8gKG1heCAtIG1pbikpICogMjU1KTtcbiAgICAgICAgZGF0YVtpZHggKyAzXSA9IDI1NTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29udGV4dC5wdXRJbWFnZURhdGEoZCwgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBIZWlnaHRNYXA7XG4iLCJmdW5jdGlvbiBhamF4KHVybCwgbWV0aG9kID0gXCJHRVRcIiwgZGF0YSA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzIDw9IDI5OSAmJiByZXF1ZXN0LnN0YXR1cyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJFU1BPTlNFXCIsIHJlcXVlc3QsIHR5cGVvZiByZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcXVlc3QucmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ05ldHdvcmsgRXJyb3InKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFqYXg7IiwiLyoqIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBUSFJFRS5WZWN0b3IyLiAqL1xuXG5jbGFzcyBWZWN0b3IyIHtcbiAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9XG5cbiAgdHJ1bmMobWlueCwgbWlueSwgbWF4eCwgbWF4eSkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihcbiAgICAgIHRoaXMueCA8IG1pbnggPyBtaW54IDogKHRoaXMueCA+IG1heHggPyBtYXh4IDogdGhpcy54KSxcbiAgICAgIHRoaXMueSA8IG1pbnkgPyBtaW55IDogKHRoaXMueSA+IG1heHkgPyBtYXh5IDogdGhpcy55KSxcbiAgICApXG4gIH1cblxuICBjb3B5KHYpIHtcbiAgICB0aGlzLnggPSB2Lng7XG4gICAgdGhpcy55ID0gdi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWRkKHYpIHtcbiAgICBpZiAoIXYpIHtcbiAgICAgIHRocm93IFwiVmVjdG9yIHYgbm90IGRlZmluZWRcIjtcbiAgICB9XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZGlzdGFuY2VUbyh2KSB7XG4gICAgY29uc3QgZHggPSB2LnggLSB0aGlzLngsIGR5ID0gdi55IC0gdGhpcy55O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpXG4gIH1cblxuICBzdWJWZWN0b3JzKGEsIGIpIHtcbiAgICB0aGlzLnggPSBhLnggLSBiLng7XG4gICAgdGhpcy55ID0gYS55IC0gYi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0TGVuZ3RoKGxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZSgpLm11bHRpcGx5U2NhbGFyKGxlbmd0aCk7XG4gIH1cblxuICBub3JtYWxpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKHRoaXMubGVuZ3RoKCkgfHwgMSk7XG4gIH1cblxuICBkaXZpZGVTY2FsYXIocykge1xuICAgIHRoaXMueCAvPSBzO1xuICAgIHRoaXMueSAvPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbXVsdGlwbHlTY2FsYXIocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGVuZ3RoKCkge1xuICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcbiAgfVxufVxuXG5leHBvcnQge1ZlY3RvcjJ9O1xuIiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi92ZWN0b3IyXCI7XG5cbnZhciB1aWQgPSAxMTExMDtcblxuY2xhc3MgRW50aXR5IHtcbiAgY29uc3RydWN0b3IoaGVpZ2h0bWFwLCBvcHMpIHtcblxuICAgIHZhciBlbnRpdHkgPSBvcHMuZW50aXR5VHlwZXNbb3BzLnR5cGVdO1xuICAgIGlmICghZW50aXR5KSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJFbnRpdHk6IE5vIEVudGl0eS1UeXBlIG5hbWVkIFwiICsgb3BzLnR5cGUgKyBcIiBmb3VuZCFcIik7XG4gICAgICBlbnRpdHkgPSB7fTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBlbnRpdHkpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgb3BzKTtcbiAgICAvLyBGSVhNRTogcmVkdWNlIGNvbXBsZXhpdHkgYW5kIHJlZmVyZW5jZXMgYnkgcmVtb3ZpbmcgbW9kZWxzLCBtYXAgYW5kIHNvID8/P1xuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLnBvcylcbiAgICB0aGlzLnR5cGVOYW1lID0gdGhpcy50eXBlO1xuICAgIHRoaXMudWlkID0gdWlkKys7XG4gICAgdGhpcy5tYXAgPSBoZWlnaHRtYXA7XG4gICAgLy8gY2xvbmVcbiAgICB0aGlzLnJlc291cmNlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucmVzb3VyY2VzKTtcbiAgICB0aGlzLnR5cGUgPSBlbnRpdHk7XG4gICAgaWYgKCF0aGlzLm1lc2hOYW1lKVxuICAgICAgdGhpcy5tZXNoTmFtZSA9IFwiZGVmYXVsdFwiO1xuXG4gICAgaWYgKGVudGl0eS5taXhpbnMpIHtcbiAgICAgIHRoaXMubWl4aW5zID0ge307XG4gICAgICB0aGlzLm1peGluTmFtZXMgPSBbXTtcbiAgICAgIHRoaXMubWl4aW5EZWYgPSBlbnRpdHkubWl4aW5zO1xuICAgICAgY29uc29sZS5sb2coXCJNSVhJTkRFRlNcIiwgb3BzLm1peGluRGVmcylcbiAgICAgIGVudGl0eS5taXhpbnMuZm9yRWFjaChtaXhpbiA9PiB7XG4gICAgICAgIHZhciBmb3VuZCA9IG9wcy5taXhpbkRlZnNbbWl4aW5dO1xuICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICBmb3VuZCA9IGZvdW5kKCk7XG4gICAgICAgICAgdGhpcy5taXhpbnNbbWl4aW5dID0gZm91bmQ7XG4gICAgICAgICAgdGhpcy5taXhpbk5hbWVzLnB1c2gobWl4aW4pO1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgZm91bmQpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiRk9VTkRcIixmb3VuZCx0aGlzKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWl4aW4gbm90IGZvdW5kXCIsIG1peGluKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgZ2V0IGlkKCkge1xuICAgIHJldHVybiB0aGlzLnVpZFxuICB9XG5cbiAgcnVuUG9zdExvYWQoKSB7XG4gICAgZm9yICh2YXIgbWl4aW4gaW4gdGhpcy5taXhpbnMpIHtcbiAgICAgIGlmICh0aGlzLm1peGluc1ttaXhpbl0ucG9zdExvYWQpIHtcbiAgICAgICAgdGhpcy5taXhpbnNbbWl4aW5dLnBvc3RMb2FkLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpc0EobWl4aW4pIHtcbiAgICByZXR1cm4gdGhpcy5taXhpbkRlZi5pbmRleE9mKG1peGluKSA+PSAwO1xuICB9XG5cbiAgYXN5bmMgc2V0U2NlbmUoc2NlbmUpIHtcbiAgICB0aGlzLnNjZW5lID0gc2NlbmU7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0TWVzaCh0aGlzLm1lc2hOYW1lKTtcbiAgfTtcblxuICBjb21wdXRlTWVzaFBvcygpIHtcbiAgICBjb25zdCBoID0gdGhpcy5tYXAuZ2V0KFwicm9ja1wiKS5pbnRlcnBvbGF0ZSh0aGlzLnBvcy54LCB0aGlzLnBvcy55KTtcbiAgICByZXR1cm4ge3g6IHRoaXMucG9zLngsIHk6IGgsIHo6IC10aGlzLnBvcy55fTtcbiAgfVxuXG4gIHVwZGF0ZU1lc2hQb3MoKSB7XG4gICAgaWYgKHRoaXMubWVzaCkge1xuICAgICAgaWYgKHRoaXMubWVzaCAmJiB0aGlzLm1lc2gucm90YXRpb24gJiYgdGhpcy5yb3RhdGlvbikge1xuICAgICAgICB0aGlzLm1lc2gucm90YXRpb24ueSA9IHRoaXMucm90YXRpb247XG4gICAgICB9XG4gICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMuY29tcHV0ZU1lc2hQb3MoKTtcbiAgICAgIHRoaXMubWVzaC5zZXRQb3MocG9zaXRpb24ueCwgcG9zaXRpb24ueSwgcG9zaXRpb24ueik7XG4gICAgfVxuICB9O1xuXG4gIGdldE1lc2hEZWYoKSB7XG4gICAgY29uc3QgZW50aXR5ID0gdGhpcy50eXBlO1xuICAgIHZhciBtZXNoVHlwZTtcbiAgICB2YXIgYW5pbWF0aW9uO1xuXG4gICAgaWYgKHRoaXMudHlwZS5tZXNoZXMpIHtcbiAgICAgIHZhciBkZWYgPSBlbnRpdHkubWVzaGVzW3RoaXMubWVzaE5hbWVdO1xuICAgICAgaWYgKCFkZWYpXG4gICAgICAgIGNvbnNvbGUud2FybihcIk5vIE1lc2ggb2YgbmFtZSAnXCIgKyBuYW1lICsgXCInIGZvdW5kIGluIGVudGl0eS1kZWZcIiwgZW50aXR5KTtcbiAgICAgIG1lc2hUeXBlID0gZGVmLm1lc2g7XG4gICAgICBhbmltYXRpb24gPSBkZWYuYW5pbWF0aW9uO1xuICAgIH0gZWxzZSBpZiAoZW50aXR5Lm1lc2gpIHtcbiAgICAgIG1lc2hUeXBlID0gZW50aXR5Lm1lc2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc2hUeXBlID0gdGhpcy50eXBlTmFtZTtcbiAgICB9XG4gICAgcmV0dXJuIHttZXNoVHlwZSwgYW5pbWF0aW9ufTtcbiAgfVxuXG4gIHNldE1lc2gobmFtZSkge1xuXG4gICAgaWYobmFtZSkge1xuICAgICAgdGhpcy5tZXNoTmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgY29uc3Qge21lc2hUeXBlLCBhbmltYXRpb259ID0gdGhpcy5nZXRNZXNoRGVmKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tb2RlbExvYWRlci5sb2FkKG1lc2hUeXBlLCBhbmltYXRpb24pLnRoZW4oKG1lc2gpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTU9ERUwgbG9hZGVkXCIsIG1lc2gsIG1lc2hUeXBlLCBhbmltYXRpb24sIHRoaXMuc2NlbmUpO1xuICAgICAgbWVzaC5hdHRhY2hUb1NjZW5lKHRoaXMuc2NlbmUpO1xuICAgICAgLy8sIHRoaXMsIHNlbGYuc2NlbmUsIChtZXNoKSA9PiB7XG5cbiAgICAgIGlmICh0aGlzLm1lc2gpIHtcbiAgICAgICAgdGhpcy5tZXNoLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXNoID0gbWVzaDtcbiAgICAgIG1lc2guc2V0RW50aXR5KHRoaXMpO1xuICAgICAgdGhpcy51cGRhdGVNZXNoUG9zKCk7XG4gICAgICBpZiAodGhpcy5hbmltYXRpb25GaW5pc2hlZCkge1xuICAgICAgICB0aGlzLm1lc2guYW5pbWF0aW9uRmluaXNoZWQgPSB0aGlzLmFuaW1hdGlvbkZpbmlzaGVkLmJpbmQodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLm1lc2guaG92ZXJlZCh0aGlzLnN0YXRlLmhvdmVyZWQpO1xuICAgICAgdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQpO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9KTtcbiAgfTtcblxuICBob3ZlcmVkKHZhbCkge1xuICAgIHJldHVybiB0aGlzLm1lc2guaG92ZXJlZCh0aGlzLnN0YXRlLmhvdmVyZWQgPSB2YWwpO1xuICB9O1xuXG4gIHNlbGVjdGVkKHZhbCkge1xuICAgIHJldHVybiB0aGlzLm1lc2guc2VsZWN0ZWQodGhpcy5zdGF0ZS5zZWxlY3RlZCA9IHZhbCk7XG4gIH07XG5cbiAgaW5jcmVhc2VCeSh3aGF0LCBhbW91bnQpIHtcbiAgICB0aGlzLnJlc291cmNlc1t3aGF0XSA9ICh0aGlzLnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgfTtcblxuICB0YWtlKHdoYXQsIGFtb3VudCkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgZ2l2ZSh3aGF0LCBhbW91bnQsIHRvRW50aXR5KSB7XG4gICAgaWYgKHRoaXMucmVzb3VyY2VzW3doYXRdID49IGFtb3VudCkge1xuICAgICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gLT0gYW1vdW50O1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkdJVkUgVE9cIiwgdG9FbnRpdHksIHdoYXQpO1xuICAgICAgdG9FbnRpdHkucmVzb3VyY2VzW3doYXRdID0gKHRvRW50aXR5LnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IHtFbnRpdHl9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgICBcIm1lc2hcIjogXCJiYWtlcnkzXCJcbiAgfSxcbiAgXCJiaWdfc3RvbmVcIjoge1xuICAgIFwibWVzaFwiOiBcImJpZ19zdG9uZTNcIlxuICB9LFxuICBcImNyb3Bfc21hbGxcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfbWVkXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX2hpZ2hcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfdGlueVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiY3JvcF90aW55MlwiLFxuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImZhcm1cIjoge1xuICAgIFwibWVzaFwiOiBcImZhcm0yXCJcbiAgfSxcbiAgXCJmaXNoaW5nX2h1dFwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlzaGluZ19odXQyXCIsXG4gIH0sXG4gIFwiZ3JhdmVcIjoge1xuICAgIFwibWVzaFwiOiBcImdyYXZlMlwiXG4gIH0sXG4gIFwiaGVyb1wiOiB7XG4gICAgXCJtZXNoXCI6IFwiaGVyb19scDJcIlxuICB9LFxuICBcIm1pbmVcIjoge1xuICAgIFwibWVzaFwiOiBcIm1pbmUzXCJcbiAgfSxcbiAgXCJtaWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtaWxsXCIsXG4gICAgXCJzY2FsZVwiOiAxXG4gIH0sXG4gIFwidG93bmhhbGxcIjoge1xuICAgIFwibWVzaFwiOiBcInRvd25oYWxsX3RyeTNcIlxuICB9LFxuICBcInRvd2VyXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0b3dlcjJcIlxuICB9LFxuICBcIm1hbl9waWNrXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fcGlja1wiLFxuICAgIFwidGV4dHVyZVwiOiBcIm1hbl9maWdodC5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA0NSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDgsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMzUsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwaWNrXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2F4ZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2F4ZVwiLFxuICAgIFwidGV4dHVyZVwiOiBcIm1hbl9maWdodC5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDQwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAzNSxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAyNyxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBpY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fZV93YWxrXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInNpdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDMwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMjAsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMjAsXG4gICAgICAgIFwiYW5pbWF0ZVwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwic2l0ZG93blwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAxOCxcbiAgICAgICAgXCJsb29wXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJzdGFuZFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDAsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDBcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAzMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDY1XG4gICAgICB9LFxuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMTAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA2NVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fZmlnaHRcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9maWdodFwiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJmaWdodFwiOiB7XG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQxLFxuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAxOCxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN3b3JkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAzNSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN3b3JkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAyMCxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInVnaFwiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcImZpclwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlyNFwiXG4gIH0sXG4gIFwiZmlyX29sZFwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlyMlwiLFxuICAgIFwidGV4dHVyZVwiOiBcImZpcjUucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjQyLFxuICAgIFwiZG91Ymxlc2lkZWRcIjogdHJ1ZSxcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWVcbiAgfSxcblxuICBcInRyZWVcIjoge1xuICAgIFwibWVzaFwiOiBcInRyZWU1XCIsXG4gICAgXCJzY2FsZVwiOiAwLjIsXG4gICAgXCJkb3VibGVzaWRlZFwiOiB0cnVlXG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwic2NhbGVcIjogMC4xNSxcbi8vICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwidGV4dHVyZVwiOiBcInNoZWVwLnBuZ1wiLFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDVcbiAgICAgIH0sXG4gICAgICBcImVhdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJsb29wXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNjAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAxMDBcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwid2VsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwid2VsbFwiXG4gIH0sXG4gIFwid29ya3Nob3BcIjoge1xuICAgIFwibWVzaFwiOiBcIndvcmtzaG9wMlwiLFxuICAgIFwicGFydGljbGVzXCI6IHtcbiAgICAgIFwic21va2VcIjoge1xuICAgICAgICBcInBvc2l0aW9uXCI6IHtcbiAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICBcInpcIjogMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJjb25zdCBvbmx5T25lQXRBVGltZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHdpdGhpbiA9IGZhbHNlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoZmN0KSB7XG4gICAgICAgIGlmICh3aXRoaW4pIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gb25seU9uZUF0QVRpbWUoZmN0KSwgMTApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aXRoaW49dHJ1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZmN0KCk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHdpdGhpbiA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkoKTtcblxuXG5jbGFzcyBNb2RlbCB7XG4gICAgY29uc3RydWN0b3IoaW5uZXJNZXNoZXMsIG91dGVyTm9kZSwgaG92ZXJSaW5nLCBzZWxlY3RSaW5nKSB7XG4gICAgICAgIHRoaXMuaW5uZXJNZXNoZXMgPSBpbm5lck1lc2hlcztcbiAgICAgICAgdGhpcy5vdXRlck5vZGUgPSBvdXRlck5vZGU7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5yb3RhdGlvbiA9IHRoaXMub3V0ZXJOb2RlLnJvdGF0aW9uO1xuICAgICAgICB0aGlzLmhvdmVyUmluZyA9IGhvdmVyUmluZztcbiAgICAgICAgdGhpcy5zZWxlY3RSaW5nID0gc2VsZWN0UmluZztcbiAgICB9XG5cbiAgICBhdHRhY2hUb1NjZW5lKHNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICAgICAgaWYoZmFsc2UpIHtcbiAgICAgICAgICAgIG9ubHlPbmVBdEFUaW1lKCgpID0+IHNjZW5lLmFkZCh0aGlzLm91dGVyTm9kZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NlbmUuYWRkKHRoaXMub3V0ZXJOb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0RW50aXR5KGVudGl0eSkge1xuICAgICAgICBfLmVhY2godGhpcy5pbm5lck1lc2hlcywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIG0udXNlckRhdGEuZW50aXR5ID0gZW50aXR5O1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIGhvdmVyZWQodmFsKSB7XG4gICAgICAgIGlmICh2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5ob3ZlclJpbmcudmlzaWJsZSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5ob3ZlclJpbmcudmlzaWJsZTtcbiAgICB9XG5cbiAgICBzZWxlY3RlZCh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdFJpbmcudmlzaWJsZSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RSaW5nLnZpc2libGU7XG4gICAgfVxuXG4gICAgZGV0YWNoRnJvbVNjZW5lKCkge1xuICAgICAgICBzY2VuZS5yZW1vdmUodGhpcy5vdXRlck5vZGUpXG4gICAgfVxuXG4gICAgc2V0UG9zKHgsIHksIHopIHtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueCA9IHg7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnkgPSB5O1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi56ID0gejtcbiAgICB9XG5cbiAgICBlbmFibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAoIXRoaXMuZW1pdHRlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIEVOQUJMRVwiKTtcbiAgICAgICAgICAgIHZhciBlbWl0dGVyID0gdGhpcy5lbWl0dGVyID0gdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKCk7IC8vYWRkRW1pdHRlciggQmFzZS5tYWtlRW1pdHRlcihuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCkpKTtcbiAgICAgICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGlzYWJsZVBhcnRpY2xlcyh0eXBlKSB7XG4gICAgICAgIGlmICh0aGlzLmVtaXR0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5kaXNhYmxlKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVsIC0gRElTQUJMRVwiLCB0eXBlKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmVtaXR0ZXI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUkVNT1ZFIE1FIEZST00gU0NFTkVcIiwgdGhpcyk7XG4gICAgICAgIC8vIGhvb2sgdG8gcmVtb3ZlIGFuaW1hdGlvbi1yZXN0YXJ0ZXItaW50ZXJ2YWxcbiAgICAgICAgaWYgKHRoaXMuaW5uZXJNZXNoZXMgJiYgdGhpcy5pbm5lck1lc2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBfLmVhY2godGhpcy5pbm5lck1lc2hlcywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICBpZiAobS5iZWZvcmVSZW1vdmUpXG4gICAgICAgICAgICAgICAgICAgIG0uYmVmb3JlUmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjZW5lLnJlbW92ZSh0aGlzLm91dGVyTm9kZSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLm91dGVyTm9kZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vZGVsOyIsImltcG9ydCBNZXNoZXMgZnJvbSBcIi4uL2NvbmZpZy9tZXNoZXNcIlxuaW1wb3J0IE1vZGVsIGZyb20gXCIuL21vZGVsXCJcblxuLy8gRklYTUU6IG5vdCBuZWVkZWQgYW55bW9yZT9cbmZ1bmN0aW9uIGVuc3VyZUxvb3AoYW5pbWF0aW9uKSB7XG4gIHJldHVybjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmltYXRpb24uaGllcmFyY2h5Lmxlbmd0aDsgaSsrKSB7XG5cbiAgICB2YXIgYm9uZSA9IGFuaW1hdGlvbi5oaWVyYXJjaHlbaV07XG5cbiAgICB2YXIgZmlyc3QgPSBib25lLmtleXNbMF07XG4gICAgdmFyIGxhc3QgPSBib25lLmtleXNbYm9uZS5rZXlzLmxlbmd0aCAtIDFdO1xuXG4gICAgbGFzdC5wb3MgPSBmaXJzdC5wb3M7XG4gICAgbGFzdC5yb3QgPSBmaXJzdC5yb3Q7XG4gICAgbGFzdC5zY2wgPSBmaXJzdC5zY2w7XG4gIH1cbn1cblxuY2xhc3MgTW9kZWxMb2FkZXIge1xuXG4gIGNvbnN0cnVjdG9yKGxvYWRlcnMgPSB7fSwgbWFuYWdlciA9IG51bGwsIG1lc2hlcyA9IG51bGwpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIF8ucGljayhsb2FkZXJzLCBbJ29iakxvYWRlcicsICdqc29uTG9hZGVyJywgJ2ltYWdlTG9hZGVyJ10pKTtcblxuICAgIGlmICghbWFuYWdlciAmJiBUSFJFRS5Mb2FkaW5nTWFuYWdlcikge1xuICAgICAgbWFuYWdlciA9IG5ldyBUSFJFRS5Mb2FkaW5nTWFuYWdlcigpO1xuICAgIH1cbiAgICBpZiAobWVzaGVzICE9IG51bGwpIHtcbiAgICAgIHRoaXMubWVzaGVzID0gbWVzaGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IE1lc2hlcztcbiAgICB9XG4gICAgbWFuYWdlci5vblByb2dyZXNzID0gZnVuY3Rpb24gKGl0ZW0sIGxvYWRlZCwgdG90YWwpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoXCJtYW5hZ2VyLm9uUHJvZ3Jlc3NcIiwgaXRlbSwgbG9hZGVkLCB0b3RhbCk7XG4gICAgfTtcblxuICAgIGlmICghdGhpcy5qc29uTG9hZGVyKSB7XG4gICAgICAvL3RoaXMuanNvbkxvYWRlciA9IG5ldyBUSFJFRS5KU09OTG9hZGVyKG1hbmFnZXIpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuaW1hZ2VMb2FkZXIgJiYgVEhSRUUuSW1hZ2VMb2FkZXIpIHtcbiAgICAgIHRoaXMuaW1hZ2VMb2FkZXIgPSBuZXcgVEhSRUUuSW1hZ2VMb2FkZXIobWFuYWdlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIgJiYgVEhSRUUuR0xURkxvYWRlcikge1xuICAgICAgdGhpcy5nbHRmTG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgIGlmICghdGhpcy50ZXh0dXJlTG9hZGVyICYmIFRIUkVFLlRleHR1cmVMb2FkZXIpIHtcbiAgICAgIHRoaXMudGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiBjb2xvcixcbiAgICAgIGZsYXRTaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC41XG4gICAgfSk7XG4gICAgY29uc3QgaG92ZXJSaW5nID0gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLlJpbmdHZW9tZXRyeSgxLjMsIDIsIDIwLCA1LCAwLCBNYXRoLlBJICogMiksIG1hdGVyaWFsKTtcbiAgICBob3ZlclJpbmcucG9zaXRpb24uc2V0KDAsIDAsIDAuMik7XG4gICAgaG92ZXJSaW5nLnJvdGF0ZU9uQXhpcyhuZXcgVEhSRUUuVmVjdG9yMygxLCAwLCAwKSwgLTEuNik7XG4gICAgaG92ZXJSaW5nLnZpc2libGUgPSBmYWxzZTtcbiAgICByZXR1cm4gaG92ZXJSaW5nXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlQm94KCkge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZGQ5OTAwLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjVcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEsIDEsIDEpLCBtYXRlcmlhbCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gIH1cblxuICBhc3luYyBwYWNrSW50b05vZGUob3B0aW9ucykge1xuICAgIGNvbnN0IHttZXNoRGVmLCBtZXNoLCBtZXNoTmFtZX0gPSBvcHRpb25zO1xuICAgIHZhciBvYmplY3RzO1xuICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cyA9IG1lc2guY2xvbmUoKTtcbiAgICB9XG4gICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcblxuICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgIC8vIGVuY2xvc2UgbWVzaCB3aXRoaW4gc2NlbmUtbm9kZSwgc28gdGhhdCBpdCBjYW4gYmUgcm90YXRlZCBhbmQgdGhlcmUgY2FuIGJlIHNldmVyYWwgbWVzaGVzXG4gICAgLy8gYXR0YWNoZWQgdG8gb25lIGVudGl0eVxuICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIF8uZWFjaChvYmplY3RzLCBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICBub2RlLmFkZChvYmplY3QpO1xuICAgIH0pO1xuICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgbmV3TW9kZWwubmFtZSA9IG1lc2g7XG4gICAgbmV3TW9kZWwudHlwZSA9IG1lc2hOYW1lO1xuXG4gICAgdGhpcy5hZGRSaW5ncyhub2RlLCBuZXdNb2RlbCk7XG5cbiAgICByZXR1cm4gbmV3TW9kZWxcbiAgfVxuXG4gIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuaG92ZXJSaW5nID0gTW9kZWxMb2FkZXIuY3JlYXRlUmluZygweGRkOTkwMCkpO1xuICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4RkY5OTAwKSk7XG4gIH1cblxuICBhc3luYyBsb2FkVW5jYWNoZWQobWVzaCwgYW5pbWF0aW9uKSB7XG4gICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgIGlmICghbWVzaERlZikge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBkZWZpbmVkIGZvciBuYW1lICdcIiArIG1lc2ggKyBcIidcIik7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRGY3QgPSAobWVzaERlZi50eXBlID09PSBcImpzb25cIikgPyBcImxvYWRKU09OXCIgOiBcImxvYWRPYmpDb21wbGV0ZVwiO1xuXG4gICAgaWYgKGxvYWRGY3QgPT0gXCJsb2FkSlNPTlwiKSB7XG4gICAgICAvL0ZJWE1FXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoXy5pZGVudGl0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbbG9hZEZjdF0obWVzaCwgYW5pbWF0aW9uKVxuICB9XG5cblxuICBhc3luYyBsb2FkT2JqKG1lc2hOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgaWYgKHRoaXMuZ2x0ZkxvYWRlcikge1xuICAgICAgICB0aGlzLmdsdGZMb2FkZXIubG9hZChcbiAgICAgICAgICAnbW9kZWxzLycgKyBtZXNoTmFtZSArICcuZ2x0ZicsXG4gICAgICAgICAgbWVzaCA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHttZXNoLCBtZXNoTmFtZX0pXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoeGhyKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNoTmFtZSArIFwiIFwiICsgKHhoci5sb2FkZWQgLyB4aHIudG90YWwgKiAxMDApICsgJyUgbG9hZGVkJyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZWplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vYmpMb2FkZXIubG9hZChcbiAgICAgICAgICAnbW9kZWxzLycgKyBtZXNoTmFtZSArICcub2JqJyxcbiAgICAgICAgICBtZXNoID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoe21lc2gsIG1lc2hOYW1lfSlcbiAgICAgICAgICB9LFxuICAgICAgICAgIG51bGwsXG4gICAgICAgICAgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmpDb21wbGV0ZShuYW1lLCBkdW1teSkge1xuICAgIGNvbnN0IG1lc2hEZWYgPSB0aGlzLm1lc2hlc1tuYW1lXTtcbiAgICBjb25zdCBtZXNoTmFtZSA9IChtZXNoRGVmICYmIG1lc2hEZWYubWVzaCkgfHwgbmFtZTtcbiAgICBjb25zb2xlLmxvZyhcIkxvYWQgdGV4dHVyZVwiLCBuYW1lLCBtZXNoTmFtZSk7XG4gICAgY29uc3QgbWVzaE9iamVjdCA9IGF3YWl0IHRoaXMubG9hZE9iaihtZXNoTmFtZSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIk1PREVMT0JKRUNUIFwiLCBuYW1lLCBtZXNoT2JqZWN0KTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHttZXNoRGVmfSwgbWVzaE9iamVjdCk7XG4gIH1cblxuICAvLyBhbmltYXRlIChjbG9uZWQpIG1lc2hcbiAgYW5pbWF0ZShtZXNoLCBuYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gbmV3IFRIUkVFLkFuaW1hdGlvbihtZXNoLCBhbmltYXRpb25zW25hbWVdKTtcbiAgICBhbmltYXRpb24uZGF0YSA9IGFuaW1hdGlvbnNbbmFtZV07XG4gICAgY29uc3Qgc2NhbGUgPSBvcHRpb25zLnRpbWVTY2FsZSB8fCAxO1xuXG4gICAgaWYgKG9wdGlvbnMubG9vcCA9PT0gZmFsc2UpIHtcbiAgICAgIGFuaW1hdGlvbi5sb29wID0gZmFsc2U7XG4gICAgfVxuICAgIGFuaW1hdGlvbi50aW1lU2NhbGUgPSBzY2FsZTtcbiAgICBhbmltYXRpb24ucGxheSgpO1xuXG4gICAgLy8gaW1wbGVtZW50IHN1cHBvcnQgZm9yIGxvb3BpbmcgaW50ZXJ2YWwgd2l0aGluIGdsb2JhbCBhbmltYXRpb25cbiAgICAvLyBoYXZlIGEgbG9vayBhdCBlbnRpdHkgYWxzb1xuICAgIGlmIChvcHRpb25zLnN0YXJ0RnJhbWUpIHtcbiAgICAgIC8vYW5pbWF0aW9uLnVwZGF0ZSggb3B0aW9ucy5zdGFydEZyYW1lKTtcbiAgICAgIGlmIChvcHRpb25zLmFuaW1hdGUgPT09IGZhbHNlICYmIGZhbHNlKSB7XG4gICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgIGFuaW1hdGlvbi51cGRhdGUob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5lbmRGcmFtZSkge1xuICAgICAgICB2YXIgc3RhcnRBbmltYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYW5pbWF0aW9uLnBsYXkob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHN0b3BBbmltYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBzdG9wQU5pbWF0aW9uXCIsIG1lc2gsIG1lc2guYW5pbWF0aW9uRmluaXNoZWQpO1xuICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgaWYgKG1lc2gudXNlckRhdGEgJiYgbWVzaC51c2VyRGF0YS5lbnRpdHkgJiYgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQpXG4gICAgICAgICAgICBtZXNoLnVzZXJEYXRhLmVudGl0eS5hbmltYXRpb25GaW5pc2hlZCgpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgdGltZSA9IDEwMDAgKiAob3B0aW9ucy5lbmRGcmFtZSAtIG9wdGlvbnMuc3RhcnRGcmFtZSkgLyBzY2FsZTtcbiAgICAgICAgc3RhcnRBbmltYXRpb24oKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubG9vcCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChzdGFydEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiQU5JTUFMIERPTlQgTE9PUFwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChzdG9wQW5pbWF0aW9uLCB0aW1lKTtcbiAgICAgICAgICBtZXNoLmJlZm9yZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgfVxuICAgIH0gZWxzZVxuICAgICAgYW5pbWF0aW9uLnVwZGF0ZShNYXRoLnJhbmRvbSgpICogMTApO1xuICB9XG5cbiAgbG9hZEpTT04obmFtZSwgYW5pbWF0aW9uKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLm1lc2hlc1tuYW1lXSk7XG5cbiAgICAvLyBub3cgb3ZlcnJpZGUgd2l0aCBvcHRpb25zIGZyb20gYW5pbWF0aW9ucy1wYXJ0XG4gICAgaWYgKG9wdGlvbnMuYW5pbWF0aW9uc1thbmltYXRpb25dKSB7XG4gICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiTG9hZGluZyBtb2RlbFwiLCBuYW1lKTtcblxuICAgICAgdmFyIHRleHR1cmUgPSBuZXcgVEhSRUUuVGV4dHVyZSgpO1xuICAgICAgdGhpcy5qc29uTG9hZGVyLmxvYWQoJ21vZGVscy8nICsgbmFtZSArICcuanNvbicsIGZ1bmN0aW9uIChnZW9tZXRyeSwgbWF0ZXJpYWxzKSB7XG5cbiAgICAgICAgZ2VvbWV0cnkuY29tcHV0ZVZlcnRleE5vcm1hbHMoKTtcbiAgICAgICAgZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XG5cbiAgICAgICAgZW5zdXJlTG9vcChnZW9tZXRyeS5hbmltYXRpb24pO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRlcmlhbHMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuXG4gICAgICAgICAgdmFyIG9yaWdpbmFsTWF0ZXJpYWwgPSBtYXRlcmlhbHNbaV07XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIk1BVFwiLCBvcmlnaW5hbE1hdGVyaWFsKTtcbiAgICAgICAgICBvcmlnaW5hbE1hdGVyaWFsLnNraW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZCkge1xuICAgICAgICAgICAgLy8gIG9yaWdpbmFsTWF0ZXJpYWwuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiRE9VQkxFXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoRmFjZU1hdGVyaWFsKG1hdGVyaWFscyk7XG4gICAgICAgIGlmIChvcHRpb25zLmRvdWJsZXNpZGVkKVxuICAgICAgICAgIG1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZSkge1xuICAgICAgICAgIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgICAgIHdpcmVmcmFtZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbG9yOiAnYmx1ZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0TWF0ZXJpYWwpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgICAgICAgIGNvbG9yOiAnYmx1ZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLlNraW5uZWRNZXNoKGdlb21ldHJ5LCBtYXRlcmlhbCwgZmFsc2UpO1xuXG4gICAgICAgIGFuaW1hdGlvbnNbbmFtZV0gPSBnZW9tZXRyeS5hbmltYXRpb247XG5cbiAgICAgICAgcmVzb2x2ZShtZXNoKVxuICAgICAgfSwgbnVsbCwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb2RlbExvYWRlcjtcbiIsImNsYXNzIEpvYiB7XG4gICAgY29uc3RydWN0b3IoZW50aXR5KSB7XG4gICAgICAgIHRoaXMuX2VudGl0eSA9IGVudGl0eTtcbiAgICAgICAgdGhpcy5fcmVhZHkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXQgcmVhZHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeTtcbiAgICB9XG5cbiAgICBnZXQgZW50aXR5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW50aXR5XG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIHRoaXMuX3JlYWR5ID0gdHJ1ZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEpvYjsiLCJjbGFzcyBBbmdsZSB7XG4gIHN0YXRpYyBmcm9tVmVjdG9yMihkaXIpIHtcbiAgICByZXR1cm4gLU1hdGguYXRhbjIoZGlyLngsIGRpci55KSArIE1hdGguUEk7XG4gIH1cbn1cblxuZXhwb3J0IHtBbmdsZX1cbiIsImltcG9ydCBKb2IgZnJvbSAnLi9qb2InXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0FuZ2xlfSBmcm9tIFwiLi4vYW5nbGVcIlxuXG52YXIgdG1wRGlyID0gbmV3IFZlY3RvcjIoKTtcblxuY2xhc3MgTW92ZSBleHRlbmRzIEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgcG9zLCBkaXN0YW5jZSkge1xuICAgIHN1cGVyKGVudGl0eSk7XG4gICAgdGhpcy5zcGVlZCA9IGVudGl0eS5zcGVlZCB8fCAxO1xuICAgIHRoaXMubGx0YXJnZXRQb3MgPSBwb3M7XG4gICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlIHx8IDA7XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdmFyIGUgPSB0aGlzLmVudGl0eTtcbiAgICBpZiAodGhpcy5sbHRhcmdldFBvcykge1xuXG4gICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLmxsdGFyZ2V0UG9zLmRpc3RhbmNlVG8oZS5wb3MpO1xuICAgICAgdmFyIHRvZ28gPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XG5cbiAgICAgIGRpc3RhbmNlIC09IHRoaXMuZGlzdGFuY2U7XG4gICAgICB0bXBEaXIuc3ViVmVjdG9ycyh0aGlzLmxsdGFyZ2V0UG9zLCBlLnBvcykuc2V0TGVuZ3RoKHRvZ28pO1xuXG4gICAgICBlLnJvdGF0aW9uID0gQW5nbGUuZnJvbVZlY3RvcjIodG1wRGlyKTtcbiAgICAgIGlmIChkaXN0YW5jZSA8IHRvZ28pIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzdGFuY2UgPiAwKSB7XG4gICAgICAgICAgZS5wb3MgPSBuZXcgVmVjdG9yMigpLmNvcHkodGhpcy5sbHRhcmdldFBvcykuYWRkKG5ldyBWZWN0b3IyKCkuc3ViVmVjdG9ycyh0aGlzLmxsdGFyZ2V0UG9zLCBlLnBvcykuc2V0TGVuZ3RoKC10aGlzLmRpc3RhbmNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZS5wb3MgPSBuZXcgVmVjdG9yMigpLmNvcHkodGhpcy5sbHRhcmdldFBvcyk7XG4gICAgICAgIH1cblxuICAgICAgICBlLnVwZGF0ZU1lc2hQb3MoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMubGx0YXJnZXRQb3M7XG4gICAgICAgIHRoaXMuc2V0UmVhZHkoKTtcbiAgICAgICAgLy8gcmV0dXJuIHJlc3QgdGltZVxuICAgICAgICByZXR1cm4gKHRvZ28gLSBkaXN0YW5jZSkgLyB0aGlzLnNwZWVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZS5wb3MuYWRkKHRtcERpcik7XG4gICAgICB9XG5cbiAgICAgIGUudXBkYXRlTWVzaFBvcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRVJST1I6IG5vIGxsdGFyZ2V0cG9zIGRlZmluZWRcIik7XG4gICAgICAvLyB1c2UgdGhpcyBtYXliZSBmb3IgZm9sbG93aW5nIG90aGVyIGVudGl0aWVzXG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufVxuXG5leHBvcnQge01vdmV9O1xuIiwiaW1wb3J0IHtNb3ZlfSBmcm9tICcuLi9sbC9tb3ZlJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5sZXQgYW5pbWFsID0ge1xuICBvbk5vSm9iOiBmdW5jdGlvbiAoZGVsdGEpIHtcbiAgICBjb25zb2xlLmxvZyhcIk9OIE5PIEpPQlwiKTtcbiAgICBpZiAodGhpcy5zaG91bGRXYWxrKCkpIHtcbiAgICAgIHRoaXMuc2V0TWVzaChcIndhbGtcIik7XG4gICAgICBsZXQgdGFyZ2V0UG9zID0gbmV3IFZlY3RvcjIoTWF0aC5yYW5kb20oKSAqIDIgLSAxLFxuICAgICAgICBNYXRoLnJhbmRvbSgpICogMiAtIDEpLmFkZCh0aGlzLnBvcyk7XG5cbiAgICAgIGlmICh0aGlzLndvcmxkKSB7XG4gICAgICAgIHRhcmdldFBvcyA9IHRhcmdldFBvcy50cnVuYygwLCAwLCB0aGlzLndvcmxkLndpZHRoLCB0aGlzLndvcmxkLmhlaWdodCk7XG4gICAgICB9XG4gICAgICB0aGlzLnB1c2hKb2IobmV3IE1vdmUodGhpcywgdGFyZ2V0UG9zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGxheUFuaW1hdGlvbihcImVhdFwiKTtcbiAgICB9XG4gIH0sXG4gIHNob3VsZFdhbGs6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKE1hdGgucmFuZG9tKCkgPCAwLjUpO1xuICB9XG59O1xuXG5jb25zdCBBbmltYWwgPSAoKSA9PiBhbmltYWw7XG5cbmV4cG9ydCBkZWZhdWx0IEFuaW1hbDtcblxuIiwiaW1wb3J0IEpvYiBmcm9tICcuL2pvYidcblxuY2xhc3MgUmVzdEpvYiBleHRlbmRzIEpvYiB7XG4gICAgY29uc3RydWN0b3IoZW50aXR5LCB0aW1lKSB7XG4gICAgICAgIHN1cGVyKGVudGl0eSlcbiAgICAgICAgdGhpcy50aW1lID0gdGltZTtcbiAgICAgICAgdGhpcy5kb25lVGltZSA9IDA7XG4gICAgfVxuXG4gICAgLy8gbWF5YmUgaW1wbGVtZW50IHVzaW5nIHNldFRpbWVvdXQgP1xuICAgIG9uRnJhbWUoZGVsdGEpIHtcbiAgICAgICAgdGhpcy5kb25lVGltZSArPSBkZWx0YTtcbiAgICAgICAgaWYgKHRoaXMuZG9uZVRpbWUgPiB0aGlzLnRpbWUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRvbmVUaW1lIC0gdGhpcy50aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc3RKb2I7XG5cbiIsImltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmxldCBqb2IgPSB7XG4gIGpvYnM6IG51bGwsXG4gIHB1c2hKb2I6IGZ1bmN0aW9uIChqb2IpIHtcbiAgICBpZiAoIXRoaXMuam9icylcbiAgICAgIHRoaXMuam9icyA9IFtdO1xuICAgIGlmICh0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdICYmIHRoaXMuam9ic1t0aGlzLmpvYnMubGVuZ3RoIC0gMV0ucmVhZHkpIHtcbiAgICAgIHRocm93IFwiSm9iIGlzIHJlYWR5IC0gZG9udCcgcHVzaCFcIjtcbiAgICB9XG4gICAgdGhpcy5qb2JzLnB1c2goam9iKTtcbiAgICB0aGlzLnVwZGF0ZUN1cnJlbnRKb2IoKTtcbiAgICBpZiAodGhpcy5jdXJyZW50Sm9iLmluaXQpXG4gICAgICB0aGlzLmN1cnJlbnRKb2IuaW5pdCgpO1xuICB9LFxuICByZXNldE5vbkhsSm9iczogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmpvYnMpXG4gICAgICB0aGlzLmpvYnMgPSBfLmZpbHRlcih0aGlzLmpvYnMsIGZ1bmN0aW9uIChqb2IpIHtcbiAgICAgICAgcmV0dXJuIGpvYi5hc3NpZ25NZUpvYjtcbiAgICAgIH0pO1xuICB9LFxuICByZXNldEpvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmpvYnMgPSBbXTtcbiAgICB0aGlzLnVwZGF0ZUN1cnJlbnRKb2IoKTtcbiAgfSxcbiAgdXBkYXRlQ3VycmVudEpvYjogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmpvYnMpXG4gICAgICB0aGlzLmN1cnJlbnRKb2IgPSB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdO1xuICB9LFxuICB0aWNrOiBmdW5jdGlvbiAoZGVsdGEpIHtcbiAgICB3aGlsZSAodGhpcy5qb2JzICYmIGRlbHRhID4gMCAmJiB0aGlzLmpvYnMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGpvYiA9IHRoaXMuam9ic1t0aGlzLmpvYnMubGVuZ3RoIC0gMV07XG4gICAgICBkZWx0YSA9IGpvYi5vbkZyYW1lKGRlbHRhKTtcbiAgICAgIGlmIChqb2IucmVhZHkpIHtcbiAgICAgICAgaWYgKGpvYi5hc3NpZ25NZUpvYikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiSk9CIFJFQURZISEhXCIsIHRoaXMuam9icyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5qb2JzLnBvcCgpO1xuICAgICAgICB0aGlzLnVwZGF0ZUN1cnJlbnRKb2IoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRlbHRhID4gMCkge1xuICAgICAgaWYgKHRoaXMub25Ob0pvYikge1xuICAgICAgICB0aGlzLm9uTm9Kb2IoZGVsdGEpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcGxheUFuaW1hdGlvbjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAvL0ZJWE1FOiBzZXQgYmFjayB0byAyMCAoPylcbiAgICB0aGlzLnB1c2hKb2IobmV3IFJlc3RKb2IodGhpcywgMikpO1xuICAgIHRoaXMuc2V0TWVzaChuYW1lKTtcbiAgfSxcbiAgYW5pbWF0aW9uRmluaXNoZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0Sm9icygpO1xuICB9XG59O1xuXG5jb25zdCBKb2IgPSAoKSA9PiBqb2I7XG5cbmV4cG9ydCB7Sm9ifVxuXG5cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICB9LFxuICBcImNyb3BcIjoge1xuICAgIFwibWVzaE5hbWVcIjogXCJ0aW55XCIsXG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJoaWdoXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9oaWdoXCJcbiAgICAgIH0sXG4gICAgICBcIm1lZFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfbWVkXCJcbiAgICAgIH0sXG4gICAgICBcInNtYWxsXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9zbWFsbFwiXG4gICAgICB9LFxuICAgICAgXCJ0aW55XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF90aW55XCJcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWlsbFwiOiB7XG4gIH0sXG4gIFwibWluZVwiOiB7XG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gIH0sXG4gIFwiZ3JhdmVcIjoge1xuICB9LFxuICBcIndlbGxcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3YXRlclwiXG4gICAgXSxcbiAgICBcInJlc291cmNlc1wiOiB7XG4gICAgICBcIndhdGVyXCI6IDEwMFxuICAgIH1cbiAgfSxcbiAgXCJmaXNoaW5nX2h1dFwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiXG4gICAgXVxuICB9LFxuICBcIndvcmtzaG9wXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxLFxuICAgICAgXCJ0b29sXCI6IDEwXG4gICAgfSxcbiAgICBcInByb2R1Y3Rpb25cIjoge1xuICAgICAgXCJ0b29sXCI6IHtcbiAgICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICAgIFwic3RvbmVcIjogMVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiLFxuICAgICAgXCJzbW9rZVwiXG4gICAgXVxuICB9LFxuICBcInRvd25oYWxsXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxXG4gICAgfSxcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImJvc3NcIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImhvdXNlXCJcbiAgICBdXG4gIH0sXG4gIFwiaGVyb1wiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImhlcm9cIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcInBsYXllclwiLFxuICAgIF1cbiAgfSxcbiAgXCJ0b3dlclwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcIm1hblwiOiB7XG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJzaXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic2l0XCJcbiAgICAgIH0sXG4gICAgICBcInNpdGRvd25cIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic2l0ZG93blwiXG4gICAgICB9LFxuICAgICAgXCJzdGFuZFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzdGFuZFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcIndhbGtcIlxuICAgICAgfSxcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzdGFuZFwiXG4gICAgICB9LFxuICAgICAgXCJmaWdodFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9maWdodFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImZpZ2h0XCJcbiAgICAgIH0sXG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fcGlja1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInBpY2tcIlxuICAgICAgfSxcbiAgICAgIFwiYXhlXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2F4ZVwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImF4ZVwiXG4gICAgICB9XG4gICAgfSxcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJmb2xsb3dlclwiXG4gICAgXVxuICB9LFxuICBcImZpclwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcIndvb2RcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3b29kXCI6IDVcbiAgICB9XG4gIH0sXG4gIFwidHJlZVwiOiB7XG4gIH0sXG4gIFwiYmlnX3N0b25lXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwic3RvbmVcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJzdG9uZVwiOiAyMFxuICAgIH1cbiAgfSxcbiAgXCJzaGVlcFwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiYW5pbWFsXCJcbiAgICBdLFxuICAgIFwic3BlZWRcIjogMC41LFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcInNoZWVwXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiZWF0XCJcbiAgICAgIH0sXG4gICAgICBcImVhdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcInNoZWVwXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiZWF0XCJcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcIndhbGtcIlxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgRW50aXR5IH0gZnJvbSAnLi9lbnRpdHknXG5pbXBvcnQgTW9kZWxMb2FkZXIgZnJvbSAnLi4vYmFzZTNkL21vZGVsX2xvYWRlcidcbmltcG9ydCAqIGFzIE1peGluIGZyb20gXCIuL21peGluXCJcbmltcG9ydCBFbnRpdHlUeXBlcyBmcm9tICcuLi9jb25maWcvZW50aXRpZXMnXG5cblxuY2xhc3MgV29ybGRMb2FkZXIge1xuICBsb2FkKHdvcmxkLCBkYXRhLCBvcHMpIHtcbiAgICBsZXQgYmFzaWNPcHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHMpO1xuXG4gICAgaWYgKCFiYXNpY09wcy5tb2RlbExvYWRlcikge1xuICAgICAgYmFzaWNPcHMubW9kZWxMb2FkZXIgPSBuZXcgTW9kZWxMb2FkZXIoKTtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5taXhpbkRlZnMpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTUlYSU4gREVGU1wiLCBNaXhpbilcbiAgICAgIGJhc2ljT3BzLm1peGluRGVmcyA9IE1peGluO1xuICAgIH1cbiAgICBpZiAoIWJhc2ljT3BzLmVudGl0eVR5cGVzKSB7XG4gICAgICBiYXNpY09wcy5lbnRpdHlUeXBlcyA9IEVudGl0eVR5cGVzO1xuICAgIH1cblxuICAgIGRhdGEuZm9yRWFjaChlbnRpdHlEZWZpbml0aW9uID0+XG4gICAgICB3b3JsZC5wdXNoKG5ldyBFbnRpdHkod29ybGQubWFwLCBPYmplY3QuYXNzaWduKHt9LCBiYXNpY09wcywgZW50aXR5RGVmaW5pdGlvbikpKVxuICAgICk7XG4gICAgd29ybGQuZW50aXRpZXMuZm9yRWFjaChlbnRpdHkgPT4gZW50aXR5LnBvc3RMb2FkICYmIGVudGl0eS5wb3N0TG9hZCgpKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdvcmxkTG9hZGVyXG4iLCJpbXBvcnQgV29ybGQgZnJvbSBcIi4uL2dhbWUvd29ybGRcIjtcbmltcG9ydCBIZWlnaHRNYXAgZnJvbSBcIi4uL2dhbWUvaGVpZ2h0bWFwXCI7XG5pbXBvcnQgYWpheCBmcm9tIFwiLi4vYWpheFwiXG5pbXBvcnQgV29ybGRMb2FkZXIgZnJvbSBcIi4uL2dhbWUvd29ybGQtbG9hZGVyXCJcblxuY2xhc3MgV29ybGRFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih3b3JsZCkge1xuICAgICAgICBzdXBlcihcIndvcmxkXCIpO1xuICAgICAgICB0aGlzLndvcmxkID0gd29ybGRcbiAgICB9XG59XG5cbmNsYXNzIEFnV29ybGQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMubWFwID0gbmV3IEhlaWdodE1hcCgpO1xuICAgICAgICB0aGlzLndvcmxkID0gbmV3IFdvcmxkKHRoaXMubWFwKTtcblxuICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRXb3JsZCh0aGlzLmdldEF0dHJpYnV0ZShcImxvYWRcIikpLnRoZW4odGhpcy5pbmZvcm0uYmluZCh0aGlzKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV0gPSB0aGlzLndvcmxkO1xuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBkZWxldGUgZG9jdW1lbnRbdGhpcy5leHBvc2VOYW1lXVxuICAgIH1cblxuICAgIGluZm9ybSgpIHtcbiAgICAgICAgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiKltpbmplY3Qtd29ybGRdXCIpLmZvckVhY2goZSA9PlxuICAgICAgICAgICAgZS5kaXNwYXRjaEV2ZW50KG5ldyBXb3JsZEV2ZW50KHRoaXMud29ybGQpKSlcbiAgICB9XG5cbiAgICBsb2FkV29ybGQodXJsKSB7XG4gICAgICAgIHJldHVybiBhamF4KHVybCkudGhlbihkYXRhID0+XG4gICAgICAgICAgICBuZXcgV29ybGRMb2FkZXIoKS5sb2FkKHRoaXMud29ybGQsIGRhdGEpXG4gICAgICAgIClcbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy13b3JsZCcpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy13b3JsZCcsIEFnV29ybGQpO1xufVxuXG4iLCJjbGFzcyBBZ0VudGl0eVZpZXcgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLmlubmVySFRNTDtcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIGlmICh0aGlzLmxpc3RlbmVyKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyLnJlbW92ZSgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB3b3JsZENyZWF0ZWQoZXYpIHtcbiAgICAgICAgdGhpcy53b3JsZCA9IGV2LndvcmxkO1xuICAgICAgICBjb25zdCBldmVudG5hbWUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImV2ZW50XCIpID09PSBcImhvdmVyZWRcIiA/IFwiaG92ZXJlZFwiIDogXCJzZWxlY3RlZFwiO1xuICAgICAgICB0aGlzLmV2ZW50bmFtZSA9IGV2ZW50bmFtZTtcbiAgICAgICAgdGhpcy5saXN0ZW5lciA9IHRoaXMud29ybGRbZXZlbnRuYW1lXS5zdWJzY3JpYmUodGhpcy5jaGFuZ2VkLmJpbmQodGhpcykpXG4gICAgfVxuXG4gICAgY2hhbmdlZChlbnRpdHkpIHtcbiAgICAgICAgaWYgKHRoaXMuZXZlbnRuYW1lID09IFwic2VsZWN0ZWRcIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFTlRJVFkgVklFVyBzZWxlY3RlZFwiLCBlbnRpdHksIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmVudGl0eSAhPSBlbnRpdHkpIHtcbiAgICAgICAgICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgICAgICAgICAgdGhpcy5yZWRyYXcoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVkcmF3KCkge1xuICAgICAgICB0aGlzLmlubmVySFRNTCA9IGV2YWwoJ2AnICsgdGhpcy50ZW1wbGF0ZSArICdgJyk7XG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctZW50aXR5LXZpZXcnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZW50aXR5LXZpZXcnLCBBZ0VudGl0eVZpZXcpO1xufVxuXG4iXSwibmFtZXMiOlsiY2xvY2siLCJKb2IiXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sS0FBSyxTQUFTLFdBQVcsQ0FBQztBQUNoQyxJQUFJLGlCQUFpQixHQUFHO0FBQ3hCLFFBQVEsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNqQyxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdELFFBQVEsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztBQUMzRCxRQUFRLElBQUksQ0FBQyxVQUFVLEdBQUU7QUFDekIsS0FBSztBQUNMO0FBQ0EsSUFBSSxtQkFBbUIsR0FBRztBQUMxQixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUM7QUFDM0QsS0FBSztBQUNMO0FBQ0EsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO0FBQ3RCLFFBQVEsR0FBRyxNQUFN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

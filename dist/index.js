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
    if (!this.world) {
      return;
    }
    this.world.click(this.lastPos);
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
        this.lastPos = new THREE.Vector2(res[0].point.x, -res[0].point.z);//.copy(res[0].point);
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
            item(info); //info != undefined ? info : {});
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
              if (e[name].indexOf(val) < 0) {
                return false;
              }
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
    }
    this.hovered.publish(entity);
  }

  select(entity) {
    if (this.selectedEntity)
      this.selectedEntity.selected(false);
    this.selectedEntity = entity;
    if (this.selectedEntity) {
      this.selectedEntity.selected(true);
    }
    this.selected.publish(entity);
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

  click(lastPos) {
    console.log("WORLD.click", lastPos);
    if (this.hoveredEntity) {
      this.select(this.hoveredEntity);
    } else if (this.selectedEntity && this.selectedEntity.pushJob /*&& this.selectedEntity.isA("hero") && this.selectedEntity.player == "human"*/) {

      console.log("assign new move job", lastPos);
      this.selectedEntity.resetJobs();
      this.selectedEntity.pushJob(new Move(this.selectedEntity, lastPos, 0));
//          world.selectedEntity.pushJob(new Jobs.ml.Move(world.selectedEntity,lastPos));
      //this.selectedEntity.pushHlJob(new Jobs.hl.Move(this.selectedEntity, lastPos));
    }
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
          console.log("FOUND", found, this);
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
    console.log("isa", mixin, this.mixinDef);
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

    if (name) {
      this.meshName = name;
    }

    const {meshType, animation} = this.getMeshDef();

    return this.modelLoader.load(meshType, animation).then((mesh) => {
      console.log("MODEL loaded", mesh, meshType, animation, this.scene);
      mesh.attachToScene(this.scene);

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
    Object.assign(this, _.pick(loaders, ['imageLoader']));

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
      opacity: 0.5,
      depthTest: false,
      depthWrite: false
    });
    const someRing = new THREE.Mesh(new THREE.RingGeometry(1.3, 2, 20, 5, 0, Math.PI * 2), material);
    someRing.position.set(0, 0.5, 0.0);
    someRing.rotateOnAxis(new THREE.Vector3(1, 0, 0), -1.6);
    someRing.visible = false;
    return someRing
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

    return this.loadObjComplete(mesh, animation)
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

let follower = {
  checkBoss: function () {
    if (!this.boss) {
      this._assignBoss(this._findSomeBoss({
        mixinNames: "house"
      }));
    } else if (typeof (this.boss) === "string") {
      this._assignBoss(this._findSomeBoss({
        name: this.boss
      }));
    }
  },
  onNoJob: function () {
    this.checkBoss();
    if (this.boss && this.boss.assignMeJob)
      this.boss.assignMeJob(this);
  },
  _findSomeBoss(specs) {
    if (this.world.search) {
      var f = this.world.search(specs, this.pos);
      if (f.length > 0) {
        return f[0];
      }
    }
  },
  _assignBoss(boss) {
    this.boss = boss;
    if (boss != null) {
      this.boss.addFollower(this);
    }
  }
};


let Follower = () => follower;

class HLJob {
  commonStart() {
    if (!this.started) {
      this.started = true;
      this.entity.followers.forEach(e => {
        this.assignMeJob(e);
      });
      this.assignMeJob(this.entity);
      return true;
    }
  }

  onFrame(delta) {
    if (!this.ready)
      if (!this.commonStart()) {
        console.log("ONFRAME", this.ready);
        this.assignMeJob(this.entity);
      }
  }
}

class Base {
  constructor() {
    this.formCache = {};
    this.formSize = -1;
  }

  sort(followers) {
    return followers;
  }

  computeRelativePosCached(boss, i) {
    if (this.formSize != boss.followers.length) {
      this.formSize = boss.followers.length;
      this.formCache = {};
    }
    if (!this.formCache[i]) {
      this.formCache[i] = this.computeRelativePos(boss, i);
    }
    return this.formCache[i];
  }

  computeRelativePos(boss, i) {
    if (i > 1) {
      i += 1;
    }

    var row = Math.floor(i / 5);
    var col = i % 5;
    var d = 0.8;

    return new Vector2(col * d - d * 2, row * d);
  }

  computePos(boss, i, basePos) {
    return new Vector2().addVectors(this.computeRelativePosCached(boss, i), basePos);
  }

  getPos(boss, follower, basePos) {
    if (!basePos) {
      basePos = boss.pos;
    }

    if (boss == follower) {
      return new Vector2().copy(basePos);
    }

    var followers = this.sort(boss.followers);

    var i = _.indexOf(followers, follower);
    return this.computePos(boss, i, basePos);
  }

}

var lines = [10, 14, 20, 40, 100];

class Rest extends Base {

  computeRelativePos(boss, i) {
    var row = null, ci = i;
    var max = 0, count;
    _.find(lines, function (line, k) {
      ci -= line;
      max += line;
      if (ci < 0) {
        row = k;
        return true;
      }
      return false;
    });
    // count of segments for current circle
    count = lines[row];

    // if current circle is the widest, then only so many segments like men left
    if (boss.followers.length < max)
      count -= (max - boss.followers.length);
    var angle = (i / count) * 2 * Math.PI;
    var radius = (row + 1) * 1.4;
    return new Vector2(Math.sin(angle) * radius, Math.cos(angle) * radius);
  };

  getDir(boss, e) {
    var newPos = this.getPos(boss, e);
    return Angle.fromVector2(new Vector2().subVectors(boss.pos, newPos));
  }

}

class Null extends Base {
  constructor() {
    super();
  }

  computeRelativePos(boss, i) {
    return new Vector2(0, 0);
  }

  getDir(boss, e) {
    return 0;
  }
}

class Move$1 extends Base {

  constructor(angle) {
    super(angle);
    this.angle = angle;
  }

  computeRelativePos(boss, i) {
    if (i >= 2) {
      i += 1;
    }

    var row = Math.floor(i / 5);
    var col = i % 5;
    var block = Math.floor(i / 25);

    var x = col - 2;
    var y = row + block;

    var angle = this.angle;
    var d = 0.8;

    return new Vector2(d * Math.cos(angle) * x - d * Math.sin(angle) * y,
      d * Math.sin(angle) * x + d * Math.cos(angle) * y);
  };

  getDir(boss, e) {
    return this.angle;
  }
}

const Formations = {Base, Move: Move$1, Null, Rest};

class MLRestJob {
  constructor(entity, length, direction) {
    this.entity = entity;
    this.length = length;
    this.direction = direction;
    this.done = false;
  }

  onFrame(delta) {
    if (this.direction && this.entity.rotation != this.direction) {
      this.entity.rotation = this.direction;
      this.entity.updateMeshPos();
    }

    if (this.entity.meshName != "sit" && this.entity.meshName != "sitdown") {
      this.entity.playAnimation("sitdown");
    } else if (!this.done) {
      this.entity.setMesh("sit");
      this.entity.pushJob(new RestJob(this.entity, this.length));
      this.done = true;
    } else {
      this.ready = true;
    }
    return delta;
  }

}

class HLRestJob extends HLJob {
  constructor(entity, length, formatted) {
    super();
    this.entity = entity;
    this.length = length;
    this.done = false;
    if (formatted)
      this.formation = new Formations.Rest();
    else
      this.formation = new Formations.Null();
  };

  assignMeJob(e) {
    if (!this.commonStart()) {
      e.resetNonHlJobs();
      var newPos = this.formation.getPos(this.entity, e);
      if (e.pos.distanceTo(newPos) > 0.1)
        e.pushJob(new MlMoveJob(e, newPos));
      else {
        var dir = this.formation.getDir(this.entity, e);
        e.pushJob(new MLRestJob(e, 5, dir));
      }
    }
  }
}

let boss = {
  postLoad: function () {
    console.log("POSTLOAD");
    if (!this.followers)
      this.followers = [];
  },
  followers: null,
  // deprecated
  pushHlJob: function (job) {
    this.pushJob(job);
  },
  // deprecated
  clearHlJob: function () {
    this.resetJobs();
  },
  onNoJob: function () {
    var boss = this;
    if (this.boss)
      boss = this.boss;
    if (boss && boss.assignMeJob)
      boss.assignMeJob(this);
  },
  getHlJob: function () {
    if (this.jobs)
      for (var i = this.jobs.length - 1; i >= 0; i--) {
        if (this.jobs[i].assignMeJob)
          return this.jobs[i];
      }
  },
  assignMeJob: function (e) {
    var hljob = this.getHlJob();

    if (!hljob) {
      if (this.ai) {
        this.ai();
      }
      // try again
      hljob = this.getHlJob();
      if (!hljob) {
        this.pushHlJob(new HLRestJob(this, 10, this.isA("hero")));
        console.debug("boss - No hljob created, resting for 10 seconds");
      }
    }

    if (hljob) {
      hljob.assignMeJob(e);
    }
  },
  addFollower: function (follower) {
    this.followers.push(follower);
  },
  dismiss: function (follower) {
    this.followers = _.without(this.followers, follower);
    console.log("dismissed", follower, this.followers.length);
    delete follower.boss;
    follower.resetJobs();
  }
};

const Boss = () => boss;



var Mixin = /*#__PURE__*/Object.freeze({
__proto__: null,
animal: Animal,
job: Job$1,
follower: Follower,
boss: Boss
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
    this.changed(null);

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
    if (this.entity !== entity) {
      this.entity = entity;
      if (this.entity) {
        this.redraw();
      }
    }
    if (this.entity) {
      this.style.display = "";
    } else {
      this.style.display = "none";
    }
  }

  redraw() {
    this.innerHTML = mustache.render(this.template, this.entity);
    const buttonRest = this.getElementsByClassName("button-rest")[0];
    if (buttonRest) {
      buttonRest.addEventListener("click", this.rest.bind(this));
    }
  }

  rest() {
    this.entity.resetJobs();
    this.entity.pushJob(new HLRestJob(this.entity, 0, false));
    console.log("REST");
  }
}

if (!customElements.get('ag-entity-view')) {
  customElements.define('ag-entity-view', AgEntityView);
}

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvbGwvam9iLmpzIiwic3JjL2dhbWUvdmVjdG9yMi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL3dvcmxkLmpzIiwic3JjL2dhbWUvaGVpZ2h0bWFwLmpzIiwic3JjL2FqYXguanMiLCJzcmMvZ2FtZS9lbnRpdHkuanMiLCJzcmMvY29uZmlnL21lc2hlcy5qcyIsInNyYy9iYXNlM2QvbW9kZWwuanMiLCJzcmMvYmFzZTNkL21vZGVsX2xvYWRlci5qcyIsInNyYy9nYW1lL21peGlucy9hbmltYWwuanMiLCJzcmMvZ2FtZS9sbC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2pvYi5qcyIsInNyYy9nYW1lL21peGlucy9mb2xsb3dlci5qcyIsInNyYy9nYW1lL2hsL2Jhc2UuanMiLCJzcmMvZ2FtZS9mb3JtYXRpb25zL2Jhc2UuanMiLCJzcmMvZ2FtZS9mb3JtYXRpb25zL3Jlc3QuanMiLCJzcmMvZ2FtZS9mb3JtYXRpb25zL251bGwuanMiLCJzcmMvZ2FtZS9mb3JtYXRpb25zL21vdmUuanMiLCJzcmMvZ2FtZS9mb3JtYXRpb25zL2luZGV4LmpzIiwic3JjL2dhbWUvbWwvcmVzdC5qcyIsInNyYy9nYW1lL2hsL3Jlc3QuanMiLCJzcmMvZ2FtZS9taXhpbnMvYm9zcy5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS93b3JsZC1sb2FkZXIuanMiLCJzcmMvZWxlbWVudHMvYWctd29ybGQuanMiLCJzcmMvZWxlbWVudHMvYWctZW50aXR5LXZpZXcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgSW50cm8gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuY3VycmVudF9zY3JlZW4gPSAtMTtcbiAgICAgICAgdGhpcy5zY3JlZW5zID0gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiaW50cm8tc2NyZWVuXCIpO1xuICAgICAgICB0aGlzLm5leHRTY3JlZW5IYW5kbGVyID0gdGhpcy5uZXh0U2NyZWVuLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5uZXh0U2NyZWVuKClcbiAgICB9XG5cbiAgICBpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICB9XG5cbiAgICBiaW5kRXZlbnQoc2NyZWVuKSB7XG4gICAgICAgIGlmKHNjcmVlbikge1xuICAgICAgICAgICAgc2NyZWVuLmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpO1xuICAgICAgICAgICAgc2NyZWVuLmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1bmJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5leHRTY3JlZW4oZXYpIHtcbiAgICAgICAgdGhpcy51bmJpbmRFdmVudCh0aGlzLnNjcmVlbnNbdGhpcy5jdXJyZW50X3NjcmVlbl0pXG4gICAgICAgIGlmKHRoaXMuY3VycmVudF9zY3JlZW4gPT0gdGhpcy5zY3JlZW5zLmxlbmd0aC0xKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdmaW5pc2hlZCcpKVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9ICh0aGlzLmN1cnJlbnRfc2NyZWVuICsgMSkgJSB0aGlzLnNjcmVlbnMubGVuZ3RoO1xuICAgICAgICB0aGlzLmJpbmRFdmVudCh0aGlzLnNjcmVlbnNbdGhpcy5jdXJyZW50X3NjcmVlbl0pXG4gICAgICAgIHRoaXMuc2V0VmlzaWJpbGl0eSgpXG4gICAgfVxuXG4gICAgc2V0VmlzaWJpbGl0eSgpIHtcbiAgICAgICAgdGhpcy5zY3JlZW5zLmZvckVhY2goKHNjcmVlbiwgaWR4KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X3NjcmVlbiA9PSBpZHgpIHtcbiAgICAgICAgICAgICAgICBzY3JlZW4uY2xhc3NMaXN0LmFkZChcImFjdGl2ZVwiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY3JlZW4uY2xhc3NMaXN0LnJlbW92ZShcImFjdGl2ZVwiKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWludHJvJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWludHJvJywgSW50cm8pO1xufVxuIiwiY2xhc3MgQ3JlZGl0cyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblxuICAgICAgICB0aGlzLmhhbmRsZXIgPSB0aGlzLmZpbmlzaGVkLmJpbmQodGhpcylcblxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IHRoaXMucXVlcnlTZWxlY3RvcihcIi5jcmVkaXRzXCIpXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQklORC4uLlwiKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcilcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuXG4gICAgZmluaXNoZWQoZXYpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGSU5JU0hFRFwiKVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZXZhbCh0aGlzLmdldEF0dHJpYnV0ZSgnb25maW5pc2hlZCcpKVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsIGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctY3JlZGl0cycpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1jcmVkaXRzJywgQ3JlZGl0cyk7XG59XG4iLCJjbGFzcyBUZXh0dXJlTG9hZGVyIHtcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XG4gICAgICAgIGlmICghVGV4dHVyZUxvYWRlci5pbnN0YW5jZSkge1xuICAgICAgICAgICAgVGV4dHVyZUxvYWRlci5pbnN0YW5jZSA9IG5ldyBUZXh0dXJlTG9hZGVyKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFRleHR1cmVMb2FkZXIuaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgZ2V0VGV4dHVyZXModXJscykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodXJscy5tYXAodXJsPT50aGlzLmdldFRleHR1cmUodXJsKSkpO1xuICAgIH1cblxuICAgIGdldFRleHR1cmUodXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKHVybCwgbnVsbCwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRleHR1cmVMb2FkZXI7IiwiaW1wb3J0IFRleHR1cmVMb2FkZXIgZnJvbSBcIi4uL2Jhc2UzZC90ZXh0dXJlX2xvYWRlclwiO1xuXG5jb25zdCBUZXJyYWluID0gVEhSRUUuVGVycmFpbjtcblxuY2xhc3MgVGVycmFpbkJ1aWxkZXIge1xuXG4gICAgc3RhdGljIGNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIG1hdGVyaWFsLCBoZWlnaHRtYXApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt3aWR0aDogNjQsIGhlaWdodDogNjR9LCBvcHRpb25zKTtcbiAgICAgICAgdmFyIHhTID0gb3B0aW9ucy53aWR0aCAtIDEsIHlTID0gb3B0aW9ucy5oZWlnaHQgLSAxO1xuXG4gICAgICAgIGlmICghaGVpZ2h0bWFwKVxuICAgICAgICAgICAgaGVpZ2h0bWFwID0gZnVuY3Rpb24gKGcsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9QVElPTlNcIiwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIHhsID0gb3B0aW9ucy54U2VnbWVudHMgKyAxLFxuICAgICAgICAgICAgICAgICAgICB5bCA9IG9wdGlvbnMueVNlZ21lbnRzICsgMTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgeWw7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ1tqICogeGwgKyBpXS56ICs9IE1hdGgucmFuZG9tKCkgKiAxMDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGlmIChmYWxzZSkge1xuICAgICAgICAgICAgLy8gZG9pbmcgd2lyZWZyYW1lIHRlcnJhaW5cbiAgICAgICAgICAgIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgICAgICAgICBjb2xvcjogMHhmZjAwMDAsXG4gICAgICAgICAgICAgICAgd2lyZWZyYW1lOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL21hdGVyaWFsID0gbnVsbDtcbiAgICAgICAgbGV0IHRlcnJhaW5TY2VuZSA9IFRlcnJhaW4oe1xuICAgICAgICAgICAgZWFzaW5nOiBUZXJyYWluLkxpbmVhcixcbiAgICAgICAgICAgIGZyZXF1ZW5jeTogMi41LFxuICAgICAgICAgICAgaGVpZ2h0bWFwOiBoZWlnaHRtYXAsXG4gICAgICAgICAgICAvL2FmdGVyOiBoZWlnaHRtYXAsXG4gICAgICAgICAgICBtYXRlcmlhbDogbWF0ZXJpYWwgfHwgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHg1NTY2YWF9KSxcbi8vICAgICAgICAgIG1heEhlaWdodDogMTAwLFxuLy8gICAgICAgICAgbWluSGVpZ2h0OiAtMTAwLFxuLy9taW5IZWlnaHQ6MCwvL3VuZGVmaW5lZCxcbi8vbWF4SGVpZ2h0OjEwLCAvL3VuZGVmaW5lZCxcbiAgICAgICAgICAgIHN0ZXBzOiAxLFxuICAgICAgICAgICAgdXNlQnVmZmVyR2VvbWV0cnk6IGZhbHNlLFxuICAgICAgICAgICAgeFNlZ21lbnRzOiB4UyxcbiAgICAgICAgICAgIHhTaXplOiBvcHRpb25zLndpZHRoLFxuICAgICAgICAgICAgeVNlZ21lbnRzOiB5UyxcbiAgICAgICAgICAgIHlTaXplOiBvcHRpb25zLmhlaWdodCxcbiAgICAgICAgICAgIHN0cmV0Y2g6IGZhbHNlLFxuICAgICAgICAgICAgY2xhbXA6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICB0ZXJyYWluU2NlbmUucm90YXRpb24ueCA9IDA7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5yb3RhdGlvbi54ID0gLU1hdGguUEkvMjtcbiAgICAgICAgLy90ZXJyYWluU2NlbmUuY2hpbGRyZW5bMF0ucm90YXRpb24ueSA9IE1hdGguUEkvODtcbiAgICAgICAgdGVycmFpblNjZW5lLnBvc2l0aW9uLnggKz0gb3B0aW9ucy53aWR0aCAvIDI7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5wb3NpdGlvbi56IC09IG9wdGlvbnMud2lkdGggLyAyO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVFNcIiwgdGVycmFpblNjZW5lKTtcbiAgICAgICAgLy8gQXNzdW1pbmcgeW91IGFscmVhZHkgaGF2ZSB5b3VyIGdsb2JhbCBzY2VuZVxuICAgICAgICBzY2VuZS5hZGQodGVycmFpblNjZW5lKTtcbiAgICAgICAgdGhpcy5nZW8gPSB0ZXJyYWluU2NlbmUuY2hpbGRyZW5bMF0uZ2VvbWV0cnk7XG4gICAgfVxuXG4gICAgc3RhdGljIGFzeW5jIGNyZWF0ZShvcHRpb25zLCBzY2VuZSwgaGVpZ2h0bWFwKSB7XG4gICAgICAgIFRleHR1cmVMb2FkZXIuZ2V0SW5zdGFuY2UoKS5nZXRUZXh0dXJlcyhbJ21vZGVscy9zYW5kMS5qcGcnLCAnbW9kZWxzL2dyYXNzMS5qcGcnLCAnbW9kZWxzL3N0b25lMS5qcGcnLCAnbW9kZWxzL3Nub3cxLmpwZyddKVxuICAgICAgICAgICAgLnRoZW4oKHRleHR1cmVzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmxlbmQgPSBUZXJyYWluQnVpbGRlci5nZW5lcmF0ZU1hdGVyaWFsKHNjZW5lLCAuLi50ZXh0dXJlcylcbiAgICAgICAgICAgICAgICBUZXJyYWluQnVpbGRlci5jcmVhdGVUZXJyYWluKG9wdGlvbnMsIHNjZW5lLCBibGVuZCwgaGVpZ2h0bWFwKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuICAgIHN0YXRpYyBnZW5lcmF0ZU1hdGVyaWFsKHNjZW5lLCB0MSx0Mix0Myx0NCkge1xuICAgICAgICByZXR1cm4gVGVycmFpbi5nZW5lcmF0ZUJsZW5kZWRNYXRlcmlhbChbXG4gICAgICAgICAgICB7dGV4dHVyZTogdDF9LFxuICAgICAgICAgICAge3RleHR1cmU6IHQyLCBsZXZlbHM6IFstODAsIC0zNSwgMjAsIDUwXX0sXG4gICAgICAgICAgICB7dGV4dHVyZTogdDMsIGxldmVsczogWzIwLCA1MCwgNjAsIDg1XX0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGV4dHVyZTogdDQsXG4gICAgICAgICAgICAgICAgZ2xzbDogJzEuMCAtIHNtb290aHN0ZXAoNjUuMCArIHNtb290aHN0ZXAoLTI1Ni4wLCAyNTYuMCwgdlBvc2l0aW9uLngpICogMTAuMCwgODAuMCwgdlBvc2l0aW9uLnopJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgXSwgc2NlbmUpO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGVycmFpbkJ1aWxkZXIiLCIvL3ZhciBwcm9qZWN0b3IgPSBuZXcgVEhSRUUuUHJvamVjdG9yKCk7XG52YXIgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuXG52YXIgUGljayA9IHtcbiAgICAvKlxuICAgICogbW91c2U9e3g6MTIseToxMn1cbiAgICAqICovXG4gICAgcGljazogZnVuY3Rpb24gKG1vdXNlLCBjYW1lcmEsIHNjZW5lKSB7XG4gICAgICAgIC8vIGZpbmQgaW50ZXJzZWN0aW9uc1xuICAgICAgICAvL1xuICAgICAgICAvLyBjcmVhdGUgYSBSYXkgd2l0aCBvcmlnaW4gYXQgdGhlIG1vdXNlIHBvc2l0aW9uXG4gICAgICAgIC8vICAgYW5kIGRpcmVjdGlvbiBpbnRvIHRoZSBzY2VuZSAoY2FtZXJhIGRpcmVjdGlvbilcbiAgICAgICAgLy9cbiAgICAgICAgdmFyIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZlYy54ID0gbW91c2Uucng7XG4gICAgICAgIHZlYy55ID0gbW91c2Uucnk7XG4gICAgICAgIHJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKHZlYywgY2FtZXJhKTtcblxuICAgICAgICAvLyBjcmVhdGUgYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2JqZWN0cyBpbiB0aGUgc2NlbmUgd2l0aCB3aGljaCB0aGUgcmF5IGludGVyc2VjdHNcbiAgICAgICAgLy8gaW50ZXJzZWN0IHJlY3Vyc2l2ZSAhISFcbiAgICAgICAgdmFyIHJlc3VsdCA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKHNjZW5lLmNoaWxkcmVuLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IFBpY2s7IiwiXG5mdW5jdGlvbiBhZGRTa3lib3goc2NlbmUpIHtcbiAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCdtb2RlbHMvc2t5MS5qcGcnLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh0MSkge1xuICAgICAgICBjb25zdCBza3lEb21lID0gbmV3IFRIUkVFLk1lc2goXG4gICAgICAgICAgICBuZXcgVEhSRUUuU3BoZXJlR2VvbWV0cnkoNDA5NiwgNjQsIDY0KSxcbiAgICAgICAgICAgIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiB0MSwgc2lkZTogVEhSRUUuQmFja1NpZGUsIGZvZzogZmFsc2V9KVxuICAgICAgICApO1xuICAgICAgICBzY2VuZS5hZGQoc2t5RG9tZSk7XG4gICAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhZGRTa3lib3g7IiwiaW1wb3J0IGFkZFNreWJveCBmcm9tIFwiLi9za3lib3hcIjtcblxuZnVuY3Rpb24gZ2V0UmFuZG9tTnVtYmVyKCBiYXNlICkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogYmFzZSAtIChiYXNlLzIpO1xufVxuZnVuY3Rpb24gZ2V0UmFuZG9tQ29sb3IoKSB7XG4gICAgdmFyIGMgPSBuZXcgVEhSRUUuQ29sb3IoKTtcbiAgICBjLnNldFJHQiggTWF0aC5yYW5kb20oKSwgTWF0aC5yYW5kb20oKSwgTWF0aC5yYW5kb20oKSApO1xuICAgIHJldHVybiBjO1xufVxuY2xhc3MgQW50U2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAvLyBodHRwOi8vc3F1YXJlZmVldC5naXRodWIuaW8vU2hhZGVyUGFydGljbGVFbmdpbmUvXG4gICAgICAgIHRoaXMuZW1pdHRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgcG9zaXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKC0xLCAxLCAxKSxcbiAgICAgICAgICAgIHBvc2l0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKSxcblxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMC4xLCAwKSxcbiAgICAgICAgICAgIGFjY2VsZXJhdGlvblNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4wMSwgMC4wMSwgMC4wMSksXG5cbiAgICAgICAgICAgIHZlbG9jaXR5OiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLjcsIDApLFxuICAgICAgICAgICAgdmVsb2NpdHlTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywgMC41LCAwLjIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0OiBuZXcgVEhSRUUuQ29sb3IoMHhCQkJCQkIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0U3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjIsIDAuMSwgMC4xKSxcbiAgICAgICAgICAgIGNvbG9yRW5kOiBuZXcgVEhSRUUuQ29sb3IoMHhBQUFBQUEpLFxuXG4gICAgICAgICAgICBzaXplU3RhcnQ6IDAuNSxcbiAgICAgICAgICAgIHNpemVFbmQ6IDQsXG4gICAgICAgICAgICBvcGFjaXR5U3RhcnQ6IDEsXG4gICAgICAgICAgICBvcGFjaXR5RW5kOiAwLjEsXG5cbiAgICAgICAgICAgIC8vcGFydGljbGVDb3VudDogMjAwMCxcbiAgICAgICAgICAgIHBhcnRpY2xlc1BlclNlY29uZDogMTAwLFxuICAgICAgICAgICAgYWxpdmU6IDFcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmVtaXR0ZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIG1heEFnZTogNSxcbiAgICAgICAgICAgIC8vdHlwZTogTWF0aC5yYW5kb20oKSAqIDQgfCAwLFxuICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoLTEsMCwwKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjY2VsZXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMygwLFxuICAgICAgICAgICAgICAgICAgICAtMC4yLFxuICAgICAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsMC4xLDApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmVsb2NpdHk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIDEuNCxcbiAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgc3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjMsMC43LDAuMylcbiAgICAgICAgICAgIH0sXG4vKlxuICAgICAgICAgICAgcm90YXRpb246IHtcbiAgICAgICAgICAgICAgICBheGlzOiBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpLFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSksXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgYW5nbGU6XG4gICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJLFxuICAgICAgICAgICAgICAgIGNlbnRlcjpcbiAgICAgICAgICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMClcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgfSxcblxuXG4gICAgICAgICAgICB3aWdnbGU6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5yYW5kb20oKSAqIDIwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZzoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnJhbmRvbSgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNvbG9yOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IFtuZXcgVEhSRUUuQ29sb3IoMHgzMzMzMzMpLG5ldyBUSFJFRS5Db2xvcigweDc3Nzc3NyksbmV3IFRIUkVFLkNvbG9yKDB4ODg4ODg4KV0sXG4gICAgICAgICAgICAgICAgc3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjMsMCwwKVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc2l6ZToge1xuXG4gICAgICAgICAgICAgICAgdmFsdWU6IFswLjUsIDAuNywgMV1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXJ0aWNsZUNvdW50OiAxMDAsXG4gICAgICAgICAgICBvcGFjaXR5OiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IFsxLCAwLjgsIDAuMF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXB0aFRlc3Q6IHRydWUsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuXG4gICAgICAgIHRoaXMucGFydGljbGVHcm91cCA9IEFudFNjZW5lLm1ha2VTUEVHcm91cCgpO1xuXG4gICAgICAgIHRoaXMucGFydGljbGVHcm91cC5hZGRQb29sKDEwLCB0aGlzLmVtaXR0ZXJTZXR0aW5ncywgdHJ1ZSk7XG5cbiAgICAgICAgdmFyIGVtaXR0ZXIgPSB0aGlzLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKVxuICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gbmV3IFRIUkVFLlZlY3RvcjMoLTIsMCwwKVxuICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuICAgICAgICBlbWl0dGVyID0gdGhpcy5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKClcbiAgICAgICAgZW1pdHRlci5wb3NpdGlvbi52YWx1ZSA9IG5ldyBUSFJFRS5WZWN0b3IzKC00LDAsMClcbiAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcblxuICAgICAgICAvL3RoaXMuc2NlbmUuYmFja2dyb3VuZC5hZGQobmV3IENvbG9yKFwicmVkXCIpKVxuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0aGlzLnBhcnRpY2xlR3JvdXAubWVzaCk7XG4gICAgICAgIHRoaXMuc2NlbmUucGFydGljbGVHcm91cCA9IHRoaXMucGFydGljbGVHcm91cDtcbiAgICAgICAgY29uc29sZS5sb2coXCJQQVJUSUNMRVwiLCB0aGlzLnBhcnRpY2xlR3JvdXApO1xuXG5cbiAgICAgICAgLy8gc29mdCB3aGl0ZSBsaWdodFxuICAgICAgICB2YXIgbGlnaHQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KDB4MzAyMDIwKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQobGlnaHQpO1xuXG4gICAgICAgIC8vIFdoaXRlIGRpcmVjdGlvbmFsIGxpZ2h0IGF0IGhhbGYgaW50ZW5zaXR5IHNoaW5pbmcgZnJvbSB0aGUgdG9wLlxuICAgICAgICB2YXIgZGlyZWN0aW9uYWxMaWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KDB4ZmZmZmZmLCAwLjcpO1xuICAgICAgICBkaXJlY3Rpb25hbExpZ2h0LnBvc2l0aW9uLnNldCgxLCAwLjcsIDAuNyk7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGRpcmVjdGlvbmFsTGlnaHQpO1xuXG4gICAgICAgIGFkZFNreWJveCh0aGlzLnNjZW5lKTtcblxuXG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCAwLCAwKTtcbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDAsIDQpO1xuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgNCwgMCk7XG5cbiAgICAgICAgdGhpcy5tZXNoZXMgPSB7fTtcbiAgICAgICAgdGhpcy5lbnRpdGllcyA9IFtdXG4gICAgfVxuXG4gICAgc3RhdGljIG1ha2VTUEVHcm91cCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTUEUuR3JvdXAoe1xuICAgICAgICAgICAgdGV4dHVyZTogeyB2YWx1ZTogVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZSgnLi9pbWFnZXMvc21va2VwYXJ0aWNsZS5wbmcnKSB9LFxuICAgICAgICAgICAgLy9tYXhBZ2U6IDQsXG4gICAgICAgICAgICAvL2JsZW5kaW5nOiBUSFJFRS5Ob3JtYWxCbGVuZGluZ1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGNyZWF0ZUN1YmUoc2NlbmUsIHgsIHkpIHtcbiAgICAgICAgdmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkJveEdlb21ldHJ5KCk7XG4gICAgICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4MDBmZjAwfSk7XG4gICAgICAgIHZhciBjdWJlID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG1hdGVyaWFsKTtcbiAgICAgICAgY3ViZS5wb3NpdGlvbi54ICs9IHg7XG4gICAgICAgIGN1YmUucG9zaXRpb24ueiArPSB5O1xuICAgICAgICBzY2VuZS5hZGQoY3ViZSk7XG4gICAgfVxuXG4gICAgdGljayhkZWx0YSkge1xuICAgICAgICBpZiAoZGVsdGEpIHtcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVHcm91cC50aWNrKGRlbHRhKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYWRkKG5vZGUpIHtcbiAgICAgICAgLy8gICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSlcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkFERFwiLCBub2RlKTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQobm9kZSlcbiAgICB9XG5cbiAgICByZW1vdmUobm9kZSkge1xuICAgICAgICB0aGlzLnNjZW5lLnJlbW92ZShub2RlKVxuICAgIH1cblxuICAgIG1ha2VFbWl0dGVyKHBvcykge1xuICAgICAgICByZXR1cm4gbmV3IFNQRS5FbWl0dGVyKHRoaXMuZW1pdHRlclNldHRpbmdzKTtcbiAgICB9XG5cbiAgICBkZXN0cm95KCkge1xuICAgICAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBbnRTY2VuZSIsImNvbnN0IGNsb2NrID0gbmV3IFRIUkVFLkNsb2NrKCk7XG5cbmNsYXNzIEJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG5cblxuXG4gICAgfVxuXG5cblxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2U7XG4iLCJpbXBvcnQgQmFzZSBmcm9tIFwiLi9iYXNlXCI7XG5cbmNvbnN0IGNsb2NrID0gbmV3IFRIUkVFLkNsb2NrKCk7XG5cbmNsYXNzIFZpZXcgIHtcbiAgICBjb25zdHJ1Y3RvcihlbCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVMXCIsIGVsLCB0aGlzKVxuICAgICAgICB0aGlzLmVsID0gZWxcbiAgICAgICAgdGhpcy5yZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKCk7XG5cbiAgICAgICAgLy8gZml4bWU6IHVzZSBlbCBzaXplXG4gICAgICAgIGNvbnN0IHdpZHRoID0gZWwub2Zmc2V0V2lkdGhcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0XG5cbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci5kb21FbGVtZW50KVxuXG4gICAgICAgIHRoaXMuY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKDYwLCB3aWR0aCAvIGhlaWdodCwgMSwgMTAwMDApO1xuICAgICAgICB0aGlzLnNldFNpemUoKVxuXG4gICAgICAgIHRoaXMuY2FtZXJhLnJvdGF0aW9uLnggPSAtKDEwICsgMzIpICogTWF0aC5QSSAvIDE4MDtcbiAgICAgICAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRTaXplKCkge1xuICAgICAgICB0aGlzLmNhbWVyYS5hc3BlY3QgPSB0aGlzLmVsLm9mZnNldFdpZHRoIC8gdGhpcy5lbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIHRoaXMuY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcblxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFNpemUodGhpcy5lbC5vZmZzZXRXaWR0aCwgdGhpcy5lbC5vZmZzZXRIZWlnaHQpO1xuICAgIH1cblxuICAgIHJlbmRlcihzY2VuZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJFTkRFUlwiLCBzY2VuZSwgb3B0aW9ucylcblxuICAgICAgICB2YXIgZG9yZW5kZXI9ICgpPT4ge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGlzIHJlbmRlcmluZyAtIGJlY2F1c2UgdGhlIHNjb3BlIC8gY2FudmFzIGlzIGRlc3Ryb3llZFxuICAgICAgICAgICAgaWYgKCF0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhpZGRlbikge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGRvcmVuZGVyLCA1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9yZW5kZXIpO1xuICAgICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdmFyIHRpbWVEaWZmID0gdGltZSAtIGxhc3RUaW1lO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSB0aW1lO1xuXG4gICAgICAgICAgICB2YXIgZGVsdGE7XG4gICAgICAgICAgICB2YXIgdXNlM2pzVGltZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAodXNlM2pzVGltZSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IGNsb2NrLmdldERlbHRhKCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZGVsdGEgPSB0aW1lRGlmZiAqIDAuMDAxO1xuXG4gICAgICAgICAgICBpZiAoZGVsdGEgPiAwLjEpXG4gICAgICAgICAgICAgICAgZGVsdGEgPSAwLjE7XG4gICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmZyYW1lQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mcmFtZUNhbGxiYWNrKGRlbHRhKTtcblxuICAgICAgICAgICAgc2NlbmUudGljayhkZWx0YSlcbiAgICAgICAgICAgIC8vIGFuaW1hdGUgQ29sbGFkYSBtb2RlbFxuXG4gICAgICAgICAgICAvL1RIUkVFLkFuaW1hdGlvbk1peGVyLnVwZGF0ZShkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcihzY2VuZS5zY2VuZSwgdGhpcy5jYW1lcmEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgfVxuXG4gICAgdXBkYXRlQ2FtZXJhKHZpZXdDZW50ZXIsIGgpIHtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueCA9IHZpZXdDZW50ZXIueDtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueSA9IHZpZXdDZW50ZXIueiArIGg7XG4gICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLnogPSAtIHZpZXdDZW50ZXIueSArIHZpZXdDZW50ZXIuejtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXc7IiwiaW1wb3J0IFRlcnJhaW5CdWlsZGVyIGZyb20gXCIuLi9saWJzL3RlcnJhaW5fYnVpbGRlclwiO1xuaW1wb3J0IFBpY2sgZnJvbSAnLi4vYmFzZTNkL3BpY2snXG5pbXBvcnQgQW50U2NlbmUgZnJvbSBcIi4uL2Jhc2UzZC9hbnQtc2NlbmVcIjtcbmltcG9ydCBWaWV3IGZyb20gXCIuLi9iYXNlM2Qvdmlld1wiXG5cbi8qKlxuICogR2FtZXZpZXcgY29udGFpbnMgc2NlbmUsIHZpZXcsXG4gKi9cbmNsYXNzIEFnR2FtZVZpZXcgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMuc2V0dXBUaHJlZSgpO1xuXG4gICAgdGhpcy5jb250cm9sUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZShcImNvbnRyb2wtcHJvZ3Jlc3NcIikpIHtcbiAgICAgIHRoaXMuY29udHJvbFByb2dyZXNzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcIkFnR2FtZVZpZXcgY29ubmVjdGVkXCIpO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy51cGRhdGVTaXplLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCB0aGlzLm1vdXNlZG93bi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIHRoaXMubW91c2V1cC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5tb3VzZW1vdmUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgdGhpcy53aGVlbC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsIHRoaXMud29ybGRDcmVhdGVkLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHRoaXMuZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkudmlzaWJpbGl0eUNoYW5nZSwgdGhpcy52aXNpYmlsaXR5Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy52aWV3Q2VudGVyID0ge3g6IDAsIHk6IDAsIHo6IDEwfTtcblxuICAgIHRoaXMubW92ZXMgPSAwO1xuICAgIHRoaXMudmlldyA9IG5ldyBWaWV3KHRoaXMpO1xuICAgIHRoaXMudXBkYXRlU2l6ZSh7dGFyZ2V0OiB3aW5kb3d9KTtcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIGZyYW1lQ2FsbGJhY2soZSkge1xuICAgIHRoaXMudGljayhlKVxuICAgIC8vIHRoaXMuc2NlbmUudGljaygpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdmlldy5kZXN0cm95ZWQgPSB0cnVlXG4gIH1cblxuICBhc3luYyB3b3JsZENyZWF0ZWQoZSkge1xuICAgIHRoaXMud29ybGQgPSBlLndvcmxkO1xuICAgIGNvbnN0IG1hcCA9IHRoaXMud29ybGQubWFwO1xuXG4gICAgY29uc3QgdGhyZWVIZWlnaHRNYXAgPSBtYXAudG9UaHJlZVRlcnJhaW4oKTtcblxuICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZShtYXAsIHRoaXMuc2NlbmUsIHRocmVlSGVpZ2h0TWFwKTtcblxuICAgIC8vIEZJWE1FOiBsb2FkIGFsbCBtb2RlbHMgYmVmb3JlaGFuZFxuICAgIGF3YWl0IHRoaXMud29ybGQuaW5pdFNjZW5lKHRoaXMuc2NlbmUpO1xuICAgIHRoaXMuc3RhcnRSZW5kZXJMb29wKCk7XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKTtcbiAgfVxuXG4gIHN0YXJ0UmVuZGVyTG9vcCgpIHtcbiAgICB0aGlzLnZpZXcucmVuZGVyKHRoaXMuc2NlbmUsIHtmcmFtZUNhbGxiYWNrOiB0aGlzLmZyYW1lQ2FsbGJhY2suYmluZCh0aGlzKX0pXG4gIH1cblxuICBnZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKSB7XG4gICAgdmFyIGhpZGRlbiwgdmlzaWJpbGl0eUNoYW5nZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgICAgaGlkZGVuID0gXCJoaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaGlkZGVuID0gXCJtc0hpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwibXN2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwid2Via2l0dmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH1cbiAgICByZXR1cm4ge3Zpc2liaWxpdHlDaGFuZ2UsIGhpZGRlbn07XG4gIH1cblxuICBzZXR1cFRocmVlKCkge1xuICAgIHRoaXMuc2NlbmUgPSBuZXcgQW50U2NlbmUodGhpcy5zY2VuZSlcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICBpZiAodGhpcy5jb250cm9sUHJvZ3Jlc3MgJiYgIXRoaXMud29ybGQucGF1c2UpIHtcbiAgICAgIHRoaXMud29ybGQudGljayhkZWx0YSlcbiAgICB9XG4gIH1cblxuICB2aXNpYmlsaXR5Q2hhbmdlKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldFt0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLmhpZGRlbl0pIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gdHJ1ZVxuICAgICAgLy8gaGlkZGVuXG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gZmFsc2VcbiAgICAgIC8vIHZpc2libGVcbiAgICB9XG4gIH1cblxuICB1cGRhdGVTaXplKGV2KSB7XG4gICAgdGhpcy52aWV3LnNldFNpemUoe30pO1xuICAgIHRoaXMuY29udGFpbmVyV2lkdGggPSBldi50YXJnZXQuaW5uZXJXaWR0aDtcbiAgICB0aGlzLmNvbnRhaW5lckhlaWdodCA9IGV2LnRhcmdldC5pbm5lckhlaWdodFxuICB9XG5cbiAgbW91c2V1cChlKSB7XG4gICAgdGhpcy5tb3VzZWlzZG93biA9IGZhbHNlO1xuICB9XG5cbiAgbW91c2Vkb3duKGUpIHtcbiAgICB0aGlzLm1vdXNlaXNkb3duID0gdHJ1ZTtcbiAgICB0aGlzLm94ID0gZS5wYWdlWDtcbiAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB0aGlzLm1vdmVzID0gMDtcbiAgfVxuXG4gIHdoZWVsKGUpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueiArPSBlLmRlbHRhWSAqIDAuMTtcbiAgICBpZiAodGhpcy52aWV3Q2VudGVyLnogPCA1KSB7XG4gICAgICB0aGlzLnZpZXdDZW50ZXIueiA9IDVcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKVxuICB9XG5cbiAgY2xpY2soZSkge1xuICAgIC8vRklYTUU6IG1vdmUgdG8gd29ybGRcbiAgICBpZiAoIXRoaXMud29ybGQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy53b3JsZC5jbGljayh0aGlzLmxhc3RQb3MpXG4gICAgY29uc29sZS5sb2coXCJTQ0VORVwiLCB0aGlzLnNjZW5lKVxuICB9XG5cbiAgbW91c2Vtb3ZlKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB0aGlzLm1vdmVzICs9IDE7XG4gICAgaWYgKHRoaXMubW91c2Vpc2Rvd24pIHtcbiAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5vZmZzZXRXaWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMub2Zmc2V0SGVpZ2h0O1xuICAgICAgdGhpcy5tb3ZlKHtkeDogKGUucGFnZVggLSB0aGlzLm94KSAvIHdpZHRoLCBkeTogKGUucGFnZVkgLSB0aGlzLm95KSAvIGhlaWdodH0pO1xuICAgICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgdGhpcy5ob3Zlcih7XG4gICAgICB4OiBlLnBhZ2VYLFxuICAgICAgeTogZS5wYWdlWSxcbiAgICAgIHJ4OiBlLnBhZ2VYIC8gdGhpcy5jb250YWluZXJXaWR0aCAqIDIgLSAxLFxuICAgICAgcnk6IC1lLnBhZ2VZIC8gdGhpcy5jb250YWluZXJIZWlnaHQgKiAyICsgMSxcbiAgICB9KTtcbiAgfVxuXG4gIGhvdmVyKG1vdXNlKSB7XG4gICAgaWYgKCF0aGlzLndvcmxkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBQaWNrLnBpY2sobW91c2UsIHRoaXMudmlldy5jYW1lcmEsIHRoaXMuc2NlbmUuc2NlbmUpO1xuXG4gICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgZW50aXR5ID0gcmVzWzBdLm9iamVjdC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICBlbnRpdHkgPSByZXNbMF0ub2JqZWN0LnBhcmVudC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICB9XG4gICAgICB0aGlzLndvcmxkLmhvdmVyKGVudGl0eSk7XG5cbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIHRoaXMubGFzdFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKHJlc1swXS5wb2ludC54LCAtcmVzWzBdLnBvaW50LnopLy8uY29weShyZXNbMF0ucG9pbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1vdmUoZCkge1xuICAgIHRoaXMudmlld0NlbnRlci54IC09IGQuZHggKiB0aGlzLnZpZXdDZW50ZXIueiAqIDM7XG4gICAgdGhpcy52aWV3Q2VudGVyLnkgKz0gZC5keSAqIHRoaXMudmlld0NlbnRlci56ICogMztcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIHVwZGF0ZUNhbWVyYSgpIHtcbiAgICAvLyBGSVhNRTogbW92ZSB0byB3b3JsZFxuICAgIHZhciBoO1xuXG4gICAgaWYgKHRoaXMud29ybGQgJiYgdGhpcy53b3JsZC5tYXApIHtcbiAgICAgIGggPSB0aGlzLndvcmxkLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMudmlld0NlbnRlci54LCB0aGlzLnZpZXdDZW50ZXIueSArIHRoaXMudmlld0NlbnRlci56IC8gMik7XG4gICAgfVxuICAgIGlmIChoID4gNTAgfHwgaCA8IDUwKSB7XG4gICAgICBoID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXcudXBkYXRlQ2FtZXJhKHRoaXMudmlld0NlbnRlciwgaClcbiAgfVxuXG4gIGtleWRvd24oZSkge1xuICAgIGNvbnNvbGUubG9nKFwiS0VZZG93blwiLCBlKTtcbiAgICBpZiAoZS5rZXlDb2RlID09IDI3KSB7XG4gICAgICB3b3JsZC5zZWxlY3QobnVsbCk7XG4gICAgfVxuICB9XG59XG5cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWdhbWUtdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZ2FtZS12aWV3JywgQWdHYW1lVmlldyk7XG59XG4iLCIvLyBzaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9wdWJzdWItamF2YXNjcmlwdFxuLy8gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVCBsaWNlbnNlXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0gW11cbiAgICB9XG5cbiAgICBzdWJzY3JpYmUobGlzdGVuZXIpIHtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycztcblxuICAgICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpIC0gMTtcblxuICAgICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsaXN0ZW5lcnNbaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHB1Ymxpc2goaW5mbykge1xuICAgICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaCgoaXRlbSk9PiB7XG4gICAgICAgICAgICBpdGVtKGluZm8pOyAvL2luZm8gIT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIiwiY2xhc3MgSm9iIHtcbiAgICBjb25zdHJ1Y3RvcihlbnRpdHkpIHtcbiAgICAgICAgdGhpcy5fZW50aXR5ID0gZW50aXR5O1xuICAgICAgICB0aGlzLl9yZWFkeSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGdldCByZWFkeSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5O1xuICAgIH1cblxuICAgIGdldCBlbnRpdHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbnRpdHlcbiAgICB9XG5cbiAgICBzZXRSZWFkeSgpIHtcbiAgICAgICAgdGhpcy5fcmVhZHkgPSB0cnVlO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSm9iOyIsIi8qKiBzaW1wbGlmaWVkIHZlcnNpb24gb2YgVEhSRUUuVmVjdG9yMi4gKi9cblxuY2xhc3MgVmVjdG9yMiB7XG4gIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfVxuXG4gIHRydW5jKG1pbngsIG1pbnksIG1heHgsIG1heHkpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoXG4gICAgICB0aGlzLnggPCBtaW54ID8gbWlueCA6ICh0aGlzLnggPiBtYXh4ID8gbWF4eCA6IHRoaXMueCksXG4gICAgICB0aGlzLnkgPCBtaW55ID8gbWlueSA6ICh0aGlzLnkgPiBtYXh5ID8gbWF4eSA6IHRoaXMueSksXG4gICAgKVxuICB9XG5cbiAgY29weSh2KSB7XG4gICAgdGhpcy54ID0gdi54O1xuICAgIHRoaXMueSA9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFkZCh2KSB7XG4gICAgaWYgKCF2KSB7XG4gICAgICB0aHJvdyBcIlZlY3RvciB2IG5vdCBkZWZpbmVkXCI7XG4gICAgfVxuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGRpc3RhbmNlVG8odikge1xuICAgIGNvbnN0IGR4ID0gdi54IC0gdGhpcy54LCBkeSA9IHYueSAtIHRoaXMueTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxuICB9XG5cbiAgc3ViVmVjdG9ycyhhLCBiKSB7XG4gICAgdGhpcy54ID0gYS54IC0gYi54O1xuICAgIHRoaXMueSA9IGEueSAtIGIueTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldExlbmd0aChsZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUoKS5tdWx0aXBseVNjYWxhcihsZW5ndGgpO1xuICB9XG5cbiAgbm9ybWFsaXplKCkge1xuICAgIHJldHVybiB0aGlzLmRpdmlkZVNjYWxhcih0aGlzLmxlbmd0aCgpIHx8IDEpO1xuICB9XG5cbiAgZGl2aWRlU2NhbGFyKHMpIHtcbiAgICB0aGlzLnggLz0gcztcbiAgICB0aGlzLnkgLz0gcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG11bHRpcGx5U2NhbGFyKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxlbmd0aCgpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gIH1cbn1cblxuZXhwb3J0IHtWZWN0b3IyfTtcbiIsImNsYXNzIEFuZ2xlIHtcbiAgc3RhdGljIGZyb21WZWN0b3IyKGRpcikge1xuICAgIHJldHVybiAtTWF0aC5hdGFuMihkaXIueCwgZGlyLnkpICsgTWF0aC5QSTtcbiAgfVxufVxuXG5leHBvcnQge0FuZ2xlfVxuIiwiaW1wb3J0IEpvYiBmcm9tICcuL2pvYidcbmltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QW5nbGV9IGZyb20gXCIuLi9hbmdsZVwiXG5cbnZhciB0bXBEaXIgPSBuZXcgVmVjdG9yMigpO1xuXG5jbGFzcyBNb3ZlIGV4dGVuZHMgSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBwb3MsIGRpc3RhbmNlKSB7XG4gICAgc3VwZXIoZW50aXR5KTtcbiAgICB0aGlzLnNwZWVkID0gZW50aXR5LnNwZWVkIHx8IDE7XG4gICAgdGhpcy5sbHRhcmdldFBvcyA9IHBvcztcbiAgICB0aGlzLmRpc3RhbmNlID0gZGlzdGFuY2UgfHwgMDtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICB2YXIgZSA9IHRoaXMuZW50aXR5O1xuICAgIGlmICh0aGlzLmxsdGFyZ2V0UG9zKSB7XG5cbiAgICAgIHZhciBkaXN0YW5jZSA9IHRoaXMubGx0YXJnZXRQb3MuZGlzdGFuY2VUbyhlLnBvcyk7XG4gICAgICB2YXIgdG9nbyA9IGRlbHRhICogdGhpcy5zcGVlZDtcblxuICAgICAgZGlzdGFuY2UgLT0gdGhpcy5kaXN0YW5jZTtcbiAgICAgIHRtcERpci5zdWJWZWN0b3JzKHRoaXMubGx0YXJnZXRQb3MsIGUucG9zKS5zZXRMZW5ndGgodG9nbyk7XG5cbiAgICAgIGUucm90YXRpb24gPSBBbmdsZS5mcm9tVmVjdG9yMih0bXBEaXIpO1xuICAgICAgaWYgKGRpc3RhbmNlIDwgdG9nbykge1xuICAgICAgICBpZiAodGhpcy5kaXN0YW5jZSA+IDApIHtcbiAgICAgICAgICBlLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLmxsdGFyZ2V0UG9zKS5hZGQobmV3IFZlY3RvcjIoKS5zdWJWZWN0b3JzKHRoaXMubGx0YXJnZXRQb3MsIGUucG9zKS5zZXRMZW5ndGgoLXRoaXMuZGlzdGFuY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLmxsdGFyZ2V0UG9zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGUudXBkYXRlTWVzaFBvcygpO1xuICAgICAgICBkZWxldGUgdGhpcy5sbHRhcmdldFBvcztcbiAgICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgICAvLyByZXR1cm4gcmVzdCB0aW1lXG4gICAgICAgIHJldHVybiAodG9nbyAtIGRpc3RhbmNlKSAvIHRoaXMuc3BlZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlLnBvcy5hZGQodG1wRGlyKTtcbiAgICAgIH1cblxuICAgICAgZS51cGRhdGVNZXNoUG9zKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJPUjogbm8gbGx0YXJnZXRwb3MgZGVmaW5lZFwiKTtcbiAgICAgIC8vIHVzZSB0aGlzIG1heWJlIGZvciBmb2xsb3dpbmcgb3RoZXIgZW50aXRpZXNcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG59XG5cbmV4cG9ydCB7TW92ZX07XG4iLCJpbXBvcnQgRXZlbnRzIGZyb20gJy4uL2xpYnMvZXZlbnRzJ1xuaW1wb3J0IHtNb3ZlfSBmcm9tIFwiLi9sbC9tb3ZlXCI7XG5cbmNsYXNzIFdvcmxkIHtcbiAgY29uc3RydWN0b3IobWFwKSB7XG4gICAgdGhpcy5tYXAgPSBtYXA7XG4gICAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICAgIHRoaXMuZW50aXRpZXNCeVR5cGUgPSB7fTtcbiAgICBpZiAoIXdpbmRvdy5Xb3JsZClcbiAgICAgIHdpbmRvdy5Xb3JsZCA9IHRoaXM7XG5cbiAgICB0aGlzLmhvdmVyZWQgPSBuZXcgRXZlbnRzKCk7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG5ldyBFdmVudHMoKTtcbiAgfVxuXG4gIGdldCB3aWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oZWlnaHQ7XG4gIH1cblxuICBwdXNoKGVudGl0eSkge1xuICAgIGVudGl0eS53b3JsZCA9IHRoaXM7XG4gICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSk7XG4gICAgaWYgKCFlbnRpdHkubWl4aW5OYW1lcylcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIG1peGlucyBmb3IgXCIsIGVudGl0eSk7XG4gICAgZWxzZSB7XG4gICAgICBlbnRpdHkubWl4aW5OYW1lcy5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXSlcbiAgICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdID0gW107XG4gICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0ucHVzaChlbnRpdHkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKHBhcmFtLCBvcmlnaW4pIHtcbiAgICByZXR1cm4gXy5jaGFpbih0aGlzLmVudGl0aWVzKS5maWx0ZXIoKGUpID0+IHtcbiAgICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHJldHVybiBwYXJhbShlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gcGFyYW0pIHtcbiAgICAgICAgICB2YXIgdmFsID0gcGFyYW1bbmFtZV07XG4gICAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPQkpcIiwgdmFsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICBpZiAoZVtuYW1lXS5pbmRleE9mKHZhbCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCFlW25hbWVdW3ZhbF0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlW25hbWVdICE9IHZhbClcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSkuc29ydEJ5KChlKSA9PiB7XG4gICAgICBpZiAob3JpZ2luIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcbiAgICAgICAgcmV0dXJuIGUucG9zLmRpc3RhbmNlVG8ob3JpZ2luKTtcbiAgICAgIHJldHVybiAxO1xuICAgIH0pLnZhbHVlKCk7XG4gIH1cblxuICBhc3luYyBpbml0U2NlbmUoc2NlbmUpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PSBpbml0U2NlbmVcIik7XG4gICAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGFzeW5jIGUgPT4ge1xuICAgICAgYXdhaXQgZS5zZXRTY2VuZShzY2VuZSk7XG4gICAgfSk7XG4gIH1cblxuICBob3ZlcihlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KVxuICAgICAgdGhpcy5ob3ZlcmVkRW50aXR5LmhvdmVyZWQoZmFsc2UpO1xuXG4gICAgdGhpcy5ob3ZlcmVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLmhvdmVyZWQucHVibGlzaChlbnRpdHkpXG4gIH1cblxuICBzZWxlY3QoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkpXG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKGZhbHNlKTtcbiAgICB0aGlzLnNlbGVjdGVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkLnB1Ymxpc2goZW50aXR5KVxuICB9XG5cbiAgZ2V0U2VsZWN0ZWRIZXJvKCkge1xuICAgIGlmICghdGhpcy5zZWxlY3RlZEhlcm8pIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRIZXJvID0gdGhpcy5zZWFyY2goe3BsYXllcjogXCJodW1hblwifSlbMF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkSGVybztcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICB0aGlzLmVudGl0aWVzLmZvckVhY2goKGVudGl0eSkgPT4ge1xuICAgICAgaWYgKGVudGl0eS50aWNrKSB7XG4gICAgICAgIGVudGl0eS50aWNrKGRlbHRhKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2xpY2sobGFzdFBvcykge1xuICAgIGNvbnNvbGUubG9nKFwiV09STEQuY2xpY2tcIiwgbGFzdFBvcyk7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSkge1xuICAgICAgdGhpcy5zZWxlY3QodGhpcy5ob3ZlcmVkRW50aXR5KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkgJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSm9iIC8qJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5pc0EoXCJoZXJvXCIpICYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkucGxheWVyID09IFwiaHVtYW5cIiovKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiYXNzaWduIG5ldyBtb3ZlIGpvYlwiLCBsYXN0UG9zKTtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkucmVzZXRKb2JzKCk7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hKb2IobmV3IE1vdmUodGhpcy5zZWxlY3RlZEVudGl0eSwgbGFzdFBvcywgMCkpO1xuLy8gICAgICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucHVzaEpvYihuZXcgSm9icy5tbC5Nb3ZlKHdvcmxkLnNlbGVjdGVkRW50aXR5LGxhc3RQb3MpKTtcbiAgICAgIC8vdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSGxKb2IobmV3IEpvYnMuaGwuTW92ZSh0aGlzLnNlbGVjdGVkRW50aXR5LCBsYXN0UG9zKSk7XG4gICAgfVxuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgV29ybGQ7XG4iLCJ2YXIgQXJyYXlUeXBlID0gd2luZG93LkZsb2F0NjRBcnJheSB8fCB3aW5kb3cuQXJyYXk7XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hcCh3LCBoKSB7XG4gIHJldHVybiBuZXcgQXJyYXlUeXBlKHcgKiBoKTtcbn1cblxuY2xhc3MgSGVpZ2h0TWFwIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgd2lkdGg6IDI1NixcbiAgICAgIGhlaWdodDogMjU2LFxuICAgICAgbWFwOiB7fVxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5tYXAgPSB0aGlzLm9wdGlvbnMubWFwO1xuXG4gICAgaWYgKCF0aGlzLm1hcC5yb2NrKSB7XG4gICAgICB0aGlzLm1hcC5yb2NrID0gY3JlYXRlTWFwKHRoaXMub3B0aW9ucy53aWR0aCwgdGhpcy5vcHRpb25zLmhlaWdodCk7XG4gICAgICB0aGlzLmdlbmVyYXRlKClcbiAgICB9XG4gIH07XG5cbiAgZ2V0IHdpZHRoKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuaGVpZ2h0O1xuICB9XG5cbiAgZ2VuZXJhdGUoKSB7XG4gICAgdmFyIHgsIHk7XG4gICAgdmFyIHJvY2sgPSB0aGlzLmdldChcInJvY2tcIik7XG4gICAgZm9yICh4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKVxuICAgICAgZm9yICh5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgICB2YXIgdmFsID0gTWF0aC5zaW4oeCAqIDAuMykgKyBNYXRoLnNpbih5ICogMC4xNSkgKiAyLjA7Ly8vdGhpcy5vcHRpb25zLndpZHRoO1xuICAgICAgICByb2NrKHgsIHksIHZhbCk7XG4gICAgICB9XG4gIH07XG5cbiAgZ2V0KHR5cGUpIHtcbiAgICB2YXIgdyA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLm1hcFt0eXBlXTtcblxuICAgIHZhciBmY3QgPSBmdW5jdGlvbiAoeCwgeSwgdmFsKSB7XG4gICAgICB2YXIgaSA9IHggKyB3ICogeTtcbiAgICAgIGlmICh2YWwpXG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9IHZhbDtcbiAgICAgIHJldHVybiBhcnJheVtpXTtcbiAgICB9O1xuXG4gICAgZmN0LmludGVycG9sYXRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHZhciBmeCA9IE1hdGguZmxvb3IoeCk7XG4gICAgICB2YXIgZnkgPSBNYXRoLmZsb29yKHkpO1xuICAgICAgdmFyIHYwMCA9IHRoaXMoZngsIGZ5KTtcbiAgICAgIHZhciB2MDEgPSB0aGlzKGZ4LCBmeSArIDEpO1xuICAgICAgdmFyIHYxMCA9IHRoaXMoZnggKyAxLCBmeSk7XG4gICAgICB2YXIgdjExID0gdGhpcyhmeCArIDEsIGZ5ICsgMSk7XG4gICAgICB2YXIgZHggPSB4IC0gZng7XG4gICAgICB2YXIgZHkgPSB5IC0gZnk7XG4gICAgICByZXR1cm4gKHYwMCAqICgxIC0gZHgpICsgdjEwICogZHgpICogKDEgLSBkeSkgKyAodjAxICogKDEgLSBkeCkgKyB2MTEgKiBkeCkgKiBkeTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZjdDtcbiAgfTtcblxuICBwaWNrR3JlZW4odywgaCwgZGF0YSkge1xuICAgIHZhciBhID0gbmV3IEFycmF5KHcgKiBoKTtcbiAgICB2YXIgeCwgeTtcbiAgICBmb3IgKHkgPSAwOyB5IDwgaDsgeSsrKSB7XG4gICAgICBmb3IgKHggPSAwOyB4IDwgdzsgeCsrKSB7XG4gICAgICAgIGFbeSAqIHcgKyB4XSA9IGRhdGFbKHkgKiB3ICsgeCkgKiA0ICsgMV0gKiAwLjI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhO1xuICB9O1xuXG5cbiAgdG9UaHJlZVRlcnJhaW4oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgY29uc3QgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgY29uc3Qgcm9jayA9IHNlbGYuZ2V0KFwicm9ja1wiKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHlsOyBqKyspIHtcbiAgICAgICAgICBnWyh5bCAtIGogLSAxKSAqIHhsICsgaV0ueiArPSByb2NrKGksIGopO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvKlxuICAgICAgdG9UZXh0dXJlKCkge1xuICAgICAgICAgIC8vIFVOVEVTVEVEICEhISFcbiAgICAgICAgICB2YXIgcmFtcFRleCA9IG5ldyBUSFJFRS5EYXRhVGV4dHVyZShkYXRhLnBpeGVscywgZGF0YS53aWR0aCwgZGF0YS5oZWlnaHQsIFRIUkVFLlJHQkFGb3JtYXQpO1xuICAgICAgICAgIHJhbXBUZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgICAgfTtcbiAgKi9cblxuLy8gRklYTUUgdGhpcyBzaG91bGQgbW92ZWQgc29tZXdoZXJlIGVsc2VcbiAgdG9DYW52YXMoX3R5cGUpIHtcbiAgICB2YXIgdHlwZSA9IF90eXBlIHx8IFwicm9ja1wiO1xuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjYW52YXMud2lkdGggPSB0aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gICAgdmFyIGQgPSBjb250ZXh0LmNyZWF0ZUltYWdlRGF0YShjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpLFxuICAgICAgZGF0YSA9IGQuZGF0YTtcbiAgICB2YXIgbWluLCBtYXg7XG4gICAgdmFyIGFjY2Vzc29yID0gdGhpcy5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspIHtcbiAgICAgICAgdmFyIHYgPSBhY2Nlc3Nvcih4LCB5KTtcblxuICAgICAgICBpZiAoIW1pbiB8fCBtaW4gPiB2KVxuICAgICAgICAgIG1pbiA9IHY7XG4gICAgICAgIGlmICghbWF4IHx8IG1heCA8IHYpXG4gICAgICAgICAgbWF4ID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJNTU1NXCIsIG1pbiwgbWF4KTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgIHZhciBpID0geSAqIHRoaXMub3B0aW9ucy5oZWlnaHQgKyB4O1xuICAgICAgICBpZHggPSBpICogNDtcbiAgICAgICAgZGF0YVtpZHhdID0gZGF0YVtpZHggKyAxXSA9IGRhdGFbaWR4ICsgMl0gPSBNYXRoLnJvdW5kKCgoYWNjZXNzb3IoeCwgeSkgLSBtaW4pIC8gKG1heCAtIG1pbikpICogMjU1KTtcbiAgICAgICAgZGF0YVtpZHggKyAzXSA9IDI1NTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29udGV4dC5wdXRJbWFnZURhdGEoZCwgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBIZWlnaHRNYXA7XG4iLCJmdW5jdGlvbiBhamF4KHVybCwgbWV0aG9kID0gXCJHRVRcIiwgZGF0YSA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzIDw9IDI5OSAmJiByZXF1ZXN0LnN0YXR1cyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJFU1BPTlNFXCIsIHJlcXVlc3QsIHR5cGVvZiByZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcXVlc3QucmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ05ldHdvcmsgRXJyb3InKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFqYXg7IiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi92ZWN0b3IyXCI7XG5cbnZhciB1aWQgPSAxMTExMDtcblxuY2xhc3MgRW50aXR5IHtcbiAgY29uc3RydWN0b3IoaGVpZ2h0bWFwLCBvcHMpIHtcblxuICAgIHZhciBlbnRpdHkgPSBvcHMuZW50aXR5VHlwZXNbb3BzLnR5cGVdO1xuICAgIGlmICghZW50aXR5KSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJFbnRpdHk6IE5vIEVudGl0eS1UeXBlIG5hbWVkIFwiICsgb3BzLnR5cGUgKyBcIiBmb3VuZCFcIik7XG4gICAgICBlbnRpdHkgPSB7fTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBlbnRpdHkpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgb3BzKTtcbiAgICAvLyBGSVhNRTogcmVkdWNlIGNvbXBsZXhpdHkgYW5kIHJlZmVyZW5jZXMgYnkgcmVtb3ZpbmcgbW9kZWxzLCBtYXAgYW5kIHNvID8/P1xuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLnBvcyk7XG4gICAgdGhpcy50eXBlTmFtZSA9IHRoaXMudHlwZTtcbiAgICB0aGlzLnVpZCA9IHVpZCsrO1xuICAgIHRoaXMubWFwID0gaGVpZ2h0bWFwO1xuICAgIC8vIGNsb25lXG4gICAgdGhpcy5yZXNvdXJjZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnJlc291cmNlcyk7XG4gICAgdGhpcy50eXBlID0gZW50aXR5O1xuICAgIGlmICghdGhpcy5tZXNoTmFtZSlcbiAgICAgIHRoaXMubWVzaE5hbWUgPSBcImRlZmF1bHRcIjtcblxuICAgIGlmIChlbnRpdHkubWl4aW5zKSB7XG4gICAgICB0aGlzLm1peGlucyA9IHt9O1xuICAgICAgdGhpcy5taXhpbk5hbWVzID0gW107XG4gICAgICB0aGlzLm1peGluRGVmID0gZW50aXR5Lm1peGlucztcbiAgICAgIGNvbnNvbGUubG9nKFwiTUlYSU5ERUZTXCIsIG9wcy5taXhpbkRlZnMpO1xuICAgICAgZW50aXR5Lm1peGlucy5mb3JFYWNoKG1peGluID0+IHtcbiAgICAgICAgdmFyIGZvdW5kID0gb3BzLm1peGluRGVmc1ttaXhpbl07XG4gICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgIGZvdW5kID0gZm91bmQoKTtcbiAgICAgICAgICB0aGlzLm1peGluc1ttaXhpbl0gPSBmb3VuZDtcbiAgICAgICAgICB0aGlzLm1peGluTmFtZXMucHVzaChtaXhpbik7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBmb3VuZCk7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJGT1VORFwiLCBmb3VuZCwgdGhpcylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIk1peGluIG5vdCBmb3VuZFwiLCBtaXhpbilcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIGdldCBpZCgpIHtcbiAgICByZXR1cm4gdGhpcy51aWRcbiAgfVxuXG4gIHJ1blBvc3RMb2FkKCkge1xuICAgIGZvciAodmFyIG1peGluIGluIHRoaXMubWl4aW5zKSB7XG4gICAgICBpZiAodGhpcy5taXhpbnNbbWl4aW5dLnBvc3RMb2FkKSB7XG4gICAgICAgIHRoaXMubWl4aW5zW21peGluXS5wb3N0TG9hZC5hcHBseSh0aGlzLCBbXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNBKG1peGluKSB7XG4gICAgY29uc29sZS5sb2coXCJpc2FcIiwgbWl4aW4sIHRoaXMubWl4aW5EZWYpO1xuICAgIHJldHVybiB0aGlzLm1peGluRGVmLmluZGV4T2YobWl4aW4pID49IDA7XG4gIH1cblxuICBhc3luYyBzZXRTY2VuZShzY2VuZSkge1xuICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRNZXNoKHRoaXMubWVzaE5hbWUpO1xuICB9O1xuXG4gIGNvbXB1dGVNZXNoUG9zKCkge1xuICAgIGNvbnN0IGggPSB0aGlzLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMucG9zLngsIHRoaXMucG9zLnkpO1xuICAgIHJldHVybiB7eDogdGhpcy5wb3MueCwgeTogaCwgejogLXRoaXMucG9zLnl9O1xuICB9XG5cbiAgdXBkYXRlTWVzaFBvcygpIHtcbiAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICBpZiAodGhpcy5tZXNoICYmIHRoaXMubWVzaC5yb3RhdGlvbiAmJiB0aGlzLnJvdGF0aW9uKSB7XG4gICAgICAgIHRoaXMubWVzaC5yb3RhdGlvbi55ID0gdGhpcy5yb3RhdGlvbjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5jb21wdXRlTWVzaFBvcygpO1xuICAgICAgdGhpcy5tZXNoLnNldFBvcyhwb3NpdGlvbi54LCBwb3NpdGlvbi55LCBwb3NpdGlvbi56KTtcbiAgICB9XG4gIH07XG5cbiAgZ2V0TWVzaERlZigpIHtcbiAgICBjb25zdCBlbnRpdHkgPSB0aGlzLnR5cGU7XG4gICAgdmFyIG1lc2hUeXBlO1xuICAgIHZhciBhbmltYXRpb247XG5cbiAgICBpZiAodGhpcy50eXBlLm1lc2hlcykge1xuICAgICAgdmFyIGRlZiA9IGVudGl0eS5tZXNoZXNbdGhpcy5tZXNoTmFtZV07XG4gICAgICBpZiAoIWRlZilcbiAgICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBvZiBuYW1lICdcIiArIG5hbWUgKyBcIicgZm91bmQgaW4gZW50aXR5LWRlZlwiLCBlbnRpdHkpO1xuICAgICAgbWVzaFR5cGUgPSBkZWYubWVzaDtcbiAgICAgIGFuaW1hdGlvbiA9IGRlZi5hbmltYXRpb247XG4gICAgfSBlbHNlIGlmIChlbnRpdHkubWVzaCkge1xuICAgICAgbWVzaFR5cGUgPSBlbnRpdHkubWVzaDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaFR5cGUgPSB0aGlzLnR5cGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4ge21lc2hUeXBlLCBhbmltYXRpb259O1xuICB9XG5cbiAgc2V0TWVzaChuYW1lKSB7XG5cbiAgICBpZiAobmFtZSkge1xuICAgICAgdGhpcy5tZXNoTmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgY29uc3Qge21lc2hUeXBlLCBhbmltYXRpb259ID0gdGhpcy5nZXRNZXNoRGVmKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tb2RlbExvYWRlci5sb2FkKG1lc2hUeXBlLCBhbmltYXRpb24pLnRoZW4oKG1lc2gpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTU9ERUwgbG9hZGVkXCIsIG1lc2gsIG1lc2hUeXBlLCBhbmltYXRpb24sIHRoaXMuc2NlbmUpO1xuICAgICAgbWVzaC5hdHRhY2hUb1NjZW5lKHRoaXMuc2NlbmUpO1xuXG4gICAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICAgIHRoaXMubWVzaC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubWVzaCA9IG1lc2g7XG4gICAgICBtZXNoLnNldEVudGl0eSh0aGlzKTtcbiAgICAgIHRoaXMudXBkYXRlTWVzaFBvcygpO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uRmluaXNoZWQpIHtcbiAgICAgICAgdGhpcy5tZXNoLmFuaW1hdGlvbkZpbmlzaGVkID0gdGhpcy5hbmltYXRpb25GaW5pc2hlZC5iaW5kKHRoaXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkKTtcbiAgICAgIHRoaXMubWVzaC5zZWxlY3RlZCh0aGlzLnN0YXRlLnNlbGVjdGVkKTtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSk7XG4gIH07XG5cbiAgaG92ZXJlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkID0gdmFsKTtcbiAgfTtcblxuICBzZWxlY3RlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQgPSB2YWwpO1xuICB9O1xuXG4gIGluY3JlYXNlQnkod2hhdCwgYW1vdW50KSB7XG4gICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gPSAodGhpcy5yZXNvdXJjZXNbd2hhdF0gfHwgMCkgKyBhbW91bnQ7XG4gIH07XG5cbiAgdGFrZSh3aGF0LCBhbW91bnQpIHtcbiAgICBpZiAodGhpcy5yZXNvdXJjZXNbd2hhdF0gPj0gYW1vdW50KSB7XG4gICAgICB0aGlzLnJlc291cmNlc1t3aGF0XSAtPSBhbW91bnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIGdpdmUod2hhdCwgYW1vdW50LCB0b0VudGl0eSkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIGNvbnNvbGUuZGVidWcoXCJHSVZFIFRPXCIsIHRvRW50aXR5LCB3aGF0KTtcbiAgICAgIHRvRW50aXR5LnJlc291cmNlc1t3aGF0XSA9ICh0b0VudGl0eS5yZXNvdXJjZXNbd2hhdF0gfHwgMCkgKyBhbW91bnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCB7RW50aXR5fVxuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBcImJha2VyeVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiYmFrZXJ5M1wiXG4gIH0sXG4gIFwiYmlnX3N0b25lXCI6IHtcbiAgICBcIm1lc2hcIjogXCJiaWdfc3RvbmUzXCJcbiAgfSxcbiAgXCJjcm9wX3NtYWxsXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX21lZFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF9oaWdoXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX3RpbnlcIjoge1xuICAgIFwibWVzaFwiOiBcImNyb3BfdGlueTJcIixcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJmYXJtXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmYXJtMlwiXG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWVzaFwiOiBcImZpc2hpbmdfaHV0MlwiLFxuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJncmF2ZTJcIlxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWVzaFwiOiBcImhlcm9fbHAyXCJcbiAgfSxcbiAgXCJtaW5lXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtaW5lM1wiXG4gIH0sXG4gIFwibWlsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWlsbFwiLFxuICAgIFwic2NhbGVcIjogMVxuICB9LFxuICBcInRvd25oYWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0b3duaGFsbF90cnkzXCJcbiAgfSxcbiAgXCJ0b3dlclwiOiB7XG4gICAgXCJtZXNoXCI6IFwidG93ZXIyXCJcbiAgfSxcbiAgXCJtYW5fcGlja1wiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICBcInRleHR1cmVcIjogXCJtYW5fZmlnaHQucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNDUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ4LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDM1LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGlja1wiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9heGVcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICBcInRleHR1cmVcIjogXCJtYW5fZmlnaHQucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA0MCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMzUsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMjcsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwaWNrXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2Vfd2Fsa1wiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJzaXRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAzMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDIwLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDIwLFxuICAgICAgICBcImFuaW1hdGVcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcInNpdGRvd25cIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMTgsXG4gICAgICAgIFwibG9vcFwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQwLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQwXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMzAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA2NVxuICAgICAgfSxcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDEwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNjVcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2ZpZ2h0XCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0MSxcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMTgsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJzd29yZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMzUsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJzd29yZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMjAsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJ1Z2hcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwibWVzaFwiOiBcImZpcjRcIlxuICB9LFxuICBcImZpcl9vbGRcIjoge1xuICAgIFwibWVzaFwiOiBcImZpcjJcIixcbiAgICBcInRleHR1cmVcIjogXCJmaXI1LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC40MixcbiAgICBcImRvdWJsZXNpZGVkXCI6IHRydWUsXG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlXG4gIH0sXG5cbiAgXCJ0cmVlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0cmVlNVwiLFxuICAgIFwic2NhbGVcIjogMC4yLFxuICAgIFwiZG91Ymxlc2lkZWRcIjogdHJ1ZVxuICB9LFxuICBcInNoZWVwXCI6IHtcbiAgICBcInNjYWxlXCI6IDAuMTUsXG4vLyAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcInRleHR1cmVcIjogXCJzaGVlcC5wbmdcIixcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ1XG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDUsXG4gICAgICAgIFwibG9vcFwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDYwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMTAwXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIndlbGxcIjoge1xuICAgIFwibWVzaFwiOiBcIndlbGxcIlxuICB9LFxuICBcIndvcmtzaG9wXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ3b3Jrc2hvcDJcIixcbiAgICBcInBhcnRpY2xlc1wiOiB7XG4gICAgICBcInNtb2tlXCI6IHtcbiAgICAgICAgXCJwb3NpdGlvblwiOiB7XG4gICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgXCJ6XCI6IDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiY29uc3Qgb25seU9uZUF0QVRpbWUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGxldCB3aXRoaW4gPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGZjdCkge1xuICAgICAgICBpZiAod2l0aGluKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ubHlPbmVBdEFUaW1lKGZjdCksIDEwKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2l0aGluPXRydWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZjdCgpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB3aXRoaW4gPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pKCk7XG5cblxuY2xhc3MgTW9kZWwge1xuICAgIGNvbnN0cnVjdG9yKGlubmVyTWVzaGVzLCBvdXRlck5vZGUsIGhvdmVyUmluZywgc2VsZWN0UmluZykge1xuICAgICAgICB0aGlzLmlubmVyTWVzaGVzID0gaW5uZXJNZXNoZXM7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlID0gb3V0ZXJOb2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5vdXRlck5vZGUucG9zaXRpb247XG4gICAgICAgIHRoaXMucm90YXRpb24gPSB0aGlzLm91dGVyTm9kZS5yb3RhdGlvbjtcbiAgICAgICAgdGhpcy5ob3ZlclJpbmcgPSBob3ZlclJpbmc7XG4gICAgICAgIHRoaXMuc2VsZWN0UmluZyA9IHNlbGVjdFJpbmc7XG4gICAgfVxuXG4gICAgYXR0YWNoVG9TY2VuZShzY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lID0gc2NlbmU7XG4gICAgICAgIGlmKGZhbHNlKSB7XG4gICAgICAgICAgICBvbmx5T25lQXRBVGltZSgoKSA9PiBzY2VuZS5hZGQodGhpcy5vdXRlck5vZGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjZW5lLmFkZCh0aGlzLm91dGVyTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldEVudGl0eShlbnRpdHkpIHtcbiAgICAgICAgXy5lYWNoKHRoaXMuaW5uZXJNZXNoZXMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICBtLnVzZXJEYXRhLmVudGl0eSA9IGVudGl0eTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBob3ZlcmVkKHZhbCkge1xuICAgICAgICBpZiAodmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuaG92ZXJSaW5nLnZpc2libGUgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaG92ZXJSaW5nLnZpc2libGU7XG4gICAgfVxuXG4gICAgc2VsZWN0ZWQodmFsKSB7XG4gICAgICAgIGlmICh2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RSaW5nLnZpc2libGUgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0UmluZy52aXNpYmxlO1xuICAgIH1cblxuICAgIGRldGFjaEZyb21TY2VuZSgpIHtcbiAgICAgICAgc2NlbmUucmVtb3ZlKHRoaXMub3V0ZXJOb2RlKVxuICAgIH1cblxuICAgIHNldFBvcyh4LCB5LCB6KSB7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnggPSB4O1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi55ID0geTtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueiA9IHo7XG4gICAgfVxuXG4gICAgZW5hYmxlUGFydGljbGVzKHR5cGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVtaXR0ZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWwgLSBFTkFCTEVcIik7XG4gICAgICAgICAgICB2YXIgZW1pdHRlciA9IHRoaXMuZW1pdHRlciA9IHRoaXMuc2NlbmUucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpOyAvL2FkZEVtaXR0ZXIoIEJhc2UubWFrZUVtaXR0ZXIobmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApKSk7XG4gICAgICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRpc2FibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAodGhpcy5lbWl0dGVyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIuZGlzYWJsZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIERJU0FCTEVcIiwgdHlwZSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5lbWl0dGVyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJFTU9WRSBNRSBGUk9NIFNDRU5FXCIsIHRoaXMpO1xuICAgICAgICAvLyBob29rIHRvIHJlbW92ZSBhbmltYXRpb24tcmVzdGFydGVyLWludGVydmFsXG4gICAgICAgIGlmICh0aGlzLmlubmVyTWVzaGVzICYmIHRoaXMuaW5uZXJNZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgXy5lYWNoKHRoaXMuaW5uZXJNZXNoZXMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgaWYgKG0uYmVmb3JlUmVtb3ZlKVxuICAgICAgICAgICAgICAgICAgICBtLmJlZm9yZVJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpcy5vdXRlck5vZGUpO1xuICAgICAgICBkZWxldGUgdGhpcy5vdXRlck5vZGU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb2RlbDsiLCJpbXBvcnQgTWVzaGVzIGZyb20gXCIuLi9jb25maWcvbWVzaGVzXCJcbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9tb2RlbFwiXG5cbi8vIEZJWE1FOiBub3QgbmVlZGVkIGFueW1vcmU/XG5mdW5jdGlvbiBlbnN1cmVMb29wKGFuaW1hdGlvbikge1xuICByZXR1cm47XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uLmhpZXJhcmNoeS5sZW5ndGg7IGkrKykge1xuXG4gICAgdmFyIGJvbmUgPSBhbmltYXRpb24uaGllcmFyY2h5W2ldO1xuXG4gICAgdmFyIGZpcnN0ID0gYm9uZS5rZXlzWzBdO1xuICAgIHZhciBsYXN0ID0gYm9uZS5rZXlzW2JvbmUua2V5cy5sZW5ndGggLSAxXTtcblxuICAgIGxhc3QucG9zID0gZmlyc3QucG9zO1xuICAgIGxhc3Qucm90ID0gZmlyc3Qucm90O1xuICAgIGxhc3Quc2NsID0gZmlyc3Quc2NsO1xuICB9XG59XG5cbmNsYXNzIE1vZGVsTG9hZGVyIHtcblxuICBjb25zdHJ1Y3Rvcihsb2FkZXJzID0ge30sIG1hbmFnZXIgPSBudWxsLCBtZXNoZXMgPSBudWxsKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfLnBpY2sobG9hZGVycywgWydpbWFnZUxvYWRlciddKSk7XG5cbiAgICBpZiAoIW1hbmFnZXIgJiYgVEhSRUUuTG9hZGluZ01hbmFnZXIpIHtcbiAgICAgIG1hbmFnZXIgPSBuZXcgVEhSRUUuTG9hZGluZ01hbmFnZXIoKTtcbiAgICB9XG4gICAgaWYgKG1lc2hlcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IG1lc2hlcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tZXNoZXMgPSBNZXNoZXM7XG4gICAgfVxuICAgIG1hbmFnZXIub25Qcm9ncmVzcyA9IGZ1bmN0aW9uIChpdGVtLCBsb2FkZWQsIHRvdGFsKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwibWFuYWdlci5vblByb2dyZXNzXCIsIGl0ZW0sIGxvYWRlZCwgdG90YWwpO1xuICAgIH07XG5cbiAgICBpZiAoIXRoaXMuaW1hZ2VMb2FkZXIgJiYgVEhSRUUuSW1hZ2VMb2FkZXIpIHtcbiAgICAgIHRoaXMuaW1hZ2VMb2FkZXIgPSBuZXcgVEhSRUUuSW1hZ2VMb2FkZXIobWFuYWdlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIgJiYgVEhSRUUuR0xURkxvYWRlcikge1xuICAgICAgdGhpcy5nbHRmTG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgIGlmICghdGhpcy50ZXh0dXJlTG9hZGVyICYmIFRIUkVFLlRleHR1cmVMb2FkZXIpIHtcbiAgICAgIHRoaXMudGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiBjb2xvcixcbiAgICAgIGZsYXRTaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC41LFxuICAgICAgZGVwdGhUZXN0OiBmYWxzZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgc29tZVJpbmcgPSBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuUmluZ0dlb21ldHJ5KDEuMywgMiwgMjAsIDUsIDAsIE1hdGguUEkgKiAyKSwgbWF0ZXJpYWwpO1xuICAgIHNvbWVSaW5nLnBvc2l0aW9uLnNldCgwLCAwLjUsIDAuMCk7XG4gICAgc29tZVJpbmcucm90YXRlT25BeGlzKG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApLCAtMS42KTtcbiAgICBzb21lUmluZy52aXNpYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIHNvbWVSaW5nXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlQm94KCkge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZGQ5OTAwLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjVcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEsIDEsIDEpLCBtYXRlcmlhbCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gIH1cblxuICBhc3luYyBwYWNrSW50b05vZGUob3B0aW9ucykge1xuICAgIGNvbnN0IHttZXNoRGVmLCBtZXNoLCBtZXNoTmFtZX0gPSBvcHRpb25zO1xuICAgIHZhciBvYmplY3RzO1xuICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cyA9IG1lc2guY2xvbmUoKTtcbiAgICB9XG4gICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcblxuICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgIC8vIGVuY2xvc2UgbWVzaCB3aXRoaW4gc2NlbmUtbm9kZSwgc28gdGhhdCBpdCBjYW4gYmUgcm90YXRlZCBhbmQgdGhlcmUgY2FuIGJlIHNldmVyYWwgbWVzaGVzXG4gICAgLy8gYXR0YWNoZWQgdG8gb25lIGVudGl0eVxuICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIF8uZWFjaChvYmplY3RzLCBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICBub2RlLmFkZChvYmplY3QpO1xuICAgIH0pO1xuICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgbmV3TW9kZWwubmFtZSA9IG1lc2g7XG4gICAgbmV3TW9kZWwudHlwZSA9IG1lc2hOYW1lO1xuXG4gICAgdGhpcy5hZGRSaW5ncyhub2RlLCBuZXdNb2RlbCk7XG5cbiAgICByZXR1cm4gbmV3TW9kZWxcbiAgfVxuXG4gIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuaG92ZXJSaW5nID0gTW9kZWxMb2FkZXIuY3JlYXRlUmluZygweGRkOTkwMCkpO1xuICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4RkY5OTAwKSk7XG4gIH1cblxuICBhc3luYyBsb2FkVW5jYWNoZWQobWVzaCwgYW5pbWF0aW9uKSB7XG4gICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgIGlmICghbWVzaERlZikge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBkZWZpbmVkIGZvciBuYW1lICdcIiArIG1lc2ggKyBcIidcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubG9hZE9iakNvbXBsZXRlKG1lc2gsIGFuaW1hdGlvbilcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmoobWVzaE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICBpZiAodGhpcy5nbHRmTG9hZGVyKSB7XG4gICAgICAgIHRoaXMuZ2x0ZkxvYWRlci5sb2FkKFxuICAgICAgICAgICdtb2RlbHMvJyArIG1lc2hOYW1lICsgJy5nbHRmJyxcbiAgICAgICAgICBtZXNoID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoe21lc2gsIG1lc2hOYW1lfSlcbiAgICAgICAgICB9LFxuICAgICAgICAgICh4aHIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc2hOYW1lICsgXCIgXCIgKyAoeGhyLmxvYWRlZCAvIHhoci50b3RhbCAqIDEwMCkgKyAnJSBsb2FkZWQnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsb2FkT2JqQ29tcGxldGUobmFtZSwgZHVtbXkpIHtcbiAgICBjb25zdCBtZXNoRGVmID0gdGhpcy5tZXNoZXNbbmFtZV07XG4gICAgY29uc3QgbWVzaE5hbWUgPSAobWVzaERlZiAmJiBtZXNoRGVmLm1lc2gpIHx8IG5hbWU7XG4gICAgY29uc29sZS5sb2coXCJMb2FkIHRleHR1cmVcIiwgbmFtZSwgbWVzaE5hbWUpO1xuICAgIGNvbnN0IG1lc2hPYmplY3QgPSBhd2FpdCB0aGlzLmxvYWRPYmoobWVzaE5hbWUpO1xuXG4gICAgY29uc29sZS5sb2coXCJNT0RFTE9CSkVDVCBcIiwgbmFtZSwgbWVzaE9iamVjdCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7bWVzaERlZn0sIG1lc2hPYmplY3QpO1xuICB9XG5cbiAgLy8gYW5pbWF0ZSAoY2xvbmVkKSBtZXNoXG4gIGFuaW1hdGUobWVzaCwgbmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IGFuaW1hdGlvbiA9IG5ldyBUSFJFRS5BbmltYXRpb24obWVzaCwgYW5pbWF0aW9uc1tuYW1lXSk7XG4gICAgYW5pbWF0aW9uLmRhdGEgPSBhbmltYXRpb25zW25hbWVdO1xuICAgIGNvbnN0IHNjYWxlID0gb3B0aW9ucy50aW1lU2NhbGUgfHwgMTtcblxuICAgIGlmIChvcHRpb25zLmxvb3AgPT09IGZhbHNlKSB7XG4gICAgICBhbmltYXRpb24ubG9vcCA9IGZhbHNlO1xuICAgIH1cbiAgICBhbmltYXRpb24udGltZVNjYWxlID0gc2NhbGU7XG4gICAgYW5pbWF0aW9uLnBsYXkoKTtcblxuICAgIC8vIGltcGxlbWVudCBzdXBwb3J0IGZvciBsb29waW5nIGludGVydmFsIHdpdGhpbiBnbG9iYWwgYW5pbWF0aW9uXG4gICAgLy8gaGF2ZSBhIGxvb2sgYXQgZW50aXR5IGFsc29cbiAgICBpZiAob3B0aW9ucy5zdGFydEZyYW1lKSB7XG4gICAgICAvL2FuaW1hdGlvbi51cGRhdGUoIG9wdGlvbnMuc3RhcnRGcmFtZSk7XG4gICAgICBpZiAob3B0aW9ucy5hbmltYXRlID09PSBmYWxzZSAmJiBmYWxzZSkge1xuICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICBhbmltYXRpb24udXBkYXRlKG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZW5kRnJhbWUpIHtcbiAgICAgICAgdmFyIHN0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFuaW1hdGlvbi5wbGF5KG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdG9wQW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJBTklNQUwgc3RvcEFOaW1hdGlvblwiLCBtZXNoLCBtZXNoLmFuaW1hdGlvbkZpbmlzaGVkKTtcbiAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgIGlmIChtZXNoLnVzZXJEYXRhICYmIG1lc2gudXNlckRhdGEuZW50aXR5ICYmIG1lc2gudXNlckRhdGEuZW50aXR5LmFuaW1hdGlvbkZpbmlzaGVkKVxuICAgICAgICAgICAgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRpbWUgPSAxMDAwICogKG9wdGlvbnMuZW5kRnJhbWUgLSBvcHRpb25zLnN0YXJ0RnJhbWUpIC8gc2NhbGU7XG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgICAgIGlmIChvcHRpb25zLmxvb3AgIT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoc3RhcnRBbmltYXRpb24sIHRpbWUpO1xuICAgICAgICAgIG1lc2guYmVmb3JlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBET05UIExPT1BcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoc3RvcEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGFuaW1hdGlvbi51cGRhdGUoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgfVxuXG4gIGxvYWRKU09OKG5hbWUsIGFuaW1hdGlvbikge1xuICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5tZXNoZXNbbmFtZV0pO1xuXG4gICAgLy8gbm93IG92ZXJyaWRlIHdpdGggb3B0aW9ucyBmcm9tIGFuaW1hdGlvbnMtcGFydFxuICAgIGlmIChvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSkge1xuICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9ucy5hbmltYXRpb25zW2FuaW1hdGlvbl0pO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkxvYWRpbmcgbW9kZWxcIiwgbmFtZSk7XG5cbiAgICAgIHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcbiAgICAgIHRoaXMuanNvbkxvYWRlci5sb2FkKCdtb2RlbHMvJyArIG5hbWUgKyAnLmpzb24nLCBmdW5jdGlvbiAoZ2VvbWV0cnksIG1hdGVyaWFscykge1xuXG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVWZXJ0ZXhOb3JtYWxzKCk7XG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXG4gICAgICAgIGVuc3VyZUxvb3AoZ2VvbWV0cnkuYW5pbWF0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0ZXJpYWxzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcblxuICAgICAgICAgIHZhciBvcmlnaW5hbE1hdGVyaWFsID0gbWF0ZXJpYWxzW2ldO1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJNQVRcIiwgb3JpZ2luYWxNYXRlcmlhbCk7XG4gICAgICAgICAgb3JpZ2luYWxNYXRlcmlhbC5za2lubmluZyA9IHRydWU7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZG91Ymxlc2lkZWQpIHtcbiAgICAgICAgICAgIC8vICBvcmlnaW5hbE1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkRPVUJMRVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChtYXRlcmlhbHMpO1xuICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZClcbiAgICAgICAgICBtYXRlcmlhbC5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWUpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICB3aXJlZnJhbWU6IHRydWUsXG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdE1hdGVyaWFsKSB7XG4gICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5Ta2lubmVkTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwsIGZhbHNlKTtcblxuICAgICAgICBhbmltYXRpb25zW25hbWVdID0gZ2VvbWV0cnkuYW5pbWF0aW9uO1xuXG4gICAgICAgIHJlc29sdmUobWVzaClcbiAgICAgIH0sIG51bGwsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWxMb2FkZXI7XG4iLCJpbXBvcnQge01vdmV9IGZyb20gJy4uL2xsL21vdmUnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmxldCBhbmltYWwgPSB7XG4gIG9uTm9Kb2I6IGZ1bmN0aW9uIChkZWx0YSkge1xuICAgIGNvbnNvbGUubG9nKFwiT04gTk8gSk9CXCIpO1xuICAgIGlmICh0aGlzLnNob3VsZFdhbGsoKSkge1xuICAgICAgdGhpcy5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgIGxldCB0YXJnZXRQb3MgPSBuZXcgVmVjdG9yMihNYXRoLnJhbmRvbSgpICogMiAtIDEsXG4gICAgICAgIE1hdGgucmFuZG9tKCkgKiAyIC0gMSkuYWRkKHRoaXMucG9zKTtcblxuICAgICAgaWYgKHRoaXMud29ybGQpIHtcbiAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zLnRydW5jKDAsIDAsIHRoaXMud29ybGQud2lkdGgsIHRoaXMud29ybGQuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaEpvYihuZXcgTW92ZSh0aGlzLCB0YXJnZXRQb3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wbGF5QW5pbWF0aW9uKFwiZWF0XCIpO1xuICAgIH1cbiAgfSxcbiAgc2hvdWxkV2FsazogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSA8IDAuNSk7XG4gIH1cbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IGFuaW1hbDtcblxuZXhwb3J0IGRlZmF1bHQgQW5pbWFsO1xuXG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuXG5jbGFzcyBSZXN0Sm9iIGV4dGVuZHMgSm9iIHtcbiAgICBjb25zdHJ1Y3RvcihlbnRpdHksIHRpbWUpIHtcbiAgICAgICAgc3VwZXIoZW50aXR5KVxuICAgICAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgICAgICB0aGlzLmRvbmVUaW1lID0gMDtcbiAgICB9XG5cbiAgICAvLyBtYXliZSBpbXBsZW1lbnQgdXNpbmcgc2V0VGltZW91dCA/XG4gICAgb25GcmFtZShkZWx0YSkge1xuICAgICAgICB0aGlzLmRvbmVUaW1lICs9IGRlbHRhO1xuICAgICAgICBpZiAodGhpcy5kb25lVGltZSA+IHRoaXMudGltZSkge1xuICAgICAgICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZG9uZVRpbWUgLSB0aGlzLnRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVzdEpvYjtcblxuIiwiaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcblxubGV0IGpvYiA9IHtcbiAgam9iczogbnVsbCxcbiAgcHVzaEpvYjogZnVuY3Rpb24gKGpvYikge1xuICAgIGlmICghdGhpcy5qb2JzKVxuICAgICAgdGhpcy5qb2JzID0gW107XG4gICAgaWYgKHRoaXMuam9ic1t0aGlzLmpvYnMubGVuZ3RoIC0gMV0gJiYgdGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXS5yZWFkeSkge1xuICAgICAgdGhyb3cgXCJKb2IgaXMgcmVhZHkgLSBkb250JyBwdXNoIVwiO1xuICAgIH1cbiAgICB0aGlzLmpvYnMucHVzaChqb2IpO1xuICAgIHRoaXMudXBkYXRlQ3VycmVudEpvYigpO1xuICAgIGlmICh0aGlzLmN1cnJlbnRKb2IuaW5pdClcbiAgICAgIHRoaXMuY3VycmVudEpvYi5pbml0KCk7XG4gIH0sXG4gIHJlc2V0Tm9uSGxKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIHRoaXMuam9icyA9IF8uZmlsdGVyKHRoaXMuam9icywgZnVuY3Rpb24gKGpvYikge1xuICAgICAgICByZXR1cm4gam9iLmFzc2lnbk1lSm9iO1xuICAgICAgfSk7XG4gIH0sXG4gIHJlc2V0Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuam9icyA9IFtdO1xuICAgIHRoaXMudXBkYXRlQ3VycmVudEpvYigpO1xuICB9LFxuICB1cGRhdGVDdXJyZW50Sm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIHRoaXMuY3VycmVudEpvYiA9IHRoaXMuam9ic1t0aGlzLmpvYnMubGVuZ3RoIC0gMV07XG4gIH0sXG4gIHRpY2s6IGZ1bmN0aW9uIChkZWx0YSkge1xuICAgIHdoaWxlICh0aGlzLmpvYnMgJiYgZGVsdGEgPiAwICYmIHRoaXMuam9icy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgam9iID0gdGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXTtcbiAgICAgIGRlbHRhID0gam9iLm9uRnJhbWUoZGVsdGEpO1xuICAgICAgaWYgKGpvYi5yZWFkeSkge1xuICAgICAgICBpZiAoam9iLmFzc2lnbk1lSm9iKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJKT0IgUkVBRFkhISFcIiwgdGhpcy5qb2JzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmpvYnMucG9wKCk7XG4gICAgICAgIHRoaXMudXBkYXRlQ3VycmVudEpvYigpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsdGEgPiAwKSB7XG4gICAgICBpZiAodGhpcy5vbk5vSm9iKSB7XG4gICAgICAgIHRoaXMub25Ob0pvYihkZWx0YSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwbGF5QW5pbWF0aW9uOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIC8vRklYTUU6IHNldCBiYWNrIHRvIDIwICg/KVxuICAgIHRoaXMucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLCAyKSk7XG4gICAgdGhpcy5zZXRNZXNoKG5hbWUpO1xuICB9LFxuICBhbmltYXRpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzZXRKb2JzKCk7XG4gIH1cbn07XG5cbmNvbnN0IEpvYiA9ICgpID0+IGpvYjtcblxuZXhwb3J0IHtKb2J9XG5cblxuIiwibGV0IGZvbGxvd2VyID0ge1xuICBjaGVja0Jvc3M6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuYm9zcykge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBtaXhpbk5hbWVzOiBcImhvdXNlXCJcbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiAodGhpcy5ib3NzKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBuYW1lOiB0aGlzLmJvc3NcbiAgICAgIH0pKTtcbiAgICB9XG4gIH0sXG4gIG9uTm9Kb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrQm9zcygpO1xuICAgIGlmICh0aGlzLmJvc3MgJiYgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKVxuICAgICAgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKHRoaXMpO1xuICB9LFxuICBfZmluZFNvbWVCb3NzKHNwZWNzKSB7XG4gICAgaWYgKHRoaXMud29ybGQuc2VhcmNoKSB7XG4gICAgICB2YXIgZiA9IHRoaXMud29ybGQuc2VhcmNoKHNwZWNzLCB0aGlzLnBvcyk7XG4gICAgICBpZiAoZi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBmWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgX2Fzc2lnbkJvc3MoYm9zcykge1xuICAgIHRoaXMuYm9zcyA9IGJvc3M7XG4gICAgaWYgKGJvc3MgIT0gbnVsbCkge1xuICAgICAgdGhpcy5ib3NzLmFkZEZvbGxvd2VyKHRoaXMpO1xuICAgIH1cbiAgfVxufTtcblxuXG5sZXQgRm9sbG93ZXIgPSAoKSA9PiBmb2xsb3dlcjtcbmV4cG9ydCB7Rm9sbG93ZXJ9XG4iLCJjbGFzcyBITEpvYiB7XG4gIGNvbW1vblN0YXJ0KCkge1xuICAgIGlmICghdGhpcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5lbnRpdHkuZm9sbG93ZXJzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIHRoaXMuYXNzaWduTWVKb2IoZSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuYXNzaWduTWVKb2IodGhpcy5lbnRpdHkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIGlmICghdGhpcy5yZWFkeSlcbiAgICAgIGlmICghdGhpcy5jb21tb25TdGFydCgpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiT05GUkFNRVwiLCB0aGlzLnJlYWR5KTtcbiAgICAgICAgdGhpcy5hc3NpZ25NZUpvYih0aGlzLmVudGl0eSk7XG4gICAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHtITEpvYn1cbiIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcblxuY2xhc3MgQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZm9ybUNhY2hlID0ge307XG4gICAgdGhpcy5mb3JtU2l6ZSA9IC0xO1xuICB9XG5cbiAgc29ydChmb2xsb3dlcnMpIHtcbiAgICByZXR1cm4gZm9sbG93ZXJzO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zQ2FjaGVkKGJvc3MsIGkpIHtcbiAgICBpZiAodGhpcy5mb3JtU2l6ZSAhPSBib3NzLmZvbGxvd2Vycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZm9ybVNpemUgPSBib3NzLmZvbGxvd2Vycy5sZW5ndGg7XG4gICAgICB0aGlzLmZvcm1DYWNoZSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZm9ybUNhY2hlW2ldKSB7XG4gICAgICB0aGlzLmZvcm1DYWNoZVtpXSA9IHRoaXMuY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JtQ2FjaGVbaV07XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIGlmIChpID4gMSkge1xuICAgICAgaSArPSAxO1xuICAgIH1cblxuICAgIHZhciByb3cgPSBNYXRoLmZsb29yKGkgLyA1KTtcbiAgICB2YXIgY29sID0gaSAlIDU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoY29sICogZCAtIGQgKiAyLCByb3cgKiBkKTtcbiAgfVxuXG4gIGNvbXB1dGVQb3MoYm9zcywgaSwgYmFzZVBvcykge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmFkZFZlY3RvcnModGhpcy5jb21wdXRlUmVsYXRpdmVQb3NDYWNoZWQoYm9zcywgaSksIGJhc2VQb3MpO1xuICB9XG5cbiAgZ2V0UG9zKGJvc3MsIGZvbGxvd2VyLCBiYXNlUG9zKSB7XG4gICAgaWYgKCFiYXNlUG9zKSB7XG4gICAgICBiYXNlUG9zID0gYm9zcy5wb3M7XG4gICAgfVxuXG4gICAgaWYgKGJvc3MgPT0gZm9sbG93ZXIpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmNvcHkoYmFzZVBvcyk7XG4gICAgfVxuXG4gICAgdmFyIGZvbGxvd2VycyA9IHRoaXMuc29ydChib3NzLmZvbGxvd2Vycyk7XG5cbiAgICB2YXIgaSA9IF8uaW5kZXhPZihmb2xsb3dlcnMsIGZvbGxvd2VyKTtcbiAgICByZXR1cm4gdGhpcy5jb21wdXRlUG9zKGJvc3MsIGksIGJhc2VQb3MpO1xuICB9XG5cbn1cblxuZXhwb3J0IHtCYXNlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0FuZ2xlfSBmcm9tICcuLi9hbmdsZSdcblxudmFyIGxpbmVzID0gWzEwLCAxNCwgMjAsIDQwLCAxMDBdO1xuXG5jbGFzcyBSZXN0IGV4dGVuZHMgQmFzZSB7XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICB2YXIgcm93ID0gbnVsbCwgY2kgPSBpO1xuICAgIHZhciBtYXggPSAwLCBjb3VudDtcbiAgICBfLmZpbmQobGluZXMsIGZ1bmN0aW9uIChsaW5lLCBrKSB7XG4gICAgICBjaSAtPSBsaW5lO1xuICAgICAgbWF4ICs9IGxpbmU7XG4gICAgICBpZiAoY2kgPCAwKSB7XG4gICAgICAgIHJvdyA9IGs7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIC8vIGNvdW50IG9mIHNlZ21lbnRzIGZvciBjdXJyZW50IGNpcmNsZVxuICAgIGNvdW50ID0gbGluZXNbcm93XTtcblxuICAgIC8vIGlmIGN1cnJlbnQgY2lyY2xlIGlzIHRoZSB3aWRlc3QsIHRoZW4gb25seSBzbyBtYW55IHNlZ21lbnRzIGxpa2UgbWVuIGxlZnRcbiAgICBpZiAoYm9zcy5mb2xsb3dlcnMubGVuZ3RoIDwgbWF4KVxuICAgICAgY291bnQgLT0gKG1heCAtIGJvc3MuZm9sbG93ZXJzLmxlbmd0aCk7XG4gICAgdmFyIGFuZ2xlID0gKGkgLyBjb3VudCkgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgcmFkaXVzID0gKHJvdyArIDEpICogMS40O1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihNYXRoLnNpbihhbmdsZSkgKiByYWRpdXMsIE1hdGguY29zKGFuZ2xlKSAqIHJhZGl1cyk7XG4gIH07XG5cbiAgZ2V0RGlyKGJvc3MsIGUpIHtcbiAgICB2YXIgbmV3UG9zID0gdGhpcy5nZXRQb3MoYm9zcywgZSk7XG4gICAgcmV0dXJuIEFuZ2xlLmZyb21WZWN0b3IyKG5ldyBWZWN0b3IyKCkuc3ViVmVjdG9ycyhib3NzLnBvcywgbmV3UG9zKSk7XG4gIH1cblxufVxuXG5leHBvcnQge1Jlc3R9XG4iLCJpbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcblxuY2xhc3MgTnVsbCBleHRlbmRzIEJhc2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoMCwgMCk7XG4gIH1cblxuICBnZXREaXIoYm9zcywgZSkge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmV4cG9ydCB7TnVsbH1cbiIsImltcG9ydCB7QmFzZX0gZnJvbSAnLi9iYXNlJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5jbGFzcyBNb3ZlIGV4dGVuZHMgQmFzZSB7XG5cbiAgY29uc3RydWN0b3IoYW5nbGUpIHtcbiAgICBzdXBlcihhbmdsZSk7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICBpZiAoaSA+PSAyKSB7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgdmFyIHJvdyA9IE1hdGguZmxvb3IoaSAvIDUpO1xuICAgIHZhciBjb2wgPSBpICUgNTtcbiAgICB2YXIgYmxvY2sgPSBNYXRoLmZsb29yKGkgLyAyNSk7XG5cbiAgICB2YXIgeCA9IGNvbCAtIDI7XG4gICAgdmFyIHkgPSByb3cgKyBibG9jaztcblxuICAgIHZhciBhbmdsZSA9IHRoaXMuYW5nbGU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoZCAqIE1hdGguY29zKGFuZ2xlKSAqIHggLSBkICogTWF0aC5zaW4oYW5nbGUpICogeSxcbiAgICAgIGQgKiBNYXRoLnNpbihhbmdsZSkgKiB4ICsgZCAqIE1hdGguY29zKGFuZ2xlKSAqIHkpO1xuICB9O1xuXG4gIGdldERpcihib3NzLCBlKSB7XG4gICAgcmV0dXJuIHRoaXMuYW5nbGU7XG4gIH1cbn1cblxuZXhwb3J0IHtNb3ZlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1Jlc3R9IGZyb20gJy4vcmVzdCdcbmltcG9ydCB7TnVsbH0gZnJvbSAnLi9udWxsJ1xuaW1wb3J0IHtNb3ZlfSBmcm9tICcuL21vdmUnXG5cblxuY29uc3QgRm9ybWF0aW9ucyA9IHtCYXNlLCBNb3ZlLCBOdWxsLCBSZXN0fTtcbmV4cG9ydCB7Rm9ybWF0aW9uc31cbiIsImltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmNsYXNzIE1MUmVzdEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgbGVuZ3RoLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24gJiYgdGhpcy5lbnRpdHkucm90YXRpb24gIT0gdGhpcy5kaXJlY3Rpb24pIHtcbiAgICAgIHRoaXMuZW50aXR5LnJvdGF0aW9uID0gdGhpcy5kaXJlY3Rpb247XG4gICAgICB0aGlzLmVudGl0eS51cGRhdGVNZXNoUG9zKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZW50aXR5Lm1lc2hOYW1lICE9IFwic2l0XCIgJiYgdGhpcy5lbnRpdHkubWVzaE5hbWUgIT0gXCJzaXRkb3duXCIpIHtcbiAgICAgIHRoaXMuZW50aXR5LnBsYXlBbmltYXRpb24oXCJzaXRkb3duXCIpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuZG9uZSkge1xuICAgICAgdGhpcy5lbnRpdHkuc2V0TWVzaChcInNpdFwiKTtcbiAgICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IFJlc3RKb2IodGhpcy5lbnRpdHksIHRoaXMubGVuZ3RoKSk7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG4gIH1cblxufVxuXG5leHBvcnQge01MUmVzdEpvYn07XG4iLCJpbXBvcnQge0hMSm9ifSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBGb3JtYXRpb25zfSBmcm9tIFwiLi4vZm9ybWF0aW9uc1wiO1xuaW1wb3J0IHtNTFJlc3RKb2J9IGZyb20gXCIuLi9tbC9yZXN0XCI7XG5cbmNsYXNzIEhMUmVzdEpvYiBleHRlbmRzIEhMSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBsZW5ndGgsIGZvcm1hdHRlZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgaWYgKGZvcm1hdHRlZClcbiAgICAgIHRoaXMuZm9ybWF0aW9uID0gbmV3IEZvcm1hdGlvbnMuUmVzdCgpO1xuICAgIGVsc2VcbiAgICAgIHRoaXMuZm9ybWF0aW9uID0gbmV3IEZvcm1hdGlvbnMuTnVsbCgpO1xuICB9O1xuXG4gIGFzc2lnbk1lSm9iKGUpIHtcbiAgICBpZiAoIXRoaXMuY29tbW9uU3RhcnQoKSkge1xuICAgICAgZS5yZXNldE5vbkhsSm9icygpO1xuICAgICAgdmFyIG5ld1BvcyA9IHRoaXMuZm9ybWF0aW9uLmdldFBvcyh0aGlzLmVudGl0eSwgZSk7XG4gICAgICBpZiAoZS5wb3MuZGlzdGFuY2VUbyhuZXdQb3MpID4gMC4xKVxuICAgICAgICBlLnB1c2hKb2IobmV3IE1sTW92ZUpvYihlLCBuZXdQb3MpKTtcbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgZGlyID0gdGhpcy5mb3JtYXRpb24uZ2V0RGlyKHRoaXMuZW50aXR5LCBlKTtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBNTFJlc3RKb2IoZSwgNSwgZGlyKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB7SExSZXN0Sm9ifVxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9obC9yZXN0XCI7XG5cbmxldCBib3NzID0ge1xuICBwb3N0TG9hZDogZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKFwiUE9TVExPQURcIik7XG4gICAgaWYgKCF0aGlzLmZvbGxvd2VycylcbiAgICAgIHRoaXMuZm9sbG93ZXJzID0gW107XG4gICAgZWxzZSB7XG4gICAgICAvLyBGSVhNRTogcmV0cmlldmUgb2JqZWN0cyBmcm9tIGlkc1xuICAgIH1cbiAgfSxcbiAgZm9sbG93ZXJzOiBudWxsLFxuICAvLyBkZXByZWNhdGVkXG4gIHB1c2hIbEpvYjogZnVuY3Rpb24gKGpvYikge1xuICAgIHRoaXMucHVzaEpvYihqb2IpO1xuICB9LFxuICAvLyBkZXByZWNhdGVkXG4gIGNsZWFySGxKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0Sm9icygpO1xuICB9LFxuICBvbk5vSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvc3MgPSB0aGlzO1xuICAgIGlmICh0aGlzLmJvc3MpXG4gICAgICBib3NzID0gdGhpcy5ib3NzO1xuICAgIGlmIChib3NzICYmIGJvc3MuYXNzaWduTWVKb2IpXG4gICAgICBib3NzLmFzc2lnbk1lSm9iKHRoaXMpO1xuICB9LFxuICBnZXRIbEpvYjogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmpvYnMpXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy5qb2JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmICh0aGlzLmpvYnNbaV0uYXNzaWduTWVKb2IpXG4gICAgICAgICAgcmV0dXJuIHRoaXMuam9ic1tpXTtcbiAgICAgIH1cbiAgfSxcbiAgYXNzaWduTWVKb2I6IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGhsam9iID0gdGhpcy5nZXRIbEpvYigpO1xuXG4gICAgaWYgKCFobGpvYikge1xuICAgICAgaWYgKHRoaXMuYWkpIHtcbiAgICAgICAgdGhpcy5haSgpO1xuICAgICAgfVxuICAgICAgLy8gdHJ5IGFnYWluXG4gICAgICBobGpvYiA9IHRoaXMuZ2V0SGxKb2IoKTtcbiAgICAgIGlmICghaGxqb2IpIHtcbiAgICAgICAgdGhpcy5wdXNoSGxKb2IobmV3IEhMUmVzdEpvYih0aGlzLCAxMCwgdGhpcy5pc0EoXCJoZXJvXCIpKSk7XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXCJib3NzIC0gTm8gaGxqb2IgY3JlYXRlZCwgcmVzdGluZyBmb3IgMTAgc2Vjb25kc1wiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGxqb2IpIHtcbiAgICAgIGhsam9iLmFzc2lnbk1lSm9iKGUpO1xuICAgIH1cbiAgfSxcbiAgYWRkRm9sbG93ZXI6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzLnB1c2goZm9sbG93ZXIpO1xuICB9LFxuICBkaXNtaXNzOiBmdW5jdGlvbiAoZm9sbG93ZXIpIHtcbiAgICB0aGlzLmZvbGxvd2VycyA9IF8ud2l0aG91dCh0aGlzLmZvbGxvd2VycywgZm9sbG93ZXIpO1xuICAgIGNvbnNvbGUubG9nKFwiZGlzbWlzc2VkXCIsIGZvbGxvd2VyLCB0aGlzLmZvbGxvd2Vycy5sZW5ndGgpO1xuICAgIGRlbGV0ZSBmb2xsb3dlci5ib3NzO1xuICAgIGZvbGxvd2VyLnJlc2V0Sm9icygpO1xuICB9XG59XG5cbmNvbnN0IEJvc3MgPSAoKSA9PiBib3NzO1xuXG5leHBvcnQge0Jvc3N9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgfSxcbiAgXCJjcm9wXCI6IHtcbiAgICBcIm1lc2hOYW1lXCI6IFwidGlueVwiLFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiaGlnaFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfaGlnaFwiXG4gICAgICB9LFxuICAgICAgXCJtZWRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJjcm9wX21lZFwiXG4gICAgICB9LFxuICAgICAgXCJzbWFsbFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3Bfc21hbGxcIlxuICAgICAgfSxcbiAgICAgIFwidGlueVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfdGlueVwiXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1pbGxcIjoge1xuICB9LFxuICBcIm1pbmVcIjoge1xuICB9LFxuICBcImZhcm1cIjoge1xuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwid2F0ZXJcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3YXRlclwiOiAxMDBcbiAgICB9XG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIlxuICAgIF1cbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMSxcbiAgICAgIFwidG9vbFwiOiAxMFxuICAgIH0sXG4gICAgXCJwcm9kdWN0aW9uXCI6IHtcbiAgICAgIFwidG9vbFwiOiB7XG4gICAgICAgIFwid29vZFwiOiAxLFxuICAgICAgICBcInN0b25lXCI6IDFcbiAgICAgIH1cbiAgICB9LFxuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIixcbiAgICAgIFwic21va2VcIlxuICAgIF1cbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJoZXJvXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJwbGF5ZXJcIixcbiAgICBdXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIlxuICAgIF1cbiAgfSxcbiAgXCJtYW5cIjoge1xuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdFwiXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdGRvd25cIlxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJmaWdodFwiXG4gICAgICB9LFxuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJwaWNrXCJcbiAgICAgIH0sXG4gICAgICBcImF4ZVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJheGVcIlxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiZm9sbG93ZXJcIlxuICAgIF1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3b29kXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwid29vZFwiOiA1XG4gICAgfVxuICB9LFxuICBcInRyZWVcIjoge1xuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcInN0b25lXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwic3RvbmVcIjogMjBcbiAgICB9XG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImFuaW1hbFwiXG4gICAgXSxcbiAgICBcInNwZWVkXCI6IDAuNSxcbiAgICBcIm1lc2hlc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEVudGl0eSB9IGZyb20gJy4vZW50aXR5J1xuaW1wb3J0IE1vZGVsTG9hZGVyIGZyb20gJy4uL2Jhc2UzZC9tb2RlbF9sb2FkZXInXG5pbXBvcnQgKiBhcyBNaXhpbiBmcm9tIFwiLi9taXhpblwiXG5pbXBvcnQgRW50aXR5VHlwZXMgZnJvbSAnLi4vY29uZmlnL2VudGl0aWVzJ1xuXG5cbmNsYXNzIFdvcmxkTG9hZGVyIHtcbiAgbG9hZCh3b3JsZCwgZGF0YSwgb3BzKSB7XG4gICAgbGV0IGJhc2ljT3BzID0gT2JqZWN0LmFzc2lnbih7fSwgb3BzKTtcblxuICAgIGlmICghYmFzaWNPcHMubW9kZWxMb2FkZXIpIHtcbiAgICAgIGJhc2ljT3BzLm1vZGVsTG9hZGVyID0gbmV3IE1vZGVsTG9hZGVyKCk7XG4gICAgfVxuICAgIGlmICghYmFzaWNPcHMubWl4aW5EZWZzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk1JWElOIERFRlNcIiwgTWl4aW4pXG4gICAgICBiYXNpY09wcy5taXhpbkRlZnMgPSBNaXhpbjtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5lbnRpdHlUeXBlcykge1xuICAgICAgYmFzaWNPcHMuZW50aXR5VHlwZXMgPSBFbnRpdHlUeXBlcztcbiAgICB9XG5cbiAgICBkYXRhLmZvckVhY2goZW50aXR5RGVmaW5pdGlvbiA9PlxuICAgICAgd29ybGQucHVzaChuZXcgRW50aXR5KHdvcmxkLm1hcCwgT2JqZWN0LmFzc2lnbih7fSwgYmFzaWNPcHMsIGVudGl0eURlZmluaXRpb24pKSlcbiAgICApO1xuICAgIHdvcmxkLmVudGl0aWVzLmZvckVhY2goZW50aXR5ID0+IGVudGl0eS5wb3N0TG9hZCAmJiBlbnRpdHkucG9zdExvYWQoKSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZExvYWRlclxuIiwiaW1wb3J0IFdvcmxkIGZyb20gXCIuLi9nYW1lL3dvcmxkXCI7XG5pbXBvcnQgSGVpZ2h0TWFwIGZyb20gXCIuLi9nYW1lL2hlaWdodG1hcFwiO1xuaW1wb3J0IGFqYXggZnJvbSBcIi4uL2FqYXhcIlxuaW1wb3J0IFdvcmxkTG9hZGVyIGZyb20gXCIuLi9nYW1lL3dvcmxkLWxvYWRlclwiXG5cbmNsYXNzIFdvcmxkRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gICAgY29uc3RydWN0b3Iod29ybGQpIHtcbiAgICAgICAgc3VwZXIoXCJ3b3JsZFwiKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IHdvcmxkXG4gICAgfVxufVxuXG5jbGFzcyBBZ1dvcmxkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLm1hcCA9IG5ldyBIZWlnaHRNYXAoKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IG5ldyBXb3JsZCh0aGlzLm1hcCk7XG5cbiAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwibG9hZFwiKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkV29ybGQodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKS50aGVuKHRoaXMuaW5mb3JtLmJpbmQodGhpcykpXG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudFt0aGlzLmV4cG9zZU5hbWVdID0gdGhpcy53b3JsZDtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgZGVsZXRlIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV1cbiAgICB9XG5cbiAgICBpbmZvcm0oKSB7XG4gICAgICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbChcIipbaW5qZWN0LXdvcmxkXVwiKS5mb3JFYWNoKGUgPT5cbiAgICAgICAgICAgIGUuZGlzcGF0Y2hFdmVudChuZXcgV29ybGRFdmVudCh0aGlzLndvcmxkKSkpXG4gICAgfVxuXG4gICAgbG9hZFdvcmxkKHVybCkge1xuICAgICAgICByZXR1cm4gYWpheCh1cmwpLnRoZW4oZGF0YSA9PlxuICAgICAgICAgICAgbmV3IFdvcmxkTG9hZGVyKCkubG9hZCh0aGlzLndvcmxkLCBkYXRhKVxuICAgICAgICApXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctd29ybGQnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctd29ybGQnLCBBZ1dvcmxkKTtcbn1cblxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9nYW1lL2hsL3Jlc3RcIjtcblxuY2xhc3MgQWdFbnRpdHlWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5pbm5lckhUTUw7XG4gICAgdGhpcy5jaGFuZ2VkKG51bGwpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBpZiAodGhpcy5saXN0ZW5lcikge1xuICAgICAgdGhpcy5saXN0ZW5lci5yZW1vdmUoKVxuICAgIH1cbiAgfVxuXG4gIHdvcmxkQ3JlYXRlZChldikge1xuICAgIHRoaXMud29ybGQgPSBldi53b3JsZDtcbiAgICBjb25zdCBldmVudG5hbWUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImV2ZW50XCIpID09PSBcImhvdmVyZWRcIiA/IFwiaG92ZXJlZFwiIDogXCJzZWxlY3RlZFwiO1xuICAgIHRoaXMuZXZlbnRuYW1lID0gZXZlbnRuYW1lO1xuICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLndvcmxkW2V2ZW50bmFtZV0uc3Vic2NyaWJlKHRoaXMuY2hhbmdlZC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgY2hhbmdlZChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5lbnRpdHkgIT09IGVudGl0eSkge1xuICAgICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICBpZiAodGhpcy5lbnRpdHkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5lbnRpdHkpIHtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9IFwiXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIH1cbiAgfVxuXG4gIHJlZHJhdygpIHtcbiAgICB0aGlzLmlubmVySFRNTCA9IG11c3RhY2hlLnJlbmRlcih0aGlzLnRlbXBsYXRlLCB0aGlzLmVudGl0eSk7XG4gICAgY29uc3QgYnV0dG9uUmVzdCA9IHRoaXMuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImJ1dHRvbi1yZXN0XCIpWzBdO1xuICAgIGlmIChidXR0b25SZXN0KSB7XG4gICAgICBidXR0b25SZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLnJlc3QuYmluZCh0aGlzKSlcbiAgICB9XG4gIH1cblxuICByZXN0KCkge1xuICAgIHRoaXMuZW50aXR5LnJlc2V0Sm9icygpO1xuICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IEhMUmVzdEpvYih0aGlzLmVudGl0eSwgMCwgZmFsc2UpKTtcbiAgICBjb25zb2xlLmxvZyhcIlJFU1RcIilcbiAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctZW50aXR5LXZpZXcnKSkge1xuICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWVudGl0eS12aWV3JywgQWdFbnRpdHlWaWV3KTtcbn1cblxuIl0sIm5hbWVzIjpbImNsb2NrIiwiSm9iIiwiTW92ZSJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxLQUFLLFNBQVMsV0FBVyxDQUFDO0FBQ2hDLElBQUksaUJBQWlCLEdBQUc7QUFDeEIsUUFBUSxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0QsUUFBUSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0FBQzNELFFBQVEsSUFBSSxDQUFDLFVBQVUsR0FBRTtBQUN6QixLQUFLO0FBQ0w7QUFDQSxJQUFJLG1CQUFtQixHQUFHO0FBQzFCLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBQztBQUMzRCxLQUFLO0FBQ0w7QUFDQSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUU7QUFDdEIsUUFBUSxH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SSxDQUFDO0FBQ2xDLEtBQUs7QUFDTDtBQUNBLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQ3hDO0FBQ0EsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDMUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDMUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFD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QUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNsRCxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuRCxRQUFRLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0I7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7QUFDM0IsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUMzQixVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbEIsT0FBTztBQUNQLEtBQUs7QUFDTCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQztBQUNBLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ25ELFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM1QyxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFH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QztBQUM3QjtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDcEIsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1QyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztBQUM5QixJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDckIsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztBQUN6QjtBQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdkQsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztBQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtBQUN0QixNQUFNLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0FBQ2hDO0FBQ0EsSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7QUFDdkIsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUN2QixNQUFNLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQzNCLE1BQU0sSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3BDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJO0FBQ3JDLFFBQVEsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxRQUFRLElBQUksS0FBSyxFQUFFO0FBQ25CLFVBQVUsS0FBSyxHQUFHLEtBQUssRUFBRSxDQUFDO0FBQzFC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

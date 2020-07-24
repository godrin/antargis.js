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
                    setTimeout(dorender, 10);
                } else {
                    setTimeout(function () {
                        requestAnimationFrame(dorender);
                    }, 10);
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
    this.addEventListener("touchstart", this.touchstart.bind(this));
    this.addEventListener("touchend", this.touchend.bind(this));
    this.addEventListener("touchmove", this.touchmove.bind(this));
    this.addEventListener("wheel", this.wheel.bind(this));
    this.addEventListener("click", this.click.bind(this));
    this.addEventListener("world", this.worldCreated.bind(this));
    document.addEventListener("keydown", this.keydown.bind(this));
    document.addEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));

    this.viewCenter = {x: 0, y: 0, z: 10};
    this.touches = {};


    this.moves = 0;
    this.view = new View(this);
    this.updateSize({target: window});

    this.updateCamera();

    this.speed = 4;
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

    // FIXME:move this somewhere else
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
      this.world.tick(delta * this.speed);
    }
  }

  visibilityChange(ev) {
    if (ev.target[this.getVisibilityChangeEvent().hidden]) {
      this.world.pause = true;
      // hidden
    } else {
      this.world.pause = false;
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

  touchstart(e) {
    console.log("touchstart",e);
    const id=0;
    const touch =e.targetTouches[id];
    this.touches[id]={x:touch.clientX, y:touch.clientY};
  }

  touchend(e) {
    console.log("touchend",e);
    delete this.touches[0];
  }

  touchmove(e) {
    console.log("touchmove",e);
    const id=0;
    const touch =e.targetTouches[id];
    const width = this.offsetWidth;
    const height = this.offsetHeight;
    const x = touch.clientX-this.touches[id].x;
    const y = touch.clientY-this.touches[id].y;
    this.touches[id]={x:touch.clientX, y:touch.clientY};
    console.log("XXXX",y,x,width,height,JSON.stringify(this.touches));
  //  this.move({x:x/width, y:y/height})
    this.move({dx: x / width, dy: y / height});
  }

  wheel(e) {
    this.viewCenter.z += e.deltaY * 0.1;
    if (this.viewCenter.z < 5) {
      this.viewCenter.z = 5;
    }
    this.updateCamera();
  }

  click(e) {
    if (!this.world) {
      return;
    }
    this.world.click(this.lastPos);
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
      this.world.select(null);
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
            item(info);
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
    if(v) {
      this.x = v.x;
      this.y = v.y;
    }
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

class MlMove {
  constructor(entity, pos, meshType) {
    this.entity = entity;
    this.mltargetPos = pos;
    if (!meshType) {
      meshType = "walk";
    }
    this.meshType = meshType;
  }

  onFrame(delta) {
    var distance = this.mltargetPos.distanceTo(this.entity.pos);
    if (distance < 0.1) {
      this.ready = true;
    } else {
      this.entity.setMesh("walk");
      this.entity.pushJob(new Move(this.entity, this.mltargetPos));
    }
    return delta;
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
    } else if (this.selectedEntity && this.selectedEntity.pushJob && this.selectedEntity.isA("hero") /*&& this.selectedEntity.player == "human"*/) {

      console.log("assign new move job", lastPos);
      this.selectedEntity.resetJobs();
      this.selectedEntity.pushJob(new MlMove(this.selectedEntity, lastPos, 0));
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

/** a very simplistic ajax-handling method returning a Promise with parsed JSON data. */
function ajax(url, method = "GET", data = {}) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = () => {
            if (request.readyState === XMLHttpRequest.DONE) {

                if (request.status <= 299 && request.status !== 0) {
                    var result = request.response;
                    try {
                        result = JSON.parse(result);
                    } catch (e) {
                      // just ignore
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
      entity.mixins.forEach(mixin => {
        var found = ops.mixinDefs[mixin];
        if (found && found instanceof Function) {
          found = found();
          this.mixins[mixin] = found;
          this.mixinNames.push(mixin);
          Object.assign(this, found);
        } else {
          console.log("Mixin not found", mixin);
        }
      });
    }
    this.changed = new Events();
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

    if (name) {
      this.meshName = name;
    }

    const {meshType, animation} = this.getMeshDef();

    return this.modelLoader.load(meshType, animation).then((mesh) => {
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
    if(!this.resources[what]) {
      this.resources[what]=0;
    }
    this.resources[what] = this.resources[what] + amount;
    this.changed.publish("changed");
  };

  take(what, amount) {
    if (this.resources[what] >= amount) {
      this.resources[what] -= amount;
      this.changed.publish("changed");

      return true;
    }
    return false;
  };

  give(what, amount, toEntity) {
    if (this.resources[what] >= amount) {
      this.resources[what] -= amount;
      console.debug("GIVE TO", toEntity, what);
      toEntity.resources[what] = (toEntity.resources[what] || 0) + amount;
      this.changed.publish("changed");
      toEntity.changed.publish("changed");

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
    const meshObject = await this.loadObj(meshName);

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
    if (this.getCurrentJob().init)
      this.getCurrentJob().init();
  },
	getCurrentJob: function() {
      return this.jobs[this.jobs.length - 1];
	},
  resetNonHlJobs: function () {
    if (this.jobs)
      this.jobs = _.filter(this.jobs, function (job) {
        return job.assignMeJob;
      });
  },
  resetJobs: function () {
    this.jobs = [];
  },
  tick: function (delta) {
    while (this.jobs && delta > 0 && this.jobs.length > 0) {
      var job = this.getCurrentJob();
      if(!(job.onFrame instanceof Function)) {
        console.error("Job.onFrame is not a function for",job);
        return;
      }
      delta = job.onFrame(delta);
      if (job.ready) {
        console.error("JOB IS READY", job, job.mode, this.jobs, this.jobs.length);
        if (job.assignMeJob) {
          console.log("JOB READY!!!", this.jobs);
        }
        this.jobs.pop();
				console.log("JOBS", this.jobs);
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
    if (formatted) {
      this.formation = new Formations.Rest();
    } else {
      this.formation = new Formations.Null();
    }
  }

  assignMeJob(e) {
    if (!this.commonStart()) {
      e.resetNonHlJobs();
      var newPos = this.formation.getPos(this.entity, e);
      if (e.pos.distanceTo(newPos) > 0.1) {
        e.pushJob(new MlMoveJob(e, newPos));
      } else {
        var dir = this.formation.getDir(this.entity, e);
        e.pushJob(new MLRestJob(e, 5, dir));
      }
    }
  }
}

let boss = {
  // initializer
  postLoad: function () {
    if (!this.followers) {
      // each entity should have it's array
      this.followers = [];
    }
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
    if (boss && boss.assignMeJob instanceof Function)
      boss.assignMeJob(this);
  },
  getHlJob: function () {
    if (this.jobs)
      // take last job which provides the assignMeJob function
      for (var i = this.jobs.length - 1; i >= 0; i--) {
        if (this.jobs[i].assignMeJob instanceof Function)
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
    this.followers = this.followers.filter((current) => current !== follower);
    delete follower.boss;
    follower.resetJobs();
  }
};

const Boss = () => boss;

class StateMachineException extends Error {
  constructor(message) {
    super(message);
  }
}

class StateMachine {
  constructor(startState) {
    this.mode = startState;
    this.ready = false;
  }

  setFinished() {
    this.ready = true;
  }

  onFrame(delta) {
    let done = false;
    do {
      if (!(this[this.mode] instanceof Function)) {
        throw new StateMachineException("MODE " + this.mode + " not found for class "+typeof(this));
      }
      done = this[this.mode](delta);
      console.log("DONE", done, this.mode, this);
    } while (!done && !this.ready);
    return 0; // always eat up the delta
  }
}

class MlInvent extends StateMachine {
  constructor(entity, resource, homeEntity) {
    super("comeHome");
    console.debug("invent - ml ", arguments);
    this.entity = entity;
    this.homeEntity = homeEntity;
    this.resource = resource;
  }

  comeHome() {
    this.entity.pushJob(this.createMoveJob());
    this.mode = "produce";
    return true;
  }

  produce() {
    var self = this;
    var rule = this.homeEntity.production[this.resource];
    var ok = true;
    _.each(rule, function (amount, sourceResource) {
      if (!self.homeEntity.take(sourceResource, amount))
        ok = false;
    });
    if (ok) {
      this.entity.pushJob(this.createRestJob());
      if (this.homeEntity.incSmoke) {
        this.homeEntity.incSmoke();
      }
      this.mode = "productionFinished";
      console.log("productionFinished set mode return true");
      return true;
    } else {
      console.log("productionFinished resources lost");
      // source resources got lost :-(
      this.setFinished();
    }
		return true;
  }

  productionFinished() {
    console.debug("invent - productionFinished", this.resource, 1);
    this.homeEntity.increaseBy(this.resource, 1);
    if (this.homeEntity.decSmoke) {
      this.homeEntity.decSmoke();
    }
    this.setFinished();
		console.log("MlInvent should be ready");
    this.mode = "wrong";
    return true;
  }

  createRestJob() {
    return new RestJob(this.entity, 3);
  }

  createMoveJob() {
    return new MlMove(this.entity, this.homeEntity.pos);
  }
}

class HlInventJob {
  constructor(entity) {
    this.entity = entity;
    this.producable = HlInventJob.applyable;
  }

  static applyable(e, needed) {
    let producable = _.filter(needed, function (resource) {
      if (e.production) {
        var ok = true;
        var prereq = e.production[resource];
        if (!prereq) {
          return false;
        }
        _.each(prereq, function (amount, res) {

          if (!e.resources[res] || e.resources[res] < amount) {
            ok = false;
          }
        });
        if (ok)
          return true;
      }
    });
    if (producable.length > 0) {
      return _.sample(producable);
    }
    return false;
  }

  assignMeJob(e) {
    console.log("assign me job ",e, this);
    var res = this.producable(this.entity, this.entity.resourcesNeeded());
    if (res) {
      e.pushJob(new MlInvent(e, res, this.entity));
    } else {
      this.entity.clearHlJob();
    }
  }
}

class MlFetchJob {
   constructor(entity, resource, targetEntity, homeEntity) {
      this.entity = entity;
      this.homeEntity = homeEntity;
      this.resource = resource;
      this.amount = 1;
      this.targetEntity = targetEntity;
      this.mltargetPos = this.targetEntity.pos;
      console.debug("fromPos",entity.pos);
      this.fromPos = new THREE.Vector2().copy(entity.pos);
      console.debug("fromPos",entity.pos,this.fromPos);
      this.mode="gotoTarget";
      this.collectDistance=1;
    }

    gotoTarget() {
      var distance = this.mltargetPos.distanceTo(this.entity.pos);
      if(distance<=this.collectDistance+0.1) {
        this.mode="collectThings";
        return false;
      } else {
        this.entity.setMesh("walk");
        this.entity.pushJob(new Move(this.entity,this.mltargetPos,this.collectDistance));
        return true;
      }
    }

    collectThings() {
      // FIXME: select pick or axe or nothing depending on resource
      this.entity.setMesh("axe");
      this.entity.pushJob(new RestJob(this.entity,3)); //newLlJob("rest",3);
      this.mode="goBack";
      return true;
    }

    take() {
      this.targetEntity.give(this.resource,this.amount,this.entity);
    }

    goBack() {
      this.take();
      //FIXME: pick correct mesh
      this.entity.setMesh("walk");
      //this.entity.newLlJob("move",this.fromPos);
      this.entity.pushJob(new Move(this.entity,this.homeEntity.pos));
      this.mode="give";
      return true;
    }

    give() {
      this.ready=true;
      if(this.homeEntity)
        this.entity.give(this.resource,this.amount,this.homeEntity);
    }

    onFrame(delta) {
      var done=false;
      do {
      if(!this[this.mode])
      console.debug("MODE ",this.mode, "not found");
        done=this[this.mode]();
      } while(!done && !this.ready);
      return delta;
    }
  }

class HlFetchJob extends HLJob {
  constructor(entity, count) {
    super();
    this.entity = entity;
    this.count = count || 3;
  };

  selectResourceToGet() {
    var needed = _.shuffle(this.entity.resourcesNeeded());
    return needed[0];
  }

  nextEntityForResource(selectedResource) {
    var self = this;
    return this.entity.world.search(function (e) {
      return e.resources && e.resources[selectedResource] > 0 && e != self.entity && e.provides && _.includes(e.provides, selectedResource);
    }, this.entity.pos)[0];
  };

  assignMeJob(e) {
    if (!e.isA("follower")) {
      e.pushJob(new RestJob(e, 10));
      return;
    }

    this.count -= 1;
    var selectedResource = this.selectResourceToGet();
    if (selectedResource) {
      var nextEntity = this.nextEntityForResource(selectedResource);
      if (nextEntity) {
        e.pushJob(new MlFetchJob(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
        console.error("fetch - NO nextentity found for ", selectedResource);
      }
    }
    e.pushJob(new MLRestJob(e, 1, 0));
    if (this.count <= 0) {
      this.entity.clearHlJob();
    }
  };
}

let house = {
  // FIXME: maybe move this to other mixin/class - may be used by hero too
  resourcesNeeded: function () {
    if (!this.needed)
      return [];
    var currentlyNeeded = [];
    console.log("NEDDED", this.needed);
    for (var k in this.needed) {
      var v = this.needed[k];
      var times = v - (this.resources[k] || 0);
      if (times > 0) {
        for (var i = 0; i < times; i++) {
          currentlyNeeded.push(k);
        }
      }
    }
    return currentlyNeeded;
  },

  ai: function () {
    var needed = this.resourcesNeeded();

    if (needed.length > 0) {
      if (this.inventApplyable(needed)) {
        this.pushHlJob(this.createInventJob());
      } else {
        this.pushHlJob(this.createFetchJob());
      }
    }
  },
  inventApplyable: function(needed) {
    return HlInventJob.applyable(this, needed);
  },
  createInventJob: function () {
    return new HlInventJob(this);
  },
  createFetchJob: function () {
    return new HlFetchJob(this);
  },
  addFollower: function (follower) {
    this.followers.push(follower);
  }
};

let House = () => house;

var Mixin = /*#__PURE__*/Object.freeze({
__proto__: null,
animal: Animal,
job: Job$1,
follower: Follower,
boss: Boss,
house: House
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
	static presentEntity(entity) {
		return {
			typeName: entity.typeName,
			pos: {
				x: entity.pos.x,
				y: entity.pos.y
			},
			resources: AgEntityView.presentResources(entity.resources)
		};
	}

	static presentResources(resources) {
		const result = [];
		for (var key in resources) {
			result.push({name: key, value: resources[key]});
		}
		return result;
	}

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
		if (this.redrawer) {
			this.redrawer.remove();
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
			this.stopListening(this.entity);

			this.entity = entity;
			if (this.entity) {
				this.redraw();
			}
			this.startListening(this.entity);
		}
		if (this.entity) {
			this.style.display = "";
		} else {
			this.style.display = "none";
		}
	}

	redraw() {
		this.innerHTML = mustache.render(this.template, AgEntityView.presentEntity(this.entity));
		const buttonRest = this.getElementsByClassName("button-rest")[0];
		if (buttonRest) {
			buttonRest.addEventListener("click", this.rest.bind(this));
		}
		this.classList.remove("templated");
	}

	rest() {
		this.entity.resetJobs();
		this.entity.pushJob(new HLRestJob(this.entity, 0, false));
		console.log("REST");
	}

	startListening(entity) {
		console.log("START", entity);
		if(entity) {
			this.redrawer = entity.changed.subscribe( this.redraw.bind(this));
		}
	}

	stopListening(entity) {
		if(this.redrawer) {
			this.redrawer.remove();
			this.redrawer = null;
		}
	}
}

if (!customElements.get('ag-entity-view')) {
	customElements.define('ag-entity-view', AgEntityView);
}

class AgFullscreen extends HTMLElement {
  connectedCallback() {
    this.addEventListener("click",this.enableFullscreen.bind(this));
  }

  enableFullscreen() {
    let element = document.querySelector("body");
    if(element.requestFullscreen) {
      element.requestFullscreen();
    } else if(element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if(element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }
}

if (!customElements.get('ag-fullscreen')) {
  customElements.define('ag-fullscreen', AgFullscreen);
}

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvbGwvam9iLmpzIiwic3JjL2dhbWUvdmVjdG9yMi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL21sL21vdmUuanMiLCJzcmMvZ2FtZS93b3JsZC5qcyIsInNyYy9nYW1lL2hlaWdodG1hcC5qcyIsInNyYy9hamF4LmpzIiwic3JjL2dhbWUvZW50aXR5LmpzIiwic3JjL2NvbmZpZy9tZXNoZXMuanMiLCJzcmMvYmFzZTNkL21vZGVsLmpzIiwic3JjL2Jhc2UzZC9tb2RlbF9sb2FkZXIuanMiLCJzcmMvZ2FtZS9taXhpbnMvYW5pbWFsLmpzIiwic3JjL2dhbWUvbGwvcmVzdC5qcyIsInNyYy9nYW1lL21peGlucy9qb2IuanMiLCJzcmMvZ2FtZS9taXhpbnMvZm9sbG93ZXIuanMiLCJzcmMvZ2FtZS9obC9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9yZXN0LmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9udWxsLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9tb3ZlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9pbmRleC5qcyIsInNyYy9nYW1lL21sL3Jlc3QuanMiLCJzcmMvZ2FtZS9obC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2Jvc3MuanMiLCJzcmMvZ2FtZS9tbC9zdGF0ZS1tYWNoaW5lLmpzIiwic3JjL2dhbWUvbWwvaW52ZW50LmpzIiwic3JjL2dhbWUvaGwvaW52ZW50LmpzIiwic3JjL2dhbWUvbWwvZmV0Y2guanMiLCJzcmMvZ2FtZS9obC9mZXRjaC5qcyIsInNyYy9nYW1lL21peGlucy9ob3VzZS5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS93b3JsZC1sb2FkZXIuanMiLCJzcmMvZWxlbWVudHMvYWctd29ybGQuanMiLCJzcmMvZWxlbWVudHMvYWctZW50aXR5LXZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZnVsbHNjcmVlbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBJbnRybyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9IC0xO1xuICAgICAgICB0aGlzLnNjcmVlbnMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnRyby1zY3JlZW5cIik7XG4gICAgICAgIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIgPSB0aGlzLm5leHRTY3JlZW4uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm5leHRTY3JlZW4oKVxuICAgIH1cblxuICAgIGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMudW5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgIH1cblxuICAgIGJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVuYmluZEV2ZW50KHNjcmVlbikge1xuICAgICAgICBpZihzY3JlZW4pIHtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKTtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV4dFNjcmVlbihldikge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgaWYodGhpcy5jdXJyZW50X3NjcmVlbiA9PSB0aGlzLnNjcmVlbnMubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2ZpbmlzaGVkJykpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5nZXRBdHRyaWJ1dGUoJ29uZmluaXNoZWQnKSlcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIixlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1cnJlbnRfc2NyZWVuID0gKHRoaXMuY3VycmVudF9zY3JlZW4gKyAxKSAlIHRoaXMuc2NyZWVucy5sZW5ndGg7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KClcbiAgICB9XG5cbiAgICBzZXRWaXNpYmlsaXR5KCkge1xuICAgICAgICB0aGlzLnNjcmVlbnMuZm9yRWFjaCgoc2NyZWVuLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfc2NyZWVuID09IGlkeCkge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctaW50cm8nKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctaW50cm8nLCBJbnRybyk7XG59XG4iLCJjbGFzcyBDcmVkaXRzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMuZmluaXNoZWQuYmluZCh0aGlzKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwiLmNyZWRpdHNcIilcbiAgICAgICAgY29uc29sZS5sb2coXCJCSU5ELi4uXCIpXG5cbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpXG4gICAgfVxuXG5cbiAgICBmaW5pc2hlZChldikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZJTklTSEVEXCIpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1jcmVkaXRzJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWNyZWRpdHMnLCBDcmVkaXRzKTtcbn1cbiIsImNsYXNzIFRleHR1cmVMb2FkZXIge1xuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCFUZXh0dXJlTG9hZGVyLmluc3RhbmNlKSB7XG4gICAgICAgICAgICBUZXh0dXJlTG9hZGVyLmluc3RhbmNlID0gbmV3IFRleHR1cmVMb2FkZXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGV4dHVyZUxvYWRlci5pbnN0YW5jZTtcbiAgICB9XG5cbiAgICBnZXRUZXh0dXJlcyh1cmxzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh1cmxzLm1hcCh1cmw9PnRoaXMuZ2V0VGV4dHVyZSh1cmwpKSk7XG4gICAgfVxuXG4gICAgZ2V0VGV4dHVyZSh1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUodXJsLCBudWxsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGV4dHVyZUxvYWRlcjsiLCJpbXBvcnQgVGV4dHVyZUxvYWRlciBmcm9tIFwiLi4vYmFzZTNkL3RleHR1cmVfbG9hZGVyXCI7XG5cbmNvbnN0IFRlcnJhaW4gPSBUSFJFRS5UZXJyYWluO1xuXG5jbGFzcyBUZXJyYWluQnVpbGRlciB7XG5cbiAgICBzdGF0aWMgY3JlYXRlVGVycmFpbihvcHRpb25zLCBzY2VuZSwgbWF0ZXJpYWwsIGhlaWdodG1hcCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe3dpZHRoOiA2NCwgaGVpZ2h0OiA2NH0sIG9wdGlvbnMpO1xuICAgICAgICB2YXIgeFMgPSBvcHRpb25zLndpZHRoIC0gMSwgeVMgPSBvcHRpb25zLmhlaWdodCAtIDE7XG5cbiAgICAgICAgaWYgKCFoZWlnaHRtYXApXG4gICAgICAgICAgICBoZWlnaHRtYXAgPSBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT1BUSU9OU1wiLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgICAgICAgICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB4bDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCB5bDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnW2ogKiB4bCArIGldLnogKz0gTWF0aC5yYW5kb20oKSAqIDEwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBkb2luZyB3aXJlZnJhbWUgdGVycmFpblxuICAgICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICAgICAgICAgIGNvbG9yOiAweGZmMDAwMCxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vbWF0ZXJpYWwgPSBudWxsO1xuICAgICAgICBsZXQgdGVycmFpblNjZW5lID0gVGVycmFpbih7XG4gICAgICAgICAgICBlYXNpbmc6IFRlcnJhaW4uTGluZWFyLFxuICAgICAgICAgICAgZnJlcXVlbmN5OiAyLjUsXG4gICAgICAgICAgICBoZWlnaHRtYXA6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIC8vYWZ0ZXI6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIG1hdGVyaWFsOiBtYXRlcmlhbCB8fCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDU1NjZhYX0pLFxuLy8gICAgICAgICAgbWF4SGVpZ2h0OiAxMDAsXG4vLyAgICAgICAgICBtaW5IZWlnaHQ6IC0xMDAsXG4vL21pbkhlaWdodDowLC8vdW5kZWZpbmVkLFxuLy9tYXhIZWlnaHQ6MTAsIC8vdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RlcHM6IDEsXG4gICAgICAgICAgICB1c2VCdWZmZXJHZW9tZXRyeTogZmFsc2UsXG4gICAgICAgICAgICB4U2VnbWVudHM6IHhTLFxuICAgICAgICAgICAgeFNpemU6IG9wdGlvbnMud2lkdGgsXG4gICAgICAgICAgICB5U2VnbWVudHM6IHlTLFxuICAgICAgICAgICAgeVNpemU6IG9wdGlvbnMuaGVpZ2h0LFxuICAgICAgICAgICAgc3RyZXRjaDogZmFsc2UsXG4gICAgICAgICAgICBjbGFtcDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5yb3RhdGlvbi54ID0gMDtcbiAgICAgICAgdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLnJvdGF0aW9uLnggPSAtTWF0aC5QSS8yO1xuICAgICAgICAvL3RlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5yb3RhdGlvbi55ID0gTWF0aC5QSS84O1xuICAgICAgICB0ZXJyYWluU2NlbmUucG9zaXRpb24ueCArPSBvcHRpb25zLndpZHRoIC8gMjtcbiAgICAgICAgdGVycmFpblNjZW5lLnBvc2l0aW9uLnogLT0gb3B0aW9ucy53aWR0aCAvIDI7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJUU1wiLCB0ZXJyYWluU2NlbmUpO1xuICAgICAgICAvLyBBc3N1bWluZyB5b3UgYWxyZWFkeSBoYXZlIHlvdXIgZ2xvYmFsIHNjZW5lXG4gICAgICAgIHNjZW5lLmFkZCh0ZXJyYWluU2NlbmUpO1xuICAgICAgICB0aGlzLmdlbyA9IHRlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5nZW9tZXRyeTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYXN5bmMgY3JlYXRlKG9wdGlvbnMsIHNjZW5lLCBoZWlnaHRtYXApIHtcbiAgICAgICAgVGV4dHVyZUxvYWRlci5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFsnbW9kZWxzL3NhbmQxLmpwZycsICdtb2RlbHMvZ3Jhc3MxLmpwZycsICdtb2RlbHMvc3RvbmUxLmpwZycsICdtb2RlbHMvc25vdzEuanBnJ10pXG4gICAgICAgICAgICAudGhlbigodGV4dHVyZXMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBibGVuZCA9IFRlcnJhaW5CdWlsZGVyLmdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIC4uLnRleHR1cmVzKVxuICAgICAgICAgICAgICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIGJsZW5kLCBoZWlnaHRtYXApO1xuICAgICAgICAgICAgfSlcbiAgICB9XG4gICAgc3RhdGljIGdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIHQxLHQyLHQzLHQ0KSB7XG4gICAgICAgIHJldHVybiBUZXJyYWluLmdlbmVyYXRlQmxlbmRlZE1hdGVyaWFsKFtcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MX0sXG4gICAgICAgICAgICB7dGV4dHVyZTogdDIsIGxldmVsczogWy04MCwgLTM1LCAyMCwgNTBdfSxcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MywgbGV2ZWxzOiBbMjAsIDUwLCA2MCwgODVdfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlOiB0NCxcbiAgICAgICAgICAgICAgICBnbHNsOiAnMS4wIC0gc21vb3Roc3RlcCg2NS4wICsgc21vb3Roc3RlcCgtMjU2LjAsIDI1Ni4wLCB2UG9zaXRpb24ueCkgKiAxMC4wLCA4MC4wLCB2UG9zaXRpb24ueiknXG4gICAgICAgICAgICB9LFxuICAgICAgICBdLCBzY2VuZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUZXJyYWluQnVpbGRlciIsIi8vdmFyIHByb2plY3RvciA9IG5ldyBUSFJFRS5Qcm9qZWN0b3IoKTtcbnZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cbnZhciBQaWNrID0ge1xuICAgIC8qXG4gICAgKiBtb3VzZT17eDoxMix5OjEyfVxuICAgICogKi9cbiAgICBwaWNrOiBmdW5jdGlvbiAobW91c2UsIGNhbWVyYSwgc2NlbmUpIHtcbiAgICAgICAgLy8gZmluZCBpbnRlcnNlY3Rpb25zXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGNyZWF0ZSBhIFJheSB3aXRoIG9yaWdpbiBhdCB0aGUgbW91c2UgcG9zaXRpb25cbiAgICAgICAgLy8gICBhbmQgZGlyZWN0aW9uIGludG8gdGhlIHNjZW5lIChjYW1lcmEgZGlyZWN0aW9uKVxuICAgICAgICAvL1xuICAgICAgICB2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAgICAgdmVjLnggPSBtb3VzZS5yeDtcbiAgICAgICAgdmVjLnkgPSBtb3VzZS5yeTtcbiAgICAgICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodmVjLCBjYW1lcmEpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhbiBhcnJheSBjb250YWluaW5nIGFsbCBvYmplY3RzIGluIHRoZSBzY2VuZSB3aXRoIHdoaWNoIHRoZSByYXkgaW50ZXJzZWN0c1xuICAgICAgICAvLyBpbnRlcnNlY3QgcmVjdXJzaXZlICEhIVxuICAgICAgICB2YXIgcmVzdWx0ID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMoc2NlbmUuY2hpbGRyZW4sIHRydWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgUGljazsiLCJcbmZ1bmN0aW9uIGFkZFNreWJveChzY2VuZSkge1xuICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9za3kxLmpwZycsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHQxKSB7XG4gICAgICAgIGNvbnN0IHNreURvbWUgPSBuZXcgVEhSRUUuTWVzaChcbiAgICAgICAgICAgIG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSg0MDk2LCA2NCwgNjQpLFxuICAgICAgICAgICAgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IHQxLCBzaWRlOiBUSFJFRS5CYWNrU2lkZSwgZm9nOiBmYWxzZX0pXG4gICAgICAgICk7XG4gICAgICAgIHNjZW5lLmFkZChza3lEb21lKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFkZFNreWJveDsiLCJpbXBvcnQgYWRkU2t5Ym94IGZyb20gXCIuL3NreWJveFwiO1xuXG5mdW5jdGlvbiBnZXRSYW5kb21OdW1iZXIoIGJhc2UgKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiBiYXNlIC0gKGJhc2UvMik7XG59XG5mdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcbiAgICB2YXIgYyA9IG5ldyBUSFJFRS5Db2xvcigpO1xuICAgIGMuc2V0UkdCKCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpICk7XG4gICAgcmV0dXJuIGM7XG59XG5jbGFzcyBBbnRTY2VuZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vIGh0dHA6Ly9zcXVhcmVmZWV0LmdpdGh1Yi5pby9TaGFkZXJQYXJ0aWNsZUVuZ2luZS9cbiAgICAgICAgdGhpcy5lbWl0dGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogbmV3IFRIUkVFLlZlY3RvcjMoLTEsIDEsIDEpLFxuICAgICAgICAgICAgcG9zaXRpb25TcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApLFxuXG4gICAgICAgICAgICBhY2NlbGVyYXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0wLjEsIDApLFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjAxLCAwLjAxLCAwLjAxKSxcblxuICAgICAgICAgICAgdmVsb2NpdHk6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuNywgMCksXG4gICAgICAgICAgICB2ZWxvY2l0eVNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4zLCAwLjUsIDAuMiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnQ6IG5ldyBUSFJFRS5Db2xvcigweEJCQkJCQiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnRTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMiwgMC4xLCAwLjEpLFxuICAgICAgICAgICAgY29sb3JFbmQ6IG5ldyBUSFJFRS5Db2xvcigweEFBQUFBQSksXG5cbiAgICAgICAgICAgIHNpemVTdGFydDogMC41LFxuICAgICAgICAgICAgc2l6ZUVuZDogNCxcbiAgICAgICAgICAgIG9wYWNpdHlTdGFydDogMSxcbiAgICAgICAgICAgIG9wYWNpdHlFbmQ6IDAuMSxcblxuICAgICAgICAgICAgLy9wYXJ0aWNsZUNvdW50OiAyMDAwLFxuICAgICAgICAgICAgcGFydGljbGVzUGVyU2Vjb25kOiAxMDAsXG4gICAgICAgICAgICBhbGl2ZTogMVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZW1pdHRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgbWF4QWdlOiA1LFxuICAgICAgICAgICAgLy90eXBlOiBNYXRoLnJhbmRvbSgpICogNCB8IDAsXG4gICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMygtMSwwLDApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKDAsXG4gICAgICAgICAgICAgICAgICAgIC0wLjIsXG4gICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIHNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMCwwLjEsMClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2ZWxvY2l0eToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgMS40LFxuICAgICAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLjcsMC4zKVxuICAgICAgICAgICAgfSxcbi8qXG4gICAgICAgICAgICByb3RhdGlvbjoge1xuICAgICAgICAgICAgICAgIGF4aXM6IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSksXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBhbmdsZTpcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKSAqIE1hdGguUEksXG4gICAgICAgICAgICAgICAgY2VudGVyOlxuICAgICAgICAgICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICB9LFxuXG5cbiAgICAgICAgICAgIHdpZ2dsZToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnJhbmRvbSgpICogMjBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucmFuZG9tKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29sb3I6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogW25ldyBUSFJFRS5Db2xvcigweDMzMzMzMyksbmV3IFRIUkVFLkNvbG9yKDB4Nzc3Nzc3KSxuZXcgVEhSRUUuQ29sb3IoMHg4ODg4ODgpXSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLDApXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzaXplOiB7XG5cbiAgICAgICAgICAgICAgICB2YWx1ZTogWzAuNSwgMC43LCAxXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhcnRpY2xlQ291bnQ6IDEwMCxcbiAgICAgICAgICAgIG9wYWNpdHk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogWzEsIDAuOCwgMC4wXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlcHRoVGVzdDogdHJ1ZSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwID0gQW50U2NlbmUubWFrZVNQRUdyb3VwKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLmFkZFBvb2woMTAsIHRoaXMuZW1pdHRlclNldHRpbmdzLCB0cnVlKTtcblxuICAgICAgICB2YXIgZW1pdHRlciA9IHRoaXMucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpXG4gICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSBuZXcgVEhSRUUuVmVjdG9yMygtMiwwLDApXG4gICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG4gICAgICAgIGVtaXR0ZXIgPSB0aGlzLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKVxuICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gbmV3IFRIUkVFLlZlY3RvcjMoLTQsMCwwKVxuICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuXG4gICAgICAgIC8vdGhpcy5zY2VuZS5iYWNrZ3JvdW5kLmFkZChuZXcgQ29sb3IoXCJyZWRcIikpXG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRoaXMucGFydGljbGVHcm91cC5tZXNoKTtcbiAgICAgICAgdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwID0gdGhpcy5wYXJ0aWNsZUdyb3VwO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBBUlRJQ0xFXCIsIHRoaXMucGFydGljbGVHcm91cCk7XG5cblxuICAgICAgICAvLyBzb2Z0IHdoaXRlIGxpZ2h0XG4gICAgICAgIHZhciBsaWdodCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgzMDIwMjApO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodCk7XG5cbiAgICAgICAgLy8gV2hpdGUgZGlyZWN0aW9uYWwgbGlnaHQgYXQgaGFsZiBpbnRlbnNpdHkgc2hpbmluZyBmcm9tIHRoZSB0b3AuXG4gICAgICAgIHZhciBkaXJlY3Rpb25hbExpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZmYsIDAuNyk7XG4gICAgICAgIGRpcmVjdGlvbmFsTGlnaHQucG9zaXRpb24uc2V0KDEsIDAuNywgMC43KTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoZGlyZWN0aW9uYWxMaWdodCk7XG5cbiAgICAgICAgYWRkU2t5Ym94KHRoaXMuc2NlbmUpO1xuXG5cbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDAsIDApO1xuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgMCwgNCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCA0LCAwKTtcblxuICAgICAgICB0aGlzLm1lc2hlcyA9IHt9O1xuICAgICAgICB0aGlzLmVudGl0aWVzID0gW11cbiAgICB9XG5cbiAgICBzdGF0aWMgbWFrZVNQRUdyb3VwKCkge1xuICAgICAgICByZXR1cm4gbmV3IFNQRS5Hcm91cCh7XG4gICAgICAgICAgICB0ZXh0dXJlOiB7IHZhbHVlOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCcuL2ltYWdlcy9zbW9rZXBhcnRpY2xlLnBuZycpIH0sXG4gICAgICAgICAgICAvL21heEFnZTogNCxcbiAgICAgICAgICAgIC8vYmxlbmRpbmc6IFRIUkVFLk5vcm1hbEJsZW5kaW5nXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgY3JlYXRlQ3ViZShzY2VuZSwgeCwgeSkge1xuICAgICAgICB2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoKTtcbiAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgwMGZmMDB9KTtcbiAgICAgICAgdmFyIGN1YmUgPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICAgICAgICBjdWJlLnBvc2l0aW9uLnggKz0geDtcbiAgICAgICAgY3ViZS5wb3NpdGlvbi56ICs9IHk7XG4gICAgICAgIHNjZW5lLmFkZChjdWJlKTtcbiAgICB9XG5cbiAgICB0aWNrKGRlbHRhKSB7XG4gICAgICAgIGlmIChkZWx0YSkge1xuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLnRpY2soZGVsdGEpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGQobm9kZSkge1xuICAgICAgICAvLyAgICB0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUREXCIsIG5vZGUpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChub2RlKVxuICAgIH1cblxuICAgIHJlbW92ZShub2RlKSB7XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlKG5vZGUpXG4gICAgfVxuXG4gICAgbWFrZUVtaXR0ZXIocG9zKSB7XG4gICAgICAgIHJldHVybiBuZXcgU1BFLkVtaXR0ZXIodGhpcy5lbWl0dGVyU2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFudFNjZW5lIiwiY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgQmFzZSB7XG4gICAgY29uc3RydWN0b3IoZWwpIHtcblxuXG5cbiAgICB9XG5cblxuXG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZTtcbiIsImltcG9ydCBCYXNlIGZyb20gXCIuL2Jhc2VcIjtcblxuY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgVmlldyAge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRUxcIiwgZWwsIHRoaXMpXG4gICAgICAgIHRoaXMuZWwgPSBlbFxuICAgICAgICB0aGlzLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcblxuICAgICAgICAvLyBmaXhtZTogdXNlIGVsIHNpemVcbiAgICAgICAgY29uc3Qgd2lkdGggPSBlbC5vZmZzZXRXaWR0aFxuICAgICAgICBjb25zdCBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHRcblxuICAgICAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNjAsIHdpZHRoIC8gaGVpZ2h0LCAxLCAxMDAwMCk7XG4gICAgICAgIHRoaXMuc2V0U2l6ZSgpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEucm90YXRpb24ueCA9IC0oMTAgKyAzMikgKiBNYXRoLlBJIC8gMTgwO1xuICAgICAgICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNpemUoKSB7XG4gICAgICAgIHRoaXMuY2FtZXJhLmFzcGVjdCA9IHRoaXMuZWwub2Zmc2V0V2lkdGggLyB0aGlzLmVsLm9mZnNldEhlaWdodDtcbiAgICAgICAgdGhpcy5jYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U2l6ZSh0aGlzLmVsLm9mZnNldFdpZHRoLCB0aGlzLmVsLm9mZnNldEhlaWdodCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKHNjZW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUkVOREVSXCIsIHNjZW5lLCBvcHRpb25zKVxuXG4gICAgICAgIHZhciBkb3JlbmRlcj0gKCk9PiB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoaXMgcmVuZGVyaW5nIC0gYmVjYXVzZSB0aGUgc2NvcGUgLyBjYW52YXMgaXMgZGVzdHJveWVkXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9yZW5kZXIsIDEwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZURpZmYgPSB0aW1lIC0gbGFzdFRpbWU7XG4gICAgICAgICAgICBsYXN0VGltZSA9IHRpbWU7XG5cbiAgICAgICAgICAgIHZhciBkZWx0YTtcbiAgICAgICAgICAgIHZhciB1c2UzanNUaW1lID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmICh1c2UzanNUaW1lKVxuICAgICAgICAgICAgICAgIGRlbHRhID0gY2xvY2suZ2V0RGVsdGEoKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBkZWx0YSA9IHRpbWVEaWZmICogMC4wMDE7XG5cbiAgICAgICAgICAgIGlmIChkZWx0YSA+IDAuMSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IDAuMTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZnJhbWVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyYW1lQ2FsbGJhY2soZGVsdGEpO1xuXG4gICAgICAgICAgICBzY2VuZS50aWNrKGRlbHRhKVxuICAgICAgICAgICAgLy8gYW5pbWF0ZSBDb2xsYWRhIG1vZGVsXG5cbiAgICAgICAgICAgIC8vVEhSRUUuQW5pbWF0aW9uTWl4ZXIudXBkYXRlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHNjZW5lLnNjZW5lLCB0aGlzLmNhbWVyYSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvcmVuZGVyKTtcbiAgICB9XG5cbiAgICB1cGRhdGVDYW1lcmEodmlld0NlbnRlciwgaCkge1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi54ID0gdmlld0NlbnRlci54O1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gdmlld0NlbnRlci56ICsgaDtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IC0gdmlld0NlbnRlci55ICsgdmlld0NlbnRlci56O1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlldztcbiIsImltcG9ydCBUZXJyYWluQnVpbGRlciBmcm9tIFwiLi4vbGlicy90ZXJyYWluX2J1aWxkZXJcIjtcbmltcG9ydCBQaWNrIGZyb20gJy4uL2Jhc2UzZC9waWNrJ1xuaW1wb3J0IEFudFNjZW5lIGZyb20gXCIuLi9iYXNlM2QvYW50LXNjZW5lXCI7XG5pbXBvcnQgVmlldyBmcm9tIFwiLi4vYmFzZTNkL3ZpZXdcIlxuXG4vKipcbiAqIEdhbWV2aWV3IGNvbnRhaW5zIHNjZW5lLCB2aWV3LFxuICovXG5jbGFzcyBBZ0dhbWVWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnNldHVwVGhyZWUoKTtcblxuICAgIHRoaXMuY29udHJvbFByb2dyZXNzID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoXCJjb250cm9sLXByb2dyZXNzXCIpKSB7XG4gICAgICB0aGlzLmNvbnRyb2xQcm9ncmVzcyA9IHRydWU7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJBZ0dhbWVWaWV3IGNvbm5lY3RlZFwiKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHRoaXMudXBkYXRlU2l6ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5tb3VzZWRvd24uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCB0aGlzLm1vdXNldXAuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMubW91c2Vtb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgdGhpcy50b3VjaHN0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsIHRoaXMudG91Y2hlbmQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIHRoaXMudG91Y2htb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMud2hlZWwuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleWRvd24uYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLnZpc2liaWxpdHlDaGFuZ2UsIHRoaXMudmlzaWJpbGl0eUNoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlld0NlbnRlciA9IHt4OiAwLCB5OiAwLCB6OiAxMH07XG4gICAgdGhpcy50b3VjaGVzID0ge307XG5cblxuICAgIHRoaXMubW92ZXMgPSAwO1xuICAgIHRoaXMudmlldyA9IG5ldyBWaWV3KHRoaXMpO1xuICAgIHRoaXMudXBkYXRlU2l6ZSh7dGFyZ2V0OiB3aW5kb3d9KTtcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcblxuICAgIHRoaXMuc3BlZWQgPSA0O1xuICB9XG5cbiAgZnJhbWVDYWxsYmFjayhlKSB7XG4gICAgdGhpcy50aWNrKGUpXG4gICAgLy8gdGhpcy5zY2VuZS50aWNrKClcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHRoaXMudXBkYXRlU2l6ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5tb3VzZWRvd24uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCB0aGlzLm1vdXNldXAuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMubW91c2Vtb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMud2hlZWwuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleWRvd24uYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLnZpc2liaWxpdHlDaGFuZ2UsIHRoaXMudmlzaWJpbGl0eUNoYW5nZS5iaW5kKHRoaXMpKTtcbiAgICB2aWV3LmRlc3Ryb3llZCA9IHRydWVcbiAgfVxuXG4gIGFzeW5jIHdvcmxkQ3JlYXRlZChlKSB7XG4gICAgdGhpcy53b3JsZCA9IGUud29ybGQ7XG4gICAgY29uc3QgbWFwID0gdGhpcy53b3JsZC5tYXA7XG5cbiAgICAvLyBGSVhNRTptb3ZlIHRoaXMgc29tZXdoZXJlIGVsc2VcbiAgICBjb25zdCB0aHJlZUhlaWdodE1hcCA9IG1hcC50b1RocmVlVGVycmFpbigpO1xuXG4gICAgVGVycmFpbkJ1aWxkZXIuY3JlYXRlKG1hcCwgdGhpcy5zY2VuZSwgdGhyZWVIZWlnaHRNYXApO1xuXG4gICAgLy8gRklYTUU6IGxvYWQgYWxsIG1vZGVscyBiZWZvcmVoYW5kXG4gICAgYXdhaXQgdGhpcy53b3JsZC5pbml0U2NlbmUodGhpcy5zY2VuZSk7XG4gICAgdGhpcy5zdGFydFJlbmRlckxvb3AoKTtcbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpO1xuICB9XG5cbiAgc3RhcnRSZW5kZXJMb29wKCkge1xuICAgIHRoaXMudmlldy5yZW5kZXIodGhpcy5zY2VuZSwge2ZyYW1lQ2FsbGJhY2s6IHRoaXMuZnJhbWVDYWxsYmFjay5iaW5kKHRoaXMpfSlcbiAgfVxuXG4gIGdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpIHtcbiAgICB2YXIgaGlkZGVuLCB2aXNpYmlsaXR5Q2hhbmdlO1xuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7IC8vIE9wZXJhIDEyLjEwIGFuZCBGaXJlZm94IDE4IGFuZCBsYXRlciBzdXBwb3J0XG4gICAgICBoaWRkZW4gPSBcImhpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwidmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1zSGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBoaWRkZW4gPSBcIm1zSGlkZGVuXCI7XG4gICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gXCJtc3Zpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIGhpZGRlbiA9IFwid2Via2l0SGlkZGVuXCI7XG4gICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gXCJ3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfVxuICAgIHJldHVybiB7dmlzaWJpbGl0eUNoYW5nZSwgaGlkZGVufTtcbiAgfVxuXG4gIHNldHVwVGhyZWUoKSB7XG4gICAgdGhpcy5zY2VuZSA9IG5ldyBBbnRTY2VuZSh0aGlzLnNjZW5lKVxuICB9XG5cbiAgdGljayhkZWx0YSkge1xuICAgIGlmICh0aGlzLmNvbnRyb2xQcm9ncmVzcyAmJiAhdGhpcy53b3JsZC5wYXVzZSkge1xuICAgICAgdGhpcy53b3JsZC50aWNrKGRlbHRhICogdGhpcy5zcGVlZClcbiAgICB9XG4gIH1cblxuICB2aXNpYmlsaXR5Q2hhbmdlKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldFt0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLmhpZGRlbl0pIHtcbiAgICAgIHRoaXMud29ybGQucGF1c2UgPSB0cnVlXG4gICAgICAvLyBoaWRkZW5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53b3JsZC5wYXVzZSA9IGZhbHNlXG4gICAgICAvLyB2aXNpYmxlXG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2l6ZShldikge1xuICAgIHRoaXMudmlldy5zZXRTaXplKHt9KTtcbiAgICB0aGlzLmNvbnRhaW5lcldpZHRoID0gZXYudGFyZ2V0LmlubmVyV2lkdGg7XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBldi50YXJnZXQuaW5uZXJIZWlnaHRcbiAgfVxuXG4gIG1vdXNldXAoZSkge1xuICAgIHRoaXMubW91c2Vpc2Rvd24gPSBmYWxzZTtcbiAgfVxuXG4gIG1vdXNlZG93bihlKSB7XG4gICAgdGhpcy5tb3VzZWlzZG93biA9IHRydWU7XG4gICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgdGhpcy5veSA9IGUucGFnZVk7XG4gICAgdGhpcy5tb3ZlcyA9IDA7XG4gIH1cblxuICB0b3VjaHN0YXJ0KGUpIHtcbiAgICBjb25zb2xlLmxvZyhcInRvdWNoc3RhcnRcIixlKVxuICAgIGNvbnN0IGlkPTBcbiAgICBjb25zdCB0b3VjaCA9ZS50YXJnZXRUb3VjaGVzW2lkXVxuICAgIHRoaXMudG91Y2hlc1tpZF09e3g6dG91Y2guY2xpZW50WCwgeTp0b3VjaC5jbGllbnRZfVxuICB9XG5cbiAgdG91Y2hlbmQoZSkge1xuICAgIGNvbnNvbGUubG9nKFwidG91Y2hlbmRcIixlKVxuICAgIGRlbGV0ZSB0aGlzLnRvdWNoZXNbMF07XG4gIH1cblxuICB0b3VjaG1vdmUoZSkge1xuICAgIGNvbnNvbGUubG9nKFwidG91Y2htb3ZlXCIsZSlcbiAgICBjb25zdCBpZD0wXG4gICAgY29uc3QgdG91Y2ggPWUudGFyZ2V0VG91Y2hlc1tpZF1cbiAgICBjb25zdCB3aWR0aCA9IHRoaXMub2Zmc2V0V2lkdGg7XG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5vZmZzZXRIZWlnaHQ7XG4gICAgY29uc3QgeCA9IHRvdWNoLmNsaWVudFgtdGhpcy50b3VjaGVzW2lkXS54XG4gICAgY29uc3QgeSA9IHRvdWNoLmNsaWVudFktdGhpcy50b3VjaGVzW2lkXS55XG4gICAgdGhpcy50b3VjaGVzW2lkXT17eDp0b3VjaC5jbGllbnRYLCB5OnRvdWNoLmNsaWVudFl9XG4gICAgY29uc29sZS5sb2coXCJYWFhYXCIseSx4LHdpZHRoLGhlaWdodCxKU09OLnN0cmluZ2lmeSh0aGlzLnRvdWNoZXMpKVxuICAvLyAgdGhpcy5tb3ZlKHt4Ongvd2lkdGgsIHk6eS9oZWlnaHR9KVxuICAgIHRoaXMubW92ZSh7ZHg6IHggLyB3aWR0aCwgZHk6IHkgLyBoZWlnaHR9KTtcbiAgfVxuXG4gIHdoZWVsKGUpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueiArPSBlLmRlbHRhWSAqIDAuMTtcbiAgICBpZiAodGhpcy52aWV3Q2VudGVyLnogPCA1KSB7XG4gICAgICB0aGlzLnZpZXdDZW50ZXIueiA9IDVcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKVxuICB9XG5cbiAgY2xpY2soZSkge1xuICAgIGlmICghdGhpcy53b3JsZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLndvcmxkLmNsaWNrKHRoaXMubGFzdFBvcylcbiAgfVxuXG4gIG1vdXNlbW92ZShlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgdGhpcy5tb3ZlcyArPSAxO1xuICAgIGlmICh0aGlzLm1vdXNlaXNkb3duKSB7XG4gICAgICBjb25zdCB3aWR0aCA9IHRoaXMub2Zmc2V0V2lkdGg7XG4gICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLm9mZnNldEhlaWdodDtcbiAgICAgIHRoaXMubW92ZSh7ZHg6IChlLnBhZ2VYIC0gdGhpcy5veCkgLyB3aWR0aCwgZHk6IChlLnBhZ2VZIC0gdGhpcy5veSkgLyBoZWlnaHR9KTtcbiAgICAgIHRoaXMub3ggPSBlLnBhZ2VYO1xuICAgICAgdGhpcy5veSA9IGUucGFnZVk7XG4gICAgfVxuICAgIHRoaXMuaG92ZXIoe1xuICAgICAgeDogZS5wYWdlWCxcbiAgICAgIHk6IGUucGFnZVksXG4gICAgICByeDogZS5wYWdlWCAvIHRoaXMuY29udGFpbmVyV2lkdGggKiAyIC0gMSxcbiAgICAgIHJ5OiAtZS5wYWdlWSAvIHRoaXMuY29udGFpbmVySGVpZ2h0ICogMiArIDEsXG4gICAgfSk7XG4gIH1cblxuICBob3Zlcihtb3VzZSkge1xuICAgIGlmICghdGhpcy53b3JsZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzID0gUGljay5waWNrKG1vdXNlLCB0aGlzLnZpZXcuY2FtZXJhLCB0aGlzLnNjZW5lLnNjZW5lKTtcblxuICAgIGlmIChyZXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGVudGl0eSA9IHJlc1swXS5vYmplY3QudXNlckRhdGEuZW50aXR5O1xuICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgZW50aXR5ID0gcmVzWzBdLm9iamVjdC5wYXJlbnQudXNlckRhdGEuZW50aXR5O1xuICAgICAgfVxuICAgICAgdGhpcy53b3JsZC5ob3ZlcihlbnRpdHkpO1xuXG4gICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICB0aGlzLmxhc3RQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMihyZXNbMF0ucG9pbnQueCwgLXJlc1swXS5wb2ludC56KS8vLmNvcHkocmVzWzBdLnBvaW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBtb3ZlKGQpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueCAtPSBkLmR4ICogdGhpcy52aWV3Q2VudGVyLnogKiAzO1xuICAgIHRoaXMudmlld0NlbnRlci55ICs9IGQuZHkgKiB0aGlzLnZpZXdDZW50ZXIueiAqIDM7XG5cbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG4gIH1cblxuICB1cGRhdGVDYW1lcmEoKSB7XG4gICAgLy8gRklYTUU6IG1vdmUgdG8gd29ybGRcbiAgICB2YXIgaDtcblxuICAgIGlmICh0aGlzLndvcmxkICYmIHRoaXMud29ybGQubWFwKSB7XG4gICAgICBoID0gdGhpcy53b3JsZC5tYXAuZ2V0KFwicm9ja1wiKS5pbnRlcnBvbGF0ZSh0aGlzLnZpZXdDZW50ZXIueCwgdGhpcy52aWV3Q2VudGVyLnkgKyB0aGlzLnZpZXdDZW50ZXIueiAvIDIpO1xuICAgIH1cbiAgICBpZiAoaCA+IDUwIHx8IGggPCA1MCkge1xuICAgICAgaCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy52aWV3LnVwZGF0ZUNhbWVyYSh0aGlzLnZpZXdDZW50ZXIsIGgpXG4gIH1cblxuICBrZXlkb3duKGUpIHtcbiAgICBjb25zb2xlLmxvZyhcIktFWWRvd25cIiwgZSk7XG4gICAgaWYgKGUua2V5Q29kZSA9PSAyNykge1xuICAgICAgdGhpcy53b3JsZC5zZWxlY3QobnVsbCk7XG4gICAgfVxuICB9XG59XG5cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWdhbWUtdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZ2FtZS12aWV3JywgQWdHYW1lVmlldyk7XG59XG4iLCIvLyBzaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9wdWJzdWItamF2YXNjcmlwdFxuLy8gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVCBsaWNlbnNlXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0gW11cbiAgICB9XG5cbiAgICBzdWJzY3JpYmUobGlzdGVuZXIpIHtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycztcblxuICAgICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpIC0gMTtcblxuICAgICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsaXN0ZW5lcnNbaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHB1Ymxpc2goaW5mbykge1xuICAgICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaCgoaXRlbSk9PiB7XG4gICAgICAgICAgICBpdGVtKGluZm8pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iLCJjbGFzcyBKb2Ige1xuICAgIGNvbnN0cnVjdG9yKGVudGl0eSkge1xuICAgICAgICB0aGlzLl9lbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIHRoaXMuX3JlYWR5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGVudGl0eSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VudGl0eVxuICAgIH1cblxuICAgIHNldFJlYWR5KCkge1xuICAgICAgICB0aGlzLl9yZWFkeSA9IHRydWU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBKb2I7IiwiLyoqIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBUSFJFRS5WZWN0b3IyLiAqL1xuXG5jbGFzcyBWZWN0b3IyIHtcbiAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9XG5cbiAgdHJ1bmMobWlueCwgbWlueSwgbWF4eCwgbWF4eSkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihcbiAgICAgIHRoaXMueCA8IG1pbnggPyBtaW54IDogKHRoaXMueCA+IG1heHggPyBtYXh4IDogdGhpcy54KSxcbiAgICAgIHRoaXMueSA8IG1pbnkgPyBtaW55IDogKHRoaXMueSA+IG1heHkgPyBtYXh5IDogdGhpcy55KSxcbiAgICApXG4gIH1cblxuICBjb3B5KHYpIHtcbiAgICBpZih2KSB7XG4gICAgICB0aGlzLnggPSB2Lng7XG4gICAgICB0aGlzLnkgPSB2Lnk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWRkKHYpIHtcbiAgICBpZiAoIXYpIHtcbiAgICAgIHRocm93IFwiVmVjdG9yIHYgbm90IGRlZmluZWRcIjtcbiAgICB9XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZGlzdGFuY2VUbyh2KSB7XG4gICAgY29uc3QgZHggPSB2LnggLSB0aGlzLngsIGR5ID0gdi55IC0gdGhpcy55O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpXG4gIH1cblxuICBzdWJWZWN0b3JzKGEsIGIpIHtcbiAgICB0aGlzLnggPSBhLnggLSBiLng7XG4gICAgdGhpcy55ID0gYS55IC0gYi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0TGVuZ3RoKGxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZSgpLm11bHRpcGx5U2NhbGFyKGxlbmd0aCk7XG4gIH1cblxuICBub3JtYWxpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKHRoaXMubGVuZ3RoKCkgfHwgMSk7XG4gIH1cblxuICBkaXZpZGVTY2FsYXIocykge1xuICAgIHRoaXMueCAvPSBzO1xuICAgIHRoaXMueSAvPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbXVsdGlwbHlTY2FsYXIocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGVuZ3RoKCkge1xuICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcbiAgfVxufVxuXG5leHBvcnQge1ZlY3RvcjJ9O1xuIiwiY2xhc3MgQW5nbGUge1xuICBzdGF0aWMgZnJvbVZlY3RvcjIoZGlyKSB7XG4gICAgcmV0dXJuIC1NYXRoLmF0YW4yKGRpci54LCBkaXIueSkgKyBNYXRoLlBJO1xuICB9XG59XG5cbmV4cG9ydCB7QW5nbGV9XG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuaW1wb3J0IHtBbmdsZX0gZnJvbSBcIi4uL2FuZ2xlXCJcblxudmFyIHRtcERpciA9IG5ldyBWZWN0b3IyKCk7XG5cbmNsYXNzIE1vdmUgZXh0ZW5kcyBKb2Ige1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIHBvcywgZGlzdGFuY2UpIHtcbiAgICBzdXBlcihlbnRpdHkpO1xuICAgIHRoaXMuc3BlZWQgPSBlbnRpdHkuc3BlZWQgfHwgMTtcbiAgICB0aGlzLmxsdGFyZ2V0UG9zID0gcG9zO1xuICAgIHRoaXMuZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCAwO1xuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIHZhciBlID0gdGhpcy5lbnRpdHk7XG4gICAgaWYgKHRoaXMubGx0YXJnZXRQb3MpIHtcblxuICAgICAgdmFyIGRpc3RhbmNlID0gdGhpcy5sbHRhcmdldFBvcy5kaXN0YW5jZVRvKGUucG9zKTtcbiAgICAgIHZhciB0b2dvID0gZGVsdGEgKiB0aGlzLnNwZWVkO1xuXG4gICAgICBkaXN0YW5jZSAtPSB0aGlzLmRpc3RhbmNlO1xuICAgICAgdG1wRGlyLnN1YlZlY3RvcnModGhpcy5sbHRhcmdldFBvcywgZS5wb3MpLnNldExlbmd0aCh0b2dvKTtcblxuICAgICAgZS5yb3RhdGlvbiA9IEFuZ2xlLmZyb21WZWN0b3IyKHRtcERpcik7XG4gICAgICBpZiAoZGlzdGFuY2UgPCB0b2dvKSB7XG4gICAgICAgIGlmICh0aGlzLmRpc3RhbmNlID4gMCkge1xuICAgICAgICAgIGUucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMubGx0YXJnZXRQb3MpLmFkZChuZXcgVmVjdG9yMigpLnN1YlZlY3RvcnModGhpcy5sbHRhcmdldFBvcywgZS5wb3MpLnNldExlbmd0aCgtdGhpcy5kaXN0YW5jZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGUucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMubGx0YXJnZXRQb3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZS51cGRhdGVNZXNoUG9zKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmxsdGFyZ2V0UG9zO1xuICAgICAgICB0aGlzLnNldFJlYWR5KCk7XG4gICAgICAgIC8vIHJldHVybiByZXN0IHRpbWVcbiAgICAgICAgcmV0dXJuICh0b2dvIC0gZGlzdGFuY2UpIC8gdGhpcy5zcGVlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGUucG9zLmFkZCh0bXBEaXIpO1xuICAgICAgfVxuXG4gICAgICBlLnVwZGF0ZU1lc2hQb3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVSUk9SOiBubyBsbHRhcmdldHBvcyBkZWZpbmVkXCIpO1xuICAgICAgLy8gdXNlIHRoaXMgbWF5YmUgZm9yIGZvbGxvd2luZyBvdGhlciBlbnRpdGllc1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cbn1cblxuZXhwb3J0IHtNb3ZlfTtcbiIsImltcG9ydCB7TW92ZX0gZnJvbSAnLi4vbGwvbW92ZSdcblxuY2xhc3MgTWxNb3ZlIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBwb3MsIG1lc2hUeXBlKSB7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5tbHRhcmdldFBvcyA9IHBvcztcbiAgICBpZiAoIW1lc2hUeXBlKSB7XG4gICAgICBtZXNoVHlwZSA9IFwid2Fsa1wiO1xuICAgIH1cbiAgICB0aGlzLm1lc2hUeXBlID0gbWVzaFR5cGU7XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdmFyIGRpc3RhbmNlID0gdGhpcy5tbHRhcmdldFBvcy5kaXN0YW5jZVRvKHRoaXMuZW50aXR5LnBvcyk7XG4gICAgaWYgKGRpc3RhbmNlIDwgMC4xKSB7XG4gICAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbnRpdHkuc2V0TWVzaChcIndhbGtcIik7XG4gICAgICB0aGlzLmVudGl0eS5wdXNoSm9iKG5ldyBNb3ZlKHRoaXMuZW50aXR5LCB0aGlzLm1sdGFyZ2V0UG9zKSk7XG4gICAgfVxuICAgIHJldHVybiBkZWx0YTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7TWxNb3ZlfVxuIiwiaW1wb3J0IEV2ZW50cyBmcm9tICcuLi9saWJzL2V2ZW50cydcbmltcG9ydCB7TWxNb3ZlfSBmcm9tIFwiLi9tbC9tb3ZlXCI7XG5cbmNsYXNzIFdvcmxkIHtcbiAgY29uc3RydWN0b3IobWFwKSB7XG4gICAgdGhpcy5tYXAgPSBtYXA7XG4gICAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICAgIHRoaXMuZW50aXRpZXNCeVR5cGUgPSB7fTtcbiAgICBpZiAoIXdpbmRvdy5Xb3JsZClcbiAgICAgIHdpbmRvdy5Xb3JsZCA9IHRoaXM7XG5cbiAgICB0aGlzLmhvdmVyZWQgPSBuZXcgRXZlbnRzKCk7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG5ldyBFdmVudHMoKTtcbiAgfVxuXG4gIGdldCB3aWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oZWlnaHQ7XG4gIH1cblxuICBwdXNoKGVudGl0eSkge1xuICAgIGVudGl0eS53b3JsZCA9IHRoaXM7XG4gICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSk7XG4gICAgaWYgKCFlbnRpdHkubWl4aW5OYW1lcylcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIG1peGlucyBmb3IgXCIsIGVudGl0eSk7XG4gICAgZWxzZSB7XG4gICAgICBlbnRpdHkubWl4aW5OYW1lcy5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXSlcbiAgICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdID0gW107XG4gICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0ucHVzaChlbnRpdHkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKHBhcmFtLCBvcmlnaW4pIHtcbiAgICByZXR1cm4gXy5jaGFpbih0aGlzLmVudGl0aWVzKS5maWx0ZXIoKGUpID0+IHtcbiAgICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHJldHVybiBwYXJhbShlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gcGFyYW0pIHtcbiAgICAgICAgICB2YXIgdmFsID0gcGFyYW1bbmFtZV07XG4gICAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPQkpcIiwgdmFsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICBpZiAoZVtuYW1lXS5pbmRleE9mKHZhbCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCFlW25hbWVdW3ZhbF0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlW25hbWVdICE9IHZhbClcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSkuc29ydEJ5KChlKSA9PiB7XG4gICAgICBpZiAob3JpZ2luIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcbiAgICAgICAgcmV0dXJuIGUucG9zLmRpc3RhbmNlVG8ob3JpZ2luKTtcbiAgICAgIHJldHVybiAxO1xuICAgIH0pLnZhbHVlKCk7XG4gIH1cblxuICBhc3luYyBpbml0U2NlbmUoc2NlbmUpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PSBpbml0U2NlbmVcIik7XG4gICAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGFzeW5jIGUgPT4ge1xuICAgICAgYXdhaXQgZS5zZXRTY2VuZShzY2VuZSk7XG4gICAgfSk7XG4gIH1cblxuICBob3ZlcihlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KVxuICAgICAgdGhpcy5ob3ZlcmVkRW50aXR5LmhvdmVyZWQoZmFsc2UpO1xuXG4gICAgdGhpcy5ob3ZlcmVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLmhvdmVyZWQucHVibGlzaChlbnRpdHkpXG4gIH1cblxuICBzZWxlY3QoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkpXG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKGZhbHNlKTtcbiAgICB0aGlzLnNlbGVjdGVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkLnB1Ymxpc2goZW50aXR5KVxuICB9XG5cbiAgZ2V0U2VsZWN0ZWRIZXJvKCkge1xuICAgIGlmICghdGhpcy5zZWxlY3RlZEhlcm8pIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRIZXJvID0gdGhpcy5zZWFyY2goe3BsYXllcjogXCJodW1hblwifSlbMF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkSGVybztcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICB0aGlzLmVudGl0aWVzLmZvckVhY2goKGVudGl0eSkgPT4ge1xuICAgICAgaWYgKGVudGl0eS50aWNrKSB7XG4gICAgICAgIGVudGl0eS50aWNrKGRlbHRhKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2xpY2sobGFzdFBvcykge1xuICAgIGNvbnNvbGUubG9nKFwiV09STEQuY2xpY2tcIiwgbGFzdFBvcyk7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSkge1xuICAgICAgdGhpcy5zZWxlY3QodGhpcy5ob3ZlcmVkRW50aXR5KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkgJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSm9iICYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkuaXNBKFwiaGVyb1wiKSAvKiYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkucGxheWVyID09IFwiaHVtYW5cIiovKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiYXNzaWduIG5ldyBtb3ZlIGpvYlwiLCBsYXN0UG9zKTtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkucmVzZXRKb2JzKCk7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hKb2IobmV3IE1sTW92ZSh0aGlzLnNlbGVjdGVkRW50aXR5LCBsYXN0UG9zLCAwKSk7XG4vLyAgICAgICAgICB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iKG5ldyBKb2JzLm1sLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksbGFzdFBvcykpO1xuICAgICAgLy90aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hIbEpvYihuZXcgSm9icy5obC5Nb3ZlKHRoaXMuc2VsZWN0ZWRFbnRpdHksIGxhc3RQb3MpKTtcbiAgICB9XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZDtcbiIsInZhciBBcnJheVR5cGUgPSB3aW5kb3cuRmxvYXQ2NEFycmF5IHx8IHdpbmRvdy5BcnJheTtcblxuZnVuY3Rpb24gY3JlYXRlTWFwKHcsIGgpIHtcbiAgcmV0dXJuIG5ldyBBcnJheVR5cGUodyAqIGgpO1xufVxuXG5jbGFzcyBIZWlnaHRNYXAge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICB3aWR0aDogMjU2LFxuICAgICAgaGVpZ2h0OiAyNTYsXG4gICAgICBtYXA6IHt9XG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLm1hcCA9IHRoaXMub3B0aW9ucy5tYXA7XG5cbiAgICBpZiAoIXRoaXMubWFwLnJvY2spIHtcbiAgICAgIHRoaXMubWFwLnJvY2sgPSBjcmVhdGVNYXAodGhpcy5vcHRpb25zLndpZHRoLCB0aGlzLm9wdGlvbnMuaGVpZ2h0KTtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoKVxuICAgIH1cbiAgfTtcblxuICBnZXQgd2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy53aWR0aDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gIH1cblxuICBnZW5lcmF0ZSgpIHtcbiAgICB2YXIgeCwgeTtcbiAgICB2YXIgcm9jayA9IHRoaXMuZ2V0KFwicm9ja1wiKTtcbiAgICBmb3IgKHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspXG4gICAgICBmb3IgKHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIHZhciB2YWwgPSBNYXRoLnNpbih4ICogMC4zKSArIE1hdGguc2luKHkgKiAwLjE1KSAqIDIuMDsvLy90aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgICAgIHJvY2soeCwgeSwgdmFsKTtcbiAgICAgIH1cbiAgfTtcblxuICBnZXQodHlwZSkge1xuICAgIHZhciB3ID0gdGhpcy5vcHRpb25zLndpZHRoO1xuICAgIHZhciBhcnJheSA9IHRoaXMubWFwW3R5cGVdO1xuXG4gICAgdmFyIGZjdCA9IGZ1bmN0aW9uICh4LCB5LCB2YWwpIHtcbiAgICAgIHZhciBpID0geCArIHcgKiB5O1xuICAgICAgaWYgKHZhbClcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID0gdmFsO1xuICAgICAgcmV0dXJuIGFycmF5W2ldO1xuICAgIH07XG5cbiAgICBmY3QuaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgdmFyIGZ4ID0gTWF0aC5mbG9vcih4KTtcbiAgICAgIHZhciBmeSA9IE1hdGguZmxvb3IoeSk7XG4gICAgICB2YXIgdjAwID0gdGhpcyhmeCwgZnkpO1xuICAgICAgdmFyIHYwMSA9IHRoaXMoZngsIGZ5ICsgMSk7XG4gICAgICB2YXIgdjEwID0gdGhpcyhmeCArIDEsIGZ5KTtcbiAgICAgIHZhciB2MTEgPSB0aGlzKGZ4ICsgMSwgZnkgKyAxKTtcbiAgICAgIHZhciBkeCA9IHggLSBmeDtcbiAgICAgIHZhciBkeSA9IHkgLSBmeTtcbiAgICAgIHJldHVybiAodjAwICogKDEgLSBkeCkgKyB2MTAgKiBkeCkgKiAoMSAtIGR5KSArICh2MDEgKiAoMSAtIGR4KSArIHYxMSAqIGR4KSAqIGR5O1xuICAgIH07XG5cbiAgICByZXR1cm4gZmN0O1xuICB9O1xuXG4gIHBpY2tHcmVlbih3LCBoLCBkYXRhKSB7XG4gICAgdmFyIGEgPSBuZXcgQXJyYXkodyAqIGgpO1xuICAgIHZhciB4LCB5O1xuICAgIGZvciAoeSA9IDA7IHkgPCBoOyB5KyspIHtcbiAgICAgIGZvciAoeCA9IDA7IHggPCB3OyB4KyspIHtcbiAgICAgICAgYVt5ICogdyArIHhdID0gZGF0YVsoeSAqIHcgKyB4KSAqIDQgKyAxXSAqIDAuMjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGE7XG4gIH07XG5cblxuICB0b1RocmVlVGVycmFpbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChnLCBvcHRpb25zKSB7XG4gICAgICBjb25zdCB4bCA9IG9wdGlvbnMueFNlZ21lbnRzICsgMSxcbiAgICAgICAgeWwgPSBvcHRpb25zLnlTZWdtZW50cyArIDE7XG4gICAgICBjb25zdCByb2NrID0gc2VsZi5nZXQoXCJyb2NrXCIpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB4bDsgaSsrKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgeWw7IGorKykge1xuICAgICAgICAgIGdbKHlsIC0gaiAtIDEpICogeGwgKyBpXS56ICs9IHJvY2soaSwgaik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8qXG4gICAgICB0b1RleHR1cmUoKSB7XG4gICAgICAgICAgLy8gVU5URVNURUQgISEhIVxuICAgICAgICAgIHZhciByYW1wVGV4ID0gbmV3IFRIUkVFLkRhdGFUZXh0dXJlKGRhdGEucGl4ZWxzLCBkYXRhLndpZHRoLCBkYXRhLmhlaWdodCwgVEhSRUUuUkdCQUZvcm1hdCk7XG4gICAgICAgICAgcmFtcFRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XG4gICAgICB9O1xuICAqL1xuXG4vLyBGSVhNRSB0aGlzIHNob3VsZCBtb3ZlZCBzb21ld2hlcmUgZWxzZVxuICB0b0NhbnZhcyhfdHlwZSkge1xuICAgIHZhciB0eXBlID0gX3R5cGUgfHwgXCJyb2NrXCI7XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLFxuICAgICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGNhbnZhcy53aWR0aCA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gdGhpcy5vcHRpb25zLmhlaWdodDtcbiAgICB2YXIgZCA9IGNvbnRleHQuY3JlYXRlSW1hZ2VEYXRhKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCksXG4gICAgICBkYXRhID0gZC5kYXRhO1xuICAgIHZhciBtaW4sIG1heDtcbiAgICB2YXIgYWNjZXNzb3IgPSB0aGlzLmdldCh0eXBlKTtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm9wdGlvbnMud2lkdGg7IHgrKykge1xuICAgICAgICB2YXIgdiA9IGFjY2Vzc29yKHgsIHkpO1xuXG4gICAgICAgIGlmICghbWluIHx8IG1pbiA+IHYpXG4gICAgICAgICAgbWluID0gdjtcbiAgICAgICAgaWYgKCFtYXggfHwgbWF4IDwgdilcbiAgICAgICAgICBtYXggPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIk1NTU1cIiwgbWluLCBtYXgpO1xuXG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspIHtcbiAgICAgICAgdmFyIGkgPSB5ICogdGhpcy5vcHRpb25zLmhlaWdodCArIHg7XG4gICAgICAgIGlkeCA9IGkgKiA0O1xuICAgICAgICBkYXRhW2lkeF0gPSBkYXRhW2lkeCArIDFdID0gZGF0YVtpZHggKyAyXSA9IE1hdGgucm91bmQoKChhY2Nlc3Nvcih4LCB5KSAtIG1pbikgLyAobWF4IC0gbWluKSkgKiAyNTUpO1xuICAgICAgICBkYXRhW2lkeCArIDNdID0gMjU1O1xuICAgICAgfVxuICAgIH1cbiAgICBjb250ZXh0LnB1dEltYWdlRGF0YShkLCAwLCAwKTtcbiAgICByZXR1cm4gY2FudmFzO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEhlaWdodE1hcDtcbiIsIi8qKiBhIHZlcnkgc2ltcGxpc3RpYyBhamF4LWhhbmRsaW5nIG1ldGhvZCByZXR1cm5pbmcgYSBQcm9taXNlIHdpdGggcGFyc2VkIEpTT04gZGF0YS4gKi9cbmZ1bmN0aW9uIGFqYXgodXJsLCBtZXRob2QgPSBcIkdFVFwiLCBkYXRhID0ge30pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgcmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09PSBYTUxIdHRwUmVxdWVzdC5ET05FKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPD0gMjk5ICYmIHJlcXVlc3Quc3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IGlnbm9yZVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIEVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhamF4O1xuIiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi92ZWN0b3IyXCI7XG5pbXBvcnQgRXZlbnRzIGZyb20gXCIuLi9saWJzL2V2ZW50c1wiO1xuXG52YXIgdWlkID0gMTExMTA7XG5cbmNsYXNzIEVudGl0eSB7XG4gIGNvbnN0cnVjdG9yKGhlaWdodG1hcCwgb3BzKSB7XG5cbiAgICB2YXIgZW50aXR5ID0gb3BzLmVudGl0eVR5cGVzW29wcy50eXBlXTtcbiAgICBpZiAoIWVudGl0eSkge1xuICAgICAgY29uc29sZS53YXJuKFwiRW50aXR5OiBObyBFbnRpdHktVHlwZSBuYW1lZCBcIiArIG9wcy50eXBlICsgXCIgZm91bmQhXCIpO1xuICAgICAgZW50aXR5ID0ge307XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24odGhpcywgZW50aXR5KTtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIG9wcyk7XG4gICAgLy8gRklYTUU6IHJlZHVjZSBjb21wbGV4aXR5IGFuZCByZWZlcmVuY2VzIGJ5IHJlbW92aW5nIG1vZGVscywgbWFwIGFuZCBzbyA/Pz9cbiAgICB0aGlzLnN0YXRlID0ge307XG4gICAgdGhpcy5wb3MgPSBuZXcgVmVjdG9yMigpLmNvcHkodGhpcy5wb3MpO1xuICAgIHRoaXMudHlwZU5hbWUgPSB0aGlzLnR5cGU7XG4gICAgdGhpcy51aWQgPSB1aWQrKztcbiAgICB0aGlzLm1hcCA9IGhlaWdodG1hcDtcbiAgICAvLyBjbG9uZVxuICAgIHRoaXMucmVzb3VyY2VzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5yZXNvdXJjZXMpO1xuICAgIHRoaXMudHlwZSA9IGVudGl0eTtcbiAgICBpZiAoIXRoaXMubWVzaE5hbWUpXG4gICAgICB0aGlzLm1lc2hOYW1lID0gXCJkZWZhdWx0XCI7XG5cbiAgICBpZiAoZW50aXR5Lm1peGlucykge1xuICAgICAgdGhpcy5taXhpbnMgPSB7fTtcbiAgICAgIHRoaXMubWl4aW5OYW1lcyA9IFtdO1xuICAgICAgdGhpcy5taXhpbkRlZiA9IGVudGl0eS5taXhpbnM7XG4gICAgICBlbnRpdHkubWl4aW5zLmZvckVhY2gobWl4aW4gPT4ge1xuICAgICAgICB2YXIgZm91bmQgPSBvcHMubWl4aW5EZWZzW21peGluXTtcbiAgICAgICAgaWYgKGZvdW5kICYmIGZvdW5kIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICBmb3VuZCA9IGZvdW5kKCk7XG4gICAgICAgICAgdGhpcy5taXhpbnNbbWl4aW5dID0gZm91bmQ7XG4gICAgICAgICAgdGhpcy5taXhpbk5hbWVzLnB1c2gobWl4aW4pO1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgZm91bmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWl4aW4gbm90IGZvdW5kXCIsIG1peGluKVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5jaGFuZ2VkID0gbmV3IEV2ZW50cygpO1xuICB9O1xuXG4gIGdldCBpZCgpIHtcbiAgICByZXR1cm4gdGhpcy51aWRcbiAgfVxuXG4gIHJ1blBvc3RMb2FkKCkge1xuICAgIGZvciAodmFyIG1peGluIGluIHRoaXMubWl4aW5zKSB7XG4gICAgICBpZiAodGhpcy5taXhpbnNbbWl4aW5dLnBvc3RMb2FkKSB7XG4gICAgICAgIHRoaXMubWl4aW5zW21peGluXS5wb3N0TG9hZC5hcHBseSh0aGlzLCBbXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNBKG1peGluKSB7XG4gICAgcmV0dXJuIHRoaXMubWl4aW5EZWYuaW5kZXhPZihtaXhpbikgPj0gMDtcbiAgfVxuXG4gIGFzeW5jIHNldFNjZW5lKHNjZW5lKSB7XG4gICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnNldE1lc2godGhpcy5tZXNoTmFtZSk7XG4gIH07XG5cbiAgY29tcHV0ZU1lc2hQb3MoKSB7XG4gICAgY29uc3QgaCA9IHRoaXMubWFwLmdldChcInJvY2tcIikuaW50ZXJwb2xhdGUodGhpcy5wb3MueCwgdGhpcy5wb3MueSk7XG4gICAgcmV0dXJuIHt4OiB0aGlzLnBvcy54LCB5OiBoLCB6OiAtdGhpcy5wb3MueX07XG4gIH1cblxuICB1cGRhdGVNZXNoUG9zKCkge1xuICAgIGlmICh0aGlzLm1lc2gpIHtcbiAgICAgIGlmICh0aGlzLm1lc2ggJiYgdGhpcy5tZXNoLnJvdGF0aW9uICYmIHRoaXMucm90YXRpb24pIHtcbiAgICAgICAgdGhpcy5tZXNoLnJvdGF0aW9uLnkgPSB0aGlzLnJvdGF0aW9uO1xuICAgICAgfVxuICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmNvbXB1dGVNZXNoUG9zKCk7XG4gICAgICB0aGlzLm1lc2guc2V0UG9zKHBvc2l0aW9uLngsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnopO1xuICAgIH1cbiAgfTtcblxuICBnZXRNZXNoRGVmKCkge1xuICAgIGNvbnN0IGVudGl0eSA9IHRoaXMudHlwZTtcbiAgICB2YXIgbWVzaFR5cGU7XG4gICAgdmFyIGFuaW1hdGlvbjtcblxuICAgIGlmICh0aGlzLnR5cGUubWVzaGVzKSB7XG4gICAgICB2YXIgZGVmID0gZW50aXR5Lm1lc2hlc1t0aGlzLm1lc2hOYW1lXTtcbiAgICAgIGlmICghZGVmKVxuICAgICAgICBjb25zb2xlLndhcm4oXCJObyBNZXNoIG9mIG5hbWUgJ1wiICsgbmFtZSArIFwiJyBmb3VuZCBpbiBlbnRpdHktZGVmXCIsIGVudGl0eSk7XG4gICAgICBtZXNoVHlwZSA9IGRlZi5tZXNoO1xuICAgICAgYW5pbWF0aW9uID0gZGVmLmFuaW1hdGlvbjtcbiAgICB9IGVsc2UgaWYgKGVudGl0eS5tZXNoKSB7XG4gICAgICBtZXNoVHlwZSA9IGVudGl0eS5tZXNoO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNoVHlwZSA9IHRoaXMudHlwZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiB7bWVzaFR5cGUsIGFuaW1hdGlvbn07XG4gIH1cblxuICBzZXRNZXNoKG5hbWUpIHtcblxuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLm1lc2hOYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB7bWVzaFR5cGUsIGFuaW1hdGlvbn0gPSB0aGlzLmdldE1lc2hEZWYoKTtcblxuICAgIHJldHVybiB0aGlzLm1vZGVsTG9hZGVyLmxvYWQobWVzaFR5cGUsIGFuaW1hdGlvbikudGhlbigobWVzaCkgPT4ge1xuICAgICAgbWVzaC5hdHRhY2hUb1NjZW5lKHRoaXMuc2NlbmUpO1xuXG4gICAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICAgIHRoaXMubWVzaC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubWVzaCA9IG1lc2g7XG4gICAgICBtZXNoLnNldEVudGl0eSh0aGlzKTtcbiAgICAgIHRoaXMudXBkYXRlTWVzaFBvcygpO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uRmluaXNoZWQpIHtcbiAgICAgICAgdGhpcy5tZXNoLmFuaW1hdGlvbkZpbmlzaGVkID0gdGhpcy5hbmltYXRpb25GaW5pc2hlZC5iaW5kKHRoaXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkKTtcbiAgICAgIHRoaXMubWVzaC5zZWxlY3RlZCh0aGlzLnN0YXRlLnNlbGVjdGVkKTtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSk7XG4gIH07XG5cbiAgaG92ZXJlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkID0gdmFsKTtcbiAgfTtcblxuICBzZWxlY3RlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQgPSB2YWwpO1xuICB9O1xuXG4gIGluY3JlYXNlQnkod2hhdCwgYW1vdW50KSB7XG4gICAgaWYoIXRoaXMucmVzb3VyY2VzW3doYXRdKSB7XG4gICAgICB0aGlzLnJlc291cmNlc1t3aGF0XT0wO1xuICAgIH1cbiAgICB0aGlzLnJlc291cmNlc1t3aGF0XSA9IHRoaXMucmVzb3VyY2VzW3doYXRdICsgYW1vdW50O1xuICAgIHRoaXMuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcbiAgfTtcblxuICB0YWtlKHdoYXQsIGFtb3VudCkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIHRoaXMuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBnaXZlKHdoYXQsIGFtb3VudCwgdG9FbnRpdHkpIHtcbiAgICBpZiAodGhpcy5yZXNvdXJjZXNbd2hhdF0gPj0gYW1vdW50KSB7XG4gICAgICB0aGlzLnJlc291cmNlc1t3aGF0XSAtPSBhbW91bnQ7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiR0lWRSBUT1wiLCB0b0VudGl0eSwgd2hhdCk7XG4gICAgICB0b0VudGl0eS5yZXNvdXJjZXNbd2hhdF0gPSAodG9FbnRpdHkucmVzb3VyY2VzW3doYXRdIHx8IDApICsgYW1vdW50O1xuICAgICAgdGhpcy5jaGFuZ2VkLnB1Ymxpc2goXCJjaGFuZ2VkXCIpO1xuICAgICAgdG9FbnRpdHkuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQge0VudGl0eX1cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICAgIFwibWVzaFwiOiBcImJha2VyeTNcIlxuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiYmlnX3N0b25lM1wiXG4gIH0sXG4gIFwiY3JvcF9zbWFsbFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF9tZWRcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfaGlnaFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF90aW55XCI6IHtcbiAgICBcIm1lc2hcIjogXCJjcm9wX3RpbnkyXCIsXG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmFybTJcIlxuICB9LFxuICBcImZpc2hpbmdfaHV0XCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXNoaW5nX2h1dDJcIixcbiAgfSxcbiAgXCJncmF2ZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZ3JhdmUyXCJcbiAgfSxcbiAgXCJoZXJvXCI6IHtcbiAgICBcIm1lc2hcIjogXCJoZXJvX2xwMlwiXG4gIH0sXG4gIFwibWluZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWluZTNcIlxuICB9LFxuICBcIm1pbGxcIjoge1xuICAgIFwibWVzaFwiOiBcIm1pbGxcIixcbiAgICBcInNjYWxlXCI6IDFcbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwidG93bmhhbGxfdHJ5M1wiXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWVzaFwiOiBcInRvd2VyMlwiXG4gIH0sXG4gIFwibWFuX3BpY2tcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9waWNrXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDQ1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0OCxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAzNSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBpY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fYXhlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fYXhlXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNDAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDM1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDI3LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGlja1wiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9lX3dhbGtcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMzAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJhbmltYXRlXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDE4LFxuICAgICAgICBcImxvb3BcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcInN0YW5kXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0MCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0MFxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDMwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNjVcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAxMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDY1XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9maWdodFwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2ZpZ2h0XCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImZpZ2h0XCI6IHtcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDEsXG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDE4LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDM1LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDIwLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwidWdoXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiZmlyXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXI0XCJcbiAgfSxcbiAgXCJmaXJfb2xkXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXIyXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwiZmlyNS5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuNDIsXG4gICAgXCJkb3VibGVzaWRlZFwiOiB0cnVlLFxuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZVxuICB9LFxuXG4gIFwidHJlZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwidHJlZTVcIixcbiAgICBcInNjYWxlXCI6IDAuMixcbiAgICBcImRvdWJsZXNpZGVkXCI6IHRydWVcbiAgfSxcbiAgXCJzaGVlcFwiOiB7XG4gICAgXCJzY2FsZVwiOiAwLjE1LFxuLy8gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJ0ZXh0dXJlXCI6IFwic2hlZXAucG5nXCIsXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0NVxuICAgICAgfSxcbiAgICAgIFwiZWF0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImxvb3BcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA2MCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDEwMFxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ3ZWxsXCJcbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJtZXNoXCI6IFwid29ya3Nob3AyXCIsXG4gICAgXCJwYXJ0aWNsZXNcIjoge1xuICAgICAgXCJzbW9rZVwiOiB7XG4gICAgICAgIFwicG9zaXRpb25cIjoge1xuICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgIFwielwiOiAwXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImNvbnN0IG9ubHlPbmVBdEFUaW1lID0gKGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgd2l0aGluID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChmY3QpIHtcbiAgICAgICAgaWYgKHdpdGhpbikge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBvbmx5T25lQXRBVGltZShmY3QpLCAxMClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpdGhpbj10cnVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBmY3QoKTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgd2l0aGluID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSgpO1xuXG5cbmNsYXNzIE1vZGVsIHtcbiAgICBjb25zdHJ1Y3Rvcihpbm5lck1lc2hlcywgb3V0ZXJOb2RlLCBob3ZlclJpbmcsIHNlbGVjdFJpbmcpIHtcbiAgICAgICAgdGhpcy5pbm5lck1lc2hlcyA9IGlubmVyTWVzaGVzO1xuICAgICAgICB0aGlzLm91dGVyTm9kZSA9IG91dGVyTm9kZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uO1xuICAgICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5vdXRlck5vZGUucm90YXRpb247XG4gICAgICAgIHRoaXMuaG92ZXJSaW5nID0gaG92ZXJSaW5nO1xuICAgICAgICB0aGlzLnNlbGVjdFJpbmcgPSBzZWxlY3RSaW5nO1xuICAgIH1cblxuICAgIGF0dGFjaFRvU2NlbmUoc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgICAgICBpZihmYWxzZSkge1xuICAgICAgICAgICAgb25seU9uZUF0QVRpbWUoKCkgPT4gc2NlbmUuYWRkKHRoaXMub3V0ZXJOb2RlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2VuZS5hZGQodGhpcy5vdXRlck5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRFbnRpdHkoZW50aXR5KSB7XG4gICAgICAgIF8uZWFjaCh0aGlzLmlubmVyTWVzaGVzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgbS51c2VyRGF0YS5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgaG92ZXJlZCh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmhvdmVyUmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmhvdmVyUmluZy52aXNpYmxlO1xuICAgIH1cblxuICAgIHNlbGVjdGVkKHZhbCkge1xuICAgICAgICBpZiAodmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdFJpbmcudmlzaWJsZTtcbiAgICB9XG5cbiAgICBkZXRhY2hGcm9tU2NlbmUoKSB7XG4gICAgICAgIHNjZW5lLnJlbW92ZSh0aGlzLm91dGVyTm9kZSlcbiAgICB9XG5cbiAgICBzZXRQb3MoeCwgeSwgeikge1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi54ID0geDtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueSA9IHk7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnogPSB6O1xuICAgIH1cblxuICAgIGVuYWJsZVBhcnRpY2xlcyh0eXBlKSB7XG4gICAgICAgIGlmICghdGhpcy5lbWl0dGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVsIC0gRU5BQkxFXCIpO1xuICAgICAgICAgICAgdmFyIGVtaXR0ZXIgPSB0aGlzLmVtaXR0ZXIgPSB0aGlzLnNjZW5lLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKTsgLy9hZGRFbWl0dGVyKCBCYXNlLm1ha2VFbWl0dGVyKG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKSkpO1xuICAgICAgICAgICAgZW1pdHRlci5wb3NpdGlvbi52YWx1ZSA9IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkaXNhYmxlUGFydGljbGVzKHR5cGUpIHtcbiAgICAgICAgaWYgKHRoaXMuZW1pdHRlcikge1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWwgLSBESVNBQkxFXCIsIHR5cGUpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZW1pdHRlcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbW92ZSgpIHtcbiAgICAgICAgLy8gaG9vayB0byByZW1vdmUgYW5pbWF0aW9uLXJlc3RhcnRlci1pbnRlcnZhbFxuICAgICAgICBpZiAodGhpcy5pbm5lck1lc2hlcyAmJiB0aGlzLmlubmVyTWVzaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIF8uZWFjaCh0aGlzLmlubmVyTWVzaGVzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgIGlmIChtLmJlZm9yZVJlbW92ZSlcbiAgICAgICAgICAgICAgICAgICAgbS5iZWZvcmVSZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaXMub3V0ZXJOb2RlKTtcbiAgICAgICAgZGVsZXRlIHRoaXMub3V0ZXJOb2RlO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWw7XG4iLCJpbXBvcnQgTWVzaGVzIGZyb20gXCIuLi9jb25maWcvbWVzaGVzXCJcbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9tb2RlbFwiXG5cbi8vIEZJWE1FOiBub3QgbmVlZGVkIGFueW1vcmU/XG5mdW5jdGlvbiBlbnN1cmVMb29wKGFuaW1hdGlvbikge1xuICByZXR1cm47XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uLmhpZXJhcmNoeS5sZW5ndGg7IGkrKykge1xuXG4gICAgdmFyIGJvbmUgPSBhbmltYXRpb24uaGllcmFyY2h5W2ldO1xuXG4gICAgdmFyIGZpcnN0ID0gYm9uZS5rZXlzWzBdO1xuICAgIHZhciBsYXN0ID0gYm9uZS5rZXlzW2JvbmUua2V5cy5sZW5ndGggLSAxXTtcblxuICAgIGxhc3QucG9zID0gZmlyc3QucG9zO1xuICAgIGxhc3Qucm90ID0gZmlyc3Qucm90O1xuICAgIGxhc3Quc2NsID0gZmlyc3Quc2NsO1xuICB9XG59XG5cbmNsYXNzIE1vZGVsTG9hZGVyIHtcblxuICBjb25zdHJ1Y3Rvcihsb2FkZXJzID0ge30sIG1hbmFnZXIgPSBudWxsLCBtZXNoZXMgPSBudWxsKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfLnBpY2sobG9hZGVycywgWydpbWFnZUxvYWRlciddKSk7XG5cbiAgICBpZiAoIW1hbmFnZXIgJiYgVEhSRUUuTG9hZGluZ01hbmFnZXIpIHtcbiAgICAgIG1hbmFnZXIgPSBuZXcgVEhSRUUuTG9hZGluZ01hbmFnZXIoKTtcbiAgICB9XG4gICAgaWYgKG1lc2hlcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IG1lc2hlcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tZXNoZXMgPSBNZXNoZXM7XG4gICAgfVxuICAgIG1hbmFnZXIub25Qcm9ncmVzcyA9IGZ1bmN0aW9uIChpdGVtLCBsb2FkZWQsIHRvdGFsKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwibWFuYWdlci5vblByb2dyZXNzXCIsIGl0ZW0sIGxvYWRlZCwgdG90YWwpO1xuICAgIH07XG5cbiAgICBpZiAoIXRoaXMuaW1hZ2VMb2FkZXIgJiYgVEhSRUUuSW1hZ2VMb2FkZXIpIHtcbiAgICAgIHRoaXMuaW1hZ2VMb2FkZXIgPSBuZXcgVEhSRUUuSW1hZ2VMb2FkZXIobWFuYWdlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIgJiYgVEhSRUUuR0xURkxvYWRlcikge1xuICAgICAgdGhpcy5nbHRmTG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgIGlmICghdGhpcy50ZXh0dXJlTG9hZGVyICYmIFRIUkVFLlRleHR1cmVMb2FkZXIpIHtcbiAgICAgIHRoaXMudGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiBjb2xvcixcbiAgICAgIGZsYXRTaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC41LFxuICAgICAgZGVwdGhUZXN0OiBmYWxzZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgc29tZVJpbmcgPSBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuUmluZ0dlb21ldHJ5KDEuMywgMiwgMjAsIDUsIDAsIE1hdGguUEkgKiAyKSwgbWF0ZXJpYWwpO1xuICAgIHNvbWVSaW5nLnBvc2l0aW9uLnNldCgwLCAwLjUsIDAuMCk7XG4gICAgc29tZVJpbmcucm90YXRlT25BeGlzKG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApLCAtMS42KTtcbiAgICBzb21lUmluZy52aXNpYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIHNvbWVSaW5nXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlQm94KCkge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZGQ5OTAwLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjVcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEsIDEsIDEpLCBtYXRlcmlhbCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gIH1cblxuICBhc3luYyBwYWNrSW50b05vZGUob3B0aW9ucykge1xuICAgIGNvbnN0IHttZXNoRGVmLCBtZXNoLCBtZXNoTmFtZX0gPSBvcHRpb25zO1xuICAgIHZhciBvYmplY3RzO1xuICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cyA9IG1lc2guY2xvbmUoKTtcbiAgICB9XG4gICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcblxuICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgIC8vIGVuY2xvc2UgbWVzaCB3aXRoaW4gc2NlbmUtbm9kZSwgc28gdGhhdCBpdCBjYW4gYmUgcm90YXRlZCBhbmQgdGhlcmUgY2FuIGJlIHNldmVyYWwgbWVzaGVzXG4gICAgLy8gYXR0YWNoZWQgdG8gb25lIGVudGl0eVxuICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIF8uZWFjaChvYmplY3RzLCBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICBub2RlLmFkZChvYmplY3QpO1xuICAgIH0pO1xuICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgbmV3TW9kZWwubmFtZSA9IG1lc2g7XG4gICAgbmV3TW9kZWwudHlwZSA9IG1lc2hOYW1lO1xuXG4gICAgdGhpcy5hZGRSaW5ncyhub2RlLCBuZXdNb2RlbCk7XG5cbiAgICByZXR1cm4gbmV3TW9kZWxcbiAgfVxuXG4gIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuaG92ZXJSaW5nID0gTW9kZWxMb2FkZXIuY3JlYXRlUmluZygweGRkOTkwMCkpO1xuICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4RkY5OTAwKSk7XG4gIH1cblxuICBhc3luYyBsb2FkVW5jYWNoZWQobWVzaCwgYW5pbWF0aW9uKSB7XG4gICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgIGlmICghbWVzaERlZikge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBkZWZpbmVkIGZvciBuYW1lICdcIiArIG1lc2ggKyBcIidcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubG9hZE9iakNvbXBsZXRlKG1lc2gsIGFuaW1hdGlvbilcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmoobWVzaE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICBpZiAodGhpcy5nbHRmTG9hZGVyKSB7XG4gICAgICAgIHRoaXMuZ2x0ZkxvYWRlci5sb2FkKFxuICAgICAgICAgICdtb2RlbHMvJyArIG1lc2hOYW1lICsgJy5nbHRmJyxcbiAgICAgICAgICBtZXNoID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoe21lc2gsIG1lc2hOYW1lfSlcbiAgICAgICAgICB9LFxuICAgICAgICAgICh4aHIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc2hOYW1lICsgXCIgXCIgKyAoeGhyLmxvYWRlZCAvIHhoci50b3RhbCAqIDEwMCkgKyAnJSBsb2FkZWQnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsb2FkT2JqQ29tcGxldGUobmFtZSwgZHVtbXkpIHtcbiAgICBjb25zdCBtZXNoRGVmID0gdGhpcy5tZXNoZXNbbmFtZV07XG4gICAgY29uc3QgbWVzaE5hbWUgPSAobWVzaERlZiAmJiBtZXNoRGVmLm1lc2gpIHx8IG5hbWU7XG4gICAgY29uc3QgbWVzaE9iamVjdCA9IGF3YWl0IHRoaXMubG9hZE9iaihtZXNoTmFtZSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7bWVzaERlZn0sIG1lc2hPYmplY3QpO1xuICB9XG5cbiAgLy8gYW5pbWF0ZSAoY2xvbmVkKSBtZXNoXG4gIGFuaW1hdGUobWVzaCwgbmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IGFuaW1hdGlvbiA9IG5ldyBUSFJFRS5BbmltYXRpb24obWVzaCwgYW5pbWF0aW9uc1tuYW1lXSk7XG4gICAgYW5pbWF0aW9uLmRhdGEgPSBhbmltYXRpb25zW25hbWVdO1xuICAgIGNvbnN0IHNjYWxlID0gb3B0aW9ucy50aW1lU2NhbGUgfHwgMTtcblxuICAgIGlmIChvcHRpb25zLmxvb3AgPT09IGZhbHNlKSB7XG4gICAgICBhbmltYXRpb24ubG9vcCA9IGZhbHNlO1xuICAgIH1cbiAgICBhbmltYXRpb24udGltZVNjYWxlID0gc2NhbGU7XG4gICAgYW5pbWF0aW9uLnBsYXkoKTtcblxuICAgIC8vIGltcGxlbWVudCBzdXBwb3J0IGZvciBsb29waW5nIGludGVydmFsIHdpdGhpbiBnbG9iYWwgYW5pbWF0aW9uXG4gICAgLy8gaGF2ZSBhIGxvb2sgYXQgZW50aXR5IGFsc29cbiAgICBpZiAob3B0aW9ucy5zdGFydEZyYW1lKSB7XG4gICAgICAvL2FuaW1hdGlvbi51cGRhdGUoIG9wdGlvbnMuc3RhcnRGcmFtZSk7XG4gICAgICBpZiAob3B0aW9ucy5hbmltYXRlID09PSBmYWxzZSAmJiBmYWxzZSkge1xuICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICBhbmltYXRpb24udXBkYXRlKG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZW5kRnJhbWUpIHtcbiAgICAgICAgdmFyIHN0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFuaW1hdGlvbi5wbGF5KG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdG9wQW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJBTklNQUwgc3RvcEFOaW1hdGlvblwiLCBtZXNoLCBtZXNoLmFuaW1hdGlvbkZpbmlzaGVkKTtcbiAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgIGlmIChtZXNoLnVzZXJEYXRhICYmIG1lc2gudXNlckRhdGEuZW50aXR5ICYmIG1lc2gudXNlckRhdGEuZW50aXR5LmFuaW1hdGlvbkZpbmlzaGVkKVxuICAgICAgICAgICAgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRpbWUgPSAxMDAwICogKG9wdGlvbnMuZW5kRnJhbWUgLSBvcHRpb25zLnN0YXJ0RnJhbWUpIC8gc2NhbGU7XG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgICAgIGlmIChvcHRpb25zLmxvb3AgIT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoc3RhcnRBbmltYXRpb24sIHRpbWUpO1xuICAgICAgICAgIG1lc2guYmVmb3JlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBET05UIExPT1BcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoc3RvcEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGFuaW1hdGlvbi51cGRhdGUoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgfVxuXG4gIGxvYWRKU09OKG5hbWUsIGFuaW1hdGlvbikge1xuICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5tZXNoZXNbbmFtZV0pO1xuXG4gICAgLy8gbm93IG92ZXJyaWRlIHdpdGggb3B0aW9ucyBmcm9tIGFuaW1hdGlvbnMtcGFydFxuICAgIGlmIChvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSkge1xuICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9ucy5hbmltYXRpb25zW2FuaW1hdGlvbl0pO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkxvYWRpbmcgbW9kZWxcIiwgbmFtZSk7XG5cbiAgICAgIHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcbiAgICAgIHRoaXMuanNvbkxvYWRlci5sb2FkKCdtb2RlbHMvJyArIG5hbWUgKyAnLmpzb24nLCBmdW5jdGlvbiAoZ2VvbWV0cnksIG1hdGVyaWFscykge1xuXG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVWZXJ0ZXhOb3JtYWxzKCk7XG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXG4gICAgICAgIGVuc3VyZUxvb3AoZ2VvbWV0cnkuYW5pbWF0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0ZXJpYWxzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcblxuICAgICAgICAgIHZhciBvcmlnaW5hbE1hdGVyaWFsID0gbWF0ZXJpYWxzW2ldO1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJNQVRcIiwgb3JpZ2luYWxNYXRlcmlhbCk7XG4gICAgICAgICAgb3JpZ2luYWxNYXRlcmlhbC5za2lubmluZyA9IHRydWU7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZG91Ymxlc2lkZWQpIHtcbiAgICAgICAgICAgIC8vICBvcmlnaW5hbE1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkRPVUJMRVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChtYXRlcmlhbHMpO1xuICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZClcbiAgICAgICAgICBtYXRlcmlhbC5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWUpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICB3aXJlZnJhbWU6IHRydWUsXG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdE1hdGVyaWFsKSB7XG4gICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5Ta2lubmVkTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwsIGZhbHNlKTtcblxuICAgICAgICBhbmltYXRpb25zW25hbWVdID0gZ2VvbWV0cnkuYW5pbWF0aW9uO1xuXG4gICAgICAgIHJlc29sdmUobWVzaClcbiAgICAgIH0sIG51bGwsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWxMb2FkZXI7XG4iLCJpbXBvcnQge01vdmV9IGZyb20gJy4uL2xsL21vdmUnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmxldCBhbmltYWwgPSB7XG4gIG9uTm9Kb2I6IGZ1bmN0aW9uIChkZWx0YSkge1xuICAgIGlmICh0aGlzLnNob3VsZFdhbGsoKSkge1xuICAgICAgdGhpcy5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgIGxldCB0YXJnZXRQb3MgPSBuZXcgVmVjdG9yMihNYXRoLnJhbmRvbSgpICogMiAtIDEsXG4gICAgICAgIE1hdGgucmFuZG9tKCkgKiAyIC0gMSkuYWRkKHRoaXMucG9zKTtcblxuICAgICAgaWYgKHRoaXMud29ybGQpIHtcbiAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zLnRydW5jKDAsIDAsIHRoaXMud29ybGQud2lkdGgsIHRoaXMud29ybGQuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaEpvYihuZXcgTW92ZSh0aGlzLCB0YXJnZXRQb3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wbGF5QW5pbWF0aW9uKFwiZWF0XCIpO1xuICAgIH1cbiAgfSxcbiAgc2hvdWxkV2FsazogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSA8IDAuNSk7XG4gIH1cbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IGFuaW1hbDtcblxuZXhwb3J0IGRlZmF1bHQgQW5pbWFsO1xuXG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuXG5jbGFzcyBSZXN0Sm9iIGV4dGVuZHMgSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCB0aW1lKSB7XG4gICAgc3VwZXIoZW50aXR5KTtcbiAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgIHRoaXMuZG9uZVRpbWUgPSAwO1xuICB9XG5cbiAgLy8gbWF5YmUgaW1wbGVtZW50IHVzaW5nIHNldFRpbWVvdXQgP1xuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdGhpcy5kb25lVGltZSArPSBkZWx0YTtcbiAgICBpZiAodGhpcy5kb25lVGltZSA+IHRoaXMudGltZSkge1xuICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZG9uZVRpbWUgLSB0aGlzLnRpbWU7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXN0Sm9iO1xuXG4iLCJpbXBvcnQgUmVzdEpvYiBmcm9tIFwiLi4vbGwvcmVzdFwiO1xuXG5sZXQgam9iID0ge1xuICBqb2JzOiBudWxsLFxuICBwdXNoSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgaWYgKCF0aGlzLmpvYnMpXG4gICAgICB0aGlzLmpvYnMgPSBbXTtcbiAgICBpZiAodGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXSAmJiB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdLnJlYWR5KSB7XG4gICAgICB0aHJvdyBcIkpvYiBpcyByZWFkeSAtIGRvbnQnIHB1c2ghXCI7XG4gICAgfVxuICAgIHRoaXMuam9icy5wdXNoKGpvYik7XG4gICAgaWYgKHRoaXMuZ2V0Q3VycmVudEpvYigpLmluaXQpXG4gICAgICB0aGlzLmdldEN1cnJlbnRKb2IoKS5pbml0KCk7XG4gIH0sXG5cdGdldEN1cnJlbnRKb2I6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuam9ic1t0aGlzLmpvYnMubGVuZ3RoIC0gMV07XG5cdH0sXG4gIHJlc2V0Tm9uSGxKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIHRoaXMuam9icyA9IF8uZmlsdGVyKHRoaXMuam9icywgZnVuY3Rpb24gKGpvYikge1xuICAgICAgICByZXR1cm4gam9iLmFzc2lnbk1lSm9iO1xuICAgICAgfSk7XG4gIH0sXG4gIHJlc2V0Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuam9icyA9IFtdO1xuICB9LFxuICB0aWNrOiBmdW5jdGlvbiAoZGVsdGEpIHtcbiAgICB3aGlsZSAodGhpcy5qb2JzICYmIGRlbHRhID4gMCAmJiB0aGlzLmpvYnMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGpvYiA9IHRoaXMuZ2V0Q3VycmVudEpvYigpO1xuICAgICAgaWYoIShqb2Iub25GcmFtZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiSm9iLm9uRnJhbWUgaXMgbm90IGEgZnVuY3Rpb24gZm9yXCIsam9iKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZGVsdGEgPSBqb2Iub25GcmFtZShkZWx0YSk7XG4gICAgICBpZiAoam9iLnJlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJKT0IgSVMgUkVBRFlcIiwgam9iLCBqb2IubW9kZSwgdGhpcy5qb2JzLCB0aGlzLmpvYnMubGVuZ3RoKVxuICAgICAgICBpZiAoam9iLmFzc2lnbk1lSm9iKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJKT0IgUkVBRFkhISFcIiwgdGhpcy5qb2JzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmpvYnMucG9wKCk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiSk9CU1wiLCB0aGlzLmpvYnMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsdGEgPiAwKSB7XG4gICAgICBpZiAodGhpcy5vbk5vSm9iKSB7XG4gICAgICAgIHRoaXMub25Ob0pvYihkZWx0YSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwbGF5QW5pbWF0aW9uOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIC8vRklYTUU6IHNldCBiYWNrIHRvIDIwICg/KVxuICAgIHRoaXMucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLCAyKSk7XG4gICAgdGhpcy5zZXRNZXNoKG5hbWUpO1xuICB9LFxuICBhbmltYXRpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzZXRKb2JzKCk7XG4gIH1cbn07XG5cbmNvbnN0IEpvYiA9ICgpID0+IGpvYjtcblxuZXhwb3J0IHtKb2J9XG5cblxuIiwibGV0IGZvbGxvd2VyID0ge1xuICBjaGVja0Jvc3M6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuYm9zcykge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBtaXhpbk5hbWVzOiBcImhvdXNlXCJcbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiAodGhpcy5ib3NzKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBuYW1lOiB0aGlzLmJvc3NcbiAgICAgIH0pKTtcbiAgICB9XG4gIH0sXG4gIG9uTm9Kb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrQm9zcygpO1xuICAgIGlmICh0aGlzLmJvc3MgJiYgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKVxuICAgICAgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKHRoaXMpO1xuICB9LFxuICBfZmluZFNvbWVCb3NzKHNwZWNzKSB7XG4gICAgaWYgKHRoaXMud29ybGQuc2VhcmNoKSB7XG4gICAgICB2YXIgZiA9IHRoaXMud29ybGQuc2VhcmNoKHNwZWNzLCB0aGlzLnBvcyk7XG4gICAgICBpZiAoZi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBmWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgX2Fzc2lnbkJvc3MoYm9zcykge1xuICAgIHRoaXMuYm9zcyA9IGJvc3M7XG4gICAgaWYgKGJvc3MgIT0gbnVsbCkge1xuICAgICAgdGhpcy5ib3NzLmFkZEZvbGxvd2VyKHRoaXMpO1xuICAgIH1cbiAgfVxufTtcblxuXG5sZXQgRm9sbG93ZXIgPSAoKSA9PiBmb2xsb3dlcjtcbmV4cG9ydCB7Rm9sbG93ZXJ9XG4iLCJjbGFzcyBITEpvYiB7XG4gIGNvbW1vblN0YXJ0KCkge1xuICAgIGlmICghdGhpcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5lbnRpdHkuZm9sbG93ZXJzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIHRoaXMuYXNzaWduTWVKb2IoZSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuYXNzaWduTWVKb2IodGhpcy5lbnRpdHkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIGlmICghdGhpcy5yZWFkeSlcbiAgICAgIGlmICghdGhpcy5jb21tb25TdGFydCgpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiT05GUkFNRVwiLCB0aGlzLnJlYWR5KTtcbiAgICAgICAgdGhpcy5hc3NpZ25NZUpvYih0aGlzLmVudGl0eSk7XG4gICAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHtITEpvYn1cbiIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcblxuY2xhc3MgQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZm9ybUNhY2hlID0ge307XG4gICAgdGhpcy5mb3JtU2l6ZSA9IC0xO1xuICB9XG5cbiAgc29ydChmb2xsb3dlcnMpIHtcbiAgICByZXR1cm4gZm9sbG93ZXJzO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zQ2FjaGVkKGJvc3MsIGkpIHtcbiAgICBpZiAodGhpcy5mb3JtU2l6ZSAhPSBib3NzLmZvbGxvd2Vycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZm9ybVNpemUgPSBib3NzLmZvbGxvd2Vycy5sZW5ndGg7XG4gICAgICB0aGlzLmZvcm1DYWNoZSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZm9ybUNhY2hlW2ldKSB7XG4gICAgICB0aGlzLmZvcm1DYWNoZVtpXSA9IHRoaXMuY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JtQ2FjaGVbaV07XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIGlmIChpID4gMSkge1xuICAgICAgaSArPSAxO1xuICAgIH1cblxuICAgIHZhciByb3cgPSBNYXRoLmZsb29yKGkgLyA1KTtcbiAgICB2YXIgY29sID0gaSAlIDU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoY29sICogZCAtIGQgKiAyLCByb3cgKiBkKTtcbiAgfVxuXG4gIGNvbXB1dGVQb3MoYm9zcywgaSwgYmFzZVBvcykge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmFkZFZlY3RvcnModGhpcy5jb21wdXRlUmVsYXRpdmVQb3NDYWNoZWQoYm9zcywgaSksIGJhc2VQb3MpO1xuICB9XG5cbiAgZ2V0UG9zKGJvc3MsIGZvbGxvd2VyLCBiYXNlUG9zKSB7XG4gICAgaWYgKCFiYXNlUG9zKSB7XG4gICAgICBiYXNlUG9zID0gYm9zcy5wb3M7XG4gICAgfVxuXG4gICAgaWYgKGJvc3MgPT0gZm9sbG93ZXIpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmNvcHkoYmFzZVBvcyk7XG4gICAgfVxuXG4gICAgdmFyIGZvbGxvd2VycyA9IHRoaXMuc29ydChib3NzLmZvbGxvd2Vycyk7XG5cbiAgICB2YXIgaSA9IF8uaW5kZXhPZihmb2xsb3dlcnMsIGZvbGxvd2VyKTtcbiAgICByZXR1cm4gdGhpcy5jb21wdXRlUG9zKGJvc3MsIGksIGJhc2VQb3MpO1xuICB9XG5cbn1cblxuZXhwb3J0IHtCYXNlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0FuZ2xlfSBmcm9tICcuLi9hbmdsZSdcblxudmFyIGxpbmVzID0gWzEwLCAxNCwgMjAsIDQwLCAxMDBdO1xuXG5jbGFzcyBSZXN0IGV4dGVuZHMgQmFzZSB7XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICB2YXIgcm93ID0gbnVsbCwgY2kgPSBpO1xuICAgIHZhciBtYXggPSAwLCBjb3VudDtcbiAgICBfLmZpbmQobGluZXMsIGZ1bmN0aW9uIChsaW5lLCBrKSB7XG4gICAgICBjaSAtPSBsaW5lO1xuICAgICAgbWF4ICs9IGxpbmU7XG4gICAgICBpZiAoY2kgPCAwKSB7XG4gICAgICAgIHJvdyA9IGs7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIC8vIGNvdW50IG9mIHNlZ21lbnRzIGZvciBjdXJyZW50IGNpcmNsZVxuICAgIGNvdW50ID0gbGluZXNbcm93XTtcblxuICAgIC8vIGlmIGN1cnJlbnQgY2lyY2xlIGlzIHRoZSB3aWRlc3QsIHRoZW4gb25seSBzbyBtYW55IHNlZ21lbnRzIGxpa2UgbWVuIGxlZnRcbiAgICBpZiAoYm9zcy5mb2xsb3dlcnMubGVuZ3RoIDwgbWF4KVxuICAgICAgY291bnQgLT0gKG1heCAtIGJvc3MuZm9sbG93ZXJzLmxlbmd0aCk7XG4gICAgdmFyIGFuZ2xlID0gKGkgLyBjb3VudCkgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgcmFkaXVzID0gKHJvdyArIDEpICogMS40O1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihNYXRoLnNpbihhbmdsZSkgKiByYWRpdXMsIE1hdGguY29zKGFuZ2xlKSAqIHJhZGl1cyk7XG4gIH07XG5cbiAgZ2V0RGlyKGJvc3MsIGUpIHtcbiAgICB2YXIgbmV3UG9zID0gdGhpcy5nZXRQb3MoYm9zcywgZSk7XG4gICAgcmV0dXJuIEFuZ2xlLmZyb21WZWN0b3IyKG5ldyBWZWN0b3IyKCkuc3ViVmVjdG9ycyhib3NzLnBvcywgbmV3UG9zKSk7XG4gIH1cblxufVxuXG5leHBvcnQge1Jlc3R9XG4iLCJpbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcblxuY2xhc3MgTnVsbCBleHRlbmRzIEJhc2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoMCwgMCk7XG4gIH1cblxuICBnZXREaXIoYm9zcywgZSkge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmV4cG9ydCB7TnVsbH1cbiIsImltcG9ydCB7QmFzZX0gZnJvbSAnLi9iYXNlJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5jbGFzcyBNb3ZlIGV4dGVuZHMgQmFzZSB7XG5cbiAgY29uc3RydWN0b3IoYW5nbGUpIHtcbiAgICBzdXBlcihhbmdsZSk7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICBpZiAoaSA+PSAyKSB7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgdmFyIHJvdyA9IE1hdGguZmxvb3IoaSAvIDUpO1xuICAgIHZhciBjb2wgPSBpICUgNTtcbiAgICB2YXIgYmxvY2sgPSBNYXRoLmZsb29yKGkgLyAyNSk7XG5cbiAgICB2YXIgeCA9IGNvbCAtIDI7XG4gICAgdmFyIHkgPSByb3cgKyBibG9jaztcblxuICAgIHZhciBhbmdsZSA9IHRoaXMuYW5nbGU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoZCAqIE1hdGguY29zKGFuZ2xlKSAqIHggLSBkICogTWF0aC5zaW4oYW5nbGUpICogeSxcbiAgICAgIGQgKiBNYXRoLnNpbihhbmdsZSkgKiB4ICsgZCAqIE1hdGguY29zKGFuZ2xlKSAqIHkpO1xuICB9O1xuXG4gIGdldERpcihib3NzLCBlKSB7XG4gICAgcmV0dXJuIHRoaXMuYW5nbGU7XG4gIH1cbn1cblxuZXhwb3J0IHtNb3ZlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1Jlc3R9IGZyb20gJy4vcmVzdCdcbmltcG9ydCB7TnVsbH0gZnJvbSAnLi9udWxsJ1xuaW1wb3J0IHtNb3ZlfSBmcm9tICcuL21vdmUnXG5cblxuY29uc3QgRm9ybWF0aW9ucyA9IHtCYXNlLCBNb3ZlLCBOdWxsLCBSZXN0fTtcbmV4cG9ydCB7Rm9ybWF0aW9uc31cbiIsImltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmNsYXNzIE1MUmVzdEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgbGVuZ3RoLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24gJiYgdGhpcy5lbnRpdHkucm90YXRpb24gIT0gdGhpcy5kaXJlY3Rpb24pIHtcbiAgICAgIHRoaXMuZW50aXR5LnJvdGF0aW9uID0gdGhpcy5kaXJlY3Rpb247XG4gICAgICB0aGlzLmVudGl0eS51cGRhdGVNZXNoUG9zKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZW50aXR5Lm1lc2hOYW1lICE9IFwic2l0XCIgJiYgdGhpcy5lbnRpdHkubWVzaE5hbWUgIT0gXCJzaXRkb3duXCIpIHtcbiAgICAgIHRoaXMuZW50aXR5LnBsYXlBbmltYXRpb24oXCJzaXRkb3duXCIpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuZG9uZSkge1xuICAgICAgdGhpcy5lbnRpdHkuc2V0TWVzaChcInNpdFwiKTtcbiAgICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IFJlc3RKb2IodGhpcy5lbnRpdHksIHRoaXMubGVuZ3RoKSk7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG4gIH1cblxufVxuXG5leHBvcnQge01MUmVzdEpvYn07XG4iLCJpbXBvcnQge0hMSm9ifSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBGb3JtYXRpb25zfSBmcm9tIFwiLi4vZm9ybWF0aW9uc1wiO1xuaW1wb3J0IHtNTFJlc3RKb2J9IGZyb20gXCIuLi9tbC9yZXN0XCI7XG5cbmNsYXNzIEhMUmVzdEpvYiBleHRlbmRzIEhMSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBsZW5ndGgsIGZvcm1hdHRlZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgaWYgKGZvcm1hdHRlZCkge1xuICAgICAgdGhpcy5mb3JtYXRpb24gPSBuZXcgRm9ybWF0aW9ucy5SZXN0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZm9ybWF0aW9uID0gbmV3IEZvcm1hdGlvbnMuTnVsbCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzc2lnbk1lSm9iKGUpIHtcbiAgICBpZiAoIXRoaXMuY29tbW9uU3RhcnQoKSkge1xuICAgICAgZS5yZXNldE5vbkhsSm9icygpO1xuICAgICAgdmFyIG5ld1BvcyA9IHRoaXMuZm9ybWF0aW9uLmdldFBvcyh0aGlzLmVudGl0eSwgZSk7XG4gICAgICBpZiAoZS5wb3MuZGlzdGFuY2VUbyhuZXdQb3MpID4gMC4xKSB7XG4gICAgICAgIGUucHVzaEpvYihuZXcgTWxNb3ZlSm9iKGUsIG5ld1BvcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRpciA9IHRoaXMuZm9ybWF0aW9uLmdldERpcih0aGlzLmVudGl0eSwgZSk7XG4gICAgICAgIGUucHVzaEpvYihuZXcgTUxSZXN0Sm9iKGUsIDUsIGRpcikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQge0hMUmVzdEpvYn1cbiIsImltcG9ydCB7SExSZXN0Sm9ifSBmcm9tIFwiLi4vaGwvcmVzdFwiO1xuXG5sZXQgYm9zcyA9IHtcbiAgLy8gaW5pdGlhbGl6ZXJcbiAgcG9zdExvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9sbG93ZXJzKSB7XG4gICAgICAvLyBlYWNoIGVudGl0eSBzaG91bGQgaGF2ZSBpdCdzIGFycmF5XG4gICAgICB0aGlzLmZvbGxvd2VycyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGSVhNRTogcmV0cmlldmUgb2JqZWN0cyBmcm9tIGlkc1xuICAgIH1cbiAgfSxcbiAgZm9sbG93ZXJzOiBudWxsLFxuICAvLyBkZXByZWNhdGVkXG4gIHB1c2hIbEpvYjogZnVuY3Rpb24gKGpvYikge1xuICAgIHRoaXMucHVzaEpvYihqb2IpO1xuICB9LFxuICAvLyBkZXByZWNhdGVkXG4gIGNsZWFySGxKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0Sm9icygpO1xuICB9LFxuICBvbk5vSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvc3MgPSB0aGlzO1xuICAgIGlmICh0aGlzLmJvc3MpXG4gICAgICBib3NzID0gdGhpcy5ib3NzO1xuICAgIGlmIChib3NzICYmIGJvc3MuYXNzaWduTWVKb2IgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgIGJvc3MuYXNzaWduTWVKb2IodGhpcyk7XG4gIH0sXG4gIGdldEhsSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIC8vIHRha2UgbGFzdCBqb2Igd2hpY2ggcHJvdmlkZXMgdGhlIGFzc2lnbk1lSm9iIGZ1bmN0aW9uXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy5qb2JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmICh0aGlzLmpvYnNbaV0uYXNzaWduTWVKb2IgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgICAgICByZXR1cm4gdGhpcy5qb2JzW2ldO1xuICAgICAgfVxuICB9LFxuICBhc3NpZ25NZUpvYjogZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgaGxqb2IgPSB0aGlzLmdldEhsSm9iKCk7XG5cbiAgICBpZiAoIWhsam9iKSB7XG4gICAgICBpZiAodGhpcy5haSkge1xuICAgICAgICB0aGlzLmFpKCk7XG4gICAgICB9XG4gICAgICAvLyB0cnkgYWdhaW5cbiAgICAgIGhsam9iID0gdGhpcy5nZXRIbEpvYigpO1xuICAgICAgaWYgKCFobGpvYikge1xuICAgICAgICB0aGlzLnB1c2hIbEpvYihuZXcgSExSZXN0Sm9iKHRoaXMsIDEwLCB0aGlzLmlzQShcImhlcm9cIikpKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcImJvc3MgLSBObyBobGpvYiBjcmVhdGVkLCByZXN0aW5nIGZvciAxMCBzZWNvbmRzXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChobGpvYikge1xuICAgICAgaGxqb2IuYXNzaWduTWVKb2IoZSk7XG4gICAgfVxuICB9LFxuICBhZGRGb2xsb3dlcjogZnVuY3Rpb24gKGZvbGxvd2VyKSB7XG4gICAgdGhpcy5mb2xsb3dlcnMucHVzaChmb2xsb3dlcik7XG4gIH0sXG4gIGRpc21pc3M6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzID0gdGhpcy5mb2xsb3dlcnMuZmlsdGVyKChjdXJyZW50KSA9PiBjdXJyZW50ICE9PSBmb2xsb3dlcik7XG4gICAgZGVsZXRlIGZvbGxvd2VyLmJvc3M7XG4gICAgZm9sbG93ZXIucmVzZXRKb2JzKCk7XG4gIH1cbn07XG5cbmNvbnN0IEJvc3MgPSAoKSA9PiBib3NzO1xuXG5leHBvcnQge0Jvc3N9XG4iLCJjbGFzcyBTdGF0ZU1hY2hpbmVFeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2UpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuXG5jbGFzcyBTdGF0ZU1hY2hpbmUge1xuICBjb25zdHJ1Y3RvcihzdGFydFN0YXRlKSB7XG4gICAgdGhpcy5tb2RlID0gc3RhcnRTdGF0ZTtcbiAgICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gIH1cblxuICBzZXRGaW5pc2hlZCgpIHtcbiAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICBsZXQgZG9uZSA9IGZhbHNlO1xuICAgIGRvIHtcbiAgICAgIGlmICghKHRoaXNbdGhpcy5tb2RlXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgU3RhdGVNYWNoaW5lRXhjZXB0aW9uKFwiTU9ERSBcIiArIHRoaXMubW9kZSArIFwiIG5vdCBmb3VuZCBmb3IgY2xhc3MgXCIrdHlwZW9mKHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGRvbmUgPSB0aGlzW3RoaXMubW9kZV0oZGVsdGEpO1xuICAgICAgY29uc29sZS5sb2coXCJET05FXCIsIGRvbmUsIHRoaXMubW9kZSwgdGhpcyk7XG4gICAgfSB3aGlsZSAoIWRvbmUgJiYgIXRoaXMucmVhZHkpO1xuICAgIHJldHVybiAwOyAvLyBhbHdheXMgZWF0IHVwIHRoZSBkZWx0YVxuICB9XG59XG5cbmV4cG9ydCB7U3RhdGVNYWNoaW5lfVxuIiwiaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcbmltcG9ydCB7TWxNb3ZlfSBmcm9tIFwiLi9tb3ZlXCI7XG5pbXBvcnQge1N0YXRlTWFjaGluZX0gZnJvbSBcIi4vc3RhdGUtbWFjaGluZVwiO1xuXG5jbGFzcyBNbEludmVudCBleHRlbmRzIFN0YXRlTWFjaGluZSB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgcmVzb3VyY2UsIGhvbWVFbnRpdHkpIHtcbiAgICBzdXBlcihcImNvbWVIb21lXCIpXG4gICAgY29uc29sZS5kZWJ1ZyhcImludmVudCAtIG1sIFwiLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMuaG9tZUVudGl0eSA9IGhvbWVFbnRpdHk7XG4gICAgdGhpcy5yZXNvdXJjZSA9IHJlc291cmNlO1xuICB9XG5cbiAgY29tZUhvbWUoKSB7XG4gICAgdGhpcy5lbnRpdHkucHVzaEpvYih0aGlzLmNyZWF0ZU1vdmVKb2IoKSk7XG4gICAgdGhpcy5tb2RlID0gXCJwcm9kdWNlXCI7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcm9kdWNlKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcnVsZSA9IHRoaXMuaG9tZUVudGl0eS5wcm9kdWN0aW9uW3RoaXMucmVzb3VyY2VdO1xuICAgIHZhciBvayA9IHRydWU7XG4gICAgXy5lYWNoKHJ1bGUsIGZ1bmN0aW9uIChhbW91bnQsIHNvdXJjZVJlc291cmNlKSB7XG4gICAgICBpZiAoIXNlbGYuaG9tZUVudGl0eS50YWtlKHNvdXJjZVJlc291cmNlLCBhbW91bnQpKVxuICAgICAgICBvayA9IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChvaykge1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYih0aGlzLmNyZWF0ZVJlc3RKb2IoKSk7XG4gICAgICBpZiAodGhpcy5ob21lRW50aXR5LmluY1Ntb2tlKSB7XG4gICAgICAgIHRoaXMuaG9tZUVudGl0eS5pbmNTbW9rZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2RlID0gXCJwcm9kdWN0aW9uRmluaXNoZWRcIjtcbiAgICAgIGNvbnNvbGUubG9nKFwicHJvZHVjdGlvbkZpbmlzaGVkIHNldCBtb2RlIHJldHVybiB0cnVlXCIpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJwcm9kdWN0aW9uRmluaXNoZWQgcmVzb3VyY2VzIGxvc3RcIilcbiAgICAgIC8vIHNvdXJjZSByZXNvdXJjZXMgZ290IGxvc3QgOi0oXG4gICAgICB0aGlzLnNldEZpbmlzaGVkKClcbiAgICB9XG5cdFx0cmV0dXJuIHRydWU7XG4gIH1cblxuICBwcm9kdWN0aW9uRmluaXNoZWQoKSB7XG4gICAgY29uc29sZS5kZWJ1ZyhcImludmVudCAtIHByb2R1Y3Rpb25GaW5pc2hlZFwiLCB0aGlzLnJlc291cmNlLCAxKTtcbiAgICB0aGlzLmhvbWVFbnRpdHkuaW5jcmVhc2VCeSh0aGlzLnJlc291cmNlLCAxKTtcbiAgICBpZiAodGhpcy5ob21lRW50aXR5LmRlY1Ntb2tlKSB7XG4gICAgICB0aGlzLmhvbWVFbnRpdHkuZGVjU21va2UoKTtcbiAgICB9XG4gICAgdGhpcy5zZXRGaW5pc2hlZCgpO1xuXHRcdGNvbnNvbGUubG9nKFwiTWxJbnZlbnQgc2hvdWxkIGJlIHJlYWR5XCIpO1xuICAgIHRoaXMubW9kZSA9IFwid3JvbmdcIlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY3JlYXRlUmVzdEpvYigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3RKb2IodGhpcy5lbnRpdHksIDMpO1xuICB9XG5cbiAgY3JlYXRlTW92ZUpvYigpIHtcbiAgICByZXR1cm4gbmV3IE1sTW92ZSh0aGlzLmVudGl0eSwgdGhpcy5ob21lRW50aXR5LnBvcyk7XG4gIH1cbn1cblxuZXhwb3J0IHsgTWxJbnZlbnR9O1xuIiwiaW1wb3J0IHtNbEludmVudH0gZnJvbSBcIi4uL21sL2ludmVudFwiO1xuXG5jbGFzcyBIbEludmVudEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSkge1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMucHJvZHVjYWJsZSA9IEhsSW52ZW50Sm9iLmFwcGx5YWJsZTtcbiAgfVxuXG4gIHN0YXRpYyBhcHBseWFibGUoZSwgbmVlZGVkKSB7XG4gICAgbGV0IHByb2R1Y2FibGUgPSBfLmZpbHRlcihuZWVkZWQsIGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgICAgaWYgKGUucHJvZHVjdGlvbikge1xuICAgICAgICB2YXIgb2sgPSB0cnVlO1xuICAgICAgICB2YXIgcHJlcmVxID0gZS5wcm9kdWN0aW9uW3Jlc291cmNlXTtcbiAgICAgICAgaWYgKCFwcmVyZXEpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKHByZXJlcSwgZnVuY3Rpb24gKGFtb3VudCwgcmVzKSB7XG5cbiAgICAgICAgICBpZiAoIWUucmVzb3VyY2VzW3Jlc10gfHwgZS5yZXNvdXJjZXNbcmVzXSA8IGFtb3VudCkge1xuICAgICAgICAgICAgb2sgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAob2spXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHByb2R1Y2FibGUubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIF8uc2FtcGxlKHByb2R1Y2FibGUpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhc3NpZ25NZUpvYihlKSB7XG4gICAgY29uc29sZS5sb2coXCJhc3NpZ24gbWUgam9iIFwiLGUsIHRoaXMpXG4gICAgdmFyIHJlcyA9IHRoaXMucHJvZHVjYWJsZSh0aGlzLmVudGl0eSwgdGhpcy5lbnRpdHkucmVzb3VyY2VzTmVlZGVkKCkpO1xuICAgIGlmIChyZXMpIHtcbiAgICAgIGUucHVzaEpvYihuZXcgTWxJbnZlbnQoZSwgcmVzLCB0aGlzLmVudGl0eSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVudGl0eS5jbGVhckhsSm9iKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB7IEhsSW52ZW50Sm9iIH1cbiIsImltcG9ydCB7TW92ZX0gZnJvbSBcIi4uL2xsL21vdmVcIjtcbmltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmNsYXNzIE1sRmV0Y2hKb2Ige1xuICAgY29uc3RydWN0b3IoZW50aXR5LCByZXNvdXJjZSwgdGFyZ2V0RW50aXR5LCBob21lRW50aXR5KSB7XG4gICAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICAgIHRoaXMuaG9tZUVudGl0eSA9IGhvbWVFbnRpdHk7XG4gICAgICB0aGlzLnJlc291cmNlID0gcmVzb3VyY2U7XG4gICAgICB0aGlzLmFtb3VudCA9IDE7XG4gICAgICB0aGlzLnRhcmdldEVudGl0eSA9IHRhcmdldEVudGl0eTtcbiAgICAgIHRoaXMubWx0YXJnZXRQb3MgPSB0aGlzLnRhcmdldEVudGl0eS5wb3M7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiZnJvbVBvc1wiLGVudGl0eS5wb3MpO1xuICAgICAgdGhpcy5mcm9tUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKS5jb3B5KGVudGl0eS5wb3MpO1xuICAgICAgY29uc29sZS5kZWJ1ZyhcImZyb21Qb3NcIixlbnRpdHkucG9zLHRoaXMuZnJvbVBvcyk7XG4gICAgICB0aGlzLm1vZGU9XCJnb3RvVGFyZ2V0XCI7XG4gICAgICB0aGlzLmNvbGxlY3REaXN0YW5jZT0xO1xuICAgIH1cblxuICAgIGdvdG9UYXJnZXQoKSB7XG4gICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLm1sdGFyZ2V0UG9zLmRpc3RhbmNlVG8odGhpcy5lbnRpdHkucG9zKTtcbiAgICAgIGlmKGRpc3RhbmNlPD10aGlzLmNvbGxlY3REaXN0YW5jZSswLjEpIHtcbiAgICAgICAgdGhpcy5tb2RlPVwiY29sbGVjdFRoaW5nc1wiO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgTW92ZSh0aGlzLmVudGl0eSx0aGlzLm1sdGFyZ2V0UG9zLHRoaXMuY29sbGVjdERpc3RhbmNlKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbGxlY3RUaGluZ3MoKSB7XG4gICAgICAvLyBGSVhNRTogc2VsZWN0IHBpY2sgb3IgYXhlIG9yIG5vdGhpbmcgZGVwZW5kaW5nIG9uIHJlc291cmNlXG4gICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwiYXhlXCIpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLmVudGl0eSwzKSk7IC8vbmV3TGxKb2IoXCJyZXN0XCIsMyk7XG4gICAgICB0aGlzLm1vZGU9XCJnb0JhY2tcIjtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRha2UoKSB7XG4gICAgICB0aGlzLnRhcmdldEVudGl0eS5naXZlKHRoaXMucmVzb3VyY2UsdGhpcy5hbW91bnQsdGhpcy5lbnRpdHkpO1xuICAgIH1cblxuICAgIGdvQmFjaygpIHtcbiAgICAgIHRoaXMudGFrZSgpO1xuICAgICAgLy9GSVhNRTogcGljayBjb3JyZWN0IG1lc2hcbiAgICAgIHRoaXMuZW50aXR5LnNldE1lc2goXCJ3YWxrXCIpO1xuICAgICAgLy90aGlzLmVudGl0eS5uZXdMbEpvYihcIm1vdmVcIix0aGlzLmZyb21Qb3MpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgTW92ZSh0aGlzLmVudGl0eSx0aGlzLmhvbWVFbnRpdHkucG9zKSk7XG4gICAgICB0aGlzLm1vZGU9XCJnaXZlXCI7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBnaXZlKCkge1xuICAgICAgdGhpcy5yZWFkeT10cnVlO1xuICAgICAgaWYodGhpcy5ob21lRW50aXR5KVxuICAgICAgICB0aGlzLmVudGl0eS5naXZlKHRoaXMucmVzb3VyY2UsdGhpcy5hbW91bnQsdGhpcy5ob21lRW50aXR5KTtcbiAgICB9XG5cbiAgICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgICB2YXIgZG9uZT1mYWxzZTtcbiAgICAgIGRvIHtcbiAgICAgIGlmKCF0aGlzW3RoaXMubW9kZV0pXG4gICAgICBjb25zb2xlLmRlYnVnKFwiTU9ERSBcIix0aGlzLm1vZGUsIFwibm90IGZvdW5kXCIpO1xuICAgICAgICBkb25lPXRoaXNbdGhpcy5tb2RlXSgpO1xuICAgICAgfSB3aGlsZSghZG9uZSAmJiAhdGhpcy5yZWFkeSk7XG4gICAgICByZXR1cm4gZGVsdGE7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IHsgTWxGZXRjaEpvYn1cblxuIiwiaW1wb3J0IHtITEpvYn0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcbmltcG9ydCB7TUxSZXN0Sm9ifSBmcm9tIFwiLi4vbWwvcmVzdFwiO1xuaW1wb3J0IHtNbEZldGNoSm9ifSBmcm9tIFwiLi4vbWwvZmV0Y2hcIjtcblxuY2xhc3MgSGxGZXRjaEpvYiBleHRlbmRzIEhMSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBjb3VudCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5jb3VudCA9IGNvdW50IHx8IDM7XG4gIH07XG5cbiAgc2VsZWN0UmVzb3VyY2VUb0dldCgpIHtcbiAgICB2YXIgbmVlZGVkID0gXy5zaHVmZmxlKHRoaXMuZW50aXR5LnJlc291cmNlc05lZWRlZCgpKTtcbiAgICByZXR1cm4gbmVlZGVkWzBdO1xuICB9XG5cbiAgbmV4dEVudGl0eUZvclJlc291cmNlKHNlbGVjdGVkUmVzb3VyY2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuZW50aXR5LndvcmxkLnNlYXJjaChmdW5jdGlvbiAoZSkge1xuICAgICAgcmV0dXJuIGUucmVzb3VyY2VzICYmIGUucmVzb3VyY2VzW3NlbGVjdGVkUmVzb3VyY2VdID4gMCAmJiBlICE9IHNlbGYuZW50aXR5ICYmIGUucHJvdmlkZXMgJiYgXy5pbmNsdWRlcyhlLnByb3ZpZGVzLCBzZWxlY3RlZFJlc291cmNlKTtcbiAgICB9LCB0aGlzLmVudGl0eS5wb3MpWzBdO1xuICB9O1xuXG4gIGFzc2lnbk1lSm9iKGUpIHtcbiAgICBpZiAoIWUuaXNBKFwiZm9sbG93ZXJcIikpIHtcbiAgICAgIGUucHVzaEpvYihuZXcgUmVzdEpvYihlLCAxMCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY291bnQgLT0gMTtcbiAgICB2YXIgc2VsZWN0ZWRSZXNvdXJjZSA9IHRoaXMuc2VsZWN0UmVzb3VyY2VUb0dldCgpO1xuICAgIGlmIChzZWxlY3RlZFJlc291cmNlKSB7XG4gICAgICB2YXIgbmV4dEVudGl0eSA9IHRoaXMubmV4dEVudGl0eUZvclJlc291cmNlKHNlbGVjdGVkUmVzb3VyY2UpO1xuICAgICAgaWYgKG5leHRFbnRpdHkpIHtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBNbEZldGNoSm9iKGUsIHNlbGVjdGVkUmVzb3VyY2UsIG5leHRFbnRpdHksIHRoaXMuZW50aXR5KSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJmZXRjaCAtIE5PIG5leHRlbnRpdHkgZm91bmQgZm9yIFwiLCBzZWxlY3RlZFJlc291cmNlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZS5wdXNoSm9iKG5ldyBNTFJlc3RKb2IoZSwgMSwgMCkpO1xuICAgIGlmICh0aGlzLmNvdW50IDw9IDApIHtcbiAgICAgIHRoaXMuZW50aXR5LmNsZWFySGxKb2IoKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCB7SGxGZXRjaEpvYn1cbiIsImltcG9ydCB7SGxJbnZlbnRKb2J9IGZyb20gJy4uL2hsL2ludmVudCc7XG5pbXBvcnQge0hsRmV0Y2hKb2J9IGZyb20gJy4uL2hsL2ZldGNoJztcblxubGV0IGhvdXNlID0ge1xuICAvLyBGSVhNRTogbWF5YmUgbW92ZSB0aGlzIHRvIG90aGVyIG1peGluL2NsYXNzIC0gbWF5IGJlIHVzZWQgYnkgaGVybyB0b29cbiAgcmVzb3VyY2VzTmVlZGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRlZClcbiAgICAgIHJldHVybiBbXTtcbiAgICB2YXIgY3VycmVudGx5TmVlZGVkID0gW107XG4gICAgY29uc29sZS5sb2coXCJORURERURcIiwgdGhpcy5uZWVkZWQpO1xuICAgIGZvciAodmFyIGsgaW4gdGhpcy5uZWVkZWQpIHtcbiAgICAgIHZhciB2ID0gdGhpcy5uZWVkZWRba107XG4gICAgICB2YXIgdGltZXMgPSB2IC0gKHRoaXMucmVzb3VyY2VzW2tdIHx8IDApO1xuICAgICAgaWYgKHRpbWVzID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbWVzOyBpKyspIHtcbiAgICAgICAgICBjdXJyZW50bHlOZWVkZWQucHVzaChrKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3VycmVudGx5TmVlZGVkO1xuICB9LFxuXG4gIGFpOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5lZWRlZCA9IHRoaXMucmVzb3VyY2VzTmVlZGVkKCk7XG5cbiAgICBpZiAobmVlZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICh0aGlzLmludmVudEFwcGx5YWJsZShuZWVkZWQpKSB7XG4gICAgICAgIHRoaXMucHVzaEhsSm9iKHRoaXMuY3JlYXRlSW52ZW50Sm9iKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoSGxKb2IodGhpcy5jcmVhdGVGZXRjaEpvYigpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGludmVudEFwcGx5YWJsZTogZnVuY3Rpb24obmVlZGVkKSB7XG4gICAgcmV0dXJuIEhsSW52ZW50Sm9iLmFwcGx5YWJsZSh0aGlzLCBuZWVkZWQpO1xuICB9LFxuICBjcmVhdGVJbnZlbnRKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IEhsSW52ZW50Sm9iKHRoaXMpO1xuICB9LFxuICBjcmVhdGVGZXRjaEpvYjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgSGxGZXRjaEpvYih0aGlzKTtcbiAgfSxcbiAgYWRkRm9sbG93ZXI6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzLnB1c2goZm9sbG93ZXIpO1xuICB9XG59O1xuXG5sZXQgSG91c2UgPSAoKSA9PiBob3VzZTtcbmV4cG9ydCB7SG91c2V9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgfSxcbiAgXCJjcm9wXCI6IHtcbiAgICBcIm1lc2hOYW1lXCI6IFwidGlueVwiLFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiaGlnaFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfaGlnaFwiXG4gICAgICB9LFxuICAgICAgXCJtZWRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJjcm9wX21lZFwiXG4gICAgICB9LFxuICAgICAgXCJzbWFsbFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3Bfc21hbGxcIlxuICAgICAgfSxcbiAgICAgIFwidGlueVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfdGlueVwiXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1pbGxcIjoge1xuICB9LFxuICBcIm1pbmVcIjoge1xuICB9LFxuICBcImZhcm1cIjoge1xuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwid2F0ZXJcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3YXRlclwiOiAxMDBcbiAgICB9XG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIlxuICAgIF1cbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMSxcbiAgICAgIFwidG9vbFwiOiAxMFxuICAgIH0sXG4gICAgXCJwcm9kdWN0aW9uXCI6IHtcbiAgICAgIFwidG9vbFwiOiB7XG4gICAgICAgIFwid29vZFwiOiAxLFxuICAgICAgICBcInN0b25lXCI6IDFcbiAgICAgIH1cbiAgICB9LFxuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIixcbiAgICAgIFwic21va2VcIlxuICAgIF1cbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJoZXJvXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJwbGF5ZXJcIixcbiAgICBdXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIlxuICAgIF1cbiAgfSxcbiAgXCJtYW5cIjoge1xuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdFwiXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdGRvd25cIlxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJmaWdodFwiXG4gICAgICB9LFxuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJwaWNrXCJcbiAgICAgIH0sXG4gICAgICBcImF4ZVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJheGVcIlxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiZm9sbG93ZXJcIlxuICAgIF1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3b29kXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwid29vZFwiOiA1XG4gICAgfVxuICB9LFxuICBcInRyZWVcIjoge1xuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcInN0b25lXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwic3RvbmVcIjogMjBcbiAgICB9XG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImFuaW1hbFwiXG4gICAgXSxcbiAgICBcInNwZWVkXCI6IDAuNSxcbiAgICBcIm1lc2hlc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEVudGl0eSB9IGZyb20gJy4vZW50aXR5J1xuaW1wb3J0IE1vZGVsTG9hZGVyIGZyb20gJy4uL2Jhc2UzZC9tb2RlbF9sb2FkZXInXG5pbXBvcnQgKiBhcyBNaXhpbiBmcm9tIFwiLi9taXhpblwiXG5pbXBvcnQgRW50aXR5VHlwZXMgZnJvbSAnLi4vY29uZmlnL2VudGl0aWVzJ1xuXG5cbmNsYXNzIFdvcmxkTG9hZGVyIHtcbiAgbG9hZCh3b3JsZCwgZGF0YSwgb3BzKSB7XG4gICAgbGV0IGJhc2ljT3BzID0gT2JqZWN0LmFzc2lnbih7fSwgb3BzKTtcblxuICAgIGlmICghYmFzaWNPcHMubW9kZWxMb2FkZXIpIHtcbiAgICAgIGJhc2ljT3BzLm1vZGVsTG9hZGVyID0gbmV3IE1vZGVsTG9hZGVyKCk7XG4gICAgfVxuICAgIGlmICghYmFzaWNPcHMubWl4aW5EZWZzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk1JWElOIERFRlNcIiwgTWl4aW4pXG4gICAgICBiYXNpY09wcy5taXhpbkRlZnMgPSBNaXhpbjtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5lbnRpdHlUeXBlcykge1xuICAgICAgYmFzaWNPcHMuZW50aXR5VHlwZXMgPSBFbnRpdHlUeXBlcztcbiAgICB9XG5cbiAgICBkYXRhLmZvckVhY2goZW50aXR5RGVmaW5pdGlvbiA9PlxuICAgICAgd29ybGQucHVzaChuZXcgRW50aXR5KHdvcmxkLm1hcCwgT2JqZWN0LmFzc2lnbih7fSwgYmFzaWNPcHMsIGVudGl0eURlZmluaXRpb24pKSlcbiAgICApO1xuICAgIHdvcmxkLmVudGl0aWVzLmZvckVhY2goZW50aXR5ID0+IGVudGl0eS5wb3N0TG9hZCAmJiBlbnRpdHkucG9zdExvYWQoKSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZExvYWRlclxuIiwiaW1wb3J0IFdvcmxkIGZyb20gXCIuLi9nYW1lL3dvcmxkXCI7XG5pbXBvcnQgSGVpZ2h0TWFwIGZyb20gXCIuLi9nYW1lL2hlaWdodG1hcFwiO1xuaW1wb3J0IGFqYXggZnJvbSBcIi4uL2FqYXhcIlxuaW1wb3J0IFdvcmxkTG9hZGVyIGZyb20gXCIuLi9nYW1lL3dvcmxkLWxvYWRlclwiXG5cbmNsYXNzIFdvcmxkRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gICAgY29uc3RydWN0b3Iod29ybGQpIHtcbiAgICAgICAgc3VwZXIoXCJ3b3JsZFwiKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IHdvcmxkXG4gICAgfVxufVxuXG5jbGFzcyBBZ1dvcmxkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLm1hcCA9IG5ldyBIZWlnaHRNYXAoKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IG5ldyBXb3JsZCh0aGlzLm1hcCk7XG5cbiAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwibG9hZFwiKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkV29ybGQodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKS50aGVuKHRoaXMuaW5mb3JtLmJpbmQodGhpcykpXG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudFt0aGlzLmV4cG9zZU5hbWVdID0gdGhpcy53b3JsZDtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgZGVsZXRlIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV1cbiAgICB9XG5cbiAgICBpbmZvcm0oKSB7XG4gICAgICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbChcIipbaW5qZWN0LXdvcmxkXVwiKS5mb3JFYWNoKGUgPT5cbiAgICAgICAgICAgIGUuZGlzcGF0Y2hFdmVudChuZXcgV29ybGRFdmVudCh0aGlzLndvcmxkKSkpXG4gICAgfVxuXG4gICAgbG9hZFdvcmxkKHVybCkge1xuICAgICAgICByZXR1cm4gYWpheCh1cmwpLnRoZW4oZGF0YSA9PlxuICAgICAgICAgICAgbmV3IFdvcmxkTG9hZGVyKCkubG9hZCh0aGlzLndvcmxkLCBkYXRhKVxuICAgICAgICApXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctd29ybGQnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctd29ybGQnLCBBZ1dvcmxkKTtcbn1cblxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9nYW1lL2hsL3Jlc3RcIjtcblxuY2xhc3MgQWdFbnRpdHlWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXHRzdGF0aWMgcHJlc2VudEVudGl0eShlbnRpdHkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZU5hbWU6IGVudGl0eS50eXBlTmFtZSxcblx0XHRcdHBvczoge1xuXHRcdFx0XHR4OiBlbnRpdHkucG9zLngsXG5cdFx0XHRcdHk6IGVudGl0eS5wb3MueVxuXHRcdFx0fSxcblx0XHRcdHJlc291cmNlczogQWdFbnRpdHlWaWV3LnByZXNlbnRSZXNvdXJjZXMoZW50aXR5LnJlc291cmNlcylcblx0XHR9O1xuXHR9XG5cblx0c3RhdGljIHByZXNlbnRSZXNvdXJjZXMocmVzb3VyY2VzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gW107XG5cdFx0Zm9yICh2YXIga2V5IGluIHJlc291cmNlcykge1xuXHRcdFx0cmVzdWx0LnB1c2goe25hbWU6IGtleSwgdmFsdWU6IHJlc291cmNlc1trZXldfSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHR0aGlzLnRlbXBsYXRlID0gdGhpcy5pbm5lckhUTUw7XG5cdFx0dGhpcy5jaGFuZ2VkKG51bGwpO1xuXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcblx0XHR0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcblx0XHRpZiAodGhpcy5saXN0ZW5lcikge1xuXHRcdFx0dGhpcy5saXN0ZW5lci5yZW1vdmUoKVxuXHRcdH1cblx0XHRpZiAodGhpcy5yZWRyYXdlcikge1xuXHRcdFx0dGhpcy5yZWRyYXdlci5yZW1vdmUoKVxuXHRcdH1cblx0fVxuXG5cdHdvcmxkQ3JlYXRlZChldikge1xuXHRcdHRoaXMud29ybGQgPSBldi53b3JsZDtcblx0XHRjb25zdCBldmVudG5hbWUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImV2ZW50XCIpID09PSBcImhvdmVyZWRcIiA/IFwiaG92ZXJlZFwiIDogXCJzZWxlY3RlZFwiO1xuXHRcdHRoaXMuZXZlbnRuYW1lID0gZXZlbnRuYW1lO1xuXHRcdHRoaXMubGlzdGVuZXIgPSB0aGlzLndvcmxkW2V2ZW50bmFtZV0uc3Vic2NyaWJlKHRoaXMuY2hhbmdlZC5iaW5kKHRoaXMpKVxuXHR9XG5cblx0Y2hhbmdlZChlbnRpdHkpIHtcblx0XHRpZiAodGhpcy5lbnRpdHkgIT09IGVudGl0eSkge1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKHRoaXMuZW50aXR5KTtcblxuXHRcdFx0dGhpcy5lbnRpdHkgPSBlbnRpdHk7XG5cdFx0XHRpZiAodGhpcy5lbnRpdHkpIHtcblx0XHRcdFx0dGhpcy5yZWRyYXcoKVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5zdGFydExpc3RlbmluZyh0aGlzLmVudGl0eSlcblx0XHR9XG5cdFx0aWYgKHRoaXMuZW50aXR5KSB7XG5cdFx0XHR0aGlzLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblx0XHR9XG5cdH1cblxuXHRyZWRyYXcoKSB7XG5cdFx0dGhpcy5pbm5lckhUTUwgPSBtdXN0YWNoZS5yZW5kZXIodGhpcy50ZW1wbGF0ZSwgQWdFbnRpdHlWaWV3LnByZXNlbnRFbnRpdHkodGhpcy5lbnRpdHkpKTtcblx0XHRjb25zdCBidXR0b25SZXN0ID0gdGhpcy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiYnV0dG9uLXJlc3RcIilbMF07XG5cdFx0aWYgKGJ1dHRvblJlc3QpIHtcblx0XHRcdGJ1dHRvblJlc3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMucmVzdC5iaW5kKHRoaXMpKVxuXHRcdH1cblx0XHR0aGlzLmNsYXNzTGlzdC5yZW1vdmUoXCJ0ZW1wbGF0ZWRcIilcblx0fVxuXG5cdHJlc3QoKSB7XG5cdFx0dGhpcy5lbnRpdHkucmVzZXRKb2JzKCk7XG5cdFx0dGhpcy5lbnRpdHkucHVzaEpvYihuZXcgSExSZXN0Sm9iKHRoaXMuZW50aXR5LCAwLCBmYWxzZSkpO1xuXHRcdGNvbnNvbGUubG9nKFwiUkVTVFwiKVxuXHR9XG5cblx0c3RhcnRMaXN0ZW5pbmcoZW50aXR5KSB7XG5cdFx0Y29uc29sZS5sb2coXCJTVEFSVFwiLCBlbnRpdHkpXG5cdFx0aWYoZW50aXR5KSB7XG5cdFx0XHR0aGlzLnJlZHJhd2VyID0gZW50aXR5LmNoYW5nZWQuc3Vic2NyaWJlKCB0aGlzLnJlZHJhdy5iaW5kKHRoaXMpKTtcblx0XHR9XG5cdH1cblxuXHRzdG9wTGlzdGVuaW5nKGVudGl0eSkge1xuXHRcdGlmKHRoaXMucmVkcmF3ZXIpIHtcblx0XHRcdHRoaXMucmVkcmF3ZXIucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLnJlZHJhd2VyID0gbnVsbDtcblx0XHR9XG5cdH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWVudGl0eS12aWV3JykpIHtcblx0Y3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1lbnRpdHktdmlldycsIEFnRW50aXR5Vmlldyk7XG59XG5cbiIsImNsYXNzIEFnRnVsbHNjcmVlbiBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLmVuYWJsZUZ1bGxzY3JlZW4uYmluZCh0aGlzKSlcbiAgfVxuXG4gIGVuYWJsZUZ1bGxzY3JlZW4oKSB7XG4gICAgbGV0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiYm9keVwiKTtcbiAgICBpZihlbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBlbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmKGVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgIGVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYoZWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZihlbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctZnVsbHNjcmVlbicpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZnVsbHNjcmVlbicsIEFnRnVsbHNjcmVlbik7XG59XG4iXSwibmFtZXMiOlsiY2xvY2siLCJKb2IiLCJNb3ZlIl0sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFNLEtBQUssU0FBUyxXQUFXLENBQUM7QUFDaEMsSUFBSSxpQkFBaUIsR0FBRztBQUN4QixRQUFRLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakMsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3RCxRQUFRLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDM0QsUUFBUSxJQUFJLENBQUMsVUFBVSxHQUFFO0FBQ3pCLEtBQUs7QUFDTDtBQUNBLElBQUksbUJBQW1CLEdBQUc7QUFDMUIsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFD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USxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDN0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDN0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEUsSUFBSSxRQUFRLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckUsSUFBSSxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JILElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFJO0FBQ3pCLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxZ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M0IsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUMzQixVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbEIsT0FBTztBQUNQLEtBQUs7QUFDTCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQztBQUNBLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ25ELFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM1QyxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFDN0csUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUM1QixPQUFPO0FBQ1AsS0FBSztBQUNMLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLElBQUksT0FBTyxNQUFNLENBQUM7QUFDbEIs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

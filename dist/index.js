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
    const touch =e.targetTouches;
    this.touches[0]={x:touch.clientX, y:touch.clientY};
  }

  touchend(e) {
    delete this.touches[0];
    console.log("touchend",e);
  }

  touchmove(e) {
    console.log("touchmove",e);
    const width = this.offsetWidth;
    const height = this.offsetHeight;
    const x = e.targetTouches[0].clientX-this.touches[0].x;
    const y = e.targetTouches[0].clientY-this.touches[0].y;
    console.log("XXXX",y,x,width,height,JSON.stringify(this.touches));
    this.move({x:x/width, y:y/height});
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
    this.resources[what] = (this.resources[what] || 0) + amount;
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
      if(!(job.onFrame instanceof Function)) {
        console.error("Job.onFrame is not a function for",job);
        return;
      }
      delta = job.onFrame(delta);
      if (job.ready) {
        console.error("JOB IS READY", job);
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
    var done = false;
    do {
      if (!(this[this.mode] instanceof Function)) {
        throw new StateMachineException("MODE " + this.mode + "not found");
      }
      done = this[this.mode]();
      console.log("DONE",done, this.mode);
    } while (!done && !this.ready);
    return delta;
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
      return true;
    } else {
      // source resources got lost :-(
      this.setFinished();
    }
  }

  productionFinished() {
    console.debug("invent - productionFinished", this.resource, 1);
    if (this.homeEntity.decSmoke) {
      this.homeEntity.decSmoke();
    }
    this.homeEntity.increaseBy(this.resource, 1);
    this.ready = true;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvbGwvam9iLmpzIiwic3JjL2dhbWUvdmVjdG9yMi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL21sL21vdmUuanMiLCJzcmMvZ2FtZS93b3JsZC5qcyIsInNyYy9nYW1lL2hlaWdodG1hcC5qcyIsInNyYy9hamF4LmpzIiwic3JjL2dhbWUvZW50aXR5LmpzIiwic3JjL2NvbmZpZy9tZXNoZXMuanMiLCJzcmMvYmFzZTNkL21vZGVsLmpzIiwic3JjL2Jhc2UzZC9tb2RlbF9sb2FkZXIuanMiLCJzcmMvZ2FtZS9taXhpbnMvYW5pbWFsLmpzIiwic3JjL2dhbWUvbGwvcmVzdC5qcyIsInNyYy9nYW1lL21peGlucy9qb2IuanMiLCJzcmMvZ2FtZS9taXhpbnMvZm9sbG93ZXIuanMiLCJzcmMvZ2FtZS9obC9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9yZXN0LmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9udWxsLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9tb3ZlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9pbmRleC5qcyIsInNyYy9nYW1lL21sL3Jlc3QuanMiLCJzcmMvZ2FtZS9obC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2Jvc3MuanMiLCJzcmMvZ2FtZS9tbC9zdGF0ZS1tYWNoaW5lLmpzIiwic3JjL2dhbWUvbWwvaW52ZW50LmpzIiwic3JjL2dhbWUvaGwvaW52ZW50LmpzIiwic3JjL2dhbWUvbWwvZmV0Y2guanMiLCJzcmMvZ2FtZS9obC9mZXRjaC5qcyIsInNyYy9nYW1lL21peGlucy9ob3VzZS5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS93b3JsZC1sb2FkZXIuanMiLCJzcmMvZWxlbWVudHMvYWctd29ybGQuanMiLCJzcmMvZWxlbWVudHMvYWctZW50aXR5LXZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZnVsbHNjcmVlbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBJbnRybyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9IC0xO1xuICAgICAgICB0aGlzLnNjcmVlbnMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnRyby1zY3JlZW5cIik7XG4gICAgICAgIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIgPSB0aGlzLm5leHRTY3JlZW4uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm5leHRTY3JlZW4oKVxuICAgIH1cblxuICAgIGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMudW5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgIH1cblxuICAgIGJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVuYmluZEV2ZW50KHNjcmVlbikge1xuICAgICAgICBpZihzY3JlZW4pIHtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKTtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV4dFNjcmVlbihldikge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgaWYodGhpcy5jdXJyZW50X3NjcmVlbiA9PSB0aGlzLnNjcmVlbnMubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2ZpbmlzaGVkJykpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5nZXRBdHRyaWJ1dGUoJ29uZmluaXNoZWQnKSlcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIixlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1cnJlbnRfc2NyZWVuID0gKHRoaXMuY3VycmVudF9zY3JlZW4gKyAxKSAlIHRoaXMuc2NyZWVucy5sZW5ndGg7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KClcbiAgICB9XG5cbiAgICBzZXRWaXNpYmlsaXR5KCkge1xuICAgICAgICB0aGlzLnNjcmVlbnMuZm9yRWFjaCgoc2NyZWVuLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfc2NyZWVuID09IGlkeCkge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctaW50cm8nKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctaW50cm8nLCBJbnRybyk7XG59XG4iLCJjbGFzcyBDcmVkaXRzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMuZmluaXNoZWQuYmluZCh0aGlzKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwiLmNyZWRpdHNcIilcbiAgICAgICAgY29uc29sZS5sb2coXCJCSU5ELi4uXCIpXG5cbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpXG4gICAgfVxuXG5cbiAgICBmaW5pc2hlZChldikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZJTklTSEVEXCIpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1jcmVkaXRzJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWNyZWRpdHMnLCBDcmVkaXRzKTtcbn1cbiIsImNsYXNzIFRleHR1cmVMb2FkZXIge1xuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCFUZXh0dXJlTG9hZGVyLmluc3RhbmNlKSB7XG4gICAgICAgICAgICBUZXh0dXJlTG9hZGVyLmluc3RhbmNlID0gbmV3IFRleHR1cmVMb2FkZXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGV4dHVyZUxvYWRlci5pbnN0YW5jZTtcbiAgICB9XG5cbiAgICBnZXRUZXh0dXJlcyh1cmxzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh1cmxzLm1hcCh1cmw9PnRoaXMuZ2V0VGV4dHVyZSh1cmwpKSk7XG4gICAgfVxuXG4gICAgZ2V0VGV4dHVyZSh1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUodXJsLCBudWxsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGV4dHVyZUxvYWRlcjsiLCJpbXBvcnQgVGV4dHVyZUxvYWRlciBmcm9tIFwiLi4vYmFzZTNkL3RleHR1cmVfbG9hZGVyXCI7XG5cbmNvbnN0IFRlcnJhaW4gPSBUSFJFRS5UZXJyYWluO1xuXG5jbGFzcyBUZXJyYWluQnVpbGRlciB7XG5cbiAgICBzdGF0aWMgY3JlYXRlVGVycmFpbihvcHRpb25zLCBzY2VuZSwgbWF0ZXJpYWwsIGhlaWdodG1hcCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe3dpZHRoOiA2NCwgaGVpZ2h0OiA2NH0sIG9wdGlvbnMpO1xuICAgICAgICB2YXIgeFMgPSBvcHRpb25zLndpZHRoIC0gMSwgeVMgPSBvcHRpb25zLmhlaWdodCAtIDE7XG5cbiAgICAgICAgaWYgKCFoZWlnaHRtYXApXG4gICAgICAgICAgICBoZWlnaHRtYXAgPSBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT1BUSU9OU1wiLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgICAgICAgICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB4bDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCB5bDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnW2ogKiB4bCArIGldLnogKz0gTWF0aC5yYW5kb20oKSAqIDEwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBkb2luZyB3aXJlZnJhbWUgdGVycmFpblxuICAgICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICAgICAgICAgIGNvbG9yOiAweGZmMDAwMCxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vbWF0ZXJpYWwgPSBudWxsO1xuICAgICAgICBsZXQgdGVycmFpblNjZW5lID0gVGVycmFpbih7XG4gICAgICAgICAgICBlYXNpbmc6IFRlcnJhaW4uTGluZWFyLFxuICAgICAgICAgICAgZnJlcXVlbmN5OiAyLjUsXG4gICAgICAgICAgICBoZWlnaHRtYXA6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIC8vYWZ0ZXI6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIG1hdGVyaWFsOiBtYXRlcmlhbCB8fCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDU1NjZhYX0pLFxuLy8gICAgICAgICAgbWF4SGVpZ2h0OiAxMDAsXG4vLyAgICAgICAgICBtaW5IZWlnaHQ6IC0xMDAsXG4vL21pbkhlaWdodDowLC8vdW5kZWZpbmVkLFxuLy9tYXhIZWlnaHQ6MTAsIC8vdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RlcHM6IDEsXG4gICAgICAgICAgICB1c2VCdWZmZXJHZW9tZXRyeTogZmFsc2UsXG4gICAgICAgICAgICB4U2VnbWVudHM6IHhTLFxuICAgICAgICAgICAgeFNpemU6IG9wdGlvbnMud2lkdGgsXG4gICAgICAgICAgICB5U2VnbWVudHM6IHlTLFxuICAgICAgICAgICAgeVNpemU6IG9wdGlvbnMuaGVpZ2h0LFxuICAgICAgICAgICAgc3RyZXRjaDogZmFsc2UsXG4gICAgICAgICAgICBjbGFtcDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5yb3RhdGlvbi54ID0gMDtcbiAgICAgICAgdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLnJvdGF0aW9uLnggPSAtTWF0aC5QSS8yO1xuICAgICAgICAvL3RlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5yb3RhdGlvbi55ID0gTWF0aC5QSS84O1xuICAgICAgICB0ZXJyYWluU2NlbmUucG9zaXRpb24ueCArPSBvcHRpb25zLndpZHRoIC8gMjtcbiAgICAgICAgdGVycmFpblNjZW5lLnBvc2l0aW9uLnogLT0gb3B0aW9ucy53aWR0aCAvIDI7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJUU1wiLCB0ZXJyYWluU2NlbmUpO1xuICAgICAgICAvLyBBc3N1bWluZyB5b3UgYWxyZWFkeSBoYXZlIHlvdXIgZ2xvYmFsIHNjZW5lXG4gICAgICAgIHNjZW5lLmFkZCh0ZXJyYWluU2NlbmUpO1xuICAgICAgICB0aGlzLmdlbyA9IHRlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5nZW9tZXRyeTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYXN5bmMgY3JlYXRlKG9wdGlvbnMsIHNjZW5lLCBoZWlnaHRtYXApIHtcbiAgICAgICAgVGV4dHVyZUxvYWRlci5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFsnbW9kZWxzL3NhbmQxLmpwZycsICdtb2RlbHMvZ3Jhc3MxLmpwZycsICdtb2RlbHMvc3RvbmUxLmpwZycsICdtb2RlbHMvc25vdzEuanBnJ10pXG4gICAgICAgICAgICAudGhlbigodGV4dHVyZXMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBibGVuZCA9IFRlcnJhaW5CdWlsZGVyLmdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIC4uLnRleHR1cmVzKVxuICAgICAgICAgICAgICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIGJsZW5kLCBoZWlnaHRtYXApO1xuICAgICAgICAgICAgfSlcbiAgICB9XG4gICAgc3RhdGljIGdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIHQxLHQyLHQzLHQ0KSB7XG4gICAgICAgIHJldHVybiBUZXJyYWluLmdlbmVyYXRlQmxlbmRlZE1hdGVyaWFsKFtcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MX0sXG4gICAgICAgICAgICB7dGV4dHVyZTogdDIsIGxldmVsczogWy04MCwgLTM1LCAyMCwgNTBdfSxcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MywgbGV2ZWxzOiBbMjAsIDUwLCA2MCwgODVdfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlOiB0NCxcbiAgICAgICAgICAgICAgICBnbHNsOiAnMS4wIC0gc21vb3Roc3RlcCg2NS4wICsgc21vb3Roc3RlcCgtMjU2LjAsIDI1Ni4wLCB2UG9zaXRpb24ueCkgKiAxMC4wLCA4MC4wLCB2UG9zaXRpb24ueiknXG4gICAgICAgICAgICB9LFxuICAgICAgICBdLCBzY2VuZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUZXJyYWluQnVpbGRlciIsIi8vdmFyIHByb2plY3RvciA9IG5ldyBUSFJFRS5Qcm9qZWN0b3IoKTtcbnZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cbnZhciBQaWNrID0ge1xuICAgIC8qXG4gICAgKiBtb3VzZT17eDoxMix5OjEyfVxuICAgICogKi9cbiAgICBwaWNrOiBmdW5jdGlvbiAobW91c2UsIGNhbWVyYSwgc2NlbmUpIHtcbiAgICAgICAgLy8gZmluZCBpbnRlcnNlY3Rpb25zXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGNyZWF0ZSBhIFJheSB3aXRoIG9yaWdpbiBhdCB0aGUgbW91c2UgcG9zaXRpb25cbiAgICAgICAgLy8gICBhbmQgZGlyZWN0aW9uIGludG8gdGhlIHNjZW5lIChjYW1lcmEgZGlyZWN0aW9uKVxuICAgICAgICAvL1xuICAgICAgICB2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAgICAgdmVjLnggPSBtb3VzZS5yeDtcbiAgICAgICAgdmVjLnkgPSBtb3VzZS5yeTtcbiAgICAgICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodmVjLCBjYW1lcmEpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhbiBhcnJheSBjb250YWluaW5nIGFsbCBvYmplY3RzIGluIHRoZSBzY2VuZSB3aXRoIHdoaWNoIHRoZSByYXkgaW50ZXJzZWN0c1xuICAgICAgICAvLyBpbnRlcnNlY3QgcmVjdXJzaXZlICEhIVxuICAgICAgICB2YXIgcmVzdWx0ID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMoc2NlbmUuY2hpbGRyZW4sIHRydWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgUGljazsiLCJcbmZ1bmN0aW9uIGFkZFNreWJveChzY2VuZSkge1xuICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9za3kxLmpwZycsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHQxKSB7XG4gICAgICAgIGNvbnN0IHNreURvbWUgPSBuZXcgVEhSRUUuTWVzaChcbiAgICAgICAgICAgIG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSg0MDk2LCA2NCwgNjQpLFxuICAgICAgICAgICAgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IHQxLCBzaWRlOiBUSFJFRS5CYWNrU2lkZSwgZm9nOiBmYWxzZX0pXG4gICAgICAgICk7XG4gICAgICAgIHNjZW5lLmFkZChza3lEb21lKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFkZFNreWJveDsiLCJpbXBvcnQgYWRkU2t5Ym94IGZyb20gXCIuL3NreWJveFwiO1xuXG5mdW5jdGlvbiBnZXRSYW5kb21OdW1iZXIoIGJhc2UgKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiBiYXNlIC0gKGJhc2UvMik7XG59XG5mdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcbiAgICB2YXIgYyA9IG5ldyBUSFJFRS5Db2xvcigpO1xuICAgIGMuc2V0UkdCKCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpICk7XG4gICAgcmV0dXJuIGM7XG59XG5jbGFzcyBBbnRTY2VuZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vIGh0dHA6Ly9zcXVhcmVmZWV0LmdpdGh1Yi5pby9TaGFkZXJQYXJ0aWNsZUVuZ2luZS9cbiAgICAgICAgdGhpcy5lbWl0dGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogbmV3IFRIUkVFLlZlY3RvcjMoLTEsIDEsIDEpLFxuICAgICAgICAgICAgcG9zaXRpb25TcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApLFxuXG4gICAgICAgICAgICBhY2NlbGVyYXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0wLjEsIDApLFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjAxLCAwLjAxLCAwLjAxKSxcblxuICAgICAgICAgICAgdmVsb2NpdHk6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuNywgMCksXG4gICAgICAgICAgICB2ZWxvY2l0eVNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4zLCAwLjUsIDAuMiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnQ6IG5ldyBUSFJFRS5Db2xvcigweEJCQkJCQiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnRTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMiwgMC4xLCAwLjEpLFxuICAgICAgICAgICAgY29sb3JFbmQ6IG5ldyBUSFJFRS5Db2xvcigweEFBQUFBQSksXG5cbiAgICAgICAgICAgIHNpemVTdGFydDogMC41LFxuICAgICAgICAgICAgc2l6ZUVuZDogNCxcbiAgICAgICAgICAgIG9wYWNpdHlTdGFydDogMSxcbiAgICAgICAgICAgIG9wYWNpdHlFbmQ6IDAuMSxcblxuICAgICAgICAgICAgLy9wYXJ0aWNsZUNvdW50OiAyMDAwLFxuICAgICAgICAgICAgcGFydGljbGVzUGVyU2Vjb25kOiAxMDAsXG4gICAgICAgICAgICBhbGl2ZTogMVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZW1pdHRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgbWF4QWdlOiA1LFxuICAgICAgICAgICAgLy90eXBlOiBNYXRoLnJhbmRvbSgpICogNCB8IDAsXG4gICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMygtMSwwLDApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKDAsXG4gICAgICAgICAgICAgICAgICAgIC0wLjIsXG4gICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIHNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMCwwLjEsMClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2ZWxvY2l0eToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgMS40LFxuICAgICAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLjcsMC4zKVxuICAgICAgICAgICAgfSxcbi8qXG4gICAgICAgICAgICByb3RhdGlvbjoge1xuICAgICAgICAgICAgICAgIGF4aXM6IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSksXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBhbmdsZTpcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKSAqIE1hdGguUEksXG4gICAgICAgICAgICAgICAgY2VudGVyOlxuICAgICAgICAgICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICB9LFxuXG5cbiAgICAgICAgICAgIHdpZ2dsZToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnJhbmRvbSgpICogMjBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucmFuZG9tKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29sb3I6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogW25ldyBUSFJFRS5Db2xvcigweDMzMzMzMyksbmV3IFRIUkVFLkNvbG9yKDB4Nzc3Nzc3KSxuZXcgVEhSRUUuQ29sb3IoMHg4ODg4ODgpXSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLDApXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzaXplOiB7XG5cbiAgICAgICAgICAgICAgICB2YWx1ZTogWzAuNSwgMC43LCAxXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhcnRpY2xlQ291bnQ6IDEwMCxcbiAgICAgICAgICAgIG9wYWNpdHk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogWzEsIDAuOCwgMC4wXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlcHRoVGVzdDogdHJ1ZSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwID0gQW50U2NlbmUubWFrZVNQRUdyb3VwKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLmFkZFBvb2woMTAsIHRoaXMuZW1pdHRlclNldHRpbmdzLCB0cnVlKTtcblxuICAgICAgICB2YXIgZW1pdHRlciA9IHRoaXMucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpXG4gICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSBuZXcgVEhSRUUuVmVjdG9yMygtMiwwLDApXG4gICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG4gICAgICAgIGVtaXR0ZXIgPSB0aGlzLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKVxuICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gbmV3IFRIUkVFLlZlY3RvcjMoLTQsMCwwKVxuICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuXG4gICAgICAgIC8vdGhpcy5zY2VuZS5iYWNrZ3JvdW5kLmFkZChuZXcgQ29sb3IoXCJyZWRcIikpXG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRoaXMucGFydGljbGVHcm91cC5tZXNoKTtcbiAgICAgICAgdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwID0gdGhpcy5wYXJ0aWNsZUdyb3VwO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBBUlRJQ0xFXCIsIHRoaXMucGFydGljbGVHcm91cCk7XG5cblxuICAgICAgICAvLyBzb2Z0IHdoaXRlIGxpZ2h0XG4gICAgICAgIHZhciBsaWdodCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgzMDIwMjApO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodCk7XG5cbiAgICAgICAgLy8gV2hpdGUgZGlyZWN0aW9uYWwgbGlnaHQgYXQgaGFsZiBpbnRlbnNpdHkgc2hpbmluZyBmcm9tIHRoZSB0b3AuXG4gICAgICAgIHZhciBkaXJlY3Rpb25hbExpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZmYsIDAuNyk7XG4gICAgICAgIGRpcmVjdGlvbmFsTGlnaHQucG9zaXRpb24uc2V0KDEsIDAuNywgMC43KTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoZGlyZWN0aW9uYWxMaWdodCk7XG5cbiAgICAgICAgYWRkU2t5Ym94KHRoaXMuc2NlbmUpO1xuXG5cbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDAsIDApO1xuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgMCwgNCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCA0LCAwKTtcblxuICAgICAgICB0aGlzLm1lc2hlcyA9IHt9O1xuICAgICAgICB0aGlzLmVudGl0aWVzID0gW11cbiAgICB9XG5cbiAgICBzdGF0aWMgbWFrZVNQRUdyb3VwKCkge1xuICAgICAgICByZXR1cm4gbmV3IFNQRS5Hcm91cCh7XG4gICAgICAgICAgICB0ZXh0dXJlOiB7IHZhbHVlOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCcuL2ltYWdlcy9zbW9rZXBhcnRpY2xlLnBuZycpIH0sXG4gICAgICAgICAgICAvL21heEFnZTogNCxcbiAgICAgICAgICAgIC8vYmxlbmRpbmc6IFRIUkVFLk5vcm1hbEJsZW5kaW5nXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgY3JlYXRlQ3ViZShzY2VuZSwgeCwgeSkge1xuICAgICAgICB2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoKTtcbiAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgwMGZmMDB9KTtcbiAgICAgICAgdmFyIGN1YmUgPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICAgICAgICBjdWJlLnBvc2l0aW9uLnggKz0geDtcbiAgICAgICAgY3ViZS5wb3NpdGlvbi56ICs9IHk7XG4gICAgICAgIHNjZW5lLmFkZChjdWJlKTtcbiAgICB9XG5cbiAgICB0aWNrKGRlbHRhKSB7XG4gICAgICAgIGlmIChkZWx0YSkge1xuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLnRpY2soZGVsdGEpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGQobm9kZSkge1xuICAgICAgICAvLyAgICB0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUREXCIsIG5vZGUpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChub2RlKVxuICAgIH1cblxuICAgIHJlbW92ZShub2RlKSB7XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlKG5vZGUpXG4gICAgfVxuXG4gICAgbWFrZUVtaXR0ZXIocG9zKSB7XG4gICAgICAgIHJldHVybiBuZXcgU1BFLkVtaXR0ZXIodGhpcy5lbWl0dGVyU2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFudFNjZW5lIiwiY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgQmFzZSB7XG4gICAgY29uc3RydWN0b3IoZWwpIHtcblxuXG5cbiAgICB9XG5cblxuXG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZTtcbiIsImltcG9ydCBCYXNlIGZyb20gXCIuL2Jhc2VcIjtcblxuY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgVmlldyAge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRUxcIiwgZWwsIHRoaXMpXG4gICAgICAgIHRoaXMuZWwgPSBlbFxuICAgICAgICB0aGlzLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcblxuICAgICAgICAvLyBmaXhtZTogdXNlIGVsIHNpemVcbiAgICAgICAgY29uc3Qgd2lkdGggPSBlbC5vZmZzZXRXaWR0aFxuICAgICAgICBjb25zdCBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHRcblxuICAgICAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNjAsIHdpZHRoIC8gaGVpZ2h0LCAxLCAxMDAwMCk7XG4gICAgICAgIHRoaXMuc2V0U2l6ZSgpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEucm90YXRpb24ueCA9IC0oMTAgKyAzMikgKiBNYXRoLlBJIC8gMTgwO1xuICAgICAgICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNpemUoKSB7XG4gICAgICAgIHRoaXMuY2FtZXJhLmFzcGVjdCA9IHRoaXMuZWwub2Zmc2V0V2lkdGggLyB0aGlzLmVsLm9mZnNldEhlaWdodDtcbiAgICAgICAgdGhpcy5jYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U2l6ZSh0aGlzLmVsLm9mZnNldFdpZHRoLCB0aGlzLmVsLm9mZnNldEhlaWdodCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKHNjZW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUkVOREVSXCIsIHNjZW5lLCBvcHRpb25zKVxuXG4gICAgICAgIHZhciBkb3JlbmRlcj0gKCk9PiB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoaXMgcmVuZGVyaW5nIC0gYmVjYXVzZSB0aGUgc2NvcGUgLyBjYW52YXMgaXMgZGVzdHJveWVkXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9yZW5kZXIsIDUwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZURpZmYgPSB0aW1lIC0gbGFzdFRpbWU7XG4gICAgICAgICAgICBsYXN0VGltZSA9IHRpbWU7XG5cbiAgICAgICAgICAgIHZhciBkZWx0YTtcbiAgICAgICAgICAgIHZhciB1c2UzanNUaW1lID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmICh1c2UzanNUaW1lKVxuICAgICAgICAgICAgICAgIGRlbHRhID0gY2xvY2suZ2V0RGVsdGEoKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBkZWx0YSA9IHRpbWVEaWZmICogMC4wMDE7XG5cbiAgICAgICAgICAgIGlmIChkZWx0YSA+IDAuMSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IDAuMTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZnJhbWVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyYW1lQ2FsbGJhY2soZGVsdGEpO1xuXG4gICAgICAgICAgICBzY2VuZS50aWNrKGRlbHRhKVxuICAgICAgICAgICAgLy8gYW5pbWF0ZSBDb2xsYWRhIG1vZGVsXG5cbiAgICAgICAgICAgIC8vVEhSRUUuQW5pbWF0aW9uTWl4ZXIudXBkYXRlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHNjZW5lLnNjZW5lLCB0aGlzLmNhbWVyYSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvcmVuZGVyKTtcbiAgICB9XG5cbiAgICB1cGRhdGVDYW1lcmEodmlld0NlbnRlciwgaCkge1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi54ID0gdmlld0NlbnRlci54O1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gdmlld0NlbnRlci56ICsgaDtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IC0gdmlld0NlbnRlci55ICsgdmlld0NlbnRlci56O1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlldzsiLCJpbXBvcnQgVGVycmFpbkJ1aWxkZXIgZnJvbSBcIi4uL2xpYnMvdGVycmFpbl9idWlsZGVyXCI7XG5pbXBvcnQgUGljayBmcm9tICcuLi9iYXNlM2QvcGljaydcbmltcG9ydCBBbnRTY2VuZSBmcm9tIFwiLi4vYmFzZTNkL2FudC1zY2VuZVwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4uL2Jhc2UzZC92aWV3XCJcblxuLyoqXG4gKiBHYW1ldmlldyBjb250YWlucyBzY2VuZSwgdmlldyxcbiAqL1xuY2xhc3MgQWdHYW1lVmlldyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgdGhpcy5zZXR1cFRocmVlKCk7XG5cbiAgICB0aGlzLmNvbnRyb2xQcm9ncmVzcyA9IHRydWU7XG4gICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwiY29udHJvbC1wcm9ncmVzc1wiKSkge1xuICAgICAgdGhpcy5jb250cm9sUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiQWdHYW1lVmlldyBjb25uZWN0ZWRcIik7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIHRoaXMudG91Y2hzdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLCB0aGlzLnRvdWNoZW5kLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCB0aGlzLnRvdWNobW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnZpZXdDZW50ZXIgPSB7eDogMCwgeTogMCwgejogMTB9O1xuICAgIHRoaXMudG91Y2hlcyA9IHt9O1xuXG5cbiAgICB0aGlzLm1vdmVzID0gMDtcbiAgICB0aGlzLnZpZXcgPSBuZXcgVmlldyh0aGlzKTtcbiAgICB0aGlzLnVwZGF0ZVNpemUoe3RhcmdldDogd2luZG93fSk7XG5cbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG5cbiAgICB0aGlzLnNwZWVkID0gNDtcbiAgfVxuXG4gIGZyYW1lQ2FsbGJhY2soZSkge1xuICAgIHRoaXMudGljayhlKVxuICAgIC8vIHRoaXMuc2NlbmUudGljaygpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdmlldy5kZXN0cm95ZWQgPSB0cnVlXG4gIH1cblxuICBhc3luYyB3b3JsZENyZWF0ZWQoZSkge1xuICAgIHRoaXMud29ybGQgPSBlLndvcmxkO1xuICAgIGNvbnN0IG1hcCA9IHRoaXMud29ybGQubWFwO1xuXG4gICAgLy8gRklYTUU6bW92ZSB0aGlzIHNvbWV3aGVyZSBlbHNlXG4gICAgY29uc3QgdGhyZWVIZWlnaHRNYXAgPSBtYXAudG9UaHJlZVRlcnJhaW4oKTtcblxuICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZShtYXAsIHRoaXMuc2NlbmUsIHRocmVlSGVpZ2h0TWFwKTtcblxuICAgIC8vIEZJWE1FOiBsb2FkIGFsbCBtb2RlbHMgYmVmb3JlaGFuZFxuICAgIGF3YWl0IHRoaXMud29ybGQuaW5pdFNjZW5lKHRoaXMuc2NlbmUpO1xuICAgIHRoaXMuc3RhcnRSZW5kZXJMb29wKCk7XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKTtcbiAgfVxuXG4gIHN0YXJ0UmVuZGVyTG9vcCgpIHtcbiAgICB0aGlzLnZpZXcucmVuZGVyKHRoaXMuc2NlbmUsIHtmcmFtZUNhbGxiYWNrOiB0aGlzLmZyYW1lQ2FsbGJhY2suYmluZCh0aGlzKX0pXG4gIH1cblxuICBnZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKSB7XG4gICAgdmFyIGhpZGRlbiwgdmlzaWJpbGl0eUNoYW5nZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgICAgaGlkZGVuID0gXCJoaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaGlkZGVuID0gXCJtc0hpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwibXN2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwid2Via2l0dmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH1cbiAgICByZXR1cm4ge3Zpc2liaWxpdHlDaGFuZ2UsIGhpZGRlbn07XG4gIH1cblxuICBzZXR1cFRocmVlKCkge1xuICAgIHRoaXMuc2NlbmUgPSBuZXcgQW50U2NlbmUodGhpcy5zY2VuZSlcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICBpZiAodGhpcy5jb250cm9sUHJvZ3Jlc3MgJiYgIXRoaXMud29ybGQucGF1c2UpIHtcbiAgICAgIHRoaXMud29ybGQudGljayhkZWx0YSAqIHRoaXMuc3BlZWQpXG4gICAgfVxuICB9XG5cbiAgdmlzaWJpbGl0eUNoYW5nZShldikge1xuICAgIGlmIChldi50YXJnZXRbdGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS5oaWRkZW5dKSB7XG4gICAgICB0aGlzLndvcmxkLnBhdXNlID0gdHJ1ZVxuICAgICAgLy8gaGlkZGVuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud29ybGQucGF1c2UgPSBmYWxzZVxuICAgICAgLy8gdmlzaWJsZVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVNpemUoZXYpIHtcbiAgICB0aGlzLnZpZXcuc2V0U2l6ZSh7fSk7XG4gICAgdGhpcy5jb250YWluZXJXaWR0aCA9IGV2LnRhcmdldC5pbm5lcldpZHRoO1xuICAgIHRoaXMuY29udGFpbmVySGVpZ2h0ID0gZXYudGFyZ2V0LmlubmVySGVpZ2h0XG4gIH1cblxuICBtb3VzZXVwKGUpIHtcbiAgICB0aGlzLm1vdXNlaXNkb3duID0gZmFsc2U7XG4gIH1cblxuICBtb3VzZWRvd24oZSkge1xuICAgIHRoaXMubW91c2Vpc2Rvd24gPSB0cnVlO1xuICAgIHRoaXMub3ggPSBlLnBhZ2VYO1xuICAgIHRoaXMub3kgPSBlLnBhZ2VZO1xuICAgIHRoaXMubW92ZXMgPSAwO1xuICB9XG5cbiAgdG91Y2hzdGFydChlKSB7XG4gICAgY29uc29sZS5sb2coXCJ0b3VjaHN0YXJ0XCIsZSlcbiAgICBjb25zdCB0b3VjaCA9ZS50YXJnZXRUb3VjaGVzXG4gICAgdGhpcy50b3VjaGVzWzBdPXt4OnRvdWNoLmNsaWVudFgsIHk6dG91Y2guY2xpZW50WX1cbiAgfVxuXG4gIHRvdWNoZW5kKGUpIHtcbiAgICBkZWxldGUgdGhpcy50b3VjaGVzWzBdO1xuICAgIGNvbnNvbGUubG9nKFwidG91Y2hlbmRcIixlKVxuICB9XG5cbiAgdG91Y2htb3ZlKGUpIHtcbiAgICBjb25zb2xlLmxvZyhcInRvdWNobW92ZVwiLGUpXG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLm9mZnNldFdpZHRoO1xuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMub2Zmc2V0SGVpZ2h0O1xuICAgIGNvbnN0IHggPSBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WC10aGlzLnRvdWNoZXNbMF0ueFxuICAgIGNvbnN0IHkgPSBlLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WS10aGlzLnRvdWNoZXNbMF0ueVxuICAgIGNvbnNvbGUubG9nKFwiWFhYWFwiLHkseCx3aWR0aCxoZWlnaHQsSlNPTi5zdHJpbmdpZnkodGhpcy50b3VjaGVzKSlcbiAgICB0aGlzLm1vdmUoe3g6eC93aWR0aCwgeTp5L2hlaWdodH0pXG4gIH1cblxuICB3aGVlbChlKSB7XG4gICAgdGhpcy52aWV3Q2VudGVyLnogKz0gZS5kZWx0YVkgKiAwLjE7XG4gICAgaWYgKHRoaXMudmlld0NlbnRlci56IDwgNSkge1xuICAgICAgdGhpcy52aWV3Q2VudGVyLnogPSA1XG4gICAgfVxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIGNsaWNrKGUpIHtcbiAgICBpZiAoIXRoaXMud29ybGQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy53b3JsZC5jbGljayh0aGlzLmxhc3RQb3MpXG4gIH1cblxuICBtb3VzZW1vdmUoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHRoaXMubW92ZXMgKz0gMTtcbiAgICBpZiAodGhpcy5tb3VzZWlzZG93bikge1xuICAgICAgY29uc3Qgd2lkdGggPSB0aGlzLm9mZnNldFdpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5vZmZzZXRIZWlnaHQ7XG4gICAgICB0aGlzLm1vdmUoe2R4OiAoZS5wYWdlWCAtIHRoaXMub3gpIC8gd2lkdGgsIGR5OiAoZS5wYWdlWSAtIHRoaXMub3kpIC8gaGVpZ2h0fSk7XG4gICAgICB0aGlzLm94ID0gZS5wYWdlWDtcbiAgICAgIHRoaXMub3kgPSBlLnBhZ2VZO1xuICAgIH1cbiAgICB0aGlzLmhvdmVyKHtcbiAgICAgIHg6IGUucGFnZVgsXG4gICAgICB5OiBlLnBhZ2VZLFxuICAgICAgcng6IGUucGFnZVggLyB0aGlzLmNvbnRhaW5lcldpZHRoICogMiAtIDEsXG4gICAgICByeTogLWUucGFnZVkgLyB0aGlzLmNvbnRhaW5lckhlaWdodCAqIDIgKyAxLFxuICAgIH0pO1xuICB9XG5cbiAgaG92ZXIobW91c2UpIHtcbiAgICBpZiAoIXRoaXMud29ybGQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlcyA9IFBpY2sucGljayhtb3VzZSwgdGhpcy52aWV3LmNhbWVyYSwgdGhpcy5zY2VuZS5zY2VuZSk7XG5cbiAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBlbnRpdHkgPSByZXNbMF0ub2JqZWN0LnVzZXJEYXRhLmVudGl0eTtcbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIGVudGl0eSA9IHJlc1swXS5vYmplY3QucGFyZW50LnVzZXJEYXRhLmVudGl0eTtcbiAgICAgIH1cbiAgICAgIHRoaXMud29ybGQuaG92ZXIoZW50aXR5KTtcblxuICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgdGhpcy5sYXN0UG9zID0gbmV3IFRIUkVFLlZlY3RvcjIocmVzWzBdLnBvaW50LngsIC1yZXNbMF0ucG9pbnQueikvLy5jb3B5KHJlc1swXS5wb2ludCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbW92ZShkKSB7XG4gICAgdGhpcy52aWV3Q2VudGVyLnggLT0gZC5keCAqIHRoaXMudmlld0NlbnRlci56ICogMztcbiAgICB0aGlzLnZpZXdDZW50ZXIueSArPSBkLmR5ICogdGhpcy52aWV3Q2VudGVyLnogKiAzO1xuXG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKVxuICB9XG5cbiAgdXBkYXRlQ2FtZXJhKCkge1xuICAgIC8vIEZJWE1FOiBtb3ZlIHRvIHdvcmxkXG4gICAgdmFyIGg7XG5cbiAgICBpZiAodGhpcy53b3JsZCAmJiB0aGlzLndvcmxkLm1hcCkge1xuICAgICAgaCA9IHRoaXMud29ybGQubWFwLmdldChcInJvY2tcIikuaW50ZXJwb2xhdGUodGhpcy52aWV3Q2VudGVyLngsIHRoaXMudmlld0NlbnRlci55ICsgdGhpcy52aWV3Q2VudGVyLnogLyAyKTtcbiAgICB9XG4gICAgaWYgKGggPiA1MCB8fCBoIDwgNTApIHtcbiAgICAgIGggPSAwO1xuICAgIH1cblxuICAgIHRoaXMudmlldy51cGRhdGVDYW1lcmEodGhpcy52aWV3Q2VudGVyLCBoKVxuICB9XG5cbiAga2V5ZG93bihlKSB7XG4gICAgY29uc29sZS5sb2coXCJLRVlkb3duXCIsIGUpO1xuICAgIGlmIChlLmtleUNvZGUgPT0gMjcpIHtcbiAgICAgIHRoaXMud29ybGQuc2VsZWN0KG51bGwpO1xuICAgIH1cbiAgfVxufVxuXG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1nYW1lLXZpZXcnKSkge1xuICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWdhbWUtdmlldycsIEFnR2FtZVZpZXcpO1xufVxuIiwiLy8gc2hhbWVsZXNzbHkgc3RvbGVuIGZyb20gaHR0cHM6Ly9kYXZpZHdhbHNoLm5hbWUvcHVic3ViLWphdmFzY3JpcHRcbi8vIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQgbGljZW5zZVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFdmVudHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVycyA9IFtdXG4gICAgfVxuXG4gICAgc3Vic2NyaWJlKGxpc3RlbmVyKSB7XG5cbiAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lcnM7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBsaXN0ZW5lciB0byBxdWV1ZVxuICAgICAgICBjb25zdCBpbmRleCA9IGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKSAtIDE7XG5cbiAgICAgICAgLy8gUHJvdmlkZSBoYW5kbGUgYmFjayBmb3IgcmVtb3ZhbCBvZiB0b3BpY1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgbGlzdGVuZXJzW2luZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwdWJsaXNoKGluZm8pIHtcbiAgICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICAgIHRoaXMubGlzdGVuZXJzLmZvckVhY2goKGl0ZW0pPT4ge1xuICAgICAgICAgICAgaXRlbShpbmZvKTsgLy9pbmZvICE9IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiIsImNsYXNzIEpvYiB7XG4gICAgY29uc3RydWN0b3IoZW50aXR5KSB7XG4gICAgICAgIHRoaXMuX2VudGl0eSA9IGVudGl0eTtcbiAgICAgICAgdGhpcy5fcmVhZHkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBnZXQgcmVhZHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeTtcbiAgICB9XG5cbiAgICBnZXQgZW50aXR5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW50aXR5XG4gICAgfVxuXG4gICAgc2V0UmVhZHkoKSB7XG4gICAgICAgIHRoaXMuX3JlYWR5ID0gdHJ1ZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEpvYjsiLCIvKiogc2ltcGxpZmllZCB2ZXJzaW9uIG9mIFRIUkVFLlZlY3RvcjIuICovXG5cbmNsYXNzIFZlY3RvcjIge1xuICBjb25zdHJ1Y3Rvcih4ID0gMCwgeSA9IDApIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gIH1cblxuICB0cnVuYyhtaW54LCBtaW55LCBtYXh4LCBtYXh5KSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKFxuICAgICAgdGhpcy54IDwgbWlueCA/IG1pbnggOiAodGhpcy54ID4gbWF4eCA/IG1heHggOiB0aGlzLngpLFxuICAgICAgdGhpcy55IDwgbWlueSA/IG1pbnkgOiAodGhpcy55ID4gbWF4eSA/IG1heHkgOiB0aGlzLnkpLFxuICAgIClcbiAgfVxuXG4gIGNvcHkodikge1xuICAgIGlmKHYpIHtcbiAgICAgIHRoaXMueCA9IHYueDtcbiAgICAgIHRoaXMueSA9IHYueTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBhZGQodikge1xuICAgIGlmICghdikge1xuICAgICAgdGhyb3cgXCJWZWN0b3IgdiBub3QgZGVmaW5lZFwiO1xuICAgIH1cbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBkaXN0YW5jZVRvKHYpIHtcbiAgICBjb25zdCBkeCA9IHYueCAtIHRoaXMueCwgZHkgPSB2LnkgLSB0aGlzLnk7XG4gICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSlcbiAgfVxuXG4gIHN1YlZlY3RvcnMoYSwgYikge1xuICAgIHRoaXMueCA9IGEueCAtIGIueDtcbiAgICB0aGlzLnkgPSBhLnkgLSBiLnk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRMZW5ndGgobGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMubm9ybWFsaXplKCkubXVsdGlwbHlTY2FsYXIobGVuZ3RoKTtcbiAgfVxuXG4gIG5vcm1hbGl6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIodGhpcy5sZW5ndGgoKSB8fCAxKTtcbiAgfVxuXG4gIGRpdmlkZVNjYWxhcihzKSB7XG4gICAgdGhpcy54IC89IHM7XG4gICAgdGhpcy55IC89IHM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBtdWx0aXBseVNjYWxhcihzKSB7XG4gICAgdGhpcy54ICo9IHM7XG4gICAgdGhpcy55ICo9IHM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsZW5ndGgoKSB7XG4gICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkpO1xuICB9XG59XG5cbmV4cG9ydCB7VmVjdG9yMn07XG4iLCJjbGFzcyBBbmdsZSB7XG4gIHN0YXRpYyBmcm9tVmVjdG9yMihkaXIpIHtcbiAgICByZXR1cm4gLU1hdGguYXRhbjIoZGlyLngsIGRpci55KSArIE1hdGguUEk7XG4gIH1cbn1cblxuZXhwb3J0IHtBbmdsZX1cbiIsImltcG9ydCBKb2IgZnJvbSAnLi9qb2InXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0FuZ2xlfSBmcm9tIFwiLi4vYW5nbGVcIlxuXG52YXIgdG1wRGlyID0gbmV3IFZlY3RvcjIoKTtcblxuY2xhc3MgTW92ZSBleHRlbmRzIEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgcG9zLCBkaXN0YW5jZSkge1xuICAgIHN1cGVyKGVudGl0eSk7XG4gICAgdGhpcy5zcGVlZCA9IGVudGl0eS5zcGVlZCB8fCAxO1xuICAgIHRoaXMubGx0YXJnZXRQb3MgPSBwb3M7XG4gICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlIHx8IDA7XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdmFyIGUgPSB0aGlzLmVudGl0eTtcbiAgICBpZiAodGhpcy5sbHRhcmdldFBvcykge1xuXG4gICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLmxsdGFyZ2V0UG9zLmRpc3RhbmNlVG8oZS5wb3MpO1xuICAgICAgdmFyIHRvZ28gPSBkZWx0YSAqIHRoaXMuc3BlZWQ7XG5cbiAgICAgIGRpc3RhbmNlIC09IHRoaXMuZGlzdGFuY2U7XG4gICAgICB0bXBEaXIuc3ViVmVjdG9ycyh0aGlzLmxsdGFyZ2V0UG9zLCBlLnBvcykuc2V0TGVuZ3RoKHRvZ28pO1xuXG4gICAgICBlLnJvdGF0aW9uID0gQW5nbGUuZnJvbVZlY3RvcjIodG1wRGlyKTtcbiAgICAgIGlmIChkaXN0YW5jZSA8IHRvZ28pIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzdGFuY2UgPiAwKSB7XG4gICAgICAgICAgZS5wb3MgPSBuZXcgVmVjdG9yMigpLmNvcHkodGhpcy5sbHRhcmdldFBvcykuYWRkKG5ldyBWZWN0b3IyKCkuc3ViVmVjdG9ycyh0aGlzLmxsdGFyZ2V0UG9zLCBlLnBvcykuc2V0TGVuZ3RoKC10aGlzLmRpc3RhbmNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZS5wb3MgPSBuZXcgVmVjdG9yMigpLmNvcHkodGhpcy5sbHRhcmdldFBvcyk7XG4gICAgICAgIH1cblxuICAgICAgICBlLnVwZGF0ZU1lc2hQb3MoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMubGx0YXJnZXRQb3M7XG4gICAgICAgIHRoaXMuc2V0UmVhZHkoKTtcbiAgICAgICAgLy8gcmV0dXJuIHJlc3QgdGltZVxuICAgICAgICByZXR1cm4gKHRvZ28gLSBkaXN0YW5jZSkgLyB0aGlzLnNwZWVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZS5wb3MuYWRkKHRtcERpcik7XG4gICAgICB9XG5cbiAgICAgIGUudXBkYXRlTWVzaFBvcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiRVJST1I6IG5vIGxsdGFyZ2V0cG9zIGRlZmluZWRcIik7XG4gICAgICAvLyB1c2UgdGhpcyBtYXliZSBmb3IgZm9sbG93aW5nIG90aGVyIGVudGl0aWVzXG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufVxuXG5leHBvcnQge01vdmV9O1xuIiwiaW1wb3J0IHtNb3ZlfSBmcm9tICcuLi9sbC9tb3ZlJ1xuXG5jbGFzcyBNbE1vdmUge1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIHBvcywgbWVzaFR5cGUpIHtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLm1sdGFyZ2V0UG9zID0gcG9zO1xuICAgIGlmICghbWVzaFR5cGUpIHtcbiAgICAgIG1lc2hUeXBlID0gXCJ3YWxrXCI7XG4gICAgfVxuICAgIHRoaXMubWVzaFR5cGUgPSBtZXNoVHlwZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLm1sdGFyZ2V0UG9zLmRpc3RhbmNlVG8odGhpcy5lbnRpdHkucG9zKTtcbiAgICBpZiAoZGlzdGFuY2UgPCAwLjEpIHtcbiAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IE1vdmUodGhpcy5lbnRpdHksIHRoaXMubWx0YXJnZXRQb3MpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlbHRhO1xuICB9XG5cbn1cblxuZXhwb3J0IHtNbE1vdmV9XG4iLCJpbXBvcnQgRXZlbnRzIGZyb20gJy4uL2xpYnMvZXZlbnRzJ1xuaW1wb3J0IHtNbE1vdmV9IGZyb20gXCIuL21sL21vdmVcIjtcblxuY2xhc3MgV29ybGQge1xuICBjb25zdHJ1Y3RvcihtYXApIHtcbiAgICB0aGlzLm1hcCA9IG1hcDtcbiAgICB0aGlzLmVudGl0aWVzID0gW107XG4gICAgdGhpcy5lbnRpdGllc0J5VHlwZSA9IHt9O1xuICAgIGlmICghd2luZG93LldvcmxkKVxuICAgICAgd2luZG93LldvcmxkID0gdGhpcztcblxuICAgIHRoaXMuaG92ZXJlZCA9IG5ldyBFdmVudHMoKTtcbiAgICB0aGlzLnNlbGVjdGVkID0gbmV3IEV2ZW50cygpO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCkge1xuICAgIHJldHVybiB0aGlzLm1hcC53aWR0aDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhlaWdodDtcbiAgfVxuXG4gIHB1c2goZW50aXR5KSB7XG4gICAgZW50aXR5LndvcmxkID0gdGhpcztcbiAgICB0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KTtcbiAgICBpZiAoIWVudGl0eS5taXhpbk5hbWVzKVxuICAgICAgY29uc29sZS53YXJuKFwiTm8gbWl4aW5zIGZvciBcIiwgZW50aXR5KTtcbiAgICBlbHNlIHtcbiAgICAgIGVudGl0eS5taXhpbk5hbWVzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdKVxuICAgICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0gPSBbXTtcbiAgICAgICAgdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXS5wdXNoKGVudGl0eSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBzZWFyY2gocGFyYW0sIG9yaWdpbikge1xuICAgIHJldHVybiBfLmNoYWluKHRoaXMuZW50aXRpZXMpLmZpbHRlcigoZSkgPT4ge1xuICAgICAgaWYgKHBhcmFtIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHBhcmFtKGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBwYXJhbSkge1xuICAgICAgICAgIHZhciB2YWwgPSBwYXJhbVtuYW1lXTtcbiAgICAgICAgICBpZiAodmFsIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk9CSlwiLCB2YWwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZVtuYW1lXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgIGlmIChlW25hbWVdLmluZGV4T2YodmFsKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZVtuYW1lXSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgICBpZiAoIWVbbmFtZV1bdmFsXSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVbbmFtZV0gIT0gdmFsKVxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KS5zb3J0QnkoKGUpID0+IHtcbiAgICAgIGlmIChvcmlnaW4gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxuICAgICAgICByZXR1cm4gZS5wb3MuZGlzdGFuY2VUbyhvcmlnaW4pO1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSkudmFsdWUoKTtcbiAgfVxuXG4gIGFzeW5jIGluaXRTY2VuZShzY2VuZSkge1xuICAgIGNvbnNvbGUubG9nKFwiPT09IGluaXRTY2VuZVwiKTtcbiAgICB0aGlzLmVudGl0aWVzLmZvckVhY2goYXN5bmMgZSA9PiB7XG4gICAgICBhd2FpdCBlLnNldFNjZW5lKHNjZW5lKTtcbiAgICB9KTtcbiAgfVxuXG4gIGhvdmVyKGVudGl0eSkge1xuICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpXG4gICAgICB0aGlzLmhvdmVyZWRFbnRpdHkuaG92ZXJlZChmYWxzZSk7XG5cbiAgICB0aGlzLmhvdmVyZWRFbnRpdHkgPSBlbnRpdHk7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSkge1xuICAgICAgdGhpcy5ob3ZlcmVkRW50aXR5LmhvdmVyZWQodHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuaG92ZXJlZC5wdWJsaXNoKGVudGl0eSlcbiAgfVxuXG4gIHNlbGVjdChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5zZWxlY3RlZEVudGl0eSlcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkuc2VsZWN0ZWQoZmFsc2UpO1xuICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkgPSBlbnRpdHk7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkuc2VsZWN0ZWQodHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuc2VsZWN0ZWQucHVibGlzaChlbnRpdHkpXG4gIH1cblxuICBnZXRTZWxlY3RlZEhlcm8oKSB7XG4gICAgaWYgKCF0aGlzLnNlbGVjdGVkSGVybykge1xuICAgICAgdGhpcy5zZWxlY3RlZEhlcm8gPSB0aGlzLnNlYXJjaCh7cGxheWVyOiBcImh1bWFuXCJ9KVswXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRIZXJvO1xuICB9XG5cbiAgdGljayhkZWx0YSkge1xuICAgIHRoaXMuZW50aXRpZXMuZm9yRWFjaCgoZW50aXR5KSA9PiB7XG4gICAgICBpZiAoZW50aXR5LnRpY2spIHtcbiAgICAgICAgZW50aXR5LnRpY2soZGVsdGEpXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjbGljayhsYXN0UG9zKSB7XG4gICAgY29uc29sZS5sb2coXCJXT1JMRC5jbGlja1wiLCBsYXN0UG9zKTtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KSB7XG4gICAgICB0aGlzLnNlbGVjdCh0aGlzLmhvdmVyZWRFbnRpdHkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zZWxlY3RlZEVudGl0eSAmJiB0aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hKb2IgJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5pc0EoXCJoZXJvXCIpIC8qJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5wbGF5ZXIgPT0gXCJodW1hblwiKi8pIHtcblxuICAgICAgY29uc29sZS5sb2coXCJhc3NpZ24gbmV3IG1vdmUgam9iXCIsIGxhc3RQb3MpO1xuICAgICAgdGhpcy5zZWxlY3RlZEVudGl0eS5yZXNldEpvYnMoKTtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkucHVzaEpvYihuZXcgTWxNb3ZlKHRoaXMuc2VsZWN0ZWRFbnRpdHksIGxhc3RQb3MsIDApKTtcbi8vICAgICAgICAgIHdvcmxkLnNlbGVjdGVkRW50aXR5LnB1c2hKb2IobmV3IEpvYnMubWwuTW92ZSh3b3JsZC5zZWxlY3RlZEVudGl0eSxsYXN0UG9zKSk7XG4gICAgICAvL3RoaXMuc2VsZWN0ZWRFbnRpdHkucHVzaEhsSm9iKG5ldyBKb2JzLmhsLk1vdmUodGhpcy5zZWxlY3RlZEVudGl0eSwgbGFzdFBvcykpO1xuICAgIH1cbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFdvcmxkO1xuIiwidmFyIEFycmF5VHlwZSA9IHdpbmRvdy5GbG9hdDY0QXJyYXkgfHwgd2luZG93LkFycmF5O1xuXG5mdW5jdGlvbiBjcmVhdGVNYXAodywgaCkge1xuICByZXR1cm4gbmV3IEFycmF5VHlwZSh3ICogaCk7XG59XG5cbmNsYXNzIEhlaWdodE1hcCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgIHdpZHRoOiAyNTYsXG4gICAgICBoZWlnaHQ6IDI1NixcbiAgICAgIG1hcDoge31cbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHRoaXMubWFwID0gdGhpcy5vcHRpb25zLm1hcDtcblxuICAgIGlmICghdGhpcy5tYXAucm9jaykge1xuICAgICAgdGhpcy5tYXAucm9jayA9IGNyZWF0ZU1hcCh0aGlzLm9wdGlvbnMud2lkdGgsIHRoaXMub3B0aW9ucy5oZWlnaHQpO1xuICAgICAgdGhpcy5nZW5lcmF0ZSgpXG4gICAgfVxuICB9O1xuXG4gIGdldCB3aWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLndpZHRoO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmhlaWdodDtcbiAgfVxuXG4gIGdlbmVyYXRlKCkge1xuICAgIHZhciB4LCB5O1xuICAgIHZhciByb2NrID0gdGhpcy5nZXQoXCJyb2NrXCIpO1xuICAgIGZvciAoeCA9IDA7IHggPCB0aGlzLm9wdGlvbnMud2lkdGg7IHgrKylcbiAgICAgIGZvciAoeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgdmFyIHZhbCA9IE1hdGguc2luKHggKiAwLjMpICsgTWF0aC5zaW4oeSAqIDAuMTUpICogMi4wOy8vL3RoaXMub3B0aW9ucy53aWR0aDtcbiAgICAgICAgcm9jayh4LCB5LCB2YWwpO1xuICAgICAgfVxuICB9O1xuXG4gIGdldCh0eXBlKSB7XG4gICAgdmFyIHcgPSB0aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgdmFyIGFycmF5ID0gdGhpcy5tYXBbdHlwZV07XG5cbiAgICB2YXIgZmN0ID0gZnVuY3Rpb24gKHgsIHksIHZhbCkge1xuICAgICAgdmFyIGkgPSB4ICsgdyAqIHk7XG4gICAgICBpZiAodmFsKVxuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPSB2YWw7XG4gICAgICByZXR1cm4gYXJyYXlbaV07XG4gICAgfTtcblxuICAgIGZjdC5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICB2YXIgZnggPSBNYXRoLmZsb29yKHgpO1xuICAgICAgdmFyIGZ5ID0gTWF0aC5mbG9vcih5KTtcbiAgICAgIHZhciB2MDAgPSB0aGlzKGZ4LCBmeSk7XG4gICAgICB2YXIgdjAxID0gdGhpcyhmeCwgZnkgKyAxKTtcbiAgICAgIHZhciB2MTAgPSB0aGlzKGZ4ICsgMSwgZnkpO1xuICAgICAgdmFyIHYxMSA9IHRoaXMoZnggKyAxLCBmeSArIDEpO1xuICAgICAgdmFyIGR4ID0geCAtIGZ4O1xuICAgICAgdmFyIGR5ID0geSAtIGZ5O1xuICAgICAgcmV0dXJuICh2MDAgKiAoMSAtIGR4KSArIHYxMCAqIGR4KSAqICgxIC0gZHkpICsgKHYwMSAqICgxIC0gZHgpICsgdjExICogZHgpICogZHk7XG4gICAgfTtcblxuICAgIHJldHVybiBmY3Q7XG4gIH07XG5cbiAgcGlja0dyZWVuKHcsIGgsIGRhdGEpIHtcbiAgICB2YXIgYSA9IG5ldyBBcnJheSh3ICogaCk7XG4gICAgdmFyIHgsIHk7XG4gICAgZm9yICh5ID0gMDsgeSA8IGg7IHkrKykge1xuICAgICAgZm9yICh4ID0gMDsgeCA8IHc7IHgrKykge1xuICAgICAgICBhW3kgKiB3ICsgeF0gPSBkYXRhWyh5ICogdyArIHgpICogNCArIDFdICogMC4yO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYTtcbiAgfTtcblxuXG4gIHRvVGhyZWVUZXJyYWluKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gKGcsIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHhsID0gb3B0aW9ucy54U2VnbWVudHMgKyAxLFxuICAgICAgICB5bCA9IG9wdGlvbnMueVNlZ21lbnRzICsgMTtcbiAgICAgIGNvbnN0IHJvY2sgPSBzZWxmLmdldChcInJvY2tcIik7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHhsOyBpKyspIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB5bDsgaisrKSB7XG4gICAgICAgICAgZ1soeWwgLSBqIC0gMSkgKiB4bCArIGldLnogKz0gcm9jayhpLCBqKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLypcbiAgICAgIHRvVGV4dHVyZSgpIHtcbiAgICAgICAgICAvLyBVTlRFU1RFRCAhISEhXG4gICAgICAgICAgdmFyIHJhbXBUZXggPSBuZXcgVEhSRUUuRGF0YVRleHR1cmUoZGF0YS5waXhlbHMsIGRhdGEud2lkdGgsIGRhdGEuaGVpZ2h0LCBUSFJFRS5SR0JBRm9ybWF0KTtcbiAgICAgICAgICByYW1wVGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICAgIH07XG4gICovXG5cbi8vIEZJWE1FIHRoaXMgc2hvdWxkIG1vdmVkIHNvbWV3aGVyZSBlbHNlXG4gIHRvQ2FudmFzKF90eXBlKSB7XG4gICAgdmFyIHR5cGUgPSBfdHlwZSB8fCBcInJvY2tcIjtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXG4gICAgICBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY2FudmFzLndpZHRoID0gdGhpcy5vcHRpb25zLndpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSB0aGlzLm9wdGlvbnMuaGVpZ2h0O1xuICAgIHZhciBkID0gY29udGV4dC5jcmVhdGVJbWFnZURhdGEoY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KSxcbiAgICAgIGRhdGEgPSBkLmRhdGE7XG4gICAgdmFyIG1pbiwgbWF4O1xuICAgIHZhciBhY2Nlc3NvciA9IHRoaXMuZ2V0KHR5cGUpO1xuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgIHZhciB2ID0gYWNjZXNzb3IoeCwgeSk7XG5cbiAgICAgICAgaWYgKCFtaW4gfHwgbWluID4gdilcbiAgICAgICAgICBtaW4gPSB2O1xuICAgICAgICBpZiAoIW1heCB8fCBtYXggPCB2KVxuICAgICAgICAgIG1heCA9IHY7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwiTU1NTVwiLCBtaW4sIG1heCk7XG5cbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm9wdGlvbnMud2lkdGg7IHgrKykge1xuICAgICAgICB2YXIgaSA9IHkgKiB0aGlzLm9wdGlvbnMuaGVpZ2h0ICsgeDtcbiAgICAgICAgaWR4ID0gaSAqIDQ7XG4gICAgICAgIGRhdGFbaWR4XSA9IGRhdGFbaWR4ICsgMV0gPSBkYXRhW2lkeCArIDJdID0gTWF0aC5yb3VuZCgoKGFjY2Vzc29yKHgsIHkpIC0gbWluKSAvIChtYXggLSBtaW4pKSAqIDI1NSk7XG4gICAgICAgIGRhdGFbaWR4ICsgM10gPSAyNTU7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGQsIDAsIDApO1xuICAgIHJldHVybiBjYW52YXM7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSGVpZ2h0TWFwO1xuIiwiZnVuY3Rpb24gYWpheCh1cmwsIG1ldGhvZCA9IFwiR0VUXCIsIGRhdGEgPSB7fSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT09IFhNTEh0dHBSZXF1ZXN0LkRPTkUpIHtcblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA8PSAyOTkgJiYgcmVxdWVzdC5zdGF0dXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSRVNQT05TRVwiLCByZXF1ZXN0LCB0eXBlb2YgcmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIEVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhamF4OyIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4vdmVjdG9yMlwiO1xuaW1wb3J0IEV2ZW50cyBmcm9tIFwiLi4vbGlicy9ldmVudHNcIjtcblxudmFyIHVpZCA9IDExMTEwO1xuXG5jbGFzcyBFbnRpdHkge1xuICBjb25zdHJ1Y3RvcihoZWlnaHRtYXAsIG9wcykge1xuXG4gICAgdmFyIGVudGl0eSA9IG9wcy5lbnRpdHlUeXBlc1tvcHMudHlwZV07XG4gICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIkVudGl0eTogTm8gRW50aXR5LVR5cGUgbmFtZWQgXCIgKyBvcHMudHlwZSArIFwiIGZvdW5kIVwiKTtcbiAgICAgIGVudGl0eSA9IHt9O1xuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGVudGl0eSk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBvcHMpO1xuICAgIC8vIEZJWE1FOiByZWR1Y2UgY29tcGxleGl0eSBhbmQgcmVmZXJlbmNlcyBieSByZW1vdmluZyBtb2RlbHMsIG1hcCBhbmQgc28gPz8/XG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMucG9zKTtcbiAgICB0aGlzLnR5cGVOYW1lID0gdGhpcy50eXBlO1xuICAgIHRoaXMudWlkID0gdWlkKys7XG4gICAgdGhpcy5tYXAgPSBoZWlnaHRtYXA7XG4gICAgLy8gY2xvbmVcbiAgICB0aGlzLnJlc291cmNlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucmVzb3VyY2VzKTtcbiAgICB0aGlzLnR5cGUgPSBlbnRpdHk7XG4gICAgaWYgKCF0aGlzLm1lc2hOYW1lKVxuICAgICAgdGhpcy5tZXNoTmFtZSA9IFwiZGVmYXVsdFwiO1xuXG4gICAgaWYgKGVudGl0eS5taXhpbnMpIHtcbiAgICAgIHRoaXMubWl4aW5zID0ge307XG4gICAgICB0aGlzLm1peGluTmFtZXMgPSBbXTtcbiAgICAgIHRoaXMubWl4aW5EZWYgPSBlbnRpdHkubWl4aW5zO1xuICAgICAgZW50aXR5Lm1peGlucy5mb3JFYWNoKG1peGluID0+IHtcbiAgICAgICAgdmFyIGZvdW5kID0gb3BzLm1peGluRGVmc1ttaXhpbl07XG4gICAgICAgIGlmIChmb3VuZCAmJiBmb3VuZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgZm91bmQgPSBmb3VuZCgpO1xuICAgICAgICAgIHRoaXMubWl4aW5zW21peGluXSA9IGZvdW5kO1xuICAgICAgICAgIHRoaXMubWl4aW5OYW1lcy5wdXNoKG1peGluKTtcbiAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIGZvdW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIk1peGluIG5vdCBmb3VuZFwiLCBtaXhpbilcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuY2hhbmdlZCA9IG5ldyBFdmVudHMoKTtcbiAgfTtcblxuICBnZXQgaWQoKSB7XG4gICAgcmV0dXJuIHRoaXMudWlkXG4gIH1cblxuICBydW5Qb3N0TG9hZCgpIHtcbiAgICBmb3IgKHZhciBtaXhpbiBpbiB0aGlzLm1peGlucykge1xuICAgICAgaWYgKHRoaXMubWl4aW5zW21peGluXS5wb3N0TG9hZCkge1xuICAgICAgICB0aGlzLm1peGluc1ttaXhpbl0ucG9zdExvYWQuYXBwbHkodGhpcywgW10pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzQShtaXhpbikge1xuICAgIHJldHVybiB0aGlzLm1peGluRGVmLmluZGV4T2YobWl4aW4pID49IDA7XG4gIH1cblxuICBhc3luYyBzZXRTY2VuZShzY2VuZSkge1xuICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRNZXNoKHRoaXMubWVzaE5hbWUpO1xuICB9O1xuXG4gIGNvbXB1dGVNZXNoUG9zKCkge1xuICAgIGNvbnN0IGggPSB0aGlzLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMucG9zLngsIHRoaXMucG9zLnkpO1xuICAgIHJldHVybiB7eDogdGhpcy5wb3MueCwgeTogaCwgejogLXRoaXMucG9zLnl9O1xuICB9XG5cbiAgdXBkYXRlTWVzaFBvcygpIHtcbiAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICBpZiAodGhpcy5tZXNoICYmIHRoaXMubWVzaC5yb3RhdGlvbiAmJiB0aGlzLnJvdGF0aW9uKSB7XG4gICAgICAgIHRoaXMubWVzaC5yb3RhdGlvbi55ID0gdGhpcy5yb3RhdGlvbjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5jb21wdXRlTWVzaFBvcygpO1xuICAgICAgdGhpcy5tZXNoLnNldFBvcyhwb3NpdGlvbi54LCBwb3NpdGlvbi55LCBwb3NpdGlvbi56KTtcbiAgICB9XG4gIH07XG5cbiAgZ2V0TWVzaERlZigpIHtcbiAgICBjb25zdCBlbnRpdHkgPSB0aGlzLnR5cGU7XG4gICAgdmFyIG1lc2hUeXBlO1xuICAgIHZhciBhbmltYXRpb247XG5cbiAgICBpZiAodGhpcy50eXBlLm1lc2hlcykge1xuICAgICAgdmFyIGRlZiA9IGVudGl0eS5tZXNoZXNbdGhpcy5tZXNoTmFtZV07XG4gICAgICBpZiAoIWRlZilcbiAgICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBvZiBuYW1lICdcIiArIG5hbWUgKyBcIicgZm91bmQgaW4gZW50aXR5LWRlZlwiLCBlbnRpdHkpO1xuICAgICAgbWVzaFR5cGUgPSBkZWYubWVzaDtcbiAgICAgIGFuaW1hdGlvbiA9IGRlZi5hbmltYXRpb247XG4gICAgfSBlbHNlIGlmIChlbnRpdHkubWVzaCkge1xuICAgICAgbWVzaFR5cGUgPSBlbnRpdHkubWVzaDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaFR5cGUgPSB0aGlzLnR5cGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4ge21lc2hUeXBlLCBhbmltYXRpb259O1xuICB9XG5cbiAgc2V0TWVzaChuYW1lKSB7XG5cbiAgICBpZiAobmFtZSkge1xuICAgICAgdGhpcy5tZXNoTmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgY29uc3Qge21lc2hUeXBlLCBhbmltYXRpb259ID0gdGhpcy5nZXRNZXNoRGVmKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tb2RlbExvYWRlci5sb2FkKG1lc2hUeXBlLCBhbmltYXRpb24pLnRoZW4oKG1lc2gpID0+IHtcbiAgICAgIG1lc2guYXR0YWNoVG9TY2VuZSh0aGlzLnNjZW5lKTtcblxuICAgICAgaWYgKHRoaXMubWVzaCkge1xuICAgICAgICB0aGlzLm1lc2gucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgICB0aGlzLm1lc2ggPSBtZXNoO1xuICAgICAgbWVzaC5zZXRFbnRpdHkodGhpcyk7XG4gICAgICB0aGlzLnVwZGF0ZU1lc2hQb3MoKTtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkZpbmlzaGVkKSB7XG4gICAgICAgIHRoaXMubWVzaC5hbmltYXRpb25GaW5pc2hlZCA9IHRoaXMuYW5pbWF0aW9uRmluaXNoZWQuYmluZCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubWVzaC5ob3ZlcmVkKHRoaXMuc3RhdGUuaG92ZXJlZCk7XG4gICAgICB0aGlzLm1lc2guc2VsZWN0ZWQodGhpcy5zdGF0ZS5zZWxlY3RlZCk7XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH0pO1xuICB9O1xuXG4gIGhvdmVyZWQodmFsKSB7XG4gICAgcmV0dXJuIHRoaXMubWVzaC5ob3ZlcmVkKHRoaXMuc3RhdGUuaG92ZXJlZCA9IHZhbCk7XG4gIH07XG5cbiAgc2VsZWN0ZWQodmFsKSB7XG4gICAgcmV0dXJuIHRoaXMubWVzaC5zZWxlY3RlZCh0aGlzLnN0YXRlLnNlbGVjdGVkID0gdmFsKTtcbiAgfTtcblxuICBpbmNyZWFzZUJ5KHdoYXQsIGFtb3VudCkge1xuICAgIHRoaXMucmVzb3VyY2VzW3doYXRdID0gKHRoaXMucmVzb3VyY2VzW3doYXRdIHx8IDApICsgYW1vdW50O1xuICAgIHRoaXMuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcbiAgfTtcblxuICB0YWtlKHdoYXQsIGFtb3VudCkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIHRoaXMuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICBnaXZlKHdoYXQsIGFtb3VudCwgdG9FbnRpdHkpIHtcbiAgICBpZiAodGhpcy5yZXNvdXJjZXNbd2hhdF0gPj0gYW1vdW50KSB7XG4gICAgICB0aGlzLnJlc291cmNlc1t3aGF0XSAtPSBhbW91bnQ7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiR0lWRSBUT1wiLCB0b0VudGl0eSwgd2hhdCk7XG4gICAgICB0b0VudGl0eS5yZXNvdXJjZXNbd2hhdF0gPSAodG9FbnRpdHkucmVzb3VyY2VzW3doYXRdIHx8IDApICsgYW1vdW50O1xuICAgICAgdGhpcy5jaGFuZ2VkLnB1Ymxpc2goXCJjaGFuZ2VkXCIpO1xuICAgICAgdG9FbnRpdHkuY2hhbmdlZC5wdWJsaXNoKFwiY2hhbmdlZFwiKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQge0VudGl0eX1cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICAgIFwibWVzaFwiOiBcImJha2VyeTNcIlxuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiYmlnX3N0b25lM1wiXG4gIH0sXG4gIFwiY3JvcF9zbWFsbFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF9tZWRcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfaGlnaFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF90aW55XCI6IHtcbiAgICBcIm1lc2hcIjogXCJjcm9wX3RpbnkyXCIsXG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmFybTJcIlxuICB9LFxuICBcImZpc2hpbmdfaHV0XCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXNoaW5nX2h1dDJcIixcbiAgfSxcbiAgXCJncmF2ZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZ3JhdmUyXCJcbiAgfSxcbiAgXCJoZXJvXCI6IHtcbiAgICBcIm1lc2hcIjogXCJoZXJvX2xwMlwiXG4gIH0sXG4gIFwibWluZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWluZTNcIlxuICB9LFxuICBcIm1pbGxcIjoge1xuICAgIFwibWVzaFwiOiBcIm1pbGxcIixcbiAgICBcInNjYWxlXCI6IDFcbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwidG93bmhhbGxfdHJ5M1wiXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWVzaFwiOiBcInRvd2VyMlwiXG4gIH0sXG4gIFwibWFuX3BpY2tcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9waWNrXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDQ1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0OCxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAzNSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBpY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fYXhlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fYXhlXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNDAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDM1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDI3LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGlja1wiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9lX3dhbGtcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMzAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJhbmltYXRlXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDE4LFxuICAgICAgICBcImxvb3BcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcInN0YW5kXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0MCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0MFxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDMwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNjVcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAxMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDY1XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9maWdodFwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2ZpZ2h0XCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImZpZ2h0XCI6IHtcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDEsXG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDE4LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDM1LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDIwLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwidWdoXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiZmlyXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXI0XCJcbiAgfSxcbiAgXCJmaXJfb2xkXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXIyXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwiZmlyNS5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuNDIsXG4gICAgXCJkb3VibGVzaWRlZFwiOiB0cnVlLFxuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZVxuICB9LFxuXG4gIFwidHJlZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwidHJlZTVcIixcbiAgICBcInNjYWxlXCI6IDAuMixcbiAgICBcImRvdWJsZXNpZGVkXCI6IHRydWVcbiAgfSxcbiAgXCJzaGVlcFwiOiB7XG4gICAgXCJzY2FsZVwiOiAwLjE1LFxuLy8gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJ0ZXh0dXJlXCI6IFwic2hlZXAucG5nXCIsXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0NVxuICAgICAgfSxcbiAgICAgIFwiZWF0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImxvb3BcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA2MCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDEwMFxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ3ZWxsXCJcbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJtZXNoXCI6IFwid29ya3Nob3AyXCIsXG4gICAgXCJwYXJ0aWNsZXNcIjoge1xuICAgICAgXCJzbW9rZVwiOiB7XG4gICAgICAgIFwicG9zaXRpb25cIjoge1xuICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgIFwielwiOiAwXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImNvbnN0IG9ubHlPbmVBdEFUaW1lID0gKGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgd2l0aGluID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChmY3QpIHtcbiAgICAgICAgaWYgKHdpdGhpbikge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBvbmx5T25lQXRBVGltZShmY3QpLCAxMClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpdGhpbj10cnVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBmY3QoKTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgd2l0aGluID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSgpO1xuXG5cbmNsYXNzIE1vZGVsIHtcbiAgICBjb25zdHJ1Y3Rvcihpbm5lck1lc2hlcywgb3V0ZXJOb2RlLCBob3ZlclJpbmcsIHNlbGVjdFJpbmcpIHtcbiAgICAgICAgdGhpcy5pbm5lck1lc2hlcyA9IGlubmVyTWVzaGVzO1xuICAgICAgICB0aGlzLm91dGVyTm9kZSA9IG91dGVyTm9kZTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uO1xuICAgICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5vdXRlck5vZGUucm90YXRpb247XG4gICAgICAgIHRoaXMuaG92ZXJSaW5nID0gaG92ZXJSaW5nO1xuICAgICAgICB0aGlzLnNlbGVjdFJpbmcgPSBzZWxlY3RSaW5nO1xuICAgIH1cblxuICAgIGF0dGFjaFRvU2NlbmUoc2NlbmUpIHtcbiAgICAgICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgICAgICBpZihmYWxzZSkge1xuICAgICAgICAgICAgb25seU9uZUF0QVRpbWUoKCkgPT4gc2NlbmUuYWRkKHRoaXMub3V0ZXJOb2RlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2VuZS5hZGQodGhpcy5vdXRlck5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRFbnRpdHkoZW50aXR5KSB7XG4gICAgICAgIF8uZWFjaCh0aGlzLmlubmVyTWVzaGVzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgbS51c2VyRGF0YS5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgaG92ZXJlZCh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmhvdmVyUmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmhvdmVyUmluZy52aXNpYmxlO1xuICAgIH1cblxuICAgIHNlbGVjdGVkKHZhbCkge1xuICAgICAgICBpZiAodmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdFJpbmcudmlzaWJsZTtcbiAgICB9XG5cbiAgICBkZXRhY2hGcm9tU2NlbmUoKSB7XG4gICAgICAgIHNjZW5lLnJlbW92ZSh0aGlzLm91dGVyTm9kZSlcbiAgICB9XG5cbiAgICBzZXRQb3MoeCwgeSwgeikge1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi54ID0geDtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueSA9IHk7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnogPSB6O1xuICAgIH1cblxuICAgIGVuYWJsZVBhcnRpY2xlcyh0eXBlKSB7XG4gICAgICAgIGlmICghdGhpcy5lbWl0dGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVsIC0gRU5BQkxFXCIpO1xuICAgICAgICAgICAgdmFyIGVtaXR0ZXIgPSB0aGlzLmVtaXR0ZXIgPSB0aGlzLnNjZW5lLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKTsgLy9hZGRFbWl0dGVyKCBCYXNlLm1ha2VFbWl0dGVyKG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKSkpO1xuICAgICAgICAgICAgZW1pdHRlci5wb3NpdGlvbi52YWx1ZSA9IHRoaXMucG9zaXRpb25cbiAgICAgICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkaXNhYmxlUGFydGljbGVzKHR5cGUpIHtcbiAgICAgICAgaWYgKHRoaXMuZW1pdHRlcikge1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWwgLSBESVNBQkxFXCIsIHR5cGUpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZW1pdHRlcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbW92ZSgpIHtcbiAgICAgICAgLy8gaG9vayB0byByZW1vdmUgYW5pbWF0aW9uLXJlc3RhcnRlci1pbnRlcnZhbFxuICAgICAgICBpZiAodGhpcy5pbm5lck1lc2hlcyAmJiB0aGlzLmlubmVyTWVzaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIF8uZWFjaCh0aGlzLmlubmVyTWVzaGVzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgIGlmIChtLmJlZm9yZVJlbW92ZSlcbiAgICAgICAgICAgICAgICAgICAgbS5iZWZvcmVSZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlKHRoaXMub3V0ZXJOb2RlKTtcbiAgICAgICAgZGVsZXRlIHRoaXMub3V0ZXJOb2RlO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWw7XG4iLCJpbXBvcnQgTWVzaGVzIGZyb20gXCIuLi9jb25maWcvbWVzaGVzXCJcbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9tb2RlbFwiXG5cbi8vIEZJWE1FOiBub3QgbmVlZGVkIGFueW1vcmU/XG5mdW5jdGlvbiBlbnN1cmVMb29wKGFuaW1hdGlvbikge1xuICByZXR1cm47XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uLmhpZXJhcmNoeS5sZW5ndGg7IGkrKykge1xuXG4gICAgdmFyIGJvbmUgPSBhbmltYXRpb24uaGllcmFyY2h5W2ldO1xuXG4gICAgdmFyIGZpcnN0ID0gYm9uZS5rZXlzWzBdO1xuICAgIHZhciBsYXN0ID0gYm9uZS5rZXlzW2JvbmUua2V5cy5sZW5ndGggLSAxXTtcblxuICAgIGxhc3QucG9zID0gZmlyc3QucG9zO1xuICAgIGxhc3Qucm90ID0gZmlyc3Qucm90O1xuICAgIGxhc3Quc2NsID0gZmlyc3Quc2NsO1xuICB9XG59XG5cbmNsYXNzIE1vZGVsTG9hZGVyIHtcblxuICBjb25zdHJ1Y3Rvcihsb2FkZXJzID0ge30sIG1hbmFnZXIgPSBudWxsLCBtZXNoZXMgPSBudWxsKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfLnBpY2sobG9hZGVycywgWydpbWFnZUxvYWRlciddKSk7XG5cbiAgICBpZiAoIW1hbmFnZXIgJiYgVEhSRUUuTG9hZGluZ01hbmFnZXIpIHtcbiAgICAgIG1hbmFnZXIgPSBuZXcgVEhSRUUuTG9hZGluZ01hbmFnZXIoKTtcbiAgICB9XG4gICAgaWYgKG1lc2hlcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IG1lc2hlcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tZXNoZXMgPSBNZXNoZXM7XG4gICAgfVxuICAgIG1hbmFnZXIub25Qcm9ncmVzcyA9IGZ1bmN0aW9uIChpdGVtLCBsb2FkZWQsIHRvdGFsKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwibWFuYWdlci5vblByb2dyZXNzXCIsIGl0ZW0sIGxvYWRlZCwgdG90YWwpO1xuICAgIH07XG5cbiAgICBpZiAoIXRoaXMuaW1hZ2VMb2FkZXIgJiYgVEhSRUUuSW1hZ2VMb2FkZXIpIHtcbiAgICAgIHRoaXMuaW1hZ2VMb2FkZXIgPSBuZXcgVEhSRUUuSW1hZ2VMb2FkZXIobWFuYWdlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIgJiYgVEhSRUUuR0xURkxvYWRlcikge1xuICAgICAgdGhpcy5nbHRmTG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgIGlmICghdGhpcy50ZXh0dXJlTG9hZGVyICYmIFRIUkVFLlRleHR1cmVMb2FkZXIpIHtcbiAgICAgIHRoaXMudGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiBjb2xvcixcbiAgICAgIGZsYXRTaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC41LFxuICAgICAgZGVwdGhUZXN0OiBmYWxzZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgc29tZVJpbmcgPSBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuUmluZ0dlb21ldHJ5KDEuMywgMiwgMjAsIDUsIDAsIE1hdGguUEkgKiAyKSwgbWF0ZXJpYWwpO1xuICAgIHNvbWVSaW5nLnBvc2l0aW9uLnNldCgwLCAwLjUsIDAuMCk7XG4gICAgc29tZVJpbmcucm90YXRlT25BeGlzKG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApLCAtMS42KTtcbiAgICBzb21lUmluZy52aXNpYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIHNvbWVSaW5nXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlQm94KCkge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZGQ5OTAwLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjVcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEsIDEsIDEpLCBtYXRlcmlhbCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gIH1cblxuICBhc3luYyBwYWNrSW50b05vZGUob3B0aW9ucykge1xuICAgIGNvbnN0IHttZXNoRGVmLCBtZXNoLCBtZXNoTmFtZX0gPSBvcHRpb25zO1xuICAgIHZhciBvYmplY3RzO1xuICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cyA9IG1lc2guY2xvbmUoKTtcbiAgICB9XG4gICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcblxuICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgIC8vIGVuY2xvc2UgbWVzaCB3aXRoaW4gc2NlbmUtbm9kZSwgc28gdGhhdCBpdCBjYW4gYmUgcm90YXRlZCBhbmQgdGhlcmUgY2FuIGJlIHNldmVyYWwgbWVzaGVzXG4gICAgLy8gYXR0YWNoZWQgdG8gb25lIGVudGl0eVxuICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIF8uZWFjaChvYmplY3RzLCBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICBub2RlLmFkZChvYmplY3QpO1xuICAgIH0pO1xuICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgbmV3TW9kZWwubmFtZSA9IG1lc2g7XG4gICAgbmV3TW9kZWwudHlwZSA9IG1lc2hOYW1lO1xuXG4gICAgdGhpcy5hZGRSaW5ncyhub2RlLCBuZXdNb2RlbCk7XG5cbiAgICByZXR1cm4gbmV3TW9kZWxcbiAgfVxuXG4gIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuaG92ZXJSaW5nID0gTW9kZWxMb2FkZXIuY3JlYXRlUmluZygweGRkOTkwMCkpO1xuICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4RkY5OTAwKSk7XG4gIH1cblxuICBhc3luYyBsb2FkVW5jYWNoZWQobWVzaCwgYW5pbWF0aW9uKSB7XG4gICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgIGlmICghbWVzaERlZikge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBkZWZpbmVkIGZvciBuYW1lICdcIiArIG1lc2ggKyBcIidcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubG9hZE9iakNvbXBsZXRlKG1lc2gsIGFuaW1hdGlvbilcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmoobWVzaE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICBpZiAodGhpcy5nbHRmTG9hZGVyKSB7XG4gICAgICAgIHRoaXMuZ2x0ZkxvYWRlci5sb2FkKFxuICAgICAgICAgICdtb2RlbHMvJyArIG1lc2hOYW1lICsgJy5nbHRmJyxcbiAgICAgICAgICBtZXNoID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoe21lc2gsIG1lc2hOYW1lfSlcbiAgICAgICAgICB9LFxuICAgICAgICAgICh4aHIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc2hOYW1lICsgXCIgXCIgKyAoeGhyLmxvYWRlZCAvIHhoci50b3RhbCAqIDEwMCkgKyAnJSBsb2FkZWQnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsb2FkT2JqQ29tcGxldGUobmFtZSwgZHVtbXkpIHtcbiAgICBjb25zdCBtZXNoRGVmID0gdGhpcy5tZXNoZXNbbmFtZV07XG4gICAgY29uc3QgbWVzaE5hbWUgPSAobWVzaERlZiAmJiBtZXNoRGVmLm1lc2gpIHx8IG5hbWU7XG4gICAgY29uc3QgbWVzaE9iamVjdCA9IGF3YWl0IHRoaXMubG9hZE9iaihtZXNoTmFtZSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7bWVzaERlZn0sIG1lc2hPYmplY3QpO1xuICB9XG5cbiAgLy8gYW5pbWF0ZSAoY2xvbmVkKSBtZXNoXG4gIGFuaW1hdGUobWVzaCwgbmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IGFuaW1hdGlvbiA9IG5ldyBUSFJFRS5BbmltYXRpb24obWVzaCwgYW5pbWF0aW9uc1tuYW1lXSk7XG4gICAgYW5pbWF0aW9uLmRhdGEgPSBhbmltYXRpb25zW25hbWVdO1xuICAgIGNvbnN0IHNjYWxlID0gb3B0aW9ucy50aW1lU2NhbGUgfHwgMTtcblxuICAgIGlmIChvcHRpb25zLmxvb3AgPT09IGZhbHNlKSB7XG4gICAgICBhbmltYXRpb24ubG9vcCA9IGZhbHNlO1xuICAgIH1cbiAgICBhbmltYXRpb24udGltZVNjYWxlID0gc2NhbGU7XG4gICAgYW5pbWF0aW9uLnBsYXkoKTtcblxuICAgIC8vIGltcGxlbWVudCBzdXBwb3J0IGZvciBsb29waW5nIGludGVydmFsIHdpdGhpbiBnbG9iYWwgYW5pbWF0aW9uXG4gICAgLy8gaGF2ZSBhIGxvb2sgYXQgZW50aXR5IGFsc29cbiAgICBpZiAob3B0aW9ucy5zdGFydEZyYW1lKSB7XG4gICAgICAvL2FuaW1hdGlvbi51cGRhdGUoIG9wdGlvbnMuc3RhcnRGcmFtZSk7XG4gICAgICBpZiAob3B0aW9ucy5hbmltYXRlID09PSBmYWxzZSAmJiBmYWxzZSkge1xuICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICBhbmltYXRpb24udXBkYXRlKG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZW5kRnJhbWUpIHtcbiAgICAgICAgdmFyIHN0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFuaW1hdGlvbi5wbGF5KG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdG9wQW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJBTklNQUwgc3RvcEFOaW1hdGlvblwiLCBtZXNoLCBtZXNoLmFuaW1hdGlvbkZpbmlzaGVkKTtcbiAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgIGlmIChtZXNoLnVzZXJEYXRhICYmIG1lc2gudXNlckRhdGEuZW50aXR5ICYmIG1lc2gudXNlckRhdGEuZW50aXR5LmFuaW1hdGlvbkZpbmlzaGVkKVxuICAgICAgICAgICAgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRpbWUgPSAxMDAwICogKG9wdGlvbnMuZW5kRnJhbWUgLSBvcHRpb25zLnN0YXJ0RnJhbWUpIC8gc2NhbGU7XG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgICAgIGlmIChvcHRpb25zLmxvb3AgIT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoc3RhcnRBbmltYXRpb24sIHRpbWUpO1xuICAgICAgICAgIG1lc2guYmVmb3JlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBET05UIExPT1BcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoc3RvcEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGFuaW1hdGlvbi51cGRhdGUoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgfVxuXG4gIGxvYWRKU09OKG5hbWUsIGFuaW1hdGlvbikge1xuICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5tZXNoZXNbbmFtZV0pO1xuXG4gICAgLy8gbm93IG92ZXJyaWRlIHdpdGggb3B0aW9ucyBmcm9tIGFuaW1hdGlvbnMtcGFydFxuICAgIGlmIChvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSkge1xuICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9ucy5hbmltYXRpb25zW2FuaW1hdGlvbl0pO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkxvYWRpbmcgbW9kZWxcIiwgbmFtZSk7XG5cbiAgICAgIHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcbiAgICAgIHRoaXMuanNvbkxvYWRlci5sb2FkKCdtb2RlbHMvJyArIG5hbWUgKyAnLmpzb24nLCBmdW5jdGlvbiAoZ2VvbWV0cnksIG1hdGVyaWFscykge1xuXG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVWZXJ0ZXhOb3JtYWxzKCk7XG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXG4gICAgICAgIGVuc3VyZUxvb3AoZ2VvbWV0cnkuYW5pbWF0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0ZXJpYWxzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcblxuICAgICAgICAgIHZhciBvcmlnaW5hbE1hdGVyaWFsID0gbWF0ZXJpYWxzW2ldO1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJNQVRcIiwgb3JpZ2luYWxNYXRlcmlhbCk7XG4gICAgICAgICAgb3JpZ2luYWxNYXRlcmlhbC5za2lubmluZyA9IHRydWU7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZG91Ymxlc2lkZWQpIHtcbiAgICAgICAgICAgIC8vICBvcmlnaW5hbE1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkRPVUJMRVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChtYXRlcmlhbHMpO1xuICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZClcbiAgICAgICAgICBtYXRlcmlhbC5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWUpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICB3aXJlZnJhbWU6IHRydWUsXG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdE1hdGVyaWFsKSB7XG4gICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5Ta2lubmVkTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwsIGZhbHNlKTtcblxuICAgICAgICBhbmltYXRpb25zW25hbWVdID0gZ2VvbWV0cnkuYW5pbWF0aW9uO1xuXG4gICAgICAgIHJlc29sdmUobWVzaClcbiAgICAgIH0sIG51bGwsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWxMb2FkZXI7XG4iLCJpbXBvcnQge01vdmV9IGZyb20gJy4uL2xsL21vdmUnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmxldCBhbmltYWwgPSB7XG4gIG9uTm9Kb2I6IGZ1bmN0aW9uIChkZWx0YSkge1xuICAgIGlmICh0aGlzLnNob3VsZFdhbGsoKSkge1xuICAgICAgdGhpcy5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgIGxldCB0YXJnZXRQb3MgPSBuZXcgVmVjdG9yMihNYXRoLnJhbmRvbSgpICogMiAtIDEsXG4gICAgICAgIE1hdGgucmFuZG9tKCkgKiAyIC0gMSkuYWRkKHRoaXMucG9zKTtcblxuICAgICAgaWYgKHRoaXMud29ybGQpIHtcbiAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zLnRydW5jKDAsIDAsIHRoaXMud29ybGQud2lkdGgsIHRoaXMud29ybGQuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaEpvYihuZXcgTW92ZSh0aGlzLCB0YXJnZXRQb3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wbGF5QW5pbWF0aW9uKFwiZWF0XCIpO1xuICAgIH1cbiAgfSxcbiAgc2hvdWxkV2FsazogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSA8IDAuNSk7XG4gIH1cbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IGFuaW1hbDtcblxuZXhwb3J0IGRlZmF1bHQgQW5pbWFsO1xuXG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuXG5jbGFzcyBSZXN0Sm9iIGV4dGVuZHMgSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCB0aW1lKSB7XG4gICAgc3VwZXIoZW50aXR5KTtcbiAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgIHRoaXMuZG9uZVRpbWUgPSAwO1xuICB9XG5cbiAgLy8gbWF5YmUgaW1wbGVtZW50IHVzaW5nIHNldFRpbWVvdXQgP1xuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdGhpcy5kb25lVGltZSArPSBkZWx0YTtcbiAgICBpZiAodGhpcy5kb25lVGltZSA+IHRoaXMudGltZSkge1xuICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZG9uZVRpbWUgLSB0aGlzLnRpbWU7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXN0Sm9iO1xuXG4iLCJpbXBvcnQgUmVzdEpvYiBmcm9tIFwiLi4vbGwvcmVzdFwiO1xuXG5sZXQgam9iID0ge1xuICBqb2JzOiBudWxsLFxuICBwdXNoSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgaWYgKCF0aGlzLmpvYnMpXG4gICAgICB0aGlzLmpvYnMgPSBbXTtcbiAgICBpZiAodGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXSAmJiB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdLnJlYWR5KSB7XG4gICAgICB0aHJvdyBcIkpvYiBpcyByZWFkeSAtIGRvbnQnIHB1c2ghXCI7XG4gICAgfVxuICAgIHRoaXMuam9icy5wdXNoKGpvYik7XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gICAgaWYgKHRoaXMuY3VycmVudEpvYi5pbml0KVxuICAgICAgdGhpcy5jdXJyZW50Sm9iLmluaXQoKTtcbiAgfSxcbiAgcmVzZXROb25IbEpvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5qb2JzID0gXy5maWx0ZXIodGhpcy5qb2JzLCBmdW5jdGlvbiAoam9iKSB7XG4gICAgICAgIHJldHVybiBqb2IuYXNzaWduTWVKb2I7XG4gICAgICB9KTtcbiAgfSxcbiAgcmVzZXRKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5qb2JzID0gW107XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gIH0sXG4gIHVwZGF0ZUN1cnJlbnRKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5jdXJyZW50Sm9iID0gdGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXTtcbiAgfSxcbiAgdGljazogZnVuY3Rpb24gKGRlbHRhKSB7XG4gICAgd2hpbGUgKHRoaXMuam9icyAmJiBkZWx0YSA+IDAgJiYgdGhpcy5qb2JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBqb2IgPSB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdO1xuICAgICAgaWYoIShqb2Iub25GcmFtZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiSm9iLm9uRnJhbWUgaXMgbm90IGEgZnVuY3Rpb24gZm9yXCIsam9iKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZGVsdGEgPSBqb2Iub25GcmFtZShkZWx0YSk7XG4gICAgICBpZiAoam9iLnJlYWR5KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJKT0IgSVMgUkVBRFlcIiwgam9iKVxuICAgICAgICBpZiAoam9iLmFzc2lnbk1lSm9iKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJKT0IgUkVBRFkhISFcIiwgdGhpcy5qb2JzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmpvYnMucG9wKCk7XG4gICAgICAgIHRoaXMudXBkYXRlQ3VycmVudEpvYigpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsdGEgPiAwKSB7XG4gICAgICBpZiAodGhpcy5vbk5vSm9iKSB7XG4gICAgICAgIHRoaXMub25Ob0pvYihkZWx0YSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwbGF5QW5pbWF0aW9uOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIC8vRklYTUU6IHNldCBiYWNrIHRvIDIwICg/KVxuICAgIHRoaXMucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLCAyKSk7XG4gICAgdGhpcy5zZXRNZXNoKG5hbWUpO1xuICB9LFxuICBhbmltYXRpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzZXRKb2JzKCk7XG4gIH1cbn07XG5cbmNvbnN0IEpvYiA9ICgpID0+IGpvYjtcblxuZXhwb3J0IHtKb2J9XG5cblxuIiwibGV0IGZvbGxvd2VyID0ge1xuICBjaGVja0Jvc3M6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuYm9zcykge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBtaXhpbk5hbWVzOiBcImhvdXNlXCJcbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiAodGhpcy5ib3NzKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhpcy5fYXNzaWduQm9zcyh0aGlzLl9maW5kU29tZUJvc3Moe1xuICAgICAgICBuYW1lOiB0aGlzLmJvc3NcbiAgICAgIH0pKTtcbiAgICB9XG4gIH0sXG4gIG9uTm9Kb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNoZWNrQm9zcygpO1xuICAgIGlmICh0aGlzLmJvc3MgJiYgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKVxuICAgICAgdGhpcy5ib3NzLmFzc2lnbk1lSm9iKHRoaXMpO1xuICB9LFxuICBfZmluZFNvbWVCb3NzKHNwZWNzKSB7XG4gICAgaWYgKHRoaXMud29ybGQuc2VhcmNoKSB7XG4gICAgICB2YXIgZiA9IHRoaXMud29ybGQuc2VhcmNoKHNwZWNzLCB0aGlzLnBvcyk7XG4gICAgICBpZiAoZi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBmWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgX2Fzc2lnbkJvc3MoYm9zcykge1xuICAgIHRoaXMuYm9zcyA9IGJvc3M7XG4gICAgaWYgKGJvc3MgIT0gbnVsbCkge1xuICAgICAgdGhpcy5ib3NzLmFkZEZvbGxvd2VyKHRoaXMpO1xuICAgIH1cbiAgfVxufTtcblxuXG5sZXQgRm9sbG93ZXIgPSAoKSA9PiBmb2xsb3dlcjtcbmV4cG9ydCB7Rm9sbG93ZXJ9XG4iLCJjbGFzcyBITEpvYiB7XG4gIGNvbW1vblN0YXJ0KCkge1xuICAgIGlmICghdGhpcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5lbnRpdHkuZm9sbG93ZXJzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIHRoaXMuYXNzaWduTWVKb2IoZSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuYXNzaWduTWVKb2IodGhpcy5lbnRpdHkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIGlmICghdGhpcy5yZWFkeSlcbiAgICAgIGlmICghdGhpcy5jb21tb25TdGFydCgpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiT05GUkFNRVwiLCB0aGlzLnJlYWR5KTtcbiAgICAgICAgdGhpcy5hc3NpZ25NZUpvYih0aGlzLmVudGl0eSk7XG4gICAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHtITEpvYn1cbiIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcblxuY2xhc3MgQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZm9ybUNhY2hlID0ge307XG4gICAgdGhpcy5mb3JtU2l6ZSA9IC0xO1xuICB9XG5cbiAgc29ydChmb2xsb3dlcnMpIHtcbiAgICByZXR1cm4gZm9sbG93ZXJzO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zQ2FjaGVkKGJvc3MsIGkpIHtcbiAgICBpZiAodGhpcy5mb3JtU2l6ZSAhPSBib3NzLmZvbGxvd2Vycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZm9ybVNpemUgPSBib3NzLmZvbGxvd2Vycy5sZW5ndGg7XG4gICAgICB0aGlzLmZvcm1DYWNoZSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZm9ybUNhY2hlW2ldKSB7XG4gICAgICB0aGlzLmZvcm1DYWNoZVtpXSA9IHRoaXMuY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mb3JtQ2FjaGVbaV07XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIGlmIChpID4gMSkge1xuICAgICAgaSArPSAxO1xuICAgIH1cblxuICAgIHZhciByb3cgPSBNYXRoLmZsb29yKGkgLyA1KTtcbiAgICB2YXIgY29sID0gaSAlIDU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoY29sICogZCAtIGQgKiAyLCByb3cgKiBkKTtcbiAgfVxuXG4gIGNvbXB1dGVQb3MoYm9zcywgaSwgYmFzZVBvcykge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmFkZFZlY3RvcnModGhpcy5jb21wdXRlUmVsYXRpdmVQb3NDYWNoZWQoYm9zcywgaSksIGJhc2VQb3MpO1xuICB9XG5cbiAgZ2V0UG9zKGJvc3MsIGZvbGxvd2VyLCBiYXNlUG9zKSB7XG4gICAgaWYgKCFiYXNlUG9zKSB7XG4gICAgICBiYXNlUG9zID0gYm9zcy5wb3M7XG4gICAgfVxuXG4gICAgaWYgKGJvc3MgPT0gZm9sbG93ZXIpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMigpLmNvcHkoYmFzZVBvcyk7XG4gICAgfVxuXG4gICAgdmFyIGZvbGxvd2VycyA9IHRoaXMuc29ydChib3NzLmZvbGxvd2Vycyk7XG5cbiAgICB2YXIgaSA9IF8uaW5kZXhPZihmb2xsb3dlcnMsIGZvbGxvd2VyKTtcbiAgICByZXR1cm4gdGhpcy5jb21wdXRlUG9zKGJvc3MsIGksIGJhc2VQb3MpO1xuICB9XG5cbn1cblxuZXhwb3J0IHtCYXNlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0FuZ2xlfSBmcm9tICcuLi9hbmdsZSdcblxudmFyIGxpbmVzID0gWzEwLCAxNCwgMjAsIDQwLCAxMDBdO1xuXG5jbGFzcyBSZXN0IGV4dGVuZHMgQmFzZSB7XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICB2YXIgcm93ID0gbnVsbCwgY2kgPSBpO1xuICAgIHZhciBtYXggPSAwLCBjb3VudDtcbiAgICBfLmZpbmQobGluZXMsIGZ1bmN0aW9uIChsaW5lLCBrKSB7XG4gICAgICBjaSAtPSBsaW5lO1xuICAgICAgbWF4ICs9IGxpbmU7XG4gICAgICBpZiAoY2kgPCAwKSB7XG4gICAgICAgIHJvdyA9IGs7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIC8vIGNvdW50IG9mIHNlZ21lbnRzIGZvciBjdXJyZW50IGNpcmNsZVxuICAgIGNvdW50ID0gbGluZXNbcm93XTtcblxuICAgIC8vIGlmIGN1cnJlbnQgY2lyY2xlIGlzIHRoZSB3aWRlc3QsIHRoZW4gb25seSBzbyBtYW55IHNlZ21lbnRzIGxpa2UgbWVuIGxlZnRcbiAgICBpZiAoYm9zcy5mb2xsb3dlcnMubGVuZ3RoIDwgbWF4KVxuICAgICAgY291bnQgLT0gKG1heCAtIGJvc3MuZm9sbG93ZXJzLmxlbmd0aCk7XG4gICAgdmFyIGFuZ2xlID0gKGkgLyBjb3VudCkgKiAyICogTWF0aC5QSTtcbiAgICB2YXIgcmFkaXVzID0gKHJvdyArIDEpICogMS40O1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihNYXRoLnNpbihhbmdsZSkgKiByYWRpdXMsIE1hdGguY29zKGFuZ2xlKSAqIHJhZGl1cyk7XG4gIH07XG5cbiAgZ2V0RGlyKGJvc3MsIGUpIHtcbiAgICB2YXIgbmV3UG9zID0gdGhpcy5nZXRQb3MoYm9zcywgZSk7XG4gICAgcmV0dXJuIEFuZ2xlLmZyb21WZWN0b3IyKG5ldyBWZWN0b3IyKCkuc3ViVmVjdG9ycyhib3NzLnBvcywgbmV3UG9zKSk7XG4gIH1cblxufVxuXG5leHBvcnQge1Jlc3R9XG4iLCJpbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5pbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcblxuY2xhc3MgTnVsbCBleHRlbmRzIEJhc2Uge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoMCwgMCk7XG4gIH1cblxuICBnZXREaXIoYm9zcywgZSkge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmV4cG9ydCB7TnVsbH1cbiIsImltcG9ydCB7QmFzZX0gZnJvbSAnLi9iYXNlJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5jbGFzcyBNb3ZlIGV4dGVuZHMgQmFzZSB7XG5cbiAgY29uc3RydWN0b3IoYW5nbGUpIHtcbiAgICBzdXBlcihhbmdsZSk7XG4gICAgdGhpcy5hbmdsZSA9IGFuZ2xlO1xuICB9XG5cbiAgY29tcHV0ZVJlbGF0aXZlUG9zKGJvc3MsIGkpIHtcbiAgICBpZiAoaSA+PSAyKSB7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgdmFyIHJvdyA9IE1hdGguZmxvb3IoaSAvIDUpO1xuICAgIHZhciBjb2wgPSBpICUgNTtcbiAgICB2YXIgYmxvY2sgPSBNYXRoLmZsb29yKGkgLyAyNSk7XG5cbiAgICB2YXIgeCA9IGNvbCAtIDI7XG4gICAgdmFyIHkgPSByb3cgKyBibG9jaztcblxuICAgIHZhciBhbmdsZSA9IHRoaXMuYW5nbGU7XG4gICAgdmFyIGQgPSAwLjg7XG5cbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoZCAqIE1hdGguY29zKGFuZ2xlKSAqIHggLSBkICogTWF0aC5zaW4oYW5nbGUpICogeSxcbiAgICAgIGQgKiBNYXRoLnNpbihhbmdsZSkgKiB4ICsgZCAqIE1hdGguY29zKGFuZ2xlKSAqIHkpO1xuICB9O1xuXG4gIGdldERpcihib3NzLCBlKSB7XG4gICAgcmV0dXJuIHRoaXMuYW5nbGU7XG4gIH1cbn1cblxuZXhwb3J0IHtNb3ZlfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1Jlc3R9IGZyb20gJy4vcmVzdCdcbmltcG9ydCB7TnVsbH0gZnJvbSAnLi9udWxsJ1xuaW1wb3J0IHtNb3ZlfSBmcm9tICcuL21vdmUnXG5cblxuY29uc3QgRm9ybWF0aW9ucyA9IHtCYXNlLCBNb3ZlLCBOdWxsLCBSZXN0fTtcbmV4cG9ydCB7Rm9ybWF0aW9uc31cbiIsImltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmNsYXNzIE1MUmVzdEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgbGVuZ3RoLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24gJiYgdGhpcy5lbnRpdHkucm90YXRpb24gIT0gdGhpcy5kaXJlY3Rpb24pIHtcbiAgICAgIHRoaXMuZW50aXR5LnJvdGF0aW9uID0gdGhpcy5kaXJlY3Rpb247XG4gICAgICB0aGlzLmVudGl0eS51cGRhdGVNZXNoUG9zKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZW50aXR5Lm1lc2hOYW1lICE9IFwic2l0XCIgJiYgdGhpcy5lbnRpdHkubWVzaE5hbWUgIT0gXCJzaXRkb3duXCIpIHtcbiAgICAgIHRoaXMuZW50aXR5LnBsYXlBbmltYXRpb24oXCJzaXRkb3duXCIpO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuZG9uZSkge1xuICAgICAgdGhpcy5lbnRpdHkuc2V0TWVzaChcInNpdFwiKTtcbiAgICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IFJlc3RKb2IodGhpcy5lbnRpdHksIHRoaXMubGVuZ3RoKSk7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG4gIH1cblxufVxuXG5leHBvcnQge01MUmVzdEpvYn07XG4iLCJpbXBvcnQge0hMSm9ifSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQgeyBGb3JtYXRpb25zfSBmcm9tIFwiLi4vZm9ybWF0aW9uc1wiO1xuaW1wb3J0IHtNTFJlc3RKb2J9IGZyb20gXCIuLi9tbC9yZXN0XCI7XG5cbmNsYXNzIEhMUmVzdEpvYiBleHRlbmRzIEhMSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBsZW5ndGgsIGZvcm1hdHRlZCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgaWYgKGZvcm1hdHRlZCkge1xuICAgICAgdGhpcy5mb3JtYXRpb24gPSBuZXcgRm9ybWF0aW9ucy5SZXN0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZm9ybWF0aW9uID0gbmV3IEZvcm1hdGlvbnMuTnVsbCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzc2lnbk1lSm9iKGUpIHtcbiAgICBpZiAoIXRoaXMuY29tbW9uU3RhcnQoKSkge1xuICAgICAgZS5yZXNldE5vbkhsSm9icygpO1xuICAgICAgdmFyIG5ld1BvcyA9IHRoaXMuZm9ybWF0aW9uLmdldFBvcyh0aGlzLmVudGl0eSwgZSk7XG4gICAgICBpZiAoZS5wb3MuZGlzdGFuY2VUbyhuZXdQb3MpID4gMC4xKSB7XG4gICAgICAgIGUucHVzaEpvYihuZXcgTWxNb3ZlSm9iKGUsIG5ld1BvcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRpciA9IHRoaXMuZm9ybWF0aW9uLmdldERpcih0aGlzLmVudGl0eSwgZSk7XG4gICAgICAgIGUucHVzaEpvYihuZXcgTUxSZXN0Sm9iKGUsIDUsIGRpcikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQge0hMUmVzdEpvYn1cbiIsImltcG9ydCB7SExSZXN0Sm9ifSBmcm9tIFwiLi4vaGwvcmVzdFwiO1xuXG5sZXQgYm9zcyA9IHtcbiAgLy8gaW5pdGlhbGl6ZXJcbiAgcG9zdExvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuZm9sbG93ZXJzKSB7XG4gICAgICAvLyBlYWNoIGVudGl0eSBzaG91bGQgaGF2ZSBpdCdzIGFycmF5XG4gICAgICB0aGlzLmZvbGxvd2VycyA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGSVhNRTogcmV0cmlldmUgb2JqZWN0cyBmcm9tIGlkc1xuICAgIH1cbiAgfSxcbiAgZm9sbG93ZXJzOiBudWxsLFxuICAvLyBkZXByZWNhdGVkXG4gIHB1c2hIbEpvYjogZnVuY3Rpb24gKGpvYikge1xuICAgIHRoaXMucHVzaEpvYihqb2IpO1xuICB9LFxuICAvLyBkZXByZWNhdGVkXG4gIGNsZWFySGxKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlc2V0Sm9icygpO1xuICB9LFxuICBvbk5vSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvc3MgPSB0aGlzO1xuICAgIGlmICh0aGlzLmJvc3MpXG4gICAgICBib3NzID0gdGhpcy5ib3NzO1xuICAgIGlmIChib3NzICYmIGJvc3MuYXNzaWduTWVKb2IgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgIGJvc3MuYXNzaWduTWVKb2IodGhpcyk7XG4gIH0sXG4gIGdldEhsSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIC8vIHRha2UgbGFzdCBqb2Igd2hpY2ggcHJvdmlkZXMgdGhlIGFzc2lnbk1lSm9iIGZ1bmN0aW9uXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy5qb2JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmICh0aGlzLmpvYnNbaV0uYXNzaWduTWVKb2IgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgICAgICByZXR1cm4gdGhpcy5qb2JzW2ldO1xuICAgICAgfVxuICB9LFxuICBhc3NpZ25NZUpvYjogZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgaGxqb2IgPSB0aGlzLmdldEhsSm9iKCk7XG5cbiAgICBpZiAoIWhsam9iKSB7XG4gICAgICBpZiAodGhpcy5haSkge1xuICAgICAgICB0aGlzLmFpKCk7XG4gICAgICB9XG4gICAgICAvLyB0cnkgYWdhaW5cbiAgICAgIGhsam9iID0gdGhpcy5nZXRIbEpvYigpO1xuICAgICAgaWYgKCFobGpvYikge1xuICAgICAgICB0aGlzLnB1c2hIbEpvYihuZXcgSExSZXN0Sm9iKHRoaXMsIDEwLCB0aGlzLmlzQShcImhlcm9cIikpKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcImJvc3MgLSBObyBobGpvYiBjcmVhdGVkLCByZXN0aW5nIGZvciAxMCBzZWNvbmRzXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChobGpvYikge1xuICAgICAgaGxqb2IuYXNzaWduTWVKb2IoZSk7XG4gICAgfVxuICB9LFxuICBhZGRGb2xsb3dlcjogZnVuY3Rpb24gKGZvbGxvd2VyKSB7XG4gICAgdGhpcy5mb2xsb3dlcnMucHVzaChmb2xsb3dlcik7XG4gIH0sXG4gIGRpc21pc3M6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzID0gdGhpcy5mb2xsb3dlcnMuZmlsdGVyKChjdXJyZW50KSA9PiBjdXJyZW50ICE9PSBmb2xsb3dlcik7XG4gICAgZGVsZXRlIGZvbGxvd2VyLmJvc3M7XG4gICAgZm9sbG93ZXIucmVzZXRKb2JzKCk7XG4gIH1cbn07XG5cbmNvbnN0IEJvc3MgPSAoKSA9PiBib3NzO1xuXG5leHBvcnQge0Jvc3N9XG4iLCJjbGFzcyBTdGF0ZU1hY2hpbmVFeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2UpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuXG5jbGFzcyBTdGF0ZU1hY2hpbmUge1xuICBjb25zdHJ1Y3RvcihzdGFydFN0YXRlKSB7XG4gICAgdGhpcy5tb2RlID0gc3RhcnRTdGF0ZTtcbiAgICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gIH1cblxuICBzZXRGaW5pc2hlZCgpIHtcbiAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICB2YXIgZG9uZSA9IGZhbHNlO1xuICAgIGRvIHtcbiAgICAgIGlmICghKHRoaXNbdGhpcy5tb2RlXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgU3RhdGVNYWNoaW5lRXhjZXB0aW9uKFwiTU9ERSBcIiArIHRoaXMubW9kZSArIFwibm90IGZvdW5kXCIpO1xuICAgICAgfVxuICAgICAgZG9uZSA9IHRoaXNbdGhpcy5tb2RlXSgpO1xuICAgICAgY29uc29sZS5sb2coXCJET05FXCIsZG9uZSwgdGhpcy5tb2RlKVxuICAgIH0gd2hpbGUgKCFkb25lICYmICF0aGlzLnJlYWR5KTtcbiAgICByZXR1cm4gZGVsdGE7XG4gIH1cbn1cblxuZXhwb3J0IHsgU3RhdGVNYWNoaW5lfVxuIiwiaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcbmltcG9ydCB7TWxNb3ZlfSBmcm9tIFwiLi9tb3ZlXCI7XG5pbXBvcnQge1N0YXRlTWFjaGluZX0gZnJvbSBcIi4vc3RhdGUtbWFjaGluZVwiO1xuXG5jbGFzcyBNbEludmVudCBleHRlbmRzIFN0YXRlTWFjaGluZSB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgcmVzb3VyY2UsIGhvbWVFbnRpdHkpIHtcbiAgICBzdXBlcihcImNvbWVIb21lXCIpXG4gICAgY29uc29sZS5kZWJ1ZyhcImludmVudCAtIG1sIFwiLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMuaG9tZUVudGl0eSA9IGhvbWVFbnRpdHk7XG4gICAgdGhpcy5yZXNvdXJjZSA9IHJlc291cmNlO1xuICB9XG5cbiAgY29tZUhvbWUoKSB7XG4gICAgdGhpcy5lbnRpdHkucHVzaEpvYih0aGlzLmNyZWF0ZU1vdmVKb2IoKSk7XG4gICAgdGhpcy5tb2RlID0gXCJwcm9kdWNlXCI7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcm9kdWNlKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcnVsZSA9IHRoaXMuaG9tZUVudGl0eS5wcm9kdWN0aW9uW3RoaXMucmVzb3VyY2VdO1xuICAgIHZhciBvayA9IHRydWU7XG4gICAgXy5lYWNoKHJ1bGUsIGZ1bmN0aW9uIChhbW91bnQsIHNvdXJjZVJlc291cmNlKSB7XG4gICAgICBpZiAoIXNlbGYuaG9tZUVudGl0eS50YWtlKHNvdXJjZVJlc291cmNlLCBhbW91bnQpKVxuICAgICAgICBvayA9IGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChvaykge1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYih0aGlzLmNyZWF0ZVJlc3RKb2IoKSk7XG4gICAgICBpZiAodGhpcy5ob21lRW50aXR5LmluY1Ntb2tlKSB7XG4gICAgICAgIHRoaXMuaG9tZUVudGl0eS5pbmNTbW9rZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2RlID0gXCJwcm9kdWN0aW9uRmluaXNoZWRcIjtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzb3VyY2UgcmVzb3VyY2VzIGdvdCBsb3N0IDotKFxuICAgICAgdGhpcy5zZXRGaW5pc2hlZCgpXG4gICAgfVxuICB9XG5cbiAgcHJvZHVjdGlvbkZpbmlzaGVkKCkge1xuICAgIGNvbnNvbGUuZGVidWcoXCJpbnZlbnQgLSBwcm9kdWN0aW9uRmluaXNoZWRcIiwgdGhpcy5yZXNvdXJjZSwgMSk7XG4gICAgaWYgKHRoaXMuaG9tZUVudGl0eS5kZWNTbW9rZSkge1xuICAgICAgdGhpcy5ob21lRW50aXR5LmRlY1Ntb2tlKCk7XG4gICAgfVxuICAgIHRoaXMuaG9tZUVudGl0eS5pbmNyZWFzZUJ5KHRoaXMucmVzb3VyY2UsIDEpO1xuICAgIHRoaXMucmVhZHkgPSB0cnVlO1xuICB9XG5cbiAgY3JlYXRlUmVzdEpvYigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3RKb2IodGhpcy5lbnRpdHksIDMpO1xuICB9XG5cbiAgY3JlYXRlTW92ZUpvYigpIHtcbiAgICByZXR1cm4gbmV3IE1sTW92ZSh0aGlzLmVudGl0eSwgdGhpcy5ob21lRW50aXR5LnBvcyk7XG4gIH1cbn1cblxuZXhwb3J0IHsgTWxJbnZlbnR9O1xuIiwiaW1wb3J0IHtNbEludmVudH0gZnJvbSBcIi4uL21sL2ludmVudFwiO1xuXG5jbGFzcyBIbEludmVudEpvYiB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSkge1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMucHJvZHVjYWJsZSA9IEhsSW52ZW50Sm9iLmFwcGx5YWJsZTtcbiAgfVxuXG4gIHN0YXRpYyBhcHBseWFibGUoZSwgbmVlZGVkKSB7XG4gICAgbGV0IHByb2R1Y2FibGUgPSBfLmZpbHRlcihuZWVkZWQsIGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgICAgaWYgKGUucHJvZHVjdGlvbikge1xuICAgICAgICB2YXIgb2sgPSB0cnVlO1xuICAgICAgICB2YXIgcHJlcmVxID0gZS5wcm9kdWN0aW9uW3Jlc291cmNlXTtcbiAgICAgICAgaWYgKCFwcmVyZXEpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKHByZXJlcSwgZnVuY3Rpb24gKGFtb3VudCwgcmVzKSB7XG5cbiAgICAgICAgICBpZiAoIWUucmVzb3VyY2VzW3Jlc10gfHwgZS5yZXNvdXJjZXNbcmVzXSA8IGFtb3VudCkge1xuICAgICAgICAgICAgb2sgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAob2spXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKHByb2R1Y2FibGUubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIF8uc2FtcGxlKHByb2R1Y2FibGUpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhc3NpZ25NZUpvYihlKSB7XG4gICAgY29uc29sZS5sb2coXCJhc3NpZ24gbWUgam9iIFwiLGUsIHRoaXMpXG4gICAgdmFyIHJlcyA9IHRoaXMucHJvZHVjYWJsZSh0aGlzLmVudGl0eSwgdGhpcy5lbnRpdHkucmVzb3VyY2VzTmVlZGVkKCkpO1xuICAgIGlmIChyZXMpIHtcbiAgICAgIGUucHVzaEpvYihuZXcgTWxJbnZlbnQoZSwgcmVzLCB0aGlzLmVudGl0eSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVudGl0eS5jbGVhckhsSm9iKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB7IEhsSW52ZW50Sm9iIH1cbiIsImltcG9ydCB7TW92ZX0gZnJvbSBcIi4uL2xsL21vdmVcIjtcbmltcG9ydCBSZXN0Sm9iIGZyb20gXCIuLi9sbC9yZXN0XCI7XG5cbmNsYXNzIE1sRmV0Y2hKb2Ige1xuICAgY29uc3RydWN0b3IoZW50aXR5LCByZXNvdXJjZSwgdGFyZ2V0RW50aXR5LCBob21lRW50aXR5KSB7XG4gICAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICAgIHRoaXMuaG9tZUVudGl0eSA9IGhvbWVFbnRpdHk7XG4gICAgICB0aGlzLnJlc291cmNlID0gcmVzb3VyY2U7XG4gICAgICB0aGlzLmFtb3VudCA9IDE7XG4gICAgICB0aGlzLnRhcmdldEVudGl0eSA9IHRhcmdldEVudGl0eTtcbiAgICAgIHRoaXMubWx0YXJnZXRQb3MgPSB0aGlzLnRhcmdldEVudGl0eS5wb3M7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiZnJvbVBvc1wiLGVudGl0eS5wb3MpO1xuICAgICAgdGhpcy5mcm9tUG9zID0gbmV3IFRIUkVFLlZlY3RvcjIoKS5jb3B5KGVudGl0eS5wb3MpO1xuICAgICAgY29uc29sZS5kZWJ1ZyhcImZyb21Qb3NcIixlbnRpdHkucG9zLHRoaXMuZnJvbVBvcyk7XG4gICAgICB0aGlzLm1vZGU9XCJnb3RvVGFyZ2V0XCI7XG4gICAgICB0aGlzLmNvbGxlY3REaXN0YW5jZT0xO1xuICAgIH1cblxuICAgIGdvdG9UYXJnZXQoKSB7XG4gICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLm1sdGFyZ2V0UG9zLmRpc3RhbmNlVG8odGhpcy5lbnRpdHkucG9zKTtcbiAgICAgIGlmKGRpc3RhbmNlPD10aGlzLmNvbGxlY3REaXN0YW5jZSswLjEpIHtcbiAgICAgICAgdGhpcy5tb2RlPVwiY29sbGVjdFRoaW5nc1wiO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgTW92ZSh0aGlzLmVudGl0eSx0aGlzLm1sdGFyZ2V0UG9zLHRoaXMuY29sbGVjdERpc3RhbmNlKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbGxlY3RUaGluZ3MoKSB7XG4gICAgICAvLyBGSVhNRTogc2VsZWN0IHBpY2sgb3IgYXhlIG9yIG5vdGhpbmcgZGVwZW5kaW5nIG9uIHJlc291cmNlXG4gICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwiYXhlXCIpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLmVudGl0eSwzKSk7IC8vbmV3TGxKb2IoXCJyZXN0XCIsMyk7XG4gICAgICB0aGlzLm1vZGU9XCJnb0JhY2tcIjtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRha2UoKSB7XG4gICAgICB0aGlzLnRhcmdldEVudGl0eS5naXZlKHRoaXMucmVzb3VyY2UsdGhpcy5hbW91bnQsdGhpcy5lbnRpdHkpO1xuICAgIH1cblxuICAgIGdvQmFjaygpIHtcbiAgICAgIHRoaXMudGFrZSgpO1xuICAgICAgLy9GSVhNRTogcGljayBjb3JyZWN0IG1lc2hcbiAgICAgIHRoaXMuZW50aXR5LnNldE1lc2goXCJ3YWxrXCIpO1xuICAgICAgLy90aGlzLmVudGl0eS5uZXdMbEpvYihcIm1vdmVcIix0aGlzLmZyb21Qb3MpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgTW92ZSh0aGlzLmVudGl0eSx0aGlzLmhvbWVFbnRpdHkucG9zKSk7XG4gICAgICB0aGlzLm1vZGU9XCJnaXZlXCI7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBnaXZlKCkge1xuICAgICAgdGhpcy5yZWFkeT10cnVlO1xuICAgICAgaWYodGhpcy5ob21lRW50aXR5KVxuICAgICAgICB0aGlzLmVudGl0eS5naXZlKHRoaXMucmVzb3VyY2UsdGhpcy5hbW91bnQsdGhpcy5ob21lRW50aXR5KTtcbiAgICB9XG5cbiAgICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgICB2YXIgZG9uZT1mYWxzZTtcbiAgICAgIGRvIHtcbiAgICAgIGlmKCF0aGlzW3RoaXMubW9kZV0pXG4gICAgICBjb25zb2xlLmRlYnVnKFwiTU9ERSBcIix0aGlzLm1vZGUsIFwibm90IGZvdW5kXCIpO1xuICAgICAgICBkb25lPXRoaXNbdGhpcy5tb2RlXSgpO1xuICAgICAgfSB3aGlsZSghZG9uZSAmJiAhdGhpcy5yZWFkeSk7XG4gICAgICByZXR1cm4gZGVsdGE7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IHsgTWxGZXRjaEpvYn1cblxuIiwiaW1wb3J0IHtITEpvYn0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcbmltcG9ydCB7TUxSZXN0Sm9ifSBmcm9tIFwiLi4vbWwvcmVzdFwiO1xuaW1wb3J0IHtNbEZldGNoSm9ifSBmcm9tIFwiLi4vbWwvZmV0Y2hcIjtcblxuY2xhc3MgSGxGZXRjaEpvYiBleHRlbmRzIEhMSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBjb3VudCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5jb3VudCA9IGNvdW50IHx8IDM7XG4gIH07XG5cbiAgc2VsZWN0UmVzb3VyY2VUb0dldCgpIHtcbiAgICB2YXIgbmVlZGVkID0gXy5zaHVmZmxlKHRoaXMuZW50aXR5LnJlc291cmNlc05lZWRlZCgpKTtcbiAgICByZXR1cm4gbmVlZGVkWzBdO1xuICB9XG5cbiAgbmV4dEVudGl0eUZvclJlc291cmNlKHNlbGVjdGVkUmVzb3VyY2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMuZW50aXR5LndvcmxkLnNlYXJjaChmdW5jdGlvbiAoZSkge1xuICAgICAgcmV0dXJuIGUucmVzb3VyY2VzICYmIGUucmVzb3VyY2VzW3NlbGVjdGVkUmVzb3VyY2VdID4gMCAmJiBlICE9IHNlbGYuZW50aXR5ICYmIGUucHJvdmlkZXMgJiYgXy5pbmNsdWRlcyhlLnByb3ZpZGVzLCBzZWxlY3RlZFJlc291cmNlKTtcbiAgICB9LCB0aGlzLmVudGl0eS5wb3MpWzBdO1xuICB9O1xuXG4gIGFzc2lnbk1lSm9iKGUpIHtcbiAgICBpZiAoIWUuaXNBKFwiZm9sbG93ZXJcIikpIHtcbiAgICAgIGUucHVzaEpvYihuZXcgUmVzdEpvYihlLCAxMCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY291bnQgLT0gMTtcbiAgICB2YXIgc2VsZWN0ZWRSZXNvdXJjZSA9IHRoaXMuc2VsZWN0UmVzb3VyY2VUb0dldCgpO1xuICAgIGlmIChzZWxlY3RlZFJlc291cmNlKSB7XG4gICAgICB2YXIgbmV4dEVudGl0eSA9IHRoaXMubmV4dEVudGl0eUZvclJlc291cmNlKHNlbGVjdGVkUmVzb3VyY2UpO1xuICAgICAgaWYgKG5leHRFbnRpdHkpIHtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBNbEZldGNoSm9iKGUsIHNlbGVjdGVkUmVzb3VyY2UsIG5leHRFbnRpdHksIHRoaXMuZW50aXR5KSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJmZXRjaCAtIE5PIG5leHRlbnRpdHkgZm91bmQgZm9yIFwiLCBzZWxlY3RlZFJlc291cmNlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZS5wdXNoSm9iKG5ldyBNTFJlc3RKb2IoZSwgMSwgMCkpO1xuICAgIGlmICh0aGlzLmNvdW50IDw9IDApIHtcbiAgICAgIHRoaXMuZW50aXR5LmNsZWFySGxKb2IoKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCB7SGxGZXRjaEpvYn1cbiIsImltcG9ydCB7SGxJbnZlbnRKb2J9IGZyb20gJy4uL2hsL2ludmVudCc7XG5pbXBvcnQge0hsRmV0Y2hKb2J9IGZyb20gJy4uL2hsL2ZldGNoJztcblxubGV0IGhvdXNlID0ge1xuICAvLyBGSVhNRTogbWF5YmUgbW92ZSB0aGlzIHRvIG90aGVyIG1peGluL2NsYXNzIC0gbWF5IGJlIHVzZWQgYnkgaGVybyB0b29cbiAgcmVzb3VyY2VzTmVlZGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRlZClcbiAgICAgIHJldHVybiBbXTtcbiAgICB2YXIgY3VycmVudGx5TmVlZGVkID0gW107XG4gICAgY29uc29sZS5sb2coXCJORURERURcIiwgdGhpcy5uZWVkZWQpO1xuICAgIGZvciAodmFyIGsgaW4gdGhpcy5uZWVkZWQpIHtcbiAgICAgIHZhciB2ID0gdGhpcy5uZWVkZWRba107XG4gICAgICB2YXIgdGltZXMgPSB2IC0gKHRoaXMucmVzb3VyY2VzW2tdIHx8IDApO1xuICAgICAgaWYgKHRpbWVzID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRpbWVzOyBpKyspIHtcbiAgICAgICAgICBjdXJyZW50bHlOZWVkZWQucHVzaChrKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3VycmVudGx5TmVlZGVkO1xuICB9LFxuXG4gIGFpOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5lZWRlZCA9IHRoaXMucmVzb3VyY2VzTmVlZGVkKCk7XG5cbiAgICBpZiAobmVlZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICh0aGlzLmludmVudEFwcGx5YWJsZShuZWVkZWQpKSB7XG4gICAgICAgIHRoaXMucHVzaEhsSm9iKHRoaXMuY3JlYXRlSW52ZW50Sm9iKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoSGxKb2IodGhpcy5jcmVhdGVGZXRjaEpvYigpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGludmVudEFwcGx5YWJsZTogZnVuY3Rpb24obmVlZGVkKSB7XG4gICAgcmV0dXJuIEhsSW52ZW50Sm9iLmFwcGx5YWJsZSh0aGlzLCBuZWVkZWQpO1xuICB9LFxuICBjcmVhdGVJbnZlbnRKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IEhsSW52ZW50Sm9iKHRoaXMpO1xuICB9LFxuICBjcmVhdGVGZXRjaEpvYjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgSGxGZXRjaEpvYih0aGlzKTtcbiAgfSxcbiAgYWRkRm9sbG93ZXI6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzLnB1c2goZm9sbG93ZXIpO1xuICB9XG59O1xuXG5sZXQgSG91c2UgPSAoKSA9PiBob3VzZTtcbmV4cG9ydCB7SG91c2V9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgfSxcbiAgXCJjcm9wXCI6IHtcbiAgICBcIm1lc2hOYW1lXCI6IFwidGlueVwiLFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiaGlnaFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfaGlnaFwiXG4gICAgICB9LFxuICAgICAgXCJtZWRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJjcm9wX21lZFwiXG4gICAgICB9LFxuICAgICAgXCJzbWFsbFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3Bfc21hbGxcIlxuICAgICAgfSxcbiAgICAgIFwidGlueVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfdGlueVwiXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1pbGxcIjoge1xuICB9LFxuICBcIm1pbmVcIjoge1xuICB9LFxuICBcImZhcm1cIjoge1xuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwid2F0ZXJcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3YXRlclwiOiAxMDBcbiAgICB9XG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIlxuICAgIF1cbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMSxcbiAgICAgIFwidG9vbFwiOiAxMFxuICAgIH0sXG4gICAgXCJwcm9kdWN0aW9uXCI6IHtcbiAgICAgIFwidG9vbFwiOiB7XG4gICAgICAgIFwid29vZFwiOiAxLFxuICAgICAgICBcInN0b25lXCI6IDFcbiAgICAgIH1cbiAgICB9LFxuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIixcbiAgICAgIFwic21va2VcIlxuICAgIF1cbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJoZXJvXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJwbGF5ZXJcIixcbiAgICBdXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIlxuICAgIF1cbiAgfSxcbiAgXCJtYW5cIjoge1xuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdFwiXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdGRvd25cIlxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJmaWdodFwiXG4gICAgICB9LFxuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJwaWNrXCJcbiAgICAgIH0sXG4gICAgICBcImF4ZVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJheGVcIlxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiZm9sbG93ZXJcIlxuICAgIF1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3b29kXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwid29vZFwiOiA1XG4gICAgfVxuICB9LFxuICBcInRyZWVcIjoge1xuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcInN0b25lXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwic3RvbmVcIjogMjBcbiAgICB9XG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImFuaW1hbFwiXG4gICAgXSxcbiAgICBcInNwZWVkXCI6IDAuNSxcbiAgICBcIm1lc2hlc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEVudGl0eSB9IGZyb20gJy4vZW50aXR5J1xuaW1wb3J0IE1vZGVsTG9hZGVyIGZyb20gJy4uL2Jhc2UzZC9tb2RlbF9sb2FkZXInXG5pbXBvcnQgKiBhcyBNaXhpbiBmcm9tIFwiLi9taXhpblwiXG5pbXBvcnQgRW50aXR5VHlwZXMgZnJvbSAnLi4vY29uZmlnL2VudGl0aWVzJ1xuXG5cbmNsYXNzIFdvcmxkTG9hZGVyIHtcbiAgbG9hZCh3b3JsZCwgZGF0YSwgb3BzKSB7XG4gICAgbGV0IGJhc2ljT3BzID0gT2JqZWN0LmFzc2lnbih7fSwgb3BzKTtcblxuICAgIGlmICghYmFzaWNPcHMubW9kZWxMb2FkZXIpIHtcbiAgICAgIGJhc2ljT3BzLm1vZGVsTG9hZGVyID0gbmV3IE1vZGVsTG9hZGVyKCk7XG4gICAgfVxuICAgIGlmICghYmFzaWNPcHMubWl4aW5EZWZzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk1JWElOIERFRlNcIiwgTWl4aW4pXG4gICAgICBiYXNpY09wcy5taXhpbkRlZnMgPSBNaXhpbjtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5lbnRpdHlUeXBlcykge1xuICAgICAgYmFzaWNPcHMuZW50aXR5VHlwZXMgPSBFbnRpdHlUeXBlcztcbiAgICB9XG5cbiAgICBkYXRhLmZvckVhY2goZW50aXR5RGVmaW5pdGlvbiA9PlxuICAgICAgd29ybGQucHVzaChuZXcgRW50aXR5KHdvcmxkLm1hcCwgT2JqZWN0LmFzc2lnbih7fSwgYmFzaWNPcHMsIGVudGl0eURlZmluaXRpb24pKSlcbiAgICApO1xuICAgIHdvcmxkLmVudGl0aWVzLmZvckVhY2goZW50aXR5ID0+IGVudGl0eS5wb3N0TG9hZCAmJiBlbnRpdHkucG9zdExvYWQoKSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZExvYWRlclxuIiwiaW1wb3J0IFdvcmxkIGZyb20gXCIuLi9nYW1lL3dvcmxkXCI7XG5pbXBvcnQgSGVpZ2h0TWFwIGZyb20gXCIuLi9nYW1lL2hlaWdodG1hcFwiO1xuaW1wb3J0IGFqYXggZnJvbSBcIi4uL2FqYXhcIlxuaW1wb3J0IFdvcmxkTG9hZGVyIGZyb20gXCIuLi9nYW1lL3dvcmxkLWxvYWRlclwiXG5cbmNsYXNzIFdvcmxkRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gICAgY29uc3RydWN0b3Iod29ybGQpIHtcbiAgICAgICAgc3VwZXIoXCJ3b3JsZFwiKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IHdvcmxkXG4gICAgfVxufVxuXG5jbGFzcyBBZ1dvcmxkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLm1hcCA9IG5ldyBIZWlnaHRNYXAoKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IG5ldyBXb3JsZCh0aGlzLm1hcCk7XG5cbiAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwibG9hZFwiKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkV29ybGQodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKS50aGVuKHRoaXMuaW5mb3JtLmJpbmQodGhpcykpXG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudFt0aGlzLmV4cG9zZU5hbWVdID0gdGhpcy53b3JsZDtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgZGVsZXRlIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV1cbiAgICB9XG5cbiAgICBpbmZvcm0oKSB7XG4gICAgICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbChcIipbaW5qZWN0LXdvcmxkXVwiKS5mb3JFYWNoKGUgPT5cbiAgICAgICAgICAgIGUuZGlzcGF0Y2hFdmVudChuZXcgV29ybGRFdmVudCh0aGlzLndvcmxkKSkpXG4gICAgfVxuXG4gICAgbG9hZFdvcmxkKHVybCkge1xuICAgICAgICByZXR1cm4gYWpheCh1cmwpLnRoZW4oZGF0YSA9PlxuICAgICAgICAgICAgbmV3IFdvcmxkTG9hZGVyKCkubG9hZCh0aGlzLndvcmxkLCBkYXRhKVxuICAgICAgICApXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctd29ybGQnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctd29ybGQnLCBBZ1dvcmxkKTtcbn1cblxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9nYW1lL2hsL3Jlc3RcIjtcblxuY2xhc3MgQWdFbnRpdHlWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBzdGF0aWMgcHJlc2VudEVudGl0eShlbnRpdHkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZU5hbWU6IGVudGl0eS50eXBlTmFtZSxcbiAgICAgIHBvczoge1xuICAgICAgICB4OiBlbnRpdHkucG9zLngsXG4gICAgICAgIHk6IGVudGl0eS5wb3MueVxuICAgICAgfSxcbiAgICAgIHJlc291cmNlczogQWdFbnRpdHlWaWV3LnByZXNlbnRSZXNvdXJjZXMoZW50aXR5LnJlc291cmNlcylcbiAgICB9O1xuICB9XG5cbiAgc3RhdGljIHByZXNlbnRSZXNvdXJjZXMocmVzb3VyY2VzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIHJlc291cmNlcykge1xuICAgICAgcmVzdWx0LnB1c2goe25hbWU6IGtleSwgdmFsdWU6IHJlc291cmNlc1trZXldfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5pbm5lckhUTUw7XG4gICAgdGhpcy5jaGFuZ2VkKG51bGwpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBpZiAodGhpcy5saXN0ZW5lcikge1xuICAgICAgdGhpcy5saXN0ZW5lci5yZW1vdmUoKVxuICAgIH1cbiAgICBpZiAodGhpcy5yZWRyYXdlcikge1xuICAgICAgdGhpcy5yZWRyYXdlci5yZW1vdmUoKVxuICAgIH1cbiAgfVxuXG4gIHdvcmxkQ3JlYXRlZChldikge1xuICAgIHRoaXMud29ybGQgPSBldi53b3JsZDtcbiAgICBjb25zdCBldmVudG5hbWUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImV2ZW50XCIpID09PSBcImhvdmVyZWRcIiA/IFwiaG92ZXJlZFwiIDogXCJzZWxlY3RlZFwiO1xuICAgIHRoaXMuZXZlbnRuYW1lID0gZXZlbnRuYW1lO1xuICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLndvcmxkW2V2ZW50bmFtZV0uc3Vic2NyaWJlKHRoaXMuY2hhbmdlZC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgY2hhbmdlZChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5lbnRpdHkgIT09IGVudGl0eSkge1xuICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKHRoaXMuZW50aXR5KTtcblxuICAgICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICBpZiAodGhpcy5lbnRpdHkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxuICAgICAgfVxuICAgICAgdGhpcy5zdGFydExpc3RlbmluZyh0aGlzLmVudGl0eSlcbiAgICB9XG4gICAgaWYgKHRoaXMuZW50aXR5KSB7XG4gICAgICB0aGlzLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICB9XG4gIH1cblxuICByZWRyYXcoKSB7XG4gICAgdGhpcy5pbm5lckhUTUwgPSBtdXN0YWNoZS5yZW5kZXIodGhpcy50ZW1wbGF0ZSwgQWdFbnRpdHlWaWV3LnByZXNlbnRFbnRpdHkodGhpcy5lbnRpdHkpKTtcbiAgICBjb25zdCBidXR0b25SZXN0ID0gdGhpcy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiYnV0dG9uLXJlc3RcIilbMF07XG4gICAgaWYgKGJ1dHRvblJlc3QpIHtcbiAgICAgIGJ1dHRvblJlc3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMucmVzdC5iaW5kKHRoaXMpKVxuICAgIH1cbiAgfVxuXG4gIHJlc3QoKSB7XG4gICAgdGhpcy5lbnRpdHkucmVzZXRKb2JzKCk7XG4gICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgSExSZXN0Sm9iKHRoaXMuZW50aXR5LCAwLCBmYWxzZSkpO1xuICAgIGNvbnNvbGUubG9nKFwiUkVTVFwiKVxuICB9XG5cbiAgc3RhcnRMaXN0ZW5pbmcoZW50aXR5KSB7XG4gICAgY29uc29sZS5sb2coXCJTVEFSVFwiLCBlbnRpdHkpXG4gICAgaWYoZW50aXR5KSB7XG4gICAgICB0aGlzLnJlZHJhd2VyID0gZW50aXR5LmNoYW5nZWQuc3Vic2NyaWJlKCB0aGlzLnJlZHJhdy5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cbiAgc3RvcExpc3RlbmluZyhlbnRpdHkpIHtcbiAgICBpZih0aGlzLnJlZHJhd2VyKSB7XG4gICAgICB0aGlzLnJlZHJhd2VyLnJlbW92ZSgpO1xuICAgICAgdGhpcy5yZWRyYXdlciA9IG51bGw7XG4gICAgfVxuICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1lbnRpdHktdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZW50aXR5LXZpZXcnLCBBZ0VudGl0eVZpZXcpO1xufVxuXG4iLCJjbGFzcyBBZ0Z1bGxzY3JlZW4gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5lbmFibGVGdWxsc2NyZWVuLmJpbmQodGhpcykpXG4gIH1cblxuICBlbmFibGVGdWxsc2NyZWVuKCkge1xuICAgIGxldCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImJvZHlcIik7XG4gICAgaWYoZWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZihlbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICBlbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmKGVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYoZWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBlbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWZ1bGxzY3JlZW4nKSkge1xuICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWZ1bGxzY3JlZW4nLCBBZ0Z1bGxzY3JlZW4pO1xufVxuIl0sIm5hbWVzIjpbImNsb2NrIiwiSm9iIiwiTW92ZSJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsTUFBTSxL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QUksQ0FBQyxDQUFDLENBQUM7QUFDcEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDaEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDMUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDMUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xIO0FBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ3RCO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFDO0FBQ3RELEdBQUc7QUFDSDtBQUNBLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtBQUNkLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDO0FBQzdCLEdBQUc7QUFDSDtBQUNBLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRTtBQUNmLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDO0FBQzlCLElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztBQUNuQyxJQUFJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7QUFDckMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDMUQsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDMUQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUM7QUFDckUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBQztBQUN0QyxHQUFHO0FBQ0g7QUFDQSxFQUFFLEtBQUss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LENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuRCxRQUFRLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0I7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7QUFDM0IsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUMzQixVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbEIsT0FBTztBQUNQLEtBQUs7QUFDTCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQztBQUNBLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ25ELFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM1QyxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFD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

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
    } else if (this.selectedEntity && this.selectedEntity.pushJob /*&& this.selectedEntity.isA("hero") && this.selectedEntity.player == "human"*/) {

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

class HlInventJob {
  constructor(entity) {
    this.entity = entity;
    this.producable = this.applyable;
  }

  static applyable(e, needed) {
    var producable = _.filter(needed, function (resource) {
      if (e.production) {
        var ok = true;
        var prereq = e.production[resource];
        console.debug("invent - rule", prereq, e.resources);
        if (!prereq)
          return false;
        _.each(prereq, function (amount, res) {

          if (!e.resources[res] || e.resources[res] < amount) {
            ok = false;
          }
        });
        if (ok)
          return true;
      }
    });
    console.debug("invent - PRODUCABLE", producable);
    if (producable.length > 0) {
      return _.sample(producable);
    }
    return false;
  }

  assignMeJob(e) {
    var res = producable(this.entity, this.entity.resourcesNeeded());
    console.debug("invent - PRODS", res);
    if (res)
      e.pushJob(new Invent(e, res, this.entity));
    else
      this.entity.clearHlJob();
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
      console.debug("fetch - HAS RESOURCE", selectedResource, e, e.resources && e.resources[selectedResource] > 0, e.provides, e.resources);
      return e.resources && e.resources[selectedResource] > 0 && e != self.entity && e.provides && _.contains(e.provides, selectedResource);
    }, this.entity.pos)[0];
  };

  assignMeJob(e) {
    if (!e.isA("follower")) {
      e.pushJob(new RestJob(e, 10));
      return;
    }

    this.count -= 1;
    console.debug("fetch - ASSIGN FETCH MLJOB", e);
    var selectedResource = this.selectResourceToGet();
    if (selectedResource) {
      var nextEntity = this.nextEntityForResource(selectedResource);
      if (nextEntity) {
        e.pushJob(new ml.Fetch(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
        console.debug("fetch - NO nextentity found");
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
    console.log("NEDDED",this.needed);
    for(var k in this.needed) {
      var v = this.needed[k];
      var times = v - (this.resources[k] || 0);
      if (times > 0) {
        for(var i=0;i<times;i++) {
          currentlyNeeded.push(k);
        }
      }
    }
    return currentlyNeeded;
  },

  ai: function () {
    var needed = this.resourcesNeeded();

    if (needed.length > 0) {
      if (HlInventJob.applyable(this, needed)) {
        this.pushHlJob(new HlInventJob(this));
      } else {
        this.pushHlJob(new HlFetchJob(this));
      }
    }
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvbGwvam9iLmpzIiwic3JjL2dhbWUvdmVjdG9yMi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL21sL21vdmUuanMiLCJzcmMvZ2FtZS93b3JsZC5qcyIsInNyYy9nYW1lL2hlaWdodG1hcC5qcyIsInNyYy9hamF4LmpzIiwic3JjL2dhbWUvZW50aXR5LmpzIiwic3JjL2NvbmZpZy9tZXNoZXMuanMiLCJzcmMvYmFzZTNkL21vZGVsLmpzIiwic3JjL2Jhc2UzZC9tb2RlbF9sb2FkZXIuanMiLCJzcmMvZ2FtZS9taXhpbnMvYW5pbWFsLmpzIiwic3JjL2dhbWUvbGwvcmVzdC5qcyIsInNyYy9nYW1lL21peGlucy9qb2IuanMiLCJzcmMvZ2FtZS9taXhpbnMvZm9sbG93ZXIuanMiLCJzcmMvZ2FtZS9obC9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9yZXN0LmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9udWxsLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9tb3ZlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9pbmRleC5qcyIsInNyYy9nYW1lL21sL3Jlc3QuanMiLCJzcmMvZ2FtZS9obC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2Jvc3MuanMiLCJzcmMvZ2FtZS9obC9pbnZlbnQuanMiLCJzcmMvZ2FtZS9obC9mZXRjaC5qcyIsInNyYy9nYW1lL21peGlucy9ob3VzZS5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS93b3JsZC1sb2FkZXIuanMiLCJzcmMvZWxlbWVudHMvYWctd29ybGQuanMiLCJzcmMvZWxlbWVudHMvYWctZW50aXR5LXZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZnVsbHNjcmVlbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBJbnRybyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9IC0xO1xuICAgICAgICB0aGlzLnNjcmVlbnMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnRyby1zY3JlZW5cIik7XG4gICAgICAgIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIgPSB0aGlzLm5leHRTY3JlZW4uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm5leHRTY3JlZW4oKVxuICAgIH1cblxuICAgIGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMudW5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgIH1cblxuICAgIGJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVuYmluZEV2ZW50KHNjcmVlbikge1xuICAgICAgICBpZihzY3JlZW4pIHtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKTtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV4dFNjcmVlbihldikge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgaWYodGhpcy5jdXJyZW50X3NjcmVlbiA9PSB0aGlzLnNjcmVlbnMubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2ZpbmlzaGVkJykpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5nZXRBdHRyaWJ1dGUoJ29uZmluaXNoZWQnKSlcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIixlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1cnJlbnRfc2NyZWVuID0gKHRoaXMuY3VycmVudF9zY3JlZW4gKyAxKSAlIHRoaXMuc2NyZWVucy5sZW5ndGg7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KClcbiAgICB9XG5cbiAgICBzZXRWaXNpYmlsaXR5KCkge1xuICAgICAgICB0aGlzLnNjcmVlbnMuZm9yRWFjaCgoc2NyZWVuLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfc2NyZWVuID09IGlkeCkge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctaW50cm8nKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctaW50cm8nLCBJbnRybyk7XG59XG4iLCJjbGFzcyBDcmVkaXRzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMuZmluaXNoZWQuYmluZCh0aGlzKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwiLmNyZWRpdHNcIilcbiAgICAgICAgY29uc29sZS5sb2coXCJCSU5ELi4uXCIpXG5cbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpXG4gICAgfVxuXG5cbiAgICBmaW5pc2hlZChldikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZJTklTSEVEXCIpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1jcmVkaXRzJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWNyZWRpdHMnLCBDcmVkaXRzKTtcbn1cbiIsImNsYXNzIFRleHR1cmVMb2FkZXIge1xuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcbiAgICAgICAgaWYgKCFUZXh0dXJlTG9hZGVyLmluc3RhbmNlKSB7XG4gICAgICAgICAgICBUZXh0dXJlTG9hZGVyLmluc3RhbmNlID0gbmV3IFRleHR1cmVMb2FkZXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gVGV4dHVyZUxvYWRlci5pbnN0YW5jZTtcbiAgICB9XG5cbiAgICBnZXRUZXh0dXJlcyh1cmxzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh1cmxzLm1hcCh1cmw9PnRoaXMuZ2V0VGV4dHVyZSh1cmwpKSk7XG4gICAgfVxuXG4gICAgZ2V0VGV4dHVyZSh1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUodXJsLCBudWxsLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGV4dHVyZUxvYWRlcjsiLCJpbXBvcnQgVGV4dHVyZUxvYWRlciBmcm9tIFwiLi4vYmFzZTNkL3RleHR1cmVfbG9hZGVyXCI7XG5cbmNvbnN0IFRlcnJhaW4gPSBUSFJFRS5UZXJyYWluO1xuXG5jbGFzcyBUZXJyYWluQnVpbGRlciB7XG5cbiAgICBzdGF0aWMgY3JlYXRlVGVycmFpbihvcHRpb25zLCBzY2VuZSwgbWF0ZXJpYWwsIGhlaWdodG1hcCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe3dpZHRoOiA2NCwgaGVpZ2h0OiA2NH0sIG9wdGlvbnMpO1xuICAgICAgICB2YXIgeFMgPSBvcHRpb25zLndpZHRoIC0gMSwgeVMgPSBvcHRpb25zLmhlaWdodCAtIDE7XG5cbiAgICAgICAgaWYgKCFoZWlnaHRtYXApXG4gICAgICAgICAgICBoZWlnaHRtYXAgPSBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT1BUSU9OU1wiLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgICAgICAgICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB4bDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCB5bDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnW2ogKiB4bCArIGldLnogKz0gTWF0aC5yYW5kb20oKSAqIDEwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBkb2luZyB3aXJlZnJhbWUgdGVycmFpblxuICAgICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICAgICAgICAgIGNvbG9yOiAweGZmMDAwMCxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vbWF0ZXJpYWwgPSBudWxsO1xuICAgICAgICBsZXQgdGVycmFpblNjZW5lID0gVGVycmFpbih7XG4gICAgICAgICAgICBlYXNpbmc6IFRlcnJhaW4uTGluZWFyLFxuICAgICAgICAgICAgZnJlcXVlbmN5OiAyLjUsXG4gICAgICAgICAgICBoZWlnaHRtYXA6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIC8vYWZ0ZXI6IGhlaWdodG1hcCxcbiAgICAgICAgICAgIG1hdGVyaWFsOiBtYXRlcmlhbCB8fCBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDU1NjZhYX0pLFxuLy8gICAgICAgICAgbWF4SGVpZ2h0OiAxMDAsXG4vLyAgICAgICAgICBtaW5IZWlnaHQ6IC0xMDAsXG4vL21pbkhlaWdodDowLC8vdW5kZWZpbmVkLFxuLy9tYXhIZWlnaHQ6MTAsIC8vdW5kZWZpbmVkLFxuICAgICAgICAgICAgc3RlcHM6IDEsXG4gICAgICAgICAgICB1c2VCdWZmZXJHZW9tZXRyeTogZmFsc2UsXG4gICAgICAgICAgICB4U2VnbWVudHM6IHhTLFxuICAgICAgICAgICAgeFNpemU6IG9wdGlvbnMud2lkdGgsXG4gICAgICAgICAgICB5U2VnbWVudHM6IHlTLFxuICAgICAgICAgICAgeVNpemU6IG9wdGlvbnMuaGVpZ2h0LFxuICAgICAgICAgICAgc3RyZXRjaDogZmFsc2UsXG4gICAgICAgICAgICBjbGFtcDogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5yb3RhdGlvbi54ID0gMDtcbiAgICAgICAgdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLnJvdGF0aW9uLnggPSAtTWF0aC5QSS8yO1xuICAgICAgICAvL3RlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5yb3RhdGlvbi55ID0gTWF0aC5QSS84O1xuICAgICAgICB0ZXJyYWluU2NlbmUucG9zaXRpb24ueCArPSBvcHRpb25zLndpZHRoIC8gMjtcbiAgICAgICAgdGVycmFpblNjZW5lLnBvc2l0aW9uLnogLT0gb3B0aW9ucy53aWR0aCAvIDI7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJUU1wiLCB0ZXJyYWluU2NlbmUpO1xuICAgICAgICAvLyBBc3N1bWluZyB5b3UgYWxyZWFkeSBoYXZlIHlvdXIgZ2xvYmFsIHNjZW5lXG4gICAgICAgIHNjZW5lLmFkZCh0ZXJyYWluU2NlbmUpO1xuICAgICAgICB0aGlzLmdlbyA9IHRlcnJhaW5TY2VuZS5jaGlsZHJlblswXS5nZW9tZXRyeTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYXN5bmMgY3JlYXRlKG9wdGlvbnMsIHNjZW5lLCBoZWlnaHRtYXApIHtcbiAgICAgICAgVGV4dHVyZUxvYWRlci5nZXRJbnN0YW5jZSgpLmdldFRleHR1cmVzKFsnbW9kZWxzL3NhbmQxLmpwZycsICdtb2RlbHMvZ3Jhc3MxLmpwZycsICdtb2RlbHMvc3RvbmUxLmpwZycsICdtb2RlbHMvc25vdzEuanBnJ10pXG4gICAgICAgICAgICAudGhlbigodGV4dHVyZXMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBibGVuZCA9IFRlcnJhaW5CdWlsZGVyLmdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIC4uLnRleHR1cmVzKVxuICAgICAgICAgICAgICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIGJsZW5kLCBoZWlnaHRtYXApO1xuICAgICAgICAgICAgfSlcbiAgICB9XG4gICAgc3RhdGljIGdlbmVyYXRlTWF0ZXJpYWwoc2NlbmUsIHQxLHQyLHQzLHQ0KSB7XG4gICAgICAgIHJldHVybiBUZXJyYWluLmdlbmVyYXRlQmxlbmRlZE1hdGVyaWFsKFtcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MX0sXG4gICAgICAgICAgICB7dGV4dHVyZTogdDIsIGxldmVsczogWy04MCwgLTM1LCAyMCwgNTBdfSxcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MywgbGV2ZWxzOiBbMjAsIDUwLCA2MCwgODVdfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlOiB0NCxcbiAgICAgICAgICAgICAgICBnbHNsOiAnMS4wIC0gc21vb3Roc3RlcCg2NS4wICsgc21vb3Roc3RlcCgtMjU2LjAsIDI1Ni4wLCB2UG9zaXRpb24ueCkgKiAxMC4wLCA4MC4wLCB2UG9zaXRpb24ueiknXG4gICAgICAgICAgICB9LFxuICAgICAgICBdLCBzY2VuZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUZXJyYWluQnVpbGRlciIsIi8vdmFyIHByb2plY3RvciA9IG5ldyBUSFJFRS5Qcm9qZWN0b3IoKTtcbnZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cbnZhciBQaWNrID0ge1xuICAgIC8qXG4gICAgKiBtb3VzZT17eDoxMix5OjEyfVxuICAgICogKi9cbiAgICBwaWNrOiBmdW5jdGlvbiAobW91c2UsIGNhbWVyYSwgc2NlbmUpIHtcbiAgICAgICAgLy8gZmluZCBpbnRlcnNlY3Rpb25zXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGNyZWF0ZSBhIFJheSB3aXRoIG9yaWdpbiBhdCB0aGUgbW91c2UgcG9zaXRpb25cbiAgICAgICAgLy8gICBhbmQgZGlyZWN0aW9uIGludG8gdGhlIHNjZW5lIChjYW1lcmEgZGlyZWN0aW9uKVxuICAgICAgICAvL1xuICAgICAgICB2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAgICAgdmVjLnggPSBtb3VzZS5yeDtcbiAgICAgICAgdmVjLnkgPSBtb3VzZS5yeTtcbiAgICAgICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodmVjLCBjYW1lcmEpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhbiBhcnJheSBjb250YWluaW5nIGFsbCBvYmplY3RzIGluIHRoZSBzY2VuZSB3aXRoIHdoaWNoIHRoZSByYXkgaW50ZXJzZWN0c1xuICAgICAgICAvLyBpbnRlcnNlY3QgcmVjdXJzaXZlICEhIVxuICAgICAgICB2YXIgcmVzdWx0ID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMoc2NlbmUuY2hpbGRyZW4sIHRydWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgUGljazsiLCJcbmZ1bmN0aW9uIGFkZFNreWJveChzY2VuZSkge1xuICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9za3kxLmpwZycsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHQxKSB7XG4gICAgICAgIGNvbnN0IHNreURvbWUgPSBuZXcgVEhSRUUuTWVzaChcbiAgICAgICAgICAgIG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSg0MDk2LCA2NCwgNjQpLFxuICAgICAgICAgICAgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IHQxLCBzaWRlOiBUSFJFRS5CYWNrU2lkZSwgZm9nOiBmYWxzZX0pXG4gICAgICAgICk7XG4gICAgICAgIHNjZW5lLmFkZChza3lEb21lKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFkZFNreWJveDsiLCJpbXBvcnQgYWRkU2t5Ym94IGZyb20gXCIuL3NreWJveFwiO1xuXG5mdW5jdGlvbiBnZXRSYW5kb21OdW1iZXIoIGJhc2UgKSB7XG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiBiYXNlIC0gKGJhc2UvMik7XG59XG5mdW5jdGlvbiBnZXRSYW5kb21Db2xvcigpIHtcbiAgICB2YXIgYyA9IG5ldyBUSFJFRS5Db2xvcigpO1xuICAgIGMuc2V0UkdCKCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpLCBNYXRoLnJhbmRvbSgpICk7XG4gICAgcmV0dXJuIGM7XG59XG5jbGFzcyBBbnRTY2VuZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8vIGh0dHA6Ly9zcXVhcmVmZWV0LmdpdGh1Yi5pby9TaGFkZXJQYXJ0aWNsZUVuZ2luZS9cbiAgICAgICAgdGhpcy5lbWl0dGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogbmV3IFRIUkVFLlZlY3RvcjMoLTEsIDEsIDEpLFxuICAgICAgICAgICAgcG9zaXRpb25TcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApLFxuXG4gICAgICAgICAgICBhY2NlbGVyYXRpb246IG5ldyBUSFJFRS5WZWN0b3IzKDAsIC0wLjEsIDApLFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjAxLCAwLjAxLCAwLjAxKSxcblxuICAgICAgICAgICAgdmVsb2NpdHk6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAuNywgMCksXG4gICAgICAgICAgICB2ZWxvY2l0eVNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4zLCAwLjUsIDAuMiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnQ6IG5ldyBUSFJFRS5Db2xvcigweEJCQkJCQiksXG5cbiAgICAgICAgICAgIGNvbG9yU3RhcnRTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMiwgMC4xLCAwLjEpLFxuICAgICAgICAgICAgY29sb3JFbmQ6IG5ldyBUSFJFRS5Db2xvcigweEFBQUFBQSksXG5cbiAgICAgICAgICAgIHNpemVTdGFydDogMC41LFxuICAgICAgICAgICAgc2l6ZUVuZDogNCxcbiAgICAgICAgICAgIG9wYWNpdHlTdGFydDogMSxcbiAgICAgICAgICAgIG9wYWNpdHlFbmQ6IDAuMSxcblxuICAgICAgICAgICAgLy9wYXJ0aWNsZUNvdW50OiAyMDAwLFxuICAgICAgICAgICAgcGFydGljbGVzUGVyU2Vjb25kOiAxMDAsXG4gICAgICAgICAgICBhbGl2ZTogMVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZW1pdHRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgbWF4QWdlOiA1LFxuICAgICAgICAgICAgLy90eXBlOiBNYXRoLnJhbmRvbSgpICogNCB8IDAsXG4gICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMygtMSwwLDApXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKDAsXG4gICAgICAgICAgICAgICAgICAgIC0wLjIsXG4gICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIHNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMCwwLjEsMClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2ZWxvY2l0eToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgMS40LFxuICAgICAgICAgICAgICAgICAgICAwXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLjcsMC4zKVxuICAgICAgICAgICAgfSxcbi8qXG4gICAgICAgICAgICByb3RhdGlvbjoge1xuICAgICAgICAgICAgICAgIGF4aXM6IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSksXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBhbmdsZTpcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKSAqIE1hdGguUEksXG4gICAgICAgICAgICAgICAgY2VudGVyOlxuICAgICAgICAgICAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICB9LFxuXG5cbiAgICAgICAgICAgIHdpZ2dsZToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnJhbmRvbSgpICogMjBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucmFuZG9tKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29sb3I6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogW25ldyBUSFJFRS5Db2xvcigweDMzMzMzMyksbmV3IFRIUkVFLkNvbG9yKDB4Nzc3Nzc3KSxuZXcgVEhSRUUuQ29sb3IoMHg4ODg4ODgpXSxcbiAgICAgICAgICAgICAgICBzcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywwLDApXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzaXplOiB7XG5cbiAgICAgICAgICAgICAgICB2YWx1ZTogWzAuNSwgMC43LCAxXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhcnRpY2xlQ291bnQ6IDEwMCxcbiAgICAgICAgICAgIG9wYWNpdHk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogWzEsIDAuOCwgMC4wXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlcHRoVGVzdDogdHJ1ZSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwID0gQW50U2NlbmUubWFrZVNQRUdyb3VwKCk7XG5cbiAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLmFkZFBvb2woMTAsIHRoaXMuZW1pdHRlclNldHRpbmdzLCB0cnVlKTtcblxuICAgICAgICB2YXIgZW1pdHRlciA9IHRoaXMucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpXG4gICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSBuZXcgVEhSRUUuVmVjdG9yMygtMiwwLDApXG4gICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG4gICAgICAgIGVtaXR0ZXIgPSB0aGlzLnBhcnRpY2xlR3JvdXAuZ2V0RnJvbVBvb2woKVxuICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gbmV3IFRIUkVFLlZlY3RvcjMoLTQsMCwwKVxuICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuXG4gICAgICAgIC8vdGhpcy5zY2VuZS5iYWNrZ3JvdW5kLmFkZChuZXcgQ29sb3IoXCJyZWRcIikpXG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKHRoaXMucGFydGljbGVHcm91cC5tZXNoKTtcbiAgICAgICAgdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwID0gdGhpcy5wYXJ0aWNsZUdyb3VwO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlBBUlRJQ0xFXCIsIHRoaXMucGFydGljbGVHcm91cCk7XG5cblxuICAgICAgICAvLyBzb2Z0IHdoaXRlIGxpZ2h0XG4gICAgICAgIHZhciBsaWdodCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHgzMDIwMjApO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChsaWdodCk7XG5cbiAgICAgICAgLy8gV2hpdGUgZGlyZWN0aW9uYWwgbGlnaHQgYXQgaGFsZiBpbnRlbnNpdHkgc2hpbmluZyBmcm9tIHRoZSB0b3AuXG4gICAgICAgIHZhciBkaXJlY3Rpb25hbExpZ2h0ID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmZmZmZmYsIDAuNyk7XG4gICAgICAgIGRpcmVjdGlvbmFsTGlnaHQucG9zaXRpb24uc2V0KDEsIDAuNywgMC43KTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoZGlyZWN0aW9uYWxMaWdodCk7XG5cbiAgICAgICAgYWRkU2t5Ym94KHRoaXMuc2NlbmUpO1xuXG5cbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDAsIDApO1xuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgMCwgNCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCA0LCAwKTtcblxuICAgICAgICB0aGlzLm1lc2hlcyA9IHt9O1xuICAgICAgICB0aGlzLmVudGl0aWVzID0gW11cbiAgICB9XG5cbiAgICBzdGF0aWMgbWFrZVNQRUdyb3VwKCkge1xuICAgICAgICByZXR1cm4gbmV3IFNQRS5Hcm91cCh7XG4gICAgICAgICAgICB0ZXh0dXJlOiB7IHZhbHVlOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCcuL2ltYWdlcy9zbW9rZXBhcnRpY2xlLnBuZycpIH0sXG4gICAgICAgICAgICAvL21heEFnZTogNCxcbiAgICAgICAgICAgIC8vYmxlbmRpbmc6IFRIUkVFLk5vcm1hbEJsZW5kaW5nXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgY3JlYXRlQ3ViZShzY2VuZSwgeCwgeSkge1xuICAgICAgICB2YXIgZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoKTtcbiAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtjb2xvcjogMHgwMGZmMDB9KTtcbiAgICAgICAgdmFyIGN1YmUgPSBuZXcgVEhSRUUuTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICAgICAgICBjdWJlLnBvc2l0aW9uLnggKz0geDtcbiAgICAgICAgY3ViZS5wb3NpdGlvbi56ICs9IHk7XG4gICAgICAgIHNjZW5lLmFkZChjdWJlKTtcbiAgICB9XG5cbiAgICB0aWNrKGRlbHRhKSB7XG4gICAgICAgIGlmIChkZWx0YSkge1xuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZUdyb3VwLnRpY2soZGVsdGEpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGQobm9kZSkge1xuICAgICAgICAvLyAgICB0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUREXCIsIG5vZGUpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChub2RlKVxuICAgIH1cblxuICAgIHJlbW92ZShub2RlKSB7XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlKG5vZGUpXG4gICAgfVxuXG4gICAgbWFrZUVtaXR0ZXIocG9zKSB7XG4gICAgICAgIHJldHVybiBuZXcgU1BFLkVtaXR0ZXIodGhpcy5lbWl0dGVyU2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFudFNjZW5lIiwiY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgQmFzZSB7XG4gICAgY29uc3RydWN0b3IoZWwpIHtcblxuXG5cbiAgICB9XG5cblxuXG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmFzZTtcbiIsImltcG9ydCBCYXNlIGZyb20gXCIuL2Jhc2VcIjtcblxuY29uc3QgY2xvY2sgPSBuZXcgVEhSRUUuQ2xvY2soKTtcblxuY2xhc3MgVmlldyAge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRUxcIiwgZWwsIHRoaXMpXG4gICAgICAgIHRoaXMuZWwgPSBlbFxuICAgICAgICB0aGlzLnJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcblxuICAgICAgICAvLyBmaXhtZTogdXNlIGVsIHNpemVcbiAgICAgICAgY29uc3Qgd2lkdGggPSBlbC5vZmZzZXRXaWR0aFxuICAgICAgICBjb25zdCBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHRcblxuICAgICAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNjAsIHdpZHRoIC8gaGVpZ2h0LCAxLCAxMDAwMCk7XG4gICAgICAgIHRoaXMuc2V0U2l6ZSgpXG5cbiAgICAgICAgdGhpcy5jYW1lcmEucm90YXRpb24ueCA9IC0oMTAgKyAzMikgKiBNYXRoLlBJIC8gMTgwO1xuICAgICAgICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHNldFNpemUoKSB7XG4gICAgICAgIHRoaXMuY2FtZXJhLmFzcGVjdCA9IHRoaXMuZWwub2Zmc2V0V2lkdGggLyB0aGlzLmVsLm9mZnNldEhlaWdodDtcbiAgICAgICAgdGhpcy5jYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U2l6ZSh0aGlzLmVsLm9mZnNldFdpZHRoLCB0aGlzLmVsLm9mZnNldEhlaWdodCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKHNjZW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUkVOREVSXCIsIHNjZW5lLCBvcHRpb25zKVxuXG4gICAgICAgIHZhciBkb3JlbmRlcj0gKCk9PiB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoaXMgcmVuZGVyaW5nIC0gYmVjYXVzZSB0aGUgc2NvcGUgLyBjYW52YXMgaXMgZGVzdHJveWVkXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9yZW5kZXIsIDUwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZURpZmYgPSB0aW1lIC0gbGFzdFRpbWU7XG4gICAgICAgICAgICBsYXN0VGltZSA9IHRpbWU7XG5cbiAgICAgICAgICAgIHZhciBkZWx0YTtcbiAgICAgICAgICAgIHZhciB1c2UzanNUaW1lID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmICh1c2UzanNUaW1lKVxuICAgICAgICAgICAgICAgIGRlbHRhID0gY2xvY2suZ2V0RGVsdGEoKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBkZWx0YSA9IHRpbWVEaWZmICogMC4wMDE7XG5cbiAgICAgICAgICAgIGlmIChkZWx0YSA+IDAuMSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IDAuMTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZnJhbWVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyYW1lQ2FsbGJhY2soZGVsdGEpO1xuXG4gICAgICAgICAgICBzY2VuZS50aWNrKGRlbHRhKVxuICAgICAgICAgICAgLy8gYW5pbWF0ZSBDb2xsYWRhIG1vZGVsXG5cbiAgICAgICAgICAgIC8vVEhSRUUuQW5pbWF0aW9uTWl4ZXIudXBkYXRlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVuZGVyKHNjZW5lLnNjZW5lLCB0aGlzLmNhbWVyYSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvcmVuZGVyKTtcbiAgICB9XG5cbiAgICB1cGRhdGVDYW1lcmEodmlld0NlbnRlciwgaCkge1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi54ID0gdmlld0NlbnRlci54O1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi55ID0gdmlld0NlbnRlci56ICsgaDtcbiAgICAgICAgdGhpcy5jYW1lcmEucG9zaXRpb24ueiA9IC0gdmlld0NlbnRlci55ICsgdmlld0NlbnRlci56O1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlldzsiLCJpbXBvcnQgVGVycmFpbkJ1aWxkZXIgZnJvbSBcIi4uL2xpYnMvdGVycmFpbl9idWlsZGVyXCI7XG5pbXBvcnQgUGljayBmcm9tICcuLi9iYXNlM2QvcGljaydcbmltcG9ydCBBbnRTY2VuZSBmcm9tIFwiLi4vYmFzZTNkL2FudC1zY2VuZVwiO1xuaW1wb3J0IFZpZXcgZnJvbSBcIi4uL2Jhc2UzZC92aWV3XCJcblxuLyoqXG4gKiBHYW1ldmlldyBjb250YWlucyBzY2VuZSwgdmlldyxcbiAqL1xuY2xhc3MgQWdHYW1lVmlldyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgdGhpcy5zZXR1cFRocmVlKCk7XG5cbiAgICB0aGlzLmNvbnRyb2xQcm9ncmVzcyA9IHRydWU7XG4gICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwiY29udHJvbC1wcm9ncmVzc1wiKSkge1xuICAgICAgdGhpcy5jb250cm9sUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiQWdHYW1lVmlldyBjb25uZWN0ZWRcIik7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIHRoaXMudG91Y2hzdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLCB0aGlzLnRvdWNoZW5kLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCB0aGlzLnRvdWNobW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnZpZXdDZW50ZXIgPSB7eDogMCwgeTogMCwgejogMTB9O1xuICAgIHRoaXMudG91Y2hlcyA9IHt9O1xuXG5cbiAgICB0aGlzLm1vdmVzID0gMDtcbiAgICB0aGlzLnZpZXcgPSBuZXcgVmlldyh0aGlzKTtcbiAgICB0aGlzLnVwZGF0ZVNpemUoe3RhcmdldDogd2luZG93fSk7XG5cbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG4gIH1cblxuICBmcmFtZUNhbGxiYWNrKGUpIHtcbiAgICB0aGlzLnRpY2soZSlcbiAgICAvLyB0aGlzLnNjZW5lLnRpY2soKVxuICB9XG5cbiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy51cGRhdGVTaXplLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCB0aGlzLm1vdXNlZG93bi5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIHRoaXMubW91c2V1cC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5tb3VzZW1vdmUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgdGhpcy53aGVlbC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLmNsaWNrLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsIHRoaXMud29ybGRDcmVhdGVkLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkudmlzaWJpbGl0eUNoYW5nZSwgdGhpcy52aXNpYmlsaXR5Q2hhbmdlLmJpbmQodGhpcykpO1xuICAgIHZpZXcuZGVzdHJveWVkID0gdHJ1ZVxuICB9XG5cbiAgYXN5bmMgd29ybGRDcmVhdGVkKGUpIHtcbiAgICB0aGlzLndvcmxkID0gZS53b3JsZDtcbiAgICBjb25zdCBtYXAgPSB0aGlzLndvcmxkLm1hcDtcblxuICAgIC8vIEZJWE1FOm1vdmUgdGhpcyBzb21ld2hlcmUgZWxzZVxuICAgIGNvbnN0IHRocmVlSGVpZ2h0TWFwID0gbWFwLnRvVGhyZWVUZXJyYWluKCk7XG5cbiAgICBUZXJyYWluQnVpbGRlci5jcmVhdGUobWFwLCB0aGlzLnNjZW5lLCB0aHJlZUhlaWdodE1hcCk7XG5cbiAgICAvLyBGSVhNRTogbG9hZCBhbGwgbW9kZWxzIGJlZm9yZWhhbmRcbiAgICBhd2FpdCB0aGlzLndvcmxkLmluaXRTY2VuZSh0aGlzLnNjZW5lKTtcbiAgICB0aGlzLnN0YXJ0UmVuZGVyTG9vcCgpO1xuICAgIHRoaXMudXBkYXRlQ2FtZXJhKCk7XG4gIH1cblxuICBzdGFydFJlbmRlckxvb3AoKSB7XG4gICAgdGhpcy52aWV3LnJlbmRlcih0aGlzLnNjZW5lLCB7ZnJhbWVDYWxsYmFjazogdGhpcy5mcmFtZUNhbGxiYWNrLmJpbmQodGhpcyl9KVxuICB9XG5cbiAgZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkge1xuICAgIHZhciBoaWRkZW4sIHZpc2liaWxpdHlDaGFuZ2U7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudC5oaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHsgLy8gT3BlcmEgMTIuMTAgYW5kIEZpcmVmb3ggMTggYW5kIGxhdGVyIHN1cHBvcnRcbiAgICAgIGhpZGRlbiA9IFwiaGlkZGVuXCI7XG4gICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gXCJ2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIGhpZGRlbiA9IFwibXNIaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcIm1zdmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaGlkZGVuID0gXCJ3ZWJraXRIaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcIndlYmtpdHZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9XG4gICAgcmV0dXJuIHt2aXNpYmlsaXR5Q2hhbmdlLCBoaWRkZW59O1xuICB9XG5cbiAgc2V0dXBUaHJlZSgpIHtcbiAgICB0aGlzLnNjZW5lID0gbmV3IEFudFNjZW5lKHRoaXMuc2NlbmUpXG4gIH1cblxuICB0aWNrKGRlbHRhKSB7XG4gICAgaWYgKHRoaXMuY29udHJvbFByb2dyZXNzICYmICF0aGlzLndvcmxkLnBhdXNlKSB7XG4gICAgICB0aGlzLndvcmxkLnRpY2soZGVsdGEpXG4gICAgfVxuICB9XG5cbiAgdmlzaWJpbGl0eUNoYW5nZShldikge1xuICAgIGlmIChldi50YXJnZXRbdGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS5oaWRkZW5dKSB7XG4gICAgICB3b3JsZC5wYXVzZSA9IHRydWVcbiAgICAgIC8vIGhpZGRlblxuICAgIH0gZWxzZSB7XG4gICAgICB3b3JsZC5wYXVzZSA9IGZhbHNlXG4gICAgICAvLyB2aXNpYmxlXG4gICAgfVxuICB9XG5cbiAgdXBkYXRlU2l6ZShldikge1xuICAgIHRoaXMudmlldy5zZXRTaXplKHt9KTtcbiAgICB0aGlzLmNvbnRhaW5lcldpZHRoID0gZXYudGFyZ2V0LmlubmVyV2lkdGg7XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBldi50YXJnZXQuaW5uZXJIZWlnaHRcbiAgfVxuXG4gIG1vdXNldXAoZSkge1xuICAgIHRoaXMubW91c2Vpc2Rvd24gPSBmYWxzZTtcbiAgfVxuXG4gIG1vdXNlZG93bihlKSB7XG4gICAgdGhpcy5tb3VzZWlzZG93biA9IHRydWU7XG4gICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgdGhpcy5veSA9IGUucGFnZVk7XG4gICAgdGhpcy5tb3ZlcyA9IDA7XG4gIH1cblxuICB0b3VjaHN0YXJ0KGUpIHtcbiAgICBjb25zb2xlLmxvZyhcInRvdWNoc3RhcnRcIixlKVxuICAgIGNvbnN0IHRvdWNoID1lLnRhcmdldFRvdWNoZXNcbiAgICB0aGlzLnRvdWNoZXNbMF09e3g6dG91Y2guY2xpZW50WCwgeTp0b3VjaC5jbGllbnRZfVxuICB9XG5cbiAgdG91Y2hlbmQoZSkge1xuICAgIGRlbGV0ZSB0aGlzLnRvdWNoZXNbMF07XG4gICAgY29uc29sZS5sb2coXCJ0b3VjaGVuZFwiLGUpXG4gIH1cblxuICB0b3VjaG1vdmUoZSkge1xuICAgIGNvbnNvbGUubG9nKFwidG91Y2htb3ZlXCIsZSlcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMub2Zmc2V0V2lkdGg7XG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5vZmZzZXRIZWlnaHQ7XG4gICAgY29uc3QgeCA9IGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRYLXRoaXMudG91Y2hlc1swXS54XG4gICAgY29uc3QgeSA9IGUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZLXRoaXMudG91Y2hlc1swXS55XG4gICAgY29uc29sZS5sb2coXCJYWFhYXCIseSx4LHdpZHRoLGhlaWdodCxKU09OLnN0cmluZ2lmeSh0aGlzLnRvdWNoZXMpKVxuICAgIHRoaXMubW92ZSh7eDp4L3dpZHRoLCB5OnkvaGVpZ2h0fSlcbiAgfVxuXG4gIHdoZWVsKGUpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueiArPSBlLmRlbHRhWSAqIDAuMTtcbiAgICBpZiAodGhpcy52aWV3Q2VudGVyLnogPCA1KSB7XG4gICAgICB0aGlzLnZpZXdDZW50ZXIueiA9IDVcbiAgICB9XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKVxuICB9XG5cbiAgY2xpY2soZSkge1xuICAgIGlmICghdGhpcy53b3JsZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLndvcmxkLmNsaWNrKHRoaXMubGFzdFBvcylcbiAgfVxuXG4gIG1vdXNlbW92ZShlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgdGhpcy5tb3ZlcyArPSAxO1xuICAgIGlmICh0aGlzLm1vdXNlaXNkb3duKSB7XG4gICAgICBjb25zdCB3aWR0aCA9IHRoaXMub2Zmc2V0V2lkdGg7XG4gICAgICBjb25zdCBoZWlnaHQgPSB0aGlzLm9mZnNldEhlaWdodDtcbiAgICAgIHRoaXMubW92ZSh7ZHg6IChlLnBhZ2VYIC0gdGhpcy5veCkgLyB3aWR0aCwgZHk6IChlLnBhZ2VZIC0gdGhpcy5veSkgLyBoZWlnaHR9KTtcbiAgICAgIHRoaXMub3ggPSBlLnBhZ2VYO1xuICAgICAgdGhpcy5veSA9IGUucGFnZVk7XG4gICAgfVxuICAgIHRoaXMuaG92ZXIoe1xuICAgICAgeDogZS5wYWdlWCxcbiAgICAgIHk6IGUucGFnZVksXG4gICAgICByeDogZS5wYWdlWCAvIHRoaXMuY29udGFpbmVyV2lkdGggKiAyIC0gMSxcbiAgICAgIHJ5OiAtZS5wYWdlWSAvIHRoaXMuY29udGFpbmVySGVpZ2h0ICogMiArIDEsXG4gICAgfSk7XG4gIH1cblxuICBob3Zlcihtb3VzZSkge1xuICAgIGlmICghdGhpcy53b3JsZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVzID0gUGljay5waWNrKG1vdXNlLCB0aGlzLnZpZXcuY2FtZXJhLCB0aGlzLnNjZW5lLnNjZW5lKTtcblxuICAgIGlmIChyZXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGVudGl0eSA9IHJlc1swXS5vYmplY3QudXNlckRhdGEuZW50aXR5O1xuICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgZW50aXR5ID0gcmVzWzBdLm9iamVjdC5wYXJlbnQudXNlckRhdGEuZW50aXR5O1xuICAgICAgfVxuICAgICAgdGhpcy53b3JsZC5ob3ZlcihlbnRpdHkpO1xuXG4gICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICB0aGlzLmxhc3RQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMihyZXNbMF0ucG9pbnQueCwgLXJlc1swXS5wb2ludC56KS8vLmNvcHkocmVzWzBdLnBvaW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBtb3ZlKGQpIHtcbiAgICB0aGlzLnZpZXdDZW50ZXIueCAtPSBkLmR4ICogdGhpcy52aWV3Q2VudGVyLnogKiAzO1xuICAgIHRoaXMudmlld0NlbnRlci55ICs9IGQuZHkgKiB0aGlzLnZpZXdDZW50ZXIueiAqIDM7XG5cbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG4gIH1cblxuICB1cGRhdGVDYW1lcmEoKSB7XG4gICAgLy8gRklYTUU6IG1vdmUgdG8gd29ybGRcbiAgICB2YXIgaDtcblxuICAgIGlmICh0aGlzLndvcmxkICYmIHRoaXMud29ybGQubWFwKSB7XG4gICAgICBoID0gdGhpcy53b3JsZC5tYXAuZ2V0KFwicm9ja1wiKS5pbnRlcnBvbGF0ZSh0aGlzLnZpZXdDZW50ZXIueCwgdGhpcy52aWV3Q2VudGVyLnkgKyB0aGlzLnZpZXdDZW50ZXIueiAvIDIpO1xuICAgIH1cbiAgICBpZiAoaCA+IDUwIHx8IGggPCA1MCkge1xuICAgICAgaCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy52aWV3LnVwZGF0ZUNhbWVyYSh0aGlzLnZpZXdDZW50ZXIsIGgpXG4gIH1cblxuICBrZXlkb3duKGUpIHtcbiAgICBjb25zb2xlLmxvZyhcIktFWWRvd25cIiwgZSk7XG4gICAgaWYgKGUua2V5Q29kZSA9PSAyNykge1xuICAgICAgdGhpcy53b3JsZC5zZWxlY3QobnVsbCk7XG4gICAgfVxuICB9XG59XG5cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWdhbWUtdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZ2FtZS12aWV3JywgQWdHYW1lVmlldyk7XG59XG4iLCIvLyBzaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9wdWJzdWItamF2YXNjcmlwdFxuLy8gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVCBsaWNlbnNlXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0gW11cbiAgICB9XG5cbiAgICBzdWJzY3JpYmUobGlzdGVuZXIpIHtcblxuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycztcblxuICAgICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpIC0gMTtcblxuICAgICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsaXN0ZW5lcnNbaW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHB1Ymxpc2goaW5mbykge1xuICAgICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaCgoaXRlbSk9PiB7XG4gICAgICAgICAgICBpdGVtKGluZm8pOyAvL2luZm8gIT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIiwiY2xhc3MgSm9iIHtcbiAgICBjb25zdHJ1Y3RvcihlbnRpdHkpIHtcbiAgICAgICAgdGhpcy5fZW50aXR5ID0gZW50aXR5O1xuICAgICAgICB0aGlzLl9yZWFkeSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGdldCByZWFkeSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5O1xuICAgIH1cblxuICAgIGdldCBlbnRpdHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbnRpdHlcbiAgICB9XG5cbiAgICBzZXRSZWFkeSgpIHtcbiAgICAgICAgdGhpcy5fcmVhZHkgPSB0cnVlO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSm9iOyIsIi8qKiBzaW1wbGlmaWVkIHZlcnNpb24gb2YgVEhSRUUuVmVjdG9yMi4gKi9cblxuY2xhc3MgVmVjdG9yMiB7XG4gIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgfVxuXG4gIHRydW5jKG1pbngsIG1pbnksIG1heHgsIG1heHkpIHtcbiAgICByZXR1cm4gbmV3IFZlY3RvcjIoXG4gICAgICB0aGlzLnggPCBtaW54ID8gbWlueCA6ICh0aGlzLnggPiBtYXh4ID8gbWF4eCA6IHRoaXMueCksXG4gICAgICB0aGlzLnkgPCBtaW55ID8gbWlueSA6ICh0aGlzLnkgPiBtYXh5ID8gbWF4eSA6IHRoaXMueSksXG4gICAgKVxuICB9XG5cbiAgY29weSh2KSB7XG4gICAgaWYodikge1xuICAgICAgdGhpcy54ID0gdi54O1xuICAgICAgdGhpcy55ID0gdi55O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFkZCh2KSB7XG4gICAgaWYgKCF2KSB7XG4gICAgICB0aHJvdyBcIlZlY3RvciB2IG5vdCBkZWZpbmVkXCI7XG4gICAgfVxuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGRpc3RhbmNlVG8odikge1xuICAgIGNvbnN0IGR4ID0gdi54IC0gdGhpcy54LCBkeSA9IHYueSAtIHRoaXMueTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxuICB9XG5cbiAgc3ViVmVjdG9ycyhhLCBiKSB7XG4gICAgdGhpcy54ID0gYS54IC0gYi54O1xuICAgIHRoaXMueSA9IGEueSAtIGIueTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldExlbmd0aChsZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUoKS5tdWx0aXBseVNjYWxhcihsZW5ndGgpO1xuICB9XG5cbiAgbm9ybWFsaXplKCkge1xuICAgIHJldHVybiB0aGlzLmRpdmlkZVNjYWxhcih0aGlzLmxlbmd0aCgpIHx8IDEpO1xuICB9XG5cbiAgZGl2aWRlU2NhbGFyKHMpIHtcbiAgICB0aGlzLnggLz0gcztcbiAgICB0aGlzLnkgLz0gcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG11bHRpcGx5U2NhbGFyKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxlbmd0aCgpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gIH1cbn1cblxuZXhwb3J0IHtWZWN0b3IyfTtcbiIsImNsYXNzIEFuZ2xlIHtcbiAgc3RhdGljIGZyb21WZWN0b3IyKGRpcikge1xuICAgIHJldHVybiAtTWF0aC5hdGFuMihkaXIueCwgZGlyLnkpICsgTWF0aC5QSTtcbiAgfVxufVxuXG5leHBvcnQge0FuZ2xlfVxuIiwiaW1wb3J0IEpvYiBmcm9tICcuL2pvYidcbmltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QW5nbGV9IGZyb20gXCIuLi9hbmdsZVwiXG5cbnZhciB0bXBEaXIgPSBuZXcgVmVjdG9yMigpO1xuXG5jbGFzcyBNb3ZlIGV4dGVuZHMgSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBwb3MsIGRpc3RhbmNlKSB7XG4gICAgc3VwZXIoZW50aXR5KTtcbiAgICB0aGlzLnNwZWVkID0gZW50aXR5LnNwZWVkIHx8IDE7XG4gICAgdGhpcy5sbHRhcmdldFBvcyA9IHBvcztcbiAgICB0aGlzLmRpc3RhbmNlID0gZGlzdGFuY2UgfHwgMDtcbiAgfVxuXG4gIG9uRnJhbWUoZGVsdGEpIHtcbiAgICB2YXIgZSA9IHRoaXMuZW50aXR5O1xuICAgIGlmICh0aGlzLmxsdGFyZ2V0UG9zKSB7XG5cbiAgICAgIHZhciBkaXN0YW5jZSA9IHRoaXMubGx0YXJnZXRQb3MuZGlzdGFuY2VUbyhlLnBvcyk7XG4gICAgICB2YXIgdG9nbyA9IGRlbHRhICogdGhpcy5zcGVlZDtcblxuICAgICAgZGlzdGFuY2UgLT0gdGhpcy5kaXN0YW5jZTtcbiAgICAgIHRtcERpci5zdWJWZWN0b3JzKHRoaXMubGx0YXJnZXRQb3MsIGUucG9zKS5zZXRMZW5ndGgodG9nbyk7XG5cbiAgICAgIGUucm90YXRpb24gPSBBbmdsZS5mcm9tVmVjdG9yMih0bXBEaXIpO1xuICAgICAgaWYgKGRpc3RhbmNlIDwgdG9nbykge1xuICAgICAgICBpZiAodGhpcy5kaXN0YW5jZSA+IDApIHtcbiAgICAgICAgICBlLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLmxsdGFyZ2V0UG9zKS5hZGQobmV3IFZlY3RvcjIoKS5zdWJWZWN0b3JzKHRoaXMubGx0YXJnZXRQb3MsIGUucG9zKS5zZXRMZW5ndGgoLXRoaXMuZGlzdGFuY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLmxsdGFyZ2V0UG9zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGUudXBkYXRlTWVzaFBvcygpO1xuICAgICAgICBkZWxldGUgdGhpcy5sbHRhcmdldFBvcztcbiAgICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgICAvLyByZXR1cm4gcmVzdCB0aW1lXG4gICAgICAgIHJldHVybiAodG9nbyAtIGRpc3RhbmNlKSAvIHRoaXMuc3BlZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlLnBvcy5hZGQodG1wRGlyKTtcbiAgICAgIH1cblxuICAgICAgZS51cGRhdGVNZXNoUG9zKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJPUjogbm8gbGx0YXJnZXRwb3MgZGVmaW5lZFwiKTtcbiAgICAgIC8vIHVzZSB0aGlzIG1heWJlIGZvciBmb2xsb3dpbmcgb3RoZXIgZW50aXRpZXNcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG59XG5cbmV4cG9ydCB7TW92ZX07XG4iLCJpbXBvcnQge01vdmV9IGZyb20gJy4uL2xsL21vdmUnXG5cbmNsYXNzIE1sTW92ZSB7XG4gIGNvbnN0cnVjdG9yKGVudGl0eSwgcG9zLCBtZXNoVHlwZSkge1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMubWx0YXJnZXRQb3MgPSBwb3M7XG4gICAgaWYgKCFtZXNoVHlwZSkge1xuICAgICAgbWVzaFR5cGUgPSBcIndhbGtcIjtcbiAgICB9XG4gICAgdGhpcy5tZXNoVHlwZSA9IG1lc2hUeXBlO1xuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIHZhciBkaXN0YW5jZSA9IHRoaXMubWx0YXJnZXRQb3MuZGlzdGFuY2VUbyh0aGlzLmVudGl0eS5wb3MpO1xuICAgIGlmIChkaXN0YW5jZSA8IDAuMSkge1xuICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZW50aXR5LnNldE1lc2goXCJ3YWxrXCIpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgTW92ZSh0aGlzLmVudGl0eSwgdGhpcy5tbHRhcmdldFBvcykpO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG4gIH1cblxufVxuXG5leHBvcnQge01sTW92ZX1cbiIsImltcG9ydCBFdmVudHMgZnJvbSAnLi4vbGlicy9ldmVudHMnXG5pbXBvcnQge01sTW92ZX0gZnJvbSBcIi4vbWwvbW92ZVwiO1xuXG5jbGFzcyBXb3JsZCB7XG4gIGNvbnN0cnVjdG9yKG1hcCkge1xuICAgIHRoaXMubWFwID0gbWFwO1xuICAgIHRoaXMuZW50aXRpZXMgPSBbXTtcbiAgICB0aGlzLmVudGl0aWVzQnlUeXBlID0ge307XG4gICAgaWYgKCF3aW5kb3cuV29ybGQpXG4gICAgICB3aW5kb3cuV29ybGQgPSB0aGlzO1xuXG4gICAgdGhpcy5ob3ZlcmVkID0gbmV3IEV2ZW50cygpO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBuZXcgRXZlbnRzKCk7XG4gIH1cblxuICBnZXQgd2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLndpZHRoO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGVpZ2h0O1xuICB9XG5cbiAgcHVzaChlbnRpdHkpIHtcbiAgICBlbnRpdHkud29ybGQgPSB0aGlzO1xuICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpO1xuICAgIGlmICghZW50aXR5Lm1peGluTmFtZXMpXG4gICAgICBjb25zb2xlLndhcm4oXCJObyBtaXhpbnMgZm9yIFwiLCBlbnRpdHkpO1xuICAgIGVsc2Uge1xuICAgICAgZW50aXR5Lm1peGluTmFtZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0pXG4gICAgICAgICAgdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXSA9IFtdO1xuICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdLnB1c2goZW50aXR5KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHNlYXJjaChwYXJhbSwgb3JpZ2luKSB7XG4gICAgcmV0dXJuIF8uY2hhaW4odGhpcy5lbnRpdGllcykuZmlsdGVyKChlKSA9PiB7XG4gICAgICBpZiAocGFyYW0gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICByZXR1cm4gcGFyYW0oZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIHBhcmFtKSB7XG4gICAgICAgICAgdmFyIHZhbCA9IHBhcmFtW25hbWVdO1xuICAgICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT0JKXCIsIHZhbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChlW25hbWVdIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgaWYgKGVbbmFtZV0uaW5kZXhPZih2YWwpIDwgMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChlW25hbWVdIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghZVtuYW1lXVt2YWxdKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZVtuYW1lXSAhPSB2YWwpXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pLnNvcnRCeSgoZSkgPT4ge1xuICAgICAgaWYgKG9yaWdpbiBpbnN0YW5jZW9mIFRIUkVFLlZlY3RvcjMpXG4gICAgICAgIHJldHVybiBlLnBvcy5kaXN0YW5jZVRvKG9yaWdpbik7XG4gICAgICByZXR1cm4gMTtcbiAgICB9KS52YWx1ZSgpO1xuICB9XG5cbiAgYXN5bmMgaW5pdFNjZW5lKHNjZW5lKSB7XG4gICAgY29uc29sZS5sb2coXCI9PT0gaW5pdFNjZW5lXCIpO1xuICAgIHRoaXMuZW50aXRpZXMuZm9yRWFjaChhc3luYyBlID0+IHtcbiAgICAgIGF3YWl0IGUuc2V0U2NlbmUoc2NlbmUpO1xuICAgIH0pO1xuICB9XG5cbiAgaG92ZXIoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSlcbiAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKGZhbHNlKTtcblxuICAgIHRoaXMuaG92ZXJlZEVudGl0eSA9IGVudGl0eTtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KSB7XG4gICAgICB0aGlzLmhvdmVyZWRFbnRpdHkuaG92ZXJlZCh0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5ob3ZlcmVkLnB1Ymxpc2goZW50aXR5KVxuICB9XG5cbiAgc2VsZWN0KGVudGl0eSkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5KVxuICAgICAgdGhpcy5zZWxlY3RlZEVudGl0eS5zZWxlY3RlZChmYWxzZSk7XG4gICAgdGhpcy5zZWxlY3RlZEVudGl0eSA9IGVudGl0eTtcbiAgICBpZiAodGhpcy5zZWxlY3RlZEVudGl0eSkge1xuICAgICAgdGhpcy5zZWxlY3RlZEVudGl0eS5zZWxlY3RlZCh0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RlZC5wdWJsaXNoKGVudGl0eSlcbiAgfVxuXG4gIGdldFNlbGVjdGVkSGVybygpIHtcbiAgICBpZiAoIXRoaXMuc2VsZWN0ZWRIZXJvKSB7XG4gICAgICB0aGlzLnNlbGVjdGVkSGVybyA9IHRoaXMuc2VhcmNoKHtwbGF5ZXI6IFwiaHVtYW5cIn0pWzBdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEhlcm87XG4gIH1cblxuICB0aWNrKGRlbHRhKSB7XG4gICAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKChlbnRpdHkpID0+IHtcbiAgICAgIGlmIChlbnRpdHkudGljaykge1xuICAgICAgICBlbnRpdHkudGljayhkZWx0YSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNsaWNrKGxhc3RQb3MpIHtcbiAgICBjb25zb2xlLmxvZyhcIldPUkxELmNsaWNrXCIsIGxhc3RQb3MpO1xuICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuc2VsZWN0KHRoaXMuaG92ZXJlZEVudGl0eSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5ICYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkucHVzaEpvYiAvKiYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkuaXNBKFwiaGVyb1wiKSAmJiB0aGlzLnNlbGVjdGVkRW50aXR5LnBsYXllciA9PSBcImh1bWFuXCIqLykge1xuXG4gICAgICBjb25zb2xlLmxvZyhcImFzc2lnbiBuZXcgbW92ZSBqb2JcIiwgbGFzdFBvcyk7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnJlc2V0Sm9icygpO1xuICAgICAgdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSm9iKG5ldyBNbE1vdmUodGhpcy5zZWxlY3RlZEVudGl0eSwgbGFzdFBvcywgMCkpO1xuLy8gICAgICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucHVzaEpvYihuZXcgSm9icy5tbC5Nb3ZlKHdvcmxkLnNlbGVjdGVkRW50aXR5LGxhc3RQb3MpKTtcbiAgICAgIC8vdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSGxKb2IobmV3IEpvYnMuaGwuTW92ZSh0aGlzLnNlbGVjdGVkRW50aXR5LCBsYXN0UG9zKSk7XG4gICAgfVxuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgV29ybGQ7XG4iLCJ2YXIgQXJyYXlUeXBlID0gd2luZG93LkZsb2F0NjRBcnJheSB8fCB3aW5kb3cuQXJyYXk7XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hcCh3LCBoKSB7XG4gIHJldHVybiBuZXcgQXJyYXlUeXBlKHcgKiBoKTtcbn1cblxuY2xhc3MgSGVpZ2h0TWFwIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgd2lkdGg6IDI1NixcbiAgICAgIGhlaWdodDogMjU2LFxuICAgICAgbWFwOiB7fVxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5tYXAgPSB0aGlzLm9wdGlvbnMubWFwO1xuXG4gICAgaWYgKCF0aGlzLm1hcC5yb2NrKSB7XG4gICAgICB0aGlzLm1hcC5yb2NrID0gY3JlYXRlTWFwKHRoaXMub3B0aW9ucy53aWR0aCwgdGhpcy5vcHRpb25zLmhlaWdodCk7XG4gICAgICB0aGlzLmdlbmVyYXRlKClcbiAgICB9XG4gIH07XG5cbiAgZ2V0IHdpZHRoKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuaGVpZ2h0O1xuICB9XG5cbiAgZ2VuZXJhdGUoKSB7XG4gICAgdmFyIHgsIHk7XG4gICAgdmFyIHJvY2sgPSB0aGlzLmdldChcInJvY2tcIik7XG4gICAgZm9yICh4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKVxuICAgICAgZm9yICh5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgICB2YXIgdmFsID0gTWF0aC5zaW4oeCAqIDAuMykgKyBNYXRoLnNpbih5ICogMC4xNSkgKiAyLjA7Ly8vdGhpcy5vcHRpb25zLndpZHRoO1xuICAgICAgICByb2NrKHgsIHksIHZhbCk7XG4gICAgICB9XG4gIH07XG5cbiAgZ2V0KHR5cGUpIHtcbiAgICB2YXIgdyA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLm1hcFt0eXBlXTtcblxuICAgIHZhciBmY3QgPSBmdW5jdGlvbiAoeCwgeSwgdmFsKSB7XG4gICAgICB2YXIgaSA9IHggKyB3ICogeTtcbiAgICAgIGlmICh2YWwpXG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9IHZhbDtcbiAgICAgIHJldHVybiBhcnJheVtpXTtcbiAgICB9O1xuXG4gICAgZmN0LmludGVycG9sYXRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHZhciBmeCA9IE1hdGguZmxvb3IoeCk7XG4gICAgICB2YXIgZnkgPSBNYXRoLmZsb29yKHkpO1xuICAgICAgdmFyIHYwMCA9IHRoaXMoZngsIGZ5KTtcbiAgICAgIHZhciB2MDEgPSB0aGlzKGZ4LCBmeSArIDEpO1xuICAgICAgdmFyIHYxMCA9IHRoaXMoZnggKyAxLCBmeSk7XG4gICAgICB2YXIgdjExID0gdGhpcyhmeCArIDEsIGZ5ICsgMSk7XG4gICAgICB2YXIgZHggPSB4IC0gZng7XG4gICAgICB2YXIgZHkgPSB5IC0gZnk7XG4gICAgICByZXR1cm4gKHYwMCAqICgxIC0gZHgpICsgdjEwICogZHgpICogKDEgLSBkeSkgKyAodjAxICogKDEgLSBkeCkgKyB2MTEgKiBkeCkgKiBkeTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZjdDtcbiAgfTtcblxuICBwaWNrR3JlZW4odywgaCwgZGF0YSkge1xuICAgIHZhciBhID0gbmV3IEFycmF5KHcgKiBoKTtcbiAgICB2YXIgeCwgeTtcbiAgICBmb3IgKHkgPSAwOyB5IDwgaDsgeSsrKSB7XG4gICAgICBmb3IgKHggPSAwOyB4IDwgdzsgeCsrKSB7XG4gICAgICAgIGFbeSAqIHcgKyB4XSA9IGRhdGFbKHkgKiB3ICsgeCkgKiA0ICsgMV0gKiAwLjI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhO1xuICB9O1xuXG5cbiAgdG9UaHJlZVRlcnJhaW4oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbiAoZywgb3B0aW9ucykge1xuICAgICAgY29uc3QgeGwgPSBvcHRpb25zLnhTZWdtZW50cyArIDEsXG4gICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgY29uc3Qgcm9jayA9IHNlbGYuZ2V0KFwicm9ja1wiKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHlsOyBqKyspIHtcbiAgICAgICAgICBnWyh5bCAtIGogLSAxKSAqIHhsICsgaV0ueiArPSByb2NrKGksIGopO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvKlxuICAgICAgdG9UZXh0dXJlKCkge1xuICAgICAgICAgIC8vIFVOVEVTVEVEICEhISFcbiAgICAgICAgICB2YXIgcmFtcFRleCA9IG5ldyBUSFJFRS5EYXRhVGV4dHVyZShkYXRhLnBpeGVscywgZGF0YS53aWR0aCwgZGF0YS5oZWlnaHQsIFRIUkVFLlJHQkFGb3JtYXQpO1xuICAgICAgICAgIHJhbXBUZXgubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgICAgfTtcbiAgKi9cblxuLy8gRklYTUUgdGhpcyBzaG91bGQgbW92ZWQgc29tZXdoZXJlIGVsc2VcbiAgdG9DYW52YXMoX3R5cGUpIHtcbiAgICB2YXIgdHlwZSA9IF90eXBlIHx8IFwicm9ja1wiO1xuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjYW52YXMud2lkdGggPSB0aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gICAgdmFyIGQgPSBjb250ZXh0LmNyZWF0ZUltYWdlRGF0YShjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpLFxuICAgICAgZGF0YSA9IGQuZGF0YTtcbiAgICB2YXIgbWluLCBtYXg7XG4gICAgdmFyIGFjY2Vzc29yID0gdGhpcy5nZXQodHlwZSk7XG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspIHtcbiAgICAgICAgdmFyIHYgPSBhY2Nlc3Nvcih4LCB5KTtcblxuICAgICAgICBpZiAoIW1pbiB8fCBtaW4gPiB2KVxuICAgICAgICAgIG1pbiA9IHY7XG4gICAgICAgIGlmICghbWF4IHx8IG1heCA8IHYpXG4gICAgICAgICAgbWF4ID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJNTU1NXCIsIG1pbiwgbWF4KTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgIHZhciBpID0geSAqIHRoaXMub3B0aW9ucy5oZWlnaHQgKyB4O1xuICAgICAgICBpZHggPSBpICogNDtcbiAgICAgICAgZGF0YVtpZHhdID0gZGF0YVtpZHggKyAxXSA9IGRhdGFbaWR4ICsgMl0gPSBNYXRoLnJvdW5kKCgoYWNjZXNzb3IoeCwgeSkgLSBtaW4pIC8gKG1heCAtIG1pbikpICogMjU1KTtcbiAgICAgICAgZGF0YVtpZHggKyAzXSA9IDI1NTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29udGV4dC5wdXRJbWFnZURhdGEoZCwgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBIZWlnaHRNYXA7XG4iLCJmdW5jdGlvbiBhamF4KHVybCwgbWV0aG9kID0gXCJHRVRcIiwgZGF0YSA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzIDw9IDI5OSAmJiByZXF1ZXN0LnN0YXR1cyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJFU1BPTlNFXCIsIHJlcXVlc3QsIHR5cGVvZiByZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlcXVlc3QucmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IoJ05ldHdvcmsgRXJyb3InKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgICByZXF1ZXN0LnNlbmQoZGF0YSk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFqYXg7IiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi92ZWN0b3IyXCI7XG5cbnZhciB1aWQgPSAxMTExMDtcblxuY2xhc3MgRW50aXR5IHtcbiAgY29uc3RydWN0b3IoaGVpZ2h0bWFwLCBvcHMpIHtcblxuICAgIHZhciBlbnRpdHkgPSBvcHMuZW50aXR5VHlwZXNbb3BzLnR5cGVdO1xuICAgIGlmICghZW50aXR5KSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJFbnRpdHk6IE5vIEVudGl0eS1UeXBlIG5hbWVkIFwiICsgb3BzLnR5cGUgKyBcIiBmb3VuZCFcIik7XG4gICAgICBlbnRpdHkgPSB7fTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBlbnRpdHkpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgb3BzKTtcbiAgICAvLyBGSVhNRTogcmVkdWNlIGNvbXBsZXhpdHkgYW5kIHJlZmVyZW5jZXMgYnkgcmVtb3ZpbmcgbW9kZWxzLCBtYXAgYW5kIHNvID8/P1xuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnBvcyA9IG5ldyBWZWN0b3IyKCkuY29weSh0aGlzLnBvcyk7XG4gICAgdGhpcy50eXBlTmFtZSA9IHRoaXMudHlwZTtcbiAgICB0aGlzLnVpZCA9IHVpZCsrO1xuICAgIHRoaXMubWFwID0gaGVpZ2h0bWFwO1xuICAgIC8vIGNsb25lXG4gICAgdGhpcy5yZXNvdXJjZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnJlc291cmNlcyk7XG4gICAgdGhpcy50eXBlID0gZW50aXR5O1xuICAgIGlmICghdGhpcy5tZXNoTmFtZSlcbiAgICAgIHRoaXMubWVzaE5hbWUgPSBcImRlZmF1bHRcIjtcblxuICAgIGlmIChlbnRpdHkubWl4aW5zKSB7XG4gICAgICB0aGlzLm1peGlucyA9IHt9O1xuICAgICAgdGhpcy5taXhpbk5hbWVzID0gW107XG4gICAgICB0aGlzLm1peGluRGVmID0gZW50aXR5Lm1peGlucztcbiAgICAgIGVudGl0eS5taXhpbnMuZm9yRWFjaChtaXhpbiA9PiB7XG4gICAgICAgIHZhciBmb3VuZCA9IG9wcy5taXhpbkRlZnNbbWl4aW5dO1xuICAgICAgICBpZiAoZm91bmQgJiYgZm91bmQgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgIGZvdW5kID0gZm91bmQoKTtcbiAgICAgICAgICB0aGlzLm1peGluc1ttaXhpbl0gPSBmb3VuZDtcbiAgICAgICAgICB0aGlzLm1peGluTmFtZXMucHVzaChtaXhpbik7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBmb3VuZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJNaXhpbiBub3QgZm91bmRcIiwgbWl4aW4pXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBnZXQgaWQoKSB7XG4gICAgcmV0dXJuIHRoaXMudWlkXG4gIH1cblxuICBydW5Qb3N0TG9hZCgpIHtcbiAgICBmb3IgKHZhciBtaXhpbiBpbiB0aGlzLm1peGlucykge1xuICAgICAgaWYgKHRoaXMubWl4aW5zW21peGluXS5wb3N0TG9hZCkge1xuICAgICAgICB0aGlzLm1peGluc1ttaXhpbl0ucG9zdExvYWQuYXBwbHkodGhpcywgW10pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzQShtaXhpbikge1xuICAgIHJldHVybiB0aGlzLm1peGluRGVmLmluZGV4T2YobWl4aW4pID49IDA7XG4gIH1cblxuICBhc3luYyBzZXRTY2VuZShzY2VuZSkge1xuICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRNZXNoKHRoaXMubWVzaE5hbWUpO1xuICB9O1xuXG4gIGNvbXB1dGVNZXNoUG9zKCkge1xuICAgIGNvbnN0IGggPSB0aGlzLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMucG9zLngsIHRoaXMucG9zLnkpO1xuICAgIHJldHVybiB7eDogdGhpcy5wb3MueCwgeTogaCwgejogLXRoaXMucG9zLnl9O1xuICB9XG5cbiAgdXBkYXRlTWVzaFBvcygpIHtcbiAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICBpZiAodGhpcy5tZXNoICYmIHRoaXMubWVzaC5yb3RhdGlvbiAmJiB0aGlzLnJvdGF0aW9uKSB7XG4gICAgICAgIHRoaXMubWVzaC5yb3RhdGlvbi55ID0gdGhpcy5yb3RhdGlvbjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5jb21wdXRlTWVzaFBvcygpO1xuICAgICAgdGhpcy5tZXNoLnNldFBvcyhwb3NpdGlvbi54LCBwb3NpdGlvbi55LCBwb3NpdGlvbi56KTtcbiAgICB9XG4gIH07XG5cbiAgZ2V0TWVzaERlZigpIHtcbiAgICBjb25zdCBlbnRpdHkgPSB0aGlzLnR5cGU7XG4gICAgdmFyIG1lc2hUeXBlO1xuICAgIHZhciBhbmltYXRpb247XG5cbiAgICBpZiAodGhpcy50eXBlLm1lc2hlcykge1xuICAgICAgdmFyIGRlZiA9IGVudGl0eS5tZXNoZXNbdGhpcy5tZXNoTmFtZV07XG4gICAgICBpZiAoIWRlZilcbiAgICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBvZiBuYW1lICdcIiArIG5hbWUgKyBcIicgZm91bmQgaW4gZW50aXR5LWRlZlwiLCBlbnRpdHkpO1xuICAgICAgbWVzaFR5cGUgPSBkZWYubWVzaDtcbiAgICAgIGFuaW1hdGlvbiA9IGRlZi5hbmltYXRpb247XG4gICAgfSBlbHNlIGlmIChlbnRpdHkubWVzaCkge1xuICAgICAgbWVzaFR5cGUgPSBlbnRpdHkubWVzaDtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaFR5cGUgPSB0aGlzLnR5cGVOYW1lO1xuICAgIH1cbiAgICByZXR1cm4ge21lc2hUeXBlLCBhbmltYXRpb259O1xuICB9XG5cbiAgc2V0TWVzaChuYW1lKSB7XG5cbiAgICBpZiAobmFtZSkge1xuICAgICAgdGhpcy5tZXNoTmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgY29uc3Qge21lc2hUeXBlLCBhbmltYXRpb259ID0gdGhpcy5nZXRNZXNoRGVmKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tb2RlbExvYWRlci5sb2FkKG1lc2hUeXBlLCBhbmltYXRpb24pLnRoZW4oKG1lc2gpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTU9ERUwgbG9hZGVkXCIsIG1lc2gsIG1lc2hUeXBlLCBhbmltYXRpb24sIHRoaXMuc2NlbmUpO1xuICAgICAgbWVzaC5hdHRhY2hUb1NjZW5lKHRoaXMuc2NlbmUpO1xuXG4gICAgICBpZiAodGhpcy5tZXNoKSB7XG4gICAgICAgIHRoaXMubWVzaC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubWVzaCA9IG1lc2g7XG4gICAgICBtZXNoLnNldEVudGl0eSh0aGlzKTtcbiAgICAgIHRoaXMudXBkYXRlTWVzaFBvcygpO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uRmluaXNoZWQpIHtcbiAgICAgICAgdGhpcy5tZXNoLmFuaW1hdGlvbkZpbmlzaGVkID0gdGhpcy5hbmltYXRpb25GaW5pc2hlZC5iaW5kKHRoaXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkKTtcbiAgICAgIHRoaXMubWVzaC5zZWxlY3RlZCh0aGlzLnN0YXRlLnNlbGVjdGVkKTtcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSk7XG4gIH07XG5cbiAgaG92ZXJlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLmhvdmVyZWQodGhpcy5zdGF0ZS5ob3ZlcmVkID0gdmFsKTtcbiAgfTtcblxuICBzZWxlY3RlZCh2YWwpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQgPSB2YWwpO1xuICB9O1xuXG4gIGluY3JlYXNlQnkod2hhdCwgYW1vdW50KSB7XG4gICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gPSAodGhpcy5yZXNvdXJjZXNbd2hhdF0gfHwgMCkgKyBhbW91bnQ7XG4gIH07XG5cbiAgdGFrZSh3aGF0LCBhbW91bnQpIHtcbiAgICBpZiAodGhpcy5yZXNvdXJjZXNbd2hhdF0gPj0gYW1vdW50KSB7XG4gICAgICB0aGlzLnJlc291cmNlc1t3aGF0XSAtPSBhbW91bnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIGdpdmUod2hhdCwgYW1vdW50LCB0b0VudGl0eSkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIGNvbnNvbGUuZGVidWcoXCJHSVZFIFRPXCIsIHRvRW50aXR5LCB3aGF0KTtcbiAgICAgIHRvRW50aXR5LnJlc291cmNlc1t3aGF0XSA9ICh0b0VudGl0eS5yZXNvdXJjZXNbd2hhdF0gfHwgMCkgKyBhbW91bnQ7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCB7RW50aXR5fVxuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBcImJha2VyeVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiYmFrZXJ5M1wiXG4gIH0sXG4gIFwiYmlnX3N0b25lXCI6IHtcbiAgICBcIm1lc2hcIjogXCJiaWdfc3RvbmUzXCJcbiAgfSxcbiAgXCJjcm9wX3NtYWxsXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX21lZFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF9oaWdoXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX3RpbnlcIjoge1xuICAgIFwibWVzaFwiOiBcImNyb3BfdGlueTJcIixcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJmYXJtXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmYXJtMlwiXG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWVzaFwiOiBcImZpc2hpbmdfaHV0MlwiLFxuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJncmF2ZTJcIlxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWVzaFwiOiBcImhlcm9fbHAyXCJcbiAgfSxcbiAgXCJtaW5lXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtaW5lM1wiXG4gIH0sXG4gIFwibWlsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWlsbFwiLFxuICAgIFwic2NhbGVcIjogMVxuICB9LFxuICBcInRvd25oYWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0b3duaGFsbF90cnkzXCJcbiAgfSxcbiAgXCJ0b3dlclwiOiB7XG4gICAgXCJtZXNoXCI6IFwidG93ZXIyXCJcbiAgfSxcbiAgXCJtYW5fcGlja1wiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICBcInRleHR1cmVcIjogXCJtYW5fZmlnaHQucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNDUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ4LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDM1LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGlja1wiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9heGVcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICBcInRleHR1cmVcIjogXCJtYW5fZmlnaHQucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA0MCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMzUsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMjcsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwaWNrXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2Vfd2Fsa1wiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJzaXRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAzMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDIwLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDIwLFxuICAgICAgICBcImFuaW1hdGVcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcInNpdGRvd25cIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMTgsXG4gICAgICAgIFwibG9vcFwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQwLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQwXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMzAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA2NVxuICAgICAgfSxcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDEwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNjVcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2ZpZ2h0XCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0MSxcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMTgsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJzd29yZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMzUsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJzd29yZFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMjAsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJ1Z2hcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwibWVzaFwiOiBcImZpcjRcIlxuICB9LFxuICBcImZpcl9vbGRcIjoge1xuICAgIFwibWVzaFwiOiBcImZpcjJcIixcbiAgICBcInRleHR1cmVcIjogXCJmaXI1LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC40MixcbiAgICBcImRvdWJsZXNpZGVkXCI6IHRydWUsXG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlXG4gIH0sXG5cbiAgXCJ0cmVlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0cmVlNVwiLFxuICAgIFwic2NhbGVcIjogMC4yLFxuICAgIFwiZG91Ymxlc2lkZWRcIjogdHJ1ZVxuICB9LFxuICBcInNoZWVwXCI6IHtcbiAgICBcInNjYWxlXCI6IDAuMTUsXG4vLyAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcInRleHR1cmVcIjogXCJzaGVlcC5wbmdcIixcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQ1XG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDUsXG4gICAgICAgIFwibG9vcFwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDYwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMTAwXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIndlbGxcIjoge1xuICAgIFwibWVzaFwiOiBcIndlbGxcIlxuICB9LFxuICBcIndvcmtzaG9wXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ3b3Jrc2hvcDJcIixcbiAgICBcInBhcnRpY2xlc1wiOiB7XG4gICAgICBcInNtb2tlXCI6IHtcbiAgICAgICAgXCJwb3NpdGlvblwiOiB7XG4gICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgXCJ6XCI6IDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiY29uc3Qgb25seU9uZUF0QVRpbWUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGxldCB3aXRoaW4gPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGZjdCkge1xuICAgICAgICBpZiAod2l0aGluKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ubHlPbmVBdEFUaW1lKGZjdCksIDEwKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2l0aGluPXRydWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZjdCgpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB3aXRoaW4gPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pKCk7XG5cblxuY2xhc3MgTW9kZWwge1xuICAgIGNvbnN0cnVjdG9yKGlubmVyTWVzaGVzLCBvdXRlck5vZGUsIGhvdmVyUmluZywgc2VsZWN0UmluZykge1xuICAgICAgICB0aGlzLmlubmVyTWVzaGVzID0gaW5uZXJNZXNoZXM7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlID0gb3V0ZXJOb2RlO1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5vdXRlck5vZGUucG9zaXRpb247XG4gICAgICAgIHRoaXMucm90YXRpb24gPSB0aGlzLm91dGVyTm9kZS5yb3RhdGlvbjtcbiAgICAgICAgdGhpcy5ob3ZlclJpbmcgPSBob3ZlclJpbmc7XG4gICAgICAgIHRoaXMuc2VsZWN0UmluZyA9IHNlbGVjdFJpbmc7XG4gICAgfVxuXG4gICAgYXR0YWNoVG9TY2VuZShzY2VuZSkge1xuICAgICAgICB0aGlzLnNjZW5lID0gc2NlbmU7XG4gICAgICAgIGlmKGZhbHNlKSB7XG4gICAgICAgICAgICBvbmx5T25lQXRBVGltZSgoKSA9PiBzY2VuZS5hZGQodGhpcy5vdXRlck5vZGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjZW5lLmFkZCh0aGlzLm91dGVyTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldEVudGl0eShlbnRpdHkpIHtcbiAgICAgICAgXy5lYWNoKHRoaXMuaW5uZXJNZXNoZXMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICBtLnVzZXJEYXRhLmVudGl0eSA9IGVudGl0eTtcbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBob3ZlcmVkKHZhbCkge1xuICAgICAgICBpZiAodmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuaG92ZXJSaW5nLnZpc2libGUgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaG92ZXJSaW5nLnZpc2libGU7XG4gICAgfVxuXG4gICAgc2VsZWN0ZWQodmFsKSB7XG4gICAgICAgIGlmICh2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RSaW5nLnZpc2libGUgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0UmluZy52aXNpYmxlO1xuICAgIH1cblxuICAgIGRldGFjaEZyb21TY2VuZSgpIHtcbiAgICAgICAgc2NlbmUucmVtb3ZlKHRoaXMub3V0ZXJOb2RlKVxuICAgIH1cblxuICAgIHNldFBvcyh4LCB5LCB6KSB7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnggPSB4O1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi55ID0geTtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueiA9IHo7XG4gICAgfVxuXG4gICAgZW5hYmxlUGFydGljbGVzKHR5cGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVtaXR0ZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWwgLSBFTkFCTEVcIik7XG4gICAgICAgICAgICB2YXIgZW1pdHRlciA9IHRoaXMuZW1pdHRlciA9IHRoaXMuc2NlbmUucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpOyAvL2FkZEVtaXR0ZXIoIEJhc2UubWFrZUVtaXR0ZXIobmV3IFRIUkVFLlZlY3RvcjMoMCwwLDApKSk7XG4gICAgICAgICAgICBlbWl0dGVyLnBvc2l0aW9uLnZhbHVlID0gdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRpc2FibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAodGhpcy5lbWl0dGVyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIuZGlzYWJsZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIERJU0FCTEVcIiwgdHlwZSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5lbWl0dGVyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJFTU9WRSBNRSBGUk9NIFNDRU5FXCIsIHRoaXMpO1xuICAgICAgICAvLyBob29rIHRvIHJlbW92ZSBhbmltYXRpb24tcmVzdGFydGVyLWludGVydmFsXG4gICAgICAgIGlmICh0aGlzLmlubmVyTWVzaGVzICYmIHRoaXMuaW5uZXJNZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgXy5lYWNoKHRoaXMuaW5uZXJNZXNoZXMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgaWYgKG0uYmVmb3JlUmVtb3ZlKVxuICAgICAgICAgICAgICAgICAgICBtLmJlZm9yZVJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpcy5vdXRlck5vZGUpO1xuICAgICAgICBkZWxldGUgdGhpcy5vdXRlck5vZGU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb2RlbDsiLCJpbXBvcnQgTWVzaGVzIGZyb20gXCIuLi9jb25maWcvbWVzaGVzXCJcbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9tb2RlbFwiXG5cbi8vIEZJWE1FOiBub3QgbmVlZGVkIGFueW1vcmU/XG5mdW5jdGlvbiBlbnN1cmVMb29wKGFuaW1hdGlvbikge1xuICByZXR1cm47XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uLmhpZXJhcmNoeS5sZW5ndGg7IGkrKykge1xuXG4gICAgdmFyIGJvbmUgPSBhbmltYXRpb24uaGllcmFyY2h5W2ldO1xuXG4gICAgdmFyIGZpcnN0ID0gYm9uZS5rZXlzWzBdO1xuICAgIHZhciBsYXN0ID0gYm9uZS5rZXlzW2JvbmUua2V5cy5sZW5ndGggLSAxXTtcblxuICAgIGxhc3QucG9zID0gZmlyc3QucG9zO1xuICAgIGxhc3Qucm90ID0gZmlyc3Qucm90O1xuICAgIGxhc3Quc2NsID0gZmlyc3Quc2NsO1xuICB9XG59XG5cbmNsYXNzIE1vZGVsTG9hZGVyIHtcblxuICBjb25zdHJ1Y3Rvcihsb2FkZXJzID0ge30sIG1hbmFnZXIgPSBudWxsLCBtZXNoZXMgPSBudWxsKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfLnBpY2sobG9hZGVycywgWydpbWFnZUxvYWRlciddKSk7XG5cbiAgICBpZiAoIW1hbmFnZXIgJiYgVEhSRUUuTG9hZGluZ01hbmFnZXIpIHtcbiAgICAgIG1hbmFnZXIgPSBuZXcgVEhSRUUuTG9hZGluZ01hbmFnZXIoKTtcbiAgICB9XG4gICAgaWYgKG1lc2hlcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IG1lc2hlcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tZXNoZXMgPSBNZXNoZXM7XG4gICAgfVxuICAgIG1hbmFnZXIub25Qcm9ncmVzcyA9IGZ1bmN0aW9uIChpdGVtLCBsb2FkZWQsIHRvdGFsKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwibWFuYWdlci5vblByb2dyZXNzXCIsIGl0ZW0sIGxvYWRlZCwgdG90YWwpO1xuICAgIH07XG5cbiAgICBpZiAoIXRoaXMuaW1hZ2VMb2FkZXIgJiYgVEhSRUUuSW1hZ2VMb2FkZXIpIHtcbiAgICAgIHRoaXMuaW1hZ2VMb2FkZXIgPSBuZXcgVEhSRUUuSW1hZ2VMb2FkZXIobWFuYWdlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIgJiYgVEhSRUUuR0xURkxvYWRlcikge1xuICAgICAgdGhpcy5nbHRmTG9hZGVyID0gbmV3IFRIUkVFLkdMVEZMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgIGlmICghdGhpcy50ZXh0dXJlTG9hZGVyICYmIFRIUkVFLlRleHR1cmVMb2FkZXIpIHtcbiAgICAgIHRoaXMudGV4dHVyZUxvYWRlciA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgIGNvbG9yOiBjb2xvcixcbiAgICAgIGZsYXRTaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZyxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgb3BhY2l0eTogMC41LFxuICAgICAgZGVwdGhUZXN0OiBmYWxzZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlXG4gICAgfSk7XG4gICAgY29uc3Qgc29tZVJpbmcgPSBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuUmluZ0dlb21ldHJ5KDEuMywgMiwgMjAsIDUsIDAsIE1hdGguUEkgKiAyKSwgbWF0ZXJpYWwpO1xuICAgIHNvbWVSaW5nLnBvc2l0aW9uLnNldCgwLCAwLjUsIDAuMCk7XG4gICAgc29tZVJpbmcucm90YXRlT25BeGlzKG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApLCAtMS42KTtcbiAgICBzb21lUmluZy52aXNpYmxlID0gZmFsc2U7XG4gICAgcmV0dXJuIHNvbWVSaW5nXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlQm94KCkge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZGQ5OTAwLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjVcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEsIDEsIDEpLCBtYXRlcmlhbCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gIH1cblxuICBhc3luYyBwYWNrSW50b05vZGUob3B0aW9ucykge1xuICAgIGNvbnN0IHttZXNoRGVmLCBtZXNoLCBtZXNoTmFtZX0gPSBvcHRpb25zO1xuICAgIHZhciBvYmplY3RzO1xuICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cyA9IG1lc2guY2xvbmUoKTtcbiAgICB9XG4gICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcblxuICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgIC8vIGVuY2xvc2UgbWVzaCB3aXRoaW4gc2NlbmUtbm9kZSwgc28gdGhhdCBpdCBjYW4gYmUgcm90YXRlZCBhbmQgdGhlcmUgY2FuIGJlIHNldmVyYWwgbWVzaGVzXG4gICAgLy8gYXR0YWNoZWQgdG8gb25lIGVudGl0eVxuICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgIF8uZWFjaChvYmplY3RzLCBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICBub2RlLmFkZChvYmplY3QpO1xuICAgIH0pO1xuICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgbmV3TW9kZWwubmFtZSA9IG1lc2g7XG4gICAgbmV3TW9kZWwudHlwZSA9IG1lc2hOYW1lO1xuXG4gICAgdGhpcy5hZGRSaW5ncyhub2RlLCBuZXdNb2RlbCk7XG5cbiAgICByZXR1cm4gbmV3TW9kZWxcbiAgfVxuXG4gIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuaG92ZXJSaW5nID0gTW9kZWxMb2FkZXIuY3JlYXRlUmluZygweGRkOTkwMCkpO1xuICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4RkY5OTAwKSk7XG4gIH1cblxuICBhc3luYyBsb2FkVW5jYWNoZWQobWVzaCwgYW5pbWF0aW9uKSB7XG4gICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgIGlmICghbWVzaERlZikge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gTWVzaCBkZWZpbmVkIGZvciBuYW1lICdcIiArIG1lc2ggKyBcIidcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubG9hZE9iakNvbXBsZXRlKG1lc2gsIGFuaW1hdGlvbilcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmoobWVzaE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICBpZiAodGhpcy5nbHRmTG9hZGVyKSB7XG4gICAgICAgIHRoaXMuZ2x0ZkxvYWRlci5sb2FkKFxuICAgICAgICAgICdtb2RlbHMvJyArIG1lc2hOYW1lICsgJy5nbHRmJyxcbiAgICAgICAgICBtZXNoID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoe21lc2gsIG1lc2hOYW1lfSlcbiAgICAgICAgICB9LFxuICAgICAgICAgICh4aHIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc2hOYW1lICsgXCIgXCIgKyAoeGhyLmxvYWRlZCAvIHhoci50b3RhbCAqIDEwMCkgKyAnJSBsb2FkZWQnKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsb2FkT2JqQ29tcGxldGUobmFtZSwgZHVtbXkpIHtcbiAgICBjb25zdCBtZXNoRGVmID0gdGhpcy5tZXNoZXNbbmFtZV07XG4gICAgY29uc3QgbWVzaE5hbWUgPSAobWVzaERlZiAmJiBtZXNoRGVmLm1lc2gpIHx8IG5hbWU7XG4gICAgY29uc29sZS5sb2coXCJMb2FkIHRleHR1cmVcIiwgbmFtZSwgbWVzaE5hbWUpO1xuICAgIGNvbnN0IG1lc2hPYmplY3QgPSBhd2FpdCB0aGlzLmxvYWRPYmoobWVzaE5hbWUpO1xuXG4gICAgY29uc29sZS5sb2coXCJNT0RFTE9CSkVDVCBcIiwgbmFtZSwgbWVzaE9iamVjdCk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7bWVzaERlZn0sIG1lc2hPYmplY3QpO1xuICB9XG5cbiAgLy8gYW5pbWF0ZSAoY2xvbmVkKSBtZXNoXG4gIGFuaW1hdGUobWVzaCwgbmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IGFuaW1hdGlvbiA9IG5ldyBUSFJFRS5BbmltYXRpb24obWVzaCwgYW5pbWF0aW9uc1tuYW1lXSk7XG4gICAgYW5pbWF0aW9uLmRhdGEgPSBhbmltYXRpb25zW25hbWVdO1xuICAgIGNvbnN0IHNjYWxlID0gb3B0aW9ucy50aW1lU2NhbGUgfHwgMTtcblxuICAgIGlmIChvcHRpb25zLmxvb3AgPT09IGZhbHNlKSB7XG4gICAgICBhbmltYXRpb24ubG9vcCA9IGZhbHNlO1xuICAgIH1cbiAgICBhbmltYXRpb24udGltZVNjYWxlID0gc2NhbGU7XG4gICAgYW5pbWF0aW9uLnBsYXkoKTtcblxuICAgIC8vIGltcGxlbWVudCBzdXBwb3J0IGZvciBsb29waW5nIGludGVydmFsIHdpdGhpbiBnbG9iYWwgYW5pbWF0aW9uXG4gICAgLy8gaGF2ZSBhIGxvb2sgYXQgZW50aXR5IGFsc29cbiAgICBpZiAob3B0aW9ucy5zdGFydEZyYW1lKSB7XG4gICAgICAvL2FuaW1hdGlvbi51cGRhdGUoIG9wdGlvbnMuc3RhcnRGcmFtZSk7XG4gICAgICBpZiAob3B0aW9ucy5hbmltYXRlID09PSBmYWxzZSAmJiBmYWxzZSkge1xuICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICBhbmltYXRpb24udXBkYXRlKG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZW5kRnJhbWUpIHtcbiAgICAgICAgdmFyIHN0YXJ0QW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGFuaW1hdGlvbi5wbGF5KG9wdGlvbnMuc3RhcnRGcmFtZSwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBzdG9wQW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJBTklNQUwgc3RvcEFOaW1hdGlvblwiLCBtZXNoLCBtZXNoLmFuaW1hdGlvbkZpbmlzaGVkKTtcbiAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgIGlmIChtZXNoLnVzZXJEYXRhICYmIG1lc2gudXNlckRhdGEuZW50aXR5ICYmIG1lc2gudXNlckRhdGEuZW50aXR5LmFuaW1hdGlvbkZpbmlzaGVkKVxuICAgICAgICAgICAgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRpbWUgPSAxMDAwICogKG9wdGlvbnMuZW5kRnJhbWUgLSBvcHRpb25zLnN0YXJ0RnJhbWUpIC8gc2NhbGU7XG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgICAgIGlmIChvcHRpb25zLmxvb3AgIT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoc3RhcnRBbmltYXRpb24sIHRpbWUpO1xuICAgICAgICAgIG1lc2guYmVmb3JlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBET05UIExPT1BcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoc3RvcEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIGFuaW1hdGlvbi51cGRhdGUoTWF0aC5yYW5kb20oKSAqIDEwKTtcbiAgfVxuXG4gIGxvYWRKU09OKG5hbWUsIGFuaW1hdGlvbikge1xuICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5tZXNoZXNbbmFtZV0pO1xuXG4gICAgLy8gbm93IG92ZXJyaWRlIHdpdGggb3B0aW9ucyBmcm9tIGFuaW1hdGlvbnMtcGFydFxuICAgIGlmIChvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSkge1xuICAgICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgb3B0aW9ucy5hbmltYXRpb25zW2FuaW1hdGlvbl0pO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkxvYWRpbmcgbW9kZWxcIiwgbmFtZSk7XG5cbiAgICAgIHZhciB0ZXh0dXJlID0gbmV3IFRIUkVFLlRleHR1cmUoKTtcbiAgICAgIHRoaXMuanNvbkxvYWRlci5sb2FkKCdtb2RlbHMvJyArIG5hbWUgKyAnLmpzb24nLCBmdW5jdGlvbiAoZ2VvbWV0cnksIG1hdGVyaWFscykge1xuXG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVWZXJ0ZXhOb3JtYWxzKCk7XG4gICAgICAgIGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXG4gICAgICAgIGVuc3VyZUxvb3AoZ2VvbWV0cnkuYW5pbWF0aW9uKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbWF0ZXJpYWxzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHtcblxuICAgICAgICAgIHZhciBvcmlnaW5hbE1hdGVyaWFsID0gbWF0ZXJpYWxzW2ldO1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJNQVRcIiwgb3JpZ2luYWxNYXRlcmlhbCk7XG4gICAgICAgICAgb3JpZ2luYWxNYXRlcmlhbC5za2lubmluZyA9IHRydWU7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZG91Ymxlc2lkZWQpIHtcbiAgICAgICAgICAgIC8vICBvcmlnaW5hbE1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkRPVUJMRVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEZhY2VNYXRlcmlhbChtYXRlcmlhbHMpO1xuICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZClcbiAgICAgICAgICBtYXRlcmlhbC5zaWRlID0gVEhSRUUuRG91YmxlU2lkZTtcblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWUpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICB3aXJlZnJhbWU6IHRydWUsXG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdE1hdGVyaWFsKSB7XG4gICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogJ2JsdWUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5Ta2lubmVkTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwsIGZhbHNlKTtcblxuICAgICAgICBhbmltYXRpb25zW25hbWVdID0gZ2VvbWV0cnkuYW5pbWF0aW9uO1xuXG4gICAgICAgIHJlc29sdmUobWVzaClcbiAgICAgIH0sIG51bGwsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW9kZWxMb2FkZXI7XG4iLCJpbXBvcnQge01vdmV9IGZyb20gJy4uL2xsL21vdmUnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmxldCBhbmltYWwgPSB7XG4gIG9uTm9Kb2I6IGZ1bmN0aW9uIChkZWx0YSkge1xuICAgIGlmICh0aGlzLnNob3VsZFdhbGsoKSkge1xuICAgICAgdGhpcy5zZXRNZXNoKFwid2Fsa1wiKTtcbiAgICAgIGxldCB0YXJnZXRQb3MgPSBuZXcgVmVjdG9yMihNYXRoLnJhbmRvbSgpICogMiAtIDEsXG4gICAgICAgIE1hdGgucmFuZG9tKCkgKiAyIC0gMSkuYWRkKHRoaXMucG9zKTtcblxuICAgICAgaWYgKHRoaXMud29ybGQpIHtcbiAgICAgICAgdGFyZ2V0UG9zID0gdGFyZ2V0UG9zLnRydW5jKDAsIDAsIHRoaXMud29ybGQud2lkdGgsIHRoaXMud29ybGQuaGVpZ2h0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaEpvYihuZXcgTW92ZSh0aGlzLCB0YXJnZXRQb3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wbGF5QW5pbWF0aW9uKFwiZWF0XCIpO1xuICAgIH1cbiAgfSxcbiAgc2hvdWxkV2FsazogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoTWF0aC5yYW5kb20oKSA8IDAuNSk7XG4gIH1cbn07XG5cbmNvbnN0IEFuaW1hbCA9ICgpID0+IGFuaW1hbDtcblxuZXhwb3J0IGRlZmF1bHQgQW5pbWFsO1xuXG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuXG5jbGFzcyBSZXN0Sm9iIGV4dGVuZHMgSm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCB0aW1lKSB7XG4gICAgc3VwZXIoZW50aXR5KTtcbiAgICB0aGlzLnRpbWUgPSB0aW1lO1xuICAgIHRoaXMuZG9uZVRpbWUgPSAwO1xuICB9XG5cbiAgLy8gbWF5YmUgaW1wbGVtZW50IHVzaW5nIHNldFRpbWVvdXQgP1xuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdGhpcy5kb25lVGltZSArPSBkZWx0YTtcbiAgICBpZiAodGhpcy5kb25lVGltZSA+IHRoaXMudGltZSkge1xuICAgICAgdGhpcy5zZXRSZWFkeSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZG9uZVRpbWUgLSB0aGlzLnRpbWU7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXN0Sm9iO1xuXG4iLCJpbXBvcnQgUmVzdEpvYiBmcm9tIFwiLi4vbGwvcmVzdFwiO1xuXG5sZXQgam9iID0ge1xuICBqb2JzOiBudWxsLFxuICBwdXNoSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgaWYgKCF0aGlzLmpvYnMpXG4gICAgICB0aGlzLmpvYnMgPSBbXTtcbiAgICBpZiAodGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXSAmJiB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdLnJlYWR5KSB7XG4gICAgICB0aHJvdyBcIkpvYiBpcyByZWFkeSAtIGRvbnQnIHB1c2ghXCI7XG4gICAgfVxuICAgIHRoaXMuam9icy5wdXNoKGpvYik7XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gICAgaWYgKHRoaXMuY3VycmVudEpvYi5pbml0KVxuICAgICAgdGhpcy5jdXJyZW50Sm9iLmluaXQoKTtcbiAgfSxcbiAgcmVzZXROb25IbEpvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5qb2JzID0gXy5maWx0ZXIodGhpcy5qb2JzLCBmdW5jdGlvbiAoam9iKSB7XG4gICAgICAgIHJldHVybiBqb2IuYXNzaWduTWVKb2I7XG4gICAgICB9KTtcbiAgfSxcbiAgcmVzZXRKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5qb2JzID0gW107XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gIH0sXG4gIHVwZGF0ZUN1cnJlbnRKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5jdXJyZW50Sm9iID0gdGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXTtcbiAgfSxcbiAgdGljazogZnVuY3Rpb24gKGRlbHRhKSB7XG4gICAgd2hpbGUgKHRoaXMuam9icyAmJiBkZWx0YSA+IDAgJiYgdGhpcy5qb2JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBqb2IgPSB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdO1xuICAgICAgZGVsdGEgPSBqb2Iub25GcmFtZShkZWx0YSk7XG4gICAgICBpZiAoam9iLnJlYWR5KSB7XG4gICAgICAgIGlmIChqb2IuYXNzaWduTWVKb2IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkpPQiBSRUFEWSEhIVwiLCB0aGlzLmpvYnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuam9icy5wb3AoKTtcbiAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWx0YSA+IDApIHtcbiAgICAgIGlmICh0aGlzLm9uTm9Kb2IpIHtcbiAgICAgICAgdGhpcy5vbk5vSm9iKGRlbHRhKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHBsYXlBbmltYXRpb246IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgLy9GSVhNRTogc2V0IGJhY2sgdG8gMjAgKD8pXG4gICAgdGhpcy5wdXNoSm9iKG5ldyBSZXN0Sm9iKHRoaXMsIDIpKTtcbiAgICB0aGlzLnNldE1lc2gobmFtZSk7XG4gIH0sXG4gIGFuaW1hdGlvbkZpbmlzaGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5yZXNldEpvYnMoKTtcbiAgfVxufTtcblxuY29uc3QgSm9iID0gKCkgPT4gam9iO1xuXG5leHBvcnQge0pvYn1cblxuXG4iLCJsZXQgZm9sbG93ZXIgPSB7XG4gIGNoZWNrQm9zczogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5ib3NzKSB7XG4gICAgICB0aGlzLl9hc3NpZ25Cb3NzKHRoaXMuX2ZpbmRTb21lQm9zcyh7XG4gICAgICAgIG1peGluTmFtZXM6IFwiaG91c2VcIlxuICAgICAgfSkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mICh0aGlzLmJvc3MpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLl9hc3NpZ25Cb3NzKHRoaXMuX2ZpbmRTb21lQm9zcyh7XG4gICAgICAgIG5hbWU6IHRoaXMuYm9zc1xuICAgICAgfSkpO1xuICAgIH1cbiAgfSxcbiAgb25Ob0pvYjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2hlY2tCb3NzKCk7XG4gICAgaWYgKHRoaXMuYm9zcyAmJiB0aGlzLmJvc3MuYXNzaWduTWVKb2IpXG4gICAgICB0aGlzLmJvc3MuYXNzaWduTWVKb2IodGhpcyk7XG4gIH0sXG4gIF9maW5kU29tZUJvc3Moc3BlY3MpIHtcbiAgICBpZiAodGhpcy53b3JsZC5zZWFyY2gpIHtcbiAgICAgIHZhciBmID0gdGhpcy53b3JsZC5zZWFyY2goc3BlY3MsIHRoaXMucG9zKTtcbiAgICAgIGlmIChmLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGZbMF07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBfYXNzaWduQm9zcyhib3NzKSB7XG4gICAgdGhpcy5ib3NzID0gYm9zcztcbiAgICBpZiAoYm9zcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmJvc3MuYWRkRm9sbG93ZXIodGhpcyk7XG4gICAgfVxuICB9XG59O1xuXG5cbmxldCBGb2xsb3dlciA9ICgpID0+IGZvbGxvd2VyO1xuZXhwb3J0IHtGb2xsb3dlcn1cbiIsImNsYXNzIEhMSm9iIHtcbiAgY29tbW9uU3RhcnQoKSB7XG4gICAgaWYgKCF0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gICAgICB0aGlzLmVudGl0eS5mb2xsb3dlcnMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgdGhpcy5hc3NpZ25NZUpvYihlKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hc3NpZ25NZUpvYih0aGlzLmVudGl0eSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgaWYgKCF0aGlzLnJlYWR5KVxuICAgICAgaWYgKCF0aGlzLmNvbW1vblN0YXJ0KCkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJPTkZSQU1FXCIsIHRoaXMucmVhZHkpO1xuICAgICAgICB0aGlzLmFzc2lnbk1lSm9iKHRoaXMuZW50aXR5KTtcbiAgICAgIH1cbiAgfVxufVxuXG5leHBvcnQge0hMSm9ifVxuIiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5jbGFzcyBCYXNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5mb3JtQ2FjaGUgPSB7fTtcbiAgICB0aGlzLmZvcm1TaXplID0gLTE7XG4gIH1cblxuICBzb3J0KGZvbGxvd2Vycykge1xuICAgIHJldHVybiBmb2xsb3dlcnM7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3NDYWNoZWQoYm9zcywgaSkge1xuICAgIGlmICh0aGlzLmZvcm1TaXplICE9IGJvc3MuZm9sbG93ZXJzLmxlbmd0aCkge1xuICAgICAgdGhpcy5mb3JtU2l6ZSA9IGJvc3MuZm9sbG93ZXJzLmxlbmd0aDtcbiAgICAgIHRoaXMuZm9ybUNhY2hlID0ge307XG4gICAgfVxuICAgIGlmICghdGhpcy5mb3JtQ2FjaGVbaV0pIHtcbiAgICAgIHRoaXMuZm9ybUNhY2hlW2ldID0gdGhpcy5jb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvcm1DYWNoZVtpXTtcbiAgfVxuXG4gIGNvbXB1dGVSZWxhdGl2ZVBvcyhib3NzLCBpKSB7XG4gICAgaWYgKGkgPiAxKSB7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgdmFyIHJvdyA9IE1hdGguZmxvb3IoaSAvIDUpO1xuICAgIHZhciBjb2wgPSBpICUgNTtcbiAgICB2YXIgZCA9IDAuODtcblxuICAgIHJldHVybiBuZXcgVmVjdG9yMihjb2wgKiBkIC0gZCAqIDIsIHJvdyAqIGQpO1xuICB9XG5cbiAgY29tcHV0ZVBvcyhib3NzLCBpLCBiYXNlUG9zKSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKCkuYWRkVmVjdG9ycyh0aGlzLmNvbXB1dGVSZWxhdGl2ZVBvc0NhY2hlZChib3NzLCBpKSwgYmFzZVBvcyk7XG4gIH1cblxuICBnZXRQb3MoYm9zcywgZm9sbG93ZXIsIGJhc2VQb3MpIHtcbiAgICBpZiAoIWJhc2VQb3MpIHtcbiAgICAgIGJhc2VQb3MgPSBib3NzLnBvcztcbiAgICB9XG5cbiAgICBpZiAoYm9zcyA9PSBmb2xsb3dlcikge1xuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKCkuY29weShiYXNlUG9zKTtcbiAgICB9XG5cbiAgICB2YXIgZm9sbG93ZXJzID0gdGhpcy5zb3J0KGJvc3MuZm9sbG93ZXJzKTtcblxuICAgIHZhciBpID0gXy5pbmRleE9mKGZvbGxvd2VycywgZm9sbG93ZXIpO1xuICAgIHJldHVybiB0aGlzLmNvbXB1dGVQb3MoYm9zcywgaSwgYmFzZVBvcyk7XG4gIH1cblxufVxuXG5leHBvcnQge0Jhc2V9XG4iLCJpbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QW5nbGV9IGZyb20gJy4uL2FuZ2xlJ1xuXG52YXIgbGluZXMgPSBbMTAsIDE0LCAyMCwgNDAsIDEwMF07XG5cbmNsYXNzIFJlc3QgZXh0ZW5kcyBCYXNlIHtcblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIHZhciByb3cgPSBudWxsLCBjaSA9IGk7XG4gICAgdmFyIG1heCA9IDAsIGNvdW50O1xuICAgIF8uZmluZChsaW5lcywgZnVuY3Rpb24gKGxpbmUsIGspIHtcbiAgICAgIGNpIC09IGxpbmU7XG4gICAgICBtYXggKz0gbGluZTtcbiAgICAgIGlmIChjaSA8IDApIHtcbiAgICAgICAgcm93ID0gaztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgLy8gY291bnQgb2Ygc2VnbWVudHMgZm9yIGN1cnJlbnQgY2lyY2xlXG4gICAgY291bnQgPSBsaW5lc1tyb3ddO1xuXG4gICAgLy8gaWYgY3VycmVudCBjaXJjbGUgaXMgdGhlIHdpZGVzdCwgdGhlbiBvbmx5IHNvIG1hbnkgc2VnbWVudHMgbGlrZSBtZW4gbGVmdFxuICAgIGlmIChib3NzLmZvbGxvd2Vycy5sZW5ndGggPCBtYXgpXG4gICAgICBjb3VudCAtPSAobWF4IC0gYm9zcy5mb2xsb3dlcnMubGVuZ3RoKTtcbiAgICB2YXIgYW5nbGUgPSAoaSAvIGNvdW50KSAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciByYWRpdXMgPSAocm93ICsgMSkgKiAxLjQ7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKE1hdGguc2luKGFuZ2xlKSAqIHJhZGl1cywgTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzKTtcbiAgfTtcblxuICBnZXREaXIoYm9zcywgZSkge1xuICAgIHZhciBuZXdQb3MgPSB0aGlzLmdldFBvcyhib3NzLCBlKTtcbiAgICByZXR1cm4gQW5nbGUuZnJvbVZlY3RvcjIobmV3IFZlY3RvcjIoKS5zdWJWZWN0b3JzKGJvc3MucG9zLCBuZXdQb3MpKTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7UmVzdH1cbiIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QmFzZX0gZnJvbSAnLi9iYXNlJ1xuXG5jbGFzcyBOdWxsIGV4dGVuZHMgQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMigwLCAwKTtcbiAgfVxuXG4gIGdldERpcihib3NzLCBlKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZXhwb3J0IHtOdWxsfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmNsYXNzIE1vdmUgZXh0ZW5kcyBCYXNlIHtcblxuICBjb25zdHJ1Y3RvcihhbmdsZSkge1xuICAgIHN1cGVyKGFuZ2xlKTtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIGlmIChpID49IDIpIHtcbiAgICAgIGkgKz0gMTtcbiAgICB9XG5cbiAgICB2YXIgcm93ID0gTWF0aC5mbG9vcihpIC8gNSk7XG4gICAgdmFyIGNvbCA9IGkgJSA1O1xuICAgIHZhciBibG9jayA9IE1hdGguZmxvb3IoaSAvIDI1KTtcblxuICAgIHZhciB4ID0gY29sIC0gMjtcbiAgICB2YXIgeSA9IHJvdyArIGJsb2NrO1xuXG4gICAgdmFyIGFuZ2xlID0gdGhpcy5hbmdsZTtcbiAgICB2YXIgZCA9IDAuODtcblxuICAgIHJldHVybiBuZXcgVmVjdG9yMihkICogTWF0aC5jb3MoYW5nbGUpICogeCAtIGQgKiBNYXRoLnNpbihhbmdsZSkgKiB5LFxuICAgICAgZCAqIE1hdGguc2luKGFuZ2xlKSAqIHggKyBkICogTWF0aC5jb3MoYW5nbGUpICogeSk7XG4gIH07XG5cbiAgZ2V0RGlyKGJvc3MsIGUpIHtcbiAgICByZXR1cm4gdGhpcy5hbmdsZTtcbiAgfVxufVxuXG5leHBvcnQge01vdmV9XG4iLCJpbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7UmVzdH0gZnJvbSAnLi9yZXN0J1xuaW1wb3J0IHtOdWxsfSBmcm9tICcuL251bGwnXG5pbXBvcnQge01vdmV9IGZyb20gJy4vbW92ZSdcblxuXG5jb25zdCBGb3JtYXRpb25zID0ge0Jhc2UsIE1vdmUsIE51bGwsIFJlc3R9O1xuZXhwb3J0IHtGb3JtYXRpb25zfVxuIiwiaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcblxuY2xhc3MgTUxSZXN0Sm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBsZW5ndGgsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgIHRoaXMuZG9uZSA9IGZhbHNlO1xuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiAmJiB0aGlzLmVudGl0eS5yb3RhdGlvbiAhPSB0aGlzLmRpcmVjdGlvbikge1xuICAgICAgdGhpcy5lbnRpdHkucm90YXRpb24gPSB0aGlzLmRpcmVjdGlvbjtcbiAgICAgIHRoaXMuZW50aXR5LnVwZGF0ZU1lc2hQb3MoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lbnRpdHkubWVzaE5hbWUgIT0gXCJzaXRcIiAmJiB0aGlzLmVudGl0eS5tZXNoTmFtZSAhPSBcInNpdGRvd25cIikge1xuICAgICAgdGhpcy5lbnRpdHkucGxheUFuaW1hdGlvbihcInNpdGRvd25cIik7XG4gICAgfSBlbHNlIGlmICghdGhpcy5kb25lKSB7XG4gICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwic2l0XCIpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLmVudGl0eSwgdGhpcy5sZW5ndGgpKTtcbiAgICAgIHRoaXMuZG9uZSA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBkZWx0YTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7TUxSZXN0Sm9ifTtcbiIsImltcG9ydCB7SExKb2J9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7IEZvcm1hdGlvbnN9IGZyb20gXCIuLi9mb3JtYXRpb25zXCI7XG5pbXBvcnQge01MUmVzdEpvYn0gZnJvbSBcIi4uL21sL3Jlc3RcIjtcblxuY2xhc3MgSExSZXN0Sm9iIGV4dGVuZHMgSExKb2Ige1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIGxlbmd0aCwgZm9ybWF0dGVkKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICBpZiAoZm9ybWF0dGVkKSB7XG4gICAgICB0aGlzLmZvcm1hdGlvbiA9IG5ldyBGb3JtYXRpb25zLlJlc3QoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mb3JtYXRpb24gPSBuZXcgRm9ybWF0aW9ucy5OdWxsKCk7XG4gICAgfVxuICB9XG5cbiAgYXNzaWduTWVKb2IoZSkge1xuICAgIGlmICghdGhpcy5jb21tb25TdGFydCgpKSB7XG4gICAgICBlLnJlc2V0Tm9uSGxKb2JzKCk7XG4gICAgICB2YXIgbmV3UG9zID0gdGhpcy5mb3JtYXRpb24uZ2V0UG9zKHRoaXMuZW50aXR5LCBlKTtcbiAgICAgIGlmIChlLnBvcy5kaXN0YW5jZVRvKG5ld1BvcykgPiAwLjEpIHtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBNbE1vdmVKb2IoZSwgbmV3UG9zKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZGlyID0gdGhpcy5mb3JtYXRpb24uZ2V0RGlyKHRoaXMuZW50aXR5LCBlKTtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBNTFJlc3RKb2IoZSwgNSwgZGlyKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB7SExSZXN0Sm9ifVxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9obC9yZXN0XCI7XG5cbmxldCBib3NzID0ge1xuICAvLyBpbml0aWFsaXplclxuICBwb3N0TG9hZDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb2xsb3dlcnMpIHtcbiAgICAgIC8vIGVhY2ggZW50aXR5IHNob3VsZCBoYXZlIGl0J3MgYXJyYXlcbiAgICAgIHRoaXMuZm9sbG93ZXJzID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZJWE1FOiByZXRyaWV2ZSBvYmplY3RzIGZyb20gaWRzXG4gICAgfVxuICB9LFxuICBmb2xsb3dlcnM6IG51bGwsXG4gIC8vIGRlcHJlY2F0ZWRcbiAgcHVzaEhsSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgdGhpcy5wdXNoSm9iKGpvYik7XG4gIH0sXG4gIC8vIGRlcHJlY2F0ZWRcbiAgY2xlYXJIbEpvYjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzZXRKb2JzKCk7XG4gIH0sXG4gIG9uTm9Kb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm9zcyA9IHRoaXM7XG4gICAgaWYgKHRoaXMuYm9zcylcbiAgICAgIGJvc3MgPSB0aGlzLmJvc3M7XG4gICAgaWYgKGJvc3MgJiYgYm9zcy5hc3NpZ25NZUpvYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgYm9zcy5hc3NpZ25NZUpvYih0aGlzKTtcbiAgfSxcbiAgZ2V0SGxKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgLy8gdGFrZSBsYXN0IGpvYiB3aGljaCBwcm92aWRlcyB0aGUgYXNzaWduTWVKb2IgZnVuY3Rpb25cbiAgICAgIGZvciAodmFyIGkgPSB0aGlzLmpvYnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHRoaXMuam9ic1tpXS5hc3NpZ25NZUpvYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICAgIHJldHVybiB0aGlzLmpvYnNbaV07XG4gICAgICB9XG4gIH0sXG4gIGFzc2lnbk1lSm9iOiBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBobGpvYiA9IHRoaXMuZ2V0SGxKb2IoKTtcblxuICAgIGlmICghaGxqb2IpIHtcbiAgICAgIGlmICh0aGlzLmFpKSB7XG4gICAgICAgIHRoaXMuYWkoKTtcbiAgICAgIH1cbiAgICAgIC8vIHRyeSBhZ2FpblxuICAgICAgaGxqb2IgPSB0aGlzLmdldEhsSm9iKCk7XG4gICAgICBpZiAoIWhsam9iKSB7XG4gICAgICAgIHRoaXMucHVzaEhsSm9iKG5ldyBITFJlc3RKb2IodGhpcywgMTAsIHRoaXMuaXNBKFwiaGVyb1wiKSkpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKFwiYm9zcyAtIE5vIGhsam9iIGNyZWF0ZWQsIHJlc3RpbmcgZm9yIDEwIHNlY29uZHNcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhsam9iKSB7XG4gICAgICBobGpvYi5hc3NpZ25NZUpvYihlKTtcbiAgICB9XG4gIH0sXG4gIGFkZEZvbGxvd2VyOiBmdW5jdGlvbiAoZm9sbG93ZXIpIHtcbiAgICB0aGlzLmZvbGxvd2Vycy5wdXNoKGZvbGxvd2VyKTtcbiAgfSxcbiAgZGlzbWlzczogZnVuY3Rpb24gKGZvbGxvd2VyKSB7XG4gICAgdGhpcy5mb2xsb3dlcnMgPSB0aGlzLmZvbGxvd2Vycy5maWx0ZXIoKGN1cnJlbnQpID0+IGN1cnJlbnQgIT09IGZvbGxvd2VyKTtcbiAgICBkZWxldGUgZm9sbG93ZXIuYm9zcztcbiAgICBmb2xsb3dlci5yZXNldEpvYnMoKTtcbiAgfVxufTtcblxuY29uc3QgQm9zcyA9ICgpID0+IGJvc3M7XG5cbmV4cG9ydCB7Qm9zc31cbiIsImNsYXNzIEhsSW52ZW50Sm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5KSB7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5wcm9kdWNhYmxlID0gdGhpcy5hcHBseWFibGU7XG4gIH1cblxuICBzdGF0aWMgYXBwbHlhYmxlKGUsIG5lZWRlZCkge1xuICAgIHZhciBwcm9kdWNhYmxlID0gXy5maWx0ZXIobmVlZGVkLCBmdW5jdGlvbiAocmVzb3VyY2UpIHtcbiAgICAgIGlmIChlLnByb2R1Y3Rpb24pIHtcbiAgICAgICAgdmFyIG9rID0gdHJ1ZTtcbiAgICAgICAgdmFyIHByZXJlcSA9IGUucHJvZHVjdGlvbltyZXNvdXJjZV07XG4gICAgICAgIGNvbnNvbGUuZGVidWcoXCJpbnZlbnQgLSBydWxlXCIsIHByZXJlcSwgZS5yZXNvdXJjZXMpO1xuICAgICAgICBpZiAoIXByZXJlcSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIF8uZWFjaChwcmVyZXEsIGZ1bmN0aW9uIChhbW91bnQsIHJlcykge1xuXG4gICAgICAgICAgaWYgKCFlLnJlc291cmNlc1tyZXNdIHx8IGUucmVzb3VyY2VzW3Jlc10gPCBhbW91bnQpIHtcbiAgICAgICAgICAgIG9rID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG9rKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbnNvbGUuZGVidWcoXCJpbnZlbnQgLSBQUk9EVUNBQkxFXCIsIHByb2R1Y2FibGUpO1xuICAgIGlmIChwcm9kdWNhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBfLnNhbXBsZShwcm9kdWNhYmxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXNzaWduTWVKb2IoZSkge1xuICAgIHZhciByZXMgPSBwcm9kdWNhYmxlKHRoaXMuZW50aXR5LCB0aGlzLmVudGl0eS5yZXNvdXJjZXNOZWVkZWQoKSk7XG4gICAgY29uc29sZS5kZWJ1ZyhcImludmVudCAtIFBST0RTXCIsIHJlcyk7XG4gICAgaWYgKHJlcylcbiAgICAgIGUucHVzaEpvYihuZXcgSW52ZW50KGUsIHJlcywgdGhpcy5lbnRpdHkpKTtcbiAgICBlbHNlXG4gICAgICB0aGlzLmVudGl0eS5jbGVhckhsSm9iKCk7XG4gIH1cbn1cblxuZXhwb3J0IHsgSGxJbnZlbnRKb2IgfVxuIiwiaW1wb3J0IHtITEpvYn0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcbmltcG9ydCB7TUxSZXN0Sm9ifSBmcm9tIFwiLi4vbWwvcmVzdFwiO1xuXG5jbGFzcyBIbEZldGNoSm9iIGV4dGVuZHMgSExKb2Ige1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIGNvdW50KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmNvdW50ID0gY291bnQgfHwgMztcbiAgfTtcblxuICBzZWxlY3RSZXNvdXJjZVRvR2V0KCkge1xuICAgIHZhciBuZWVkZWQgPSBfLnNodWZmbGUodGhpcy5lbnRpdHkucmVzb3VyY2VzTmVlZGVkKCkpO1xuICAgIHJldHVybiBuZWVkZWRbMF07XG4gIH1cblxuICBuZXh0RW50aXR5Rm9yUmVzb3VyY2Uoc2VsZWN0ZWRSZXNvdXJjZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5lbnRpdHkud29ybGQuc2VhcmNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiZmV0Y2ggLSBIQVMgUkVTT1VSQ0VcIiwgc2VsZWN0ZWRSZXNvdXJjZSwgZSwgZS5yZXNvdXJjZXMgJiYgZS5yZXNvdXJjZXNbc2VsZWN0ZWRSZXNvdXJjZV0gPiAwLCBlLnByb3ZpZGVzLCBlLnJlc291cmNlcyk7XG4gICAgICByZXR1cm4gZS5yZXNvdXJjZXMgJiYgZS5yZXNvdXJjZXNbc2VsZWN0ZWRSZXNvdXJjZV0gPiAwICYmIGUgIT0gc2VsZi5lbnRpdHkgJiYgZS5wcm92aWRlcyAmJiBfLmNvbnRhaW5zKGUucHJvdmlkZXMsIHNlbGVjdGVkUmVzb3VyY2UpO1xuICAgIH0sIHRoaXMuZW50aXR5LnBvcylbMF07XG4gIH07XG5cbiAgYXNzaWduTWVKb2IoZSkge1xuICAgIGlmICghZS5pc0EoXCJmb2xsb3dlclwiKSkge1xuICAgICAgZS5wdXNoSm9iKG5ldyBSZXN0Sm9iKGUsIDEwKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCAtPSAxO1xuICAgIGNvbnNvbGUuZGVidWcoXCJmZXRjaCAtIEFTU0lHTiBGRVRDSCBNTEpPQlwiLCBlKTtcbiAgICB2YXIgc2VsZWN0ZWRSZXNvdXJjZSA9IHRoaXMuc2VsZWN0UmVzb3VyY2VUb0dldCgpO1xuICAgIGlmIChzZWxlY3RlZFJlc291cmNlKSB7XG4gICAgICB2YXIgbmV4dEVudGl0eSA9IHRoaXMubmV4dEVudGl0eUZvclJlc291cmNlKHNlbGVjdGVkUmVzb3VyY2UpO1xuICAgICAgaWYgKG5leHRFbnRpdHkpIHtcbiAgICAgICAgZS5wdXNoSm9iKG5ldyBtbC5GZXRjaChlLCBzZWxlY3RlZFJlc291cmNlLCBuZXh0RW50aXR5LCB0aGlzLmVudGl0eSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmRlYnVnKFwiZmV0Y2ggLSBOTyBuZXh0ZW50aXR5IGZvdW5kXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBlLnB1c2hKb2IobmV3IE1MUmVzdEpvYihlLCAxLCAwKSk7XG4gICAgaWYgKHRoaXMuY291bnQgPD0gMCkge1xuICAgICAgdGhpcy5lbnRpdHkuY2xlYXJIbEpvYigpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IHtIbEZldGNoSm9ifVxuIiwiaW1wb3J0IHsgSGxJbnZlbnRKb2J9IGZyb20gJy4uL2hsL2ludmVudCc7XG5pbXBvcnQgeyBIbEZldGNoSm9ifSBmcm9tICcuLi9obC9mZXRjaCc7XG5cbmxldCBob3VzZSA9IHtcbiAgLy8gRklYTUU6IG1heWJlIG1vdmUgdGhpcyB0byBvdGhlciBtaXhpbi9jbGFzcyAtIG1heSBiZSB1c2VkIGJ5IGhlcm8gdG9vXG4gIHJlc291cmNlc05lZWRlZDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5uZWVkZWQpXG4gICAgICByZXR1cm4gW107XG4gICAgdmFyIGN1cnJlbnRseU5lZWRlZCA9IFtdO1xuICAgIGNvbnNvbGUubG9nKFwiTkVEREVEXCIsdGhpcy5uZWVkZWQpXG4gICAgZm9yKHZhciBrIGluIHRoaXMubmVlZGVkKSB7XG4gICAgICB2YXIgdiA9IHRoaXMubmVlZGVkW2tdO1xuICAgICAgdmFyIHRpbWVzID0gdiAtICh0aGlzLnJlc291cmNlc1trXSB8fCAwKTtcbiAgICAgIGlmICh0aW1lcyA+IDApIHtcbiAgICAgICAgZm9yKHZhciBpPTA7aTx0aW1lcztpKyspIHtcbiAgICAgICAgICBjdXJyZW50bHlOZWVkZWQucHVzaChrKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3VycmVudGx5TmVlZGVkO1xuICB9LFxuXG4gIGFpOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5lZWRlZCA9IHRoaXMucmVzb3VyY2VzTmVlZGVkKCk7XG5cbiAgICBpZiAobmVlZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChIbEludmVudEpvYi5hcHBseWFibGUodGhpcywgbmVlZGVkKSkge1xuICAgICAgICB0aGlzLnB1c2hIbEpvYihuZXcgSGxJbnZlbnRKb2IodGhpcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoSGxKb2IobmV3IEhsRmV0Y2hKb2IodGhpcykpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgYWRkRm9sbG93ZXI6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzLnB1c2goZm9sbG93ZXIpO1xuICB9XG59O1xuXG5sZXQgSG91c2UgPSAoKSA9PiBob3VzZTtcbmV4cG9ydCB7SG91c2V9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgfSxcbiAgXCJjcm9wXCI6IHtcbiAgICBcIm1lc2hOYW1lXCI6IFwidGlueVwiLFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiaGlnaFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfaGlnaFwiXG4gICAgICB9LFxuICAgICAgXCJtZWRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJjcm9wX21lZFwiXG4gICAgICB9LFxuICAgICAgXCJzbWFsbFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3Bfc21hbGxcIlxuICAgICAgfSxcbiAgICAgIFwidGlueVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfdGlueVwiXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1pbGxcIjoge1xuICB9LFxuICBcIm1pbmVcIjoge1xuICB9LFxuICBcImZhcm1cIjoge1xuICB9LFxuICBcImdyYXZlXCI6IHtcbiAgfSxcbiAgXCJ3ZWxsXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwid2F0ZXJcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3YXRlclwiOiAxMDBcbiAgICB9XG4gIH0sXG4gIFwiZmlzaGluZ19odXRcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIlxuICAgIF1cbiAgfSxcbiAgXCJ3b3Jrc2hvcFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMSxcbiAgICAgIFwidG9vbFwiOiAxMFxuICAgIH0sXG4gICAgXCJwcm9kdWN0aW9uXCI6IHtcbiAgICAgIFwidG9vbFwiOiB7XG4gICAgICAgIFwid29vZFwiOiAxLFxuICAgICAgICBcInN0b25lXCI6IDFcbiAgICAgIH1cbiAgICB9LFxuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIixcbiAgICAgIFwic21va2VcIlxuICAgIF1cbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJuZWVkZWRcIjoge1xuICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICBcInN0b25lXCI6IDEsXG4gICAgICBcIndhdGVyXCI6IDEsXG4gICAgICBcImZvb2RcIjogMVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcImhlcm9cIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJoZXJvXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJwbGF5ZXJcIixcbiAgICBdXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiYm9zc1wiLFxuICAgICAgXCJqb2JcIixcbiAgICAgIFwiaG91c2VcIlxuICAgIF1cbiAgfSxcbiAgXCJtYW5cIjoge1xuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdFwiXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInNpdGRvd25cIlxuICAgICAgfSxcbiAgICAgIFwic3RhbmRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic3RhbmRcIlxuICAgICAgfSxcbiAgICAgIFwiZmlnaHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZmlnaHRcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJmaWdodFwiXG4gICAgICB9LFxuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX3BpY2tcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJwaWNrXCJcbiAgICAgIH0sXG4gICAgICBcImF4ZVwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9heGVcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJheGVcIlxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiZm9sbG93ZXJcIlxuICAgIF1cbiAgfSxcbiAgXCJmaXJcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3b29kXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwid29vZFwiOiA1XG4gICAgfVxuICB9LFxuICBcInRyZWVcIjoge1xuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcInN0b25lXCJcbiAgICBdLFxuICAgIFwicmVzb3VyY2VzXCI6IHtcbiAgICAgIFwic3RvbmVcIjogMjBcbiAgICB9XG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImFuaW1hbFwiXG4gICAgXSxcbiAgICBcInNwZWVkXCI6IDAuNSxcbiAgICBcIm1lc2hlc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJlYXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImVhdFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJ3YWxrXCJcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IEVudGl0eSB9IGZyb20gJy4vZW50aXR5J1xuaW1wb3J0IE1vZGVsTG9hZGVyIGZyb20gJy4uL2Jhc2UzZC9tb2RlbF9sb2FkZXInXG5pbXBvcnQgKiBhcyBNaXhpbiBmcm9tIFwiLi9taXhpblwiXG5pbXBvcnQgRW50aXR5VHlwZXMgZnJvbSAnLi4vY29uZmlnL2VudGl0aWVzJ1xuXG5cbmNsYXNzIFdvcmxkTG9hZGVyIHtcbiAgbG9hZCh3b3JsZCwgZGF0YSwgb3BzKSB7XG4gICAgbGV0IGJhc2ljT3BzID0gT2JqZWN0LmFzc2lnbih7fSwgb3BzKTtcblxuICAgIGlmICghYmFzaWNPcHMubW9kZWxMb2FkZXIpIHtcbiAgICAgIGJhc2ljT3BzLm1vZGVsTG9hZGVyID0gbmV3IE1vZGVsTG9hZGVyKCk7XG4gICAgfVxuICAgIGlmICghYmFzaWNPcHMubWl4aW5EZWZzKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk1JWElOIERFRlNcIiwgTWl4aW4pXG4gICAgICBiYXNpY09wcy5taXhpbkRlZnMgPSBNaXhpbjtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5lbnRpdHlUeXBlcykge1xuICAgICAgYmFzaWNPcHMuZW50aXR5VHlwZXMgPSBFbnRpdHlUeXBlcztcbiAgICB9XG5cbiAgICBkYXRhLmZvckVhY2goZW50aXR5RGVmaW5pdGlvbiA9PlxuICAgICAgd29ybGQucHVzaChuZXcgRW50aXR5KHdvcmxkLm1hcCwgT2JqZWN0LmFzc2lnbih7fSwgYmFzaWNPcHMsIGVudGl0eURlZmluaXRpb24pKSlcbiAgICApO1xuICAgIHdvcmxkLmVudGl0aWVzLmZvckVhY2goZW50aXR5ID0+IGVudGl0eS5wb3N0TG9hZCAmJiBlbnRpdHkucG9zdExvYWQoKSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZExvYWRlclxuIiwiaW1wb3J0IFdvcmxkIGZyb20gXCIuLi9nYW1lL3dvcmxkXCI7XG5pbXBvcnQgSGVpZ2h0TWFwIGZyb20gXCIuLi9nYW1lL2hlaWdodG1hcFwiO1xuaW1wb3J0IGFqYXggZnJvbSBcIi4uL2FqYXhcIlxuaW1wb3J0IFdvcmxkTG9hZGVyIGZyb20gXCIuLi9nYW1lL3dvcmxkLWxvYWRlclwiXG5cbmNsYXNzIFdvcmxkRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gICAgY29uc3RydWN0b3Iod29ybGQpIHtcbiAgICAgICAgc3VwZXIoXCJ3b3JsZFwiKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IHdvcmxkXG4gICAgfVxufVxuXG5jbGFzcyBBZ1dvcmxkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLm1hcCA9IG5ldyBIZWlnaHRNYXAoKTtcbiAgICAgICAgdGhpcy53b3JsZCA9IG5ldyBXb3JsZCh0aGlzLm1hcCk7XG5cbiAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKFwibG9hZFwiKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkV29ybGQodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKS50aGVuKHRoaXMuaW5mb3JtLmJpbmQodGhpcykpXG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudFt0aGlzLmV4cG9zZU5hbWVdID0gdGhpcy53b3JsZDtcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgZGVsZXRlIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV1cbiAgICB9XG5cbiAgICBpbmZvcm0oKSB7XG4gICAgICAgIHRoaXMucXVlcnlTZWxlY3RvckFsbChcIipbaW5qZWN0LXdvcmxkXVwiKS5mb3JFYWNoKGUgPT5cbiAgICAgICAgICAgIGUuZGlzcGF0Y2hFdmVudChuZXcgV29ybGRFdmVudCh0aGlzLndvcmxkKSkpXG4gICAgfVxuXG4gICAgbG9hZFdvcmxkKHVybCkge1xuICAgICAgICByZXR1cm4gYWpheCh1cmwpLnRoZW4oZGF0YSA9PlxuICAgICAgICAgICAgbmV3IFdvcmxkTG9hZGVyKCkubG9hZCh0aGlzLndvcmxkLCBkYXRhKVxuICAgICAgICApXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctd29ybGQnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctd29ybGQnLCBBZ1dvcmxkKTtcbn1cblxuIiwiaW1wb3J0IHtITFJlc3RKb2J9IGZyb20gXCIuLi9nYW1lL2hsL3Jlc3RcIjtcblxuY2xhc3MgQWdFbnRpdHlWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5pbm5lckhUTUw7XG4gICAgdGhpcy5jaGFuZ2VkKG51bGwpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBpZiAodGhpcy5saXN0ZW5lcikge1xuICAgICAgdGhpcy5saXN0ZW5lci5yZW1vdmUoKVxuICAgIH1cbiAgfVxuXG4gIHdvcmxkQ3JlYXRlZChldikge1xuICAgIHRoaXMud29ybGQgPSBldi53b3JsZDtcbiAgICBjb25zdCBldmVudG5hbWUgPSB0aGlzLmdldEF0dHJpYnV0ZShcImV2ZW50XCIpID09PSBcImhvdmVyZWRcIiA/IFwiaG92ZXJlZFwiIDogXCJzZWxlY3RlZFwiO1xuICAgIHRoaXMuZXZlbnRuYW1lID0gZXZlbnRuYW1lO1xuICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLndvcmxkW2V2ZW50bmFtZV0uc3Vic2NyaWJlKHRoaXMuY2hhbmdlZC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgY2hhbmdlZChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5lbnRpdHkgIT09IGVudGl0eSkge1xuICAgICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICBpZiAodGhpcy5lbnRpdHkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoKVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5lbnRpdHkpIHtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9IFwiXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIH1cbiAgfVxuXG4gIHJlZHJhdygpIHtcbiAgICB0aGlzLmlubmVySFRNTCA9IG11c3RhY2hlLnJlbmRlcih0aGlzLnRlbXBsYXRlLCB0aGlzLmVudGl0eSk7XG4gICAgY29uc3QgYnV0dG9uUmVzdCA9IHRoaXMuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImJ1dHRvbi1yZXN0XCIpWzBdO1xuICAgIGlmIChidXR0b25SZXN0KSB7XG4gICAgICBidXR0b25SZXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLnJlc3QuYmluZCh0aGlzKSlcbiAgICB9XG4gIH1cblxuICByZXN0KCkge1xuICAgIHRoaXMuZW50aXR5LnJlc2V0Sm9icygpO1xuICAgIHRoaXMuZW50aXR5LnB1c2hKb2IobmV3IEhMUmVzdEpvYih0aGlzLmVudGl0eSwgMCwgZmFsc2UpKTtcbiAgICBjb25zb2xlLmxvZyhcIlJFU1RcIilcbiAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctZW50aXR5LXZpZXcnKSkge1xuICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWVudGl0eS12aWV3JywgQWdFbnRpdHlWaWV3KTtcbn1cblxuIiwiY2xhc3MgQWdGdWxsc2NyZWVuIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuZW5hYmxlRnVsbHNjcmVlbi5iaW5kKHRoaXMpKVxuICB9XG5cbiAgZW5hYmxlRnVsbHNjcmVlbigpIHtcbiAgICBsZXQgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJib2R5XCIpO1xuICAgIGlmKGVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYoZWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZihlbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBlbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmKGVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfVxuICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1mdWxsc2NyZWVuJykpIHtcbiAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1mdWxsc2NyZWVuJywgQWdGdWxsc2NyZWVuKTtcbn1cbiJdLCJuYW1lcyI6WyJjbG9jayIsIkpvYiIsIk1vdmUiXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sS0FBSyxTQUFTLFdBQVcsQ0FBQztBQUNoQyxJQUFJLGlCQUFpQixHQUFHO0FBQ3hCLFFBQVEsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNq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

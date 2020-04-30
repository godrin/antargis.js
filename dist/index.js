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
    if (!meshType)
      meshType = "walk";
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC90ZXh0dXJlX2xvYWRlci5qcyIsInNyYy9saWJzL3RlcnJhaW5fYnVpbGRlci5qcyIsInNyYy9iYXNlM2QvcGljay5qcyIsInNyYy9iYXNlM2Qvc2t5Ym94LmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvYmFzZTNkL2Jhc2UuanMiLCJzcmMvYmFzZTNkL3ZpZXcuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvbGwvam9iLmpzIiwic3JjL2dhbWUvdmVjdG9yMi5qcyIsInNyYy9nYW1lL2FuZ2xlLmpzIiwic3JjL2dhbWUvbGwvbW92ZS5qcyIsInNyYy9nYW1lL21sL21vdmUuanMiLCJzcmMvZ2FtZS93b3JsZC5qcyIsInNyYy9nYW1lL2hlaWdodG1hcC5qcyIsInNyYy9hamF4LmpzIiwic3JjL2dhbWUvZW50aXR5LmpzIiwic3JjL2NvbmZpZy9tZXNoZXMuanMiLCJzcmMvYmFzZTNkL21vZGVsLmpzIiwic3JjL2Jhc2UzZC9tb2RlbF9sb2FkZXIuanMiLCJzcmMvZ2FtZS9taXhpbnMvYW5pbWFsLmpzIiwic3JjL2dhbWUvbGwvcmVzdC5qcyIsInNyYy9nYW1lL21peGlucy9qb2IuanMiLCJzcmMvZ2FtZS9taXhpbnMvZm9sbG93ZXIuanMiLCJzcmMvZ2FtZS9obC9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9iYXNlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9yZXN0LmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9udWxsLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9tb3ZlLmpzIiwic3JjL2dhbWUvZm9ybWF0aW9ucy9pbmRleC5qcyIsInNyYy9nYW1lL21sL3Jlc3QuanMiLCJzcmMvZ2FtZS9obC9yZXN0LmpzIiwic3JjL2dhbWUvbWl4aW5zL2Jvc3MuanMiLCJzcmMvY29uZmlnL2VudGl0aWVzLmpzIiwic3JjL2dhbWUvd29ybGQtbG9hZGVyLmpzIiwic3JjL2VsZW1lbnRzL2FnLXdvcmxkLmpzIiwic3JjL2VsZW1lbnRzL2FnLWVudGl0eS12aWV3LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNsYXNzIEludHJvIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRfc2NyZWVuID0gLTE7XG4gICAgICAgIHRoaXMuc2NyZWVucyA9IHRoaXMucXVlcnlTZWxlY3RvckFsbChcImludHJvLXNjcmVlblwiKTtcbiAgICAgICAgdGhpcy5uZXh0U2NyZWVuSGFuZGxlciA9IHRoaXMubmV4dFNjcmVlbi5iaW5kKHRoaXMpXG4gICAgICAgIHRoaXMubmV4dFNjcmVlbigpXG4gICAgfVxuXG4gICAgaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy51bmJpbmRFdmVudCh0aGlzLnNjcmVlbnNbdGhpcy5jdXJyZW50X3NjcmVlbl0pXG4gICAgfVxuXG4gICAgYmluZEV2ZW50KHNjcmVlbikge1xuICAgICAgICBpZihzY3JlZW4pIHtcbiAgICAgICAgICAgIHNjcmVlbi5hZGRFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKTtcbiAgICAgICAgICAgIHNjcmVlbi5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdW5iaW5kRXZlbnQoc2NyZWVuKSB7XG4gICAgICAgIGlmKHNjcmVlbikge1xuICAgICAgICAgICAgc2NyZWVuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpO1xuICAgICAgICAgICAgc2NyZWVuLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZXh0U2NyZWVuKGV2KSB7XG4gICAgICAgIHRoaXMudW5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgICAgICBpZih0aGlzLmN1cnJlbnRfc2NyZWVuID09IHRoaXMuc2NyZWVucy5sZW5ndGgtMSkge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnZmluaXNoZWQnKSlcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXZhbCh0aGlzLmdldEF0dHJpYnV0ZSgnb25maW5pc2hlZCcpKVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvclwiLGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VycmVudF9zY3JlZW4gPSAodGhpcy5jdXJyZW50X3NjcmVlbiArIDEpICUgdGhpcy5zY3JlZW5zLmxlbmd0aDtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgICAgICB0aGlzLnNldFZpc2liaWxpdHkoKVxuICAgIH1cblxuICAgIHNldFZpc2liaWxpdHkoKSB7XG4gICAgICAgIHRoaXMuc2NyZWVucy5mb3JFYWNoKChzY3JlZW4sIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9zY3JlZW4gPT0gaWR4KSB7XG4gICAgICAgICAgICAgICAgc2NyZWVuLmNsYXNzTGlzdC5hZGQoXCJhY3RpdmVcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NyZWVuLmNsYXNzTGlzdC5yZW1vdmUoXCJhY3RpdmVcIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1pbnRybycpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1pbnRybycsIEludHJvKTtcbn1cbiIsImNsYXNzIENyZWRpdHMgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG5cbiAgICAgICAgdGhpcy5oYW5kbGVyID0gdGhpcy5maW5pc2hlZC5iaW5kKHRoaXMpXG5cbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCIuY3JlZGl0c1wiKVxuICAgICAgICBjb25zb2xlLmxvZyhcIkJJTkQuLi5cIilcblxuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3dlYmtpdEFuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbkl0ZXJhdGlvbicsIHRoaXMuaGFuZGxlcilcbiAgICB9XG5cblxuICAgIGZpbmlzaGVkKGV2KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRklOSVNIRURcIilcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGV2YWwodGhpcy5nZXRBdHRyaWJ1dGUoJ29uZmluaXNoZWQnKSlcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvclwiLCBlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWNyZWRpdHMnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctY3JlZGl0cycsIENyZWRpdHMpO1xufVxuIiwiY2xhc3MgVGV4dHVyZUxvYWRlciB7XG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xuICAgICAgICBpZiAoIVRleHR1cmVMb2FkZXIuaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIFRleHR1cmVMb2FkZXIuaW5zdGFuY2UgPSBuZXcgVGV4dHVyZUxvYWRlcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBUZXh0dXJlTG9hZGVyLmluc3RhbmNlO1xuICAgIH1cblxuICAgIGdldFRleHR1cmVzKHVybHMpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHVybHMubWFwKHVybD0+dGhpcy5nZXRUZXh0dXJlKHVybCkpKTtcbiAgICB9XG5cbiAgICBnZXRUZXh0dXJlKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZSh1cmwsIG51bGwsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUZXh0dXJlTG9hZGVyOyIsImltcG9ydCBUZXh0dXJlTG9hZGVyIGZyb20gXCIuLi9iYXNlM2QvdGV4dHVyZV9sb2FkZXJcIjtcblxuY29uc3QgVGVycmFpbiA9IFRIUkVFLlRlcnJhaW47XG5cbmNsYXNzIFRlcnJhaW5CdWlsZGVyIHtcblxuICAgIHN0YXRpYyBjcmVhdGVUZXJyYWluKG9wdGlvbnMsIHNjZW5lLCBtYXRlcmlhbCwgaGVpZ2h0bWFwKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7d2lkdGg6IDY0LCBoZWlnaHQ6IDY0fSwgb3B0aW9ucyk7XG4gICAgICAgIHZhciB4UyA9IG9wdGlvbnMud2lkdGggLSAxLCB5UyA9IG9wdGlvbnMuaGVpZ2h0IC0gMTtcblxuICAgICAgICBpZiAoIWhlaWdodG1hcClcbiAgICAgICAgICAgIGhlaWdodG1hcCA9IGZ1bmN0aW9uIChnLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJPUFRJT05TXCIsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciB4bCA9IG9wdGlvbnMueFNlZ21lbnRzICsgMSxcbiAgICAgICAgICAgICAgICAgICAgeWwgPSBvcHRpb25zLnlTZWdtZW50cyArIDE7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHhsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHlsOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdbaiAqIHhsICsgaV0ueiArPSBNYXRoLnJhbmRvbSgpICogMTAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZiAoZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIGRvaW5nIHdpcmVmcmFtZSB0ZXJyYWluXG4gICAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICAgICAgY29sb3I6IDB4ZmYwMDAwLFxuICAgICAgICAgICAgICAgIHdpcmVmcmFtZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy9tYXRlcmlhbCA9IG51bGw7XG4gICAgICAgIGxldCB0ZXJyYWluU2NlbmUgPSBUZXJyYWluKHtcbiAgICAgICAgICAgIGVhc2luZzogVGVycmFpbi5MaW5lYXIsXG4gICAgICAgICAgICBmcmVxdWVuY3k6IDIuNSxcbiAgICAgICAgICAgIGhlaWdodG1hcDogaGVpZ2h0bWFwLFxuICAgICAgICAgICAgLy9hZnRlcjogaGVpZ2h0bWFwLFxuICAgICAgICAgICAgbWF0ZXJpYWw6IG1hdGVyaWFsIHx8IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4NTU2NmFhfSksXG4vLyAgICAgICAgICBtYXhIZWlnaHQ6IDEwMCxcbi8vICAgICAgICAgIG1pbkhlaWdodDogLTEwMCxcbi8vbWluSGVpZ2h0OjAsLy91bmRlZmluZWQsXG4vL21heEhlaWdodDoxMCwgLy91bmRlZmluZWQsXG4gICAgICAgICAgICBzdGVwczogMSxcbiAgICAgICAgICAgIHVzZUJ1ZmZlckdlb21ldHJ5OiBmYWxzZSxcbiAgICAgICAgICAgIHhTZWdtZW50czogeFMsXG4gICAgICAgICAgICB4U2l6ZTogb3B0aW9ucy53aWR0aCxcbiAgICAgICAgICAgIHlTZWdtZW50czogeVMsXG4gICAgICAgICAgICB5U2l6ZTogb3B0aW9ucy5oZWlnaHQsXG4gICAgICAgICAgICBzdHJldGNoOiBmYWxzZSxcbiAgICAgICAgICAgIGNsYW1wOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgdGVycmFpblNjZW5lLnJvdGF0aW9uLnggPSAwO1xuICAgICAgICB0ZXJyYWluU2NlbmUuY2hpbGRyZW5bMF0ucm90YXRpb24ueCA9IC1NYXRoLlBJLzI7XG4gICAgICAgIC8vdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLnJvdGF0aW9uLnkgPSBNYXRoLlBJLzg7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5wb3NpdGlvbi54ICs9IG9wdGlvbnMud2lkdGggLyAyO1xuICAgICAgICB0ZXJyYWluU2NlbmUucG9zaXRpb24ueiAtPSBvcHRpb25zLndpZHRoIC8gMjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlRTXCIsIHRlcnJhaW5TY2VuZSk7XG4gICAgICAgIC8vIEFzc3VtaW5nIHlvdSBhbHJlYWR5IGhhdmUgeW91ciBnbG9iYWwgc2NlbmVcbiAgICAgICAgc2NlbmUuYWRkKHRlcnJhaW5TY2VuZSk7XG4gICAgICAgIHRoaXMuZ2VvID0gdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLmdlb21ldHJ5O1xuICAgIH1cblxuICAgIHN0YXRpYyBhc3luYyBjcmVhdGUob3B0aW9ucywgc2NlbmUsIGhlaWdodG1hcCkge1xuICAgICAgICBUZXh0dXJlTG9hZGVyLmdldEluc3RhbmNlKCkuZ2V0VGV4dHVyZXMoWydtb2RlbHMvc2FuZDEuanBnJywgJ21vZGVscy9ncmFzczEuanBnJywgJ21vZGVscy9zdG9uZTEuanBnJywgJ21vZGVscy9zbm93MS5qcGcnXSlcbiAgICAgICAgICAgIC50aGVuKCh0ZXh0dXJlcykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJsZW5kID0gVGVycmFpbkJ1aWxkZXIuZ2VuZXJhdGVNYXRlcmlhbChzY2VuZSwgLi4udGV4dHVyZXMpXG4gICAgICAgICAgICAgICAgVGVycmFpbkJ1aWxkZXIuY3JlYXRlVGVycmFpbihvcHRpb25zLCBzY2VuZSwgYmxlbmQsIGhlaWdodG1hcCk7XG4gICAgICAgICAgICB9KVxuICAgIH1cbiAgICBzdGF0aWMgZ2VuZXJhdGVNYXRlcmlhbChzY2VuZSwgdDEsdDIsdDMsdDQpIHtcbiAgICAgICAgcmV0dXJuIFRlcnJhaW4uZ2VuZXJhdGVCbGVuZGVkTWF0ZXJpYWwoW1xuICAgICAgICAgICAge3RleHR1cmU6IHQxfSxcbiAgICAgICAgICAgIHt0ZXh0dXJlOiB0MiwgbGV2ZWxzOiBbLTgwLCAtMzUsIDIwLCA1MF19LFxuICAgICAgICAgICAge3RleHR1cmU6IHQzLCBsZXZlbHM6IFsyMCwgNTAsIDYwLCA4NV19LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRleHR1cmU6IHQ0LFxuICAgICAgICAgICAgICAgIGdsc2w6ICcxLjAgLSBzbW9vdGhzdGVwKDY1LjAgKyBzbW9vdGhzdGVwKC0yNTYuMCwgMjU2LjAsIHZQb3NpdGlvbi54KSAqIDEwLjAsIDgwLjAsIHZQb3NpdGlvbi56KSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF0sIHNjZW5lKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRlcnJhaW5CdWlsZGVyIiwiLy92YXIgcHJvamVjdG9yID0gbmV3IFRIUkVFLlByb2plY3RvcigpO1xudmFyIHJheWNhc3RlciA9IG5ldyBUSFJFRS5SYXljYXN0ZXIoKTtcblxudmFyIFBpY2sgPSB7XG4gICAgLypcbiAgICAqIG1vdXNlPXt4OjEyLHk6MTJ9XG4gICAgKiAqL1xuICAgIHBpY2s6IGZ1bmN0aW9uIChtb3VzZSwgY2FtZXJhLCBzY2VuZSkge1xuICAgICAgICAvLyBmaW5kIGludGVyc2VjdGlvbnNcbiAgICAgICAgLy9cbiAgICAgICAgLy8gY3JlYXRlIGEgUmF5IHdpdGggb3JpZ2luIGF0IHRoZSBtb3VzZSBwb3NpdGlvblxuICAgICAgICAvLyAgIGFuZCBkaXJlY3Rpb24gaW50byB0aGUgc2NlbmUgKGNhbWVyYSBkaXJlY3Rpb24pXG4gICAgICAgIC8vXG4gICAgICAgIHZhciB2ZWMgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgICAgICB2ZWMueCA9IG1vdXNlLnJ4O1xuICAgICAgICB2ZWMueSA9IG1vdXNlLnJ5O1xuICAgICAgICByYXljYXN0ZXIuc2V0RnJvbUNhbWVyYSh2ZWMsIGNhbWVyYSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIG9iamVjdHMgaW4gdGhlIHNjZW5lIHdpdGggd2hpY2ggdGhlIHJheSBpbnRlcnNlY3RzXG4gICAgICAgIC8vIGludGVyc2VjdCByZWN1cnNpdmUgISEhXG4gICAgICAgIHZhciByZXN1bHQgPSByYXljYXN0ZXIuaW50ZXJzZWN0T2JqZWN0cyhzY2VuZS5jaGlsZHJlbiwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufTtcblxuXG5leHBvcnQgZGVmYXVsdCBQaWNrOyIsIlxuZnVuY3Rpb24gYWRkU2t5Ym94KHNjZW5lKSB7XG4gICAgVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZSgnbW9kZWxzL3NreTEuanBnJywgdW5kZWZpbmVkLCBmdW5jdGlvbiAodDEpIHtcbiAgICAgICAgY29uc3Qgc2t5RG9tZSA9IG5ldyBUSFJFRS5NZXNoKFxuICAgICAgICAgICAgbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KDQwOTYsIDY0LCA2NCksXG4gICAgICAgICAgICBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe21hcDogdDEsIHNpZGU6IFRIUkVFLkJhY2tTaWRlLCBmb2c6IGZhbHNlfSlcbiAgICAgICAgKTtcbiAgICAgICAgc2NlbmUuYWRkKHNreURvbWUpO1xuICAgIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgYWRkU2t5Ym94OyIsImltcG9ydCBhZGRTa3lib3ggZnJvbSBcIi4vc2t5Ym94XCI7XG5cbmZ1bmN0aW9uIGdldFJhbmRvbU51bWJlciggYmFzZSApIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIGJhc2UgLSAoYmFzZS8yKTtcbn1cbmZ1bmN0aW9uIGdldFJhbmRvbUNvbG9yKCkge1xuICAgIHZhciBjID0gbmV3IFRIUkVFLkNvbG9yKCk7XG4gICAgYy5zZXRSR0IoIE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCksIE1hdGgucmFuZG9tKCkgKTtcbiAgICByZXR1cm4gYztcbn1cbmNsYXNzIEFudFNjZW5lIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgLy8gaHR0cDovL3NxdWFyZWZlZXQuZ2l0aHViLmlvL1NoYWRlclBhcnRpY2xlRW5naW5lL1xuICAgICAgICB0aGlzLmVtaXR0ZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygtMSwgMSwgMSksXG4gICAgICAgICAgICBwb3NpdGlvblNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMCksXG5cbiAgICAgICAgICAgIGFjY2VsZXJhdGlvbjogbmV3IFRIUkVFLlZlY3RvcjMoMCwgLTAuMSwgMCksXG4gICAgICAgICAgICBhY2NlbGVyYXRpb25TcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMDEsIDAuMDEsIDAuMDEpLFxuXG4gICAgICAgICAgICB2ZWxvY2l0eTogbmV3IFRIUkVFLlZlY3RvcjMoMCwgMC43LCAwKSxcbiAgICAgICAgICAgIHZlbG9jaXR5U3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjMsIDAuNSwgMC4yKSxcblxuICAgICAgICAgICAgY29sb3JTdGFydDogbmV3IFRIUkVFLkNvbG9yKDB4QkJCQkJCKSxcblxuICAgICAgICAgICAgY29sb3JTdGFydFNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4yLCAwLjEsIDAuMSksXG4gICAgICAgICAgICBjb2xvckVuZDogbmV3IFRIUkVFLkNvbG9yKDB4QUFBQUFBKSxcblxuICAgICAgICAgICAgc2l6ZVN0YXJ0OiAwLjUsXG4gICAgICAgICAgICBzaXplRW5kOiA0LFxuICAgICAgICAgICAgb3BhY2l0eVN0YXJ0OiAxLFxuICAgICAgICAgICAgb3BhY2l0eUVuZDogMC4xLFxuXG4gICAgICAgICAgICAvL3BhcnRpY2xlQ291bnQ6IDIwMDAsXG4gICAgICAgICAgICBwYXJ0aWNsZXNQZXJTZWNvbmQ6IDEwMCxcbiAgICAgICAgICAgIGFsaXZlOiAxXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5lbWl0dGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBtYXhBZ2U6IDUsXG4gICAgICAgICAgICAvL3R5cGU6IE1hdGgucmFuZG9tKCkgKiA0IHwgMCxcbiAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKC0xLDAsMClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY2NlbGVyYXRpb246IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoMCxcbiAgICAgICAgICAgICAgICAgICAgLTAuMixcbiAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgc3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLDAuMSwwKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZlbG9jaXR5OiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAxLjQsXG4gICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIHNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4zLDAuNywwLjMpXG4gICAgICAgICAgICB9LFxuLypcbiAgICAgICAgICAgIHJvdGF0aW9uOiB7XG4gICAgICAgICAgICAgICAgYXhpczogbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxKSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEpLFxuICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMSlcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIGFuZ2xlOlxuICAgICAgICAgICAgICAgICAgICBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSxcbiAgICAgICAgICAgICAgICBjZW50ZXI6XG4gICAgICAgICAgICAgICAgICAgIG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmFuZG9tTnVtYmVyKDEwMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRSYW5kb21OdW1iZXIoMTAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFJhbmRvbU51bWJlcigxMDApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIH0sXG5cblxuICAgICAgICAgICAgd2lnZ2xlOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucmFuZG9tKCkgKiAyMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWc6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5yYW5kb20oKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb2xvcjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBbbmV3IFRIUkVFLkNvbG9yKDB4MzMzMzMzKSxuZXcgVEhSRUUuQ29sb3IoMHg3Nzc3NzcpLG5ldyBUSFJFRS5Db2xvcigweDg4ODg4OCldLFxuICAgICAgICAgICAgICAgIHNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4zLDAsMClcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNpemU6IHtcblxuICAgICAgICAgICAgICAgIHZhbHVlOiBbMC41LCAwLjcsIDFdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGFydGljbGVDb3VudDogMTAwLFxuICAgICAgICAgICAgb3BhY2l0eToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBbMSwgMC44LCAwLjBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVwdGhUZXN0OiB0cnVlLFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblxuICAgICAgICB0aGlzLnBhcnRpY2xlR3JvdXAgPSBBbnRTY2VuZS5tYWtlU1BFR3JvdXAoKTtcblxuICAgICAgICB0aGlzLnBhcnRpY2xlR3JvdXAuYWRkUG9vbCgxMCwgdGhpcy5lbWl0dGVyU2V0dGluZ3MsIHRydWUpO1xuXG4gICAgICAgIHZhciBlbWl0dGVyID0gdGhpcy5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKClcbiAgICAgICAgZW1pdHRlci5wb3NpdGlvbi52YWx1ZSA9IG5ldyBUSFJFRS5WZWN0b3IzKC0yLDAsMClcbiAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcbiAgICAgICAgZW1pdHRlciA9IHRoaXMucGFydGljbGVHcm91cC5nZXRGcm9tUG9vbCgpXG4gICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSBuZXcgVEhSRUUuVmVjdG9yMygtNCwwLDApXG4gICAgICAgIGVtaXR0ZXIuZW5hYmxlKCk7XG5cbiAgICAgICAgLy90aGlzLnNjZW5lLmJhY2tncm91bmQuYWRkKG5ldyBDb2xvcihcInJlZFwiKSlcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQodGhpcy5wYXJ0aWNsZUdyb3VwLm1lc2gpO1xuICAgICAgICB0aGlzLnNjZW5lLnBhcnRpY2xlR3JvdXAgPSB0aGlzLnBhcnRpY2xlR3JvdXA7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUEFSVElDTEVcIiwgdGhpcy5wYXJ0aWNsZUdyb3VwKTtcblxuXG4gICAgICAgIC8vIHNvZnQgd2hpdGUgbGlnaHRcbiAgICAgICAgdmFyIGxpZ2h0ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDMwMjAyMCk7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0KTtcblxuICAgICAgICAvLyBXaGl0ZSBkaXJlY3Rpb25hbCBsaWdodCBhdCBoYWxmIGludGVuc2l0eSBzaGluaW5nIGZyb20gdGhlIHRvcC5cbiAgICAgICAgdmFyIGRpcmVjdGlvbmFsTGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZmZiwgMC43KTtcbiAgICAgICAgZGlyZWN0aW9uYWxMaWdodC5wb3NpdGlvbi5zZXQoMSwgMC43LCAwLjcpO1xuICAgICAgICB0aGlzLnNjZW5lLmFkZChkaXJlY3Rpb25hbExpZ2h0KTtcblxuICAgICAgICBhZGRTa3lib3godGhpcy5zY2VuZSk7XG5cblxuICAgICAgICB0aGlzLmNyZWF0ZUN1YmUodGhpcy5zY2VuZSwgMCwgMCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQ3ViZSh0aGlzLnNjZW5lLCAwLCA0KTtcbiAgICAgICAgdGhpcy5jcmVhdGVDdWJlKHRoaXMuc2NlbmUsIDQsIDApO1xuXG4gICAgICAgIHRoaXMubWVzaGVzID0ge307XG4gICAgICAgIHRoaXMuZW50aXRpZXMgPSBbXVxuICAgIH1cblxuICAgIHN0YXRpYyBtYWtlU1BFR3JvdXAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgU1BFLkdyb3VwKHtcbiAgICAgICAgICAgIHRleHR1cmU6IHsgdmFsdWU6IFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJy4vaW1hZ2VzL3Ntb2tlcGFydGljbGUucG5nJykgfSxcbiAgICAgICAgICAgIC8vbWF4QWdlOiA0LFxuICAgICAgICAgICAgLy9ibGVuZGluZzogVEhSRUUuTm9ybWFsQmxlbmRpbmdcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBjcmVhdGVDdWJlKHNjZW5lLCB4LCB5KSB7XG4gICAgICAgIHZhciBnZW9tZXRyeSA9IG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSgpO1xuICAgICAgICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe2NvbG9yOiAweDAwZmYwMH0pO1xuICAgICAgICB2YXIgY3ViZSA9IG5ldyBUSFJFRS5NZXNoKGdlb21ldHJ5LCBtYXRlcmlhbCk7XG4gICAgICAgIGN1YmUucG9zaXRpb24ueCArPSB4O1xuICAgICAgICBjdWJlLnBvc2l0aW9uLnogKz0geTtcbiAgICAgICAgc2NlbmUuYWRkKGN1YmUpO1xuICAgIH1cblxuICAgIHRpY2soZGVsdGEpIHtcbiAgICAgICAgaWYgKGRlbHRhKSB7XG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlR3JvdXAudGljayhkZWx0YSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFkZChub2RlKSB7XG4gICAgICAgIC8vICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpXG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBRERcIiwgbm9kZSk7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKG5vZGUpXG4gICAgfVxuXG4gICAgcmVtb3ZlKG5vZGUpIHtcbiAgICAgICAgdGhpcy5zY2VuZS5yZW1vdmUobm9kZSlcbiAgICB9XG5cbiAgICBtYWtlRW1pdHRlcihwb3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTUEUuRW1pdHRlcih0aGlzLmVtaXR0ZXJTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQW50U2NlbmUiLCJjb25zdCBjbG9jayA9IG5ldyBUSFJFRS5DbG9jaygpO1xuXG5jbGFzcyBCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcihlbCkge1xuXG5cblxuICAgIH1cblxuXG5cblxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlO1xuIiwiaW1wb3J0IEJhc2UgZnJvbSBcIi4vYmFzZVwiO1xuXG5jb25zdCBjbG9jayA9IG5ldyBUSFJFRS5DbG9jaygpO1xuXG5jbGFzcyBWaWV3ICB7XG4gICAgY29uc3RydWN0b3IoZWwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFTFwiLCBlbCwgdGhpcylcbiAgICAgICAgdGhpcy5lbCA9IGVsXG4gICAgICAgIHRoaXMucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcigpO1xuXG4gICAgICAgIC8vIGZpeG1lOiB1c2UgZWwgc2l6ZVxuICAgICAgICBjb25zdCB3aWR0aCA9IGVsLm9mZnNldFdpZHRoXG4gICAgICAgIGNvbnN0IGhlaWdodCA9IGVsLm9mZnNldEhlaWdodFxuXG4gICAgICAgIGVsLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudClcblxuICAgICAgICB0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg2MCwgd2lkdGggLyBoZWlnaHQsIDEsIDEwMDAwKTtcbiAgICAgICAgdGhpcy5zZXRTaXplKClcblxuICAgICAgICB0aGlzLmNhbWVyYS5yb3RhdGlvbi54ID0gLSgxMCArIDMyKSAqIE1hdGguUEkgLyAxODA7XG4gICAgICAgIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0U2l6ZSgpIHtcbiAgICAgICAgdGhpcy5jYW1lcmEuYXNwZWN0ID0gdGhpcy5lbC5vZmZzZXRXaWR0aCAvIHRoaXMuZWwub2Zmc2V0SGVpZ2h0O1xuICAgICAgICB0aGlzLmNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTaXplKHRoaXMuZWwub2Zmc2V0V2lkdGgsIHRoaXMuZWwub2Zmc2V0SGVpZ2h0KTtcbiAgICB9XG5cbiAgICByZW5kZXIoc2NlbmUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICAgICAgY29uc29sZS5sb2coXCJSRU5ERVJcIiwgc2NlbmUsIG9wdGlvbnMpXG5cbiAgICAgICAgdmFyIGRvcmVuZGVyPSAoKT0+IHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhpcyByZW5kZXJpbmcgLSBiZWNhdXNlIHRoZSBzY29wZSAvIGNhbnZhcyBpcyBkZXN0cm95ZWRcbiAgICAgICAgICAgIGlmICghdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oaWRkZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChkb3JlbmRlciwgNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvcmVuZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB0aW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHZhciB0aW1lRGlmZiA9IHRpbWUgLSBsYXN0VGltZTtcbiAgICAgICAgICAgIGxhc3RUaW1lID0gdGltZTtcblxuICAgICAgICAgICAgdmFyIGRlbHRhO1xuICAgICAgICAgICAgdmFyIHVzZTNqc1RpbWUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKHVzZTNqc1RpbWUpXG4gICAgICAgICAgICAgICAgZGVsdGEgPSBjbG9jay5nZXREZWx0YSgpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGRlbHRhID0gdGltZURpZmYgKiAwLjAwMTtcblxuICAgICAgICAgICAgaWYgKGRlbHRhID4gMC4xKVxuICAgICAgICAgICAgICAgIGRlbHRhID0gMC4xO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5mcmFtZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZnJhbWVDYWxsYmFjayhkZWx0YSk7XG5cbiAgICAgICAgICAgIHNjZW5lLnRpY2soZGVsdGEpXG4gICAgICAgICAgICAvLyBhbmltYXRlIENvbGxhZGEgbW9kZWxcblxuICAgICAgICAgICAgLy9USFJFRS5BbmltYXRpb25NaXhlci51cGRhdGUoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW5kZXIoc2NlbmUuc2NlbmUsIHRoaXMuY2FtZXJhKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9yZW5kZXIpO1xuICAgIH1cblxuICAgIHVwZGF0ZUNhbWVyYSh2aWV3Q2VudGVyLCBoKSB7XG4gICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLnggPSB2aWV3Q2VudGVyLng7XG4gICAgICAgIHRoaXMuY2FtZXJhLnBvc2l0aW9uLnkgPSB2aWV3Q2VudGVyLnogKyBoO1xuICAgICAgICB0aGlzLmNhbWVyYS5wb3NpdGlvbi56ID0gLSB2aWV3Q2VudGVyLnkgKyB2aWV3Q2VudGVyLno7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBWaWV3OyIsImltcG9ydCBUZXJyYWluQnVpbGRlciBmcm9tIFwiLi4vbGlicy90ZXJyYWluX2J1aWxkZXJcIjtcbmltcG9ydCBQaWNrIGZyb20gJy4uL2Jhc2UzZC9waWNrJ1xuaW1wb3J0IEFudFNjZW5lIGZyb20gXCIuLi9iYXNlM2QvYW50LXNjZW5lXCI7XG5pbXBvcnQgVmlldyBmcm9tIFwiLi4vYmFzZTNkL3ZpZXdcIlxuXG4vKipcbiAqIEdhbWV2aWV3IGNvbnRhaW5zIHNjZW5lLCB2aWV3LFxuICovXG5jbGFzcyBBZ0dhbWVWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB0aGlzLnNldHVwVGhyZWUoKTtcblxuICAgIHRoaXMuY29udHJvbFByb2dyZXNzID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoXCJjb250cm9sLXByb2dyZXNzXCIpKSB7XG4gICAgICB0aGlzLmNvbnRyb2xQcm9ncmVzcyA9IHRydWU7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJBZ0dhbWVWaWV3IGNvbm5lY3RlZFwiKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHRoaXMudXBkYXRlU2l6ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5tb3VzZWRvd24uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCB0aGlzLm1vdXNldXAuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMubW91c2Vtb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgdGhpcy50b3VjaHN0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsIHRoaXMudG91Y2hlbmQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIHRoaXMudG91Y2htb3ZlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMud2hlZWwuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdGhpcy5jbGljay5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0aGlzLmtleWRvd24uYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLnZpc2liaWxpdHlDaGFuZ2UsIHRoaXMudmlzaWJpbGl0eUNoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlld0NlbnRlciA9IHt4OiAwLCB5OiAwLCB6OiAxMH07XG4gICAgdGhpcy50b3VjaGVzID0ge307XG5cblxuICAgIHRoaXMubW92ZXMgPSAwO1xuICAgIHRoaXMudmlldyA9IG5ldyBWaWV3KHRoaXMpO1xuICAgIHRoaXMudXBkYXRlU2l6ZSh7dGFyZ2V0OiB3aW5kb3d9KTtcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIGZyYW1lQ2FsbGJhY2soZSkge1xuICAgIHRoaXMudGljayhlKVxuICAgIC8vIHRoaXMuc2NlbmUudGljaygpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLnVwZGF0ZVNpemUuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHRoaXMubW91c2Vkb3duLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLm1vdXNlbW92ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCB0aGlzLndoZWVsLmJpbmQodGhpcykpO1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgdGhpcy5rZXlkb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5nZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKS52aXNpYmlsaXR5Q2hhbmdlLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdmlldy5kZXN0cm95ZWQgPSB0cnVlXG4gIH1cblxuICBhc3luYyB3b3JsZENyZWF0ZWQoZSkge1xuICAgIHRoaXMud29ybGQgPSBlLndvcmxkO1xuICAgIGNvbnN0IG1hcCA9IHRoaXMud29ybGQubWFwO1xuXG4gICAgLy8gRklYTUU6bW92ZSB0aGlzIHNvbWV3aGVyZSBlbHNlXG4gICAgY29uc3QgdGhyZWVIZWlnaHRNYXAgPSBtYXAudG9UaHJlZVRlcnJhaW4oKTtcblxuICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZShtYXAsIHRoaXMuc2NlbmUsIHRocmVlSGVpZ2h0TWFwKTtcblxuICAgIC8vIEZJWE1FOiBsb2FkIGFsbCBtb2RlbHMgYmVmb3JlaGFuZFxuICAgIGF3YWl0IHRoaXMud29ybGQuaW5pdFNjZW5lKHRoaXMuc2NlbmUpO1xuICAgIHRoaXMuc3RhcnRSZW5kZXJMb29wKCk7XG4gICAgdGhpcy51cGRhdGVDYW1lcmEoKTtcbiAgfVxuXG4gIHN0YXJ0UmVuZGVyTG9vcCgpIHtcbiAgICB0aGlzLnZpZXcucmVuZGVyKHRoaXMuc2NlbmUsIHtmcmFtZUNhbGxiYWNrOiB0aGlzLmZyYW1lQ2FsbGJhY2suYmluZCh0aGlzKX0pXG4gIH1cblxuICBnZXRWaXNpYmlsaXR5Q2hhbmdlRXZlbnQoKSB7XG4gICAgdmFyIGhpZGRlbiwgdmlzaWJpbGl0eUNoYW5nZTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgICAgaGlkZGVuID0gXCJoaWRkZW5cIjtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaGlkZGVuID0gXCJtc0hpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwibXN2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9IFwid2Via2l0dmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgIH1cbiAgICByZXR1cm4ge3Zpc2liaWxpdHlDaGFuZ2UsIGhpZGRlbn07XG4gIH1cblxuICBzZXR1cFRocmVlKCkge1xuICAgIHRoaXMuc2NlbmUgPSBuZXcgQW50U2NlbmUodGhpcy5zY2VuZSlcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICBpZiAodGhpcy5jb250cm9sUHJvZ3Jlc3MgJiYgIXRoaXMud29ybGQucGF1c2UpIHtcbiAgICAgIHRoaXMud29ybGQudGljayhkZWx0YSlcbiAgICB9XG4gIH1cblxuICB2aXNpYmlsaXR5Q2hhbmdlKGV2KSB7XG4gICAgaWYgKGV2LnRhcmdldFt0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLmhpZGRlbl0pIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gdHJ1ZVxuICAgICAgLy8gaGlkZGVuXG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmxkLnBhdXNlID0gZmFsc2VcbiAgICAgIC8vIHZpc2libGVcbiAgICB9XG4gIH1cblxuICB1cGRhdGVTaXplKGV2KSB7XG4gICAgdGhpcy52aWV3LnNldFNpemUoe30pO1xuICAgIHRoaXMuY29udGFpbmVyV2lkdGggPSBldi50YXJnZXQuaW5uZXJXaWR0aDtcbiAgICB0aGlzLmNvbnRhaW5lckhlaWdodCA9IGV2LnRhcmdldC5pbm5lckhlaWdodFxuICB9XG5cbiAgbW91c2V1cChlKSB7XG4gICAgdGhpcy5tb3VzZWlzZG93biA9IGZhbHNlO1xuICB9XG5cbiAgbW91c2Vkb3duKGUpIHtcbiAgICB0aGlzLm1vdXNlaXNkb3duID0gdHJ1ZTtcbiAgICB0aGlzLm94ID0gZS5wYWdlWDtcbiAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB0aGlzLm1vdmVzID0gMDtcbiAgfVxuXG4gIHRvdWNoc3RhcnQoZSkge1xuICAgIGNvbnNvbGUubG9nKFwidG91Y2hzdGFydFwiLGUpXG4gICAgY29uc3QgdG91Y2ggPWUudGFyZ2V0VG91Y2hlc1xuICAgIHRoaXMudG91Y2hlc1swXT17eDp0b3VjaC5jbGllbnRYLCB5OnRvdWNoLmNsaWVudFl9XG4gIH1cblxuICB0b3VjaGVuZChlKSB7XG4gICAgZGVsZXRlIHRoaXMudG91Y2hlc1swXTtcbiAgICBjb25zb2xlLmxvZyhcInRvdWNoZW5kXCIsZSlcbiAgfVxuXG4gIHRvdWNobW92ZShlKSB7XG4gICAgY29uc29sZS5sb2coXCJ0b3VjaG1vdmVcIixlKVxuICAgIGNvbnN0IHdpZHRoID0gdGhpcy5vZmZzZXRXaWR0aDtcbiAgICBjb25zdCBoZWlnaHQgPSB0aGlzLm9mZnNldEhlaWdodDtcbiAgICBjb25zdCB4ID0gZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFgtdGhpcy50b3VjaGVzWzBdLnhcbiAgICBjb25zdCB5ID0gZS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFktdGhpcy50b3VjaGVzWzBdLnlcbiAgICBjb25zb2xlLmxvZyhcIlhYWFhcIix5LHgsd2lkdGgsaGVpZ2h0LEpTT04uc3RyaW5naWZ5KHRoaXMudG91Y2hlcykpXG4gICAgdGhpcy5tb3ZlKHt4Ongvd2lkdGgsIHk6eS9oZWlnaHR9KVxuICB9XG5cbiAgd2hlZWwoZSkge1xuICAgIHRoaXMudmlld0NlbnRlci56ICs9IGUuZGVsdGFZICogMC4xO1xuICAgIGlmICh0aGlzLnZpZXdDZW50ZXIueiA8IDUpIHtcbiAgICAgIHRoaXMudmlld0NlbnRlci56ID0gNVxuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG4gIH1cblxuICBjbGljayhlKSB7XG4gICAgaWYgKCF0aGlzLndvcmxkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMud29ybGQuY2xpY2sodGhpcy5sYXN0UG9zKVxuICB9XG5cbiAgbW91c2Vtb3ZlKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB0aGlzLm1vdmVzICs9IDE7XG4gICAgaWYgKHRoaXMubW91c2Vpc2Rvd24pIHtcbiAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5vZmZzZXRXaWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMub2Zmc2V0SGVpZ2h0O1xuICAgICAgdGhpcy5tb3ZlKHtkeDogKGUucGFnZVggLSB0aGlzLm94KSAvIHdpZHRoLCBkeTogKGUucGFnZVkgLSB0aGlzLm95KSAvIGhlaWdodH0pO1xuICAgICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgICB0aGlzLm95ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgdGhpcy5ob3Zlcih7XG4gICAgICB4OiBlLnBhZ2VYLFxuICAgICAgeTogZS5wYWdlWSxcbiAgICAgIHJ4OiBlLnBhZ2VYIC8gdGhpcy5jb250YWluZXJXaWR0aCAqIDIgLSAxLFxuICAgICAgcnk6IC1lLnBhZ2VZIC8gdGhpcy5jb250YWluZXJIZWlnaHQgKiAyICsgMSxcbiAgICB9KTtcbiAgfVxuXG4gIGhvdmVyKG1vdXNlKSB7XG4gICAgaWYgKCF0aGlzLndvcmxkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZXMgPSBQaWNrLnBpY2sobW91c2UsIHRoaXMudmlldy5jYW1lcmEsIHRoaXMuc2NlbmUuc2NlbmUpO1xuXG4gICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgZW50aXR5ID0gcmVzWzBdLm9iamVjdC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICBlbnRpdHkgPSByZXNbMF0ub2JqZWN0LnBhcmVudC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICB9XG4gICAgICB0aGlzLndvcmxkLmhvdmVyKGVudGl0eSk7XG5cbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIHRoaXMubGFzdFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKHJlc1swXS5wb2ludC54LCAtcmVzWzBdLnBvaW50LnopLy8uY29weShyZXNbMF0ucG9pbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1vdmUoZCkge1xuICAgIHRoaXMudmlld0NlbnRlci54IC09IGQuZHggKiB0aGlzLnZpZXdDZW50ZXIueiAqIDM7XG4gICAgdGhpcy52aWV3Q2VudGVyLnkgKz0gZC5keSAqIHRoaXMudmlld0NlbnRlci56ICogMztcblxuICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgfVxuXG4gIHVwZGF0ZUNhbWVyYSgpIHtcbiAgICAvLyBGSVhNRTogbW92ZSB0byB3b3JsZFxuICAgIHZhciBoO1xuXG4gICAgaWYgKHRoaXMud29ybGQgJiYgdGhpcy53b3JsZC5tYXApIHtcbiAgICAgIGggPSB0aGlzLndvcmxkLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMudmlld0NlbnRlci54LCB0aGlzLnZpZXdDZW50ZXIueSArIHRoaXMudmlld0NlbnRlci56IC8gMik7XG4gICAgfVxuICAgIGlmIChoID4gNTAgfHwgaCA8IDUwKSB7XG4gICAgICBoID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLnZpZXcudXBkYXRlQ2FtZXJhKHRoaXMudmlld0NlbnRlciwgaClcbiAgfVxuXG4gIGtleWRvd24oZSkge1xuICAgIGNvbnNvbGUubG9nKFwiS0VZZG93blwiLCBlKTtcbiAgICBpZiAoZS5rZXlDb2RlID09IDI3KSB7XG4gICAgICB0aGlzLndvcmxkLnNlbGVjdChudWxsKTtcbiAgICB9XG4gIH1cbn1cblxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctZ2FtZS12aWV3JykpIHtcbiAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1nYW1lLXZpZXcnLCBBZ0dhbWVWaWV3KTtcbn1cbiIsIi8vIHNoYW1lbGVzc2x5IHN0b2xlbiBmcm9tIGh0dHBzOi8vZGF2aWR3YWxzaC5uYW1lL3B1YnN1Yi1qYXZhc2NyaXB0XG4vLyBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUIGxpY2Vuc2VcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXZlbnRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMgPSBbXVxuICAgIH1cblxuICAgIHN1YnNjcmliZShsaXN0ZW5lcikge1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzO1xuXG4gICAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgICAgY29uc3QgaW5kZXggPSBsaXN0ZW5lcnMucHVzaChsaXN0ZW5lcikgLSAxO1xuXG4gICAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxpc3RlbmVyc1tpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHVibGlzaChpbmZvKSB7XG4gICAgICAgIC8vIEN5Y2xlIHRocm91Z2ggdG9waWNzIHF1ZXVlLCBmaXJlIVxuICAgICAgICB0aGlzLmxpc3RlbmVycy5mb3JFYWNoKChpdGVtKT0+IHtcbiAgICAgICAgICAgIGl0ZW0oaW5mbyk7IC8vaW5mbyAhPSB1bmRlZmluZWQgPyBpbmZvIDoge30pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iLCJjbGFzcyBKb2Ige1xuICAgIGNvbnN0cnVjdG9yKGVudGl0eSkge1xuICAgICAgICB0aGlzLl9lbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIHRoaXMuX3JlYWR5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZ2V0IHJlYWR5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHk7XG4gICAgfVxuXG4gICAgZ2V0IGVudGl0eSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VudGl0eVxuICAgIH1cblxuICAgIHNldFJlYWR5KCkge1xuICAgICAgICB0aGlzLl9yZWFkeSA9IHRydWU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBKb2I7IiwiLyoqIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBUSFJFRS5WZWN0b3IyLiAqL1xuXG5jbGFzcyBWZWN0b3IyIHtcbiAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICB9XG5cbiAgdHJ1bmMobWlueCwgbWlueSwgbWF4eCwgbWF4eSkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMihcbiAgICAgIHRoaXMueCA8IG1pbnggPyBtaW54IDogKHRoaXMueCA+IG1heHggPyBtYXh4IDogdGhpcy54KSxcbiAgICAgIHRoaXMueSA8IG1pbnkgPyBtaW55IDogKHRoaXMueSA+IG1heHkgPyBtYXh5IDogdGhpcy55KSxcbiAgICApXG4gIH1cblxuICBjb3B5KHYpIHtcbiAgICBpZih2KSB7XG4gICAgICB0aGlzLnggPSB2Lng7XG4gICAgICB0aGlzLnkgPSB2Lnk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWRkKHYpIHtcbiAgICBpZiAoIXYpIHtcbiAgICAgIHRocm93IFwiVmVjdG9yIHYgbm90IGRlZmluZWRcIjtcbiAgICB9XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZGlzdGFuY2VUbyh2KSB7XG4gICAgY29uc3QgZHggPSB2LnggLSB0aGlzLngsIGR5ID0gdi55IC0gdGhpcy55O1xuICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpXG4gIH1cblxuICBzdWJWZWN0b3JzKGEsIGIpIHtcbiAgICB0aGlzLnggPSBhLnggLSBiLng7XG4gICAgdGhpcy55ID0gYS55IC0gYi55O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0TGVuZ3RoKGxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZSgpLm11bHRpcGx5U2NhbGFyKGxlbmd0aCk7XG4gIH1cblxuICBub3JtYWxpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKHRoaXMubGVuZ3RoKCkgfHwgMSk7XG4gIH1cblxuICBkaXZpZGVTY2FsYXIocykge1xuICAgIHRoaXMueCAvPSBzO1xuICAgIHRoaXMueSAvPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbXVsdGlwbHlTY2FsYXIocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGVuZ3RoKCkge1xuICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55KTtcbiAgfVxufVxuXG5leHBvcnQge1ZlY3RvcjJ9O1xuIiwiY2xhc3MgQW5nbGUge1xuICBzdGF0aWMgZnJvbVZlY3RvcjIoZGlyKSB7XG4gICAgcmV0dXJuIC1NYXRoLmF0YW4yKGRpci54LCBkaXIueSkgKyBNYXRoLlBJO1xuICB9XG59XG5cbmV4cG9ydCB7QW5nbGV9XG4iLCJpbXBvcnQgSm9iIGZyb20gJy4vam9iJ1xuaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuaW1wb3J0IHtBbmdsZX0gZnJvbSBcIi4uL2FuZ2xlXCJcblxudmFyIHRtcERpciA9IG5ldyBWZWN0b3IyKCk7XG5cbmNsYXNzIE1vdmUgZXh0ZW5kcyBKb2Ige1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIHBvcywgZGlzdGFuY2UpIHtcbiAgICBzdXBlcihlbnRpdHkpO1xuICAgIHRoaXMuc3BlZWQgPSBlbnRpdHkuc3BlZWQgfHwgMTtcbiAgICB0aGlzLmxsdGFyZ2V0UG9zID0gcG9zO1xuICAgIHRoaXMuZGlzdGFuY2UgPSBkaXN0YW5jZSB8fCAwO1xuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIHZhciBlID0gdGhpcy5lbnRpdHk7XG4gICAgaWYgKHRoaXMubGx0YXJnZXRQb3MpIHtcblxuICAgICAgdmFyIGRpc3RhbmNlID0gdGhpcy5sbHRhcmdldFBvcy5kaXN0YW5jZVRvKGUucG9zKTtcbiAgICAgIHZhciB0b2dvID0gZGVsdGEgKiB0aGlzLnNwZWVkO1xuXG4gICAgICBkaXN0YW5jZSAtPSB0aGlzLmRpc3RhbmNlO1xuICAgICAgdG1wRGlyLnN1YlZlY3RvcnModGhpcy5sbHRhcmdldFBvcywgZS5wb3MpLnNldExlbmd0aCh0b2dvKTtcblxuICAgICAgZS5yb3RhdGlvbiA9IEFuZ2xlLmZyb21WZWN0b3IyKHRtcERpcik7XG4gICAgICBpZiAoZGlzdGFuY2UgPCB0b2dvKSB7XG4gICAgICAgIGlmICh0aGlzLmRpc3RhbmNlID4gMCkge1xuICAgICAgICAgIGUucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMubGx0YXJnZXRQb3MpLmFkZChuZXcgVmVjdG9yMigpLnN1YlZlY3RvcnModGhpcy5sbHRhcmdldFBvcywgZS5wb3MpLnNldExlbmd0aCgtdGhpcy5kaXN0YW5jZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGUucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMubGx0YXJnZXRQb3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZS51cGRhdGVNZXNoUG9zKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmxsdGFyZ2V0UG9zO1xuICAgICAgICB0aGlzLnNldFJlYWR5KCk7XG4gICAgICAgIC8vIHJldHVybiByZXN0IHRpbWVcbiAgICAgICAgcmV0dXJuICh0b2dvIC0gZGlzdGFuY2UpIC8gdGhpcy5zcGVlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGUucG9zLmFkZCh0bXBEaXIpO1xuICAgICAgfVxuXG4gICAgICBlLnVwZGF0ZU1lc2hQb3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVSUk9SOiBubyBsbHRhcmdldHBvcyBkZWZpbmVkXCIpO1xuICAgICAgLy8gdXNlIHRoaXMgbWF5YmUgZm9yIGZvbGxvd2luZyBvdGhlciBlbnRpdGllc1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cbn1cblxuZXhwb3J0IHtNb3ZlfTtcbiIsImltcG9ydCB7TW92ZX0gZnJvbSAnLi4vbGwvbW92ZSdcblxuY2xhc3MgTWxNb3ZlIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBwb3MsIG1lc2hUeXBlKSB7XG4gICAgdGhpcy5lbnRpdHkgPSBlbnRpdHk7XG4gICAgdGhpcy5tbHRhcmdldFBvcyA9IHBvcztcbiAgICBpZiAoIW1lc2hUeXBlKVxuICAgICAgbWVzaFR5cGUgPSBcIndhbGtcIjtcbiAgICB0aGlzLm1lc2hUeXBlID0gbWVzaFR5cGU7XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgdmFyIGRpc3RhbmNlID0gdGhpcy5tbHRhcmdldFBvcy5kaXN0YW5jZVRvKHRoaXMuZW50aXR5LnBvcyk7XG4gICAgaWYgKGRpc3RhbmNlIDwgMC4xKSB7XG4gICAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbnRpdHkuc2V0TWVzaChcIndhbGtcIik7XG4gICAgICB0aGlzLmVudGl0eS5wdXNoSm9iKG5ldyBNb3ZlKHRoaXMuZW50aXR5LCB0aGlzLm1sdGFyZ2V0UG9zKSk7XG4gICAgfVxuICAgIHJldHVybiBkZWx0YTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7TWxNb3ZlfVxuIiwiaW1wb3J0IEV2ZW50cyBmcm9tICcuLi9saWJzL2V2ZW50cydcbmltcG9ydCB7TWxNb3ZlfSBmcm9tIFwiLi9tbC9tb3ZlXCI7XG5cbmNsYXNzIFdvcmxkIHtcbiAgY29uc3RydWN0b3IobWFwKSB7XG4gICAgdGhpcy5tYXAgPSBtYXA7XG4gICAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICAgIHRoaXMuZW50aXRpZXNCeVR5cGUgPSB7fTtcbiAgICBpZiAoIXdpbmRvdy5Xb3JsZClcbiAgICAgIHdpbmRvdy5Xb3JsZCA9IHRoaXM7XG5cbiAgICB0aGlzLmhvdmVyZWQgPSBuZXcgRXZlbnRzKCk7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG5ldyBFdmVudHMoKTtcbiAgfVxuXG4gIGdldCB3aWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAud2lkdGg7XG4gIH1cblxuICBnZXQgaGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oZWlnaHQ7XG4gIH1cblxuICBwdXNoKGVudGl0eSkge1xuICAgIGVudGl0eS53b3JsZCA9IHRoaXM7XG4gICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSk7XG4gICAgaWYgKCFlbnRpdHkubWl4aW5OYW1lcylcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIG1peGlucyBmb3IgXCIsIGVudGl0eSk7XG4gICAgZWxzZSB7XG4gICAgICBlbnRpdHkubWl4aW5OYW1lcy5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5lbnRpdGllc0J5VHlwZVtuYW1lXSlcbiAgICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdID0gW107XG4gICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0ucHVzaChlbnRpdHkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgc2VhcmNoKHBhcmFtLCBvcmlnaW4pIHtcbiAgICByZXR1cm4gXy5jaGFpbih0aGlzLmVudGl0aWVzKS5maWx0ZXIoKGUpID0+IHtcbiAgICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgIHJldHVybiBwYXJhbShlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gcGFyYW0pIHtcbiAgICAgICAgICB2YXIgdmFsID0gcGFyYW1bbmFtZV07XG4gICAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPQkpcIiwgdmFsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICBpZiAoZVtuYW1lXS5pbmRleE9mKHZhbCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVbbmFtZV0gaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCFlW25hbWVdW3ZhbF0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlW25hbWVdICE9IHZhbClcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSkuc29ydEJ5KChlKSA9PiB7XG4gICAgICBpZiAob3JpZ2luIGluc3RhbmNlb2YgVEhSRUUuVmVjdG9yMylcbiAgICAgICAgcmV0dXJuIGUucG9zLmRpc3RhbmNlVG8ob3JpZ2luKTtcbiAgICAgIHJldHVybiAxO1xuICAgIH0pLnZhbHVlKCk7XG4gIH1cblxuICBhc3luYyBpbml0U2NlbmUoc2NlbmUpIHtcbiAgICBjb25zb2xlLmxvZyhcIj09PSBpbml0U2NlbmVcIik7XG4gICAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGFzeW5jIGUgPT4ge1xuICAgICAgYXdhaXQgZS5zZXRTY2VuZShzY2VuZSk7XG4gICAgfSk7XG4gIH1cblxuICBob3ZlcihlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5ob3ZlcmVkRW50aXR5KVxuICAgICAgdGhpcy5ob3ZlcmVkRW50aXR5LmhvdmVyZWQoZmFsc2UpO1xuXG4gICAgdGhpcy5ob3ZlcmVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLmhvdmVyZWQucHVibGlzaChlbnRpdHkpXG4gIH1cblxuICBzZWxlY3QoZW50aXR5KSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkpXG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKGZhbHNlKTtcbiAgICB0aGlzLnNlbGVjdGVkRW50aXR5ID0gZW50aXR5O1xuICAgIGlmICh0aGlzLnNlbGVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnNlbGVjdGVkKHRydWUpO1xuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkLnB1Ymxpc2goZW50aXR5KVxuICB9XG5cbiAgZ2V0U2VsZWN0ZWRIZXJvKCkge1xuICAgIGlmICghdGhpcy5zZWxlY3RlZEhlcm8pIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRIZXJvID0gdGhpcy5zZWFyY2goe3BsYXllcjogXCJodW1hblwifSlbMF07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkSGVybztcbiAgfVxuXG4gIHRpY2soZGVsdGEpIHtcbiAgICB0aGlzLmVudGl0aWVzLmZvckVhY2goKGVudGl0eSkgPT4ge1xuICAgICAgaWYgKGVudGl0eS50aWNrKSB7XG4gICAgICAgIGVudGl0eS50aWNrKGRlbHRhKVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2xpY2sobGFzdFBvcykge1xuICAgIGNvbnNvbGUubG9nKFwiV09STEQuY2xpY2tcIiwgbGFzdFBvcyk7XG4gICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSkge1xuICAgICAgdGhpcy5zZWxlY3QodGhpcy5ob3ZlcmVkRW50aXR5KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2VsZWN0ZWRFbnRpdHkgJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5wdXNoSm9iIC8qJiYgdGhpcy5zZWxlY3RlZEVudGl0eS5pc0EoXCJoZXJvXCIpICYmIHRoaXMuc2VsZWN0ZWRFbnRpdHkucGxheWVyID09IFwiaHVtYW5cIiovKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiYXNzaWduIG5ldyBtb3ZlIGpvYlwiLCBsYXN0UG9zKTtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkucmVzZXRKb2JzKCk7XG4gICAgICB0aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hKb2IobmV3IE1sTW92ZSh0aGlzLnNlbGVjdGVkRW50aXR5LCBsYXN0UG9zLCAwKSk7XG4vLyAgICAgICAgICB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iKG5ldyBKb2JzLm1sLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksbGFzdFBvcykpO1xuICAgICAgLy90aGlzLnNlbGVjdGVkRW50aXR5LnB1c2hIbEpvYihuZXcgSm9icy5obC5Nb3ZlKHRoaXMuc2VsZWN0ZWRFbnRpdHksIGxhc3RQb3MpKTtcbiAgICB9XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZDtcbiIsInZhciBBcnJheVR5cGUgPSB3aW5kb3cuRmxvYXQ2NEFycmF5IHx8IHdpbmRvdy5BcnJheTtcblxuZnVuY3Rpb24gY3JlYXRlTWFwKHcsIGgpIHtcbiAgcmV0dXJuIG5ldyBBcnJheVR5cGUodyAqIGgpO1xufVxuXG5jbGFzcyBIZWlnaHRNYXAge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICB3aWR0aDogMjU2LFxuICAgICAgaGVpZ2h0OiAyNTYsXG4gICAgICBtYXA6IHt9XG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLm1hcCA9IHRoaXMub3B0aW9ucy5tYXA7XG5cbiAgICBpZiAoIXRoaXMubWFwLnJvY2spIHtcbiAgICAgIHRoaXMubWFwLnJvY2sgPSBjcmVhdGVNYXAodGhpcy5vcHRpb25zLndpZHRoLCB0aGlzLm9wdGlvbnMuaGVpZ2h0KTtcbiAgICAgIHRoaXMuZ2VuZXJhdGUoKVxuICAgIH1cbiAgfTtcblxuICBnZXQgd2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy53aWR0aDtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gIH1cblxuICBnZW5lcmF0ZSgpIHtcbiAgICB2YXIgeCwgeTtcbiAgICB2YXIgcm9jayA9IHRoaXMuZ2V0KFwicm9ja1wiKTtcbiAgICBmb3IgKHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspXG4gICAgICBmb3IgKHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICAgIHZhciB2YWwgPSBNYXRoLnNpbih4ICogMC4zKSArIE1hdGguc2luKHkgKiAwLjE1KSAqIDIuMDsvLy90aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgICAgIHJvY2soeCwgeSwgdmFsKTtcbiAgICAgIH1cbiAgfTtcblxuICBnZXQodHlwZSkge1xuICAgIHZhciB3ID0gdGhpcy5vcHRpb25zLndpZHRoO1xuICAgIHZhciBhcnJheSA9IHRoaXMubWFwW3R5cGVdO1xuXG4gICAgdmFyIGZjdCA9IGZ1bmN0aW9uICh4LCB5LCB2YWwpIHtcbiAgICAgIHZhciBpID0geCArIHcgKiB5O1xuICAgICAgaWYgKHZhbClcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID0gdmFsO1xuICAgICAgcmV0dXJuIGFycmF5W2ldO1xuICAgIH07XG5cbiAgICBmY3QuaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgdmFyIGZ4ID0gTWF0aC5mbG9vcih4KTtcbiAgICAgIHZhciBmeSA9IE1hdGguZmxvb3IoeSk7XG4gICAgICB2YXIgdjAwID0gdGhpcyhmeCwgZnkpO1xuICAgICAgdmFyIHYwMSA9IHRoaXMoZngsIGZ5ICsgMSk7XG4gICAgICB2YXIgdjEwID0gdGhpcyhmeCArIDEsIGZ5KTtcbiAgICAgIHZhciB2MTEgPSB0aGlzKGZ4ICsgMSwgZnkgKyAxKTtcbiAgICAgIHZhciBkeCA9IHggLSBmeDtcbiAgICAgIHZhciBkeSA9IHkgLSBmeTtcbiAgICAgIHJldHVybiAodjAwICogKDEgLSBkeCkgKyB2MTAgKiBkeCkgKiAoMSAtIGR5KSArICh2MDEgKiAoMSAtIGR4KSArIHYxMSAqIGR4KSAqIGR5O1xuICAgIH07XG5cbiAgICByZXR1cm4gZmN0O1xuICB9O1xuXG4gIHBpY2tHcmVlbih3LCBoLCBkYXRhKSB7XG4gICAgdmFyIGEgPSBuZXcgQXJyYXkodyAqIGgpO1xuICAgIHZhciB4LCB5O1xuICAgIGZvciAoeSA9IDA7IHkgPCBoOyB5KyspIHtcbiAgICAgIGZvciAoeCA9IDA7IHggPCB3OyB4KyspIHtcbiAgICAgICAgYVt5ICogdyArIHhdID0gZGF0YVsoeSAqIHcgKyB4KSAqIDQgKyAxXSAqIDAuMjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGE7XG4gIH07XG5cblxuICB0b1RocmVlVGVycmFpbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChnLCBvcHRpb25zKSB7XG4gICAgICBjb25zdCB4bCA9IG9wdGlvbnMueFNlZ21lbnRzICsgMSxcbiAgICAgICAgeWwgPSBvcHRpb25zLnlTZWdtZW50cyArIDE7XG4gICAgICBjb25zdCByb2NrID0gc2VsZi5nZXQoXCJyb2NrXCIpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB4bDsgaSsrKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgeWw7IGorKykge1xuICAgICAgICAgIGdbKHlsIC0gaiAtIDEpICogeGwgKyBpXS56ICs9IHJvY2soaSwgaik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8qXG4gICAgICB0b1RleHR1cmUoKSB7XG4gICAgICAgICAgLy8gVU5URVNURUQgISEhIVxuICAgICAgICAgIHZhciByYW1wVGV4ID0gbmV3IFRIUkVFLkRhdGFUZXh0dXJlKGRhdGEucGl4ZWxzLCBkYXRhLndpZHRoLCBkYXRhLmhlaWdodCwgVEhSRUUuUkdCQUZvcm1hdCk7XG4gICAgICAgICAgcmFtcFRleC5uZWVkc1VwZGF0ZSA9IHRydWU7XG4gICAgICB9O1xuICAqL1xuXG4vLyBGSVhNRSB0aGlzIHNob3VsZCBtb3ZlZCBzb21ld2hlcmUgZWxzZVxuICB0b0NhbnZhcyhfdHlwZSkge1xuICAgIHZhciB0eXBlID0gX3R5cGUgfHwgXCJyb2NrXCI7XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLFxuICAgICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGNhbnZhcy53aWR0aCA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gdGhpcy5vcHRpb25zLmhlaWdodDtcbiAgICB2YXIgZCA9IGNvbnRleHQuY3JlYXRlSW1hZ2VEYXRhKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCksXG4gICAgICBkYXRhID0gZC5kYXRhO1xuICAgIHZhciBtaW4sIG1heDtcbiAgICB2YXIgYWNjZXNzb3IgPSB0aGlzLmdldCh0eXBlKTtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLm9wdGlvbnMud2lkdGg7IHgrKykge1xuICAgICAgICB2YXIgdiA9IGFjY2Vzc29yKHgsIHkpO1xuXG4gICAgICAgIGlmICghbWluIHx8IG1pbiA+IHYpXG4gICAgICAgICAgbWluID0gdjtcbiAgICAgICAgaWYgKCFtYXggfHwgbWF4IDwgdilcbiAgICAgICAgICBtYXggPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIk1NTU1cIiwgbWluLCBtYXgpO1xuXG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLm9wdGlvbnMuaGVpZ2h0OyB5KyspIHtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy5vcHRpb25zLndpZHRoOyB4KyspIHtcbiAgICAgICAgdmFyIGkgPSB5ICogdGhpcy5vcHRpb25zLmhlaWdodCArIHg7XG4gICAgICAgIGlkeCA9IGkgKiA0O1xuICAgICAgICBkYXRhW2lkeF0gPSBkYXRhW2lkeCArIDFdID0gZGF0YVtpZHggKyAyXSA9IE1hdGgucm91bmQoKChhY2Nlc3Nvcih4LCB5KSAtIG1pbikgLyAobWF4IC0gbWluKSkgKiAyNTUpO1xuICAgICAgICBkYXRhW2lkeCArIDNdID0gMjU1O1xuICAgICAgfVxuICAgIH1cbiAgICBjb250ZXh0LnB1dEltYWdlRGF0YShkLCAwLCAwKTtcbiAgICByZXR1cm4gY2FudmFzO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEhlaWdodE1hcDtcbiIsImZ1bmN0aW9uIGFqYXgodXJsLCBtZXRob2QgPSBcIkdFVFwiLCBkYXRhID0ge30pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgcmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09PSBYTUxIdHRwUmVxdWVzdC5ET05FKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPD0gMjk5ICYmIHJlcXVlc3Quc3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVTUE9OU0VcIiwgcmVxdWVzdCwgdHlwZW9mIHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVxdWVzdC5yZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QocmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcignTmV0d29yayBFcnJvcicpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICAgIHJlcXVlc3Quc2VuZChkYXRhKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYWpheDsiLCJpbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuL3ZlY3RvcjJcIjtcblxudmFyIHVpZCA9IDExMTEwO1xuXG5jbGFzcyBFbnRpdHkge1xuICBjb25zdHJ1Y3RvcihoZWlnaHRtYXAsIG9wcykge1xuXG4gICAgdmFyIGVudGl0eSA9IG9wcy5lbnRpdHlUeXBlc1tvcHMudHlwZV07XG4gICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIkVudGl0eTogTm8gRW50aXR5LVR5cGUgbmFtZWQgXCIgKyBvcHMudHlwZSArIFwiIGZvdW5kIVwiKTtcbiAgICAgIGVudGl0eSA9IHt9O1xuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGVudGl0eSk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBvcHMpO1xuICAgIC8vIEZJWE1FOiByZWR1Y2UgY29tcGxleGl0eSBhbmQgcmVmZXJlbmNlcyBieSByZW1vdmluZyBtb2RlbHMsIG1hcCBhbmQgc28gPz8/XG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMucG9zID0gbmV3IFZlY3RvcjIoKS5jb3B5KHRoaXMucG9zKTtcbiAgICB0aGlzLnR5cGVOYW1lID0gdGhpcy50eXBlO1xuICAgIHRoaXMudWlkID0gdWlkKys7XG4gICAgdGhpcy5tYXAgPSBoZWlnaHRtYXA7XG4gICAgLy8gY2xvbmVcbiAgICB0aGlzLnJlc291cmNlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMucmVzb3VyY2VzKTtcbiAgICB0aGlzLnR5cGUgPSBlbnRpdHk7XG4gICAgaWYgKCF0aGlzLm1lc2hOYW1lKVxuICAgICAgdGhpcy5tZXNoTmFtZSA9IFwiZGVmYXVsdFwiO1xuXG4gICAgaWYgKGVudGl0eS5taXhpbnMpIHtcbiAgICAgIHRoaXMubWl4aW5zID0ge307XG4gICAgICB0aGlzLm1peGluTmFtZXMgPSBbXTtcbiAgICAgIHRoaXMubWl4aW5EZWYgPSBlbnRpdHkubWl4aW5zO1xuICAgICAgZW50aXR5Lm1peGlucy5mb3JFYWNoKG1peGluID0+IHtcbiAgICAgICAgdmFyIGZvdW5kID0gb3BzLm1peGluRGVmc1ttaXhpbl07XG4gICAgICAgIGlmIChmb3VuZCAmJiBmb3VuZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgZm91bmQgPSBmb3VuZCgpO1xuICAgICAgICAgIHRoaXMubWl4aW5zW21peGluXSA9IGZvdW5kO1xuICAgICAgICAgIHRoaXMubWl4aW5OYW1lcy5wdXNoKG1peGluKTtcbiAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIGZvdW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIk1peGluIG5vdCBmb3VuZFwiLCBtaXhpbilcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIGdldCBpZCgpIHtcbiAgICByZXR1cm4gdGhpcy51aWRcbiAgfVxuXG4gIHJ1blBvc3RMb2FkKCkge1xuICAgIGZvciAodmFyIG1peGluIGluIHRoaXMubWl4aW5zKSB7XG4gICAgICBpZiAodGhpcy5taXhpbnNbbWl4aW5dLnBvc3RMb2FkKSB7XG4gICAgICAgIHRoaXMubWl4aW5zW21peGluXS5wb3N0TG9hZC5hcHBseSh0aGlzLCBbXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNBKG1peGluKSB7XG4gICAgcmV0dXJuIHRoaXMubWl4aW5EZWYuaW5kZXhPZihtaXhpbikgPj0gMDtcbiAgfVxuXG4gIGFzeW5jIHNldFNjZW5lKHNjZW5lKSB7XG4gICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnNldE1lc2godGhpcy5tZXNoTmFtZSk7XG4gIH07XG5cbiAgY29tcHV0ZU1lc2hQb3MoKSB7XG4gICAgY29uc3QgaCA9IHRoaXMubWFwLmdldChcInJvY2tcIikuaW50ZXJwb2xhdGUodGhpcy5wb3MueCwgdGhpcy5wb3MueSk7XG4gICAgcmV0dXJuIHt4OiB0aGlzLnBvcy54LCB5OiBoLCB6OiAtdGhpcy5wb3MueX07XG4gIH1cblxuICB1cGRhdGVNZXNoUG9zKCkge1xuICAgIGlmICh0aGlzLm1lc2gpIHtcbiAgICAgIGlmICh0aGlzLm1lc2ggJiYgdGhpcy5tZXNoLnJvdGF0aW9uICYmIHRoaXMucm90YXRpb24pIHtcbiAgICAgICAgdGhpcy5tZXNoLnJvdGF0aW9uLnkgPSB0aGlzLnJvdGF0aW9uO1xuICAgICAgfVxuICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmNvbXB1dGVNZXNoUG9zKCk7XG4gICAgICB0aGlzLm1lc2guc2V0UG9zKHBvc2l0aW9uLngsIHBvc2l0aW9uLnksIHBvc2l0aW9uLnopO1xuICAgIH1cbiAgfTtcblxuICBnZXRNZXNoRGVmKCkge1xuICAgIGNvbnN0IGVudGl0eSA9IHRoaXMudHlwZTtcbiAgICB2YXIgbWVzaFR5cGU7XG4gICAgdmFyIGFuaW1hdGlvbjtcblxuICAgIGlmICh0aGlzLnR5cGUubWVzaGVzKSB7XG4gICAgICB2YXIgZGVmID0gZW50aXR5Lm1lc2hlc1t0aGlzLm1lc2hOYW1lXTtcbiAgICAgIGlmICghZGVmKVxuICAgICAgICBjb25zb2xlLndhcm4oXCJObyBNZXNoIG9mIG5hbWUgJ1wiICsgbmFtZSArIFwiJyBmb3VuZCBpbiBlbnRpdHktZGVmXCIsIGVudGl0eSk7XG4gICAgICBtZXNoVHlwZSA9IGRlZi5tZXNoO1xuICAgICAgYW5pbWF0aW9uID0gZGVmLmFuaW1hdGlvbjtcbiAgICB9IGVsc2UgaWYgKGVudGl0eS5tZXNoKSB7XG4gICAgICBtZXNoVHlwZSA9IGVudGl0eS5tZXNoO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNoVHlwZSA9IHRoaXMudHlwZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiB7bWVzaFR5cGUsIGFuaW1hdGlvbn07XG4gIH1cblxuICBzZXRNZXNoKG5hbWUpIHtcblxuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLm1lc2hOYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB7bWVzaFR5cGUsIGFuaW1hdGlvbn0gPSB0aGlzLmdldE1lc2hEZWYoKTtcblxuICAgIHJldHVybiB0aGlzLm1vZGVsTG9hZGVyLmxvYWQobWVzaFR5cGUsIGFuaW1hdGlvbikudGhlbigobWVzaCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJNT0RFTCBsb2FkZWRcIiwgbWVzaCwgbWVzaFR5cGUsIGFuaW1hdGlvbiwgdGhpcy5zY2VuZSk7XG4gICAgICBtZXNoLmF0dGFjaFRvU2NlbmUodGhpcy5zY2VuZSk7XG5cbiAgICAgIGlmICh0aGlzLm1lc2gpIHtcbiAgICAgICAgdGhpcy5tZXNoLnJlbW92ZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5tZXNoID0gbWVzaDtcbiAgICAgIG1lc2guc2V0RW50aXR5KHRoaXMpO1xuICAgICAgdGhpcy51cGRhdGVNZXNoUG9zKCk7XG4gICAgICBpZiAodGhpcy5hbmltYXRpb25GaW5pc2hlZCkge1xuICAgICAgICB0aGlzLm1lc2guYW5pbWF0aW9uRmluaXNoZWQgPSB0aGlzLmFuaW1hdGlvbkZpbmlzaGVkLmJpbmQodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLm1lc2guaG92ZXJlZCh0aGlzLnN0YXRlLmhvdmVyZWQpO1xuICAgICAgdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQpO1xuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9KTtcbiAgfTtcblxuICBob3ZlcmVkKHZhbCkge1xuICAgIHJldHVybiB0aGlzLm1lc2guaG92ZXJlZCh0aGlzLnN0YXRlLmhvdmVyZWQgPSB2YWwpO1xuICB9O1xuXG4gIHNlbGVjdGVkKHZhbCkge1xuICAgIHJldHVybiB0aGlzLm1lc2guc2VsZWN0ZWQodGhpcy5zdGF0ZS5zZWxlY3RlZCA9IHZhbCk7XG4gIH07XG5cbiAgaW5jcmVhc2VCeSh3aGF0LCBhbW91bnQpIHtcbiAgICB0aGlzLnJlc291cmNlc1t3aGF0XSA9ICh0aGlzLnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgfTtcblxuICB0YWtlKHdoYXQsIGFtb3VudCkge1xuICAgIGlmICh0aGlzLnJlc291cmNlc1t3aGF0XSA+PSBhbW91bnQpIHtcbiAgICAgIHRoaXMucmVzb3VyY2VzW3doYXRdIC09IGFtb3VudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgZ2l2ZSh3aGF0LCBhbW91bnQsIHRvRW50aXR5KSB7XG4gICAgaWYgKHRoaXMucmVzb3VyY2VzW3doYXRdID49IGFtb3VudCkge1xuICAgICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gLT0gYW1vdW50O1xuICAgICAgY29uc29sZS5kZWJ1ZyhcIkdJVkUgVE9cIiwgdG9FbnRpdHksIHdoYXQpO1xuICAgICAgdG9FbnRpdHkucmVzb3VyY2VzW3doYXRdID0gKHRvRW50aXR5LnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IHtFbnRpdHl9XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIFwiYmFrZXJ5XCI6IHtcbiAgICBcIm1lc2hcIjogXCJiYWtlcnkzXCJcbiAgfSxcbiAgXCJiaWdfc3RvbmVcIjoge1xuICAgIFwibWVzaFwiOiBcImJpZ19zdG9uZTNcIlxuICB9LFxuICBcImNyb3Bfc21hbGxcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfbWVkXCI6IHtcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWUsXG4gICAgXCJzY2FsZVwiOiAyLjJcbiAgfSxcbiAgXCJjcm9wX2hpZ2hcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfdGlueVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiY3JvcF90aW55MlwiLFxuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImZhcm1cIjoge1xuICAgIFwibWVzaFwiOiBcImZhcm0yXCJcbiAgfSxcbiAgXCJmaXNoaW5nX2h1dFwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlzaGluZ19odXQyXCIsXG4gIH0sXG4gIFwiZ3JhdmVcIjoge1xuICAgIFwibWVzaFwiOiBcImdyYXZlMlwiXG4gIH0sXG4gIFwiaGVyb1wiOiB7XG4gICAgXCJtZXNoXCI6IFwiaGVyb19scDJcIlxuICB9LFxuICBcIm1pbmVcIjoge1xuICAgIFwibWVzaFwiOiBcIm1pbmUzXCJcbiAgfSxcbiAgXCJtaWxsXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtaWxsXCIsXG4gICAgXCJzY2FsZVwiOiAxXG4gIH0sXG4gIFwidG93bmhhbGxcIjoge1xuICAgIFwibWVzaFwiOiBcInRvd25oYWxsX3RyeTNcIlxuICB9LFxuICBcInRvd2VyXCI6IHtcbiAgICBcIm1lc2hcIjogXCJ0b3dlcjJcIlxuICB9LFxuICBcIm1hbl9waWNrXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fcGlja1wiLFxuICAgIFwidGV4dHVyZVwiOiBcIm1hbl9maWdodC5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiA0NSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDgsXG4gICAgICAgIFwiZXZlbnRzXCI6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBcInRpbWVcIjogMzUsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwaWNrXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWFuX2F4ZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2F4ZVwiLFxuICAgIFwidGV4dHVyZVwiOiBcIm1hbl9maWdodC5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDQwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAzNSxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAyNyxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBpY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fZV93YWxrXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcInNpdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDMwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMjAsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogMjAsXG4gICAgICAgIFwiYW5pbWF0ZVwiOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIFwic2l0ZG93blwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAxOCxcbiAgICAgICAgXCJsb29wXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJzdGFuZFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDAsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDBcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAzMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDY1XG4gICAgICB9LFxuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMTAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA2NVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fZmlnaHRcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9maWdodFwiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJmaWdodFwiOiB7XG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDQxLFxuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAxOCxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN3b3JkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAzNSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN3b3JkXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAyMCxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInVnaFwiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcImZpclwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlyNFwiXG4gIH0sXG4gIFwiZmlyX29sZFwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmlyMlwiLFxuICAgIFwidGV4dHVyZVwiOiBcImZpcjUucG5nXCIsXG4gICAgXCJzY2FsZVwiOiAwLjQyLFxuICAgIFwiZG91Ymxlc2lkZWRcIjogdHJ1ZSxcbiAgICBcInRyYW5zcGFyZW50XCI6IHRydWVcbiAgfSxcblxuICBcInRyZWVcIjoge1xuICAgIFwibWVzaFwiOiBcInRyZWU1XCIsXG4gICAgXCJzY2FsZVwiOiAwLjIsXG4gICAgXCJkb3VibGVzaWRlZFwiOiB0cnVlXG4gIH0sXG4gIFwic2hlZXBcIjoge1xuICAgIFwic2NhbGVcIjogMC4xNSxcbi8vICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwidGV4dHVyZVwiOiBcInNoZWVwLnBuZ1wiLFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDVcbiAgICAgIH0sXG4gICAgICBcImVhdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJsb29wXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNjAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAxMDBcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwid2VsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwid2VsbFwiXG4gIH0sXG4gIFwid29ya3Nob3BcIjoge1xuICAgIFwibWVzaFwiOiBcIndvcmtzaG9wMlwiLFxuICAgIFwicGFydGljbGVzXCI6IHtcbiAgICAgIFwic21va2VcIjoge1xuICAgICAgICBcInBvc2l0aW9uXCI6IHtcbiAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICBcInpcIjogMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJjb25zdCBvbmx5T25lQXRBVGltZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHdpdGhpbiA9IGZhbHNlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoZmN0KSB7XG4gICAgICAgIGlmICh3aXRoaW4pIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gb25seU9uZUF0QVRpbWUoZmN0KSwgMTApXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aXRoaW49dHJ1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZmN0KCk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHdpdGhpbiA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkoKTtcblxuXG5jbGFzcyBNb2RlbCB7XG4gICAgY29uc3RydWN0b3IoaW5uZXJNZXNoZXMsIG91dGVyTm9kZSwgaG92ZXJSaW5nLCBzZWxlY3RSaW5nKSB7XG4gICAgICAgIHRoaXMuaW5uZXJNZXNoZXMgPSBpbm5lck1lc2hlcztcbiAgICAgICAgdGhpcy5vdXRlck5vZGUgPSBvdXRlck5vZGU7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5yb3RhdGlvbiA9IHRoaXMub3V0ZXJOb2RlLnJvdGF0aW9uO1xuICAgICAgICB0aGlzLmhvdmVyUmluZyA9IGhvdmVyUmluZztcbiAgICAgICAgdGhpcy5zZWxlY3RSaW5nID0gc2VsZWN0UmluZztcbiAgICB9XG5cbiAgICBhdHRhY2hUb1NjZW5lKHNjZW5lKSB7XG4gICAgICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICAgICAgaWYoZmFsc2UpIHtcbiAgICAgICAgICAgIG9ubHlPbmVBdEFUaW1lKCgpID0+IHNjZW5lLmFkZCh0aGlzLm91dGVyTm9kZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NlbmUuYWRkKHRoaXMub3V0ZXJOb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0RW50aXR5KGVudGl0eSkge1xuICAgICAgICBfLmVhY2godGhpcy5pbm5lck1lc2hlcywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIG0udXNlckRhdGEuZW50aXR5ID0gZW50aXR5O1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIGhvdmVyZWQodmFsKSB7XG4gICAgICAgIGlmICh2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5ob3ZlclJpbmcudmlzaWJsZSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5ob3ZlclJpbmcudmlzaWJsZTtcbiAgICB9XG5cbiAgICBzZWxlY3RlZCh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdFJpbmcudmlzaWJsZSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RSaW5nLnZpc2libGU7XG4gICAgfVxuXG4gICAgZGV0YWNoRnJvbVNjZW5lKCkge1xuICAgICAgICBzY2VuZS5yZW1vdmUodGhpcy5vdXRlck5vZGUpXG4gICAgfVxuXG4gICAgc2V0UG9zKHgsIHksIHopIHtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueCA9IHg7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnkgPSB5O1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi56ID0gejtcbiAgICB9XG5cbiAgICBlbmFibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAoIXRoaXMuZW1pdHRlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIEVOQUJMRVwiKTtcbiAgICAgICAgICAgIHZhciBlbWl0dGVyID0gdGhpcy5lbWl0dGVyID0gdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKCk7IC8vYWRkRW1pdHRlciggQmFzZS5tYWtlRW1pdHRlcihuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCkpKTtcbiAgICAgICAgICAgIGVtaXR0ZXIucG9zaXRpb24udmFsdWUgPSB0aGlzLnBvc2l0aW9uXG4gICAgICAgICAgICBlbWl0dGVyLmVuYWJsZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGlzYWJsZVBhcnRpY2xlcyh0eXBlKSB7XG4gICAgICAgIGlmICh0aGlzLmVtaXR0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5kaXNhYmxlKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVsIC0gRElTQUJMRVwiLCB0eXBlKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmVtaXR0ZXI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW1vdmUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUkVNT1ZFIE1FIEZST00gU0NFTkVcIiwgdGhpcyk7XG4gICAgICAgIC8vIGhvb2sgdG8gcmVtb3ZlIGFuaW1hdGlvbi1yZXN0YXJ0ZXItaW50ZXJ2YWxcbiAgICAgICAgaWYgKHRoaXMuaW5uZXJNZXNoZXMgJiYgdGhpcy5pbm5lck1lc2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBfLmVhY2godGhpcy5pbm5lck1lc2hlcywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICBpZiAobS5iZWZvcmVSZW1vdmUpXG4gICAgICAgICAgICAgICAgICAgIG0uYmVmb3JlUmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNjZW5lLnJlbW92ZSh0aGlzLm91dGVyTm9kZSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLm91dGVyTm9kZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vZGVsOyIsImltcG9ydCBNZXNoZXMgZnJvbSBcIi4uL2NvbmZpZy9tZXNoZXNcIlxuaW1wb3J0IE1vZGVsIGZyb20gXCIuL21vZGVsXCJcblxuLy8gRklYTUU6IG5vdCBuZWVkZWQgYW55bW9yZT9cbmZ1bmN0aW9uIGVuc3VyZUxvb3AoYW5pbWF0aW9uKSB7XG4gIHJldHVybjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmltYXRpb24uaGllcmFyY2h5Lmxlbmd0aDsgaSsrKSB7XG5cbiAgICB2YXIgYm9uZSA9IGFuaW1hdGlvbi5oaWVyYXJjaHlbaV07XG5cbiAgICB2YXIgZmlyc3QgPSBib25lLmtleXNbMF07XG4gICAgdmFyIGxhc3QgPSBib25lLmtleXNbYm9uZS5rZXlzLmxlbmd0aCAtIDFdO1xuXG4gICAgbGFzdC5wb3MgPSBmaXJzdC5wb3M7XG4gICAgbGFzdC5yb3QgPSBmaXJzdC5yb3Q7XG4gICAgbGFzdC5zY2wgPSBmaXJzdC5zY2w7XG4gIH1cbn1cblxuY2xhc3MgTW9kZWxMb2FkZXIge1xuXG4gIGNvbnN0cnVjdG9yKGxvYWRlcnMgPSB7fSwgbWFuYWdlciA9IG51bGwsIG1lc2hlcyA9IG51bGwpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIF8ucGljayhsb2FkZXJzLCBbJ2ltYWdlTG9hZGVyJ10pKTtcblxuICAgIGlmICghbWFuYWdlciAmJiBUSFJFRS5Mb2FkaW5nTWFuYWdlcikge1xuICAgICAgbWFuYWdlciA9IG5ldyBUSFJFRS5Mb2FkaW5nTWFuYWdlcigpO1xuICAgIH1cbiAgICBpZiAobWVzaGVzICE9IG51bGwpIHtcbiAgICAgIHRoaXMubWVzaGVzID0gbWVzaGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1lc2hlcyA9IE1lc2hlcztcbiAgICB9XG4gICAgbWFuYWdlci5vblByb2dyZXNzID0gZnVuY3Rpb24gKGl0ZW0sIGxvYWRlZCwgdG90YWwpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoXCJtYW5hZ2VyLm9uUHJvZ3Jlc3NcIiwgaXRlbSwgbG9hZGVkLCB0b3RhbCk7XG4gICAgfTtcblxuICAgIGlmICghdGhpcy5pbWFnZUxvYWRlciAmJiBUSFJFRS5JbWFnZUxvYWRlcikge1xuICAgICAgdGhpcy5pbWFnZUxvYWRlciA9IG5ldyBUSFJFRS5JbWFnZUxvYWRlcihtYW5hZ2VyKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZ2x0ZkxvYWRlciAmJiBUSFJFRS5HTFRGTG9hZGVyKSB7XG4gICAgICB0aGlzLmdsdGZMb2FkZXIgPSBuZXcgVEhSRUUuR0xURkxvYWRlcigpO1xuICAgIH1cblxuICAgIC8vIEZJWE1FOiBhZGQgY2FjaGluZyBsYXRlciBvblxuXG4gICAgaWYgKCF0aGlzLnRleHR1cmVMb2FkZXIgJiYgVEhSRUUuVGV4dHVyZUxvYWRlcikge1xuICAgICAgdGhpcy50ZXh0dXJlTG9hZGVyID0gbmV3IFRIUkVFLlRleHR1cmVMb2FkZXIoKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlUmluZyhjb2xvcikge1xuICAgIGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IGNvbG9yLFxuICAgICAgZmxhdFNoYWRpbmc6IFRIUkVFLkZsYXRTaGFkaW5nLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjUsXG4gICAgICBkZXB0aFRlc3Q6IGZhbHNlLFxuICAgICAgZGVwdGhXcml0ZTogZmFsc2VcbiAgICB9KTtcbiAgICBjb25zdCBzb21lUmluZyA9IG5ldyBUSFJFRS5NZXNoKG5ldyBUSFJFRS5SaW5nR2VvbWV0cnkoMS4zLCAyLCAyMCwgNSwgMCwgTWF0aC5QSSAqIDIpLCBtYXRlcmlhbCk7XG4gICAgc29tZVJpbmcucG9zaXRpb24uc2V0KDAsIDAuNSwgMC4wKTtcbiAgICBzb21lUmluZy5yb3RhdGVPbkF4aXMobmV3IFRIUkVFLlZlY3RvcjMoMSwgMCwgMCksIC0xLjYpO1xuICAgIHNvbWVSaW5nLnZpc2libGUgPSBmYWxzZTtcbiAgICByZXR1cm4gc29tZVJpbmdcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVCb3goKSB7XG4gICAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICBjb2xvcjogMHhkZDk5MDAsXG4gICAgICBmbGF0U2hhZGluZzogVEhSRUUuRmxhdFNoYWRpbmcsXG4gICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgIG9wYWNpdHk6IDAuNVxuICAgIH0pO1xuICAgIHJldHVybiBuZXcgVEhSRUUuTWVzaChuZXcgVEhSRUUuQm94R2VvbWV0cnkoMSwgMSwgMSksIG1hdGVyaWFsKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWQobWVzaE5hbWUsIGFuaW1hdGlvbk5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5sb2FkVW5jYWNoZWQobWVzaE5hbWUsIGFuaW1hdGlvbk5hbWUpLnRoZW4odGhpcy5wYWNrSW50b05vZGUuYmluZCh0aGlzKSlcbiAgfVxuXG4gIGFzeW5jIHBhY2tJbnRvTm9kZShvcHRpb25zKSB7XG4gICAgY29uc3Qge21lc2hEZWYsIG1lc2gsIG1lc2hOYW1lfSA9IG9wdGlvbnM7XG4gICAgdmFyIG9iamVjdHM7XG4gICAgaWYgKG1lc2guc2NlbmUpIHtcbiAgICAgIG9iamVjdHMgPSBtZXNoLnNjZW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RzID0gbWVzaC5jbG9uZSgpO1xuICAgIH1cbiAgICAvL2xldCBvYmplY3RzID0gbWVzaC5zY2VuZVxuXG4gICAgb2JqZWN0cyA9IF8uZmxhdHRlbihbb2JqZWN0c10pO1xuXG4gICAgLy8gZW5jbG9zZSBtZXNoIHdpdGhpbiBzY2VuZS1ub2RlLCBzbyB0aGF0IGl0IGNhbiBiZSByb3RhdGVkIGFuZCB0aGVyZSBjYW4gYmUgc2V2ZXJhbCBtZXNoZXNcbiAgICAvLyBhdHRhY2hlZCB0byBvbmUgZW50aXR5XG4gICAgY29uc3Qgbm9kZSA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXG4gICAgXy5lYWNoKG9iamVjdHMsIGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgIG5vZGUuYWRkKG9iamVjdCk7XG4gICAgfSk7XG4gICAgY29uc3QgbmV3TW9kZWwgPSBuZXcgTW9kZWwob2JqZWN0cywgbm9kZSk7XG5cbiAgICBuZXdNb2RlbC5uYW1lID0gbWVzaDtcbiAgICBuZXdNb2RlbC50eXBlID0gbWVzaE5hbWU7XG5cbiAgICB0aGlzLmFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKTtcblxuICAgIHJldHVybiBuZXdNb2RlbFxuICB9XG5cbiAgYWRkUmluZ3Mobm9kZSwgbmV3TW9kZWwpIHtcbiAgICBub2RlLmFkZChuZXdNb2RlbC5ob3ZlclJpbmcgPSBNb2RlbExvYWRlci5jcmVhdGVSaW5nKDB4ZGQ5OTAwKSk7XG4gICAgbm9kZS5hZGQobmV3TW9kZWwuc2VsZWN0UmluZyA9IE1vZGVsTG9hZGVyLmNyZWF0ZVJpbmcoMHhGRjk5MDApKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRVbmNhY2hlZChtZXNoLCBhbmltYXRpb24pIHtcbiAgICBjb25zdCBtZXNoRGVmID0gdGhpcy5tZXNoZXNbbWVzaF07XG4gICAgaWYgKCFtZXNoRGVmKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJObyBNZXNoIGRlZmluZWQgZm9yIG5hbWUgJ1wiICsgbWVzaCArIFwiJ1wiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkT2JqQ29tcGxldGUobWVzaCwgYW5pbWF0aW9uKVxuICB9XG5cbiAgYXN5bmMgbG9hZE9iaihtZXNoTmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgIGlmICh0aGlzLmdsdGZMb2FkZXIpIHtcbiAgICAgICAgdGhpcy5nbHRmTG9hZGVyLmxvYWQoXG4gICAgICAgICAgJ21vZGVscy8nICsgbWVzaE5hbWUgKyAnLmdsdGYnLFxuICAgICAgICAgIG1lc2ggPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSh7bWVzaCwgbWVzaE5hbWV9KVxuICAgICAgICAgIH0sXG4gICAgICAgICAgKHhocikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzaE5hbWUgKyBcIiBcIiArICh4aHIubG9hZGVkIC8geGhyLnRvdGFsICogMTAwKSArICclIGxvYWRlZCcpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRPYmpDb21wbGV0ZShuYW1lLCBkdW1teSkge1xuICAgIGNvbnN0IG1lc2hEZWYgPSB0aGlzLm1lc2hlc1tuYW1lXTtcbiAgICBjb25zdCBtZXNoTmFtZSA9IChtZXNoRGVmICYmIG1lc2hEZWYubWVzaCkgfHwgbmFtZTtcbiAgICBjb25zb2xlLmxvZyhcIkxvYWQgdGV4dHVyZVwiLCBuYW1lLCBtZXNoTmFtZSk7XG4gICAgY29uc3QgbWVzaE9iamVjdCA9IGF3YWl0IHRoaXMubG9hZE9iaihtZXNoTmFtZSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIk1PREVMT0JKRUNUIFwiLCBuYW1lLCBtZXNoT2JqZWN0KTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHttZXNoRGVmfSwgbWVzaE9iamVjdCk7XG4gIH1cblxuICAvLyBhbmltYXRlIChjbG9uZWQpIG1lc2hcbiAgYW5pbWF0ZShtZXNoLCBuYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gbmV3IFRIUkVFLkFuaW1hdGlvbihtZXNoLCBhbmltYXRpb25zW25hbWVdKTtcbiAgICBhbmltYXRpb24uZGF0YSA9IGFuaW1hdGlvbnNbbmFtZV07XG4gICAgY29uc3Qgc2NhbGUgPSBvcHRpb25zLnRpbWVTY2FsZSB8fCAxO1xuXG4gICAgaWYgKG9wdGlvbnMubG9vcCA9PT0gZmFsc2UpIHtcbiAgICAgIGFuaW1hdGlvbi5sb29wID0gZmFsc2U7XG4gICAgfVxuICAgIGFuaW1hdGlvbi50aW1lU2NhbGUgPSBzY2FsZTtcbiAgICBhbmltYXRpb24ucGxheSgpO1xuXG4gICAgLy8gaW1wbGVtZW50IHN1cHBvcnQgZm9yIGxvb3BpbmcgaW50ZXJ2YWwgd2l0aGluIGdsb2JhbCBhbmltYXRpb25cbiAgICAvLyBoYXZlIGEgbG9vayBhdCBlbnRpdHkgYWxzb1xuICAgIGlmIChvcHRpb25zLnN0YXJ0RnJhbWUpIHtcbiAgICAgIC8vYW5pbWF0aW9uLnVwZGF0ZSggb3B0aW9ucy5zdGFydEZyYW1lKTtcbiAgICAgIGlmIChvcHRpb25zLmFuaW1hdGUgPT09IGZhbHNlICYmIGZhbHNlKSB7XG4gICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgIGFuaW1hdGlvbi51cGRhdGUob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5lbmRGcmFtZSkge1xuICAgICAgICB2YXIgc3RhcnRBbmltYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYW5pbWF0aW9uLnBsYXkob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHN0b3BBbmltYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkFOSU1BTCBzdG9wQU5pbWF0aW9uXCIsIG1lc2gsIG1lc2guYW5pbWF0aW9uRmluaXNoZWQpO1xuICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgaWYgKG1lc2gudXNlckRhdGEgJiYgbWVzaC51c2VyRGF0YS5lbnRpdHkgJiYgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQpXG4gICAgICAgICAgICBtZXNoLnVzZXJEYXRhLmVudGl0eS5hbmltYXRpb25GaW5pc2hlZCgpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgdGltZSA9IDEwMDAgKiAob3B0aW9ucy5lbmRGcmFtZSAtIG9wdGlvbnMuc3RhcnRGcmFtZSkgLyBzY2FsZTtcbiAgICAgICAgc3RhcnRBbmltYXRpb24oKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubG9vcCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChzdGFydEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgbWVzaC5iZWZvcmVSZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiQU5JTUFMIERPTlQgTE9PUFwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChzdG9wQW5pbWF0aW9uLCB0aW1lKTtcbiAgICAgICAgICBtZXNoLmJlZm9yZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoaW50ZXJ2YWwpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgfVxuICAgIH0gZWxzZVxuICAgICAgYW5pbWF0aW9uLnVwZGF0ZShNYXRoLnJhbmRvbSgpICogMTApO1xuICB9XG5cbiAgbG9hZEpTT04obmFtZSwgYW5pbWF0aW9uKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLm1lc2hlc1tuYW1lXSk7XG5cbiAgICAvLyBub3cgb3ZlcnJpZGUgd2l0aCBvcHRpb25zIGZyb20gYW5pbWF0aW9ucy1wYXJ0XG4gICAgaWYgKG9wdGlvbnMuYW5pbWF0aW9uc1thbmltYXRpb25dKSB7XG4gICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCBvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zb2xlLmRlYnVnKFwiTG9hZGluZyBtb2RlbFwiLCBuYW1lKTtcblxuICAgICAgdmFyIHRleHR1cmUgPSBuZXcgVEhSRUUuVGV4dHVyZSgpO1xuICAgICAgdGhpcy5qc29uTG9hZGVyLmxvYWQoJ21vZGVscy8nICsgbmFtZSArICcuanNvbicsIGZ1bmN0aW9uIChnZW9tZXRyeSwgbWF0ZXJpYWxzKSB7XG5cbiAgICAgICAgZ2VvbWV0cnkuY29tcHV0ZVZlcnRleE5vcm1hbHMoKTtcbiAgICAgICAgZ2VvbWV0cnkuY29tcHV0ZUJvdW5kaW5nQm94KCk7XG5cbiAgICAgICAgZW5zdXJlTG9vcChnZW9tZXRyeS5hbmltYXRpb24pO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBtYXRlcmlhbHMubGVuZ3RoOyBpIDwgaWw7IGkrKykge1xuXG4gICAgICAgICAgdmFyIG9yaWdpbmFsTWF0ZXJpYWwgPSBtYXRlcmlhbHNbaV07XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIk1BVFwiLCBvcmlnaW5hbE1hdGVyaWFsKTtcbiAgICAgICAgICBvcmlnaW5hbE1hdGVyaWFsLnNraW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZCkge1xuICAgICAgICAgICAgLy8gIG9yaWdpbmFsTWF0ZXJpYWwuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiRE9VQkxFXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoRmFjZU1hdGVyaWFsKG1hdGVyaWFscyk7XG4gICAgICAgIGlmIChvcHRpb25zLmRvdWJsZXNpZGVkKVxuICAgICAgICAgIG1hdGVyaWFsLnNpZGUgPSBUSFJFRS5Eb3VibGVTaWRlO1xuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZSkge1xuICAgICAgICAgIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgICAgIHdpcmVmcmFtZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbG9yOiAnYmx1ZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0TWF0ZXJpYWwpIHtcbiAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoTGFtYmVydE1hdGVyaWFsKHtcbiAgICAgICAgICAgIGNvbG9yOiAnYmx1ZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLlNraW5uZWRNZXNoKGdlb21ldHJ5LCBtYXRlcmlhbCwgZmFsc2UpO1xuXG4gICAgICAgIGFuaW1hdGlvbnNbbmFtZV0gPSBnZW9tZXRyeS5hbmltYXRpb247XG5cbiAgICAgICAgcmVzb2x2ZShtZXNoKVxuICAgICAgfSwgbnVsbCwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb2RlbExvYWRlcjtcbiIsImltcG9ydCB7TW92ZX0gZnJvbSAnLi4vbGwvbW92ZSdcbmltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcblxubGV0IGFuaW1hbCA9IHtcbiAgb25Ob0pvYjogZnVuY3Rpb24gKGRlbHRhKSB7XG4gICAgaWYgKHRoaXMuc2hvdWxkV2FsaygpKSB7XG4gICAgICB0aGlzLnNldE1lc2goXCJ3YWxrXCIpO1xuICAgICAgbGV0IHRhcmdldFBvcyA9IG5ldyBWZWN0b3IyKE1hdGgucmFuZG9tKCkgKiAyIC0gMSxcbiAgICAgICAgTWF0aC5yYW5kb20oKSAqIDIgLSAxKS5hZGQodGhpcy5wb3MpO1xuXG4gICAgICBpZiAodGhpcy53b3JsZCkge1xuICAgICAgICB0YXJnZXRQb3MgPSB0YXJnZXRQb3MudHJ1bmMoMCwgMCwgdGhpcy53b3JsZC53aWR0aCwgdGhpcy53b3JsZC5oZWlnaHQpO1xuICAgICAgfVxuICAgICAgdGhpcy5wdXNoSm9iKG5ldyBNb3ZlKHRoaXMsIHRhcmdldFBvcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBsYXlBbmltYXRpb24oXCJlYXRcIik7XG4gICAgfVxuICB9LFxuICBzaG91bGRXYWxrOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIChNYXRoLnJhbmRvbSgpIDwgMC41KTtcbiAgfVxufTtcblxuY29uc3QgQW5pbWFsID0gKCkgPT4gYW5pbWFsO1xuXG5leHBvcnQgZGVmYXVsdCBBbmltYWw7XG5cbiIsImltcG9ydCBKb2IgZnJvbSAnLi9qb2InXG5cbmNsYXNzIFJlc3RKb2IgZXh0ZW5kcyBKb2Ige1xuICAgIGNvbnN0cnVjdG9yKGVudGl0eSwgdGltZSkge1xuICAgICAgICBzdXBlcihlbnRpdHkpXG4gICAgICAgIHRoaXMudGltZSA9IHRpbWU7XG4gICAgICAgIHRoaXMuZG9uZVRpbWUgPSAwO1xuICAgIH1cblxuICAgIC8vIG1heWJlIGltcGxlbWVudCB1c2luZyBzZXRUaW1lb3V0ID9cbiAgICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgICAgIHRoaXMuZG9uZVRpbWUgKz0gZGVsdGE7XG4gICAgICAgIGlmICh0aGlzLmRvbmVUaW1lID4gdGhpcy50aW1lKSB7XG4gICAgICAgICAgICB0aGlzLnNldFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kb25lVGltZSAtIHRoaXMudGltZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXN0Sm9iO1xuXG4iLCJpbXBvcnQgUmVzdEpvYiBmcm9tIFwiLi4vbGwvcmVzdFwiO1xuXG5sZXQgam9iID0ge1xuICBqb2JzOiBudWxsLFxuICBwdXNoSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgaWYgKCF0aGlzLmpvYnMpXG4gICAgICB0aGlzLmpvYnMgPSBbXTtcbiAgICBpZiAodGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXSAmJiB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdLnJlYWR5KSB7XG4gICAgICB0aHJvdyBcIkpvYiBpcyByZWFkeSAtIGRvbnQnIHB1c2ghXCI7XG4gICAgfVxuICAgIHRoaXMuam9icy5wdXNoKGpvYik7XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gICAgaWYgKHRoaXMuY3VycmVudEpvYi5pbml0KVxuICAgICAgdGhpcy5jdXJyZW50Sm9iLmluaXQoKTtcbiAgfSxcbiAgcmVzZXROb25IbEpvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5qb2JzID0gXy5maWx0ZXIodGhpcy5qb2JzLCBmdW5jdGlvbiAoam9iKSB7XG4gICAgICAgIHJldHVybiBqb2IuYXNzaWduTWVKb2I7XG4gICAgICB9KTtcbiAgfSxcbiAgcmVzZXRKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5qb2JzID0gW107XG4gICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gIH0sXG4gIHVwZGF0ZUN1cnJlbnRKb2I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5qb2JzKVxuICAgICAgdGhpcy5jdXJyZW50Sm9iID0gdGhpcy5qb2JzW3RoaXMuam9icy5sZW5ndGggLSAxXTtcbiAgfSxcbiAgdGljazogZnVuY3Rpb24gKGRlbHRhKSB7XG4gICAgd2hpbGUgKHRoaXMuam9icyAmJiBkZWx0YSA+IDAgJiYgdGhpcy5qb2JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBqb2IgPSB0aGlzLmpvYnNbdGhpcy5qb2JzLmxlbmd0aCAtIDFdO1xuICAgICAgZGVsdGEgPSBqb2Iub25GcmFtZShkZWx0YSk7XG4gICAgICBpZiAoam9iLnJlYWR5KSB7XG4gICAgICAgIGlmIChqb2IuYXNzaWduTWVKb2IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkpPQiBSRUFEWSEhIVwiLCB0aGlzLmpvYnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuam9icy5wb3AoKTtcbiAgICAgICAgdGhpcy51cGRhdGVDdXJyZW50Sm9iKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWx0YSA+IDApIHtcbiAgICAgIGlmICh0aGlzLm9uTm9Kb2IpIHtcbiAgICAgICAgdGhpcy5vbk5vSm9iKGRlbHRhKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHBsYXlBbmltYXRpb246IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgLy9GSVhNRTogc2V0IGJhY2sgdG8gMjAgKD8pXG4gICAgdGhpcy5wdXNoSm9iKG5ldyBSZXN0Sm9iKHRoaXMsIDIpKTtcbiAgICB0aGlzLnNldE1lc2gobmFtZSk7XG4gIH0sXG4gIGFuaW1hdGlvbkZpbmlzaGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5yZXNldEpvYnMoKTtcbiAgfVxufTtcblxuY29uc3QgSm9iID0gKCkgPT4gam9iO1xuXG5leHBvcnQge0pvYn1cblxuXG4iLCJsZXQgZm9sbG93ZXIgPSB7XG4gIGNoZWNrQm9zczogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5ib3NzKSB7XG4gICAgICB0aGlzLl9hc3NpZ25Cb3NzKHRoaXMuX2ZpbmRTb21lQm9zcyh7XG4gICAgICAgIG1peGluTmFtZXM6IFwiaG91c2VcIlxuICAgICAgfSkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mICh0aGlzLmJvc3MpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLl9hc3NpZ25Cb3NzKHRoaXMuX2ZpbmRTb21lQm9zcyh7XG4gICAgICAgIG5hbWU6IHRoaXMuYm9zc1xuICAgICAgfSkpO1xuICAgIH1cbiAgfSxcbiAgb25Ob0pvYjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2hlY2tCb3NzKCk7XG4gICAgaWYgKHRoaXMuYm9zcyAmJiB0aGlzLmJvc3MuYXNzaWduTWVKb2IpXG4gICAgICB0aGlzLmJvc3MuYXNzaWduTWVKb2IodGhpcyk7XG4gIH0sXG4gIF9maW5kU29tZUJvc3Moc3BlY3MpIHtcbiAgICBpZiAodGhpcy53b3JsZC5zZWFyY2gpIHtcbiAgICAgIHZhciBmID0gdGhpcy53b3JsZC5zZWFyY2goc3BlY3MsIHRoaXMucG9zKTtcbiAgICAgIGlmIChmLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGZbMF07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBfYXNzaWduQm9zcyhib3NzKSB7XG4gICAgdGhpcy5ib3NzID0gYm9zcztcbiAgICBpZiAoYm9zcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmJvc3MuYWRkRm9sbG93ZXIodGhpcyk7XG4gICAgfVxuICB9XG59O1xuXG5cbmxldCBGb2xsb3dlciA9ICgpID0+IGZvbGxvd2VyO1xuZXhwb3J0IHtGb2xsb3dlcn1cbiIsImNsYXNzIEhMSm9iIHtcbiAgY29tbW9uU3RhcnQoKSB7XG4gICAgaWYgKCF0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gICAgICB0aGlzLmVudGl0eS5mb2xsb3dlcnMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgdGhpcy5hc3NpZ25NZUpvYihlKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hc3NpZ25NZUpvYih0aGlzLmVudGl0eSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBvbkZyYW1lKGRlbHRhKSB7XG4gICAgaWYgKCF0aGlzLnJlYWR5KVxuICAgICAgaWYgKCF0aGlzLmNvbW1vblN0YXJ0KCkpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJPTkZSQU1FXCIsIHRoaXMucmVhZHkpO1xuICAgICAgICB0aGlzLmFzc2lnbk1lSm9iKHRoaXMuZW50aXR5KTtcbiAgICAgIH1cbiAgfVxufVxuXG5leHBvcnQge0hMSm9ifVxuIiwiaW1wb3J0IHtWZWN0b3IyfSBmcm9tIFwiLi4vdmVjdG9yMlwiO1xuXG5jbGFzcyBCYXNlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5mb3JtQ2FjaGUgPSB7fTtcbiAgICB0aGlzLmZvcm1TaXplID0gLTE7XG4gIH1cblxuICBzb3J0KGZvbGxvd2Vycykge1xuICAgIHJldHVybiBmb2xsb3dlcnM7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3NDYWNoZWQoYm9zcywgaSkge1xuICAgIGlmICh0aGlzLmZvcm1TaXplICE9IGJvc3MuZm9sbG93ZXJzLmxlbmd0aCkge1xuICAgICAgdGhpcy5mb3JtU2l6ZSA9IGJvc3MuZm9sbG93ZXJzLmxlbmd0aDtcbiAgICAgIHRoaXMuZm9ybUNhY2hlID0ge307XG4gICAgfVxuICAgIGlmICghdGhpcy5mb3JtQ2FjaGVbaV0pIHtcbiAgICAgIHRoaXMuZm9ybUNhY2hlW2ldID0gdGhpcy5jb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvcm1DYWNoZVtpXTtcbiAgfVxuXG4gIGNvbXB1dGVSZWxhdGl2ZVBvcyhib3NzLCBpKSB7XG4gICAgaWYgKGkgPiAxKSB7XG4gICAgICBpICs9IDE7XG4gICAgfVxuXG4gICAgdmFyIHJvdyA9IE1hdGguZmxvb3IoaSAvIDUpO1xuICAgIHZhciBjb2wgPSBpICUgNTtcbiAgICB2YXIgZCA9IDAuODtcblxuICAgIHJldHVybiBuZXcgVmVjdG9yMihjb2wgKiBkIC0gZCAqIDIsIHJvdyAqIGQpO1xuICB9XG5cbiAgY29tcHV0ZVBvcyhib3NzLCBpLCBiYXNlUG9zKSB7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKCkuYWRkVmVjdG9ycyh0aGlzLmNvbXB1dGVSZWxhdGl2ZVBvc0NhY2hlZChib3NzLCBpKSwgYmFzZVBvcyk7XG4gIH1cblxuICBnZXRQb3MoYm9zcywgZm9sbG93ZXIsIGJhc2VQb3MpIHtcbiAgICBpZiAoIWJhc2VQb3MpIHtcbiAgICAgIGJhc2VQb3MgPSBib3NzLnBvcztcbiAgICB9XG5cbiAgICBpZiAoYm9zcyA9PSBmb2xsb3dlcikge1xuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKCkuY29weShiYXNlUG9zKTtcbiAgICB9XG5cbiAgICB2YXIgZm9sbG93ZXJzID0gdGhpcy5zb3J0KGJvc3MuZm9sbG93ZXJzKTtcblxuICAgIHZhciBpID0gXy5pbmRleE9mKGZvbGxvd2VycywgZm9sbG93ZXIpO1xuICAgIHJldHVybiB0aGlzLmNvbXB1dGVQb3MoYm9zcywgaSwgYmFzZVBvcyk7XG4gIH1cblxufVxuXG5leHBvcnQge0Jhc2V9XG4iLCJpbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QW5nbGV9IGZyb20gJy4uL2FuZ2xlJ1xuXG52YXIgbGluZXMgPSBbMTAsIDE0LCAyMCwgNDAsIDEwMF07XG5cbmNsYXNzIFJlc3QgZXh0ZW5kcyBCYXNlIHtcblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIHZhciByb3cgPSBudWxsLCBjaSA9IGk7XG4gICAgdmFyIG1heCA9IDAsIGNvdW50O1xuICAgIF8uZmluZChsaW5lcywgZnVuY3Rpb24gKGxpbmUsIGspIHtcbiAgICAgIGNpIC09IGxpbmU7XG4gICAgICBtYXggKz0gbGluZTtcbiAgICAgIGlmIChjaSA8IDApIHtcbiAgICAgICAgcm93ID0gaztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgLy8gY291bnQgb2Ygc2VnbWVudHMgZm9yIGN1cnJlbnQgY2lyY2xlXG4gICAgY291bnQgPSBsaW5lc1tyb3ddO1xuXG4gICAgLy8gaWYgY3VycmVudCBjaXJjbGUgaXMgdGhlIHdpZGVzdCwgdGhlbiBvbmx5IHNvIG1hbnkgc2VnbWVudHMgbGlrZSBtZW4gbGVmdFxuICAgIGlmIChib3NzLmZvbGxvd2Vycy5sZW5ndGggPCBtYXgpXG4gICAgICBjb3VudCAtPSAobWF4IC0gYm9zcy5mb2xsb3dlcnMubGVuZ3RoKTtcbiAgICB2YXIgYW5nbGUgPSAoaSAvIGNvdW50KSAqIDIgKiBNYXRoLlBJO1xuICAgIHZhciByYWRpdXMgPSAocm93ICsgMSkgKiAxLjQ7XG4gICAgcmV0dXJuIG5ldyBWZWN0b3IyKE1hdGguc2luKGFuZ2xlKSAqIHJhZGl1cywgTWF0aC5jb3MoYW5nbGUpICogcmFkaXVzKTtcbiAgfTtcblxuICBnZXREaXIoYm9zcywgZSkge1xuICAgIHZhciBuZXdQb3MgPSB0aGlzLmdldFBvcyhib3NzLCBlKTtcbiAgICByZXR1cm4gQW5nbGUuZnJvbVZlY3RvcjIobmV3IFZlY3RvcjIoKS5zdWJWZWN0b3JzKGJvc3MucG9zLCBuZXdQb3MpKTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7UmVzdH1cbiIsImltcG9ydCB7VmVjdG9yMn0gZnJvbSBcIi4uL3ZlY3RvcjJcIjtcbmltcG9ydCB7QmFzZX0gZnJvbSAnLi9iYXNlJ1xuXG5jbGFzcyBOdWxsIGV4dGVuZHMgQmFzZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yMigwLCAwKTtcbiAgfVxuXG4gIGdldERpcihib3NzLCBlKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cblxuZXhwb3J0IHtOdWxsfVxuIiwiaW1wb3J0IHtCYXNlfSBmcm9tICcuL2Jhc2UnXG5pbXBvcnQge1ZlY3RvcjJ9IGZyb20gXCIuLi92ZWN0b3IyXCI7XG5cbmNsYXNzIE1vdmUgZXh0ZW5kcyBCYXNlIHtcblxuICBjb25zdHJ1Y3RvcihhbmdsZSkge1xuICAgIHN1cGVyKGFuZ2xlKTtcbiAgICB0aGlzLmFuZ2xlID0gYW5nbGU7XG4gIH1cblxuICBjb21wdXRlUmVsYXRpdmVQb3MoYm9zcywgaSkge1xuICAgIGlmIChpID49IDIpIHtcbiAgICAgIGkgKz0gMTtcbiAgICB9XG5cbiAgICB2YXIgcm93ID0gTWF0aC5mbG9vcihpIC8gNSk7XG4gICAgdmFyIGNvbCA9IGkgJSA1O1xuICAgIHZhciBibG9jayA9IE1hdGguZmxvb3IoaSAvIDI1KTtcblxuICAgIHZhciB4ID0gY29sIC0gMjtcbiAgICB2YXIgeSA9IHJvdyArIGJsb2NrO1xuXG4gICAgdmFyIGFuZ2xlID0gdGhpcy5hbmdsZTtcbiAgICB2YXIgZCA9IDAuODtcblxuICAgIHJldHVybiBuZXcgVmVjdG9yMihkICogTWF0aC5jb3MoYW5nbGUpICogeCAtIGQgKiBNYXRoLnNpbihhbmdsZSkgKiB5LFxuICAgICAgZCAqIE1hdGguc2luKGFuZ2xlKSAqIHggKyBkICogTWF0aC5jb3MoYW5nbGUpICogeSk7XG4gIH07XG5cbiAgZ2V0RGlyKGJvc3MsIGUpIHtcbiAgICByZXR1cm4gdGhpcy5hbmdsZTtcbiAgfVxufVxuXG5leHBvcnQge01vdmV9XG4iLCJpbXBvcnQge0Jhc2V9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7UmVzdH0gZnJvbSAnLi9yZXN0J1xuaW1wb3J0IHtOdWxsfSBmcm9tICcuL251bGwnXG5pbXBvcnQge01vdmV9IGZyb20gJy4vbW92ZSdcblxuXG5jb25zdCBGb3JtYXRpb25zID0ge0Jhc2UsIE1vdmUsIE51bGwsIFJlc3R9O1xuZXhwb3J0IHtGb3JtYXRpb25zfVxuIiwiaW1wb3J0IFJlc3RKb2IgZnJvbSBcIi4uL2xsL3Jlc3RcIjtcblxuY2xhc3MgTUxSZXN0Sm9iIHtcbiAgY29uc3RydWN0b3IoZW50aXR5LCBsZW5ndGgsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgIHRoaXMuZG9uZSA9IGZhbHNlO1xuICB9XG5cbiAgb25GcmFtZShkZWx0YSkge1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiAmJiB0aGlzLmVudGl0eS5yb3RhdGlvbiAhPSB0aGlzLmRpcmVjdGlvbikge1xuICAgICAgdGhpcy5lbnRpdHkucm90YXRpb24gPSB0aGlzLmRpcmVjdGlvbjtcbiAgICAgIHRoaXMuZW50aXR5LnVwZGF0ZU1lc2hQb3MoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lbnRpdHkubWVzaE5hbWUgIT0gXCJzaXRcIiAmJiB0aGlzLmVudGl0eS5tZXNoTmFtZSAhPSBcInNpdGRvd25cIikge1xuICAgICAgdGhpcy5lbnRpdHkucGxheUFuaW1hdGlvbihcInNpdGRvd25cIik7XG4gICAgfSBlbHNlIGlmICghdGhpcy5kb25lKSB7XG4gICAgICB0aGlzLmVudGl0eS5zZXRNZXNoKFwic2l0XCIpO1xuICAgICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgUmVzdEpvYih0aGlzLmVudGl0eSwgdGhpcy5sZW5ndGgpKTtcbiAgICAgIHRoaXMuZG9uZSA9IHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBkZWx0YTtcbiAgfVxuXG59XG5cbmV4cG9ydCB7TUxSZXN0Sm9ifTtcbiIsImltcG9ydCB7SExKb2J9IGZyb20gJy4vYmFzZSdcbmltcG9ydCB7IEZvcm1hdGlvbnN9IGZyb20gXCIuLi9mb3JtYXRpb25zXCI7XG5pbXBvcnQge01MUmVzdEpvYn0gZnJvbSBcIi4uL21sL3Jlc3RcIjtcblxuY2xhc3MgSExSZXN0Sm9iIGV4dGVuZHMgSExKb2Ige1xuICBjb25zdHJ1Y3RvcihlbnRpdHksIGxlbmd0aCwgZm9ybWF0dGVkKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICBpZiAoZm9ybWF0dGVkKVxuICAgICAgdGhpcy5mb3JtYXRpb24gPSBuZXcgRm9ybWF0aW9ucy5SZXN0KCk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5mb3JtYXRpb24gPSBuZXcgRm9ybWF0aW9ucy5OdWxsKCk7XG4gIH07XG5cbiAgYXNzaWduTWVKb2IoZSkge1xuICAgIGlmICghdGhpcy5jb21tb25TdGFydCgpKSB7XG4gICAgICBlLnJlc2V0Tm9uSGxKb2JzKCk7XG4gICAgICB2YXIgbmV3UG9zID0gdGhpcy5mb3JtYXRpb24uZ2V0UG9zKHRoaXMuZW50aXR5LCBlKTtcbiAgICAgIGlmIChlLnBvcy5kaXN0YW5jZVRvKG5ld1BvcykgPiAwLjEpXG4gICAgICAgIGUucHVzaEpvYihuZXcgTWxNb3ZlSm9iKGUsIG5ld1BvcykpO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBkaXIgPSB0aGlzLmZvcm1hdGlvbi5nZXREaXIodGhpcy5lbnRpdHksIGUpO1xuICAgICAgICBlLnB1c2hKb2IobmV3IE1MUmVzdEpvYihlLCA1LCBkaXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHtITFJlc3RKb2J9XG4iLCJpbXBvcnQge0hMUmVzdEpvYn0gZnJvbSBcIi4uL2hsL3Jlc3RcIjtcblxubGV0IGJvc3MgPSB7XG4gIHBvc3RMb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coXCJQT1NUTE9BRFwiKTtcbiAgICBpZiAoIXRoaXMuZm9sbG93ZXJzKVxuICAgICAgdGhpcy5mb2xsb3dlcnMgPSBbXTtcbiAgICBlbHNlIHtcbiAgICAgIC8vIEZJWE1FOiByZXRyaWV2ZSBvYmplY3RzIGZyb20gaWRzXG4gICAgfVxuICB9LFxuICBmb2xsb3dlcnM6IG51bGwsXG4gIC8vIGRlcHJlY2F0ZWRcbiAgcHVzaEhsSm9iOiBmdW5jdGlvbiAoam9iKSB7XG4gICAgdGhpcy5wdXNoSm9iKGpvYik7XG4gIH0sXG4gIC8vIGRlcHJlY2F0ZWRcbiAgY2xlYXJIbEpvYjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucmVzZXRKb2JzKCk7XG4gIH0sXG4gIG9uTm9Kb2I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm9zcyA9IHRoaXM7XG4gICAgaWYgKHRoaXMuYm9zcylcbiAgICAgIGJvc3MgPSB0aGlzLmJvc3M7XG4gICAgaWYgKGJvc3MgJiYgYm9zcy5hc3NpZ25NZUpvYilcbiAgICAgIGJvc3MuYXNzaWduTWVKb2IodGhpcyk7XG4gIH0sXG4gIGdldEhsSm9iOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuam9icylcbiAgICAgIGZvciAodmFyIGkgPSB0aGlzLmpvYnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHRoaXMuam9ic1tpXS5hc3NpZ25NZUpvYilcbiAgICAgICAgICByZXR1cm4gdGhpcy5qb2JzW2ldO1xuICAgICAgfVxuICB9LFxuICBhc3NpZ25NZUpvYjogZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgaGxqb2IgPSB0aGlzLmdldEhsSm9iKCk7XG5cbiAgICBpZiAoIWhsam9iKSB7XG4gICAgICBpZiAodGhpcy5haSkge1xuICAgICAgICB0aGlzLmFpKCk7XG4gICAgICB9XG4gICAgICAvLyB0cnkgYWdhaW5cbiAgICAgIGhsam9iID0gdGhpcy5nZXRIbEpvYigpO1xuICAgICAgaWYgKCFobGpvYikge1xuICAgICAgICB0aGlzLnB1c2hIbEpvYihuZXcgSExSZXN0Sm9iKHRoaXMsIDEwLCB0aGlzLmlzQShcImhlcm9cIikpKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcImJvc3MgLSBObyBobGpvYiBjcmVhdGVkLCByZXN0aW5nIGZvciAxMCBzZWNvbmRzXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChobGpvYikge1xuICAgICAgaGxqb2IuYXNzaWduTWVKb2IoZSk7XG4gICAgfVxuICB9LFxuICBhZGRGb2xsb3dlcjogZnVuY3Rpb24gKGZvbGxvd2VyKSB7XG4gICAgdGhpcy5mb2xsb3dlcnMucHVzaChmb2xsb3dlcik7XG4gIH0sXG4gIGRpc21pc3M6IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHRoaXMuZm9sbG93ZXJzID0gXy53aXRob3V0KHRoaXMuZm9sbG93ZXJzLCBmb2xsb3dlcik7XG4gICAgY29uc29sZS5sb2coXCJkaXNtaXNzZWRcIiwgZm9sbG93ZXIsIHRoaXMuZm9sbG93ZXJzLmxlbmd0aCk7XG4gICAgZGVsZXRlIGZvbGxvd2VyLmJvc3M7XG4gICAgZm9sbG93ZXIucmVzZXRKb2JzKCk7XG4gIH1cbn1cblxuY29uc3QgQm9zcyA9ICgpID0+IGJvc3M7XG5cbmV4cG9ydCB7Qm9zc31cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICB9LFxuICBcImNyb3BcIjoge1xuICAgIFwibWVzaE5hbWVcIjogXCJ0aW55XCIsXG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJoaWdoXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9oaWdoXCJcbiAgICAgIH0sXG4gICAgICBcIm1lZFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfbWVkXCJcbiAgICAgIH0sXG4gICAgICBcInNtYWxsXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9zbWFsbFwiXG4gICAgICB9LFxuICAgICAgXCJ0aW55XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF90aW55XCJcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWlsbFwiOiB7XG4gIH0sXG4gIFwibWluZVwiOiB7XG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gIH0sXG4gIFwiZ3JhdmVcIjoge1xuICB9LFxuICBcIndlbGxcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3YXRlclwiXG4gICAgXSxcbiAgICBcInJlc291cmNlc1wiOiB7XG4gICAgICBcIndhdGVyXCI6IDEwMFxuICAgIH1cbiAgfSxcbiAgXCJmaXNoaW5nX2h1dFwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiXG4gICAgXVxuICB9LFxuICBcIndvcmtzaG9wXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxLFxuICAgICAgXCJ0b29sXCI6IDEwXG4gICAgfSxcbiAgICBcInByb2R1Y3Rpb25cIjoge1xuICAgICAgXCJ0b29sXCI6IHtcbiAgICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICAgIFwic3RvbmVcIjogMVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiLFxuICAgICAgXCJzbW9rZVwiXG4gICAgXVxuICB9LFxuICBcInRvd25oYWxsXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxXG4gICAgfSxcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImJvc3NcIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImhvdXNlXCJcbiAgICBdXG4gIH0sXG4gIFwiaGVyb1wiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImhlcm9cIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcInBsYXllclwiLFxuICAgIF1cbiAgfSxcbiAgXCJ0b3dlclwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiXG4gICAgXVxuICB9LFxuICBcIm1hblwiOiB7XG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJzaXRcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic2l0XCJcbiAgICAgIH0sXG4gICAgICBcInNpdGRvd25cIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwic2l0ZG93blwiXG4gICAgICB9LFxuICAgICAgXCJzdGFuZFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzdGFuZFwiXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcIndhbGtcIlxuICAgICAgfSxcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzdGFuZFwiXG4gICAgICB9LFxuICAgICAgXCJmaWdodFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9maWdodFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImZpZ2h0XCJcbiAgICAgIH0sXG4gICAgICBcInBpY2tcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fcGlja1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInBpY2tcIlxuICAgICAgfSxcbiAgICAgIFwiYXhlXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2F4ZVwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcImF4ZVwiXG4gICAgICB9XG4gICAgfSxcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJmb2xsb3dlclwiXG4gICAgXVxuICB9LFxuICBcImZpclwiOiB7XG4gICAgXCJwcm92aWRlc1wiOiBbXG4gICAgICBcIndvb2RcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJ3b29kXCI6IDVcbiAgICB9XG4gIH0sXG4gIFwidHJlZVwiOiB7XG4gIH0sXG4gIFwiYmlnX3N0b25lXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwic3RvbmVcIlxuICAgIF0sXG4gICAgXCJyZXNvdXJjZXNcIjoge1xuICAgICAgXCJzdG9uZVwiOiAyMFxuICAgIH1cbiAgfSxcbiAgXCJzaGVlcFwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJqb2JcIixcbiAgICAgIFwiYW5pbWFsXCJcbiAgICBdLFxuICAgIFwic3BlZWRcIjogMC41LFxuICAgIFwibWVzaGVzXCI6IHtcbiAgICAgIFwiZGVmYXVsdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcInNoZWVwXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiZWF0XCJcbiAgICAgIH0sXG4gICAgICBcImVhdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcInNoZWVwXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiZWF0XCJcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJzaGVlcFwiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcIndhbGtcIlxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgRW50aXR5IH0gZnJvbSAnLi9lbnRpdHknXG5pbXBvcnQgTW9kZWxMb2FkZXIgZnJvbSAnLi4vYmFzZTNkL21vZGVsX2xvYWRlcidcbmltcG9ydCAqIGFzIE1peGluIGZyb20gXCIuL21peGluXCJcbmltcG9ydCBFbnRpdHlUeXBlcyBmcm9tICcuLi9jb25maWcvZW50aXRpZXMnXG5cblxuY2xhc3MgV29ybGRMb2FkZXIge1xuICBsb2FkKHdvcmxkLCBkYXRhLCBvcHMpIHtcbiAgICBsZXQgYmFzaWNPcHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHMpO1xuXG4gICAgaWYgKCFiYXNpY09wcy5tb2RlbExvYWRlcikge1xuICAgICAgYmFzaWNPcHMubW9kZWxMb2FkZXIgPSBuZXcgTW9kZWxMb2FkZXIoKTtcbiAgICB9XG4gICAgaWYgKCFiYXNpY09wcy5taXhpbkRlZnMpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTUlYSU4gREVGU1wiLCBNaXhpbilcbiAgICAgIGJhc2ljT3BzLm1peGluRGVmcyA9IE1peGluO1xuICAgIH1cbiAgICBpZiAoIWJhc2ljT3BzLmVudGl0eVR5cGVzKSB7XG4gICAgICBiYXNpY09wcy5lbnRpdHlUeXBlcyA9IEVudGl0eVR5cGVzO1xuICAgIH1cblxuICAgIGRhdGEuZm9yRWFjaChlbnRpdHlEZWZpbml0aW9uID0+XG4gICAgICB3b3JsZC5wdXNoKG5ldyBFbnRpdHkod29ybGQubWFwLCBPYmplY3QuYXNzaWduKHt9LCBiYXNpY09wcywgZW50aXR5RGVmaW5pdGlvbikpKVxuICAgICk7XG4gICAgd29ybGQuZW50aXRpZXMuZm9yRWFjaChlbnRpdHkgPT4gZW50aXR5LnBvc3RMb2FkICYmIGVudGl0eS5wb3N0TG9hZCgpKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdvcmxkTG9hZGVyXG4iLCJpbXBvcnQgV29ybGQgZnJvbSBcIi4uL2dhbWUvd29ybGRcIjtcbmltcG9ydCBIZWlnaHRNYXAgZnJvbSBcIi4uL2dhbWUvaGVpZ2h0bWFwXCI7XG5pbXBvcnQgYWpheCBmcm9tIFwiLi4vYWpheFwiXG5pbXBvcnQgV29ybGRMb2FkZXIgZnJvbSBcIi4uL2dhbWUvd29ybGQtbG9hZGVyXCJcblxuY2xhc3MgV29ybGRFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih3b3JsZCkge1xuICAgICAgICBzdXBlcihcIndvcmxkXCIpO1xuICAgICAgICB0aGlzLndvcmxkID0gd29ybGRcbiAgICB9XG59XG5cbmNsYXNzIEFnV29ybGQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMubWFwID0gbmV3IEhlaWdodE1hcCgpO1xuICAgICAgICB0aGlzLndvcmxkID0gbmV3IFdvcmxkKHRoaXMubWFwKTtcblxuICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoXCJsb2FkXCIpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRXb3JsZCh0aGlzLmdldEF0dHJpYnV0ZShcImxvYWRcIikpLnRoZW4odGhpcy5pbmZvcm0uYmluZCh0aGlzKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50W3RoaXMuZXhwb3NlTmFtZV0gPSB0aGlzLndvcmxkO1xuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBkZWxldGUgZG9jdW1lbnRbdGhpcy5leHBvc2VOYW1lXVxuICAgIH1cblxuICAgIGluZm9ybSgpIHtcbiAgICAgICAgdGhpcy5xdWVyeVNlbGVjdG9yQWxsKFwiKltpbmplY3Qtd29ybGRdXCIpLmZvckVhY2goZSA9PlxuICAgICAgICAgICAgZS5kaXNwYXRjaEV2ZW50KG5ldyBXb3JsZEV2ZW50KHRoaXMud29ybGQpKSlcbiAgICB9XG5cbiAgICBsb2FkV29ybGQodXJsKSB7XG4gICAgICAgIHJldHVybiBhamF4KHVybCkudGhlbihkYXRhID0+XG4gICAgICAgICAgICBuZXcgV29ybGRMb2FkZXIoKS5sb2FkKHRoaXMud29ybGQsIGRhdGEpXG4gICAgICAgIClcbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy13b3JsZCcpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy13b3JsZCcsIEFnV29ybGQpO1xufVxuXG4iLCJpbXBvcnQge0hMUmVzdEpvYn0gZnJvbSBcIi4uL2dhbWUvaGwvcmVzdFwiO1xuXG5jbGFzcyBBZ0VudGl0eVZpZXcgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLmlubmVySFRNTDtcbiAgICB0aGlzLmNoYW5nZWQobnVsbCk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJ3b3JsZFwiLCB0aGlzLndvcmxkQ3JlYXRlZC5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsIHRoaXMud29ybGRDcmVhdGVkLmJpbmQodGhpcykpO1xuICAgIGlmICh0aGlzLmxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyLnJlbW92ZSgpXG4gICAgfVxuICB9XG5cbiAgd29ybGRDcmVhdGVkKGV2KSB7XG4gICAgdGhpcy53b3JsZCA9IGV2LndvcmxkO1xuICAgIGNvbnN0IGV2ZW50bmFtZSA9IHRoaXMuZ2V0QXR0cmlidXRlKFwiZXZlbnRcIikgPT09IFwiaG92ZXJlZFwiID8gXCJob3ZlcmVkXCIgOiBcInNlbGVjdGVkXCI7XG4gICAgdGhpcy5ldmVudG5hbWUgPSBldmVudG5hbWU7XG4gICAgdGhpcy5saXN0ZW5lciA9IHRoaXMud29ybGRbZXZlbnRuYW1lXS5zdWJzY3JpYmUodGhpcy5jaGFuZ2VkLmJpbmQodGhpcykpXG4gIH1cblxuICBjaGFuZ2VkKGVudGl0eSkge1xuICAgIGlmICh0aGlzLmVudGl0eSAhPT0gZW50aXR5KSB7XG4gICAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICAgIGlmICh0aGlzLmVudGl0eSkge1xuICAgICAgICB0aGlzLnJlZHJhdygpXG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmVudGl0eSkge1xuICAgICAgdGhpcy5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfVxuICB9XG5cbiAgcmVkcmF3KCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gbXVzdGFjaGUucmVuZGVyKHRoaXMudGVtcGxhdGUsIHRoaXMuZW50aXR5KTtcbiAgICBjb25zdCBidXR0b25SZXN0ID0gdGhpcy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiYnV0dG9uLXJlc3RcIilbMF07XG4gICAgaWYgKGJ1dHRvblJlc3QpIHtcbiAgICAgIGJ1dHRvblJlc3QuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMucmVzdC5iaW5kKHRoaXMpKVxuICAgIH1cbiAgfVxuXG4gIHJlc3QoKSB7XG4gICAgdGhpcy5lbnRpdHkucmVzZXRKb2JzKCk7XG4gICAgdGhpcy5lbnRpdHkucHVzaEpvYihuZXcgSExSZXN0Sm9iKHRoaXMuZW50aXR5LCAwLCBmYWxzZSkpO1xuICAgIGNvbnNvbGUubG9nKFwiUkVTVFwiKVxuICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1lbnRpdHktdmlldycpKSB7XG4gIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctZW50aXR5LXZpZXcnLCBBZ0VudGl0eVZpZXcpO1xufVxuXG4iXSwibmFtZXMiOlsiY2xvY2siLCJKb2IiLCJNb3ZlIl0sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFNLEtBQUssU0FBUyxXQUFXLENBQUM7QUFDaEMsSUFBSSxpQkFBaUIsR0FBRztBQUN4QixRQUFRLElBQUksQ0FBQyxj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SUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztBQUMzQixVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbEIsT0FBTztBQUNQLEtBQUs7QUFDTCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQztBQUNBLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ25ELFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM1QyxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFDN0csUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUM1QixPQUFPO0FBQ1AsS0FBSztBQUNMLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLElBQUksT0FBTyxNQUFNLENBQUM7QUFDbEIsR0FBRztBQUNIOztBQ3RJQSxTQUFTLElBQUksQ0FBQyxHQUFHLEVB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

(function () {
'use strict';

class AgIntro extends HTMLElement {
	connectedCallback() {
		this.current_screen = -1;
		this.screens = this.querySelectorAll("intro-screen");
		this.nextScreenHandler = this.nextScreen.bind(this);
		this.skipIntro = this.skipIntro.bind(this);
		window.addEventListener("keydown", this.skipIntro, false);
		document.addEventListener("keydown", this.skipIntro, false);
		this.nextScreen();
	}

	skipIntro() {
		console.log("skipIntro");
		this.finished();
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

	finished() {
			this.dispatchEvent(new Event('finished'));
			try {
				eval(this.getAttribute('onfinished'));
			} catch(e) {
				console.log("Error",e);
			}
	}

	nextScreen(ev) {
		this.unbindEvent(this.screens[this.current_screen]);
		if(this.current_screen == this.screens.length-1) {
			this.finished();
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
	customElements.define('ag-intro', AgIntro);
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

new THREE.Clock();

new THREE.Clock();

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
		const id=0;
		const touch =e.targetTouches[id];
		this.touches[id]={x:touch.clientX, y:touch.clientY};
	}

	touchend(e) {
		delete this.touches[0];
	}

	touchmove(e) {
		const id=0;
		const touch =e.targetTouches[id];
		const width = this.offsetWidth;
		const height = this.offsetHeight;
		const x = touch.clientX-this.touches[id].x;
		const y = touch.clientY-this.touches[id].y;
		this.touches[id]={x:touch.clientX, y:touch.clientY};
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

class Job$1 {
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

class Move$1 extends Job$1 {
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
      this.entity.pushJob(new Move$1(this.entity, this.mltargetPos));
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
          setTimeout(stopAnimation, time);
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

      new THREE.Texture();
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
      this.pushJob(new Move$1(this, targetPos));
    } else {
      this.playAnimation("eat");
    }
  },
  shouldWalk: function () {
    return (Math.random() < 0.5);
  }
};

const Animal = () => animal;

class RestJob extends Job$1 {
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
				console.log("JOBS", this.jobs.map(j=>j.__proto__));
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

const Job = () => job;

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

class Move extends Base {

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

const Formations = {Base, Move, Null, Rest};

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
        this.entity.pushJob(new Move$1(this.entity,this.mltargetPos,this.collectDistance));
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
      this.entity.pushJob(new Move$1(this.entity,this.homeEntity.pos));
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
job: Job,
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
	}

	startListening(entity) {
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

})();

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

const clock = new THREE.Clock();

class Base {
    constructor(el) {

        console.log("EL", el, this);
        this.scene = new THREE.Scene();
        var camera = this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);

        this.renderer = new THREE.WebGLRenderer();

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        el.appendChild(this.renderer.domElement);

        camera.position.x = 16;
        camera.position.y = -5;
        camera.position.z = 10;
        camera.rotation.x = -(10 + 32) * Math.PI / 180;

        this.particleGroup = Base.makeSPEGroup();


        this.particleGroup.addPool(10, this.emitterSettings, false);

        //this.scene.background.add(new Color("red"))
        this.scene.add(this.particleGroup.mesh);
        this.scene.particleGroup = this.particleGroup;

        this.emitterSettings = {
            position: new THREE.Vector3(1, 1, 1),
            positionSpread: new THREE.Vector3(0, 0, 0),

            acceleration: new THREE.Vector3(0.03, 0, 0),
            accelerationSpread: new THREE.Vector3(0.01, 0.01, 0),

            velocity: new THREE.Vector3(0, 0, 0.7),
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
            alive: 0
        };

    }

    static makeSPEGroup() {
        return  new SPE.Group({
            texture: THREE.ImageUtils.loadTexture('./images/smokeparticle.png'),
            maxAge: 4,
            blending: THREE.NormalBlending
        })
    }


    makeEmitter(pos) {
        return new SPE.Emitter(this.emitterSettings);
    }

    setSize(size) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        this.destroyed = true;
    }

    render(options) {
        var self = this;
        var lastTime = 0;

        function dorender() {
            // stop this rendering - because the scope / canvas is destroyed
            if (!self.destroyed) {
                if (self.hidden) {
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

            self.particleGroup.tick(delta);
            // animate Collada model

            //THREE.AnimationMixer.update(delta);
            self.renderer.render(self.scene, self.camera);
        }

        requestAnimationFrame(dorender);
    }
}

function addSkybox(scene) {
    THREE.ImageUtils.loadTexture('models/sky1.jpg', undefined, function (t1) {
        const skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(4096, 64, 64),
            new THREE.MeshBasicMaterial({map: t1, side: THREE.BackSide, fog: false})
        );
        scene.add(skyDome);
    });
}

const Terrain = THREE.Terrain;

class TerrainBuilder {

    static createTerrain(options, scene, material, heightmap) {
        var options = _.extend({width: 64, height: 64}, options);
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
        material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true
            });
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
        terrainScene.rotation.x = -Math.PI/2;
        terrainScene.position.x += options.width / 2;
        terrainScene.position.y += options.width / 2;

        console.log("TS", terrainScene);
        // Assuming you already have your global scene
        scene.add(terrainScene);
        this.geo = terrainScene.children[0].geometry;
    }

    static create(options, scene, heightmap) {
        console.log("TERRAIN create");
        THREE.ImageUtils.loadTexture('models/sand1.jpg', undefined, function (t1) {
            THREE.ImageUtils.loadTexture('models/grass1.jpg', undefined, function (t2) {
                THREE.ImageUtils.loadTexture('models/stone1.jpg', undefined, function (t3) {
                    THREE.ImageUtils.loadTexture('models/snow1.jpg', undefined, function (t4) {
                        var blend = Terrain.generateBlendedMaterial([
                            {texture: t1},
                            {texture: t2, levels: [-80, -35, 20, 50]},
                            {texture: t3, levels: [20, 50, 60, 85]},
                            {
                                texture: t4,
                                glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'
                            },
                        ], scene);
                        TerrainBuilder.createTerrain(options, scene, blend, heightmap);
                    });
                });
            });
        });
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

class AntScene {
    constructor(threeScene) {
        this._threeScene = threeScene;
        this.meshes = {};
        this.entities = [];
    }
    tick() {
        //console.log("TICK")
    }
    add(node) {
    //    this.entities.push(entity)

        console.log("ADD",node);
        this._threeScene.add(node);
    }

}

class AgGameView extends HTMLElement {
    connectedCallback() {
        this.setupThree();

        console.log("AgGameView connected");

        window.addEventListener("resize", this.updateSize.bind(this));
        this.addEventListener("mousedown", this.mousedown.bind(this));
        this.addEventListener("mouseup", this.mouseup.bind(this));
        this.addEventListener("mousemove", this.mousemove.bind(this));
        this.addEventListener("wheel", this.wheel.bind(this));
        this.addEventListener("click", this.click.bind(this));
        this.addEventListener("world",this.worldCreated.bind(this));
        document.addEventListener("keydown", this.keydown.bind(this));
        document.addEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));

        this.viewCenter = {x: 0, y: 0, z: 10};

        this.moves = 0;
        this.updateSize({target: window});
        this.base.render({frameCallback: this.frameCallback.bind(this)});
    }

    frameCallback(e) {
        this.antScene.tick();
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.updateSize.bind(this));
        this.removeEventListener("mousedown", this.mousedown.bind(this));
        this.removeEventListener("mouseup", this.mouseup.bind(this));
        this.removeEventListener("mousemove", this.mousemove.bind(this));
        this.removeEventListener("wheel", this.wheel.bind(this));
        this.removeEventListener("click", this.click.bind(this));
        this.removeEventListener("world",this.worldCreated.bind(this));
        document.removeEventListener("keydown", this.keydown.bind(this));
        document.removeEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));
    }

    worldCreated(e) {
        console.log("==== WORLD CREATED");
        this.world = e.world;
        const map = this.world.map;

        const threeHeightMap = map.toThreeTerrain();

        TerrainBuilder.create(map, this.scene, threeHeightMap);

        // FIXME: load all models beforehand
        this.world.initScene(this.antScene);
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
        this.base = new Base(this);
        this.scene = this.base.scene;

        // soft white light
        var light = new THREE.AmbientLight(0x202020);
        this.scene.add(light);

        // White directional light at half intensity shining from the top.
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(1, 0, 0.7);
        this.scene.add(directionalLight);

        addSkybox(this.scene);

        this.antScene = new AntScene(this.scene);
    }


    tick(delta) {
        if (!world.pause) {
            _.each(world.entities, function (e) {
                if (e && e.onFrame)
                    e.onFrame(delta);
            });
            // $apply hook
        }
    }

    visibilityChange(ev) {
        if(ev.target[this.getVisibilityChangeEvent().hidden]) ;
    }

    updateSize(ev) {
        this.base.setSize({});
        this.containerWidth = ev.target.innerWidth;
        this.containerHeight = ev.target.innerHeight;
    }

    mouseup(e) {
        console.log("mouseup", e);
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
            this.move({dx: e.pageX - this.ox, dy: e.pageY - this.oy});
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
        var res = Pick.pick(mouse, this.base.camera, this.base.scene);

        if (res.length > 0) {
            let entity = res[0].object.userData.entity;
            if(!entity) {
                entity = res[0].object.parent.userData.entity;
            }
            this.world.hover(entity);

            if (!entity) {
                this.lastPos = new THREE.Vector2().copy(res[0].point);
            }
        }
    }

    move(d) {

        this.viewCenter.x -= d.dx * 0.03;
        this.viewCenter.y += d.dy * 0.03;

        this.updateCamera();
    }

    updateCamera() {
        var base = this.base;
        // FIXME: move to world
        var h = this.world.map.get("rock").interpolate(this.viewCenter.x, this.viewCenter.y + this.viewCenter.z / 2);
        if (!h)
            h = 0;

        // FIXME: move to base
        base.camera.position.x = this.viewCenter.x;
        base.camera.position.y = this.viewCenter.y;
        base.camera.position.z = this.viewCenter.z + h;
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

    push(entity) {
        this.entities.push(entity);
        if (!entity.mixinNames)
            console.warn("No mixins for ", entity);
        else {
            entity.mixinNames.forEach(function (name) {
                if (!this.entitiesByType[name])
                    this.entitiesByType[name] = [];
                this.entitiesByType[name].push(entity);
            });
        }
    }

    search(param, origin) {
        return _.chain(this.entities).filter(function (e) {
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
        }).sortBy(function (e) {
            if (origin instanceof THREE.Vector3)
                return e.pos.distanceTo(origin);
            return 1;
        }).value();
    }

    initScene(scene) {
        console.log("=== initScene");
        _.each(this.entities, function (e) {
            e.setScene(scene);
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
}

var ArrayType = window.Float64Array || window.Array;

function createMap(w, h) {
    return new ArrayType(w * h);
}

class HeightMap {
    constructor(options) {
        this.options = _.extend({
            width: 256,
            height: 256,
            map: {}
        }, options);

        this.map = this.options.map;

        if (!this.map.rock)
            this.map.rock = createMap(this.options.width, this.options.height);
    };

    generate() {
        var x, y;
        var rock = this.get("rock");
        for (x = 0; x < this.options.width; x++)
            for (y = 0; y < this.options.height; y++) {
                var val = Math.sin(x) * 20.0;///this.options.width;
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
      "player"
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

//FIXME
const Mixins = {};

var uid = 11110;

class Entity {
    constructor(heightmap, ops, models) {
        var entity = EntityTypes[ops.type];
        if (!entity) {
            console.warn("Entity: No Entity-Type named " + ops.type + " found!");
            entity = {};
        }

        _.extend(this, entity);
        _.extend(this, ops);
        // FIXME: reduce complexity and references by removing models, map and so ???
        this.models = models;
        this.state = {};
        this.typeName = this.type;
        this.uid = uid++;
        this.map = heightmap;
        // clone
        this.resources = _.extend({}, this.resources);
        this.type = entity;
        if (!this.meshName)
            this.meshName = "default";

        if (entity.mixins) {
            this.mixins = {};
            this.mixinNames = [];
            this.mixinDef = entity.mixins;
            entity.mixins.forEach(mixin => {
                var found = Mixins[mixin];
                if (found) {
                    this.mixins[mixin] = found;
                    this.mixinNames.push(mixin);
                    _.extend(this, found);
                } else {
                    console.log("Mixin not found", mixin);
                }
            });
        }
    };

    getId() {
        return this.uid
    }

    postLoad() {
        _.each(this.mixins, mixin => {
            if (mixin.postLoad) {
                mixin.postLoad.apply(this, []);
            }
        });
        console.log("MESHES", this);
    };

    isA(mixin) {
        return this.mixinDef.indexOf(mixin) >= 0;
    }

    setScene(scene) {
        console.log("Entity", this, "setScene", this.scene, "mesh:", this.meshName);
        this.scene = scene;
        this.setMesh(this.meshName);
    };

    updateMeshPos() {
        if (this.mesh) {
            if (this.mesh && this.mesh.rotation && this.rotation)
                this.mesh.rotation.z = this.rotation;
            this.mesh.setPos(this.pos.x, this.map.get("rock").interpolate(this.pos.x, this.pos.y), -this.pos.y);
        }
    };

    setMesh(name) {

        if (!name)
            name = this.meshName;

        var entity = this.type;
        var meshType;
        var animation;
        this.meshName = name;

        if (entity.meshes) {
            var def = entity.meshes[name];
            if (!def)
                console.warn("No Mesh of name '" + name + "' found in entity-def", entity);
            meshType = def.mesh;
            animation = def.animation;
        } else if (entity.mesh)
            meshType = entity.mesh;
        else
            meshType = this.typeName;

        this.meshType = meshType;
        this.animation = animation;

        this.models.load(meshType, animation).then((mesh) => {
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
    "type": "json",
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

const onlyOneAtATime = (function () {
    let within = false;
    return function (fct) {
        console.log("TRYING ",fct);
        if (within) {
            console.log("TRYING LATER",fct);
            setTimeout(() => onlyOneAtATime(fct), 10);
        } else {
            within=true;
            console.log("TRYING DOING",fct);
            fct();
            console.log("TRYING DONE",fct);
            within=false;
        }
    }
})();


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
        console.log("ADD MODEL TO SCEEN", this, scene);
        this.scene = scene;
        onlyOneAtATime(() => scene.add(this.outerNode));
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
//      emitter.position.copy(this.position);
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

class Models {

    constructor(loaders = {}, manager = null, meshes = null) {
        _.extend(this, _.pick(loaders, ['objLoader', 'jsonLoader', 'imageLoader']));

        if (!manager) {
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
        if (!this.imageLoader) {
            this.imageLoader = new THREE.ImageLoader(manager);
        }

        if (!this.gltfLoader) {
            this.gltfLoader = new THREE.GLTFLoader();
        }

        // FIXME: add caching later on

        this.textureLoader = new THREE.TextureLoader();

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
        console.log("MESH", mesh);
        var objects;
        if (mesh.scene) {
            objects = mesh.scene;
        } else {
            objects = mesh.clone();
        }
        //let objects = mesh.scene
        console.log("PACK", meshDef, objects, options);

        objects = _.flatten([objects]);

        // enclose mesh within scene-node, so that it can be rotated and there can be several meshes
        // attached to one entity
        const node = new THREE.Object3D();

        _.each(objects, function (object) {

            //         console.log("PRE rotation", meshDef.rotation)
            //          Models.fixPositions(meshDef.rotation)
            console.log("POST rotation", meshDef.rotation);
            //object.rotateX(Math.PI / 2);

            node.add(object);
        });
        const newModel = new Model(objects, node);

        newModel.name = mesh;
        newModel.type = meshName;
        {
            this.addRings(node, newModel);
        }

        //FIXME
        // newModel.animation = animation;
        return newModel
    }

    addRings(node, newModel) {
        node.add(newModel.hoverRing = Models.createRing(0xdd9900));
        node.add(newModel.selectRing = Models.createRing(0xFF9900));
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
        var options = _.extend({}, this.meshes[name]);

        // now override with options from animations-part
        if (options.animations[animation]) {
            options = _.extend(options, options.animations[animation]);
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

class WorldLoader {
    static load(world, data) {
        const models = new Models();

        data.forEach(entityDefinition=>
            world.push(new Entity(world.map, entityDefinition, models))
        );
        console.log("WORLD", world);
        world.entities.forEach(entity=>entity.postLoad());
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

    inform() {
        this.querySelectorAll("*[world-accessor]").forEach(e =>
            e.dispatchEvent(new WorldEvent(this.world)));
    }

    disconnectedCallback() {
        delete document[this.exposeName];
    }

    loadWorld(url) {
        return ajax(url).then(data =>
            WorldLoader.load(this.world, data)
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInNyYy9lbGVtZW50cy9pbnRyby5qcyIsInNyYy9lbGVtZW50cy9jcmVkaXRzLmpzIiwic3JjL2Jhc2UzZC9iYXNlLmpzIiwic3JjL2Jhc2UzZC9za3lib3guanMiLCJzcmMvdGVycmFpbl9idWlsZGVyLmpzIiwic3JjL2Jhc2UzZC9waWNrLmpzIiwic3JjL2Jhc2UzZC9hbnQtc2NlbmUuanMiLCJzcmMvZWxlbWVudHMvYWctZ2FtZS12aWV3LmpzIiwic3JjL2xpYnMvZXZlbnRzLmpzIiwic3JjL2dhbWUvd29ybGQuanMiLCJzcmMvZ2FtZS9oZWlnaHRtYXAuanMiLCJzcmMvYWpheC5qcyIsInNyYy9jb25maWcvZW50aXRpZXMuanMiLCJzcmMvZ2FtZS9lbnRpdHkuanMiLCJzcmMvY29uZmlnL21lc2hlcy5qcyIsInNyYy9iYXNlM2QvbW9kZWwuanMiLCJzcmMvYmFzZTNkL21vZGVscy5qcyIsInNyYy9nYW1lL3dvcmxkLWxvYWRlci5qcyIsInNyYy9lbGVtZW50cy9hZy13b3JsZC5qcyIsInNyYy9lbGVtZW50cy9hZy1lbnRpdHktdmlldy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBJbnRybyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50X3NjcmVlbiA9IC0xO1xuICAgICAgICB0aGlzLnNjcmVlbnMgPSB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbnRyby1zY3JlZW5cIik7XG4gICAgICAgIHRoaXMubmV4dFNjcmVlbkhhbmRsZXIgPSB0aGlzLm5leHRTY3JlZW4uYmluZCh0aGlzKVxuICAgICAgICB0aGlzLm5leHRTY3JlZW4oKVxuICAgIH1cblxuICAgIGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMudW5iaW5kRXZlbnQodGhpcy5zY3JlZW5zW3RoaXMuY3VycmVudF9zY3JlZW5dKVxuICAgIH1cblxuICAgIGJpbmRFdmVudChzY3JlZW4pIHtcbiAgICAgICAgaWYoc2NyZWVuKSB7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcik7XG4gICAgICAgICAgICBzY3JlZW4uYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5uZXh0U2NyZWVuSGFuZGxlcilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVuYmluZEV2ZW50KHNjcmVlbikge1xuICAgICAgICBpZihzY3JlZW4pIHtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKTtcbiAgICAgICAgICAgIHNjcmVlbi5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLm5leHRTY3JlZW5IYW5kbGVyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV4dFNjcmVlbihldikge1xuICAgICAgICB0aGlzLnVuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgaWYodGhpcy5jdXJyZW50X3NjcmVlbiA9PSB0aGlzLnNjcmVlbnMubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ2ZpbmlzaGVkJykpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5nZXRBdHRyaWJ1dGUoJ29uZmluaXNoZWQnKSlcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIixlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmN1cnJlbnRfc2NyZWVuID0gKHRoaXMuY3VycmVudF9zY3JlZW4gKyAxKSAlIHRoaXMuc2NyZWVucy5sZW5ndGg7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50KHRoaXMuc2NyZWVuc1t0aGlzLmN1cnJlbnRfc2NyZWVuXSlcbiAgICAgICAgdGhpcy5zZXRWaXNpYmlsaXR5KClcbiAgICB9XG5cbiAgICBzZXRWaXNpYmlsaXR5KCkge1xuICAgICAgICB0aGlzLnNjcmVlbnMuZm9yRWFjaCgoc2NyZWVuLCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfc2NyZWVuID09IGlkeCkge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjcmVlbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctaW50cm8nKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctaW50cm8nLCBJbnRybyk7XG59XG4iLCJjbGFzcyBDcmVkaXRzIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMuZmluaXNoZWQuYmluZCh0aGlzKVxuXG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwiLmNyZWRpdHNcIilcbiAgICAgICAgY29uc29sZS5sb2coXCJCSU5ELi4uXCIpXG5cbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignd2Via2l0QW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uSXRlcmF0aW9uJywgdGhpcy5oYW5kbGVyKVxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCd3ZWJraXRBbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25JdGVyYXRpb24nLCB0aGlzLmhhbmRsZXIpXG4gICAgfVxuXG5cbiAgICBmaW5pc2hlZChldikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZJTklTSEVEXCIpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBldmFsKHRoaXMuZ2V0QXR0cmlidXRlKCdvbmZpbmlzaGVkJykpXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmlmICghY3VzdG9tRWxlbWVudHMuZ2V0KCdhZy1jcmVkaXRzJykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWNyZWRpdHMnLCBDcmVkaXRzKTtcbn1cbiIsImNvbnN0IGNsb2NrID0gbmV3IFRIUkVFLkNsb2NrKCk7XG5cbmNsYXNzIEJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKGVsKSB7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJFTFwiLCBlbCwgdGhpcylcbiAgICAgICAgdGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xuICAgICAgICB2YXIgY2FtZXJhID0gdGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNjAsIHdpbmRvdy5pbm5lcldpZHRoIC8gd2luZG93LmlubmVySGVpZ2h0LCAxLCAxMDAwMCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xuXG4gICAgICAgIGVsLmFwcGVuZENoaWxkKHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudClcblxuICAgICAgICBjYW1lcmEucG9zaXRpb24ueCA9IDE2O1xuICAgICAgICBjYW1lcmEucG9zaXRpb24ueSA9IC01O1xuICAgICAgICBjYW1lcmEucG9zaXRpb24ueiA9IDEwO1xuICAgICAgICBjYW1lcmEucm90YXRpb24ueCA9IC0oMTAgKyAzMikgKiBNYXRoLlBJIC8gMTgwO1xuXG4gICAgICAgIHRoaXMucGFydGljbGVHcm91cCA9IEJhc2UubWFrZVNQRUdyb3VwKCk7XG5cblxuICAgICAgICB0aGlzLnBhcnRpY2xlR3JvdXAuYWRkUG9vbCgxMCwgdGhpcy5lbWl0dGVyU2V0dGluZ3MsIGZhbHNlKTtcblxuICAgICAgICAvL3RoaXMuc2NlbmUuYmFja2dyb3VuZC5hZGQobmV3IENvbG9yKFwicmVkXCIpKVxuICAgICAgICB0aGlzLnNjZW5lLmFkZCh0aGlzLnBhcnRpY2xlR3JvdXAubWVzaCk7XG4gICAgICAgIHRoaXMuc2NlbmUucGFydGljbGVHcm91cCA9IHRoaXMucGFydGljbGVHcm91cDtcblxuICAgICAgICB0aGlzLmVtaXR0ZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygxLCAxLCAxKSxcbiAgICAgICAgICAgIHBvc2l0aW9uU3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwKSxcblxuICAgICAgICAgICAgYWNjZWxlcmF0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygwLjAzLCAwLCAwKSxcbiAgICAgICAgICAgIGFjY2VsZXJhdGlvblNwcmVhZDogbmV3IFRIUkVFLlZlY3RvcjMoMC4wMSwgMC4wMSwgMCksXG5cbiAgICAgICAgICAgIHZlbG9jaXR5OiBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAwLjcpLFxuICAgICAgICAgICAgdmVsb2NpdHlTcHJlYWQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAuMywgMC41LCAwLjIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0OiBuZXcgVEhSRUUuQ29sb3IoMHhCQkJCQkIpLFxuXG4gICAgICAgICAgICBjb2xvclN0YXJ0U3ByZWFkOiBuZXcgVEhSRUUuVmVjdG9yMygwLjIsIDAuMSwgMC4xKSxcbiAgICAgICAgICAgIGNvbG9yRW5kOiBuZXcgVEhSRUUuQ29sb3IoMHhBQUFBQUEpLFxuXG4gICAgICAgICAgICBzaXplU3RhcnQ6IDAuNSxcbiAgICAgICAgICAgIHNpemVFbmQ6IDQsXG4gICAgICAgICAgICBvcGFjaXR5U3RhcnQ6IDEsXG4gICAgICAgICAgICBvcGFjaXR5RW5kOiAwLjEsXG5cbiAgICAgICAgICAgIC8vcGFydGljbGVDb3VudDogMjAwMCxcbiAgICAgICAgICAgIHBhcnRpY2xlc1BlclNlY29uZDogMTAwLFxuICAgICAgICAgICAgYWxpdmU6IDBcbiAgICAgICAgfTtcblxuICAgIH1cblxuICAgIHN0YXRpYyBtYWtlU1BFR3JvdXAoKSB7XG4gICAgICAgIHJldHVybiAgbmV3IFNQRS5Hcm91cCh7XG4gICAgICAgICAgICB0ZXh0dXJlOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCcuL2ltYWdlcy9zbW9rZXBhcnRpY2xlLnBuZycpLFxuICAgICAgICAgICAgbWF4QWdlOiA0LFxuICAgICAgICAgICAgYmxlbmRpbmc6IFRIUkVFLk5vcm1hbEJsZW5kaW5nXG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICBtYWtlRW1pdHRlcihwb3MpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTUEUuRW1pdHRlcih0aGlzLmVtaXR0ZXJTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgc2V0U2l6ZShzaXplKSB7XG4gICAgICAgIHRoaXMuY2FtZXJhLmFzcGVjdCA9IHdpbmRvdy5pbm5lcldpZHRoIC8gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB0aGlzLmNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xuICAgIH1cblxuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZW5kZXIob3B0aW9ucykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBsYXN0VGltZSA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gZG9yZW5kZXIoKSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoaXMgcmVuZGVyaW5nIC0gYmVjYXVzZSB0aGUgc2NvcGUgLyBjYW52YXMgaXMgZGVzdHJveWVkXG4gICAgICAgICAgICBpZiAoIXNlbGYuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuaGlkZGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9yZW5kZXIsIDUwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShkb3JlbmRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB2YXIgdGltZURpZmYgPSB0aW1lIC0gbGFzdFRpbWU7XG4gICAgICAgICAgICBsYXN0VGltZSA9IHRpbWU7XG5cbiAgICAgICAgICAgIHZhciBkZWx0YTtcbiAgICAgICAgICAgIHZhciB1c2UzanNUaW1lID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmICh1c2UzanNUaW1lKVxuICAgICAgICAgICAgICAgIGRlbHRhID0gY2xvY2suZ2V0RGVsdGEoKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBkZWx0YSA9IHRpbWVEaWZmICogMC4wMDE7XG5cbiAgICAgICAgICAgIGlmIChkZWx0YSA+IDAuMSlcbiAgICAgICAgICAgICAgICBkZWx0YSA9IDAuMTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZnJhbWVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICBvcHRpb25zLmZyYW1lQ2FsbGJhY2soZGVsdGEpO1xuXG4gICAgICAgICAgICBzZWxmLnBhcnRpY2xlR3JvdXAudGljayhkZWx0YSk7XG4gICAgICAgICAgICAvLyBhbmltYXRlIENvbGxhZGEgbW9kZWxcblxuICAgICAgICAgICAgLy9USFJFRS5BbmltYXRpb25NaXhlci51cGRhdGUoZGVsdGEpO1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJlci5yZW5kZXIoc2VsZi5zY2VuZSwgc2VsZi5jYW1lcmEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvcmVuZGVyKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEJhc2U7XG4iLCJcbmZ1bmN0aW9uIGFkZFNreWJveChzY2VuZSkge1xuICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9za3kxLmpwZycsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHQxKSB7XG4gICAgICAgIGNvbnN0IHNreURvbWUgPSBuZXcgVEhSRUUuTWVzaChcbiAgICAgICAgICAgIG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeSg0MDk2LCA2NCwgNjQpLFxuICAgICAgICAgICAgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHttYXA6IHQxLCBzaWRlOiBUSFJFRS5CYWNrU2lkZSwgZm9nOiBmYWxzZX0pXG4gICAgICAgICk7XG4gICAgICAgIHNjZW5lLmFkZChza3lEb21lKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFkZFNreWJveDsiLCJjb25zdCBUZXJyYWluID0gVEhSRUUuVGVycmFpbjtcblxuY2xhc3MgVGVycmFpbkJ1aWxkZXIge1xuXG4gICAgc3RhdGljIGNyZWF0ZVRlcnJhaW4ob3B0aW9ucywgc2NlbmUsIG1hdGVyaWFsLCBoZWlnaHRtYXApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBfLmV4dGVuZCh7d2lkdGg6IDY0LCBoZWlnaHQ6IDY0fSwgb3B0aW9ucyk7XG4gICAgICAgIHZhciB4UyA9IG9wdGlvbnMud2lkdGggLSAxLCB5UyA9IG9wdGlvbnMuaGVpZ2h0IC0gMTtcblxuICAgICAgICBpZiAoIWhlaWdodG1hcClcbiAgICAgICAgICAgIGhlaWdodG1hcCA9IGZ1bmN0aW9uIChnLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJPUFRJT05TXCIsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciB4bCA9IG9wdGlvbnMueFNlZ21lbnRzICsgMSxcbiAgICAgICAgICAgICAgICAgICAgeWwgPSBvcHRpb25zLnlTZWdtZW50cyArIDE7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHhsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHlsOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdbaiAqIHhsICsgaV0ueiArPSBNYXRoLnJhbmRvbSgpICogMTAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgaWYgKHRydWUpXG4gICAgICAgICAgICBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgICAgICAgICAgY29sb3I6IDB4ZmYwMDAwLFxuICAgICAgICAgICAgICAgIHdpcmVmcmFtZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIGxldCB0ZXJyYWluU2NlbmUgPSBUZXJyYWluKHtcbiAgICAgICAgICAgIGVhc2luZzogVGVycmFpbi5MaW5lYXIsXG4gICAgICAgICAgICBmcmVxdWVuY3k6IDIuNSxcbiAgICAgICAgICAgIGhlaWdodG1hcDogaGVpZ2h0bWFwLFxuICAgICAgICAgICAgLy9hZnRlcjogaGVpZ2h0bWFwLFxuICAgICAgICAgICAgbWF0ZXJpYWw6IG1hdGVyaWFsIHx8IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7Y29sb3I6IDB4NTU2NmFhfSksXG4vLyAgICAgICAgICBtYXhIZWlnaHQ6IDEwMCxcbi8vICAgICAgICAgIG1pbkhlaWdodDogLTEwMCxcbi8vbWluSGVpZ2h0OjAsLy91bmRlZmluZWQsXG4vL21heEhlaWdodDoxMCwgLy91bmRlZmluZWQsXG4gICAgICAgICAgICBzdGVwczogMSxcbiAgICAgICAgICAgIHVzZUJ1ZmZlckdlb21ldHJ5OiBmYWxzZSxcbiAgICAgICAgICAgIHhTZWdtZW50czogeFMsXG4gICAgICAgICAgICB4U2l6ZTogb3B0aW9ucy53aWR0aCxcbiAgICAgICAgICAgIHlTZWdtZW50czogeVMsXG4gICAgICAgICAgICB5U2l6ZTogb3B0aW9ucy5oZWlnaHQsXG4gICAgICAgICAgICBzdHJldGNoOiBmYWxzZSxcbiAgICAgICAgICAgIGNsYW1wOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgdGVycmFpblNjZW5lLnJvdGF0aW9uLnggPSAwO1xuICAgICAgICB0ZXJyYWluU2NlbmUucm90YXRpb24ueCA9IC1NYXRoLlBJLzI7XG4gICAgICAgIHRlcnJhaW5TY2VuZS5wb3NpdGlvbi54ICs9IG9wdGlvbnMud2lkdGggLyAyO1xuICAgICAgICB0ZXJyYWluU2NlbmUucG9zaXRpb24ueSArPSBvcHRpb25zLndpZHRoIC8gMjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlRTXCIsIHRlcnJhaW5TY2VuZSk7XG4gICAgICAgIC8vIEFzc3VtaW5nIHlvdSBhbHJlYWR5IGhhdmUgeW91ciBnbG9iYWwgc2NlbmVcbiAgICAgICAgc2NlbmUuYWRkKHRlcnJhaW5TY2VuZSk7XG4gICAgICAgIHRoaXMuZ2VvID0gdGVycmFpblNjZW5lLmNoaWxkcmVuWzBdLmdlb21ldHJ5O1xuICAgIH1cblxuICAgIHN0YXRpYyBjcmVhdGUob3B0aW9ucywgc2NlbmUsIGhlaWdodG1hcCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRFUlJBSU4gY3JlYXRlXCIpO1xuICAgICAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCdtb2RlbHMvc2FuZDEuanBnJywgdW5kZWZpbmVkLCBmdW5jdGlvbiAodDEpIHtcbiAgICAgICAgICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9ncmFzczEuanBnJywgdW5kZWZpbmVkLCBmdW5jdGlvbiAodDIpIHtcbiAgICAgICAgICAgICAgICBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCdtb2RlbHMvc3RvbmUxLmpwZycsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHQzKSB7XG4gICAgICAgICAgICAgICAgICAgIFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoJ21vZGVscy9zbm93MS5qcGcnLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh0NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJsZW5kID0gVGVycmFpbi5nZW5lcmF0ZUJsZW5kZWRNYXRlcmlhbChbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHR1cmU6IHQxfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dHVyZTogdDIsIGxldmVsczogWy04MCwgLTM1LCAyMCwgNTBdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dHVyZTogdDMsIGxldmVsczogWzIwLCA1MCwgNjAsIDg1XX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlOiB0NCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xzbDogJzEuMCAtIHNtb290aHN0ZXAoNjUuMCArIHNtb290aHN0ZXAoLTI1Ni4wLCAyNTYuMCwgdlBvc2l0aW9uLngpICogMTAuMCwgODAuMCwgdlBvc2l0aW9uLnopJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBdLCBzY2VuZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBUZXJyYWluQnVpbGRlci5jcmVhdGVUZXJyYWluKG9wdGlvbnMsIHNjZW5lLCBibGVuZCwgaGVpZ2h0bWFwKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUZXJyYWluQnVpbGRlciIsIi8vdmFyIHByb2plY3RvciA9IG5ldyBUSFJFRS5Qcm9qZWN0b3IoKTtcbnZhciByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cbnZhciBQaWNrID0ge1xuICAgIC8qXG4gICAgKiBtb3VzZT17eDoxMix5OjEyfVxuICAgICogKi9cbiAgICBwaWNrOiBmdW5jdGlvbiAobW91c2UsIGNhbWVyYSwgc2NlbmUpIHtcbiAgICAgICAgLy8gZmluZCBpbnRlcnNlY3Rpb25zXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGNyZWF0ZSBhIFJheSB3aXRoIG9yaWdpbiBhdCB0aGUgbW91c2UgcG9zaXRpb25cbiAgICAgICAgLy8gICBhbmQgZGlyZWN0aW9uIGludG8gdGhlIHNjZW5lIChjYW1lcmEgZGlyZWN0aW9uKVxuICAgICAgICAvL1xuICAgICAgICB2YXIgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAgICAgdmVjLnggPSBtb3VzZS5yeDtcbiAgICAgICAgdmVjLnkgPSBtb3VzZS5yeTtcbiAgICAgICAgcmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodmVjLCBjYW1lcmEpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhbiBhcnJheSBjb250YWluaW5nIGFsbCBvYmplY3RzIGluIHRoZSBzY2VuZSB3aXRoIHdoaWNoIHRoZSByYXkgaW50ZXJzZWN0c1xuICAgICAgICAvLyBpbnRlcnNlY3QgcmVjdXJzaXZlICEhIVxuICAgICAgICB2YXIgcmVzdWx0ID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMoc2NlbmUuY2hpbGRyZW4sIHRydWUpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgUGljazsiLCJcblxuXG5jbGFzcyBBbnRTY2VuZSB7XG4gICAgY29uc3RydWN0b3IodGhyZWVTY2VuZSkge1xuICAgICAgICB0aGlzLl90aHJlZVNjZW5lID0gdGhyZWVTY2VuZVxuICAgICAgICB0aGlzLm1lc2hlcyA9IHt9XG4gICAgICAgIHRoaXMuZW50aXRpZXMgPSBbXVxuICAgIH1cbiAgICB0aWNrKCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiVElDS1wiKVxuICAgIH1cbiAgICBhZGQobm9kZSkge1xuICAgIC8vICAgIHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpXG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBRERcIixub2RlKVxuICAgICAgICB0aGlzLl90aHJlZVNjZW5lLmFkZChub2RlKVxuICAgIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBBbnRTY2VuZSIsImltcG9ydCBCYXNlIGZyb20gXCIuLi9iYXNlM2QvYmFzZVwiO1xuaW1wb3J0IGFkZFNreWJveCBmcm9tIFwiLi4vYmFzZTNkL3NreWJveFwiO1xuaW1wb3J0IFRlcnJhaW5CdWlsZGVyIGZyb20gXCIuLi90ZXJyYWluX2J1aWxkZXJcIjtcbmltcG9ydCBQaWNrIGZyb20gJy4uL2Jhc2UzZC9waWNrJ1xuaW1wb3J0IEFudFNjZW5lIGZyb20gXCIuLi9iYXNlM2QvYW50LXNjZW5lXCI7XG5cbmNsYXNzIEFnR2FtZVZpZXcgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMuc2V0dXBUaHJlZSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQWdHYW1lVmlldyBjb25uZWN0ZWRcIik7XG5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy51cGRhdGVTaXplLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5tb3VzZWRvd24uYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5tb3VzZW1vdmUuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMud2hlZWwuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLnZpc2liaWxpdHlDaGFuZ2UsIHRoaXMudmlzaWJpbGl0eUNoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLnZpZXdDZW50ZXIgPSB7eDogMCwgeTogMCwgejogMTB9O1xuXG4gICAgICAgIHRoaXMubW92ZXMgPSAwO1xuICAgICAgICB0aGlzLnVwZGF0ZVNpemUoe3RhcmdldDogd2luZG93fSk7XG4gICAgICAgIHRoaXMuYmFzZS5yZW5kZXIoe2ZyYW1lQ2FsbGJhY2s6IHRoaXMuZnJhbWVDYWxsYmFjay5iaW5kKHRoaXMpfSlcbiAgICB9XG5cbiAgICBmcmFtZUNhbGxiYWNrKGUpIHtcbiAgICAgICAgdGhpcy5hbnRTY2VuZS50aWNrKClcbiAgICB9XG5cbiAgICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy51cGRhdGVTaXplLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5tb3VzZWRvd24uYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5tb3VzZW1vdmUuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIHRoaXMud2hlZWwuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuY2xpY2suYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRoaXMua2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLmdldFZpc2liaWxpdHlDaGFuZ2VFdmVudCgpLnZpc2liaWxpdHlDaGFuZ2UsIHRoaXMudmlzaWJpbGl0eUNoYW5nZS5iaW5kKHRoaXMpKVxuICAgIH1cblxuICAgIHdvcmxkQ3JlYXRlZChlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiPT09PSBXT1JMRCBDUkVBVEVEXCIpXG4gICAgICAgIHRoaXMud29ybGQgPSBlLndvcmxkO1xuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLndvcmxkLm1hcDtcblxuICAgICAgICBjb25zdCB0aHJlZUhlaWdodE1hcCA9IG1hcC50b1RocmVlVGVycmFpbigpO1xuXG4gICAgICAgIFRlcnJhaW5CdWlsZGVyLmNyZWF0ZShtYXAsIHRoaXMuc2NlbmUsIHRocmVlSGVpZ2h0TWFwKTtcblxuICAgICAgICAvLyBGSVhNRTogbG9hZCBhbGwgbW9kZWxzIGJlZm9yZWhhbmRcbiAgICAgICAgdGhpcy53b3JsZC5pbml0U2NlbmUodGhpcy5hbnRTY2VuZSk7XG4gICAgfVxuXG4gICAgZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkge1xuICAgICAgICB2YXIgaGlkZGVuLCB2aXNpYmlsaXR5Q2hhbmdlO1xuICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgICAgICAgICAgaGlkZGVuID0gXCJoaWRkZW5cIjtcbiAgICAgICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGhpZGRlbiA9IFwibXNIaWRkZW5cIjtcbiAgICAgICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSBcIm1zdmlzaWJpbGl0eWNoYW5nZVwiO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGhpZGRlbiA9IFwid2Via2l0SGlkZGVuXCI7XG4gICAgICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gXCJ3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHt2aXNpYmlsaXR5Q2hhbmdlLCBoaWRkZW59O1xuICAgIH1cblxuICAgIHNldHVwVGhyZWUoKSB7XG4gICAgICAgIHRoaXMuYmFzZSA9IG5ldyBCYXNlKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lID0gdGhpcy5iYXNlLnNjZW5lO1xuXG4gICAgICAgIC8vIHNvZnQgd2hpdGUgbGlnaHRcbiAgICAgICAgdmFyIGxpZ2h0ID0gbmV3IFRIUkVFLkFtYmllbnRMaWdodCgweDIwMjAyMCk7XG4gICAgICAgIHRoaXMuc2NlbmUuYWRkKGxpZ2h0KTtcblxuICAgICAgICAvLyBXaGl0ZSBkaXJlY3Rpb25hbCBsaWdodCBhdCBoYWxmIGludGVuc2l0eSBzaGluaW5nIGZyb20gdGhlIHRvcC5cbiAgICAgICAgdmFyIGRpcmVjdGlvbmFsTGlnaHQgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmZmZmZiwgMC43KTtcbiAgICAgICAgZGlyZWN0aW9uYWxMaWdodC5wb3NpdGlvbi5zZXQoMSwgMCwgMC43KTtcbiAgICAgICAgdGhpcy5zY2VuZS5hZGQoZGlyZWN0aW9uYWxMaWdodCk7XG5cbiAgICAgICAgYWRkU2t5Ym94KHRoaXMuc2NlbmUpO1xuXG4gICAgICAgIHRoaXMuYW50U2NlbmUgPSBuZXcgQW50U2NlbmUodGhpcy5zY2VuZSlcbiAgICB9XG5cblxuICAgIHRpY2soZGVsdGEpIHtcbiAgICAgICAgaWYgKCF3b3JsZC5wYXVzZSkge1xuICAgICAgICAgICAgXy5lYWNoKHdvcmxkLmVudGl0aWVzLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlICYmIGUub25GcmFtZSlcbiAgICAgICAgICAgICAgICAgICAgZS5vbkZyYW1lKGRlbHRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gJGFwcGx5IGhvb2tcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZpc2liaWxpdHlDaGFuZ2UoZXYpIHtcbiAgICAgICAgaWYoZXYudGFyZ2V0W3RoaXMuZ2V0VmlzaWJpbGl0eUNoYW5nZUV2ZW50KCkuaGlkZGVuXSkge1xuICAgICAgICAgICAgLy8gaGlkZGVuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB2aXNpYmxlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVTaXplKGV2KSB7XG4gICAgICAgIHRoaXMuYmFzZS5zZXRTaXplKHt9KTtcbiAgICAgICAgdGhpcy5jb250YWluZXJXaWR0aCA9IGV2LnRhcmdldC5pbm5lcldpZHRoO1xuICAgICAgICB0aGlzLmNvbnRhaW5lckhlaWdodCA9IGV2LnRhcmdldC5pbm5lckhlaWdodFxuICAgIH1cblxuICAgIG1vdXNldXAoZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdXNldXBcIiwgZSk7XG4gICAgICAgIHRoaXMubW91c2Vpc2Rvd24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBtb3VzZWRvd24oZSkge1xuICAgICAgICB0aGlzLm1vdXNlaXNkb3duID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5veCA9IGUucGFnZVg7XG4gICAgICAgIHRoaXMub3kgPSBlLnBhZ2VZO1xuICAgICAgICB0aGlzLm1vdmVzID0gMDtcbiAgICB9XG5cbiAgICB3aGVlbChlKSB7XG4gICAgICAgIHRoaXMudmlld0NlbnRlci56ICs9IGUuZGVsdGFZICogMC4xO1xuICAgICAgICBpZiAodGhpcy52aWV3Q2VudGVyLnogPCA1KSB7XG4gICAgICAgICAgICB0aGlzLnZpZXdDZW50ZXIueiA9IDVcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZUNhbWVyYSgpXG4gICAgfVxuXG4gICAgY2xpY2soZSkge1xuICAgICAgICAvL0ZJWE1FOiBtb3ZlIHRvIHdvcmxkXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ0xJQ0tcIiwgZSk7XG4gICAgICAgIGNvbnN0IHdvcmxkID0gdGhpcy53b3JsZDtcbiAgICAgICAgaWYgKHdvcmxkLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgICAgICAgIHdvcmxkLnNlbGVjdCh3b3JsZC5ob3ZlcmVkRW50aXR5KTtcbiAgICAgICAgfSBlbHNlIGlmICh3b3JsZC5zZWxlY3RlZEVudGl0eSAmJiB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iICYmIHdvcmxkLnNlbGVjdGVkRW50aXR5LmlzQShcImhlcm9cIikgJiYgd29ybGQuc2VsZWN0ZWRFbnRpdHkucGxheWVyID09IFwiaHVtYW5cIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhc3NpZ24gbmV3IG1vdmUgam9iXCIpO1xuICAgICAgICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucmVzZXRKb2JzKCk7XG4vLyAgICAgICAgICB3b3JsZC5zZWxlY3RlZEVudGl0eS5wdXNoSm9iKG5ldyBKb2JzLm1sLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksbGFzdFBvcykpO1xuICAgICAgICAgICAgd29ybGQuc2VsZWN0ZWRFbnRpdHkucHVzaEhsSm9iKG5ldyBKb2JzLmhsLk1vdmUod29ybGQuc2VsZWN0ZWRFbnRpdHksIGxhc3RQb3MpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcIlNDRU5FXCIsIHRoaXMuc2NlbmUpXG4gICAgfVxuXG4gICAgbW91c2Vtb3ZlKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB0aGlzLm1vdmVzICs9IDE7XG4gICAgICAgIGlmICh0aGlzLm1vdXNlaXNkb3duKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmUoe2R4OiBlLnBhZ2VYIC0gdGhpcy5veCwgZHk6IGUucGFnZVkgLSB0aGlzLm95fSk7XG4gICAgICAgICAgICB0aGlzLm94ID0gZS5wYWdlWDtcbiAgICAgICAgICAgIHRoaXMub3kgPSBlLnBhZ2VZO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaG92ZXIoe1xuICAgICAgICAgICAgeDogZS5wYWdlWCxcbiAgICAgICAgICAgIHk6IGUucGFnZVksXG4gICAgICAgICAgICByeDogZS5wYWdlWCAvIHRoaXMuY29udGFpbmVyV2lkdGggKiAyIC0gMSxcbiAgICAgICAgICAgIHJ5OiAtZS5wYWdlWSAvIHRoaXMuY29udGFpbmVySGVpZ2h0ICogMiArIDEsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGhvdmVyKG1vdXNlKSB7XG4gICAgICAgIHZhciByZXMgPSBQaWNrLnBpY2sobW91c2UsIHRoaXMuYmFzZS5jYW1lcmEsIHRoaXMuYmFzZS5zY2VuZSk7XG5cbiAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgZW50aXR5ID0gcmVzWzBdLm9iamVjdC51c2VyRGF0YS5lbnRpdHk7XG4gICAgICAgICAgICBpZighZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgZW50aXR5ID0gcmVzWzBdLm9iamVjdC5wYXJlbnQudXNlckRhdGEuZW50aXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy53b3JsZC5ob3ZlcihlbnRpdHkpO1xuXG4gICAgICAgICAgICBpZiAoIWVudGl0eSkge1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdFBvcyA9IG5ldyBUSFJFRS5WZWN0b3IyKCkuY29weShyZXNbMF0ucG9pbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW92ZShkKSB7XG5cbiAgICAgICAgdGhpcy52aWV3Q2VudGVyLnggLT0gZC5keCAqIDAuMDM7XG4gICAgICAgIHRoaXMudmlld0NlbnRlci55ICs9IGQuZHkgKiAwLjAzO1xuXG4gICAgICAgIHRoaXMudXBkYXRlQ2FtZXJhKClcbiAgICB9XG5cbiAgICB1cGRhdGVDYW1lcmEoKSB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcy5iYXNlO1xuICAgICAgICAvLyBGSVhNRTogbW92ZSB0byB3b3JsZFxuICAgICAgICB2YXIgaCA9IHRoaXMud29ybGQubWFwLmdldChcInJvY2tcIikuaW50ZXJwb2xhdGUodGhpcy52aWV3Q2VudGVyLngsIHRoaXMudmlld0NlbnRlci55ICsgdGhpcy52aWV3Q2VudGVyLnogLyAyKTtcbiAgICAgICAgaWYgKCFoKVxuICAgICAgICAgICAgaCA9IDA7XG5cbiAgICAgICAgLy8gRklYTUU6IG1vdmUgdG8gYmFzZVxuICAgICAgICBiYXNlLmNhbWVyYS5wb3NpdGlvbi54ID0gdGhpcy52aWV3Q2VudGVyLng7XG4gICAgICAgIGJhc2UuY2FtZXJhLnBvc2l0aW9uLnkgPSB0aGlzLnZpZXdDZW50ZXIueTtcbiAgICAgICAgYmFzZS5jYW1lcmEucG9zaXRpb24ueiA9IHRoaXMudmlld0NlbnRlci56ICsgaDtcbiAgICB9XG5cbiAgICBrZXlkb3duKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJLRVlkb3duXCIsIGUpO1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDI3KSB7XG4gICAgICAgICAgICB3b3JsZC5zZWxlY3QobnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWdhbWUtdmlldycpKSB7XG4gICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdhZy1nYW1lLXZpZXcnLCBBZ0dhbWVWaWV3KTtcbn1cbiIsIi8vIHNoYW1lbGVzc2x5IHN0b2xlbiBmcm9tIGh0dHBzOi8vZGF2aWR3YWxzaC5uYW1lL3B1YnN1Yi1qYXZhc2NyaXB0XG4vLyBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUIGxpY2Vuc2VcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXZlbnRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMgPSBbXVxuICAgIH1cblxuICAgIHN1YnNjcmliZShsaXN0ZW5lcikge1xuXG4gICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzO1xuXG4gICAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgICAgY29uc3QgaW5kZXggPSBsaXN0ZW5lcnMucHVzaChsaXN0ZW5lcikgLSAxO1xuXG4gICAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxpc3RlbmVyc1tpbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHVibGlzaChpbmZvKSB7XG4gICAgICAgIC8vIEN5Y2xlIHRocm91Z2ggdG9waWNzIHF1ZXVlLCBmaXJlIVxuICAgICAgICB0aGlzLmxpc3RlbmVycy5mb3JFYWNoKChpdGVtKT0+IHtcbiAgICAgICAgICAgIGl0ZW0oaW5mbyAhPSB1bmRlZmluZWQgPyBpbmZvIDoge30pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgRXZlbnRzIGZyb20gJy4uL2xpYnMvZXZlbnRzJ1xuXG5jbGFzcyBXb3JsZCB7XG4gICAgY29uc3RydWN0b3IobWFwKSB7XG4gICAgICAgIHRoaXMubWFwID0gbWFwO1xuICAgICAgICB0aGlzLmVudGl0aWVzID0gW107XG4gICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGUgPSB7fTtcbiAgICAgICAgaWYgKCF3aW5kb3cuV29ybGQpXG4gICAgICAgICAgICB3aW5kb3cuV29ybGQgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMuaG92ZXJlZCA9IG5ldyBFdmVudHMoKVxuICAgICAgICB0aGlzLnNlbGVjdGVkID0gbmV3IEV2ZW50cygpXG4gICAgfVxuXG4gICAgcHVzaChlbnRpdHkpIHtcbiAgICAgICAgdGhpcy5lbnRpdGllcy5wdXNoKGVudGl0eSk7XG4gICAgICAgIGlmICghZW50aXR5Lm1peGluTmFtZXMpXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBtaXhpbnMgZm9yIFwiLCBlbnRpdHkpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGVudGl0eS5taXhpbk5hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW50aXRpZXNCeVR5cGVbbmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmVudGl0aWVzQnlUeXBlW25hbWVdLnB1c2goZW50aXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VhcmNoKHBhcmFtLCBvcmlnaW4pIHtcbiAgICAgICAgcmV0dXJuIF8uY2hhaW4odGhpcy5lbnRpdGllcykuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAocGFyYW0gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbShlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbmFtZSBpbiBwYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gcGFyYW1bbmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT0JKXCIsIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZVtuYW1lXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGVbbmFtZV0sIHZhbCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZVtuYW1lXSBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZVtuYW1lXVt2YWxdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVbbmFtZV0gIT0gdmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KS5zb3J0QnkoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmIChvcmlnaW4gaW5zdGFuY2VvZiBUSFJFRS5WZWN0b3IzKVxuICAgICAgICAgICAgICAgIHJldHVybiBlLnBvcy5kaXN0YW5jZVRvKG9yaWdpbik7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSkudmFsdWUoKTtcbiAgICB9XG5cbiAgICBpbml0U2NlbmUoc2NlbmUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCI9PT0gaW5pdFNjZW5lXCIpO1xuICAgICAgICBfLmVhY2godGhpcy5lbnRpdGllcywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUuc2V0U2NlbmUoc2NlbmUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBob3ZlcihlbnRpdHkpIHtcbiAgICAgICAgaWYgKHRoaXMuaG92ZXJlZEVudGl0eSlcbiAgICAgICAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKGZhbHNlKTtcblxuICAgICAgICB0aGlzLmhvdmVyZWRFbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIGlmICh0aGlzLmhvdmVyZWRFbnRpdHkpIHtcbiAgICAgICAgICAgIHRoaXMuaG92ZXJlZEVudGl0eS5ob3ZlcmVkKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5ob3ZlcmVkLnB1Ymxpc2goZW50aXR5KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0KGVudGl0eSkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZEVudGl0eSlcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRFbnRpdHkuc2VsZWN0ZWQoZmFsc2UpO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRW50aXR5ID0gZW50aXR5O1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZEVudGl0eSkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEVudGl0eS5zZWxlY3RlZCh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQucHVibGlzaChlbnRpdHkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRTZWxlY3RlZEhlcm8oKSB7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3RlZEhlcm8pIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRIZXJvID0gdGhpcy5zZWFyY2goe3BsYXllcjogXCJodW1hblwifSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0ZWRIZXJvO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgV29ybGQ7IiwidmFyIEFycmF5VHlwZSA9IHdpbmRvdy5GbG9hdDY0QXJyYXkgfHwgd2luZG93LkFycmF5O1xuXG5mdW5jdGlvbiBjcmVhdGVNYXAodywgaCkge1xuICAgIHJldHVybiBuZXcgQXJyYXlUeXBlKHcgKiBoKTtcbn1cblxuY2xhc3MgSGVpZ2h0TWFwIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgIHdpZHRoOiAyNTYsXG4gICAgICAgICAgICBoZWlnaHQ6IDI1NixcbiAgICAgICAgICAgIG1hcDoge31cbiAgICAgICAgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5tYXAgPSB0aGlzLm9wdGlvbnMubWFwO1xuXG4gICAgICAgIGlmICghdGhpcy5tYXAucm9jaylcbiAgICAgICAgICAgIHRoaXMubWFwLnJvY2sgPSBjcmVhdGVNYXAodGhpcy5vcHRpb25zLndpZHRoLCB0aGlzLm9wdGlvbnMuaGVpZ2h0KTtcbiAgICB9O1xuXG4gICAgZ2VuZXJhdGUoKSB7XG4gICAgICAgIHZhciB4LCB5O1xuICAgICAgICB2YXIgcm9jayA9IHRoaXMuZ2V0KFwicm9ja1wiKTtcbiAgICAgICAgZm9yICh4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKVxuICAgICAgICAgICAgZm9yICh5ID0gMDsgeSA8IHRoaXMub3B0aW9ucy5oZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBNYXRoLnNpbih4KSAqIDIwLjA7Ly8vdGhpcy5vcHRpb25zLndpZHRoO1xuICAgICAgICAgICAgICAgIHJvY2soeCwgeSwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICB9O1xuXG4gICAgZ2V0KHR5cGUpIHtcbiAgICAgICAgdmFyIHcgPSB0aGlzLm9wdGlvbnMud2lkdGg7XG4gICAgICAgIHZhciBhcnJheSA9IHRoaXMubWFwW3R5cGVdO1xuXG4gICAgICAgIHZhciBmY3QgPSBmdW5jdGlvbiAoeCwgeSwgdmFsKSB7XG4gICAgICAgICAgICB2YXIgaSA9IHggKyB3ICogeTtcbiAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycmF5W2ldID0gdmFsO1xuICAgICAgICAgICAgcmV0dXJuIGFycmF5W2ldO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZjdC5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICB2YXIgZnggPSBNYXRoLmZsb29yKHgpO1xuICAgICAgICAgICAgdmFyIGZ5ID0gTWF0aC5mbG9vcih5KTtcbiAgICAgICAgICAgIHZhciB2MDAgPSB0aGlzKGZ4LCBmeSk7XG4gICAgICAgICAgICB2YXIgdjAxID0gdGhpcyhmeCwgZnkgKyAxKTtcbiAgICAgICAgICAgIHZhciB2MTAgPSB0aGlzKGZ4ICsgMSwgZnkpO1xuICAgICAgICAgICAgdmFyIHYxMSA9IHRoaXMoZnggKyAxLCBmeSArIDEpO1xuICAgICAgICAgICAgdmFyIGR4ID0geCAtIGZ4O1xuICAgICAgICAgICAgdmFyIGR5ID0geSAtIGZ5O1xuICAgICAgICAgICAgcmV0dXJuICh2MDAgKiAoMSAtIGR4KSArIHYxMCAqIGR4KSAqICgxIC0gZHkpICsgKHYwMSAqICgxIC0gZHgpICsgdjExICogZHgpICogZHk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGZjdDtcbiAgICB9O1xuXG4gICAgcGlja0dyZWVuKHcsIGgsIGRhdGEpIHtcbiAgICAgICAgdmFyIGEgPSBuZXcgQXJyYXkodyAqIGgpO1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgZm9yICh5ID0gMDsgeSA8IGg7IHkrKykge1xuICAgICAgICAgICAgZm9yICh4ID0gMDsgeCA8IHc7IHgrKykge1xuICAgICAgICAgICAgICAgIGFbeSAqIHcgKyB4XSA9IGRhdGFbKHkgKiB3ICsgeCkgKiA0ICsgMV0gKiAwLjI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcblxuXG4gICAgdG9UaHJlZVRlcnJhaW4oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChnLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCB4bCA9IG9wdGlvbnMueFNlZ21lbnRzICsgMSxcbiAgICAgICAgICAgICAgICAgIHlsID0gb3B0aW9ucy55U2VnbWVudHMgKyAxO1xuICAgICAgICAgICAgY29uc3Qgcm9jayA9IHNlbGYuZ2V0KFwicm9ja1wiKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgeGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgeWw7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBnWyh5bCAtIGogLSAxKSAqIHhsICsgaV0ueiArPSByb2NrKGksIGopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4vKlxuICAgIHRvVGV4dHVyZSgpIHtcbiAgICAgICAgLy8gVU5URVNURUQgISEhIVxuICAgICAgICB2YXIgcmFtcFRleCA9IG5ldyBUSFJFRS5EYXRhVGV4dHVyZShkYXRhLnBpeGVscywgZGF0YS53aWR0aCwgZGF0YS5oZWlnaHQsIFRIUkVFLlJHQkFGb3JtYXQpO1xuICAgICAgICByYW1wVGV4Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICB9O1xuKi9cblxuLy8gRklYTUUgdGhpcyBzaG91bGQgbW92ZWQgc29tZXdoZXJlIGVsc2VcbiAgICB0b0NhbnZhcyhfdHlwZSkge1xuICAgICAgICB2YXIgdHlwZSA9IF90eXBlIHx8IFwicm9ja1wiO1xuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXG4gICAgICAgICAgICBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHRoaXMub3B0aW9ucy53aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHRoaXMub3B0aW9ucy5oZWlnaHQ7XG4gICAgICAgIHZhciBkID0gY29udGV4dC5jcmVhdGVJbWFnZURhdGEoY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KSxcbiAgICAgICAgICAgIGRhdGEgPSBkLmRhdGE7XG4gICAgICAgIHZhciBtaW4sIG1heDtcbiAgICAgICAgdmFyIGFjY2Vzc29yID0gdGhpcy5nZXQodHlwZSk7XG4gICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSBhY2Nlc3Nvcih4LCB5KTtcblxuICAgICAgICAgICAgICAgIGlmICghbWluIHx8IG1pbiA+IHYpXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IHY7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXggfHwgbWF4IDwgdilcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhcIk1NTU1cIiwgbWluLCBtYXgpO1xuXG4gICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy5vcHRpb25zLmhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMub3B0aW9ucy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSB5ICogdGhpcy5vcHRpb25zLmhlaWdodCArIHg7XG4gICAgICAgICAgICAgICAgaWR4ID0gaSAqIDQ7XG4gICAgICAgICAgICAgICAgZGF0YVtpZHhdID0gZGF0YVtpZHggKyAxXSA9IGRhdGFbaWR4ICsgMl0gPSBNYXRoLnJvdW5kKCgoYWNjZXNzb3IoeCwgeSkgLSBtaW4pIC8gKG1heCAtIG1pbikpICogMjU1KTtcbiAgICAgICAgICAgICAgICBkYXRhW2lkeCArIDNdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGQsIDAsIDApO1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSGVpZ2h0TWFwO1xuIiwiZnVuY3Rpb24gYWpheCh1cmwsIG1ldGhvZCA9IFwiR0VUXCIsIGRhdGEgPSB7fSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT09IFhNTEh0dHBSZXF1ZXN0LkRPTkUpIHtcblxuICAgICAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA8PSAyOTkgJiYgcmVxdWVzdC5zdGF0dXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSRVNQT05TRVwiLCByZXF1ZXN0LCB0eXBlb2YgcmVxdWVzdC5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByZXF1ZXN0LnJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXF1ZXN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIEVycm9yJykpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgcmVxdWVzdC5zZW5kKGRhdGEpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhamF4OyIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICB9LFxuICBcImNyb3BcIjoge1xuICAgIFwibWVzaE5hbWVcIjogXCJ0aW55XCIsXG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJoaWdoXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9oaWdoXCJcbiAgICAgIH0sXG4gICAgICBcIm1lZFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcImNyb3BfbWVkXCJcbiAgICAgIH0sXG4gICAgICBcInNtYWxsXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF9zbWFsbFwiXG4gICAgICB9LFxuICAgICAgXCJ0aW55XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwiY3JvcF90aW55XCJcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwibWlsbFwiOiB7XG4gIH0sXG4gIFwibWluZVwiOiB7XG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gIH0sXG4gIFwiZ3JhdmVcIjoge1xuICB9LFxuICBcIndlbGxcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJ3YXRlclwiXG4gICAgXSxcbiAgICBcInJlc291cmNlc1wiOiB7XG4gICAgICBcIndhdGVyXCI6IDEwMFxuICAgIH1cbiAgfSxcbiAgXCJmaXNoaW5nX2h1dFwiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiXG4gICAgXVxuICB9LFxuICBcIndvcmtzaG9wXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxLFxuICAgICAgXCJ0b29sXCI6IDEwXG4gICAgfSxcbiAgICBcInByb2R1Y3Rpb25cIjoge1xuICAgICAgXCJ0b29sXCI6IHtcbiAgICAgICAgXCJ3b29kXCI6IDEsXG4gICAgICAgIFwic3RvbmVcIjogMVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJob3VzZVwiLFxuICAgICAgXCJzbW9rZVwiXG4gICAgXVxuICB9LFxuICBcInRvd25oYWxsXCI6IHtcbiAgICBcIm5lZWRlZFwiOiB7XG4gICAgICBcIndvb2RcIjogMSxcbiAgICAgIFwic3RvbmVcIjogMSxcbiAgICAgIFwid2F0ZXJcIjogMSxcbiAgICAgIFwiZm9vZFwiOiAxXG4gICAgfSxcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImJvc3NcIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImhvdXNlXCJcbiAgICBdXG4gIH0sXG4gIFwiaGVyb1wiOiB7XG4gICAgXCJtaXhpbnNcIjogW1xuICAgICAgXCJib3NzXCIsXG4gICAgICBcImhlcm9cIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcInBsYXllclwiXG4gICAgXVxuICB9LFxuICBcInRvd2VyXCI6IHtcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImJvc3NcIixcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImhvdXNlXCJcbiAgICBdXG4gIH0sXG4gIFwibWFuXCI6IHtcbiAgICBcIm1lc2hlc1wiOiB7XG4gICAgICBcInNpdFwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzaXRcIlxuICAgICAgfSxcbiAgICAgIFwic2l0ZG93blwiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJzaXRkb3duXCJcbiAgICAgIH0sXG4gICAgICBcInN0YW5kXCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInN0YW5kXCJcbiAgICAgIH0sXG4gICAgICBcIndhbGtcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fZV93YWxrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwid2Fsa1wiXG4gICAgICB9LFxuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2Vfd2Fsa1wiLFxuICAgICAgICBcImFuaW1hdGlvblwiOiBcInN0YW5kXCJcbiAgICAgIH0sXG4gICAgICBcImZpZ2h0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwibWFuX2ZpZ2h0XCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiZmlnaHRcIlxuICAgICAgfSxcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcIm1hbl9waWNrXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwicGlja1wiXG4gICAgICB9LFxuICAgICAgXCJheGVcIjoge1xuICAgICAgICBcIm1lc2hcIjogXCJtYW5fYXhlXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwiYXhlXCJcbiAgICAgIH1cbiAgICB9LFxuICAgIFwibWl4aW5zXCI6IFtcbiAgICAgIFwiam9iXCIsXG4gICAgICBcImZvbGxvd2VyXCJcbiAgICBdXG4gIH0sXG4gIFwiZmlyXCI6IHtcbiAgICBcInByb3ZpZGVzXCI6IFtcbiAgICAgIFwid29vZFwiXG4gICAgXSxcbiAgICBcInJlc291cmNlc1wiOiB7XG4gICAgICBcIndvb2RcIjogNVxuICAgIH1cbiAgfSxcbiAgXCJ0cmVlXCI6IHtcbiAgfSxcbiAgXCJiaWdfc3RvbmVcIjoge1xuICAgIFwicHJvdmlkZXNcIjogW1xuICAgICAgXCJzdG9uZVwiXG4gICAgXSxcbiAgICBcInJlc291cmNlc1wiOiB7XG4gICAgICBcInN0b25lXCI6IDIwXG4gICAgfVxuICB9LFxuICBcInNoZWVwXCI6IHtcbiAgICBcIm1peGluc1wiOiBbXG4gICAgICBcImpvYlwiLFxuICAgICAgXCJhbmltYWxcIlxuICAgIF0sXG4gICAgXCJzcGVlZFwiOiAwLjUsXG4gICAgXCJtZXNoZXNcIjoge1xuICAgICAgXCJkZWZhdWx0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJlYXRcIlxuICAgICAgfSxcbiAgICAgIFwiZWF0XCI6IHtcbiAgICAgICAgXCJtZXNoXCI6IFwic2hlZXBcIixcbiAgICAgICAgXCJhbmltYXRpb25cIjogXCJlYXRcIlxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwibWVzaFwiOiBcInNoZWVwXCIsXG4gICAgICAgIFwiYW5pbWF0aW9uXCI6IFwid2Fsa1wiXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgRW50aXR5VHlwZXMgZnJvbSAnLi4vY29uZmlnL2VudGl0aWVzJ1xuXG4vL0ZJWE1FXG5jb25zdCBNaXhpbnMgPSB7fTtcblxudmFyIHVpZCA9IDExMTEwO1xuXG5jbGFzcyBFbnRpdHkge1xuICAgIGNvbnN0cnVjdG9yKGhlaWdodG1hcCwgb3BzLCBtb2RlbHMpIHtcbiAgICAgICAgdmFyIGVudGl0eSA9IEVudGl0eVR5cGVzW29wcy50eXBlXTtcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkVudGl0eTogTm8gRW50aXR5LVR5cGUgbmFtZWQgXCIgKyBvcHMudHlwZSArIFwiIGZvdW5kIVwiKTtcbiAgICAgICAgICAgIGVudGl0eSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgXy5leHRlbmQodGhpcywgZW50aXR5KTtcbiAgICAgICAgXy5leHRlbmQodGhpcywgb3BzKTtcbiAgICAgICAgLy8gRklYTUU6IHJlZHVjZSBjb21wbGV4aXR5IGFuZCByZWZlcmVuY2VzIGJ5IHJlbW92aW5nIG1vZGVscywgbWFwIGFuZCBzbyA/Pz9cbiAgICAgICAgdGhpcy5tb2RlbHMgPSBtb2RlbHM7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICAgICAgdGhpcy50eXBlTmFtZSA9IHRoaXMudHlwZTtcbiAgICAgICAgdGhpcy51aWQgPSB1aWQrKztcbiAgICAgICAgdGhpcy5tYXAgPSBoZWlnaHRtYXA7XG4gICAgICAgIC8vIGNsb25lXG4gICAgICAgIHRoaXMucmVzb3VyY2VzID0gXy5leHRlbmQoe30sIHRoaXMucmVzb3VyY2VzKTtcbiAgICAgICAgdGhpcy50eXBlID0gZW50aXR5O1xuICAgICAgICBpZiAoIXRoaXMubWVzaE5hbWUpXG4gICAgICAgICAgICB0aGlzLm1lc2hOYW1lID0gXCJkZWZhdWx0XCI7XG5cbiAgICAgICAgaWYgKGVudGl0eS5taXhpbnMpIHtcbiAgICAgICAgICAgIHRoaXMubWl4aW5zID0ge307XG4gICAgICAgICAgICB0aGlzLm1peGluTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMubWl4aW5EZWYgPSBlbnRpdHkubWl4aW5zO1xuICAgICAgICAgICAgZW50aXR5Lm1peGlucy5mb3JFYWNoKG1peGluID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBNaXhpbnNbbWl4aW5dO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1peGluc1ttaXhpbl0gPSBmb3VuZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5taXhpbk5hbWVzLnB1c2gobWl4aW4pO1xuICAgICAgICAgICAgICAgICAgICBfLmV4dGVuZCh0aGlzLCBmb3VuZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJNaXhpbiBub3QgZm91bmRcIiwgbWl4aW4pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZ2V0SWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVpZFxuICAgIH1cblxuICAgIHBvc3RMb2FkKCkge1xuICAgICAgICBfLmVhY2godGhpcy5taXhpbnMsIG1peGluID0+IHtcbiAgICAgICAgICAgIGlmIChtaXhpbi5wb3N0TG9hZCkge1xuICAgICAgICAgICAgICAgIG1peGluLnBvc3RMb2FkLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTUVTSEVTXCIsIHRoaXMpXG4gICAgfTtcblxuICAgIGlzQShtaXhpbikge1xuICAgICAgICByZXR1cm4gdGhpcy5taXhpbkRlZi5pbmRleE9mKG1peGluKSA+PSAwO1xuICAgIH1cblxuICAgIHNldFNjZW5lKHNjZW5lKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRW50aXR5XCIsIHRoaXMsIFwic2V0U2NlbmVcIiwgdGhpcy5zY2VuZSwgXCJtZXNoOlwiLCB0aGlzLm1lc2hOYW1lKTtcbiAgICAgICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgICAgICB0aGlzLnNldE1lc2godGhpcy5tZXNoTmFtZSk7XG4gICAgfTtcblxuICAgIHVwZGF0ZU1lc2hQb3MoKSB7XG4gICAgICAgIGlmICh0aGlzLm1lc2gpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm1lc2ggJiYgdGhpcy5tZXNoLnJvdGF0aW9uICYmIHRoaXMucm90YXRpb24pXG4gICAgICAgICAgICAgICAgdGhpcy5tZXNoLnJvdGF0aW9uLnogPSB0aGlzLnJvdGF0aW9uO1xuICAgICAgICAgICAgdGhpcy5tZXNoLnNldFBvcyh0aGlzLnBvcy54LCB0aGlzLm1hcC5nZXQoXCJyb2NrXCIpLmludGVycG9sYXRlKHRoaXMucG9zLngsIHRoaXMucG9zLnkpLCAtdGhpcy5wb3MueSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgc2V0TWVzaChuYW1lKSB7XG5cbiAgICAgICAgaWYgKCFuYW1lKVxuICAgICAgICAgICAgbmFtZSA9IHRoaXMubWVzaE5hbWU7XG5cbiAgICAgICAgdmFyIGVudGl0eSA9IHRoaXMudHlwZTtcbiAgICAgICAgdmFyIG1lc2hUeXBlO1xuICAgICAgICB2YXIgYW5pbWF0aW9uO1xuICAgICAgICB0aGlzLm1lc2hOYW1lID0gbmFtZTtcblxuICAgICAgICBpZiAoZW50aXR5Lm1lc2hlcykge1xuICAgICAgICAgICAgdmFyIGRlZiA9IGVudGl0eS5tZXNoZXNbbmFtZV07XG4gICAgICAgICAgICBpZiAoIWRlZilcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBNZXNoIG9mIG5hbWUgJ1wiICsgbmFtZSArIFwiJyBmb3VuZCBpbiBlbnRpdHktZGVmXCIsIGVudGl0eSk7XG4gICAgICAgICAgICBtZXNoVHlwZSA9IGRlZi5tZXNoO1xuICAgICAgICAgICAgYW5pbWF0aW9uID0gZGVmLmFuaW1hdGlvbjtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRpdHkubWVzaClcbiAgICAgICAgICAgIG1lc2hUeXBlID0gZW50aXR5Lm1lc2g7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG1lc2hUeXBlID0gdGhpcy50eXBlTmFtZTtcblxuICAgICAgICB0aGlzLm1lc2hUeXBlID0gbWVzaFR5cGU7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uID0gYW5pbWF0aW9uO1xuXG4gICAgICAgIHRoaXMubW9kZWxzLmxvYWQobWVzaFR5cGUsIGFuaW1hdGlvbikudGhlbigobWVzaCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNT0RFTCBsb2FkZWRcIiwgbWVzaCwgbWVzaFR5cGUsIGFuaW1hdGlvbiwgdGhpcy5zY2VuZSk7XG4gICAgICAgICAgICBtZXNoLmF0dGFjaFRvU2NlbmUodGhpcy5zY2VuZSk7XG4gICAgICAgICAgICAvLywgdGhpcywgc2VsZi5zY2VuZSwgKG1lc2gpID0+IHtcblxuICAgICAgICAgICAgaWYgKHRoaXMubWVzaCkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVzaC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubWVzaCA9IG1lc2g7XG4gICAgICAgICAgICBtZXNoLnNldEVudGl0eSh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTWVzaFBvcygpO1xuICAgICAgICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uRmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1lc2guYW5pbWF0aW9uRmluaXNoZWQgPSB0aGlzLmFuaW1hdGlvbkZpbmlzaGVkLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1lc2guaG92ZXJlZCh0aGlzLnN0YXRlLmhvdmVyZWQpO1xuICAgICAgICAgICAgdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgaG92ZXJlZCh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzaC5ob3ZlcmVkKHRoaXMuc3RhdGUuaG92ZXJlZCA9IHZhbCk7XG4gICAgfTtcblxuICAgIHNlbGVjdGVkKHZhbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNoLnNlbGVjdGVkKHRoaXMuc3RhdGUuc2VsZWN0ZWQgPSB2YWwpO1xuICAgIH07XG5cbiAgICBpbmNyZWFzZUJ5KHdoYXQsIGFtb3VudCkge1xuICAgICAgICB0aGlzLnJlc291cmNlc1t3aGF0XSA9ICh0aGlzLnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgICB9O1xuXG4gICAgdGFrZSh3aGF0LCBhbW91bnQpIHtcbiAgICAgICAgaWYgKHRoaXMucmVzb3VyY2VzW3doYXRdID49IGFtb3VudCkge1xuICAgICAgICAgICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gLT0gYW1vdW50O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBnaXZlKHdoYXQsIGFtb3VudCwgdG9FbnRpdHkpIHtcbiAgICAgICAgaWYgKHRoaXMucmVzb3VyY2VzW3doYXRdID49IGFtb3VudCkge1xuICAgICAgICAgICAgdGhpcy5yZXNvdXJjZXNbd2hhdF0gLT0gYW1vdW50O1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkdJVkUgVE9cIiwgdG9FbnRpdHksIHdoYXQpO1xuICAgICAgICAgICAgdG9FbnRpdHkucmVzb3VyY2VzW3doYXRdID0gKHRvRW50aXR5LnJlc291cmNlc1t3aGF0XSB8fCAwKSArIGFtb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEVudGl0eSIsImV4cG9ydCBkZWZhdWx0IHtcbiAgXCJiYWtlcnlcIjoge1xuICAgIFwibWVzaFwiOiBcImJha2VyeTNcIlxuICB9LFxuICBcImJpZ19zdG9uZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiYmlnX3N0b25lM1wiXG4gIH0sXG4gIFwiY3JvcF9zbWFsbFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF9tZWRcIjoge1xuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZSxcbiAgICBcInNjYWxlXCI6IDIuMlxuICB9LFxuICBcImNyb3BfaGlnaFwiOiB7XG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiY3JvcF90aW55XCI6IHtcbiAgICBcIm1lc2hcIjogXCJjcm9wX3RpbnkyXCIsXG4gICAgXCJ0cmFuc3BhcmVudFwiOiB0cnVlLFxuICAgIFwic2NhbGVcIjogMi4yXG4gIH0sXG4gIFwiZmFybVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZmFybTJcIlxuICB9LFxuICBcImZpc2hpbmdfaHV0XCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXNoaW5nX2h1dDJcIixcbiAgfSxcbiAgXCJncmF2ZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwiZ3JhdmUyXCJcbiAgfSxcbiAgXCJoZXJvXCI6IHtcbiAgICBcIm1lc2hcIjogXCJoZXJvX2xwMlwiXG4gIH0sXG4gIFwibWluZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWluZTNcIlxuICB9LFxuICBcIm1pbGxcIjoge1xuICAgIFwibWVzaFwiOiBcIm1pbGxcIixcbiAgICBcInNjYWxlXCI6IDFcbiAgfSxcbiAgXCJ0b3duaGFsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwidG93bmhhbGxfdHJ5M1wiXG4gIH0sXG4gIFwidG93ZXJcIjoge1xuICAgIFwibWVzaFwiOiBcInRvd2VyMlwiXG4gIH0sXG4gIFwibWFuX3BpY2tcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9waWNrXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwicGlja1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDQ1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0OCxcbiAgICAgICAgXCJldmVudHNcIjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFwidGltZVwiOiAzNSxcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBpY2tcIlxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCJtYW5fYXhlXCI6IHtcbiAgICBcIm1lc2hcIjogXCJtYW5fYXhlXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwibWFuX2ZpZ2h0LnBuZ1wiLFxuICAgIFwic2NhbGVcIjogMC4wNyxcbiAgICBcInR5cGVcIjogXCJqc29uXCIsXG4gICAgXCJyb3RhdGlvblwiOiB7XG4gICAgICBcInhcIjogXCIzLjE0KjAuNVwiXG4gICAgfSxcbiAgICBcImFuaW1hdGlvbnNcIjoge1xuICAgICAgXCJwaWNrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNDAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDM1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDI3LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGlja1wiXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9lX3dhbGtcIjoge1xuICAgIFwibWVzaFwiOiBcIm1hbl9lX3dhbGtcIixcbiAgICBcInNjYWxlXCI6IDAuMDcsXG4gICAgXCJ0eXBlXCI6IFwianNvblwiLFxuICAgIFwicm90YXRpb25cIjoge1xuICAgICAgXCJ4XCI6IFwiMy4xNCowLjVcIlxuICAgIH0sXG4gICAgXCJhbmltYXRpb25zXCI6IHtcbiAgICAgIFwic2l0XCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMzAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAyMCxcbiAgICAgICAgXCJhbmltYXRlXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJzaXRkb3duXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiAxLFxuICAgICAgICBcImVuZEZyYW1lXCI6IDE4LFxuICAgICAgICBcImxvb3BcIjogZmFsc2VcbiAgICAgIH0sXG4gICAgICBcInN0YW5kXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogMjUsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0MCxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0MFxuICAgICAgfSxcbiAgICAgIFwid2Fsa1wiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDMwLFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogNDUsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNjVcbiAgICAgIH0sXG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAxMCxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDQ1LFxuICAgICAgICBcImVuZEZyYW1lXCI6IDY1XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcIm1hbl9maWdodFwiOiB7XG4gICAgXCJtZXNoXCI6IFwibWFuX2ZpZ2h0XCIsXG4gICAgXCJzY2FsZVwiOiAwLjA3LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImZpZ2h0XCI6IHtcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDEsXG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcImV2ZW50c1wiOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDE4LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDM1LFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3dvcmRcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgXCJ0aW1lXCI6IDIwLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwidWdoXCJcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiZmlyXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXI0XCJcbiAgfSxcbiAgXCJmaXJfb2xkXCI6IHtcbiAgICBcIm1lc2hcIjogXCJmaXIyXCIsXG4gICAgXCJ0ZXh0dXJlXCI6IFwiZmlyNS5wbmdcIixcbiAgICBcInNjYWxlXCI6IDAuNDIsXG4gICAgXCJkb3VibGVzaWRlZFwiOiB0cnVlLFxuICAgIFwidHJhbnNwYXJlbnRcIjogdHJ1ZVxuICB9LFxuXG4gIFwidHJlZVwiOiB7XG4gICAgXCJtZXNoXCI6IFwidHJlZTVcIixcbiAgICBcInNjYWxlXCI6IDAuMixcbiAgICBcImRvdWJsZXNpZGVkXCI6IHRydWVcbiAgfSxcbiAgXCJzaGVlcFwiOiB7XG4gICAgXCJzY2FsZVwiOiAwLjE1LFxuICAgIFwidHlwZVwiOiBcImpzb25cIixcbiAgICBcInJvdGF0aW9uXCI6IHtcbiAgICAgIFwieFwiOiBcIjMuMTQqMC41XCJcbiAgICB9LFxuICAgIFwidGV4dHVyZVwiOiBcInNoZWVwLnBuZ1wiLFxuICAgIFwiYW5pbWF0aW9uc1wiOiB7XG4gICAgICBcImRlZmF1bHRcIjoge1xuICAgICAgICBcInRpbWVTY2FsZVwiOiAyNSxcbiAgICAgICAgXCJzdGFydEZyYW1lXCI6IDEsXG4gICAgICAgIFwiZW5kRnJhbWVcIjogNDVcbiAgICAgIH0sXG4gICAgICBcImVhdFwiOiB7XG4gICAgICAgIFwidGltZVNjYWxlXCI6IDI1LFxuICAgICAgICBcInN0YXJ0RnJhbWVcIjogMSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJsb29wXCI6IGZhbHNlXG4gICAgICB9LFxuICAgICAgXCJ3YWxrXCI6IHtcbiAgICAgICAgXCJ0aW1lU2NhbGVcIjogNjAsXG4gICAgICAgIFwic3RhcnRGcmFtZVwiOiA0NSxcbiAgICAgICAgXCJlbmRGcmFtZVwiOiAxMDBcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwid2VsbFwiOiB7XG4gICAgXCJtZXNoXCI6IFwid2VsbFwiXG4gIH0sXG4gIFwid29ya3Nob3BcIjoge1xuICAgIFwibWVzaFwiOiBcIndvcmtzaG9wMlwiLFxuICAgIFwicGFydGljbGVzXCI6IHtcbiAgICAgIFwic21va2VcIjoge1xuICAgICAgICBcInBvc2l0aW9uXCI6IHtcbiAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICBcInpcIjogMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59IiwiY29uc3Qgb25seU9uZUF0QVRpbWUgPSAoZnVuY3Rpb24gKCkge1xuICAgIGxldCB3aXRoaW4gPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGZjdCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRSWUlORyBcIixmY3QpO1xuICAgICAgICBpZiAod2l0aGluKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRSWUlORyBMQVRFUlwiLGZjdCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IG9ubHlPbmVBdEFUaW1lKGZjdCksIDEwKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2l0aGluPXRydWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRSWUlORyBET0lOR1wiLGZjdCk7XG4gICAgICAgICAgICBmY3QoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVFJZSU5HIERPTkVcIixmY3QpO1xuICAgICAgICAgICAgd2l0aGluPWZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufSkoKTtcblxuXG5jbGFzcyBNb2RlbCB7XG4gICAgY29uc3RydWN0b3IoaW5uZXJNZXNoZXMsIG91dGVyTm9kZSwgaG92ZXJSaW5nLCBzZWxlY3RSaW5nKSB7XG4gICAgICAgIHRoaXMuaW5uZXJNZXNoZXMgPSBpbm5lck1lc2hlcztcbiAgICAgICAgdGhpcy5vdXRlck5vZGUgPSBvdXRlck5vZGU7XG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5yb3RhdGlvbiA9IHRoaXMub3V0ZXJOb2RlLnJvdGF0aW9uO1xuICAgICAgICB0aGlzLmhvdmVyUmluZyA9IGhvdmVyUmluZztcbiAgICAgICAgdGhpcy5zZWxlY3RSaW5nID0gc2VsZWN0UmluZztcbiAgICB9XG5cbiAgICBhdHRhY2hUb1NjZW5lKHNjZW5lKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQUREIE1PREVMIFRPIFNDRUVOXCIsIHRoaXMsIHNjZW5lKTtcbiAgICAgICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgICAgICBvbmx5T25lQXRBVGltZSgoKSA9PiBzY2VuZS5hZGQodGhpcy5vdXRlck5vZGUpKTtcbiAgICB9XG5cbiAgICBzZXRFbnRpdHkoZW50aXR5KSB7XG4gICAgICAgIF8uZWFjaCh0aGlzLmlubmVyTWVzaGVzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgbS51c2VyRGF0YS5lbnRpdHkgPSBlbnRpdHk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgaG92ZXJlZCh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gdHJ1ZSB8fCB2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmhvdmVyUmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmhvdmVyUmluZy52aXNpYmxlO1xuICAgIH1cblxuICAgIHNlbGVjdGVkKHZhbCkge1xuICAgICAgICBpZiAodmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0UmluZy52aXNpYmxlID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdFJpbmcudmlzaWJsZTtcbiAgICB9XG5cbiAgICBkZXRhY2hGcm9tU2NlbmUoKSB7XG4gICAgfVxuXG4gICAgc2V0UG9zKHgsIHksIHopIHtcbiAgICAgICAgdGhpcy5vdXRlck5vZGUucG9zaXRpb24ueCA9IHg7XG4gICAgICAgIHRoaXMub3V0ZXJOb2RlLnBvc2l0aW9uLnkgPSB5O1xuICAgICAgICB0aGlzLm91dGVyTm9kZS5wb3NpdGlvbi56ID0gejtcbiAgICB9XG5cbiAgICBlbmFibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAoIXRoaXMuZW1pdHRlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIEVOQUJMRVwiKTtcbiAgICAgICAgICAgIHZhciBlbWl0dGVyID0gdGhpcy5lbWl0dGVyID0gdGhpcy5zY2VuZS5wYXJ0aWNsZUdyb3VwLmdldEZyb21Qb29sKCk7IC8vYWRkRW1pdHRlciggQmFzZS5tYWtlRW1pdHRlcihuZXcgVEhSRUUuVmVjdG9yMygwLDAsMCkpKTtcbi8vICAgICAgZW1pdHRlci5wb3NpdGlvbi5jb3B5KHRoaXMucG9zaXRpb24pO1xuICAgICAgICAgICAgZW1pdHRlci5lbmFibGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRpc2FibGVQYXJ0aWNsZXModHlwZSkge1xuICAgICAgICBpZiAodGhpcy5lbWl0dGVyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIuZGlzYWJsZSgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbCAtIERJU0FCTEVcIiwgdHlwZSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5lbWl0dGVyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJFTU9WRSBNRSBGUk9NIFNDRU5FXCIsIHRoaXMpO1xuICAgICAgICAvLyBob29rIHRvIHJlbW92ZSBhbmltYXRpb24tcmVzdGFydGVyLWludGVydmFsXG4gICAgICAgIGlmICh0aGlzLmlubmVyTWVzaGVzICYmIHRoaXMuaW5uZXJNZXNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgXy5lYWNoKHRoaXMuaW5uZXJNZXNoZXMsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgaWYgKG0uYmVmb3JlUmVtb3ZlKVxuICAgICAgICAgICAgICAgICAgICBtLmJlZm9yZVJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zY2VuZS5yZW1vdmUodGhpcy5vdXRlck5vZGUpO1xuICAgICAgICBkZWxldGUgdGhpcy5vdXRlck5vZGU7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb2RlbDsiLCJpbXBvcnQgTWVzaGVzIGZyb20gXCIuLi9jb25maWcvbWVzaGVzXCJcbmltcG9ydCBNb2RlbCBmcm9tIFwiLi9tb2RlbFwiXG5cbi8vIEZJWE1FOiBub3QgbmVlZGVkIGFueW1vcmU/XG5mdW5jdGlvbiBlbnN1cmVMb29wKGFuaW1hdGlvbikge1xuICAgIHJldHVybjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFuaW1hdGlvbi5oaWVyYXJjaHkubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICB2YXIgYm9uZSA9IGFuaW1hdGlvbi5oaWVyYXJjaHlbaV07XG5cbiAgICAgICAgdmFyIGZpcnN0ID0gYm9uZS5rZXlzWzBdO1xuICAgICAgICB2YXIgbGFzdCA9IGJvbmUua2V5c1tib25lLmtleXMubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgbGFzdC5wb3MgPSBmaXJzdC5wb3M7XG4gICAgICAgIGxhc3Qucm90ID0gZmlyc3Qucm90O1xuICAgICAgICBsYXN0LnNjbCA9IGZpcnN0LnNjbDtcbiAgICB9XG59XG5cbmNsYXNzIE1vZGVscyB7XG5cbiAgICBjb25zdHJ1Y3Rvcihsb2FkZXJzID0ge30sIG1hbmFnZXIgPSBudWxsLCBtZXNoZXMgPSBudWxsKSB7XG4gICAgICAgIF8uZXh0ZW5kKHRoaXMsIF8ucGljayhsb2FkZXJzLCBbJ29iakxvYWRlcicsICdqc29uTG9hZGVyJywgJ2ltYWdlTG9hZGVyJ10pKTtcblxuICAgICAgICBpZiAoIW1hbmFnZXIpIHtcbiAgICAgICAgICAgIG1hbmFnZXIgPSBuZXcgVEhSRUUuTG9hZGluZ01hbmFnZXIoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWVzaGVzICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMubWVzaGVzID0gbWVzaGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tZXNoZXMgPSBNZXNoZXM7XG4gICAgICAgIH1cbiAgICAgICAgbWFuYWdlci5vblByb2dyZXNzID0gZnVuY3Rpb24gKGl0ZW0sIGxvYWRlZCwgdG90YWwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJtYW5hZ2VyLm9uUHJvZ3Jlc3NcIiwgaXRlbSwgbG9hZGVkLCB0b3RhbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF0aGlzLmpzb25Mb2FkZXIpIHtcbiAgICAgICAgICAgIC8vdGhpcy5qc29uTG9hZGVyID0gbmV3IFRIUkVFLkpTT05Mb2FkZXIobWFuYWdlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmltYWdlTG9hZGVyKSB7XG4gICAgICAgICAgICB0aGlzLmltYWdlTG9hZGVyID0gbmV3IFRIUkVFLkltYWdlTG9hZGVyKG1hbmFnZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLmdsdGZMb2FkZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZ2x0ZkxvYWRlciA9IG5ldyBUSFJFRS5HTFRGTG9hZGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGSVhNRTogYWRkIGNhY2hpbmcgbGF0ZXIgb25cblxuICAgICAgICB0aGlzLnRleHR1cmVMb2FkZXIgPSBuZXcgVEhSRUUuVGV4dHVyZUxvYWRlcigpO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNyZWF0ZVJpbmcoY29sb3IpIHtcbiAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogY29sb3IsXG4gICAgICAgICAgICBmbGF0U2hhZGluZzogVEhSRUUuRmxhdFNoYWRpbmcsXG4gICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9wYWNpdHk6IDAuNVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgaG92ZXJSaW5nID0gbmV3IFRIUkVFLk1lc2gobmV3IFRIUkVFLlJpbmdHZW9tZXRyeSgxLjMsIDIsIDIwLCA1LCAwLCBNYXRoLlBJICogMiksIG1hdGVyaWFsKTtcbiAgICAgICAgaG92ZXJSaW5nLnBvc2l0aW9uLnNldCgwLCAwLCAwLjIpO1xuICAgICAgICBob3ZlclJpbmcudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gaG92ZXJSaW5nXG4gICAgfVxuXG4gICAgc3RhdGljIGNyZWF0ZUJveCgpIHtcbiAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCh7XG4gICAgICAgICAgICBjb2xvcjogMHhkZDk5MDAsXG4gICAgICAgICAgICBmbGF0U2hhZGluZzogVEhSRUUuRmxhdFNoYWRpbmcsXG4gICAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9wYWNpdHk6IDAuNVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBUSFJFRS5NZXNoKG5ldyBUSFJFRS5Cb3hHZW9tZXRyeSgxLCAxLCAxKSwgbWF0ZXJpYWwpO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQobWVzaE5hbWUsIGFuaW1hdGlvbk5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZFVuY2FjaGVkKG1lc2hOYW1lLCBhbmltYXRpb25OYW1lKS50aGVuKHRoaXMucGFja0ludG9Ob2RlLmJpbmQodGhpcykpXG4gICAgfVxuXG4gICAgYXN5bmMgcGFja0ludG9Ob2RlKG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qge21lc2hEZWYsIG1lc2gsIG1lc2hOYW1lfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTUVTSFwiLCBtZXNoKTtcbiAgICAgICAgdmFyIG9iamVjdHM7XG4gICAgICAgIGlmIChtZXNoLnNjZW5lKSB7XG4gICAgICAgICAgICBvYmplY3RzID0gbWVzaC5zY2VuZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9iamVjdHMgPSBtZXNoLmNsb25lKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy9sZXQgb2JqZWN0cyA9IG1lc2guc2NlbmVcbiAgICAgICAgY29uc29sZS5sb2coXCJQQUNLXCIsIG1lc2hEZWYsIG9iamVjdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIG9iamVjdHMgPSBfLmZsYXR0ZW4oW29iamVjdHNdKTtcblxuICAgICAgICAvLyBlbmNsb3NlIG1lc2ggd2l0aGluIHNjZW5lLW5vZGUsIHNvIHRoYXQgaXQgY2FuIGJlIHJvdGF0ZWQgYW5kIHRoZXJlIGNhbiBiZSBzZXZlcmFsIG1lc2hlc1xuICAgICAgICAvLyBhdHRhY2hlZCB0byBvbmUgZW50aXR5XG4gICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblxuICAgICAgICBfLmVhY2gob2JqZWN0cywgZnVuY3Rpb24gKG9iamVjdCkge1xuXG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKFwiUFJFIHJvdGF0aW9uXCIsIG1lc2hEZWYucm90YXRpb24pXG4gICAgICAgICAgICAvLyAgICAgICAgICBNb2RlbHMuZml4UG9zaXRpb25zKG1lc2hEZWYucm90YXRpb24pXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBPU1Qgcm90YXRpb25cIiwgbWVzaERlZi5yb3RhdGlvbik7XG4gICAgICAgICAgICAvL29iamVjdC5yb3RhdGVYKE1hdGguUEkgLyAyKTtcblxuICAgICAgICAgICAgbm9kZS5hZGQob2JqZWN0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG5ld01vZGVsID0gbmV3IE1vZGVsKG9iamVjdHMsIG5vZGUpO1xuXG4gICAgICAgIG5ld01vZGVsLm5hbWUgPSBtZXNoO1xuICAgICAgICBuZXdNb2RlbC50eXBlID0gbWVzaE5hbWU7XG4gICAgICAgIGlmKHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUmluZ3Mobm9kZSwgbmV3TW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9GSVhNRVxuICAgICAgICAvLyBuZXdNb2RlbC5hbmltYXRpb24gPSBhbmltYXRpb247XG4gICAgICAgIHJldHVybiBuZXdNb2RlbFxuICAgIH1cblxuICAgIGFkZFJpbmdzKG5vZGUsIG5ld01vZGVsKSB7XG4gICAgICAgIG5vZGUuYWRkKG5ld01vZGVsLmhvdmVyUmluZyA9IE1vZGVscy5jcmVhdGVSaW5nKDB4ZGQ5OTAwKSk7XG4gICAgICAgIG5vZGUuYWRkKG5ld01vZGVsLnNlbGVjdFJpbmcgPSBNb2RlbHMuY3JlYXRlUmluZygweEZGOTkwMCkpO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWRVbmNhY2hlZChtZXNoLCBhbmltYXRpb24pIHtcbiAgICAgICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW21lc2hdO1xuICAgICAgICBpZiAoIW1lc2hEZWYpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIE1lc2ggZGVmaW5lZCBmb3IgbmFtZSAnXCIgKyBtZXNoICsgXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxvYWRGY3QgPSAobWVzaERlZi50eXBlID09PSBcImpzb25cIikgPyBcImxvYWRKU09OXCIgOiBcImxvYWRPYmpDb21wbGV0ZVwiO1xuXG4gICAgICAgIGlmIChsb2FkRmN0ID09IFwibG9hZEpTT05cIikge1xuICAgICAgICAgICAgLy9GSVhNRVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKF8uaWRlbnRpdHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXNbbG9hZEZjdF0obWVzaCwgYW5pbWF0aW9uKVxuICAgIH1cblxuXG4gICAgYXN5bmMgbG9hZE9iaihtZXNoTmFtZSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAodGhpcy5nbHRmTG9hZGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nbHRmTG9hZGVyLmxvYWQoXG4gICAgICAgICAgICAgICAgICAgICdtb2RlbHMvJyArIG1lc2hOYW1lICsgJy5nbHRmJyxcbiAgICAgICAgICAgICAgICAgICAgbWVzaCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHttZXNoLCBtZXNoTmFtZX0pXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICh4aHIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc2hOYW1lICsgXCIgXCIgKyAoeGhyLmxvYWRlZCAvIHhoci50b3RhbCAqIDEwMCkgKyAnJSBsb2FkZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vYmpMb2FkZXIubG9hZChcbiAgICAgICAgICAgICAgICAgICAgJ21vZGVscy8nICsgbWVzaE5hbWUgKyAnLm9iaicsXG4gICAgICAgICAgICAgICAgICAgIG1lc2ggPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7bWVzaCwgbWVzaE5hbWV9KVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICByZWplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkT2JqQ29tcGxldGUobmFtZSwgZHVtbXkpIHtcbiAgICAgICAgY29uc3QgbWVzaERlZiA9IHRoaXMubWVzaGVzW25hbWVdO1xuICAgICAgICBjb25zdCBtZXNoTmFtZSA9IChtZXNoRGVmICYmIG1lc2hEZWYubWVzaCkgfHwgbmFtZTtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkIHRleHR1cmVcIiwgbmFtZSwgbWVzaE5hbWUpO1xuICAgICAgICBjb25zdCBtZXNoT2JqZWN0ID0gYXdhaXQgdGhpcy5sb2FkT2JqKG1lc2hOYW1lKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1PREVMT0JKRUNUIFwiLCBuYW1lLCBtZXNoT2JqZWN0KTtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7bWVzaERlZn0sIG1lc2hPYmplY3QpO1xuICAgIH1cblxuICAgIC8vIGFuaW1hdGUgKGNsb25lZCkgbWVzaFxuICAgIGFuaW1hdGUobWVzaCwgbmFtZSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBhbmltYXRpb24gPSBuZXcgVEhSRUUuQW5pbWF0aW9uKG1lc2gsIGFuaW1hdGlvbnNbbmFtZV0pO1xuICAgICAgICBhbmltYXRpb24uZGF0YSA9IGFuaW1hdGlvbnNbbmFtZV07XG4gICAgICAgIGNvbnN0IHNjYWxlID0gb3B0aW9ucy50aW1lU2NhbGUgfHwgMTtcblxuICAgICAgICBpZiAob3B0aW9ucy5sb29wID09PSBmYWxzZSkge1xuICAgICAgICAgICAgYW5pbWF0aW9uLmxvb3AgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBhbmltYXRpb24udGltZVNjYWxlID0gc2NhbGU7XG4gICAgICAgIGFuaW1hdGlvbi5wbGF5KCk7XG5cbiAgICAgICAgLy8gaW1wbGVtZW50IHN1cHBvcnQgZm9yIGxvb3BpbmcgaW50ZXJ2YWwgd2l0aGluIGdsb2JhbCBhbmltYXRpb25cbiAgICAgICAgLy8gaGF2ZSBhIGxvb2sgYXQgZW50aXR5IGFsc29cbiAgICAgICAgaWYgKG9wdGlvbnMuc3RhcnRGcmFtZSkge1xuICAgICAgICAgICAgLy9hbmltYXRpb24udXBkYXRlKCBvcHRpb25zLnN0YXJ0RnJhbWUpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYW5pbWF0ZSA9PT0gZmFsc2UgJiYgZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb24uc3RvcCgpO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi51cGRhdGUob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5lbmRGcmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBzdGFydEFuaW1hdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLnBsYXkob3B0aW9ucy5zdGFydEZyYW1lLCAxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBzdG9wQW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiQU5JTUFMIHN0b3BBTmltYXRpb25cIiwgbWVzaCwgbWVzaC5hbmltYXRpb25GaW5pc2hlZCk7XG4gICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNoLnVzZXJEYXRhICYmIG1lc2gudXNlckRhdGEuZW50aXR5ICYmIG1lc2gudXNlckRhdGEuZW50aXR5LmFuaW1hdGlvbkZpbmlzaGVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzaC51c2VyRGF0YS5lbnRpdHkuYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciB0aW1lID0gMTAwMCAqIChvcHRpb25zLmVuZEZyYW1lIC0gb3B0aW9ucy5zdGFydEZyYW1lKSAvIHNjYWxlO1xuICAgICAgICAgICAgICAgIHN0YXJ0QW5pbWF0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubG9vcCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoc3RhcnRBbmltYXRpb24sIHRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBtZXNoLmJlZm9yZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiQU5JTUFMIERPTlQgTE9PUFwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoc3RvcEFuaW1hdGlvbiwgdGltZSk7XG4gICAgICAgICAgICAgICAgICAgIG1lc2guYmVmb3JlUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgYW5pbWF0aW9uLnVwZGF0ZShNYXRoLnJhbmRvbSgpICogMTApO1xuICAgIH1cblxuICAgIGxvYWRKU09OKG5hbWUsIGFuaW1hdGlvbikge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCB0aGlzLm1lc2hlc1tuYW1lXSk7XG5cbiAgICAgICAgLy8gbm93IG92ZXJyaWRlIHdpdGggb3B0aW9ucyBmcm9tIGFuaW1hdGlvbnMtcGFydFxuICAgICAgICBpZiAob3B0aW9ucy5hbmltYXRpb25zW2FuaW1hdGlvbl0pIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zLmFuaW1hdGlvbnNbYW5pbWF0aW9uXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiTG9hZGluZyBtb2RlbFwiLCBuYW1lKTtcblxuICAgICAgICAgICAgdmFyIHRleHR1cmUgPSBuZXcgVEhSRUUuVGV4dHVyZSgpO1xuICAgICAgICAgICAgdGhpcy5qc29uTG9hZGVyLmxvYWQoJ21vZGVscy8nICsgbmFtZSArICcuanNvbicsIGZ1bmN0aW9uIChnZW9tZXRyeSwgbWF0ZXJpYWxzKSB7XG5cbiAgICAgICAgICAgICAgICBnZW9tZXRyeS5jb21wdXRlVmVydGV4Tm9ybWFscygpO1xuICAgICAgICAgICAgICAgIGdlb21ldHJ5LmNvbXB1dGVCb3VuZGluZ0JveCgpO1xuXG4gICAgICAgICAgICAgICAgZW5zdXJlTG9vcChnZW9tZXRyeS5hbmltYXRpb24pO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG1hdGVyaWFscy5sZW5ndGg7IGkgPCBpbDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsTWF0ZXJpYWwgPSBtYXRlcmlhbHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJNQVRcIiwgb3JpZ2luYWxNYXRlcmlhbCk7XG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsTWF0ZXJpYWwuc2tpbm5pbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gIG9yaWdpbmFsTWF0ZXJpYWwuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiRE9VQkxFXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hGYWNlTWF0ZXJpYWwobWF0ZXJpYWxzKTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kb3VibGVzaWRlZClcbiAgICAgICAgICAgICAgICAgICAgbWF0ZXJpYWwuc2lkZSA9IFRIUkVFLkRvdWJsZVNpZGU7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lyZWZyYW1lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICdibHVlJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdE1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6ICdibHVlJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgbWVzaCA9IG5ldyBUSFJFRS5Ta2lubmVkTWVzaChnZW9tZXRyeSwgbWF0ZXJpYWwsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGFuaW1hdGlvbnNbbmFtZV0gPSBnZW9tZXRyeS5hbmltYXRpb247XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlKG1lc2gpXG4gICAgICAgICAgICB9LCBudWxsLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vZGVsczsiLCJpbXBvcnQgRW50aXR5IGZyb20gJy4vZW50aXR5J1xuaW1wb3J0IE1vZGVscyBmcm9tICcuLi9iYXNlM2QvbW9kZWxzJ1xuXG5jbGFzcyBXb3JsZExvYWRlciB7XG4gICAgc3RhdGljIGxvYWQod29ybGQsIGRhdGEpIHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gbmV3IE1vZGVscygpXG5cbiAgICAgICAgZGF0YS5mb3JFYWNoKGVudGl0eURlZmluaXRpb249PlxuICAgICAgICAgICAgd29ybGQucHVzaChuZXcgRW50aXR5KHdvcmxkLm1hcCwgZW50aXR5RGVmaW5pdGlvbiwgbW9kZWxzKSlcbiAgICAgICAgKVxuICAgICAgICBjb25zb2xlLmxvZyhcIldPUkxEXCIsIHdvcmxkKVxuICAgICAgICB3b3JsZC5lbnRpdGllcy5mb3JFYWNoKGVudGl0eT0+ZW50aXR5LnBvc3RMb2FkKCkpXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXb3JsZExvYWRlciIsImltcG9ydCBXb3JsZCBmcm9tIFwiLi4vZ2FtZS93b3JsZFwiO1xuaW1wb3J0IEhlaWdodE1hcCBmcm9tIFwiLi4vZ2FtZS9oZWlnaHRtYXBcIjtcbmltcG9ydCBhamF4IGZyb20gXCIuLi9hamF4XCJcbmltcG9ydCBXb3JsZExvYWRlciBmcm9tIFwiLi4vZ2FtZS93b3JsZC1sb2FkZXJcIlxuXG5jbGFzcyBXb3JsZEV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICAgIGNvbnN0cnVjdG9yKHdvcmxkKSB7XG4gICAgICAgIHN1cGVyKFwid29ybGRcIik7XG4gICAgICAgIHRoaXMud29ybGQgPSB3b3JsZFxuICAgIH1cbn1cblxuY2xhc3MgQWdXb3JsZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgdGhpcy5tYXAgPSBuZXcgSGVpZ2h0TWFwKCk7XG4gICAgICAgIHRoaXMud29ybGQgPSBuZXcgV29ybGQodGhpcy5tYXApO1xuXG4gICAgICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZShcImxvYWRcIikpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZFdvcmxkKHRoaXMuZ2V0QXR0cmlidXRlKFwibG9hZFwiKSkudGhlbih0aGlzLmluZm9ybS5iaW5kKHRoaXMpKVxuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnRbdGhpcy5leHBvc2VOYW1lXSA9IHRoaXMud29ybGQ7XG4gICAgfVxuXG4gICAgaW5mb3JtKCkge1xuICAgICAgICB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoXCIqW3dvcmxkLWFjY2Vzc29yXVwiKS5mb3JFYWNoKGUgPT5cbiAgICAgICAgICAgIGUuZGlzcGF0Y2hFdmVudChuZXcgV29ybGRFdmVudCh0aGlzLndvcmxkKSkpXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGRlbGV0ZSBkb2N1bWVudFt0aGlzLmV4cG9zZU5hbWVdXG4gICAgfVxuXG4gICAgbG9hZFdvcmxkKHVybCkge1xuICAgICAgICByZXR1cm4gYWpheCh1cmwpLnRoZW4oZGF0YSA9PlxuICAgICAgICAgICAgV29ybGRMb2FkZXIubG9hZCh0aGlzLndvcmxkLCBkYXRhKVxuICAgICAgICApXG4gICAgfVxufVxuXG5pZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnYWctd29ybGQnKSkge1xuICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnYWctd29ybGQnLCBBZ1dvcmxkKTtcbn1cblxuIiwiY2xhc3MgQWdFbnRpdHlWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5pbm5lckhUTUw7XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwid29ybGRcIiwgdGhpcy53b3JsZENyZWF0ZWQuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndvcmxkXCIsIHRoaXMud29ybGRDcmVhdGVkLmJpbmQodGhpcykpO1xuICAgICAgICBpZiAodGhpcy5saXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lci5yZW1vdmUoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgd29ybGRDcmVhdGVkKGV2KSB7XG4gICAgICAgIHRoaXMud29ybGQgPSBldi53b3JsZDtcbiAgICAgICAgY29uc3QgZXZlbnRuYW1lID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJldmVudFwiKSA9PT0gXCJob3ZlcmVkXCIgPyBcImhvdmVyZWRcIiA6IFwic2VsZWN0ZWRcIjtcbiAgICAgICAgdGhpcy5ldmVudG5hbWUgPSBldmVudG5hbWU7XG4gICAgICAgIHRoaXMubGlzdGVuZXIgPSB0aGlzLndvcmxkW2V2ZW50bmFtZV0uc3Vic2NyaWJlKHRoaXMuY2hhbmdlZC5iaW5kKHRoaXMpKVxuICAgIH1cblxuICAgIGNoYW5nZWQoZW50aXR5KSB7XG4gICAgICAgIGlmICh0aGlzLmV2ZW50bmFtZSA9PSBcInNlbGVjdGVkXCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRU5USVRZIFZJRVcgc2VsZWN0ZWRcIiwgZW50aXR5LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5lbnRpdHkgIT0gZW50aXR5KSB7XG4gICAgICAgICAgICB0aGlzLmVudGl0eSA9IGVudGl0eTtcbiAgICAgICAgICAgIHRoaXMucmVkcmF3KClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlZHJhdygpIHtcbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBldmFsKCdgJyArIHRoaXMudGVtcGxhdGUgKyAnYCcpO1xuICAgIH1cbn1cblxuaWYgKCFjdXN0b21FbGVtZW50cy5nZXQoJ2FnLWVudGl0eS12aWV3JykpIHtcbiAgICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ2FnLWVudGl0eS12aWV3JywgQWdFbnRpdHlWaWV3KTtcbn1cblxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sS0FBSyxTQUFTLFdBQVcsQ0FBQztBQUNoQyxJQUFJLGlCQUFpQixHQUFHO0FBQ3hCLFFBQVEsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNqQyxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdELFFBQVEsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztBQUMzRCxRQUFRLElBQUksQ0FBQyxVQUFVLEdBQUU7QUFDekIsS0FBSztBQUNMO0FBQ0EsSUFBSSxtQkFBbUIsR0FBRztBQUMxQixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUM7QUFDM0QsS0FBSztBQUNMO0FBQ0EsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO0FBQ3RCLFFBQVEsR0FBRyxNQUFNLEVBQUU7QUFDbkIsWUFBWSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDeEYsWUFBWSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFDO0FBQ2pGLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7QUFDeEIsUUFBUSxHQUFHLE1BQU0sRUFBRTtBQUNuQixZQUFZLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzRixZQUFZLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUM7QUFDcEYsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBLElBQUksVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNuQixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUM7QUFDM0QsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFO0FBQ3pELFlBQVksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBQztBQUNyRCxZQUFZLElBQUk7QUFDaEIsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFDO0FBQ3JELGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUN2QixnQkFBZ0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsYUFBYTtBQUNiLFNBQVM7QUFDVCxRQUFRLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM5RSxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUM7QUFDekQsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFFO0FBQzVCLEtBQUs7QUFDTDtBQUNBLElBQUksYUFBYSxHQUFHO0FBQ3BCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLO0FBQzlDLFlBQVksSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLEdBQUcsRUFBRTtBQUM1QyxnQkFBZ0IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFDO0FBQzlDLGFBQWEsTUFBTTtBQUNuQixnQkFBZ0IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFDO0FBQ2pELGFBQWE7QUFDYixTQUFTLEVBQUM7QUFDVixLQUFLO0FBQ0wsQ0FBQztBQUNEO0FBQ0EsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDckMsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3Qzs7QUN0REEsTUFBTSxPQUFPLFNBQVMsV0FBVyxDQUFDO0FBQ2xDLElBQUksaUJBQWlCLEdBQUc7QUFDeEI7QUFDQSxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0FBQy9DO0FBQ0EsUUFBUSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFDO0FBQzFELFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUM7QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JGLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFDO0FBQzlFLEtBQUs7QUFDTDtBQUNBLElBQUksb0JBQW9CLEdBQUc7QUFDM0IsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4RixRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBQztBQUNqRixLQUFLO0FBQ0w7QUFDQTtBQUNBLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRTtBQUNqQixRQUFRLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFDO0FBQy9CLFFBQVEsSUFBSTtBQUNaLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUM7QUFDakQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ3BCLFlBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEMsU0FBUztBQUNULEtBQUs7QUFDTCxDQUFDO0FBQ0Q7QUFDQSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtBQUN2QyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELENBQUM7O0FDOUJELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2hDO0FBQ0EsTUFBTSxJQUFJLENBQUM7QUFDWCxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUU7QUFDcEI7QUFDQSxRQUFRLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUM7QUFDbkMsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3ZDLFFBQVEsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNySDtBQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUNsRDtBQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckU7QUFDQSxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUM7QUFDaEQ7QUFDQSxRQUFRLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMvQixRQUFRLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9CLFFBQVEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQy9CLFFBQVEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUM7QUFDdkQ7QUFDQSxRQUFRLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ2pEO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BFO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEQsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO0FBQ3REO0FBQ0EsUUFBUSxJQUFJLENBQUMsZUFBZSxHQUFHO0FBQy9CLFlBQVksUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNoRCxZQUFZLGNBQWMsRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEQ7QUFDQSxZQUFZLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdkQsWUFBWSxrQkFBa0IsRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDaEU7QUFDQSxZQUFZLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUM7QUFDbEQsWUFBWSxjQUFjLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0FBQzVEO0FBQ0EsWUFBWSxVQUFVLEVBQUUsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztBQUNqRDtBQUNBLFlBQVksZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0FBQzlELFlBQVksUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFDL0M7QUFDQSxZQUFZLFNBQVMsRUFBRSxHQUFHO0FBQzFCLFlBQVksT0FBTyxFQUFFLENBQUM7QUFDdEIsWUFBWSxZQUFZLEVBQUUsQ0FBQztBQUMzQixZQUFZLFVBQVUsRUFBRSxHQUFHO0FBQzNCO0FBQ0E7QUFDQSxZQUFZLGtCQUFrQixFQUFFLEdBQUc7QUFDbkMsWUFBWSxLQUFLLEVBQUUsQ0FBQztBQUNwQixTQUFTLENBQUM7QUFDVjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksT0FBTyxZQUFZLEdBQUc7QUFDMUIsUUFBUSxRQUFRLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQztBQUM5QixZQUFZLE9BQU8sRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQztBQUMvRSxZQUFZLE1BQU0sRUFBRSxDQUFDO0FBQ3JCLFlBQVksUUFBUSxFQUFFLEtBQUssQ0FBQyxjQUFjO0FBQzFDLFNBQVMsQ0FBQztBQUNWLEtBQUs7QUFDTDtBQUNBO0FBQ0EsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFO0FBQ3JCLFFBQVEsT0FBTyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3JELEtBQUs7QUFDTDtBQUNBLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtBQUNsQixRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztBQUNwRSxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUM3QztBQUNBLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckUsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLEdBQUc7QUFDZCxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQzlCLEtBQUs7QUFDTDtBQUNBLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtBQUNwQixRQUFRLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztBQUN4QixRQUFRLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUN6QjtBQUNBLFFBQVEsU0FBUyxRQUFRLEdBQUc7QUFDNUI7QUFDQSxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQ2pDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDakMsb0JBQW9CLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDN0MsaUJBQWlCLE1BQU07QUFDdkIsb0JBQW9CLFVBQVUsQ0FBQyxZQUFZO0FBQzNDLHdCQUF3QixxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN4RCxxQkFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMzQixpQkFBaUI7QUFDakIsYUFBYTtBQUNiLFlBQVksSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBQzlDLFlBQVksSUFBSSxRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztBQUMzQyxZQUFZLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDNUI7QUFDQSxZQUFZLElBQUksS0FBSyxDQUFDO0FBQ3RCLEFBQ0E7QUFDQSxZQUFZLEFBR0ksS0FBSyxHQUFHLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDekM7QUFDQSxZQUFZLElBQUksS0FBSyxHQUFHLEdBQUc7QUFDM0IsZ0JBQWdCLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDNUIsWUFBWSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsYUFBYTtBQUNoRCxnQkFBZ0IsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM3QztBQUNBLFlBQVksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0M7QUFDQTtBQUNBO0FBQ0EsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxRCxTQUFTO0FBQ1Q7QUFDQSxRQUFRLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLEtBQUs7QUFDTCxDQUFDOztBQ3hIRCxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUU7QUFDMUIsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEVBQUU7QUFDN0UsUUFBUSxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJO0FBQ3RDLFlBQVksSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO0FBQ2xELFlBQVksSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNwRixTQUFTLENBQUM7QUFDVixRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0IsS0FBSyxDQUFDLENBQUM7QUFDUCxDQUFDOztBQ1RELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDOUI7QUFDQSxNQUFNLGNBQWMsQ0FBQztBQUNyQjtBQUNBLElBQUksT0FBTyxhQUFhLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO0FBQzlELFFBQVEsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pFLFFBQVEsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQzVEO0FBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUztBQUN0QixZQUFZLFNBQVMsR0FBRyxVQUFVLENBQUMsRUFBRSxPQUFPLEVBQUU7QUFDOUMsZ0JBQWdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2hELGdCQUFnQixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUM7QUFDOUMsb0JBQW9CLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztBQUMvQyxnQkFBZ0IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDekMsb0JBQW9CLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzdDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQztBQUMvRCxxQkFBcUI7QUFDckIsaUJBQWlCO0FBQ2pCLGFBQWEsQ0FBQztBQUNkLFFBQVEsQUFDSSxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUM7QUFDbkQsZ0JBQWdCLEtBQUssRUFBRSxRQUFRO0FBQy9CLGdCQUFnQixTQUFTLEVBQUUsSUFBSTtBQUMvQixhQUFhLENBQUMsQ0FBQztBQUNmLFFBQVEsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDO0FBQ25DLFlBQVksTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0FBQ2xDLFlBQVksU0FBUyxFQUFFLEdBQUc7QUFDMUIsWUFBWSxTQUFTLEVBQUUsU0FBUztBQUNoQztBQUNBLFlBQVksUUFBUSxFQUFFLFFBQVEsSUFBSSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNoRjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVksS0FBSyxFQUFFLENBQUM7QUFDcEIsWUFBWSxpQkFBaUIsRUFBRSxLQUFLO0FBQ3BDLFlBQVksU0FBUyxFQUFFLEVBQUU7QUFDekIsWUFBWSxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7QUFDaEMsWUFBWSxTQUFTLEVBQUUsRUFBRTtBQUN6QixZQUFZLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTTtBQUNqQyxZQUFZLE9BQU8sRUFBRSxLQUFLO0FBQzFCLFlBQVksS0FBSyxFQUFFLEtBQUs7QUFDeEIsU0FBUyxDQUFDLENBQUM7QUFDWCxRQUFRLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQyxRQUFRLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0MsUUFBUSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztBQUNyRCxRQUFRLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQ3JEO0FBQ0EsUUFBUSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN4QztBQUNBLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNoQyxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDckQsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtBQUM3QyxRQUFRLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN0QyxRQUFRLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsRUFBRTtBQUNsRixZQUFZLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsRUFBRTtBQUN2RixnQkFBZ0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFO0FBQzNGLG9CQUFvQixLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEVBQUU7QUFDOUYsd0JBQXdCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztBQUNwRSw0QkFBNEIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO0FBQ3pDLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3JFLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkUsNEJBQTRCO0FBQzVCLGdDQUFnQyxPQUFPLEVBQUUsRUFBRTtBQUMzQyxnQ0FBZ0MsSUFBSSxFQUFFLDJGQUEyRjtBQUNqSSw2QkFBNkI7QUFDN0IseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEMsd0JBQXdCLGNBQWMsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDdkYscUJBQXFCLENBQUMsQ0FBQztBQUN2QixpQkFBaUIsQ0FBQyxDQUFDO0FBQ25CLGFBQWEsQ0FBQyxDQUFDO0FBQ2YsU0FBUyxDQUFDLENBQUM7QUFDWCxLQUFLO0FBQ0wsQ0FBQzs7QUMzRUQ7QUFDQSxJQUFJLFNBQVMsR0FBRyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0QztBQUNBLElBQUksSUFBSSxHQUFHO0FBQ1g7QUFDQTtBQUNBO0FBQ0EsSUFBSSxJQUFJLEVBQUUsVUFBVSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtBQUMxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN0QyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUN6QixRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUN6QixRQUFRLFNBQVMsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzdDO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdEUsUUFBUSxPQUFPLE1BQU0sQ0FBQztBQUN0QixLQUFLO0FBQ0wsQ0FBQyxDQUFDOztBQ3BCRixNQUFNLFFBQVEsQ0FBQztBQUNmLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRTtBQUM1QixRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVTtBQUNyQyxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRTtBQUN4QixRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRTtBQUMxQixLQUFLO0FBQ0wsSUFBSSxJQUFJLEdBQUc7QUFDWDtBQUNBLEtBQUs7QUFDTCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7QUFDZDtBQUNBO0FBQ0EsUUFBUSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUM7QUFDL0IsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUM7QUFDbEMsS0FBSztBQUNMO0FBQ0EsQ0FBQzs7QUNiRCxNQUFNLFVBQVUsU0FBUyxXQUFXLENBQUM7QUFDckMsSUFBSSxpQkFBaUIsR0FBRztBQUN4QixRQUFRLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUMxQjtBQUNBLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzVDO0FBQ0EsUUFBUSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEUsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEUsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEUsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUQsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUQsUUFBUSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEUsUUFBUSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEUsUUFBUSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RIO0FBQ0EsUUFBUSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM5QztBQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDdkIsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDMUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFD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

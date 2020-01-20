(function (THREE, _) {
'use strict';

_ = _ && _.hasOwnProperty('default') ? _['default'] : _;

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

class World {
  constructor(map) {
    this.map = map;
    this.entities = [];
    this.entitiesByType = {};
    if (!window.World)
      window.World = this;
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
    }
  }

  select(entity) {
    if (this.selectedEntity)
      this.selectedEntity.selected(false);
    this.selectedEntity = entity;
    if (this.selectedEntity)
      this.selectedEntity.selected(true);
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

// ShaderParticleUtils 0.7.8

var SPE = SPE || {};

SPE.utils = {

    /**
     * Given a base vector and a spread range vector, create
     * a new THREE.Vector3 instance with randomised values.
     *
     * @private
     *
     * @param  {THREE.Vector3} base
     * @param  {THREE.Vector3} spread
     * @return {THREE.Vector3}
     */
    randomVector3: function (base, spread) {
        var v = new THREE.Vector3();

        v.copy(base);

        v.x += Math.random() * spread.x - (spread.x / 2);
        v.y += Math.random() * spread.y - (spread.y / 2);
        v.z += Math.random() * spread.z - (spread.z / 2);

        return v;
    },

    /**
     * Create a new THREE.Color instance and given a base vector and
     * spread range vector, assign random values.
     *
     * Note that THREE.Color RGB values are in the range of 0 - 1, not 0 - 255.
     *
     * @private
     *
     * @param  {THREE.Vector3} base
     * @param  {THREE.Vector3} spread
     * @return {THREE.Color}
     */
    randomColor: function (base, spread) {
        var v = new THREE.Color();

        v.copy(base);

        v.r += (Math.random() * spread.x) - (spread.x / 2);
        v.g += (Math.random() * spread.y) - (spread.y / 2);
        v.b += (Math.random() * spread.z) - (spread.z / 2);

        v.r = Math.max(0, Math.min(v.r, 1));
        v.g = Math.max(0, Math.min(v.g, 1));
        v.b = Math.max(0, Math.min(v.b, 1));

        return v;
    },

    /**
     * Create a random Number value based on an initial value and
     * a spread range
     *
     * @private
     *
     * @param  {Number} base
     * @param  {Number} spread
     * @return {Number}
     */
    randomFloat: function (base, spread) {
        return base + spread * (Math.random() - 0.5);
    },

    /**
     * Create a new THREE.Vector3 instance and project it onto a random point
     * on a sphere with randomized radius.
     *
     * @param  {THREE.Vector3} base
     * @param  {Number} radius
     * @param  {THREE.Vector3} radiusSpread
     * @param  {THREE.Vector3} radiusScale
     *
     * @private
     *
     * @return {THREE.Vector3}
     */
    randomVector3OnSphere: function (base, radius, radiusSpread, radiusScale, radiusSpreadClamp) {
        var z = 2 * Math.random() - 1;
        var t = 6.2832 * Math.random();
        var r = Math.sqrt(1 - z * z);
        var vec = new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), z);

        var rand = this._randomFloat(radius, radiusSpread);

        if (radiusSpreadClamp) {
            rand = Math.round(rand / radiusSpreadClamp) * radiusSpreadClamp;
        }

        vec.multiplyScalar(rand);

        if (radiusScale) {
            vec.multiply(radiusScale);
        }

        vec.add(base);

        return vec;
    },

    /**
     * Create a new THREE.Vector3 instance and project it onto a random point
     * on a disk (in the XY-plane) centered at `base` and with randomized radius.
     *
     * @param  {THREE.Vector3} base
     * @param  {Number} radius
     * @param  {THREE.Vector3} radiusSpread
     * @param  {THREE.Vector3} radiusScale
     *
     * @private
     *
     * @return {THREE.Vector3}
     */
    randomVector3OnDisk: function (base, radius, radiusSpread, radiusScale, radiusSpreadClamp) {
        var t = 6.2832 * Math.random();
        var rand = this._randomFloat(radius, radiusSpread);

        if (radiusSpreadClamp) {
            rand = Math.round(rand / radiusSpreadClamp) * radiusSpreadClamp;
        }

        var vec = new THREE.Vector3(Math.cos(t), Math.sin(t), 0).multiplyScalar(rand);

        if (radiusScale) {
            vec.multiply(radiusScale);
        }

        vec.add(base);

        return vec;
    },


    /**
     * Create a new THREE.Vector3 instance, and given a sphere with center `base` and
     * point `position` on sphere, set direction away from sphere center with random magnitude.
     *
     * @param  {THREE.Vector3} base
     * @param  {THREE.Vector3} position
     * @param  {Number} speed
     * @param  {Number} speedSpread
     * @param  {THREE.Vector3} scale
     *
     * @private
     *
     * @return {THREE.Vector3}
     */
    randomVelocityVector3OnSphere: function (base, position, speed, speedSpread, scale) {
        var direction = new THREE.Vector3().subVectors(base, position);

        direction.normalize().multiplyScalar(Math.abs(this._randomFloat(speed, speedSpread)));

        if (scale) {
            direction.multiply(scale);
        }

        return direction;
    },


    /**
     * Given a base vector and a spread vector, randomise the given vector
     * accordingly.
     *
     * @param  {THREE.Vector3} vector
     * @param  {THREE.Vector3} base
     * @param  {THREE.Vector3} spread
     *
     * @private
     *
     * @return {[type]}
     */
    randomizeExistingVector3: function (v, base, spread) {
        v.copy(base);

        v.x += Math.random() * spread.x - (spread.x / 2);
        v.y += Math.random() * spread.y - (spread.y / 2);
        v.z += Math.random() * spread.z - (spread.z / 2);
    },


    /**
     * Randomize a THREE.Color instance and given a base vector and
     * spread range vector, assign random values.
     *
     * Note that THREE.Color RGB values are in the range of 0 - 1, not 0 - 255.
     *
     * @private
     *
     * @param  {THREE.Vector3} base
     * @param  {THREE.Vector3} spread
     * @return {THREE.Color}
     */
    randomizeExistingColor: function (v, base, spread) {
        v.copy(base);

        v.r += (Math.random() * spread.x) - (spread.x / 2);
        v.g += (Math.random() * spread.y) - (spread.y / 2);
        v.b += (Math.random() * spread.z) - (spread.z / 2);

        v.r = Math.max(0, Math.min(v.r, 1));
        v.g = Math.max(0, Math.min(v.g, 1));
        v.b = Math.max(0, Math.min(v.b, 1));
    },

    /**
     * Given an existing particle vector, project it onto a random point on a
     * sphere with radius `radius` and position `base`.
     *
     * @private
     *
     * @param  {THREE.Vector3} v
     * @param  {THREE.Vector3} base
     * @param  {Number} radius
     */
    randomizeExistingVector3OnSphere: function (v, base, radius, radiusSpread, radiusScale, radiusSpreadClamp) {
        var z = 2 * Math.random() - 1,
            t = 6.2832 * Math.random(),
            r = Math.sqrt(1 - z * z),
            rand = this._randomFloat(radius, radiusSpread);

        if (radiusSpreadClamp) {
            rand = Math.round(rand / radiusSpreadClamp) * radiusSpreadClamp;
        }

        v.set(
            (r * Math.cos(t)) * rand,
            (r * Math.sin(t)) * rand,
            z * rand
        ).multiply(radiusScale);

        v.add(base);
    },


    /**
     * Given an existing particle vector, project it onto a random point
     * on a disk (in the XY-plane) centered at `base` and with radius `radius`.
     *
     * @private
     *
     * @param  {THREE.Vector3} v
     * @param  {THREE.Vector3} base
     * @param  {Number} radius
     */
    randomizeExistingVector3OnDisk: function (v, base, radius, radiusSpread, radiusScale, radiusSpreadClamp) {
        var t = 6.2832 * Math.random(),
            rand = Math.abs(this._randomFloat(radius, radiusSpread));

        if (radiusSpreadClamp) {
            rand = Math.round(rand / radiusSpreadClamp) * radiusSpreadClamp;
        }

        v.set(
            Math.cos(t),
            Math.sin(t),
            0
        ).multiplyScalar(rand);

        if (radiusScale) {
            v.multiply(radiusScale);
        }

        v.add(base);
    },

    randomizeExistingVelocityVector3OnSphere: function (v, base, position, speed, speedSpread) {
        v.copy(position)
            .sub(base)
            .normalize()
            .multiplyScalar(Math.abs(this._randomFloat(speed, speedSpread)));
    },

    generateID: function () {
        var str = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

        str = str.replace(/[xy]/g, function (c) {
            var rand = Math.random();
            var r = rand * 16 | 0 % 16, v = c === 'x' ? r : (r & 0x3 | 0x8);

            return v.toString(16);
        });

        return str;
    }
};
// ShaderParticleGroup 0.7.8
//
// (c) 2014 Luke Moody (http://www.github.com/squarefeet)
//     & Lee Stemkoski (http://www.adelphi.edu/~stemkoski/)
//
// Based on Lee Stemkoski's original work:
//    (https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/js/ParticleEngine.js).
//
// ShaderParticleGroup may be freely distributed under the MIT license (See LICENSE.txt)

var SPE = SPE || {};

SPE.Group = function (options) {
    var that = this;

    that.fixedTimeStep = parseFloat(typeof options.fixedTimeStep === 'number' ? options.fixedTimeStep : 0.016);

    // Uniform properties ( applied to all particles )
    that.maxAge = parseFloat(options.maxAge || 3);
    that.texture = options.texture || null;
    that.hasPerspective = parseInt(typeof options.hasPerspective === 'number' ? options.hasPerspective : 1, 10);
    that.colorize = parseInt(typeof options.colorize === 'number' ? options.colorize : 1, 10);

    // Material properties
    that.blending = typeof options.blending === 'number' ? options.blending : THREE.AdditiveBlending;
    that.transparent = typeof options.transparent === 'number' ? options.transparent : 1;
    that.alphaTest = typeof options.alphaTest === 'number' ? options.alphaTest : 0.5;
    that.depthWrite = options.depthWrite || false;
    that.depthTest = options.depthTest || true;

    // Create uniforms
    that.uniforms = {
        duration: {type: 'f', value: that.maxAge},
        texture: {type: 't', value: that.texture},
        hasPerspective: {type: 'i', value: that.hasPerspective},
        colorize: {type: 'i', value: that.colorize}
    };

    // Create a map of attributes that will hold values for each particle in this group.
    that.attributes = {
        acceleration: {type: 'v3', value: []},
        velocity: {type: 'v3', value: []},

        alive: {type: 'f', value: []},
        age: {type: 'f', value: []},

        size: {type: 'v3', value: []},
        angle: {type: 'v4', value: []},

        colorStart: {type: 'c', value: []},
        colorMiddle: {type: 'c', value: []},
        colorEnd: {type: 'c', value: []},

        opacity: {type: 'v3', value: []}
    };

    // Emitters (that aren't static) will be added to this array for
    // processing during the `tick()` function.
    that.emitters = [];

    // Create properties for use by the emitter pooling functions.
    that._pool = [];
    that._poolCreationSettings = null;
    that._createNewWhenPoolEmpty = 0;
    that.maxAgeMilliseconds = that.maxAge * 1000;

    // Create an empty geometry to hold the particles.
    // Each particle is a vertex pushed into this geometry's
    // vertices array.
    that.geometry = new THREE.Geometry();

    // Create the shader material using the properties we set above.
    that.material = new THREE.ShaderMaterial({
        uniforms: that.uniforms,
        attributes: that.attributes,
        vertexShader: SPE.shaders.vertex,
        fragmentShader: SPE.shaders.fragment,
        blending: that.blending,
        transparent: that.transparent,
        alphaTest: that.alphaTest,
        depthWrite: that.depthWrite,
        depthTest: that.depthTest
    });

    // And finally create the ParticleSystem. It's got its `dynamic` property
    // set so that THREE.js knows to update it on each frame.
    that.mesh = new THREE.PointCloud(that.geometry, that.material);
    that.mesh.dynamic = true;
};

SPE.Group.prototype = {

    /**
     * Tells the age and alive attributes (and the geometry vertices)
     * that they need updating by THREE.js's internal tick functions.
     *
     * @private
     *
     * @return {this}
     */
    _flagUpdate: function () {
        var that = this;

        // Set flags to update (causes less garbage than
        // ```ParticleSystem.sortParticles = true``` in THREE.r58 at least)
        that.attributes.age.needsUpdate = true;
        that.attributes.alive.needsUpdate = true;
        that.attributes.angle.needsUpdate = true;
        // that.attributes.angleAlignVelocity.needsUpdate = true;
        that.attributes.velocity.needsUpdate = true;
        that.attributes.acceleration.needsUpdate = true;
        that.geometry.verticesNeedUpdate = true;

        return that;
    },

    /**
     * Add an emitter to this particle group. Once added, an emitter will be automatically
     * updated when SPE.Group#tick() is called.
     *
     * @param {SPE.Emitter} emitter
     * @return {this}
     */
    addEmitter: function (emitter) {
        var that = this;

        if (emitter.duration) {
            emitter.particlesPerSecond = emitter.particleCount / (that.maxAge < emitter.duration ? that.maxAge : emitter.duration) | 0;
        } else {
            emitter.particlesPerSecond = emitter.particleCount / that.maxAge | 0;
        }

        var vertices = that.geometry.vertices,
            start = vertices.length,
            end = emitter.particleCount + start,
            a = that.attributes,
            acceleration = a.acceleration.value,
            velocity = a.velocity.value,
            alive = a.alive.value,
            age = a.age.value,
            size = a.size.value,
            angle = a.angle.value,
            colorStart = a.colorStart.value,
            colorMiddle = a.colorMiddle.value,
            colorEnd = a.colorEnd.value,
            opacity = a.opacity.value;

        emitter.particleIndex = parseFloat(start);

        // Create the values
        for (var i = start; i < end; ++i) {

            if (emitter.type === 'sphere') {
                vertices[i] = that._randomVector3OnSphere(emitter.position, emitter.radius, emitter.radiusSpread, emitter.radiusScale, emitter.radiusSpreadClamp);
                velocity[i] = that._randomVelocityVector3OnSphere(vertices[i], emitter.position, emitter.speed, emitter.speedSpread);
            } else if (emitter.type === 'disk') {
                vertices[i] = that._randomVector3OnDisk(emitter.position, emitter.radius, emitter.radiusSpread, emitter.radiusScale, emitter.radiusSpreadClamp);
                velocity[i] = that._randomVelocityVector3OnSphere(vertices[i], emitter.position, emitter.speed, emitter.speedSpread);
            } else {
                vertices[i] = that._randomVector3(emitter.position, emitter.positionSpread);
                velocity[i] = that._randomVector3(emitter.velocity, emitter.velocitySpread);
            }

            acceleration[i] = that._randomVector3(emitter.acceleration, emitter.accelerationSpread);

            size[i] = new THREE.Vector3(
                Math.abs(that._randomFloat(emitter.sizeStart, emitter.sizeStartSpread)),
                Math.abs(that._randomFloat(emitter.sizeMiddle, emitter.sizeMiddleSpread)),
                Math.abs(that._randomFloat(emitter.sizeEnd, emitter.sizeEndSpread))
            );

            angle[i] = new THREE.Vector4(
                that._randomFloat(emitter.angleStart, emitter.angleStartSpread),
                that._randomFloat(emitter.angleMiddle, emitter.angleMiddleSpread),
                that._randomFloat(emitter.angleEnd, emitter.angleEndSpread),
                emitter.angleAlignVelocity ? 1.0 : 0.0
            );

            age[i] = 0.0;
            alive[i] = emitter.isStatic ? 1.0 : 0.0;

            colorStart[i] = that._randomColor(emitter.colorStart, emitter.colorStartSpread);
            colorMiddle[i] = that._randomColor(emitter.colorMiddle, emitter.colorMiddleSpread);
            colorEnd[i] = that._randomColor(emitter.colorEnd, emitter.colorEndSpread);

            opacity[i] = new THREE.Vector3(
                Math.abs(that._randomFloat(emitter.opacityStart, emitter.opacityStartSpread)),
                Math.abs(that._randomFloat(emitter.opacityMiddle, emitter.opacityMiddleSpread)),
                Math.abs(that._randomFloat(emitter.opacityEnd, emitter.opacityEndSpread))
            );
        }

        // Cache properties on the emitter so we can access
        // them from its tick function.
        emitter.verticesIndex = parseFloat(start);
        emitter.attributes = a;
        emitter.vertices = that.geometry.vertices;
        emitter.maxAge = that.maxAge;

        // Assign a unique ID to this emitter
        emitter.__id = that._generateID();

        // Save this emitter in an array for processing during this.tick()
        if (!emitter.isStatic) {
            that.emitters.push(emitter);
        }

        return that;
    },


    removeEmitter: function (emitter) {
        var id,
            emitters = this.emitters;

        if (emitter instanceof SPE.Emitter) {
            id = emitter.__id;
        } else if (typeof emitter === 'string') {
            id = emitter;
        } else {
            console.warn('Invalid emitter or emitter ID passed to SPE.Group#removeEmitter.');
            return;
        }

        for (var i = 0, il = emitters.length; i < il; ++i) {
            if (emitters[i].__id === id) {
                emitters.splice(i, 1);
                break;
            }
        }
    },


    /**
     * The main particle group update function. Call this once per frame.
     *
     * @param  {Number} dt
     * @return {this}
     */
    tick: function (dt) {
        var that = this,
            emitters = that.emitters,
            numEmitters = emitters.length;

        dt = dt || that.fixedTimeStep;

        if (numEmitters === 0) {
            return;
        }

        for (var i = 0; i < numEmitters; ++i) {
            emitters[i].tick(dt);
        }

        that._flagUpdate();
        return that;
    },


    /**
     * Fetch a single emitter instance from the pool.
     * If there are no objects in the pool, a new emitter will be
     * created if specified.
     *
     * @return {ShaderParticleEmitter | null}
     */
    getFromPool: function () {
        var that = this,
            pool = that._pool,
            createNew = that._createNewWhenPoolEmpty;

        if (pool.length) {
            return pool.pop();
        } else if (createNew) {
            return new SPE.Emitter(that._poolCreationSettings);
        }

        return null;
    },


    /**
     * Release an emitter into the pool.
     *
     * @param  {ShaderParticleEmitter} emitter
     * @return {this}
     */
    releaseIntoPool: function (emitter) {
        if (!(emitter instanceof SPE.Emitter)) {
            console.error('Will not add non-emitter to particle group pool:', emitter);
            return;
        }

        emitter.reset();
        this._pool.unshift(emitter);

        return this;
    },


    /**
     * Get the pool array
     *
     * @return {Array}
     */
    getPool: function () {
        return this._pool;
    },


    /**
     * Add a pool of emitters to this particle group
     *
     * @param {Number} numEmitters      The number of emitters to add to the pool.
     * @param {Object} emitterSettings  An object describing the settings to pass to each emitter.
     * @param {Boolean} createNew       Should a new emitter be created if the pool runs out?
     * @return {this}
     */
    addPool: function (numEmitters, emitterSettings, createNew) {
        var that = this,
            emitter;

        // Save relevant settings and flags.
        that._poolCreationSettings = emitterSettings;
        that._createNewWhenPoolEmpty = !!createNew;

        // Create the emitters, add them to this group and the pool.
        for (var i = 0; i < numEmitters; ++i) {
            emitter = new SPE.Emitter(emitterSettings);
            that.addEmitter(emitter);
            that.releaseIntoPool(emitter);
        }

        return that;
    },


    /**
     * Internal method. Sets a single emitter to be alive
     *
     * @private
     *
     * @param  {THREE.Vector3} pos
     * @return {this}
     */
    _triggerSingleEmitter: function (pos) {
        var that = this,
            emitter = that.getFromPool();

        if (emitter === null) {
            console.log('SPE.Group pool ran out.');
            return;
        }

        // TODO: Should an instanceof check happen here? Or maybe at least a typeof?
        if (pos) {
            emitter.position.copy(pos);
        }

        emitter.enable();

        setTimeout(function () {
            emitter.disable();
            that.releaseIntoPool(emitter);
        }, that.maxAgeMilliseconds);

        return that;
    },


    /**
     * Set a given number of emitters as alive, with an optional position
     * vector3 to move them to.
     *
     * @param  {Number} numEmitters
     * @param  {THREE.Vector3} position
     * @return {this}
     */
    triggerPoolEmitter: function (numEmitters, position) {
        var that = this;

        if (typeof numEmitters === 'number' && numEmitters > 1) {
            for (var i = 0; i < numEmitters; ++i) {
                that._triggerSingleEmitter(position);
            }
        } else {
            that._triggerSingleEmitter(position);
        }

        return that;
    }
};


// Extend ShaderParticleGroup's prototype with functions from utils object.
for (var i$1 in SPE.utils) {
    SPE.Group.prototype['_' + i$1] = SPE.utils[i$1];
}


// The all-important shaders
SPE.shaders = {
    vertex: [
        'uniform float duration;',
        'uniform int hasPerspective;',

        'attribute vec3 colorStart;',
        'attribute vec3 colorMiddle;',
        'attribute vec3 colorEnd;',
        'attribute vec3 opacity;',

        'attribute vec3 acceleration;',
        'attribute vec3 velocity;',
        'attribute float alive;',
        'attribute float age;',

        'attribute vec3 size;',
        'attribute vec4 angle;',

        // values to be passed to the fragment shader
        'varying vec4 vColor;',
        'varying float vAngle;',


        // Integrate acceleration into velocity and apply it to the particle's position
        'vec4 GetPos() {',
        'vec3 newPos = vec3( position );',

        // Move acceleration & velocity vectors to the value they
        // should be at the current age
        'vec3 a = acceleration * age;',
        'vec3 v = velocity * age;',

        // Move velocity vector to correct values at this age
        'v = v + (a * age);',

        // Add velocity vector to the newPos vector
        'newPos = newPos + v;',

        // Convert the newPos vector into world-space
        'vec4 mvPosition = modelViewMatrix * vec4( newPos, 1.0 );',

        'return mvPosition;',
        '}',


        'void main() {',

        'float positionInTime = (age / duration);',

        'float lerpAmount1 = (age / (0.5 * duration));', // percentage during first half
        'float lerpAmount2 = ((age - 0.5 * duration) / (0.5 * duration));', // percentage during second half
        'float halfDuration = duration / 2.0;',
        'float pointSize = 0.0;',

        'vAngle = 0.0;',

        'if( alive > 0.5 ) {',

        // lerp the color and opacity
        'if( positionInTime < 0.5 ) {',
        'vColor = vec4( mix(colorStart, colorMiddle, lerpAmount1), mix(opacity.x, opacity.y, lerpAmount1) );',
        '}',
        'else {',
        'vColor = vec4( mix(colorMiddle, colorEnd, lerpAmount2), mix(opacity.y, opacity.z, lerpAmount2) );',
        '}',


        // Get the position of this particle so we can use it
        // when we calculate any perspective that might be required.
        'vec4 pos = GetPos();',


        // Determine the angle we should use for this particle.
        'if( angle[3] == 1.0 ) {',
        'vAngle = -atan(pos.y, pos.x);',
        '}',
        'else if( positionInTime < 0.5 ) {',
        'vAngle = mix( angle.x, angle.y, lerpAmount1 );',
        '}',
        'else {',
        'vAngle = mix( angle.y, angle.z, lerpAmount2 );',
        '}',

        // Determine point size.
        'if( positionInTime < 0.5) {',
        'pointSize = mix( size.x, size.y, lerpAmount1 );',
        '}',
        'else {',
        'pointSize = mix( size.y, size.z, lerpAmount2 );',
        '}',


        'if( hasPerspective == 1 ) {',
        'pointSize = pointSize * ( 300.0 / length( pos.xyz ) );',
        '}',

        // Set particle size and position
        'gl_PointSize = pointSize;',
        'gl_Position = projectionMatrix * pos;',
        '}',

        'else {',
        // Hide particle and set its position to the (maybe) glsl
        // equivalent of Number.POSITIVE_INFINITY
        'vColor = vec4( 0.0, 0.0, 0.0, 0.0 );',
        'gl_Position = vec4(1000000000.0, 1000000000.0, 1000000000.0, 0.0);',
        '}',
        '}',
    ].join('\n'),

    fragment: [
        'uniform sampler2D texture;',
        'uniform int colorize;',

        'varying vec4 vColor;',
        'varying float vAngle;',

        'void main() {',
        'float c = cos(vAngle);',
        'float s = sin(vAngle);',

        'vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,',
        'c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);',

        'vec4 rotatedTexture = texture2D( texture, rotatedUV );',

        'if( colorize == 1 ) {',
        'gl_FragColor = vColor * rotatedTexture;',
        '}',
        'else {',
        'gl_FragColor = rotatedTexture;',
        '}',
        '}'
    ].join('\n')
};
// ShaderParticleEmitter 0.7.8
//
// (c) 2014 Luke Moody (http://www.github.com/squarefeet)
//     & Lee Stemkoski (http://www.adelphi.edu/~stemkoski/)
//
// Based on Lee Stemkoski's original work:
//    (https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/js/ParticleEngine.js).
//
// ShaderParticleEmitter may be freely distributed under the MIT license (See LICENSE.txt)

var SPE = SPE || {};

SPE.Emitter = function (options) {
    // If no options are provided, fallback to an empty object.
    options = options || {};

    // Helps with minification. Not as easy to read the following code,
    // but should still be readable enough!
    var that = this;


    that.particleCount = typeof options.particleCount === 'number' ? options.particleCount : 100;
    that.type = (options.type === 'cube' || options.type === 'sphere' || options.type === 'disk') ? options.type : 'cube';

    that.position = options.position instanceof THREE.Vector3 ? options.position : new THREE.Vector3();
    that.positionSpread = options.positionSpread instanceof THREE.Vector3 ? options.positionSpread : new THREE.Vector3();

    // These two properties are only used when this.type === 'sphere' or 'disk'
    that.radius = typeof options.radius === 'number' ? options.radius : 10;
    that.radiusSpread = typeof options.radiusSpread === 'number' ? options.radiusSpread : 0;
    that.radiusScale = options.radiusScale instanceof THREE.Vector3 ? options.radiusScale : new THREE.Vector3(1, 1, 1);
    that.radiusSpreadClamp = typeof options.radiusSpreadClamp === 'number' ? options.radiusSpreadClamp : 0;

    that.acceleration = options.acceleration instanceof THREE.Vector3 ? options.acceleration : new THREE.Vector3();
    that.accelerationSpread = options.accelerationSpread instanceof THREE.Vector3 ? options.accelerationSpread : new THREE.Vector3();

    that.velocity = options.velocity instanceof THREE.Vector3 ? options.velocity : new THREE.Vector3();
    that.velocitySpread = options.velocitySpread instanceof THREE.Vector3 ? options.velocitySpread : new THREE.Vector3();


    // And again here; only used when this.type === 'sphere' or 'disk'
    that.speed = parseFloat(typeof options.speed === 'number' ? options.speed : 0.0);
    that.speedSpread = parseFloat(typeof options.speedSpread === 'number' ? options.speedSpread : 0.0);


    // Sizes
    that.sizeStart = parseFloat(typeof options.sizeStart === 'number' ? options.sizeStart : 1.0);
    that.sizeStartSpread = parseFloat(typeof options.sizeStartSpread === 'number' ? options.sizeStartSpread : 0.0);

    that.sizeEnd = parseFloat(typeof options.sizeEnd === 'number' ? options.sizeEnd : that.sizeStart);
    that.sizeEndSpread = parseFloat(typeof options.sizeEndSpread === 'number' ? options.sizeEndSpread : 0.0);

    that.sizeMiddle = parseFloat(
        typeof options.sizeMiddle !== 'undefined' ?
            options.sizeMiddle :
            Math.abs(that.sizeEnd + that.sizeStart) / 2
    );
    that.sizeMiddleSpread = parseFloat(typeof options.sizeMiddleSpread === 'number' ? options.sizeMiddleSpread : 0);


    // Angles
    that.angleStart = parseFloat(typeof options.angleStart === 'number' ? options.angleStart : 0);
    that.angleStartSpread = parseFloat(typeof options.angleStartSpread === 'number' ? options.angleStartSpread : 0);

    that.angleEnd = parseFloat(typeof options.angleEnd === 'number' ? options.angleEnd : 0);
    that.angleEndSpread = parseFloat(typeof options.angleEndSpread === 'number' ? options.angleEndSpread : 0);

    that.angleMiddle = parseFloat(
        typeof options.angleMiddle !== 'undefined' ?
            options.angleMiddle :
            Math.abs(that.angleEnd + that.angleStart) / 2
    );
    that.angleMiddleSpread = parseFloat(typeof options.angleMiddleSpread === 'number' ? options.angleMiddleSpread : 0);

    that.angleAlignVelocity = options.angleAlignVelocity || false;


    // Colors
    that.colorStart = options.colorStart instanceof THREE.Color ? options.colorStart : new THREE.Color('white');
    that.colorStartSpread = options.colorStartSpread instanceof THREE.Vector3 ? options.colorStartSpread : new THREE.Vector3();

    that.colorEnd = options.colorEnd instanceof THREE.Color ? options.colorEnd : that.colorStart.clone();
    that.colorEndSpread = options.colorEndSpread instanceof THREE.Vector3 ? options.colorEndSpread : new THREE.Vector3();

    that.colorMiddle =
        options.colorMiddle instanceof THREE.Color ?
            options.colorMiddle :
            new THREE.Color().addColors(that.colorStart, that.colorEnd).multiplyScalar(0.5);
    that.colorMiddleSpread = options.colorMiddleSpread instanceof THREE.Vector3 ? options.colorMiddleSpread : new THREE.Vector3();


    // Opacities
    that.opacityStart = parseFloat(typeof options.opacityStart !== 'undefined' ? options.opacityStart : 1);
    that.opacityStartSpread = parseFloat(typeof options.opacityStartSpread !== 'undefined' ? options.opacityStartSpread : 0);

    that.opacityEnd = parseFloat(typeof options.opacityEnd === 'number' ? options.opacityEnd : 0);
    that.opacityEndSpread = parseFloat(typeof options.opacityEndSpread !== 'undefined' ? options.opacityEndSpread : 0);

    that.opacityMiddle = parseFloat(
        typeof options.opacityMiddle !== 'undefined' ?
            options.opacityMiddle :
            Math.abs(that.opacityEnd + that.opacityStart) / 2
    );
    that.opacityMiddleSpread = parseFloat(typeof options.opacityMiddleSpread === 'number' ? options.opacityMiddleSpread : 0);


    // Generic
    that.duration = typeof options.duration === 'number' ? options.duration : null;
    that.alive = parseFloat(typeof options.alive === 'number' ? options.alive : 1.0);
    that.isStatic = typeof options.isStatic === 'number' ? options.isStatic : 0;

    // The following properties are used internally, and mostly set when this emitter
    // is added to a particle group.
    that.particlesPerSecond = 0;
    that.attributes = null;
    that.vertices = null;
    that.verticesIndex = 0;
    that.age = 0.0;
    that.maxAge = 0.0;

    that.particleIndex = 0.0;

    that.__id = null;

    that.userData = {};
};

SPE.Emitter.prototype = {

    /**
     * Reset a particle's position. Accounts for emitter type and spreads.
     *
     * @private
     *
     * @param  {THREE.Vector3} p
     */
    _resetParticle: function (i) {
        var that = this,
            type = that.type,
            spread = that.positionSpread,
            particlePosition = that.vertices[i],
            a = that.attributes,
            particleVelocity = a.velocity.value[i],

            vSpread = that.velocitySpread,
            aSpread = that.accelerationSpread;

        // Optimise for no position spread or radius
        if (
            (type === 'cube' && spread.x === 0 && spread.y === 0 && spread.z === 0) ||
            (type === 'sphere' && that.radius === 0) ||
            (type === 'disk' && that.radius === 0)
        ) {
            particlePosition.copy(that.position);
            that._randomizeExistingVector3(particleVelocity, that.velocity, vSpread);

            if (type === 'cube') {
                that._randomizeExistingVector3(that.attributes.acceleration.value[i], that.acceleration, aSpread);
            }
        }

        // If there is a position spread, then get a new position based on this spread.
        else if (type === 'cube') {
            that._randomizeExistingVector3(particlePosition, that.position, spread);
            that._randomizeExistingVector3(particleVelocity, that.velocity, vSpread);
            that._randomizeExistingVector3(that.attributes.acceleration.value[i], that.acceleration, aSpread);
        } else if (type === 'sphere') {
            that._randomizeExistingVector3OnSphere(particlePosition, that.position, that.radius, that.radiusSpread, that.radiusScale, that.radiusSpreadClamp);
            that._randomizeExistingVelocityVector3OnSphere(particleVelocity, that.position, particlePosition, that.speed, that.speedSpread);
        } else if (type === 'disk') {
            that._randomizeExistingVector3OnDisk(particlePosition, that.position, that.radius, that.radiusSpread, that.radiusScale, that.radiusSpreadClamp);
            that._randomizeExistingVelocityVector3OnSphere(particleVelocity, that.position, particlePosition, that.speed, that.speedSpread);
        }
    },

    /**
     * Update this emitter's particle's positions. Called by the SPE.Group
     * that this emitter belongs to.
     *
     * @param  {Number} dt
     */
    tick: function (dt) {

        if (this.isStatic) {
            return;
        }

        // Cache some values for quicker access in loops.
        var that = this,
            a = that.attributes,
            alive = a.alive.value,
            age = a.age.value,
            start = that.verticesIndex,
            particleCount = that.particleCount,
            end = start + particleCount,
            pps = that.particlesPerSecond * that.alive,
            ppsdt = pps * dt,
            m = that.maxAge,
            emitterAge = that.age,
            duration = that.duration,
            pIndex = that.particleIndex;

        // Loop through all the particles in this emitter and
        // determine whether they're still alive and need advancing
        // or if they should be dead and therefore marked as such.
        for (var i = start; i < end; ++i) {
            if (alive[i] === 1.0) {
                age[i] += dt;
            }

            if (age[i] >= m) {
                age[i] = 0.0;
                alive[i] = 0.0;
            }
        }

        // If the emitter is dead, reset any particles that are in
        // the recycled vertices array and reset the age of the
        // emitter to zero ready to go again if required, then
        // exit this function.
        if (that.alive === 0.0) {
            that.age = 0.0;
            return;
        }

        // If the emitter has a specified lifetime and we've exceeded it,
        // mark the emitter as dead and exit this function.
        if (typeof duration === 'number' && emitterAge > duration) {
            that.alive = 0.0;
            that.age = 0.0;
            return;
        }


        var n = Math.max(Math.min(end, pIndex + ppsdt), 0),
            count = 0,
            index = 0,
            pIndexFloor = pIndex | 0,
            dtInc;

        for (i = pIndexFloor; i < n; ++i) {
            if (alive[i] !== 1.0) {
                ++count;
            }
        }

        if (count !== 0) {
            dtInc = dt / count;

            for (i = pIndexFloor; i < n; ++i, ++index) {
                if (alive[i] !== 1.0) {
                    alive[i] = 1.0;
                    age[i] = dtInc * index;
                    that._resetParticle(i);
                }
            }
        }

        that.particleIndex += ppsdt;

        if (that.particleIndex < 0.0) {
            that.particleIndex = 0.0;
        }

        if (pIndex >= start + particleCount) {
            that.particleIndex = parseFloat(start);
        }

        // Add the delta time value to the age of the emitter.
        that.age += dt;

        if (that.age < 0.0) {
            that.age = 0.0;
        }
    },

    /**
     * Reset this emitter back to its starting position.
     * If `force` is truthy, then reset all particles in this
     * emitter as well, even if they're currently alive.
     *
     * @param  {Boolean} force
     * @return {this}
     */
    reset: function (force) {
        var that = this;

        that.age = 0.0;
        that.alive = 0;

        if (force) {
            var start = that.verticesIndex,
                end = that.verticesIndex + that.particleCount,
                a = that.attributes,
                alive = a.alive.value,
                age = a.age.value;

            for (var i = start; i < end; ++i) {
                alive[i] = 0.0;
                age[i] = 0.0;
            }
        }

        return that;
    },


    /**
     * Enable this emitter.
     */
    enable: function () {
        this.alive = 1;
    },

    /**
     * Disable this emitter.
     */
    disable: function () {
        this.alive = 0;
    }
};

// Extend SPE.Emitter's prototype with functions from utils object.
for (var i$1 in SPE.utils) {
    SPE.Emitter.prototype['_' + i$1] = SPE.utils[i$1];
}

var SPE$1 = SPE;

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
        camera.rotation.x = (10 + 32) * Math.PI / 180;

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
        return  new SPE$1.Group({
            texture: THREE.ImageUtils.loadTexture('./images/smokeparticle.png'),
            maxAge: 4,
            blending: THREE.NormalBlending
        })
    }


    makeEmitter(pos) {
        return new SPE$1.Emitter(this.emitterSettings);
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

/**
 * A terrain object for use with the Three.js library.
 *
 * Usage: `var terrainScene = Terrain();`
 *
 * @param {Object} [options]
 *   An optional map of settings that control how the terrain is constructed
 *   and displayed. Options include:
 *
 *   - `after`: A function to run after other transformations on the terrain
 *     produce the highest-detail heightmap, but before optimizations and
 *     visual properties are applied. Takes two parameters, which are the same
 *     as those for {@link Terrain.DiamondSquare}: an array of `THREE.Vector3`
 *     objects representing the vertices of the terrain, and a map of options
 *     with the same available properties as the `options` parameter for the
 *     `Terrain` function.
 *   - `easing`: A function that affects the distribution of slopes by
 *     interpolating the height of each vertex along a curve. Valid values
 *     include `Terrain.Linear`, `Terrain.EaseInOut`,
 *     `Terrain.InEaseOut`, and any custom function that accepts a float
 *     between 0 and 1 and returns a float between 0 and 1.
 *   - `heightmap`: Either a pre-loaded image (from the same domain as the
 *     webpage or served with a CORS-friendly header) representing terrain
 *     height data (lighter pixels are higher); or a function used to generate
 *     random height data for the terrain. Valid random functions include
 *     `Terrain.DiamondSquare` (the default), `Terrain.Perlin`,
 *     `Terrain.Simplex`, `Terrain.PerlinDiamond`, or a custom
 *     function with the same signature. (Ideally heightmap images have the
 *     same number of pixels as the terrain has vertices, as determined by the
 *     `xSegments` and `ySegments` options, but this is not required: if the
 *     heightmap is a different size, vertex height values will be
 *     interpolated.)
 *   - `material`: a THREE.Material instance used to display the terrain.
 *     Defaults to `new THREE.MeshBasicMaterial({color: 0xee6633})`.
 *   - `maxHeight`: the highest point, in Three.js units, that a peak should
 *     reach. Defaults to 100.
 *   - `minHeight`: the lowest point, in Three.js units, that a valley should
 *     reach. Defaults to -100.
 *   - `steps`: If this is a number above 1, the terrain will be paritioned
 *     into that many flat "steps," resulting in a blocky appearance.
 *   - `stretch`: Determines whether to stretch the heightmap across the
 *     maximum and minimum height range if the height range produced by the
 *     `heightmap` property is smaller. Defaults to true.
 *   - `turbulent`: Whether to perform a turbulence transformation.
 *   - `useBufferGeometry`: a Boolean indicating whether to use
 *     THREE.BufferGeometry instead of THREE.Geometry for the Terrain plane.
 *     Defaults to `true`.
 *   - `xSegments`: The number of segments (rows) to divide the terrain plane
 *     into. (This basically determines how detailed the terrain is.) Defaults
 *     to 63.
 *   - `xSize`: The width of the terrain in Three.js units. Defaults to 1024.
 *     Rendering might be slightly faster if this is a multiple of
 *     `options.xSegments + 1`.
 *   - `ySegments`: The number of segments (columns) to divide the terrain
 *     plane into. (This basically determines how detailed the terrain is.)
 *     Defaults to 63.
 *   - `ySize`: The length of the terrain in Three.js units. Defaults to 1024.
 *     Rendering might be slightly faster if this is a multiple of
 *     `options.ySegments + 1`.
 */

const Terrain = function(options) {
    var defaultOptions = {
        after: null,
        easing: Terrain.Linear,
        heightmap: Terrain.DiamondSquare,
        material: null,
        maxHeight: 100,
        minHeight: -100,
        optimization: Terrain.NONE,
        frequency: 0.4,
        steps: 1,
        stretch: true,
        turbulent: false,
        useBufferGeometry: true,
        xSegments: 63,
        xSize: 1024,
        ySegments: 63,
        ySize: 1024,
        clamp:false
    };
    options = options || {};
    for (var opt in defaultOptions) {
        if (defaultOptions.hasOwnProperty(opt)) {
            options[opt] = typeof options[opt] === 'undefined' ? defaultOptions[opt] : options[opt];
        }
    }
    //options.unit = (options.xSize / (options.xSegments+1) + options.ySize / (options.ySegments+1)) * 0.5;
    options.material = options.material || new THREE.MeshBasicMaterial({ color: 0xee6633 });

    // Using a scene instead of a mesh allows us to implement more complex
    // features eventually, like adding the ability to randomly scatter plants
    // across the terrain or having multiple meshes for optimization purposes.
    var scene = new THREE.Object3D();
    // Planes are initialized on the XY plane, so rotate so Z is up.
    scene.rotation.x = -0.5 * Math.PI;

    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(options.xSize, options.ySize, options.xSegments, options.ySegments),
        options.material
    );

    var v = mesh.geometry.vertices;
    // It's actually possible to pass a canvas with heightmap data instead of an image.
    if (options.heightmap instanceof HTMLCanvasElement || options.heightmap instanceof Image) {
        Terrain.fromHeightmap(v, options);
    }
    else if (typeof options.heightmap === 'function') {
        options.heightmap(v, options);
    }
    else {
        console.warn('An invalid value was passed for `options.heightmap`: ' + options.heightmap);
    }
    if (options.turbulent) {
        Terrain.Turbulence(v, options);
    }
    if (options.steps > 1) {
        Terrain.Step(v, options.steps);
        Terrain.Smooth(v, options);
    }
    if(options.clamp) {
      // Keep the terrain within the allotted height range if necessary, and do easing.
      Terrain.Clamp(v, options);
    }
    // Call the "after" callback
    if (typeof options.after === 'function') {
        options.after(v, options);
    }
    // Mark the geometry as having changed and needing updates.
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeBoundingSphere();

    if (options.useBufferGeometry) {
        mesh.geometry = THREE.BufferGeometryUtils.fromGeometry(mesh.geometry);
    }

    // lod.addLevel(mesh, options.unit * 10 * Math.pow(2, lodLevel));

    scene.add(mesh);
    return scene;
};

/**
 * Optimization types.
 *
 * Note that none of these are implemented right now. They should be done as
 * shaders so that they execute on the GPU, and the resulting scene would need
 * to be updated every frame to adjust to the camera's position.
 *
 * Further reading:
 * - http://vterrain.org/LOD/Papers/
 * - http://vterrain.org/LOD/Implementations/
 *
 * GEOMIPMAP: The terrain plane should be split into sections, each with their
 * own LODs, for screen-space occlusion and detail reduction. Intermediate
 * vertices on higher-detail neighboring sections should be interpolated
 * between neighbor edge vertices in order to match with the edge of the
 * lower-detail section. The number of sections should be around sqrt(segments)
 * along each axis. It's unclear how to make materials stretch across segments.
 *
 * GEOCLIPMAP: The terrain should be composed of multiple donut-shaped sections
 * at decreasing resolution as the radius gets bigger. When the player moves,
 * the sections should morph so that the detail "follows" the player around.
 * There is an implementation of geoclipmapping at
 * https://github.com/CodeArtemis/TriggerRally/blob/unified/server/public/scripts/client/terrain.coffee
 * and a tutorial on morph targets at
 * http://nikdudnik.com/making-3d-gfx-for-the-cinema-on-low-budget-and-three-js/
 *
 * POLYGONREDUCTION: Combine areas that are relatively coplanar into larger
 * polygons as described at http://www.shamusyoung.com/twentysidedtale/?p=142.
 * This method can be combined with the others if done very carefully, or it
 * can be adjusted to be more aggressive at greater distance from the camera
 * (similar to combining with geomipmapping).
 *
 * If these do get implemented, here is the option description to add to the
 * `Terrain` docblock:
 *
 *    - `optimization`: the type of optimization to apply to the terrain. If
 *      an optimization is applied, the number of segments along each axis that
 *      the terrain should be divided into at the most detailed level should
 *      equal (n * 2^(LODs-1))^2 - 1, for arbitrary n, where LODs is the number
 *      of levels of detail desired. Valid values include:
 *
 *          - `Terrain.NONE`: Don't apply any optimizations. This is the
 *            default.
 *          - `Terrain.GEOMIPMAP`: Divide the terrain into evenly-sized
 *            sections with multiple levels of detail. For each section,
 *            display a level of detail dependent on how close the camera is.
 *          - `Terrain.GEOCLIPMAP`: Divide the terrain into donut-shaped
 *            sections, where detail decreases as the radius increases. The
 *            rings then morph to "follow" the camera around so that the camera
 *            is always at the center, surrounded by the most detail.
 */
Terrain.NONE = 0;
Terrain.GEOMIPMAP = 1;
Terrain.GEOCLIPMAP = 2;
Terrain.POLYGONREDUCTION = 3;

/**
 * Generate a material that blends together textures based on vertex height.
 *
 * Inspired by http://www.chandlerprall.com/2011/06/blending-webgl-textures/
 *
 * Usage:
 *
 *    // Assuming the textures are already loaded
 *    var material = Terrain.generateBlendedMaterial([
 *      {texture: THREE.ImageUtils.loadTexture('img1.jpg')},
 *      {texture: THREE.ImageUtils.loadTexture('img2.jpg'), levels: [-80, -35, 20, 50]},
 *      {texture: THREE.ImageUtils.loadTexture('img3.jpg'), levels: [20, 50, 60, 85]},
 *      {texture: THREE.ImageUtils.loadTexture('img4.jpg'), glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
 *    ]);
 *
 * This material tries to behave exactly like a MeshLambertMaterial other than
 * the fact that it blends multiple texture maps together, although
 * ShaderMaterials are treated slightly differently by Three.js so YMMV. Note
 * that this means the texture will appear black unless there are lights
 * shining on it.
 *
 * @param {Object[]} textures
 *   An array of objects specifying textures to blend together and how to blend
 *   them. Each object should have a `texture` property containing a
 *   `THREE.Texture` instance. There must be at least one texture and the first
 *   texture does not need any other properties because it will serve as the
 *   base, showing up wherever another texture isn't blended in. Other textures
 *   must have either a `levels` property containing an array of four numbers
 *   or a `glsl` property containing a single GLSL expression evaluating to a
 *   float between 0.0 and 1.0. For the `levels` property, the four numbers
 *   are, in order: the height at which the texture will start blending in, the
 *   height at which it will be fully blended in, the height at which it will
 *   start blending out, and the height at which it will be fully blended out.
 *   The `vec3 vPosition` variable is available to `glsl` expressions; it
 *   contains the coordinates in Three-space of the texel currently being
 *   rendered.
 */
Terrain.generateBlendedMaterial = function(textures) {
    var uniforms = THREE.UniformsUtils.merge([THREE.ShaderLib.lambert.uniforms]),
        declare = '',
        assign = '';
    for (var i = 0, l = textures.length; i < l; i++) {
        // Uniforms
        textures[i].wrapS = textures[i].wrapT = THREE.RepeatWrapping;
        textures[i].needsUpdate = true;
        uniforms['texture_' + i] = {
            type: 't',
            value: textures[i].texture,
        };

        // Shader fragments
        // Declare each texture, then mix them together.
        declare += 'uniform sampler2D texture_' + i + ';\n';
        if (i !== 0) {
            var v = textures[i].levels, // Vertex heights at which to blend textures in and out
                p = textures[i].glsl, // Or specify a GLSL expression that evaluates to a float between 0.0 and 1.0 indicating how opaque the texture should be at this texel
                useLevels = typeof v !== 'undefined'; // Use levels if they exist; otherwise, use the GLSL expression
            if (useLevels) {
                // Must fade in; can't start and stop at the same point.
                // So, if levels are too close, move one of them slightly.
                if (v[1] - v[0] < 1) v[0] -= 1;
                if (v[3] - v[2] < 1) v[3] += 1;
                // Convert levels to floating-point numbers as strings so GLSL doesn't barf on "1" instead of "1.0"
                for (var j = 0; j < v.length; j++) {
                    var n = v[j];
                    v[j] = n|0 === n ? n+'.0' : n+'';
                }
            }
            // The transparency of the new texture when it is layered on top of the existing color at this texel is
            // (how far between the start-blending-in and fully-blended-in levels the current vertex is) +
            // (how far between the start-blending-out and fully-blended-out levels the current vertex is)
            // So the opacity is 1.0 minus that.
            var blendAmount = !useLevels ? p :
                '1.0 - smoothstep(' + v[0] + ', ' + v[1] + ', vPosition.z) + smoothstep(' + v[2] + ', ' + v[3] + ', vPosition.z)';
            assign += '        color = mix( ' +
                'texture2D( texture_' + i + ', MyvUv ), ' +
                'color, ' +
                'max(min(' + blendAmount + ', 1.0), 0.0)' +
                ');\n';
        }
    }
    var params = {
        // I don't know which of these properties have any effect
        fog: true,
        lights: true,
        // shading: THREE.SmoothShading,
        // blending: THREE.NormalBlending,
        // depthTest: <bool>,
        // depthWrite: <bool>,
        // wireframe: false,
        // wireframeLinewidth: 1,
        // vertexColors: THREE.NoColors,
        // skinning: <bool>,
        // morphTargets: <bool>,
        // morphNormals: <bool>,
        // opacity: 1.0,
        // transparent: <bool>,
        // side: THREE.FrontSide,

        uniforms: uniforms,
        vertexShader: THREE.ShaderLib.lambert.vertexShader.replace(
            'void main() {',
            'varying vec2 MyvUv;\nvarying vec3 vPosition;\nvoid main() {\nMyvUv = uv;\nvPosition = position;'
        ),
        fragmentShader: [
            'uniform float opacity;',
            'varying vec3 vLightFront;',
            '#ifdef DOUBLE_SIDED',
            '    varying vec3 vLightBack;',
            '#endif',

            THREE.ShaderChunk.color_pars_fragment,
            THREE.ShaderChunk.map_pars_fragment,
            THREE.ShaderChunk.lightmap_pars_fragment,
            THREE.ShaderChunk.envmap_pars_fragment,
            THREE.ShaderChunk.fog_pars_fragment,
            THREE.ShaderChunk.shadowmap_pars_fragment,
            THREE.ShaderChunk.specularmap_pars_fragment,
            THREE.ShaderChunk.logdepthbuf_pars_fragment,

            declare,
            'varying vec2 MyvUv;',
            'varying vec3 vPosition;',

            'void main() {',
            //'    gl_FragColor = vec4( vec3( 1.0 ), opacity );',
            '    vec4 color = texture2D( texture_0, MyvUv ); // base',
                assign,
            '    gl_FragColor = color;',
            //'    gl_FragColor.a = opacity;',

                THREE.ShaderChunk.logdepthbuf_fragment,
                THREE.ShaderChunk.map_fragment,
                THREE.ShaderChunk.alphatest_fragment,
                THREE.ShaderChunk.specularmap_fragment,

            '    #ifdef DOUBLE_SIDED',
            '        if ( gl_FrontFacing )',
            '            gl_FragColor.xyz *= vLightFront;',
            '        else',
            '            gl_FragColor.xyz *= vLightBack;',
            '    #else',
            '        gl_FragColor.xyz *= vLightFront;',
            '    #endif',

                THREE.ShaderChunk.lightmap_fragment,
                THREE.ShaderChunk.color_fragment,
                THREE.ShaderChunk.envmap_fragment,
                THREE.ShaderChunk.shadowmap_fragment,
                THREE.ShaderChunk.linear_to_gamma_fragment,
                THREE.ShaderChunk.fog_fragment,

            '}'
        ].join('\n'),
    };
    return new THREE.ShaderMaterial(params);
};

/**
 * Convert an image-based heightmap into vertex-based height data.
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Object} options
 *    An optional map of settings that control how the terrain is constructed
 *    and displayed. Valid values are the same as those for the `options`
 *    parameter of {@link Terrain}().
 */
Terrain.fromHeightmap = function(g, options) {
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        rows = options.ySegments + 1,
        cols = options.xSegments + 1,
        spread = options.maxHeight - options.minHeight;
    canvas.width = cols;
    canvas.height = rows;
    context.drawImage(options.heightmap, 0, 0, canvas.width, canvas.height);
    var data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var i = row * cols + col,
                idx = i * 4;
            g[i].z = (data[idx] + data[idx+1] + data[idx+2]) / 765 * spread + options.minHeight;
        }
    }
};

/**
 * Convert a terrain plane into an image-based heightmap.
 *
 * Parameters are the same as for {@link Terrain.fromHeightmap} except
 * that if `options.heightmap` is a canvas element then the image will be
 * painted onto that canvas; otherwise a new canvas will be created.
 *
 * NOTE: this method performs an operation on an array of vertices, which
 * aren't available when using `BufferGeometry`. So, if you want to use this
 * method, make sure to set the `useBufferGeometry` option to `false` when
 * generating your terrain.
 *
 * @return {HTMLCanvasElement}
 *   A canvas with the relevant heightmap painted on it.
 */
Terrain.toHeightmap = function(g, options) {
    var canvas = options.heightmap instanceof HTMLCanvasElement ? options.heightmap : document.createElement('canvas'),
        context = canvas.getContext('2d'),
        rows = options.ySegments + 1,
        cols = options.xSegments + 1,
        spread = options.maxHeight - options.minHeight;
    canvas.width = cols;
    canvas.height = rows;
    var d = context.createImageData(canvas.width, canvas.height),
        data = d.data;
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var i = row * cols + col,
            idx = i * 4;
            data[idx] = data[idx+1] = data[idx+2] = Math.round(((g[i].z - options.minHeight) / spread) * 255);
            data[idx+3] = 255;
        }
    }
    context.putImageData(d, 0, 0);
    return canvas;
};

/**
 * Generate a 1D array containing random heightmap data.
 *
 * This is like {@link Terrain.toHeightmap} except that instead of
 * generating the Three.js mesh and material information you can just get the
 * height data.
 *
 * @param {Function} method
 *   The method to use to generate the heightmap data. Works with function that
 *   would be an acceptable value for the `heightmap` option for the
 *   {@link Terrain} function.
 * @param {Number} options
 *   The same as the options parameter for the {@link Terrain} function.
 */
Terrain.heightmapArray = function(method, options) {
    var arr = new Array((options.xSegments+1) * (options.ySegments+1)),
        l = arr.length,
        i;
    // The heightmap functions provided by this script operate on THREE.Vector3
    // objects by changing the z field, so we need to make that available.
    // Unfortunately that means creating a bunch of objects we're just going to
    // throw away, but a conscious decision was made here to optimize for the
    // vector case.
    for (i = 0; i < l; i++) {
        arr[i] = {z: 0};
    }
    options.minHeight = options.minHeight || 0;
    options.maxHeight = typeof options.maxHeight === 'undefined' ? 1 : options.maxHeight;
    options.stretch = options.stretch || false;
    method(arr, options);
    Terrain.Clamp(arr, options);
    for (i = 0; i < l; i++) {
        arr[i] = arr[i].z;
    }
    return arr;
};

/**
 * Smooth the terrain by setting each point to the mean of its neighborhood.
 *
 * Parameters are the same as those for {@link Terrain.DiamondSquare}.
 */
Terrain.Smooth = function(g, options) {
    var heightmap = new Array(g.length);
    for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
        for (var j = 0; j < options.ySegments + 1; j++) {
            var sum = 0;
            for (var n = -1; n <= 1; n++) {
                for (var m = -1; m <= 1; m++) {
                    var key = (j+n)*xl + i + m;
                    if (typeof g[key] !== 'undefined') {
                        sum += g[key].z;
                    }
                }
            }
            heightmap[j*xl + i] = sum / 9;
        }
    }
    for (var k = 0, l = g.length; k < l; k++) {
        g[k].z = heightmap[k];
    }
};

/**
 * Partition a terrain into flat steps.
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Number} [levels]
 *   The number of steps to divide the terrain into. Defaults to
 *   (g.length/2)^(1/4).
 */
Terrain.Step = function(g, levels) {
    // Calculate the max, min, and avg values for each bucket
    var i = 0,
        j = 0,
        l = g.length,
        inc = Math.floor(l / levels),
        heights = new Array(l),
        buckets = new Array(levels);
    if (typeof levels === 'undefined') {
        levels = Math.floor(Math.pow(l*0.5, 0.25));
    }
    for (i = 0; i < l; i++) {
        heights[i] = g[i].z;
    }
    heights.sort(function(a, b) { return a - b; });
    for (i = 0; i < levels; i++) {
        // Bucket by population (bucket size) not range size
        var subset = heights.slice(i*inc, (i+1)*inc),
            sum = 0,
            bl = subset.length;
        for (j = 0; j < bl; j++) {
            sum += subset[j];
        }
        buckets[i] = {
            min: subset[0],
            max: subset[subset.length-1],
            avg: sum / bl,
        };
    }

    // Set the height of each vertex to the average height of its bucket
    for (i = 0; i < l; i++) {
        var startHeight = g[i].z;
        for (j = 0; j < levels; j++) {
            if (startHeight >= buckets[j].min && startHeight <= buckets[j].max) {
                g[i].z = buckets[j].avg;
                break;
            }
        }
    }
};

/**
 * Move the edges of the terrain up or down.
 *
 * Useful to make islands or enclosing walls/cliffs.
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Object} options
 *    An optional map of settings that control how the terrain is constructed
 *    and displayed. Valid values are the same as those for the `options`
 *    parameter of {@link Terrain}().
 * @param {Boolean} direction
 *    `true` if the edges should be turned up; `false` if they should be turned
 *    down.
 * @param {Number} distance
 *    The distance from the edge at which the edges should begin to be affected
 *    by this operation.
 */
Terrain.Edges = function(g, options, direction, distance, easing) {
    var numXSegments = Math.floor(distance / (options.xSize / options.xSegments)) || 1,
        numYSegments = Math.floor(distance / (options.ySize / options.ySegments)) || 1,
        peak = direction ? options.maxHeight : options.minHeight,
        max = direction ? Math.max : Math.min,
        xl = options.xSegments + 1,
        yl = options.ySegments + 1,
        i, j, multiplier, k1, k2;
    easing = easing || Terrain.EaseInOut;
    for (i = 0; i < xl; i++) {
        for (j = 0; j < numYSegments; j++) {
            multiplier = easing(1 - j / numYSegments);
            k1 = j*xl+i;
            k2 = (options.ySegments-j)*xl + i;
            g[k1].z = max(g[k1].z, (peak - g[k1].z) * multiplier + g[k1].z);
            g[k2].z = max(g[k2].z, (peak - g[k2].z) * multiplier + g[k2].z);
        }
    }
    for (i = 0; i < yl; i++) {
        for (j = 0; j < numXSegments; j++) {
            multiplier = easing(1 - j / numXSegments);
            k1 = i*xl+j;
            k2 = (options.ySegments-i)*xl + (options.xSegments-j);
            g[k1].z = max(g[k1].z, (peak - g[k1].z) * multiplier + g[k1].z);
            g[k2].z = max(g[k2].z, (peak - g[k2].z) * multiplier + g[k2].z);
        }
    }
};

/**
 * Transform to turbulent noise.
 *
 * Parameters are the same as those for {@link Terrain.DiamondSquare}.
 */
Terrain.Turbulence = function(g, options) {
    var range = options.maxHeight - options.minHeight;
    for (var i = 0, l = g.length; i < l; i++) {
        g[i].z = options.minHeight + Math.abs((g[i].z - options.minHeight) * 2 - range);
    }
};

/**
 * Generate random terrain using the Diamond-Square method.
 *
 * Based on https://github.com/srchea/Terrain-Generation/blob/master/js/classes/TerrainGeneration.js
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Object} options
 *    An optional map of settings that control how the terrain is constructed
 *    and displayed. Valid values are the same as those for the `options`
 *    parameter of {@link Terrain}().
 */
Terrain.DiamondSquare = function(g, options) {
    // Set the segment length to the smallest power of 2 that is greater than
    // the number of vertices in either dimension of the plane
    var segments = Math.max(options.xSegments, options.ySegments) + 1, n;
    for (n = 1; Math.pow(2, n) < segments; n++) {}
    segments = Math.pow(2, n);

    // Initialize heightmap
    var size = segments + 1,
        heightmap = [],
        smoothing = (options.maxHeight - options.minHeight),
        i,
        j,
        xl = options.xSegments + 1,
        yl = options.ySegments + 1;
    for (i = 0; i <= segments; i++) {
        heightmap[i] = [];
        for (j = 0; j <= segments; j++) {
            heightmap[i][j] = 0;
        }
    }

    // Generate heightmap
    for (var l = segments; l >= 2; l /= 2) {
        var half = Math.round(l*0.5), whole = Math.round(l), x, y, avg, d;
        smoothing /= 2;
        // square
        for (x = 0; x < segments; x += whole) {
            for (y = 0; y < segments; y += whole) {
                d = Math.random() * smoothing * 2 - smoothing;
                avg = heightmap[x][y] +    // top left
                      heightmap[x+whole][y] +  // top right
                      heightmap[x][y+whole] +  // bottom left
                      heightmap[x+whole][y+whole]; // bottom right
                avg *= 0.25;
                heightmap[x+half][y+half] = avg + d;
            }
        }
        // diamond
        for (x = 0; x < segments; x += half) {
            for (y = (x+half) % l; y < segments; y += l) {
                d = Math.random() * smoothing * 2 - smoothing;
                avg = heightmap[(x-half+size)%size][y] + // middle left
                      heightmap[(x+half)%size][y] +      // middle right
                      heightmap[x][(y+half)%size] +      // middle top
                      heightmap[x][(y-half+size)%size];  // middle bottom
                avg *= 0.25;
                avg += d;
                heightmap[x][y] = avg;
                // top and right edges
                if (x === 0) heightmap[segments][y] = avg;
                if (y === 0) heightmap[x][segments] = avg;
            }
        }
    }

    // Apply heightmap
    for (i = 0; i < xl; i++) {
        for (j = 0; j < yl; j++) {
           g[j * xl + i].z += heightmap[i][j];
        }
    }
};

/**
 * Generate random terrain using Weierstrass functions.
 *
 * Weierstrass functions are known for being continuous but not differentiable
 * anywhere. This produces some nice shapes that look terrain-like, but can
 * look repetitive from above.
 *
 * Parameters are the same as those for {@link Terrain.DiamondSquare}.
 */
Terrain.Weierstrass = function(g, options) {
    var range = (options.maxHeight - options.minHeight) * 0.5,
        dir1 = Math.random() < 0.5 ? 1 : -1,
        dir2 = Math.random() < 0.5 ? 1 : -1,
        r11 = 0.5+Math.random()*1.0,
        r12 = 0.5+Math.random()*1.0,
        r13 = 0.025+Math.random()*0.10,
        r14 = -1.0+Math.random()*2.0,
        r21 = 0.5+Math.random()*1.0,
        r22 = 0.5+Math.random()*1.0,
        r23 = 0.025+Math.random()*0.10,
        r24 = -1.0+Math.random()*2.0;
    for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
        for (var j = 0, yl = options.ySegments + 1; j < yl; j++) {
            var sum = 0;
            for (var k = 0; k < 20; k++) {
                var x = Math.pow(1+r11, -k) * Math.sin(Math.pow(1+r12, k) * (i+0.25*Math.cos(j)+r14*j) * r13);
                var y = Math.pow(1+r21, -k) * Math.sin(Math.pow(1+r22, k) * (j+0.25*Math.cos(i)+r24*i) * r23);
                sum += -1 * Math.exp(dir1*x*x+dir2*y*y);
            }
            g[j * xl + i].z += sum * range;
        }
    }
    Terrain.Clamp(g, options);
};

/**
 * Generate random terrain using value noise.
 *
 * Parameters are the same as those for {@link Terrain.DiamondSquare}.
 */
Terrain.Value = function(g, options) {
    // Set the segment length to the smallest power of 2 that is greater than
    // the number of vertices in either dimension of the plane
    var segments = Math.max(options.xSegments, options.ySegments) + 1, n;
    for (n = 1; Math.pow(2, n) < segments; n++) {}
    segments = Math.pow(2, n);

    var range = options.maxHeight - options.minHeight,
        data = new Array(segments*(segments+1));
    // Fill a random 2D array of a smaller octave than the target
    // then interpolate to get the higher-resolution result
    function WhiteNoise(scale, amplitude) {
        if (scale > segments) return;
        var i = 0,
            j = 0,
            xl = options.xSegments + 1,
            yl = options.ySegments + 1,
            inc = Math.floor(segments / scale),
            k;
        for (i = 0; i <= xl; i += inc) {
            for (j = 0; j <= yl; j += inc) {
                k = j * xl + i;
                data[k] = Math.random() * range * amplitude;
                if (k) {
                    /* c b *
                     * l t */
                    var t = data[k],
                        l = data[ j      * xl + (i-inc)] || t,
                        b = data[(j-inc) * xl +  i     ] || t,
                        c = data[(j-inc) * xl + (i-inc)] || t;
                    for (var lastX = i-inc, x = lastX; x < i; x++) {
                        for (var lastY = j-inc, y = lastY; y < j; y++) {
                            if (x === lastX && y === lastY) continue;
                            var px = ((x-lastX) / inc),
                                py = ((y-lastY) / inc),
                                r1 = px * b + (1-px) * c,
                                r2 = px * t + (1-px) * l;
                            data[y * xl + x] = py * r2 + (1-py) * r1;
                        }
                    }
                }
            }
        }
        for (i = 0; i < xl; i++) {
            for (j = 0; j < yl; j++) {
                k = j * xl + i;
                if (!data[k]) console.log(i, j);
                g[k].z += data[k] || 0;
            }
        }
    }
    for (var i = 2; i < 7; i++) {
        WhiteNoise(Math.pow(2, i), Math.pow(2, 2.4-i*1.2));
    }
    //for (var j = 0; j < g.length; j++) g[j].z += options.minHeight;
    Terrain.Smooth(g, options);
    options.stretch = true;
    //Terrain.Clamp(g, options);
};

/**
 * Generate random terrain using Worley noise.
 *
 * Parameters are the same as those for {@link Terrain.DiamondSquare}.
 */
Terrain.Worley = function(g, options) {
    var points = generatePoints(),
        coords = {x: 0, y: 0},
        distanceFunc = distance;
    // For every point in the heightmap, the color is the distance to the closest distributed point
    for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
        for (var j = 0; j < options.ySegments + 1; j++) {
            coords.x = i;
            coords.y = j;
            g[j*xl+i].z = -distanceToNearest(points, coords, distanceFunc);
        }
    }
    options.stretch = true;
    //Terrain.Clamp(g, options);

    function distance(a, b) {
        return a.distanceTo(b);
    }

    // Randomly distribute points in space
    // For more regular cells, this could be done with a jittered grid
    // Poisson Disks are the other implemented option
    function generatePoints() {
        var numPoints = Math.floor(Math.sqrt(options.xSegments * options.ySegments * options.frequency * 0.5)) || 1,
            points = new Array(numPoints);
        for (var i = 0; i < numPoints; i++) {
            var p = new THREE.Vector2(
                Math.random() * options.xSegments,
                Math.random() * options.ySegments
            );
            points[i] = p;
        }
        return points;
    }

    // Find the point closest to the terrain vertex
    // This is naive, but the numbers aren't big enough to matter
    // Alternatives include Fortune's algorithm and using a grid
    function distanceToNearest(points, coords, distanceFunc) {
        var color = Infinity;
        for (var k = 0; k < points.length; k++) {
            var d = distanceFunc(points[k], coords);
            if (d < color) {
                color = d;
            }
        }
        return color;
    }
};

if (window.noise && window.noise.perlin) {
    /**
     * Generate random terrain using the Perlin Noise method.
     *
     * Parameters are the same as those for {@link Terrain.DiamondSquare}.
     */
    Terrain.Perlin = function(g, options) {
        noise.seed(Math.random());
        var range = options.maxHeight - options.minHeight * 0.5,
            divisor = (Math.min(options.xSegments, options.ySegments) + 1) * options.frequency;
        for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (var j = 0, yl = options.ySegments + 1; j < yl; j++) {
                g[j * xl + i].z += noise.perlin(i / divisor, j / divisor) * range;
            }
        }
    };
}

if (window.noise && window.noise.simplex) {
    /**
     * Generate random terrain using the Simplex Noise method.
     *
     * Parameters are the same as those for {@link Terrain.DiamondSquare}.
     *
     * See https://github.com/mrdoob/three.js/blob/master/examples/webgl_terrain_dynamic.html
     * for an interesting comparison where the generation happens in GLSL.
     */
    Terrain.Simplex = function(g, options) {
        noise.seed(Math.random());
        var range = (options.maxHeight - options.minHeight) * 0.5,
            divisor = (Math.min(options.xSegments, options.ySegments) + 1) * options.frequency * 2;
        for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (var j = 0, yl = options.ySegments + 1; j < yl; j++) {
                g[j * xl + i].z += noise.simplex(i / divisor, j / divisor) * range;
            }
        }
    };
}

/**
 * A utility for generating heightmap functions by composition.
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Object} [options]
 *    An optional map of settings that control how the terrain is constructed
 *    and displayed. Valid values are the same as those for the `options`
 *    parameter of {@link Terrain}().
 * @param {Object[]} passes
 *   Determines which heightmap functions to compose to create a new one.
 *   Consists of an array of objects with a `method` property containing
 *   something that will be passed around as an `options.heightmap` (a
 *   heightmap-generating function or a heightmap image) and optionally an
 *   `amplitude` property which is a multiplier for the heightmap of that
 *   pass that will be applied before adding it to the result of previous
 *   passes.
 */
Terrain.MultiPass = function(g, options, passes) {
    var clonedOptions = {};
    for (var opt in options) {
        if (options.hasOwnProperty(opt)) {
            clonedOptions[opt] = options[opt];
        }
    }
    var range = options.maxHeight - options.minHeight;
    for (var i = 0, l = passes.length; i < l; i++) {
        var amp = typeof passes[i].amplitude === 'undefined' ? 1 : passes[i].amplitude,
            move = 0.5 * (range - range * amp);
        clonedOptions.maxHeight = options.maxHeight - move;
        clonedOptions.minHeight = options.minHeight + move;
        clonedOptions.frequency = typeof passes[i].frequency === 'undefined' ? options.frequency : passes[i].frequency;
        passes[i].method(g, clonedOptions);
    }
};

/**
 * Rescale the heightmap of a terrain to keep it within the maximum range.
 *
 * @param {THREE.Vector3[]} g
 *   The vertex array for plane geometry to modify with heightmap data. This
 *   method sets the `z` property of each vertex.
 * @param {Object} options
 *   A map of settings that control how the terrain is constructed and
 *   displayed. Valid values are the same as those for the `options` parameter
 *   of {@link Terrain}() but only `maxHeight`, `minHeight`, and `easing`
 *   are used.
 */
Terrain.Clamp = function(g, options) {
    var min = Infinity,
        max = -Infinity,
        l = g.length,
        i;
    options.easing = options.easing || Terrain.Linear;
    for (i = 0; i < l; i++) {
        if (g[i].z < min) min = g[i].z;
        if (g[i].z > max) max = g[i].z;
    }
    var actualRange = max - min,
        optMax = typeof options.maxHeight === 'undefined' ? max : options.maxHeight,
        optMin = typeof options.minHeight === 'undefined' ? min : options.minHeight,
        targetMax = options.stretch ? optMax : (max < optMax ? max : optMax),
        targetMin = options.stretch ? optMin : (min > optMin ? min : optMin),
        range = targetMax - targetMin;
    if (targetMax < targetMin) {
        targetMax = optMax;
        range = targetMax - targetMin;
    }
    for (i = 0; i < l; i++) {
        g[i].z = options.easing((g[i].z - min) / actualRange) * range + optMin;
    }
};

/**
 * Randomness interpolation functions.
 */
Terrain.Linear = function(x) {
    return x;
};

// x = [0, 1], x^2
Terrain.EaseIn = function(x) {
    return x*x;
};

// x = [0, 1], -x(x-2)
Terrain.EaseOut = function(x) {
    return -x * (x - 2);
};

// x = [0, 1], x^2(3-2x)
// Nearly identical alternatives: 0.5+0.5*cos(x*pi-pi), x^a/(x^a+(1-x)^a) (where a=1.6 seems nice)
// For comparison: http://www.wolframalpha.com/input/?i=x^1.6%2F%28x^1.6%2B%281-x%29^1.6%29%2C+x^2%283-2x%29%2C+0.5%2B0.5*cos%28x*pi-pi%29+from+0+to+1
Terrain.EaseInOut = function(x) {
    return x*x*(3-2*x);
};

// x = [0, 1], 0.5*(2x-1)^3+0.5
Terrain.InEaseOut = function(x) {
    var y = 2*x-1;
    return 0.5 * y*y*y + 0.5;
};

if (Terrain.Perlin) {
    /**
     * Generate random terrain using the Perlin and Diamond-Square methods composed.
     *
     * Parameters are the same as those for {@link Terrain.DiamondSquare}.
     */
    Terrain.PerlinDiamond = function(g, options) {
        Terrain.MultiPass(g, options, [
            {method: Terrain.Perlin},
            {method: Terrain.DiamondSquare, amplitude: 0.75},
        ]);
    };

    /**
     * Generate random terrain using layers of Perlin noise.
     *
     * Parameters are the same as those for {@link Terrain.DiamondSquare}.
     */
    Terrain.PerlinLayers = function(g, options) {
        Terrain.MultiPass(g, options, [
            {method: Terrain.Perlin,                  frequency: 0.8},
            {method: Terrain.Perlin, amplitude: 0.05, frequency: 0.4},
            {method: Terrain.Perlin, amplitude: 0.35, frequency: 0.2},
            {method: Terrain.Perlin, amplitude: 0.15, frequency: 0.1},
        ]);
    };
}

if (Terrain.Simplex) {
    /**
     * Generate random terrain using layers of Simplex noise.
     *
     * Parameters are the same as those for {@link Terrain.DiamondSquare}.
     */
    Terrain.SimplexLayers = function(g, options) {
        Terrain.MultiPass(g, options, [
            {method: Terrain.Simplex,                    frequency: 0.8},
            {method: Terrain.Simplex, amplitude: 0.5,    frequency: 0.4},
            {method: Terrain.Simplex, amplitude: 0.25,   frequency: 0.2},
            {method: Terrain.Simplex, amplitude: 0.125,  frequency: 0.1},
            {method: Terrain.Simplex, amplitude: 0.0625, frequency: 0.05},
        ]);
    };
}

/**
 * Scatter a mesh across the terrain.
 *
 * @param {THREE.Geometry} geometry
 *   The terrain's geometry (or the highest-resolution version of it).
 * @param {Object} options
 *   A map of settings that controls how the meshes are scattered, with the
 *   following properties:
 *   - `mesh`: A `THREE.Mesh` instance to scatter across the terrain.
 *   - `spread`: A number or a function that affects where meshes are placed.
 *     If it is a number, it represents the percent of faces of the terrain
 *     onto which a mesh should be placed. If it is a function, it takes a
 *     vertex from the terrain and the key of a related face and returns a
 *     boolean indicating whether to place a mesh on that face or not. An
 *     example could be `function(v, k) { return v.z > 0 && !(k % 4); }`.
 *     Defaults to 0.025.
 *   - `scene`: A `THREE.Object3D` instance to which the scattered meshes will
 *     be added. This is expected to be either a return value of a call to
 *     `Terrain()` or added to that return value; otherwise the position
 *     and rotation of the meshes will be wrong.
 *   - `sizeVariance`: The percent by which instances of the mesh can be scaled
 *     up or down when placed on the terrain.
 *   - `randomness`: If `options.spread` is a number, then this property is a
 *     function that determines where meshes are placed. Valid values include
 *     `Math.random` and the return value of a call to
 *     `Terrain.ScatterHelper`.
 *   - `maxSlope`: The angle in radians between the normal of a face of the
 *     terrain and the "up" vector above which no mesh will be placed on the
 *     related face. Defaults to ~0.63, which is 36 degrees.
 *   - `x`, `y`, `w`, `h`: Together, these properties outline a rectangular
 *     region on the terrain inside which meshes should be scattered. The `x`
 *     and `y` properties indicate the upper-left corner of the box and the `w`
 *     and `h` properties indicate its width and height, respectively, in units
 *     of terrain segments (like those specified in the `options` parameter for
 *     the `Terrain` function). `x` and `y` default to zero, but `w` and
 *     `h` are required.
 *
 * @return {THREE.Object3D}
 *   An Object3D containing the scattered meshes. This is the value of the
 *   `options.scene` parameter if passed. This is expected to be either a
 *   return value of a call to `Terrain()` or added to that return value;
 *   otherwise the position and rotation of the meshes will be wrong.
 */
Terrain.ScatterMeshes = function(geometry, options) {
    if (!options.mesh) {
        console.error('options.mesh is required for Terrain.ScatterMeshes but was not passed');
        return;
    }
    if (geometry instanceof THREE.BufferGeometry) {
        console.warn('The terrain mesh is using BufferGeometry but Terrain.ScatterMeshes can only work with Geometry.');
        return;
    }
    if (!options.scene) {
        options.scene = new THREE.Object3D();
    }
    var defaultOptions = {
        spread: 0.025,
        sizeVariance: 0.1,
        randomness: Math.random,
        maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
        x: 0,
        y: 0,
        w: 0,
        h: 0,
    };
    for (var opt in defaultOptions) {
        if (defaultOptions.hasOwnProperty(opt)) {
            options[opt] = typeof options[opt] === 'undefined' ? defaultOptions[opt] : options[opt];
        }
    }

    var spreadIsNumber = typeof options.spread === 'number',
        randomHeightmap,
        randomness,
        doubleSizeVariance = options.sizeVariance * 2,
        v = geometry.vertices,
        meshes = [],
        up = options.mesh.up.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5*Math.PI);
    if (spreadIsNumber) {
        randomHeightmap = options.randomness();
        randomness = typeof randomHeightmap === 'number' ? Math.random : function(k) { return randomHeightmap[k]; };
    }
    geometry.computeFaceNormals();
    for (var i = options.y, w = options.w*2; i < w; i++) {
        for (var j = options.x, h = options.h; j < h; j++) {
            var key = j*w + i,
                f = geometry.faces[key];
            if (spreadIsNumber ? randomness(key) < options.spread : options.spread(v[f.a], key)) {
                // Don't place a mesh if the angle is too steep.
                if (f.normal.angleTo(up) > options.maxSlope) {
                    continue;
                }
                var mesh = options.mesh.clone();
                //mesh.geometry.computeBoundingBox();
                mesh.position.copy(v[f.a]).add(v[f.b]).add(v[f.c]).divideScalar(3);
                //mesh.translateZ((mesh.geometry.boundingBox.max.z - mesh.geometry.boundingBox.min.z) * 0.5);
                var normal = mesh.position.clone().add(f.normal);
                mesh.lookAt(normal);
                mesh.rotation.x += 90 / 180 * Math.PI;
                if (options.sizeVariance) {
                    var variance = Math.random() * doubleSizeVariance - options.sizeVariance;
                    mesh.scale.x = mesh.scale.z = 1 + variance;
                    mesh.scale.y += variance;
                }
                meshes.push(mesh);
            }
        }
    }

    // Merge geometries.
    var k, l;
    if (options.mesh.geometry instanceof THREE.Geometry) {
        var g = new THREE.Geometry();
        for (k = 0, l = meshes.length; k < l; k++) {
            var m = meshes[k];
            m.updateMatrix();
            g.merge(m.geometry, m.matrix);
        }
        /*
        if (!(options.mesh.material instanceof THREE.MeshFaceMaterial)) {
            g = THREE.BufferGeometryUtils.fromGeometry(g);
        }
        */
        options.scene.add(new THREE.Mesh(g, options.mesh.material));
    }
    // There's no BufferGeometry merge method implemented yet.
    else {
        for (k = 0, l = meshes.length; k < l; k++) {
            options.scene.add(meshes[k]);
        }
    }

    return options.scene;
};

/**
 * Generate a function that returns a heightmap to pass to ScatterMeshes.
 *
 * @param {Function} method
 *   A random terrain generation function (i.e. a valid value for the
 *   `options.heightmap` parameter of the `Terrain` function).
 * @param {Object} options
 *   A map of settings that control how the resulting noise should be generated
 *   (with the same parameters as the `options` parameter to the
 *   `Terrain` function). `options.minHeight` must equal `0` and
 *   `options.maxHeight` must equal `1` if they are specified.
 * @param {Number} skip
 *   The number of sequential faces to skip between faces that are candidates
 *   for placing a mesh. This avoid clumping meshes too closely together.
 *
 * @return {Function}
 *   Returns a function that can be passed as the value of the
 *   `options.randomness` parameter to the {@link Terrain.ScatterMeshes}
 *   function.
 */
Terrain.ScatterHelper = function(method, options, skip, threshold) {
    skip = skip || 1;
    threshold = threshold || 0.25;
    options.frequency = options.frequency || 0.4;

    var clonedOptions = {};
    for (var opt in options) {
        if (options.hasOwnProperty(opt)) {
            clonedOptions[opt] = options[opt];
        }
    }

    clonedOptions.xSegments *= 2;
    clonedOptions.stretch = true;
    var heightmap = Terrain.heightmapArray(method, clonedOptions);

    for (var i = 0, l = heightmap.length; i < l; i++) {
        if (i % skip || Math.random() > threshold) {
            heightmap[i] = 1;
        }
    }
    return function() {
        return heightmap;
    };
};

/**
 * Generate a set of points using Poisson disk sampling.
 *
 * Useful for clustering scattered meshes and Voronoi cells for Worley noise.
 *
 * Ported from pseudocode at http://devmag.org.za/2009/05/03/poisson-disk-sampling/
 *
 * @param {Object} options
 *   A map of settings that control how the resulting noise should be generated
 *   (with the same parameters as the `options` parameter to the
 *   `Terrain` function).
 *
 * @return {THREE.Vector2[]}
 *   An array of points.
 */
Terrain.PoissonDisks = function(options) {
    function removeAndReturnRandomElement(arr) {
        return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    }

    function putInGrid(grid, point, cellSize) {
        var gx = Math.floor(point.x / cellSize), gy = Math.floor(point.y / cellSize);
        if (!grid[gx]) grid[gx] = [];
        grid[gx][gy] = point;
    }

    function inRectangle(point) {
        return  point.x >= 0 &&
                point.y >= 0 &&
                point.x <= options.xSegments+1 &&
                point.y <= options.ySegments+1;
    }

    function inNeighborhood(grid, point, minDist, cellSize) {
        var gx = Math.floor(point.x / cellSize),
            gy = Math.floor(point.y / cellSize);
        for (var x = gx - 1; x <= gx + 1; x++) {
            for (var y = gy - 1; y <= gy + 1; y++) {
                if (x !== gx && y !== gy &&
                    typeof grid[x] !== 'undefined' && typeof grid[x][y] !== 'undefined') {
                    var cx = x * cellSize, cy = y * cellSize;
                    if (Math.sqrt((point.x - cx) * (point.x - cx) + (point.y - cy) * (point.y - cy)) < minDist) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function generateRandomPointAround(point, minDist) {
        var radius = minDist * (Math.random() + 1),
            angle = 2 * Math.PI * Math.random();
        return new THREE.Vector2(
            point.x + radius * Math.cos(angle),
            point.y + radius * Math.sin(angle)
        );
    }

    var numPoints = Math.floor(Math.sqrt(options.xSegments * options.ySegments * options.frequency * 0.5)) || 1,
        minDist = Math.sqrt((options.xSegments + options.ySegments) * (1 / options.frequency)),
        cellSize = minDist / Math.sqrt(2);
    if (cellSize < 2) cellSize = 2;

    var grid = [];

    var processList = [],
        samplePoints = [];

    var firstPoint = new THREE.Vector2(
        Math.random() * options.xSegments,
        Math.random() * options.ySegments
    );
    processList.push(firstPoint);
    samplePoints.push(firstPoint);
    putInGrid(grid, firstPoint, cellSize);

    var count = 0;
    while (processList.length) {
        var point = removeAndReturnRandomElement(processList);
        for (var i = 0; i < numPoints; i++) {
            // optionally, minDist = perlin(point.x / options.xSegments, point.y / options.ySegments)
            var newPoint = generateRandomPointAround(point, minDist);
            if (inRectangle(newPoint) && !inNeighborhood(grid, newPoint, minDist, cellSize)) {
                processList.push(newPoint);
                samplePoints.push(newPoint);
                putInGrid(grid, newPoint, cellSize);
                if (samplePoints.length >= numPoints) break;
            }
        }
        if (samplePoints.length >= numPoints) break;
        // Sanity check
        if (++count > numPoints*numPoints) {
            break;
        }
    }
    return samplePoints;
};

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
        //terrainScene.rotation.z=3.1415;
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
        this.world = e.world;
        const map = this.world.map;

        const threeHeightMap = map.toThreeTerrain();

        TerrainBuilder.create(map, this.scene, threeHeightMap);

        // FIXME: load all models beforehand
        this.world.initScene(this.scene);
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
        console.log("wheel", e, this.viewCenter);
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
        //console.log("hover", mouse);
        var res = Pick.pick(mouse, this.base.camera, this.base.scene);

        if (res.length > 0) {
            var entity = res[0].object.userData.entity;
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
    constructor(heightmap, ops) {
        var entity = EntityTypes[ops.type];
        if (!entity) {
            console.warn("Entity: No Entity-Type named " + ops.type + " found!");
            entity = {};
        }

        _.extend(this, entity);
        _.extend(this, ops);
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

    postLoad() {
        this.mixins.each(mixin => {
            if (mixin.postLoad) {
                mixin.postLoad.apply(this, []);
            }
        });
    };

    isA(mixin) {
        return this.mixinDef.indexOf(mixin) >= 0;
    }

    setScene(scene) {
        this.scene = scene;
        this.setMesh(this.meshName);
    };

    updateMeshPos() {
        if (this.mesh) {
            if (this.mesh && this.mesh.rotation && this.rotation)
                this.mesh.rotation.z = this.rotation;
            this.mesh.setPos(this.pos.x, this.pos.y, this.map.get("rock").interpolate(this.pos.x, this.pos.y));
        }
    };

    setMesh(name) {

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

        Models.load(meshType, animation, this, self.scene, (mesh) => {
            if (this.mesh) {
                this.mesh.remove();
            }
            if (mesh.type == self.meshType && mesh.animation == self.animation) {
                this.mesh = mesh;
                mesh.setEntity(self);
                this.updateMeshPos();
                if (this.animationFinished)
                    this.mesh.animationFinished = self.animationFinished.bind(this);
                this.mesh.hovered(self.state.hovered);
                this.mesh.selected(self.state.selected);
            } else {
                mesh.remove();
            }
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

class WorldLoader {
    static load(world, data) {
        data.forEach(entityDefinition=>
            world.push(new Entity(world.map, entityDefinition))
        );
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
            this.loadWorld(this.getAttribute("load"));
        }


        document[this.exposeName] = this.world;

        setTimeout(() =>
            this.querySelectorAll("*[world-accessor]").forEach(e =>
                e.dispatchEvent(new WorldEvent(this.world)))
        );
    }

    disconnectedCallback() {
        delete document[this.exposeName];
    }

    loadWorld(url) {
        ajax(url).then(data =>
            WorldLoader.load(this.world, data)
        );
    }
}

if (!customElements.get('ag-world')) {
    customElements.define('ag-world', AgWorld);
}

}(THREE, _));

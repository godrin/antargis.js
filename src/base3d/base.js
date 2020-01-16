import * as THREE from 'three'
import SPE from '../libs/ShaderParticles'

const clock = new THREE.Clock();


class Base {
    constructor(el) {

        console.log("EL", el, this)
        this.scene = new THREE.Scene();
        var camera = this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);

        this.renderer = new THREE.WebGLRenderer();

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        el.appendChild(this.renderer.domElement)

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
            if (!self.destroyed)
                requestAnimationFrame(dorender);
            var time = (new Date()).getTime();
            var timeDiff = time - lastTime;
            lastTime = time;

            var delta;
            var use3jsTime = false;

            if (use3jsTime)
                delta = clock.getDelta();
            else
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

export default Base;

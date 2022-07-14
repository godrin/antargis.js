import addSkybox from "./skybox.js";

function getRandomNumber( base ) {
	return Math.random() * base - (base/2);
}
function getRandomColor() {
	var c = new THREE.Color();
	c.setRGB( Math.random(), Math.random(), Math.random() );
	return c;
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

		var emitter = this.particleGroup.getFromPool()
		emitter.position.value = new THREE.Vector3(-2,0,0)
		emitter.enable();
		emitter = this.particleGroup.getFromPool()
		emitter.position.value = new THREE.Vector3(-4,0,0)
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
		this.entities = []
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
			this.particleGroup.tick(delta)
		}
	}

	add(node) {
		//    this.entities.push(entity)

		console.log("ADD", node);
		this.scene.add(node)
	}

	remove(node) {
		this.scene.remove(node)
	}

	makeEmitter(pos) {
		return new SPE.Emitter(this.emitterSettings);
	}

	destroy() {
		this.destroyed = true;
	}
}

export default AntScene

import * as THREE from "three";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader"
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

class AgSceneViewer extends HTMLElement {
    connectedCallback() {
        this.initScene()
    }

    async initScene() {

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75,
            window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 6;
        this.camera.position.y = 6;
        this.camera.rotation.x = -3.14 / 180 * 45;
        //this.camera.rotation.y = 3.14 / 180 * 20;

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        this.appendChild(renderer.domElement);

        this.addLight();
        this.createCube();
        const model = await this.loadModel(this.getAttribute("gltf-file"));
        // and stone
        const stone= await this.loadModel();
        stone.position.x+=2

        this.arrowHelper(this.scene);

        var animate = () => {
            requestAnimationFrame(animate);
            renderer.render(this.scene, this.camera);
            model.rotation.y += 3.14 / 180 * 1
        };
        animate();
    }


    quaternion(angle) {
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 180 * angle);
        return quaternion
    }

    arrowHelper(scene) {
        this.arrowHelperSingle(scene, new THREE.Vector3(1, 0, 0), 0xffff00);
        this.arrowHelperSingle(scene, new THREE.Vector3(0, 1, 0), 0x00ff00);
        this.arrowHelperSingle(scene, new THREE.Vector3(0, 0, 1), 0x0000ff)
    }

    arrowHelperSingle(scene, dir, color) {

        var origin = new THREE.Vector3(0, 0, 0);
        var length = 3;

        var arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
        scene.add(arrowHelper);
        return arrowHelper
    }

    addLight() {
        var light = new THREE.AmbientLight(0x404040); // soft white light
        this.scene.add(light);

        // White directional light at half intensity shining from the top.
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.scene.add(directionalLight);
        var light = new THREE.PointLight(0xff0000, 1, 100);
        light.position.set(50, 50, 50);
        this.scene.add(light);
    }

    createCube() {
        var geometry = new THREE.BoxGeometry();
        var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
        var cube = new THREE.Mesh(geometry, material);
        this.scene.add(cube);
    }

    async loadModel(url) {
        return new Promise((resolve) => {
            // Instantiaßte a loader
            var loader = new GLTFLoader();

            // Optional: Provide a DRACOLoader instance to decode compressed mesh data
            var dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('/examples/js/libs/draco/');
            loader.setDRACOLoader(dracoLoader);

            // Load a glTF resource
            loader.load(
                // resource URL
                url||'models/big_stone3.gltf',
                // called when the resource is loaded
                (gltf) => {

                    this.scene.add(gltf.scene);
                    resolve(gltf.scene);
                    //gltf.scene.rotateX(-Math.PI / 2);

                    gltf.animations; // Array<THREE.AnimationClip>
                    gltf.scene; // THREE.Scene
                    gltf.scenes; // Array<THREE.Scene>
                    gltf.cameras; // Array<THREE.Camera>
                    gltf.asset; // Object

                },
                // called while loading is progressing
                (xhr) => {

                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');

                },
                // called when loading has errors
                (error) => {

                    console.log('An error happened', error);

                }
            );
        });
    }
}


if (!customElements.get('ag-scene-viewer')) {
    customElements.define('ag-scene-viewer', AgSceneViewer);
}

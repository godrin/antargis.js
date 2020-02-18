import Meshes from "../config/meshes"
import Model from "./model"
import * as THREE from 'three'
import _ from 'lodash'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// FIXME: not needed anymore?
function ensureLoop(animation) {
    return;
    for (var i = 0; i < animation.hierarchy.length; i++) {

        var bone = animation.hierarchy[i];

        var first = bone.keys[0];
        var last = bone.keys[bone.keys.length - 1];

        last.pos = first.pos;
        last.rot = first.rot;
        last.scl = first.scl;
    }
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
        if (!this.objLoader) {
            this.objLoader = new OBJLoader(manager);
        }
        if (!this.jsonLoader) {
            //this.jsonLoader = new THREE.JSONLoader(manager);
        }
        if (!this.imageLoader) {
            this.imageLoader = new THREE.ImageLoader(manager);
        }

        if(!this.gltfLoader) {
            this.gltfLoader = new GLTFLoader();
        }

        // FIXME: add caching later on

        this.textureLoader = new THREE.TextureLoader();

    }
/*
    static assignTexture(object, texture, options) {
        if(object.traverse) {
            object.traverse(function (child) {
                if (child && child.material) {
                    child.material.map = texture;
                    if (options.doublesided)
                        child.material.side = THREE.DoubleSide;
                    if (options.transparent) {
                        child.material.transparent = true;
                        child.material.depthWrite = false;
                    }
                }
            });
        }
    }

    static fixPositions(pos) {
        if(pos) {
            if (typeof pos.x === 'string' || pos.x instanceof String) {
                pos.x = eval(pos.x);
            }
            if (typeof pos.y === 'string' || pos.y instanceof String) {
                pos.y = eval(pos.y);
            }
            if (typeof pos.z === 'string' || pos.z instanceof String) {
                pos.z = eval(pos.z);
            }
        }
    }
*/
    async load(meshName, animationName) {
        return this.loadUncached(meshName, animationName).then(this.packIntoNode.bind(this))
    }

    packIntoNode(options) {
        const {meshDef, mesh, meshName} = options;
        console.log("MESH", mesh)
        var objects;
        if(mesh.scene) {
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
            console.log("POST rotation", meshDef.rotation)
 //           _.extend(object.rotation, meshDef.rotation);
            object.rotateX(Math.PI / 2);
/*
            _.extend(object.position, meshDef.position);

            if (meshDef.scale && object.scale && object.scale.set) {
                object.scale.set(meshDef.scale, meshDef.scale, meshDef.scale);
            }
*/
            node.add(object);
        });
        const newModel = new Model(objects, node);
        this.addRings(node, newModel);
        newModel.name = mesh;
        newModel.type = meshName;
        //FIXME
        // newModel.animation = animation;
        return newModel
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
        return new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), material);
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

    makeTextureName(mesh, options) {
        let texName = mesh + ".jpg";
        if (options.texture) {
            texName = options.texture;
        }
        return "models/" + texName;
    }


    async loadImage(texName) {

        return new Promise((resolve, reject) => {
            this.textureLoader.load(texName, function (texture) {
                resolve(texture);
            }, null, reject)
        })
    }

    async loadObj(meshName) {
        if(false) {
            return new Promise((resolve)=> {
                const mesh = Models.createBox()
                resolve({mesh, meshName})
            })
        }


        return new Promise((resolve, reject) => {

            if(this.gltfLoader) {
                this.gltfLoader.load(
                    'models/' + meshName + '.gltf',
                    mesh => {
                        resolve({mesh, meshName})
                    },
                    null,
                    reject);
            } else {
                this.objLoader.load(
                    'models/' + meshName + '.obj',
                    mesh => {
                        resolve({mesh, meshName})
                    },
                    null,
                    reject);
            }
        });
    }



    async loadObjComplete(name, dummy) {
        const meshDef = this.meshes[name];
        const meshName = (meshDef && meshDef.mesh) || name;
        const texName = this.makeTextureName(meshName, meshDef);
        console.log("Load texture", name, meshName, texName);
        const meshObject = await this.loadObj(meshName)

        console.log("MODELOBJECT ", name, meshObject)

        if(!this.gltfLoader) {
            const texture = await this.loadImage(texName)
            Models.assignTexture(meshObject.mesh, texture, meshDef);
        }

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
        var self = this;

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

                resolve(mesh)
            }, null, reject);
        });
    }
}

export default Models;
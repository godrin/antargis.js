import * as THREE from 'three'

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader'
import Terrain from './libs/terrain'
import SPE from './libs/ShaderParticles'

var t = {DRACOLoader, GLTFLoader, Terrain};

Object.assign(t, THREE);


window.THREE = t;
window.SPE = SPE;
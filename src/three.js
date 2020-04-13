/**
  This file contains everything to build the static assets (not game-content).
 */

import * as THREE from 'three'

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader'
import Terrain from './libs/terrain'
import mustache from "mustache/mustache";
//import SPE from './libs/ShaderParticles'

var t = {DRACOLoader, GLTFLoader, Terrain};

Object.assign(t, THREE);

if(window) {
    window.THREE = t;
    window.mustache = mustache;
} else {
    global.window = global;
    global.mustache = mustache;
}
//window.SPE = SPE;

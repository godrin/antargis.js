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

import * as THREE from 'three'

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
        i, j, multiplier, target, k1, k2;
    easing = easing || Terrain.EaseInOut;
    for (i = 0; i < xl; i++) {
        for (j = 0; j < numYSegments; j++) {
            multiplier = easing(1 - j / numYSegments);
            target = peak * multiplier;
            k1 = j*xl+i;
            k2 = (options.ySegments-j)*xl + i;
            g[k1].z = max(g[k1].z, (peak - g[k1].z) * multiplier + g[k1].z);
            g[k2].z = max(g[k2].z, (peak - g[k2].z) * multiplier + g[k2].z);
        }
    }
    for (i = 0; i < yl; i++) {
        for (j = 0; j < numXSegments; j++) {
            multiplier = easing(1 - j / numXSegments);
            target = peak * multiplier;
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
        var half = Math.round(l*0.5), whole = Math.round(l), x, y, avg, d, e;
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
    function distanceSquared(a, b) {
        return a.distanceToSquared(b);
    }
    function distanceManhattan(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    function distanceChebyshev(a, b) {
        var c = Math.abs(a.x - b.x), d = Math.abs(a.y - b.y);
        return c <= d ? d : c;
    }
    function distanceQuadratic(a, b) {
        var c = Math.abs(a.x - b.x), d = Math.abs(a.y - b.y);
        return c*c + c*d + d*d;
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

export default Terrain
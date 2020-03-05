module.exports = {
    js: [
        {
            source: "./src/index.js",
            target: "./dist/index.js"
        },
        {
            source: "./src/demo.js",
            target: "./dist/demo.js"
        }
        /*,
        {
            source:"./src/three.js",
            target: "./dist/three.js"
        }*/
    ],
    sass: [{
        source: "./index.scss",
        target: "./dist/index.css"
    }]
};

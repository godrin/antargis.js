module.exports = {
    js: [{
        source: "./src/index.js",
        target: "./dist/index.js",
        externals: {
            three: "THREE",
            lodash: "_"
        }
    }],
    sass: [{
        source: "./index.scss",
        target: "./dist/index.css"
    }]
};

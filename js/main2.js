requirejs.config({
  baseUrl:"js",
  paths: {
    jquery: '../bower_components/jquery/dist/jquery',
    underscore: '../bower_components/underscore/underscore',
    three: '../bower_components/threejs/build/three',
    objloader: 'libs/OBJLoader.js',
    projector: 'libs/Projector.js',
    shader_particles: 'libs/ShaderParticles.js',
    angularjs: '../bower_components/angular/angular',
    'angular-resource': '../bower_components/angular-resource/angular-resource',
    'angular-route': '../bower_components/angular-route/angular-route.min'
  },
  shim: {
    angular: {  'exports' : 'angular'},
    app2:{
      deps: ['jquery', 'angularjs']
    },
    'angular-resource': {
      deps: [ 'angularjs' ]
    }
  },
  packages:[
    'jobs',
    'formations',
    'll',
    'ml',
    'hl',
    'angular'
  ],
});
require(['app2'],function(app2) {
  console.log("APP",app2);
  // bootstrap angular 
  angular.bootstrap(document, ['App']);
});

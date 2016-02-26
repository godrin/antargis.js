requirejs.config({
  baseUrl:"js",
  paths: {
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
require(['app2', 'ng_game', 'intro'],function(app2) {
  // bootstrap angular 
  angular.bootstrap(document, ['App']);
});

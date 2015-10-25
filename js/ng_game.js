define(["app2", "three","base"], function(app,_three, Base) {

  app.controller('GameController', function($scope) {});


  function makeSceneAndCamera($element) {
    var data = {};
    data.scene = new THREE.Scene();
    var w = $element.width();
    var h = $element.height();
    var camera = data.camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000);

    data.renderer = new THREE.WebGLRenderer();

    data.renderer.setSize(w, h);
    $element.prepend(data.renderer.domElement);
    $(data.renderer.domElement).addClass("game-view");

    camera.position.x = 16;
    camera.position.y = -5;
    camera.position.z = 10;
    camera.rotation.x = (10 + 32) * Math.PI / 180;

    data.camera.aspect = w / h;
    data.camera.updateProjectionMatrix();

    data.renderer.setSize(w, h);
    if (false) {
      data.particleGroup = this.makeSPEGroup();
      data.particleGroup.addPool(10, this.emitterSettings, false);
      data.scene.add(data.particleGroup.mesh);
      data.scene.particleGroup = data.particleGroup;
    }
    return data;
  }

  app.controller('GameView', function($scope, $element) {
    var data = new Base($element);//makeSceneAndCamera($element);
    $scope.scene = data.scene;
  });

  app.directive('gameView', function() {
    return {
      controller: 'GameView'
    };
  });
});

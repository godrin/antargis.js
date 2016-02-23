define(["app2", "base", "generator", "heightmap", "level", "world", "skybox", "terrain"], function(app, Base, Generator, HeightMap, Level, World, Skybox, Terrain) {

  app.controller('GameController', function($scope, hotkeys) {
    var tomenu = function() {
      location.hash="/menu";
    };
    hotkeys.bindTo($scope)
    .add({
      combo: 'esc',
      description: 'Back to menu',
      callback: tomenu
    })
  });

  app.factory('World', function($q) {
    return {
      createWorld: function(w, levelName) {
        return $q(function(resolve, reject) {
          var mapOptions = {
            width: w,
            height: w
          };

          Generator(mapOptions, function(w, h, data) {
            data = HeightMap.pickGreen(w, h, data)

            var map = new HeightMap({
              width: w,
              height: w,
              map: {
                rock: data
              }
            });
            var world = new World(map);
            Level.load(levelName, map, world, function() {
              resolve(world);
            });
          });
        });
      }
    };
  });


  // Store world in rootScope
  app.run(function($rootScope, World) {
    World.createWorld(64, "tests/fetch.js").then(function(world) {
      $rootScope.world = world;
    });
  });

  app.controller('GameView', function($scope, $element) {
    var data = new Base($element);

    $scope.$watch("world", function() {
      if ($scope.world)
        initScene($scope.world);
    });

    function initScene(world) {
      var base = data;
      var geometry = new THREE.BoxGeometry(1, 1, 1);
      var scene = base.scene;

      // soft white light
      var light = new THREE.AmbientLight(0x202020);
      scene.add(light);

      // White directional light at half intensity shining from the top.
      var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
      directionalLight.position.set(1, 0, 0.7);
      scene.add(directionalLight);

      Skybox.add(scene);

      var map = world.map;

      var threeHeightMap = map.toThreeTerrain();

      Terrain.create(map, scene, threeHeightMap);

      // FIXME: load all models beforehand
      world.initScene(scene);

      render();
    }
    var lastPos = null;

    function render() {
      var base = data;
      var world = $scope.world;
      base.render({
        frameCallback: function(delta) {
          if (!world.pause) {
            _.each(world.entities, function(e) {
              if (e && e.onFrame)
                e.onFrame(delta);
            });
            $scope.$apply();
          }
        }
      });
    }
    $scope.scene = data.scene;
  });

  app.directive('gameView', function() {
    return {
      controller: 'GameView'
    };
  });
});

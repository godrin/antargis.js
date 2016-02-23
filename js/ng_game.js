define(["app2", "base", "generator", "heightmap", "level", "world", "skybox", "terrain"], function(app, Base, Generator, HeightMap, Level, World, Skybox, Terrain) {

  // game controller is the main controller used by the router doing only global things
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

  app.factory('Controls', function() {
    return {
      init:function($scope, $element) {
        var controls = $scope.controls = {
          mousedown:false,
          ox: null,
          oy: null,
          moves:0,
          containerWidth:$element.width(),
          containerHeight:$element.height(),
        };

        $element.on("mouseup", function(e) {
          controls.mousedown = false;
        });
        $element.on("mousedown", function(e) {
          _.extend(controls, {
            mousedown : true,
            ox: e.pageX,
            oy: e.pageY,
            moves: 0
          });
        });
        $element.on("click", function(e) {
          console.log("CLICK",e);
          if(controls.moves<4)
            $scope.$emit("click",e);
        });

        $element.on("mousemove", function(e) {
          e.preventDefault();
          e.stopPropagation();
          controls.moves+=1;
          if(controls.mousedown) {
            $scope.$emit("move", {dx:e.pageX-controls.ox, dy:e.pageY-controls.oy});

            ox=e.pageX;
            oy=e.pageY;
          }
          $scope.$emit("hover", {
            x:e.pageX,
            y:e.pageY, 
            rx:e.pageX/controls.containerWidth*2-1,
            ry:-e.pageY/controls.containerHeight*2+1,
          });
        });
      }
    };
  });

  app.controller('GameView', function($scope, $element, Controls) {
    var data = new Base($element);

    $scope.$on("click",function(e) {
      console.log("click",e);
    });
    $scope.$on("hover",function(e) {
      console.log("hover",e);
    });
    $scope.$on("move",function(e) {
      console.log("MVOE",e);
    });

    $scope.$on("$destroy",function() {
      data.destroy();
    });

    $scope.$watch("world", function() {
      if ($scope.world)
        initScene($scope.world);
    });

    $element.on("click",function() {
      console.log("CLICK",arguments);
    });

    // mouse handling
    Controls.init($scope,$element);

    // handle resize of window and thus resize of the canvas
    angular.element(window).on("resize",function(e) {
      var size = {
        width : $element.width(),
        height : $element.height() 
      };
      data.setSize(size);
    });

    // FIXME: make scene a separate object
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
      // FIXME: support more than one scene
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

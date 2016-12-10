define(["app2", "base", "generator", "heightmap", "level", "world", "skybox", "terrain", "pick", 'jobs'], 
  function(app, Base, Generator, HeightMap, Level, World, Skybox, Terrain, Pick, Jobs) {

    // game controller is the main controller used by the router doing only global things
    app.controller('GameController', function($scope, hotkeys, World) {
      var tomenu = function() {
        location.hash="/menu";
      };

      var selectEntity = function(id) {
        return function() {
          $scope.world.select($scope.world.entities[id-1]);
        };
      };

      var hkbind = hotkeys.bindTo($scope);

      hkbind.add({
        combo: 'q',
        description: 'Back to menu',
        callback: tomenu
      });
      _.range(0,9).forEach(function(v) {
        hkbind.add({
          combo: ''+v,
          description: 'Select entity',
          callback: selectEntity(v)
        });
      });

      var levelName;
      levelName = "tests/fetch.js";
      levelName = "tests/entities.js";
      //    levelName = "tests/hero_move.js";
      World.createWorld(64, levelName).then(function(world) {
        $scope.world = world;
      });
    });

    app.directive('ag',function() {
      return {
        controller:function($element) {
          $element.addClass("ag");
          $element.click(function(ev) {
            ev.preventDefault();
            console.log("GLCK",ev,arguments);
            return false;
          });
        }
      }
    });


    app.factory('World', function($q) {
      return {
        // FIXME: add facility to load worlds 
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

    app.factory('Controls', function() {
      return {
        init:function($scope, $element) {
          var controls = $scope.controls = {
            mousedown:false,
            ox: null,
            oy: null,
            moves:0
          };
          function setSize() {
            _.extend(controls, {
              containerWidth:$element.width(),
              containerHeight:$element.height()
            });
          }
          setSize();
          var resizer = angular.element(window).on("resize",setSize);
          $scope.$on("$destroy", function() {
            resizer.off(); 
          });

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
            var rx = e.pageX / controls.containerWidth * 2 - 1;
            var ry = - e.pageY / controls.containerHeight * 2 + 1;
            controls.moves+=1;
            if(controls.mousedown) {
              $scope.$emit("move", {dx: e.pageX-controls.ox, dy: e.pageY-controls.oy});

              controls.ox = e.pageX;
              controls.oy = e.pageY;
            }
            $scope.$emit("hover", {
              x: e.pageX,
              y: e.pageY, 
              rx: rx,
              ry: ry
            });
          });
        }
      };
    });

    app.controller('GameView', function($scope, $element, Controls) {
      var data = new Base($element);

      $scope.$on("click",function(e) {
        var world = $scope.world;
        console.log("click",e,$scope.lastPos, $scope.world, world.hoveredEntity, world.selectedEntity);
        if(world.hoveredEntity) {
          world.select(world.hoveredEntity);
        } else if(world.selectedEntity && world.selectedEntity.pushJob && world.selectedEntity.isA("hero") && world.selectedEntity.player=="human") {
          console.log("assign new move job",$scope.lastPos);
          world.selectedEntity.resetJobs();
          //          world.selectedEntity.pushJob(new Jobs.ml.Move(world.selectedEntity,lastPos));
          world.selectedEntity.pushHlJob(new Jobs.hl.Move(world.selectedEntity,$scope.lastPos));
        }
      });
      $scope.$on("hover",function(e,mouse) {
        var res=Pick.pick(mouse, data.camera, data.scene);

        if(res.length>0) {
          var entity=res[0].object.userData.entity;
          $scope.world.hover(entity);

          if(!entity) {
            $scope.lastPos=new THREE.Vector2().copy(res[0].point);
          }
        }
      });
      $scope.$on("move",function(e,d) {
        var x=data.camera.position.x;
        var y=data.camera.position.y+5;
        var h=$scope.world.map.get("rock").interpolate(x,y);
        if(!h)
          h=0;

        data.camera.position.x-=d.dx*0.03;
        data.camera.position.y+=d.dy*0.03;
        data.camera.position.z=10+h;
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

      function render() {
        var base = data;
        var world = $scope.world;
        base.render({
          // do an update of the world on each frame
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

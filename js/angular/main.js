define(['angular/levels', 
  'angular/inventory', 
  'angular/debug', 
  'angular/actions'
],
function(LevelController, InventoryController, DebugController, ActionController) {

  var gameApp = angular.module('game-app',['ngResource']);

  function Gui(world, el) {
    gameApp.controller('LevelController', LevelController);
    gameApp.controller('DebugController', DebugController);
    gameApp.controller('InventoryController', InventoryController);
    gameApp.controller('ActionController', ActionController);
    gameApp.directive('ag',function() {
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

    gameApp.controller('WorldController',function ($scope, world) {
      $scope.world = world;
    });
    gameApp.provider('world', function() {
      this.$get=function() {
        return world;
      };
    });
    if(!el)
      el=document;
    angular.element(el).ready(function() {
      angular.bootstrap(el, ['game-app']);
    });
  }

  return Gui;
});

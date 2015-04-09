define(['angular/levels','angular/inventory'],function(LevelController, InventoryController) {

  var gameApp = angular.module('game-app',['ngResource']);
  gameApp.controller('LevelController', LevelController);
  gameApp.controller('InventoryController', InventoryController);

  function Gui(world, el) {
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

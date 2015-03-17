define(['angular/levels','angular/inventory'],function(LevelController, InventoryController) {

  var gameApp = angular.module('game-app',['ngResource']);
  gameApp.controller('LevelController', LevelController);
  gameApp.controller('InventoryController', InventoryController);

  angular.element(document).ready(function() {
    angular.bootstrap(document, ['game-app']);
  });

  return gameApp;
});

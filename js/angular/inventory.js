define([],function() {

  function InventoryController($scope, world) {
    $scope.test="TEST";
    world.$scope=$scope;
    $scope.world = world;
  }

  return InventoryController;
});

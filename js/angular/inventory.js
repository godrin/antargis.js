define(["world"],function(world) {

  function InventoryController($scope) {
    console.log("WORLD",world);
    $scope.test="TEST";
  }

  return InventoryController;
});

define(["building"],function(Building) {

  var Level=function(scene, map) {
    this.scene=scene;
    this.map=map;
      
    new Building("fishing_hut",{x:0,y:0},scene,map);
    new Building("townhall",{x:3,y:3},scene,map);
    new Building("well",{x:5,y:3},scene,map);
    new Building("mill",{x:5,y:8},scene,map);
  };

  return Level;

});

define(["entity"],function(Entity) {

  var Level=function(scene, map) {
    this.scene=scene;
    this.map=map;
      
    new Entity("fishing_hut",{x:20,y:0},scene,map);
    new Entity("townhall",{x:3,y:3},scene,map);
    new Entity("well",{x:5,y:3},scene,map);
    new Entity("well",{x:8,y:3},scene,map);
    new Entity("tower",{x:5,y:8},scene,map);
    new Entity("hero",{x:7,y:8},scene,map);
    new Entity("man",{x:0,y:0},scene,map);
    new Entity("man",{x:3,y:0},scene,map);
  };

  return Level;

});

define(["entity"],function(Entity) {

  var def=[
    {type:"big_stone",pos:{x:10,y:6}},
    {type:"fir",pos:{x:20,y:3}},
    {type:"fishing_hut",pos:{x:20,y:0}},
    {type:"fishing_hut",pos:{x:20,y:0}},
    {type:"townhall",pos:{x:9,y:3}},
    {type:"well",pos:{x:5,y:3}},
    {type:"tower",pos:{x:5,y:8}},
    {type:"hero",pos:{x:7,y:8}},
    {type:"man",pos:{x:0,y:0}},
//    {type:"man",pos:{x:3,y:0}}
  ];

  var Level=function(scene, map, world) {
    this.scene=scene;
    this.map=map;

    _.each(def,function(entityDef) {
      console.log(entityDef);
      var entity=new Entity(entityDef.type,entityDef.pos,scene,map);
      entity.world=world;
      world.push(entity);
    });
  };

  return Level;
});

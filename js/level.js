define(["entity"],function(Entity) {
  var Level=function(def, scene, map, world) {
    console.log("DEF",def, typeof(def));
    this.scene=scene;
    this.map=map;

    _.each(def,function(entityDef) {
      console.log(entityDef);
      var entity=new Entity(scene,map, entityDef);
      entity.world=world;
      world.push(entity);
    });
  };

  return {
    Level:Level,
    load:function(file,scene,map,world,callback) {
      $.get("levels/"+file,function(def) {
        def=eval(def);
        callback(new Level(def,scene,map,world));
      });
    }
  }

  return Level;
});

define(["entity"],function(Entity) {
  var Level=function(def, map, world) {
    this.map=map;

    _.each(def,function(entityDef) {
      console.debug("Level: create new entity from ",entityDef);
      var entity=new Entity(map, entityDef);
      entity.world = world;
      world.push(entity);
    });
    _.each(world.entities,function(e) { e.postLoad(); });
  };

  return {
    Level:Level,
    load:function(file, map, world, callback) {
      $.get("levels/"+file,function(def) {
        def=eval(def);
        callback(new Level(def, map, world));
      });
    }
  }

  return Level;
});

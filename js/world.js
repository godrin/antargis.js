define([], function() {
  var World = function(map) {
    this.map = map;
    this.entities = [];
    this.entitiesByType = {};
    if (!window.World)
      window.World = this;
  };
  World.prototype.push = function(entity) {
  var self = this;
    this.entities.push(entity);
    if(!entity.mixinNames)
      console.warn("No mixins for ",entity);
    else {
      entity.mixinNames.forEach(function(name) {
        if(!self.entitiesByType[name])
          self.entitiesByType[name]=[];
        self.entitiesByType[name].push(entity);
      });
    }
  };
  World.prototype.search = function(param, origin) {
    var self = this;
    return _.chain(self.entities).filter(function(e) {
      if (param instanceof Function) {
        return param(e);
      } else {
        for (var name in param) {
          var val = param[name];
          if (val instanceof Object) {
            console.log("OBJ", val);
          } else {
            if (e[name] instanceof Array) {
              if (!_.contains(e[name], val))
                return false;
            } else if (e[name] instanceof Object) {
              if (!e[name][val])
                return false;
            } else if (e[name] != val)
              return false;
          }
        }
      }
      return true;
    }).sortBy(function(e) {
      if (origin instanceof THREE.Vector3)
        return e.pos.distanceTo(origin);
      return 1;
    }).value();
  };

  World.prototype.initScene = function(scene) {
    _.each(this.entities, function(e) {
      e.setScene(scene);
    });
  };

  World.prototype.hover = function(entity) {
    if (this.hoveredEntity)
      this.hoveredEntity.hovered(false);

    this.hoveredEntity = entity;
    if (this.hoveredEntity) {
      this.hoveredEntity.hovered(true);
    }
  };
  World.prototype.select = function(entity) {
    if (this.selectedEntity)
      this.selectedEntity.selected(false);
    this.selectedEntity = entity;
    if (this.selectedEntity)
      this.selectedEntity.selected(true);
  };

  World.prototype.getSelectedHero = function() {
    if (!this.selectedHero) {
      this.selectedHero = this.search({player:"human"})[0];
    }
    return this.selectedHero;
  };

  return World;
});

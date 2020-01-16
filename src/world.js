import { Vector3 } from 'three'
import _ from 'lodash'

class World {
  constructor(map) {
    this.map = map;
    this.entities = [];
    this.entitiesByType = {};
    if (!window.World)
      window.World = this;
  }

  push(entity) {
    this.entities.push(entity);
    if (!entity.mixinNames)
      console.warn("No mixins for ", entity);
    else {
      entity.mixinNames.forEach(function (name) {
        if (!this.entitiesByType[name])
          this.entitiesByType[name] = [];
        this.entitiesByType[name].push(entity);
      });
    }
  }

  search(param, origin) {
    return _.chain(this.entities).filter(function (e) {
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
    }).sortBy(function (e) {
      if (origin instanceof Vector3)
        return e.pos.distanceTo(origin);
      return 1;
    }).value();
  }

  initScene(scene) {
    _.each(this.entities, function (e) {
      e.setScene(scene);
    });
  }

  hover(entity) {
    if (this.hoveredEntity)
      this.hoveredEntity.hovered(false);

    this.hoveredEntity = entity;
    if (this.hoveredEntity) {
      this.hoveredEntity.hovered(true);
    }
  }

  select(entity) {
    if (this.selectedEntity)
      this.selectedEntity.selected(false);
    this.selectedEntity = entity;
    if (this.selectedEntity)
      this.selectedEntity.selected(true);
  }

  getSelectedHero() {
    if (!this.selectedHero) {
      this.selectedHero = this.search({player: "human"})[0];
    }
    return this.selectedHero;
  }
}
export default World;
import { Entity } from './entity'
import ModelLoader from '../base3d/model_loader'
import * as Mixin from "./mixin"
import EntityTypes from '../config/entities'


class WorldLoader {
  load(world, data, ops) {
    let basicOps = Object.assign({}, ops);

    if (!basicOps.modelLoader) {
      basicOps.modelLoader = new ModelLoader();
    }
    if (!basicOps.mixinDefs) {
      console.log("MIXIN DEFS", Mixin)
      basicOps.mixinDefs = Mixin;
    }
    if (!basicOps.entityTypes) {
      basicOps.entityTypes = EntityTypes;
    }

    data.forEach(entityDefinition =>
      world.push(new Entity(world.map, Object.assign({}, basicOps, entityDefinition)))
    );
    world.entities.forEach(entity => entity.postLoad && entity.postLoad())
  }
}

export default WorldLoader

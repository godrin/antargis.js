import Entity from './entity'
import Models from '../base3d/models'

class WorldLoader {
    static load(world, data) {
        const models = new Models()

        data.forEach(entityDefinition=>
            world.push(new Entity(world.map, entityDefinition, models))
        )
        console.log("WORLD", world)
        world.entities.forEach(entity=>entity.postLoad())
    }
}

export default WorldLoader
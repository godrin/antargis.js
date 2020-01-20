import Entity from './entity'

class WorldLoader {
    static load(world, data) {
        data.forEach(entityDefinition=>
            world.push(new Entity(world.map, entityDefinition))
        )
    }
}

export default WorldLoader
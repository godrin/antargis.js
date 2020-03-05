


class AntScene {
    constructor(threeScene) {
        this._threeScene = threeScene
        this.meshes = {}
        this.entities = []
    }
    tick() {
        //console.log("TICK")
    }
    add(node) {
    //    this.entities.push(entity)

        console.log("ADD",node)
        this._threeScene.add(node)
    }

}

export default AntScene
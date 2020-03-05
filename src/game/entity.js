import EntityTypes from '../config/entities'

//FIXME
const Mixins = {};

var uid = 11110;

class Entity {
    constructor(heightmap, ops, models) {
        var entity = EntityTypes[ops.type];
        if (!entity) {
            console.warn("Entity: No Entity-Type named " + ops.type + " found!");
            entity = {};
        }

        _.extend(this, entity);
        _.extend(this, ops);
        // FIXME: reduce complexity and references by removing models, map and so ???
        this.models = models;
        this.state = {};
        this.typeName = this.type;
        this.uid = uid++;
        this.map = heightmap;
        // clone
        this.resources = _.extend({}, this.resources);
        this.type = entity;
        if (!this.meshName)
            this.meshName = "default";

        if (entity.mixins) {
            this.mixins = {};
            this.mixinNames = [];
            this.mixinDef = entity.mixins;
            entity.mixins.forEach(mixin => {
                var found = Mixins[mixin];
                if (found) {
                    this.mixins[mixin] = found;
                    this.mixinNames.push(mixin);
                    _.extend(this, found);
                } else {
                    console.log("Mixin not found", mixin)
                }
            });
        }
    };

    getId() {
        return this.uid
    }

    postLoad() {
        _.each(this.mixins, mixin => {
            if (mixin.postLoad) {
                mixin.postLoad.apply(this, []);
            }
        });
        console.log("MESHES", this)
    };

    isA(mixin) {
        return this.mixinDef.indexOf(mixin) >= 0;
    }

    setScene(scene) {
        console.log("Entity", this, "setScene", this.scene, "mesh:", this.meshName);
        this.scene = scene;
        this.setMesh(this.meshName);
    };

    updateMeshPos() {
        if (this.mesh) {
            if (this.mesh && this.mesh.rotation && this.rotation)
                this.mesh.rotation.z = this.rotation;
            this.mesh.setPos(this.pos.x, this.map.get("rock").interpolate(this.pos.x, this.pos.y), -this.pos.y);
        }
    };

    setMesh(name) {

        if (!name)
            name = this.meshName;

        var entity = this.type;
        var meshType;
        var animation;
        this.meshName = name;

        if (entity.meshes) {
            var def = entity.meshes[name];
            if (!def)
                console.warn("No Mesh of name '" + name + "' found in entity-def", entity);
            meshType = def.mesh;
            animation = def.animation;
        } else if (entity.mesh)
            meshType = entity.mesh;
        else
            meshType = this.typeName;

        this.meshType = meshType;
        this.animation = animation;

        this.models.load(meshType, animation).then((mesh) => {
            console.log("MODEL loaded", mesh, meshType, animation, this.scene);
            mesh.attachToScene(this.scene);
            //, this, self.scene, (mesh) => {

            if (this.mesh) {
                this.mesh.remove();
            }
            this.mesh = mesh;
            mesh.setEntity(this);
            this.updateMeshPos();
            if (this.animationFinished) {
                this.mesh.animationFinished = this.animationFinished.bind(this);
            }
            this.mesh.hovered(this.state.hovered);
            this.mesh.selected(this.state.selected);
        });
    };

    hovered(val) {
        return this.mesh.hovered(this.state.hovered = val);
    };

    selected(val) {
        return this.mesh.selected(this.state.selected = val);
    };

    increaseBy(what, amount) {
        this.resources[what] = (this.resources[what] || 0) + amount;
    };

    take(what, amount) {
        if (this.resources[what] >= amount) {
            this.resources[what] -= amount;
            return true;
        }
        return false;
    };

    give(what, amount, toEntity) {
        if (this.resources[what] >= amount) {
            this.resources[what] -= amount;
            console.debug("GIVE TO", toEntity, what);
            toEntity.resources[what] = (toEntity.resources[what] || 0) + amount;
            return true;
        }
        return false;
    }
}

export default Entity
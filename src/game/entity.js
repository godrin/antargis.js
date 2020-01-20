import EntityTypes from '../config/entities'
import Meshes from '../config/meshes'
import _ from 'lodash'

//FIXME
const Mixins = {};

var uid = 11110;

class Entity {
    constructor(heightmap, ops) {
        var entity = EntityTypes[ops.type];
        if (!entity) {
            console.warn("Entity: No Entity-Type named " + ops.type + " found!");
            entity = {};
        }

        _.extend(this, entity);
        _.extend(this, ops);
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

    postLoad() {
        this.mixins.each(mixin => {
            if (mixin.postLoad) {
                mixin.postLoad.apply(this, []);
            }
        })
    };

    isA(mixin) {
        return this.mixinDef.indexOf(mixin) >= 0;
    }

    setScene(scene) {
        this.scene = scene;
        this.setMesh(this.meshName);
    };

    updateMeshPos() {
        if (this.mesh) {
            if (this.mesh && this.mesh.rotation && this.rotation)
                this.mesh.rotation.z = this.rotation;
            this.mesh.setPos(this.pos.x, this.pos.y, this.map.get("rock").interpolate(this.pos.x, this.pos.y));
        }
    };

    setMesh(name) {

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

        Models.load(meshType, animation, this, self.scene, (mesh) => {
            if (this.mesh) {
                this.mesh.remove();
            }
            if (mesh.type == self.meshType && mesh.animation == self.animation) {
                this.mesh = mesh;
                mesh.setEntity(self);
                this.updateMeshPos();
                if (this.animationFinished)
                    this.mesh.animationFinished = self.animationFinished.bind(this);
                this.mesh.hovered(self.state.hovered);
                this.mesh.selected(self.state.selected);
            } else {
                mesh.remove();
            }
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
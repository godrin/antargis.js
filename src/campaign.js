import World from './world'
import HeightMap from './game/heightmap'
import Base from "./base3d/base";
import * as THREE from "three";
import addSkybox from "./base3d/skybox";
import TerrainBuilder from "./terrain_builder";
import _ from "lodash";

class AgGameView extends HTMLElement {
    connectedCallback() {
        this.setupThree();

        this.setupWorld(new World(new HeightMap()))


        console.log("AgGameView connected");

        window.addEventListener("resize", this.updateSize.bind(this));
        window.addEventListener("mousedown", this.mousedown.bind(this));
        window.addEventListener("mouseup", this.mouseup.bind(this));
        window.addEventListener("mousemove", this.mousemove.bind(this));
        window.addEventListener("click", this.click.bind(this));
        document.addEventListener("keydown", this.keydown.bind(this));

        this.moves = 0;
        this.updateSize({target: window})
        this.base.render({})
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.updateSize.bind(this));
        window.removeEventListener("mousedown", this.mousedown.bind(this));
        window.removeEventListener("mouseup", this.mouseup.bind(this));
        window.removeEventListener("mousemove", this.mousemove.bind(this));
        window.removeEventListener("click", this.click.bind(this));
        document.removeEventListener("keydown", this.keydown.bind(this));
    }

    setupThree() {
        this.base = new Base(this);
        this.scene = this.base.scene;

        // soft white light
        var light = new THREE.AmbientLight(0x202020);
        this.scene.add(light);

        // White directional light at half intensity shining from the top.
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(1, 0, 0.7);
        this.scene.add(directionalLight);

        addSkybox(this.scene);
    }

    setupWorld(world) {
        this.world = world
        const map = world.map;

        const threeHeightMap = map.toThreeTerrain();

        TerrainBuilder.create(map, this.scene, threeHeightMap);

        // FIXME: load all models beforehand
        world.initScene(this.scene);
    }

    tick(delta) {
        if (!world.pause) {
            _.each(world.entities, function (e) {
                if (e && e.onFrame)
                    e.onFrame(delta);
            });
            // $apply hook
        }
    }


    updateSize(ev) {
        console.log("resize", ev);
        this.base.setSize({});
        this.containerWidth = ev.target.innerWidth;
        this.containerHeight = ev.target.innerHeight
    }

    mouseup(e) {
        this.mouseisdown = false;
    }

    mousedown(e) {
        this.mouseisdown = true;
        this.ox = e.pageX;
        this.oy = e.pageY;
        this.moves = 0;
    }

    click(e) {
        console.log("CLICK", e);
        const world = this.world;
        if (world.hoveredEntity) {
            world.select(world.hoveredEntity);
        } else if (world.selectedEntity && world.selectedEntity.pushJob && world.selectedEntity.isA("hero") && world.selectedEntity.player == "human") {
            console.log("assign new move job");
            world.selectedEntity.resetJobs();
//          world.selectedEntity.pushJob(new Jobs.ml.Move(world.selectedEntity,lastPos));
            world.selectedEntity.pushHlJob(new Jobs.hl.Move(world.selectedEntity, lastPos));
        }
    }

    mousemove(e) {
        e.preventDefault();
        e.stopPropagation();
        this.moves += 1;
        if (this.mouseisdown) {
            this.move({dx: e.pageX - this.ox, dy: e.pageY - this.oy});
            this.ox = e.pageX;
            this.oy = e.pageY;
        }
        this.hover({
            x: e.pageX,
            y: e.pageY,
            rx: e.pageX / this.containerWidth * 2 - 1,
            ry: -e.pageY / this.containerHeight * 2 + 1,
        });
    }

    hover(rect) {
        console.log("hover", rect);
        var res = Pick.pick(mouse, base.camera, base.scene);

        if (res.length > 0) {
            var entity = res[0].object.userData.entity;
            world.hover(entity);

            if (!entity) {
                lastPos = new THREE.Vector2().copy(res[0].point);
            }
        }
    }

    move(d) {
        console.log("MOVE", d);
        var base = this.base;
        var x = base.camera.position.x;
        var y = base.camera.position.y + 5;
        var h = map.get("rock").interpolate(x, y);
        if (!h)
            h = 0;

        base.camera.position.x -= d.dx * 0.03;
        base.camera.position.y += d.dy * 0.03;
        base.camera.position.z = 10 + h;
    }

    keydown(e) {
        console.log("KEYdown", e);
        if (e.keyCode == 27) {
            world.select(null);
        }
    }
}


if (!customElements.get('ag-game-view')) {
    customElements.define('ag-game-view', AgGameView);
}

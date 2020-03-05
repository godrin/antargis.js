import Base from "../base3d/base";
import addSkybox from "../base3d/skybox";
import TerrainBuilder from "../terrain_builder";
import Pick from '../base3d/pick'
import AntScene from "../base3d/ant-scene";

class AgGameView extends HTMLElement {
    connectedCallback() {
        this.setupThree();

        console.log("AgGameView connected");

        window.addEventListener("resize", this.updateSize.bind(this));
        this.addEventListener("mousedown", this.mousedown.bind(this));
        this.addEventListener("mouseup", this.mouseup.bind(this));
        this.addEventListener("mousemove", this.mousemove.bind(this));
        this.addEventListener("wheel", this.wheel.bind(this));
        this.addEventListener("click", this.click.bind(this));
        this.addEventListener("world",this.worldCreated.bind(this));
        document.addEventListener("keydown", this.keydown.bind(this));
        document.addEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this));

        this.viewCenter = {x: 0, y: 0, z: 10};

        this.moves = 0;
        this.updateSize({target: window});
        this.base.render({frameCallback: this.frameCallback.bind(this)})
    }

    frameCallback(e) {
        this.antScene.tick()
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.updateSize.bind(this));
        this.removeEventListener("mousedown", this.mousedown.bind(this));
        this.removeEventListener("mouseup", this.mouseup.bind(this));
        this.removeEventListener("mousemove", this.mousemove.bind(this));
        this.removeEventListener("wheel", this.wheel.bind(this));
        this.removeEventListener("click", this.click.bind(this));
        this.removeEventListener("world",this.worldCreated.bind(this));
        document.removeEventListener("keydown", this.keydown.bind(this));
        document.removeEventListener(this.getVisibilityChangeEvent().visibilityChange, this.visibilityChange.bind(this))
    }

    worldCreated(e) {
        console.log("==== WORLD CREATED")
        this.world = e.world;
        const map = this.world.map;

        const threeHeightMap = map.toThreeTerrain();

        TerrainBuilder.create(map, this.scene, threeHeightMap);

        // FIXME: load all models beforehand
        this.world.initScene(this.antScene);
    }

    getVisibilityChangeEvent() {
        var hidden, visibilityChange;
        if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        } else if (typeof document.msHidden !== "undefined") {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
        } else if (typeof document.webkitHidden !== "undefined") {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }
        return {visibilityChange, hidden};
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

        this.antScene = new AntScene(this.scene)
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

    visibilityChange(ev) {
        if(ev.target[this.getVisibilityChangeEvent().hidden]) {
            // hidden
        } else {
            // visible
        }
    }

    updateSize(ev) {
        this.base.setSize({});
        this.containerWidth = ev.target.innerWidth;
        this.containerHeight = ev.target.innerHeight
    }

    mouseup(e) {
        console.log("mouseup", e);
        this.mouseisdown = false;
    }

    mousedown(e) {
        this.mouseisdown = true;
        this.ox = e.pageX;
        this.oy = e.pageY;
        this.moves = 0;
    }

    wheel(e) {
        this.viewCenter.z += e.deltaY * 0.1;
        if (this.viewCenter.z < 5) {
            this.viewCenter.z = 5
        }
        this.updateCamera()
    }

    click(e) {
        //FIXME: move to world
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
        console.log("SCENE", this.scene)
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

    hover(mouse) {
        var res = Pick.pick(mouse, this.base.camera, this.base.scene);

        if (res.length > 0) {
            let entity = res[0].object.userData.entity;
            if(!entity) {
                entity = res[0].object.parent.userData.entity;
            }
            this.world.hover(entity);

            if (!entity) {
                this.lastPos = new THREE.Vector2().copy(res[0].point);
            }
        }
    }

    move(d) {

        this.viewCenter.x -= d.dx * 0.03;
        this.viewCenter.y += d.dy * 0.03;

        this.updateCamera()
    }

    updateCamera() {
        var base = this.base;
        // FIXME: move to world
        var h = this.world.map.get("rock").interpolate(this.viewCenter.x, this.viewCenter.y + this.viewCenter.z / 2);
        if (!h)
            h = 0;

        // FIXME: move to base
        base.camera.position.x = this.viewCenter.x;
        base.camera.position.y = this.viewCenter.y;
        base.camera.position.z = this.viewCenter.z + h;
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

import AntScene from "../base3d/ant-scene.js";
import TerrainBuilder from "../libs/terrain_builder.js";

class SceneEvent extends Event {
  constructor(scene) {
    super("scene");
    this.scene = scene
  }
}

class AgScene extends HTMLElement {
  connectedCallback() {
    this.addEventListener("world", this._worldCreatedListener = this.worldCreated.bind(this));
  }

  disconnectedCallback() {
    this.removeEventListener("world", this._worldCreatedListener);
  }

  _inform() {
    this.querySelectorAll("*[inject-scene]").forEach(e =>
      e.dispatchEvent(new SceneEvent(this.scene)))
  }

  async worldCreated(e) {
    this.world = e.world;
    await this.initScene();
    this._inform();
  }

  async initScene() {
    this.scene = new AntScene();
    const map = this.world.map;

    const threeHeightMap = map.toThreeTerrain();

    TerrainBuilder.create(map, this.scene, threeHeightMap);

    // FIXME: load all models beforehand
    await this.world.initScene(this.scene);
  }
}

if (!customElements.get('ag-scene')) {
  customElements.define('ag-scene', AgScene);
}


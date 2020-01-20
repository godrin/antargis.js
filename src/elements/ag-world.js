import World from "../game/world";
import HeightMap from "../game/heightmap";
import ajax from "../ajax"
import WorldLoader from "../game/world-loader"

class WorldEvent extends Event {
    constructor(world) {
        super("world");
        this.world = world
    }
}

class AgWorld extends HTMLElement {
    connectedCallback() {
        this.map = new HeightMap();
        this.world = new World(this.map);

        if (this.getAttribute("load")) {
            this.loadWorld(this.getAttribute("load"))
        }


        document[this.exposeName] = this.world;

        setTimeout(() =>
            this.querySelectorAll("*[world-accessor]").forEach(e =>
                e.dispatchEvent(new WorldEvent(this.world)))
        )
    }

    disconnectedCallback() {
        delete document[this.exposeName]
    }

    loadWorld(url) {
        ajax(url).then(data =>
            WorldLoader.load(this.world, data)
        )
    }
}

if (!customElements.get('ag-world')) {
    customElements.define('ag-world', AgWorld);
}


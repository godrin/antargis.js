class AgEntityView extends HTMLElement {
    connectedCallback() {
        this.template = this.innerHTML;

        this.addEventListener("world", this.worldCreated.bind(this));
    }

    disconnectedCallback() {
        this.removeEventListener("world", this.worldCreated.bind(this));
        if (this.listener) {
            this.listener.remove()
        }
    }

    worldCreated(ev) {
        this.world = ev.world;
        const eventname = this.getAttribute("event") === "hovered" ? "hovered" : "selected";
        this.eventname = eventname;
        this.listener = this.world[eventname].subscribe(this.changed.bind(this))
    }

    changed(entity) {
        if (this.eventname == "selected") {
            console.log("ENTITY VIEW selected", entity, this);
        }
        if (this.entity != entity) {
            this.entity = entity;
            this.redraw()
        }
    }

    redraw() {
        this.innerHTML = eval('`' + this.template + '`');
    }
}

if (!customElements.get('ag-entity-view')) {
    customElements.define('ag-entity-view', AgEntityView);
}


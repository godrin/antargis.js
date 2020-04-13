import {HLRestJob} from "../game/hl/rest";

class AgEntityView extends HTMLElement {
  connectedCallback() {
    this.template = this.innerHTML;
    this.changed(null);

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
    if (this.entity !== entity) {
      this.entity = entity;
      if (this.entity) {
        this.redraw()
      }
    }
    if (this.entity) {
      this.style.display = "";
    } else {
      this.style.display = "none";
    }
  }

  redraw() {
    this.innerHTML = mustache.render(this.template, this.entity);
    const buttonRest = this.getElementsByClassName("button-rest")[0];
    if (buttonRest) {
      buttonRest.addEventListener("click", this.rest.bind(this))
    }
  }

  rest() {
    this.entity.resetJobs();
    this.entity.pushJob(new HLRestJob(this.entity, 0, false));
    console.log("REST")
  }
}

if (!customElements.get('ag-entity-view')) {
  customElements.define('ag-entity-view', AgEntityView);
}


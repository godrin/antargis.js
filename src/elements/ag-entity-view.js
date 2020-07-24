import {HLRestJob} from "../game/hl/rest";

class AgEntityView extends HTMLElement {
	static presentEntity(entity) {
		return {
			typeName: entity.typeName,
			pos: {
				x: entity.pos.x,
				y: entity.pos.y
			},
			resources: AgEntityView.presentResources(entity.resources)
		};
	}

	static presentResources(resources) {
		const result = [];
		for (var key in resources) {
			result.push({name: key, value: resources[key]});
		}
		return result;
	}

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
		if (this.redrawer) {
			this.redrawer.remove()
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
			this.stopListening(this.entity);

			this.entity = entity;
			if (this.entity) {
				this.redraw()
			}
			this.startListening(this.entity)
		}
		if (this.entity) {
			this.style.display = "";
		} else {
			this.style.display = "none";
		}
	}

	redraw() {
		this.innerHTML = mustache.render(this.template, AgEntityView.presentEntity(this.entity));
		const buttonRest = this.getElementsByClassName("button-rest")[0];
		if (buttonRest) {
			buttonRest.addEventListener("click", this.rest.bind(this))
		}
		this.classList.remove("templated")
	}

	rest() {
		this.entity.resetJobs();
		this.entity.pushJob(new HLRestJob(this.entity, 0, false));
		console.log("REST")
	}

	startListening(entity) {
		console.log("START", entity)
		if(entity) {
			this.redrawer = entity.changed.subscribe( this.redraw.bind(this));
		}
	}

	stopListening(entity) {
		if(this.redrawer) {
			this.redrawer.remove();
			this.redrawer = null;
		}
	}
}

if (!customElements.get('ag-entity-view')) {
	customElements.define('ag-entity-view', AgEntityView);
}


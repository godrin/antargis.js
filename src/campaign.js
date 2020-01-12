import '../campaign.scss'

class AgGameView extends HTMLElement {
    connectedCallback() {

    }

    disconnectedCallback() {

    }
}


if (!customElements.get('ag-game-view')) {
    customElements.define('ag-game-view', AgGameView);
}

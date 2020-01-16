class Credits extends HTMLElement {
    connectedCallback() {

        this.handler = this.finished.bind(this)

        this.scrollTarget = this.querySelector(".credits")
        console.log("BIND...")

        this.scrollTarget.addEventListener('webkitAnimationIteration', this.handler);
        this.scrollTarget.addEventListener('animationIteration', this.handler)
    }

    disconnectedCallback() {
        this.scrollTarget.removeEventListener('webkitAnimationIteration', this.handler);
        this.scrollTarget.removeEventListener('animationIteration', this.handler)
    }


    finished(ev) {
        console.log("FINISHED")
        try {
            eval(this.getAttribute('onfinished'))
        } catch (e) {
            console.log("Error", e);
        }
    }
}

if (!customElements.get('ag-credits')) {
    customElements.define('ag-credits', Credits);
}

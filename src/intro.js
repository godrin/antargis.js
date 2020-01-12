import '../intro.scss';

class Intro extends HTMLElement {
    connectedCallback() {
        this.current_screen = -1;
        this.screens = this.querySelectorAll("intro-screen");
        this.nextScreenHandler = this.nextScreen.bind(this)
        this.nextScreen()
    }

    isconnectedCallback() {
        this.unbindEvent(this.screens[this.current_screen])
    }

    bindEvent(screen) {
        if(screen) {
            screen.addEventListener('webkitAnimationIteration', this.nextScreenHandler);
            screen.addEventListener('animationIteration', this.nextScreenHandler)
        }
    }

    unbindEvent(screen) {
        if(screen) {
            screen.removeEventListener('webkitAnimationIteration', this.nextScreenHandler);
            screen.removeEventListener('animationIteration', this.nextScreenHandler)
        }
    }

    nextScreen(ev) {
        this.unbindEvent(this.screens[this.current_screen])
        if(this.current_screen == this.screens.length-1) {
            this.dispatchEvent(new Event('finished'))
            try {
                eval(this.getAttribute('onfinished'))
            } catch(e) {
                console.log("Error",e);
            }
        }
        this.current_screen = (this.current_screen + 1) % this.screens.length;
        this.bindEvent(this.screens[this.current_screen])
        this.setVisibility()
    }

    setVisibility() {
        this.screens.forEach((screen, idx) => {
            if (this.current_screen == idx) {
                screen.classList.add("active")
            } else {
                screen.classList.remove("active")
            }
        })
    }
}

if (!customElements.get('ag-intro')) {
    customElements.define('ag-intro', Intro);
}

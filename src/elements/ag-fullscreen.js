class AgFullscreen extends HTMLElement {
  connectedCallback() {
    this.addEventListener("click",this.enableFullscreen.bind(this))
  }

  enableFullscreen() {
    let element = document.querySelector("body");
    if(element.requestFullscreen) {
      element.requestFullscreen();
    } else if(element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if(element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }
}

if (!customElements.get('ag-fullscreen')) {
  customElements.define('ag-fullscreen', AgFullscreen);
}

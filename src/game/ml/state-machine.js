class StateMachineException extends Error {
  constructor(message) {
    super(message);
  }
}

class StateMachine {
  constructor(startState) {
    this.mode = startState;
    this.ready = false;
  }

  setFinished() {
    this.ready = true;
  }

  onFrame(delta) {
    let done = false;
    do {
      if (!(this[this.mode] instanceof Function)) {
        throw new StateMachineException("MODE " + this.mode + " not found for class "+typeof(this));
      }
      done = this[this.mode](delta);
      console.log("DONE", done, this.mode, this);
    } while (!done && !this.ready);
    return 0; // always eat up the delta
  }
}

export {StateMachine}

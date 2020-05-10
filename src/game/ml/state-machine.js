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
    var done = false;
    do {
      if (!(this[this.mode] instanceof Function)) {
        throw new StateMachineException("MODE " + this.mode + "not found");
      }
      done = this[this.mode]();
      console.log("DONE",done, this.mode)
    } while (!done && !this.ready);
    return delta;
  }
}

export { StateMachine}

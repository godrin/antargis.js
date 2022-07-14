import {Vector2} from "../vector2.js";
import {Base} from './base.js'

class Null extends Base {
  constructor() {
    super();
  }

  computeRelativePos(boss, i) {
    return new Vector2(0, 0);
  }

  getDir(boss, e) {
    return 0;
  }
}

export {Null}

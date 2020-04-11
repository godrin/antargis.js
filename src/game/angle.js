class Angle {
  static fromVector2(dir) {
    return -Math.atan2(dir.x, dir.y) + Math.PI;
  }
}

export {Angle}

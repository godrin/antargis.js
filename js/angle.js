define([], function() {
  return {
    fromVector2: function(dir) {
      return -Math.atan2(dir.x, dir.y) + Math.PI;
    }
  };
});

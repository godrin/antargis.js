define(["formations/base"],function(Base) {

  var nullForm=function() {
    Base.apply(this,arguments);
  };
  nullForm.prototype=Object.create(Base.prototype);
  nullForm.prototype.computeRelativePos=function(boss,i) {
    return new THREE.Vector2(0,0);
  };
  nullForm.prototype.getDir = function(boss,e) {
    return 0;
  };

  return nullForm;
});


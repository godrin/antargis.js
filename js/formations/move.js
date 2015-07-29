define(["formations/base"],function(Base) {

  var moveForm=function(angle) {
    Base.apply(this,arguments);
    this.angle = angle;
  };
  moveForm.prototype=Object.create(Base.prototype);
  moveForm.prototype.computeRelativePos=function(boss,i) {
    if(i>=2)
      i+=1;

    var row = Math.floor(i/5);
    var col = i%5;
    var block = Math.floor(i/25);

    var x = col - 2;
    var y = row + block;

    var angle = this.angle;
    var d = 0.8;

    return new THREE.Vector2(d * Math.cos(angle) * x - d * Math.sin(angle) * y, 
    d * Math.sin(angle) * x + d * Math.cos(angle) * y );
  };
  moveForm.prototype.getDir = function(boss,e) {
    return this.angle;
  };

  return moveForm;
});
//

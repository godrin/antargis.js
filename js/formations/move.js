define(["formations/base"],function(Base) {

  var moveForm=function() {
    Base.apply(this,arguments);
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

    var angle = boss.rotation;

    return new THREE.Vector2(Math.sin(angle) * y + Math.cos(angle)* x, 
    Math.cos(angle) * y + Math.sin(angle) * x);
  };
  moveForm.prototype.getDir = function(boss,e) {
    return boss.rotation;
  };

  return moveForm;
});
//

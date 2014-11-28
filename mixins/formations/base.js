define([],function() {
  var Base=function() {
  };

  Base.prototype.sort=function(followers) {
    return followers;
  };

  Base.prototype.computeRelativePos=function(boss,i) {
    var row=Math.floor(i/5);
    var col=i%5;
    var d=0.8;

    return new THREE.Vector2(col*d-d*2,row*d);
  };

  Base.prototype.computePos=function(boss,i) {
  console.log("COMPUTE Boss",boss);
    return this.computeRelativePos(boss,i).add(boss.pos);
  };

  Base.prototype.getPos=function(boss,follower) {
    var followers=this.sort(boss.followers);

    var i=_.indexOf(followers,follower);
    console.log("GETPOS");
    return this.computePos(boss,i);
  };

  return Base;

});

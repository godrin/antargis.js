define([],function() {
  var Base=function() {
    this.formCache={};
    this.formSize=-1;
  };

  Base.prototype.sort=function(followers) {
    return followers;
  };

  Base.prototype.computeRelativePosCached=function(boss,i) {
    if(this.formSize!=boss.followers.length) {
      this.formSize=boss.followers.length;
      this.formCache={};
    }
    if(!this.formCache[i])
      this.formCache[i]=this.computeRelativePos(boss,i);
    return this.formCache[i];
  };
  Base.prototype.computeRelativePos=function(boss,i) {
    if(i>1)
      i+=1;

    var row=Math.floor(i/5);
    var col=i%5;
    var d=0.8;

    return new THREE.Vector2(col*d-d*2,row*d);
  };

  Base.prototype.computePos=function(boss, i, basePos) {
    return new THREE.Vector2().addVectors(this.computeRelativePosCached(boss,i), basePos);
  };

  Base.prototype.getPos=function(boss, follower, basePos) {

    if(!basePos)
      basePos = boss.pos;

    if(boss == follower)
      return new THREE.Vector2().copy(basePos);

    var followers=this.sort(boss.followers);

    var i=_.indexOf(followers,follower);
    return this.computePos(boss, i, basePos);
  };

  return Base;
});

define(["mixins/formations/base.js"],function(Base) {

  var lines=[10,14,20,40,100];

  var restForm=function() {
    Base.apply(this,arguments);
  };
  restForm.prototype=Object.create(Base.prototype);
  restForm.prototype.computeRelativePos=function(boss,i) {
    var row=null,ci=i;
    var max=0,count;
    _.find(lines,function(line,k) {
      ci-=line;
      max+=line;
      if(ci<0) {
        row=k;
        return true;
      }
      return false;
    });
    // count of segments for current circle
    count=lines[row];

    // if current circle is the widest, then only so many segments like men left
    if(boss.followers.length<max)
      count-=(max-boss.followers.length);
    var angle=(i/count)*2*Math.PI;
    var radius=(row+1)*1.4;
    return new THREE.Vector2(Math.sin(angle)*radius,Math.cos(angle)*radius);
  };

  return restForm;
});

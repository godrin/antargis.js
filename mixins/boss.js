define([],function() {
  return {
    assignMeJob:function(e) {
      if(e.pos.distanceTo(this.pos)>1)
        e.newLlJob("move",this.pos);
      else {
        console.log("NEW REST!");
        e.newLlJob("rest",5);
      }
    }
  };
});

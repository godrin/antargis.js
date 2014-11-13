define([],function() {
  return {
    assignMeJob:function(e) {
    console.log("ASSIGN ME JOB");
      if(e.pos.distanceTo(this.pos)>100)
        e.newLlJob("move",this.pos);
      else {
        console.log("NEW REST!");
        e.newMlJob("rest",5);
      }
    }
  };
});

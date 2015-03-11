define([],function() {
  return {
    smokeCounter:0,
    incSmoke:function() {
      this.smokeCounter+=1;
      this.mesh.enableParticles("smoke");
    },
    decSmoke:function() {
      this.smokeCounter-=1;
      if(this.smokeCounter<1)
        this.mesh.disableParticles("smoke");
    }
  };
});


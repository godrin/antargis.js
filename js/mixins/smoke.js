define([],function() {
  return {
    smokeCounter:0,
    incSmoke:function() {
      this.smokeCounter+=1;
      console.log("smoke - inc",this.smokeCounter);
      this.mesh.enableParticles("smoke");
    },
    decSmoke:function() {
      this.smokeCounter-=1;
      console.log("smoke - dec",this.smokeCounter);
      if(this.smokeCounter<1)
        this.mesh.disableParticles("smoke");
    }
  };
});


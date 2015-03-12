define(["ml"],function(ml) { 
  var HlInventJob=function(entity) {
    this.entity = entity;
  };

  function producable(e, needed) {
    var producable=_.filter(needed,function(resource) {
      if(e.production) {
        var ok=true;
        var prereq = e.production[resource];
        console.log("invent - rule",prereq,e.resources);
        if(!prereq)
          return false;
        _.each(prereq,function(amount,res) {
        
          if(!e.resources[res] || e.resources[res]<amount)
            ok=false;
        });
        if(ok)
          return true;
      }
    });
    console.log("invent - PRODUCABLE",producable);
    if(producable.length>0) {
      return _.sample(producable);
    }
    return false;
  };


  HlInventJob.prototype.assignMeJob=function(e) {
    var res= producable(this.entity, this.entity.resourcesNeeded());
    console.log("invent - PRODS", res);
    if(res)
      e.pushJob(new ml.Invent(e, res, this.entity));
    else
      this.entity.clearHlJob();
  };

  HlInventJob.applyable = producable;

  return HlInventJob;
});

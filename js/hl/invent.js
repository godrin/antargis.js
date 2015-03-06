define(["ml"],function(ml) { 
  var HlInventJob=function(entity) {
    this.entity = entity;
  };

  function producable(e, needed) {
    var producable=_.filter(needed,function(resource) {
      if(e.production) {
        var ok=true;
        var prereq = e.production[resource];
        _.each(prereq,function(amount,res) {
          if(e.resources[res]<amount)
            ok=false;
        });
      }
    });
    console.log("invent - PRODUCABLE",producable);
    if(producable.length>0) {
      return _.sample(producable);
    }
    return false;
  };


  HlInventJob.prototype.assignMeJob=function(e) {
    console.log("invent - ASSIGN FETCH MLJOB",e);
    var res= producable(this.entity, this.entity.resourcesNeeded());
    console.log("PRODS", res);
    e.pushJob(new ml.Invent(e, res, this.entity));
  };

  HlInventJob.applyable = producable;

  return HlInventJob;
});

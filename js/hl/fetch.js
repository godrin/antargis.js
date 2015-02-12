define(["ml"],function(ml) {
  var Job=function(entity) {
    this.entity = entity;
  };

  Job.prototype.selectResourceToGet=function() {
    var needed=_.shuffle(this.entity.resourcesNeeded());
    return needed[0];
  }

  Job.prototype.nextEntityForResource=function(selectedResource) {
    var self=this;
    return this.entity.world.search(function(e) {
      console.log("HAS RESOURCE",selectedResource,e,e.resources && e.resources[selectedResource]>0,e,e.resources);
      return e.resources && e.resources[selectedResource]>0 && e!=self.entity;
    },this.entity.pos)[0];
  };

  Job.prototype.assignMeJob=function(e) {
    console.log("ASSIGN FETCH MLJOB",e);
    var selectedResource=this.selectResourceToGet();
    if(selectedResource) {
      var nextEntity=this.nextEntityForResource(selectedResource);
      if(nextEntity) {
        e.pushJob(new ml.Fetch(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
      console.log("NO nextentity found");
      }
    }
    e.pushJob(new ml.Rest(e,1,0));
  };

  Job.prototype.onFrame=function(delta) {
    console.log("FIXME hljob-fetch-onframe");
  };

  return Job;
});

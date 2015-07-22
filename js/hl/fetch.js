define(["ml"],function(ml) {
  var FetchJob=function(entity,count) {
    this.entity = entity;
    this.count = count || 3;
  };
  FetchJob.prototype.name="hlFetch";

  FetchJob.prototype.selectResourceToGet=function() {
    var needed=_.shuffle(this.entity.resourcesNeeded());
    return needed[0];
  }

  FetchJob.prototype.nextEntityForResource=function(selectedResource) {
    var self=this;
    return this.entity.world.search(function(e) {
      console.debug("fetch - HAS RESOURCE",selectedResource,e,e.resources && e.resources[selectedResource]>0,e.provides,e.resources);
      return e.resources && e.resources[selectedResource]>0 && e!=self.entity && e.provides && _.contains(e.provides,selectedResource);
    },this.entity.pos)[0];
  };

  FetchJob.prototype.assignMeJob=function(e) {
    this.count-=1;
    console.debug("fetch - ASSIGN FETCH MLJOB",e);
    var selectedResource=this.selectResourceToGet();
    if(selectedResource) {
      var nextEntity=this.nextEntityForResource(selectedResource);
      if(nextEntity) {
        e.pushJob(new ml.Fetch(e, selectedResource, nextEntity, this.entity));
        return;
      } else {
        console.debug("fetch - NO nextentity found");
      }
    }
    e.pushJob(new ml.Rest(e,1,0));
    if(this.count<=0) {
      this.entity.clearHlJob();
    }
  };

  FetchJob.prototype.onFrame=function(delta) {
    console.debug("fetch - FIXME hljob-fetch-onframe");
  };

  return FetchJob;
});

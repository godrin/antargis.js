class HlInventJob {
  constructor(entity) {
    this.entity = entity;
    this.producable = this.applyable;
  }

  static applyable(e, needed) {
    var producable = _.filter(needed, function (resource) {
      if (e.production) {
        var ok = true;
        var prereq = e.production[resource];
        console.debug("invent - rule", prereq, e.resources);
        if (!prereq)
          return false;
        _.each(prereq, function (amount, res) {

          if (!e.resources[res] || e.resources[res] < amount) {
            ok = false;
          }
        });
        if (ok)
          return true;
      }
    });
    console.debug("invent - PRODUCABLE", producable);
    if (producable.length > 0) {
      return _.sample(producable);
    }
    return false;
  }

  assignMeJob(e) {
    var res = producable(this.entity, this.entity.resourcesNeeded());
    console.debug("invent - PRODS", res);
    if (res)
      e.pushJob(new Invent(e, res, this.entity));
    else
      this.entity.clearHlJob();
  }
}

export { HlInventJob }

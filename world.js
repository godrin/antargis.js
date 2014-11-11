define([],function() {
  var World=function() {
    this.entities=[];
  };
  World.prototype.push=function(entity) {
    this.entities.push(entity);
  };
  World.prototype.search=function(param,origin) {
    var self=this;
    return _.chain(self.entities).filter(function(e) {
      if(param instanceof Function) {
        alert("Implement me");
      } else {
        for(var name in param) {
          if(e[name] instanceof Array) {
            if(!_.contains(e[name],param[name]))
              return false;
          } else if(e[name]!=param[name])
            return false;
        }
      }
      return true;
    }).sortBy(function(e) {
      return e.pos.distanceTo(origin);
    }).value();
  };
  return World;
});

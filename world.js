define([],function() {
  var World=function() {
    this.entities=[];
  };
  World.prototype.push=function(entity) {
    this.entities.push(entity);
  };
  return World;
});

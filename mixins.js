var mixins=[
  "lljob",
  "mljob",
  "follower",
  "boss",
  "animal",
];
var paths=_.map(mixins,function(n) { return "mixins/"+n;});

define(paths,function() {
  var o={};
  for(var i in arguments) {
    o[mixins[i]]=arguments[i];
  }

  return o;
});

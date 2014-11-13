var jobs=[
  "move",
  "rest"
];
var paths=_.map(jobs,function(n) { return "mixins/jobs/"+n;});

define(paths,function() {
  var Jobs={};
  for(var i in arguments) {
    Jobs[jobs[i]]=arguments[i];
  }

  return {
    job:function(name) {
      return Jobs[name];
    },
    setLlJob:function(job) {
      this.lljob=job;
    },
    newLlJob:function() {
      var name=_.first(arguments);
      var rest=_.rest(arguments);
      var p=[this].concat(rest);

      var F=function(args) {
        return Jobs[name].apply(this,args);
      };

      F.prototype=Jobs[name].prototype;
      var j=new F(p);
      this.setLlJob(j);
      return j;
    },
    onFrame:function(delta) {
      if(this.lljob) {
        this.lljob.onFrame(delta);
        if(this.lljob.ready)
          delete this.lljob;
      } else if(this.onNoJob) {
        this.onNoJob(delta);
      } else {
      }
    }
  };
});

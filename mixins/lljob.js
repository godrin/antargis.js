var jobs=[
  "move"
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

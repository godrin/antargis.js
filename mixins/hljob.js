//FIXME: Maybe combine this implementation with lljob.js

(function() {
  var jobs=[
    "rest",
  ];
  var paths=_.map(jobs,function(n) { return "mixins/hljobs/"+n;});

  define(paths,function() {
    var Jobs={};
    for(var i in arguments) {
      Jobs[jobs[i]]=arguments[i];
    }

    return {
      setHlJob:function(job) {
        this.hljob=job;
        // directly assign new job
        if(job)
          this.onNoMlJob();
      },
      newHlJob:function() {
        var name=_.first(arguments);
        var rest=_.rest(arguments);
        var p=[this].concat(rest);

        var F=function(args) {
          return Jobs[name].apply(this,args);
        };

        F.prototype=Jobs[name].prototype;
        var j=new F(p);
        j.name=name;
        this.setHlJob(j);

        return j;
      },
      onNoMlJob:function(delta) {
        if(this.hljob) {
          if(this.hljob.createMlJob)
            this.hljob.createMlJob(delta);
          if(this.hljob.ready)
            delete this.hljob;
        } else if(this.onNoHlJob) {
          this.onNoHlJob(delta);
        } else {
        }
      }
    };
  });
})();

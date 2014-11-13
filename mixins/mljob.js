//FIXME: Maybe combine this implementation with lljob.js

(function() {

  var jobs=[
    "move",
  ];
  var paths=_.map(jobs,function(n) { return "mixins/mljobs/"+n;});

  define(paths,function() {
    var Jobs={};
    for(var i in arguments) {
      Jobs[jobs[i]]=arguments[i];
    }

    return {
      setMlJob:function(job) {
        this.mljob=job;
      },
      newMlJob:function() {
        var name=_.first(arguments);
        var rest=_.rest(arguments);
        var p=[this].concat(rest);

        var F=function(args) {
          return Jobs[name].apply(this,args);
        };

        F.prototype=Jobs[name].prototype;
        var j=new F(p);
        this.setMlJob(j);
        return j;
      },
      onNoLlJob:function(delta) {
        if(this.mljob) {
          this.mljob.onFrame(delta);
          if(this.mljob.ready)
            delete this.mljob;
        } else if(this.onNoMlJob) {
          this.onNoMlJob(delta);
        } else {
        }
      }
    };
  });


})();

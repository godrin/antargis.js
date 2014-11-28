(function() {

  var jobs=[
    "move",
    "rest"
  ];
  var paths=_.map(jobs,function(n) { return "mixins/lljobs/"+n;});

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
        if(!Jobs[name])
          console.log("LLJOB ",name," not found", Jobs);

        F.prototype=Jobs[name].prototype;
        var j=new F(p);
        j.name=name;
        this.setLlJob(j);
        return j;
      },
      onFrame:function(delta) {
        if(this.lljob) {
          this.lljob.onFrame(delta);
          if(this.lljob.ready)
            delete this.lljob;
        } else if(this.onNoLlJob) {
          this.onNoLlJob(delta);
        } else {
        }
      },
      // mesh name should contain an animation with loop=false
      playAnimation:function(name) {
        this.setMesh(name);
        this.newLlJob("rest",20);
      },
      animationFinished:function() {
        console.log("ANIMAL anim finished",this.lljob,this.mljob);
        this.onNoLlJob(0);
      }
    };
  });


})();

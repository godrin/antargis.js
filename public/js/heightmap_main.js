require(['heightmap','generator','processor'],function(HeightMap, Generator, Proc) {
  var w=32;
  var sw=w*4;
  var map=new HeightMap({width:w,height:w});

  map.generate();

  var canvas=map.toCanvas();
  console.log("C",canvas);
  $("#image").append(canvas).css({width:sw,height:sw});

  console.log(map.get("rock")(1,1));
  console.log(map.get("rock")(2,1));
  console.log(map.get("rock").interpolate(1.5,1));


  Generator(function(w,h,data) {

    data=map.pickGreen(w,h,data)

    var map2=new HeightMap({width:w,height:w,map:{rock:data}});
    var canvas=map2.toCanvas();
    console.log("C",canvas);
    $("#image").append(canvas).css({width:sw,height:sw});

  });

  function procTest() {
    Proc.loadShaders(["simplex3d"],function(vshader,fshader) {
      var w=32;
      console.log("s",vshader,fshader);
      var t=new Proc.Texture({width:w,height:w});
      var p=new Proc.Pass("simplex3d", t);
      p.run({},function() {
        console.log("PROC ready");
      });
    });
  }
  procTest();
});

require(['heightmap','generator','processor'],function(HeightMap, Generator, Proc) {
  var w=32;
  var sw=w*8;
  var map=new HeightMap({width:w,height:w});

  map.generate();

  var canvas=map.toCanvas();
  console.log("C",canvas);
  $("#image").append(canvas).css({width:sw,height:sw});

  console.log(map.get("rock")(1,1));
  console.log(map.get("rock")(2,1));
  console.log(map.get("rock").interpolate(1.5,1));


  function toCanvas(data, el) {
    var map2=new HeightMap({width:w,height:w,map:{rock:data}});
    var canvas=map2.toCanvas();
    console.log("C",canvas,data,el);
    $(el).append(canvas).css({width:sw,height:sw});
  }

  function unit8ToUint32(a) {
    var b = new Uint32Array(a.length/4);
    for(var i=0;i<a.length/4;i++) {
    var j=i*4;
      b[i]=(a[j]<<24)+(a[j+1]<<16)+(a[j+2]<<8)+a[j+3];
    }
    return b;
  }

  Generator(function(w,h,data) {

    data=map.pickGreen(w,h,data)

    toCanvas(data,"#image");

  });

  function procTest() {
    Proc.loadShaders(["simplex3d"],function(vshader,fshader) {
      var w=32;
      console.log("s",vshader,fshader);
      var t=new Proc.Texture({width:w,height:w});
      var p=new Proc.Pass("simplex3d", t);
      p.run({},function() {
        console.log("PROC ready");
        var data = t.readData();
        data = unit8ToUint32(data);
        console.log("DATA",data);
        toCanvas(data,"#image2");
      });
    });
  }
  procTest();
});

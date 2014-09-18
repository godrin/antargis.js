require(['heightmap','generator'],function(HeightMap, Generator) {
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


  Generator.test();
});

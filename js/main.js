requirejs.config({
  baseUrl:"js",
  packages:[
    'jobs',
    'formations',
    'll',
    'ml',
    'hl',
    'angular'
  ],
});

require(["generator","heightmap", "level", 'world',
 'game_view'],
function(Generator, HeightMap, Level, World, Gui, GameView) {
  var w=64;
  var mapOptions={width:w,height:w};

  Generator(mapOptions, function(w,h,data) {
    data=HeightMap.pickGreen(w,h,data)

    var map=new HeightMap({width:w,height:w,map:{rock:data}});
    var world=new World(map);

    var levelName=location.hash.replace(/^#/,'');
    if(!levelName)
      levelName="tests/fetch.json";

    Level.load(levelName, map, world,function() {
      new GameView("#angular-game",world);
      new Gui(world, "body");
    });
  });
});

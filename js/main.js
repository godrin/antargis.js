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

require(['base',"terrain","skybox","models","controls", "generator","heightmap", "level", "pick", 'world',
'jobs', 'angular', 'game_view'],
function(Base,Terrain,Skybox, Models, Controls, Generator, HeightMap, Level, Pick, World, Jobs, Gui, GameView) {
  var w=64;
  var mapOptions={width:w,height:w};

  Generator(mapOptions, function(w,h,data) {
    data=HeightMap.pickGreen(w,h,data)

    var map=new HeightMap({width:w,height:w,map:{rock:data}});
    var world=new World(map);

    var levelName=location.hash.replace(/^#/,'');
    if(!levelName)
      levelName="tests/fetch.js";

    Level.load(levelName, map, world,function() {
      new GameView("#angular-game",world);
    });
  });
});

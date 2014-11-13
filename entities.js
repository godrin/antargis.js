define([],function() {

  return {
    bakery: {
      mesh:'bakery',
      rotation: { z: -3.14*1/8}
    },
    mill: {
      mesh:'mill',
      scale:1
    },
    well: {
      mesh:'well',
      scale:0.03,
      resources: {
        water:100
      }
    },
    fishing_hut: {
      mesh:"fishing_hut",
      rotation: { z: 3.14*1/8},
      mixins:["boss"]
    },
    townhall: {
      mesh:"townhall_try2",
      rotation: { z: 3.14*6/4+3.14 },
      mixins:["boss"]
    },
    hero: {
      mesh:"hero_lp",
      scale: 0.05,
      mixins: ["boss", "hero", "lljob", "mljob"]
    },
    tower: {
      mesh:"tower",
      scale:1.8,
      mixins:["boss"]
    },
    man: {
      mesh:"man_axe",
      scale:0.05,
      type:"json",
      rotation: { x: 3.14*0.5 },
      mixins:["lljob", "mljob", "follower"]
    },
    fir: {
      mesh:"fir2",
      texture:"fir5.png",
      scale:0.42,
      doublesided:true,
      transparent:true,
      resources: {
        wood:5
      }
    },
    tree: {
      mesh:"tree5",
      scale:0.2,
      doublesided:true
    },
    big_stone: {
      mesh:'big_stone',
      scale:1,
      resources: {
        stone:20
      }
    },
  };

});

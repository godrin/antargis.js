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
    },
    fishing_hut: {
      mesh:"fishing_hut",
      rotation: { z: 3.14*1/8},
    },
    townhall: {
      mesh:"townhall_try2",
      rotation: { z: 3.14*6/4+3.14 },
    },
    hero: {
      mesh:"hero_lp",
      scale: 0.05,
    },
    tower: {
      mesh:"tower",
      scale:1.8,
    },
    man_e_walk: {
      mesh:"man_e_walk",
      scale:0.07,
      type:"json",
      rotation: { x: 3.14*0.5 },
      animations: {
        "sit": {
          timeScale:30,
          startFrame:20,
          endFrame:20
        },
        "sitdown": {
          timeScale:25,
          startFrame:1,
          endFrame:18,
          loop:false
        },
        "stand": {
          timeScale:25,
          startFrame:40,
          endFrame:40
        },
        "walk": {
          timeScale:30,
          startFrame:45,
          endFrame:65
        },
        "default": {
          timeScale:10,
          startFrame:45,
          endFrame:65
        }
      }
    },
    fir: {
      mesh:"fir2",
      texture:"fir5.png",
      scale:0.42,
      doublesided:true,
      transparent:true,
    },
    tree: {
      mesh:"tree5",
      scale:0.2,
      doublesided:true
    },
    big_stone: {
      mesh:'big_stone',
      scale:1,
    },
  };
});

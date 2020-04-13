define([],function() {
  return {
    bakery: {
      mesh:'bakery',
      rotation: { z: -3.14*1/8}
    },
    big_stone: {
      mesh:'big_stone',
      scale:1,
    },
    crop_small: {
      transparent:true,
      scale:2.2
    },
    crop_med: {
      transparent:true,
      scale:2.2
    },
    crop_high: {
      transparent:true,
      scale:2.2
    },
    crop_tiny: {
      transparent:true,
      //doublesided:true,
      scale:2.2
    },
    farm: {
      mesh:'farm',
      scale:0.1,
      rotation: { z: -0.6}
    },
    fishing_hut: {
      mesh:"fishing_hut",
      rotation: { z: 3.14*1/8},
      scale:1.5
    },
    grave: {
      mesh:"grave",
      scale:0.2
    },
    hero: {
      mesh:"hero_lp",
      scale: 0.08,
    },
    mine: {
      mesh:'mine2',
      scale:0.08
    },
    mill: {
      mesh:'mill',
      scale:1
    },
    townhall: {
      mesh:"townhall_try2",
      rotation: { z: 3.14*6/4+3.14 },
    },
    tower: {
      mesh:"tower",
      scale:1.8,
      rotation: { z: 3.14*7/4+3.14 },
    },
    man_pick: {
      mesh:"man_pick",
      texture:"man_fight.png",
      scale:0.07,
      type:"json",
      animations: {
        "pick": {
          timeScale:45,
          startFrame:1,
          endFrame:48,
          "events": [
            {
              time:35,
              name:"pick"
            }
          ]
        }
      }
    },
    man_axe: {
      mesh:"man_axe",
      texture:"man_fight.png",
      scale:0.07,
      type:"json",
      rotation: { x: 3.14*0.5 },
      animations: {
        "pick": {
          timeScale:40,
          startFrame:1,
          endFrame:35,
          "events": [
            {
              time:27,
              name:"pick"
            }
          ]
        }
      }
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
          endFrame:20,
          animate:false
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
    man_fight: {
      mesh:"man_fight",
      scale:0.07,
      type:"json",
      rotation: { x: 3.14*0.5 },
      animations: {
        "fight": {
          startFrame:1,
          endFrame:41,
          timeScale:25,
          "events": [
            {
              time:18,
              name:"sword"
            },
            {
              time:35,
              name:"sword"
            },
            {
              time:20,
              name:"ugh"
            },
          ]
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
    sheep: {
      type:"json",
      texture:"sheep.png",
      //wireframe:true,
      //defaultMaterial:true,
      animations: {
        "default": {
          timeScale:25,
          startFrame:1,
          endFrame:45
        },
        "eat": {
          timeScale:25,
          startFrame:1,
          endFrame:45,
          loop:false
        },
        "walk": {
          timeScale: 60,
          startFrame:45,
          endFrame:100
        }
      }
    },
    well: {
      mesh:'well',
      scale:0.03,
    },
    workshop: {
      mesh:'workshop',
      scale:0.18,
      rotation:{ z:-50*3.14/180 },
      particles: {
        smoke: {
          position: { x: 0,
            y:0,
            z:0
          }
        }
      }
    }
  };
});

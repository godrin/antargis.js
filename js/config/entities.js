define([],function() {
  return {
    bakery: {
    },
    crop: {
    meshName:"tiny",
      meshes: {
        "high": { mesh: "crop_high" },
        "med": { mesh: "crop_med" },
        "small": { mesh: "crop_small" },
        "tiny": { mesh: "crop_tiny" }
      }
    },
    mill: {
    },
    mine: {
    },
    farm: {
    },
    grave: {
    },
    well: {
      provides: [ "water" ],
      resources: {
        water:100
      }
    },
    fishing_hut: {
      mixins:["boss"]
    },
    workshop: {
      needed:{
        wood:1,
        stone:1,
        water:1,
        food:1,
        tool:10
      },
      production:{
        tool: {
          wood:1,
          stone:1
        }
      },
      mixins:["boss","house"]
    },
    townhall: {
      needed:{
        wood:1,
        stone:1,
        water:1,
        food:1
      },
      mixins:["boss","house"]
    },
    hero: {
      mixins: ["boss", "hero", "job"]
    },
    tower: {
      mixins:["boss", "job"]
    },
    man: {
      meshes:{
        "sit": {
          mesh:"man_e_walk",
          animation:"sit"
        },
        "sitdown": {
          mesh:"man_e_walk",
          animation:"sitdown"
        },
        "stand": {
          mesh:"man_e_walk",
          animation:"stand"
        },
        "walk": {
          mesh:"man_e_walk",
          animation:"walk"
        },
        "default": {
          mesh:"man_e_walk",
          animation:"stand"
        },
        "fight": {
          mesh:"man_fight",
          animation:"fight"
        },
        "pick": {
          mesh:"man_pick",
          animation:"pick"
        },
        "axe": {
          mesh:"man_axe",
          animation:"axe"
        }
      },
      mixins:["job", "follower"]
    },
    fir: {
      provides: [ "wood" ],
      resources: {
        wood:5
      }
    },
    tree: {
    },
    big_stone: {
      provides: [ "stone" ],
      resources: {
        stone:20
      }
    },
    sheep: {
      mixins:["job","animal"],
      speed:0.5,
      meshes: {
        "default": {
          mesh:"sheep",
          animation:"eat"
        },
        eat: {
          mesh:"sheep",
          animation:"eat"
        },
        walk: {
          mesh:"sheep",
          animation:"walk"
        }
      }
    }
  };
});


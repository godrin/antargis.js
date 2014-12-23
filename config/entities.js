define([],function() {
  return {
    bakery: {
    },
    mill: {
    },
    well: {
      resources: {
        water:100
      }
    },
    fishing_hut: {
      mixins:["boss"]
    },
    townhall: {
      mixins:["boss"]
    },
    hero: {
      mixins: ["boss", "hero", "job"]
    },
    tower: {
      mixins:["boss"]
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
      resources: {
        wood:5
      }
    },
    tree: {
    },
    big_stone: {
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


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
      mixins: ["boss", "hero", "lljob", "mljob"]
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
        }
      },
      mixins:["lljob", "mljob", "follower"]
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
  };
});


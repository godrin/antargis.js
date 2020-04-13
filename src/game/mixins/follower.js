let follower = {
  checkBoss: function () {
    if (!this.boss) {
      this._assignBoss(this._findSomeBoss({
        mixinNames: "house"
      }));
    } else if (typeof (this.boss) === "string") {
      this._assignBoss(this._findSomeBoss({
        name: this.boss
      }));
    }
  },
  onNoJob: function () {
    this.checkBoss();
    if (this.boss && this.boss.assignMeJob)
      this.boss.assignMeJob(this);
  },
  _findSomeBoss(specs) {
    if (this.world.search) {
      var f = this.world.search(specs, this.pos);
      if (f.length > 0) {
        return f[0];
      }
    }
  },
  _assignBoss(boss) {
    this.boss = boss;
    if (boss != null) {
      this.boss.addFollower(this);
    }
  }
};


let Follower = () => follower;
export {Follower}

import {House} from './house'
import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";

describe('House', () => {
  describe('resourcesNeeded', () => {
    it('should work with nothing needed', () => {
      var entity = {};
      Object.assign(entity, House());
      expect(entity.resourcesNeeded()).to.eql([])
    });

    it('should work with nothing needed', () => {
      var entity = {needed: {'wood': 2}, resources: {}};
      Object.assign(entity, House());
      let result = entity.resourcesNeeded();
      console.log("RESULT", result);
      expect(result).to.eql(['wood', 'wood'])
    });
  })
  describe('ai',()=>{
    it("should create an invent job",()=> {
      var entity = {needed: {'wood': 2}, resources: {}};
      Object.assign(entity, House());
      entity.createInventJob = sinon.fake.returns(1);
      entity.createFetchJob = sinon.spy();
      entity.inventApplyable = sinon.fake.returns(true);
      entity.pushHlJob = sinon.spy();

      entity.ai();
      expect(entity.createInventJob).to.be.calledOnce;
      expect(entity.createFetchJob).to.not.be.called;
      expect(entity.pushHlJob).to.be.calledWith(1);
    });
    it("should create a fetch job",()=> {
      var entity = {needed: {'wood': 2}, resources: {}};
      Object.assign(entity, House());
      entity.createInventJob = sinon.fake.returns(1);
      entity.createFetchJob = sinon.fake.returns(2);
      entity.inventApplyable = sinon.fake.returns(false);
      entity.pushHlJob = sinon.spy();

      entity.ai();
      expect(entity.createFetchJob).to.be.calledOnce;
      expect(entity.createInventJob).to.not.be.called;
      expect(entity.pushHlJob).to.be.calledWith(2);
    });
    it("should create no job",()=> {
      var entity = {needed: {'wood': 2}, resources: {wood: 2}};
      Object.assign(entity, House());
      entity.createInventJob = sinon.fake.returns(1);
      entity.createFetchJob = sinon.fake.returns(2);
      entity.inventApplyable = sinon.fake.returns(false);
      entity.pushHlJob = sinon.spy();

      entity.ai();
      expect(entity.createFetchJob).to.not.be.called;
      expect(entity.createInventJob).to.not.be.called;
      expect(entity.pushHlJob).to.not.be.called;
    });
  })
});

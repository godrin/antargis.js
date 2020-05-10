import {expect, sinon} from '../../libs/testsetup';
import {Vector2} from "../vector2";
import {StateMachine} from "./state-machine";

describe('StateMachine', () => {
  describe('statemachine', () => {
    it('should start with mode comeHome', () => {
      const job = new StateMachine('comeHome');

      expect(job.mode).to.equal("comeHome")
    });
    it('should run the selected function for the current state',()=>{
      const job = new StateMachine('comeHome');
      job.comeHome = sinon.fake.returns(true);
      job.onFrame(0);
      expect(job.comeHome).to.be.calledOnce;
    })
  });
});


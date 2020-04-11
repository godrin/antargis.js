import Job from './job'

class RestJob extends Job {
    constructor(entity, time) {
        super(entity)
        this.time = time;
        this.doneTime = 0;
    }

    // maybe implement using setTimeout ?
    onFrame(delta) {
        this.doneTime += delta;
        if (this.doneTime > this.time) {
            this.setReady();
            return this.doneTime - this.time;
        }
        return -1;
    }
}

export default RestJob;


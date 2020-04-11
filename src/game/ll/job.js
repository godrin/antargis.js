class Job {
    constructor(entity) {
        this._entity = entity;
        this._ready = false;
    }

    get ready() {
        return this._ready;
    }

    get entity() {
        return this._entity
    }

    setReady() {
        this._ready = true;
    }
}

export default Job;
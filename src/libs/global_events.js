// shamelessly stolen from https://davidwalsh.name/pubsub-javascript
// http://opensource.org/licenses/MIT license

const topics = {};
const hOP = topics.hasOwnProperty;

export default class Events {
    subscribe(topic, listener) {
        // Create the topic's object if not yet created
        if (!hOP.call(topics, topic)) topics[topic] = [];

        // Add the listener to queue
        const index = topics[topic].push(listener) - 1;

        // Provide handle back for removal of topic
        return {
            remove: function() {
                delete topics[topic][index];
            }
        };
    }

    publish(topic, info) {
        console.log("PUBLISHED", topic, info)
        // If the topic doesn't exist, or there's no listeners in queue, just leave
        if (!hOP.call(topics, topic)) return;

        // Cycle through topics queue, fire!
        topics[topic].forEach(function(item) {
            item(info != undefined ? info : {});
        });
    }
}

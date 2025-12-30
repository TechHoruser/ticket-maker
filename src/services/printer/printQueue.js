class PrintQueue {
    constructor(coolDownMs = 200) {
        this.queue = [];
        this.isProcessing = false;
        this.coolDown = coolDownMs;
    }

    /**
     * Adds a task to the queue.
     * @param {Function} task - A function that returns a Promise.
     * @returns {Promise} - Resolves with the task result or rejects with error.
     */
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const { task, resolve, reject } = this.queue.shift();

            try {
                const result = await task();
                resolve(result);
            } catch (err) {
                reject(err);
            }

            // Cool down period after an operation (success or fail)
            // This ensures we fully close the socket and give the printer a break
            if (this.queue.length > 0) {
                await new Promise(r => setTimeout(r, this.coolDown));
            }
        }

        this.isProcessing = false;
    }
}

module.exports = PrintQueue;

class NeuralNetwork {
    static INPUT_NODES = 9;  // 5 rays + speed + steering angle + checkpoint angle + checkpoint distance
    static HIDDEN_NODES = 8;
    static OUTPUT_NODES = 4; // forward, backward, left, right

    constructor(model = null) {
        if (model) {
            this.model = model;
        } else {
            this.createModel();
        }
    }

    createModel() {
        this.model = tf.sequential();

        // First hidden layer
        this.model.add(tf.layers.dense({
            units: NeuralNetwork.HIDDEN_NODES,
            inputShape: [NeuralNetwork.INPUT_NODES],
            activation: 'relu'
        }));

        // Output layer
        this.model.add(tf.layers.dense({
            units: NeuralNetwork.OUTPUT_NODES,
            activation: 'sigmoid'
        }));

        // Compile the model
        this.model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });
    }

    predict(inputs) {
        return tf.tidy(() => {
            const inputTensor = tf.tensor2d([inputs]);
            const prediction = this.model.predict(inputTensor);
            return prediction.dataSync();
        });
    }

    copy() {
        const modelCopy = tf.sequential();

        // Add layers with the same configuration
        modelCopy.add(tf.layers.dense({
            units: NeuralNetwork.HIDDEN_NODES,
            inputShape: [NeuralNetwork.INPUT_NODES],
            activation: 'relu'
        }));

        modelCopy.add(tf.layers.dense({
            units: NeuralNetwork.OUTPUT_NODES,
            activation: 'sigmoid'
        }));

        // Compile the model
        modelCopy.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });

        // Copy weights
        const weights = this.model.getWeights();
        const weightCopies = weights.map(w => w.clone());
        modelCopy.setWeights(weightCopies);

        return new NeuralNetwork(modelCopy);
    }

    mutate(rate = 0.1) {
        tf.tidy(() => {
            const weights = this.model.getWeights();
            const mutatedWeights = [];

            for (let i = 0; i < weights.length; i++) {
                let tensor = weights[i];
                let shape = weights[i].shape;
                let values = tensor.dataSync().slice();

                for (let j = 0; j < values.length; j++) {
                    if (Math.random() < rate) {
                        values[j] += randomGaussian(0, 0.1);
                    }
                }

                let newTensor = tf.tensor(values, shape);
                mutatedWeights.push(newTensor);
            }

            this.model.setWeights(mutatedWeights);
        });
    }
}

// Utility function for Gaussian distribution
function randomGaussian(mean, standardDeviation) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * standardDeviation + mean;
} 
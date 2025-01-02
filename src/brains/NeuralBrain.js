class NeuralBrain extends Brain {
    constructor() {
        super();
        this.model = this.createModel();
    }

    createModel() {
        const model = tf.sequential();

        // Input layer: 9 inputs (rays)
        model.add(tf.layers.dense({
            inputShape: [9],
            units: 16,
            activation: 'relu'
        }));

        // Hidden layer
        model.add(tf.layers.dense({
            units: 12,
            activation: 'relu'
        }));

        // Output layer: 4 outputs (left, right, up, down)
        model.add(tf.layers.dense({
            units: 4,
            activation: 'sigmoid' // Use sigmoid for 0-1 output
        }));

        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError'
        });

        return model;
    }

    update() {
        if (!this.car) return;

        // Get ray distances
        const inputs = this.car.rays.map(ray => ray.fraction);

        // Predict controls using the neural network
        tf.tidy(() => {
            const inputTensor = tf.tensor2d([inputs]);
            const prediction = this.model.predict(inputTensor);
            const controls = prediction.dataSync();

            // Update controls based on network output
            this.controls.left = controls[0];
            this.controls.right = controls[1];
            this.controls.up = controls[2];
            this.controls.down = controls[3];
        });
    }

    // Method to save the model's weights
    async saveWeights() {
        try {
            await this.model.save('localstorage://race-ai-model');
        } catch (error) {
            console.error('Error saving model:', error);
        }
    }

    // Method to load saved weights
    async loadWeights() {
        try {
            await this.model.loadWeights('localstorage://race-ai-model');
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }

    // Method to train the model with a batch of data
    async train(trainingData) {
        const inputs = tf.tensor2d(trainingData.map(d => d.inputs));
        const outputs = tf.tensor2d(trainingData.map(d => d.outputs));

        await this.model.fit(inputs, outputs, {
            epochs: 10,
            batchSize: 32,
            shuffle: true
        });

        inputs.dispose();
        outputs.dispose();
    }

    // Method to get current state for training
    getState() {
        return {
            inputs: this.car.rays.map(ray => ray.fraction),
            outputs: [
                this.controls.left,
                this.controls.right,
                this.controls.up,
                this.controls.down
            ]
        };
    }
} 
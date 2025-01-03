class NeuralBrain extends Brain {
    constructor(weights = null) {
        super();
        this.inputSize = Car.RAY_COUNT + 1; // Rays + speed
        this.hiddenSize = 6;
        this.outputSize = 4; // up, down, left, right

        if (weights) {
            this.weights = weights;
        } else {
            // Initialize random weights with larger values for more decisive actions
            this.weights = {
                hidden: tf.randomNormal([this.inputSize, this.hiddenSize], 0, 1).arraySync(),
                output: tf.randomNormal([this.hiddenSize, this.outputSize], 0, 1).arraySync()
            };
        }

        // Add debug properties
        this.lastInputs = null;
        this.lastOutputs = null;
    }

    update() {
        if (!this.car) return;

        // Get normalized inputs
        const inputs = this.getNormalizedInputs();
        this.lastInputs = inputs;

        // Forward pass through neural network
        const outputs = tf.tidy(() => {
            const inputTensor = tf.tensor2d([inputs]);
            const hiddenWeights = tf.tensor2d(this.weights.hidden);
            const outputWeights = tf.tensor2d(this.weights.output);

            const hidden = inputTensor.matMul(hiddenWeights).sigmoid();
            const output = hidden.matMul(outputWeights).sigmoid();

            return output.arraySync()[0];
        });

        this.lastOutputs = outputs;

        // Set controls based on output (threshold at 0.5)
        this.controls.up = outputs[0] > 0.5 ? 1 : 0;
        this.controls.down = outputs[1] > 0.5 ? 1 : 0;
        this.controls.left = outputs[2] > 0.5 ? 1 : 0;
        this.controls.right = outputs[3] > 0.5 ? 1 : 0;

        // Debug output
        if (this.car.debug) {
            console.log(`Car ${this.car.carNumber} - Inputs:`, inputs);
            console.log(`Car ${this.car.carNumber} - Outputs:`, outputs);
            console.log(`Car ${this.car.carNumber} - Controls:`, this.controls);
        }
    }

    getNormalizedInputs() {
        // Get ray distances and normalize them
        const rayInputs = this.car.rays.map(ray => ray.fraction);

        // Get normalized speed (0 to 1)
        const maxSpeed = 10; // Adjust this based on typical max speed
        const speed = Math.sqrt(
            Math.pow(this.car.chassisBody.velocity[0], 2) +
            Math.pow(this.car.chassisBody.velocity[1], 2)
        ) / maxSpeed;

        const inputs = [...rayInputs, speed];

        // Log inputs with car number (commented out to reduce console spam)
        // console.log(`Car ${this.car.carNumber} inputs:`, JSON.stringify(inputs));

        return inputs;
    }

    // Method to breed with another brain
    breed(otherBrain) {
        const childWeights = {
            hidden: [],
            output: []
        };

        // Crossover hidden layer weights
        for (let i = 0; i < this.weights.hidden.length; i++) {
            childWeights.hidden[i] = [];
            for (let j = 0; j < this.weights.hidden[i].length; j++) {
                // Randomly choose weight from either parent
                childWeights.hidden[i][j] = Math.random() < 0.5 ?
                    this.weights.hidden[i][j] :
                    otherBrain.weights.hidden[i][j];

                // Add mutation with small probability
                if (Math.random() < 0.1) {
                    childWeights.hidden[i][j] += (Math.random() - 0.5);
                }
            }
        }

        // Crossover output layer weights
        for (let i = 0; i < this.weights.output.length; i++) {
            childWeights.output[i] = [];
            for (let j = 0; j < this.weights.output[i].length; j++) {
                // Randomly choose weight from either parent
                childWeights.output[i][j] = Math.random() < 0.5 ?
                    this.weights.output[i][j] :
                    otherBrain.weights.output[i][j];

                // Add mutation with small probability
                if (Math.random() < 0.1) {
                    childWeights.output[i][j] += (Math.random() - 0.5);
                }
            }
        }

        return new NeuralBrain(childWeights);
    }

    drive() {
        // Clear previous controls first
        this.car.clearControls();

        // Apply new controls based on neural network outputs
        if (this.controls.up) this.car.forward(1);
        if (this.controls.down) this.car.backward(1);
        if (this.controls.left) this.car.steerLeft(1);
        if (this.controls.right) this.car.steerRight(1);
    }

    clone() {
        // Create a deep copy of the weights
        const clonedWeights = {
            hidden: this.weights.hidden.map(row => [...row]),
            output: this.weights.output.map(row => [...row])
        };
        return new NeuralBrain(clonedWeights);
    }

    mutate() {
        // Mutate weights with varying magnitudes
        const mutateWeight = (weight) => {
            // Always mutate, but with larger magnitudes
            const magnitude = Math.random() * 0.8; // 0 to 0.8 instead of 0.2
            const change = (Math.random() - 0.5) * 1.6; // -0.8 to 0.8 instead of -0.2 to 0.2
            return weight + change * magnitude;
        };

        // Mutate hidden layer weights
        this.weights.hidden = this.weights.hidden.map(row =>
            row.map(weight => mutateWeight(weight))
        );

        // Mutate output layer weights
        this.weights.output = this.weights.output.map(row =>
            row.map(weight => mutateWeight(weight))
        );
    }
}
class Brain {
    constructor() {
        this.car = null;
        this.controls = {
            left: 0,    // 0 to 1
            right: 0,   // 0 to 1
            up: 0,      // 0 to 1
            down: 0     // 0 to 1
        };
    }

    setCar(car) {
        this.car = car;
    }

    // This method will be called every frame to update controls
    update() {
        // To be implemented by child classes
    }

    // Reset the brain state
    reset() {
        this.controls.left = 0;
        this.controls.right = 0;
        this.controls.up = 0;
        this.controls.down = 0;
    }

    // Drive methods that directly control the car
    drive() {
        if (!this.car) return;

        // Clear previous controls
        this.car.clearControls();

        // Apply new controls
        if (this.controls.left > 0) this.car.steerLeft(this.controls.left);
        if (this.controls.right > 0) this.car.steerRight(this.controls.right);
        if (this.controls.up > 0) this.car.forward(this.controls.up);
        if (this.controls.down > 0) this.car.backward(this.controls.down);
    }
}

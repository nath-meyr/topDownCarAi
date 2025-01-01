class Brain {
    constructor() {
        this.controls = {
            left: 0,    // 0 to 1
            right: 0,   // 0 to 1
            up: 0,      // 0 to 1
            down: 0     // 0 to 1
        };
    }

    // This method will be called every frame to update controls
    update() {
        // To be implemented by child classes
    }

    // Get the current control values
    getControls() {
        return this.controls;
    }

    // Reset the brain state
    reset() {
        this.controls.left = 0;
        this.controls.right = 0;
        this.controls.up = 0;
        this.controls.down = 0;
    }
}

class HumanBrain extends Brain {
    constructor() {
        super();
        this.keys = {
            '37': 0, // left
            '39': 0, // right
            '38': 0, // up
            '40': 0  // down
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener("keydown", (evt) => this.handleKeyDown(evt));
        document.addEventListener("keyup", (evt) => this.handleKeyUp(evt));
    }

    handleKeyDown(evt) {
        if (evt.keyCode in this.keys) {
            this.keys[evt.keyCode] = 1;
            this.updateControls();
        }
    }

    handleKeyUp(evt) {
        if (evt.keyCode in this.keys) {
            this.keys[evt.keyCode] = 0;
            this.updateControls();
        }
    }

    updateControls() {
        // Convert key states to control values (0 or 1)
        this.controls.left = this.keys['37'];
        this.controls.right = this.keys['39'];
        this.controls.up = this.keys['38'];
        this.controls.down = this.keys['40'];
    }

    update() {
        // For HumanBrain, controls are updated through key events
        // No need to do anything in the update loop
    }
} 
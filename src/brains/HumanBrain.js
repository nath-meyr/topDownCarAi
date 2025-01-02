
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
            this.drive();
        }
    }

    handleKeyUp(evt) {
        if (evt.keyCode in this.keys) {
            this.keys[evt.keyCode] = 0;
            this.updateControls();
            this.drive();
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
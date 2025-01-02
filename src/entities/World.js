class GameWorld {
    // Constants
    static CANVAS_HEIGHT = window.innerHeight;
    static CANVAS_WIDTH = window.innerWidth;
    static MIN_SCALE_FACTOR = 25;
    static MAX_SCALE_FACTOR = 35;
    static SCALE_SPEED_FACTOR = 0.5; // How much speed affects zoom (lower = more dramatic)
    static BASE_SCALE_FACTOR = 10;
    static SCALE_TRANSITION_SPEED = 0.03;
    static WALL_THICKNESS = 0.3;
    static WALL_MULTIPLIER = 25;

    static WALL_OPTIONS = {
        isStatic: true,
        collisionResponse: true
    };

    constructor() {
        // Initialize properties
        this.grassImage = null;
        this.scaleFactor = 100;
        this.world = new p2.World({
            gravity: [0, 0]
        });

        // Calculate dimensions
        this.physicsHeight = GameWorld.CANVAS_HEIGHT / this.scaleFactor;
        this.physicsWidth = GameWorld.CANVAS_WIDTH / this.scaleFactor;

        this.outsideWalls = {
            width: GameWorld.WALL_MULTIPLIER * this.physicsWidth,
            height: GameWorld.WALL_MULTIPLIER * this.physicsHeight
        };

        // Add track property
        this.track = null;
    }

    loadAssets() {
        this.grassImage = loadImage('assets/images/grass_1.avif');
    }

    drawGrass() {
        // Draw repeating grass background
        const grassSize = 10; // Size of grass tile in pixels
        const numTilesX = Math.ceil(this.outsideWalls.width / grassSize);
        const numTilesY = Math.ceil(this.outsideWalls.height / grassSize);
        const startX = -numTilesX * grassSize / 2;
        const startY = -numTilesY * grassSize / 2;

        for (let x = startX; x < startX + numTilesX * grassSize; x += grassSize) {
            for (let y = startY; y < startY + numTilesY * grassSize; y += grassSize) {
                push();
                translate(x + grassSize / 2, y + grassSize / 2);
                // Fixed 90 degree rotation
                rotate(90 * PI / 180);
                image(this.grassImage, -grassSize / 2, -grassSize / 2, grassSize, grassSize);
                pop();
            }
        }
    }

    drawPointGrid() {
        // Draw grid points with alternating shades of gray
        strokeWeight(0.5);
        for (let x = -100; x < 100; x += 5) {
            for (let y = -100; y < 100; y += 5) {
                // Change color every 10 points using modulo
                let shade = ((Math.abs(Math.floor(x / 10)) + Math.abs(Math.floor(y / 10))) % 3) * 100;
                stroke(shade);
                fill(shade);
                point(x, y);
            }
        }
    }

    updateScaleFactor(carSpeed, isRaceFinished) {
        let targetScale;

        if (isRaceFinished) {
            // When race is finished, return to base scale
            targetScale = GameWorld.BASE_SCALE_FACTOR;
        } else {
            // Normal racing zoom based on speed
            targetScale = GameWorld.MAX_SCALE_FACTOR - (carSpeed * GameWorld.SCALE_SPEED_FACTOR);
            targetScale = Math.max(GameWorld.MIN_SCALE_FACTOR, Math.min(GameWorld.MAX_SCALE_FACTOR, targetScale));
        }

        // Smooth transition to target scale
        this.scaleFactor = this.scaleFactor + (targetScale - this.scaleFactor) * GameWorld.SCALE_TRANSITION_SPEED;
    }

    getScaleFactor() {
        return this.scaleFactor;
    }

    step() {
        this.world.step(1 / 60);
    }

    getPhysicsWorld() {
        return this.world;
    }

    setTrack(track) {
        this.track = track;
    }

    getTrack() {
        return this.track;
    }
}
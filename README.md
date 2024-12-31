# 2D Racing Game

A browser-based 2D racing game built with p5.js and p2.js physics engine. Race against time while hitting checkpoints in the correct order to complete the track.

## Features

- Physics-based car movement with realistic handling
- Dynamic checkpoint system
- Real-time race statistics
- Finish line detection
- Collision detection with track walls
- Smooth camera following

## Controls

- **Up Arrow**: Accelerate
- **Down Arrow**: Brake/Reverse
- **Left Arrow**: Steer left
- **Right Arrow**: Steer right

## Gameplay

1. The timer starts on your first input
2. Hit all checkpoints in order
3. Find and cross the finish line after collecting all checkpoints
4. Try to achieve the best time!

## Technical Details

### Libraries Used
- p5.js for rendering
- p2.js for physics simulation

### Key Components

- **Car.js**: Handles vehicle physics, controls, and UI
- **Track.js**: Manages track generation, checkpoints, and collision detection
- **main.js**: Game loop and setup
- **World.js**: Physics world configuration

### Physics Implementation

- Top-down vehicle physics model
- Realistic friction and collision responses
- Momentum-preserving finish line behavior

## Development

### Prerequisites

- Web browser with JavaScript enabled
- Local web server (recommended for development)

### Setup

1. Clone the repository
2. Serve the files using a local web server
3. Open `index.html` in your browser

## Assets

- Custom F1-style car sprites
- Track textures
- Checkpoint markers

## License

MIT License

Copyright (c) 2024

Licensed under MIT - see https://opensource.org/licenses/MIT for full terms.
Feel free to use, modify, and share this code freely while maintaining the license notice.
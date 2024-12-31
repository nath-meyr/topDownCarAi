class Track {
    // Constants for track configuration
    static CHECKPOINT_GROUP = 19238;
    static START_GROUP = 19239;
    static FINISH_GROUP = 19240;
    static ROAD_WIDTH = 8;
    static WALL_THICKNESS = 0.3;
    static DEFAULT_CURVE_ANGLE = 90;
    static CURVE_STEPS = 10;
    static CURVE_DRAW_STEPS = 20;
    static DEBUG_COLOR = [255, 0, 255];
    static ROAD_COLOR = 100;
    static WALL_COLOR = 0;
    static START_LINE_COLOR = [0, 255, 0]; // Green for start line
    static FINISH_LINE_COLOR = [255, 0, 0]; // Red for finish line
    static CHECKPOINT_COLOR = [0, 0, 255];  // Blue for checkpoints
    static COLLISION_GROUP = {
        CAR: Math.pow(2, 0),
        WALL: Math.pow(2, 1),
        CHECKPOINT: Math.pow(2, 2),
        START: Math.pow(2, 3),
        FINISH: Math.pow(2, 4)
    };

    debug = true;
    type = 'loop';
    track = [];
    checkpoints = [];
    startLine = null;
    finishLine = null;
    wallOptions = {
        isStatic: true,
        collisionResponse: true
    };
    trackDefinition = [
        { type: 's', length: 40 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 30 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 10 },
        { type: 'c', radius: 6, direction: 'r' },
        { type: 's', length: 10 },
        { type: 'c', radius: 6, direction: 'r' },
        { type: 's', length: 30 },
        { type: 'c', radius: 6, direction: 'r' },
        { type: 's', length: 10 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 10 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 30 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 60 },
        { type: 'c', radius: 6, direction: 'l', angle: 45 },
        { type: 's', length: 20 },
        { type: 'c', radius: 6, direction: 'l', angle: 45 },
        { type: 's', length: 16 },
        { type: 'c', radius: 6, direction: 'r' },
        { type: 's', length: 5 },
        { type: 'c', radius: 6, direction: 'l' },
        { type: 's', length: 30 },
        { type: 'c', radius: 6, direction: 'l' },
    ];

    constructor(world) {
        this.world = world;
    }

    setup() {
        let currentPosition = createVector(0, 0);
        let currentAngle = 0;
        let startPosition = currentPosition.copy();

        for (let segment of this.trackDefinition) {
            if (segment.type === 'straight' || segment.type === 's') {
                this.createStraightWalls(segment, currentPosition, currentAngle);
                let angleRad = radians(currentAngle);
                let dx = segment.length * cos(angleRad);
                let dy = segment.length * sin(angleRad);
                currentPosition = createVector(currentPosition.x + dx, currentPosition.y + dy);
            } else if (segment.type === 'curve' || segment.type === 'c') {
                const angles = this.calculateCurveAngles(segment, currentAngle);
                if (!angles) continue;

                this.createCurveWalls(segment, currentPosition, angles);
                const result = this.calculateCurveEndpoint(segment, currentPosition, angles);
                currentPosition = result.position;
                currentAngle = result.angle;
            }

            //todo remove checkpoint from last segment
            // Create checkpoint at the end of each segment
            this.createCheckpoint(currentPosition, currentAngle);
        }

        if (this.type === 'loop') {
            this.createLoopConnection(currentPosition, currentAngle, startPosition);
        }

        let endPosition = currentPosition.copy();
        if (this.type === 'loop') {
            endPosition = startPosition.copy();
        }
        // Create start/finish line
        this.createStartFinishLine(startPosition, endPosition, currentAngle);
    }

    createLoopConnection(currentPosition, currentAngle, startPosition) {
        let angleRad = radians(currentAngle);
        let perpAngle = angleRad + Math.PI / 2;
        let offsetX = (Track.ROAD_WIDTH / 2) * cos(perpAngle);  // Divide by 2 since we want half width offset
        let offsetY = (Track.ROAD_WIDTH / 2) * sin(perpAngle);  // Divide by 2 since we want half width offset

        this.createWallBody(
            currentPosition.x + offsetX,
            currentPosition.y + offsetY,
            startPosition.x + offsetX,
            startPosition.y + offsetY
        );
        this.createWallBody(
            currentPosition.x - offsetX,
            currentPosition.y - offsetY,
            startPosition.x - offsetX,
            startPosition.y - offsetY
        );
    }

    createWallBody(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;

        const wall = new p2.Body({
            mass: 0,
            position: [centerX, centerY],
            angle: angle
        });

        const shape = new p2.Box({
            width: length,
            height: Track.WALL_THICKNESS,
            collisionGroup: Track.COLLISION_GROUP.WALL,
            collisionMask: Track.COLLISION_GROUP.CAR
        });
        wall.addShape(shape);

        this.world.addBody(wall);
        return wall;
    }

    createStraightWalls(segment, currentPosition, currentAngle) {
        let angleRad = radians(currentAngle);
        let dx = segment.length * cos(angleRad);
        let dy = segment.length * sin(angleRad);
        let endPosition = createVector(currentPosition.x + dx, currentPosition.y + dy);

        let perpAngle = angleRad + Math.PI / 2;
        let offsetX = (Track.ROAD_WIDTH / 2) * cos(perpAngle);  // Divide by 2 since we want half width offset
        let offsetY = (Track.ROAD_WIDTH / 2) * sin(perpAngle);  // Divide by 2 since we want half width offset

        this.createWallBody(
            currentPosition.x + offsetX,
            currentPosition.y + offsetY,
            endPosition.x + offsetX,
            endPosition.y + offsetY
        );

        this.createWallBody(
            currentPosition.x - offsetX,
            currentPosition.y - offsetY,
            endPosition.x - offsetX,
            endPosition.y - offsetY
        );
    }

    drawStraightSegment(segment, currentPosition, currentAngle) {
        let angleRad = radians(currentAngle);
        let dx = segment.length * cos(angleRad);
        let dy = segment.length * sin(angleRad);
        let endPosition = createVector(currentPosition.x + dx, currentPosition.y + dy);

        let perpAngle = angleRad + Math.PI / 2;
        let offsetX = (Track.ROAD_WIDTH / 2) * cos(perpAngle);  // Divide by 2 since we want half width offset
        let offsetY = (Track.ROAD_WIDTH / 2) * sin(perpAngle);  // Divide by 2 since we want half width offset

        return {
            endPosition,
            roadSurface: { start: currentPosition, end: endPosition },
            walls: {
                start: currentPosition,
                end: endPosition,
                offsetX,
                offsetY
            },
        };
    }

    drawRoadSurface(start, end) {
        line(start.x, start.y, end.x, end.y);
    }

    drawWalls(start, end, offsetX, offsetY) {
        line(
            start.x + offsetX,
            start.y + offsetY,
            end.x + offsetX,
            end.y + offsetY
        );

        line(
            start.x - offsetX,
            start.y - offsetY,
            end.x - offsetX,
            end.y - offsetY
        );
    }

    calculateCurveAngles(segment, currentAngle) {
        let startAngle = currentAngle;
        let endAngle;
        let directionMultiplier = 1;

        if (segment.direction === 'right' || segment.direction === 'r') {
            endAngle = currentAngle + (segment.angle || Track.DEFAULT_CURVE_ANGLE);
            directionMultiplier = 1;
        } else if (segment.direction === 'left' || segment.direction === 'l') {
            endAngle = currentAngle - (segment.angle || Track.DEFAULT_CURVE_ANGLE);
            directionMultiplier = -1;
        } else {
            console.error('Invalid curve direction. Must be "left" or "right"');
            return null;
        }

        return { startAngle, endAngle, directionMultiplier };
    }

    createCurveWalls(segment, currentPosition, angles) {
        const { startAngle, endAngle, directionMultiplier } = angles;
        let steps = Track.CURVE_STEPS;
        let angleStep = (endAngle - startAngle) / steps;

        let startAngleRad = radians(startAngle);
        let centerX = currentPosition.x + (directionMultiplier * segment.radius * cos(startAngleRad + Math.PI / 2));
        let centerY = currentPosition.y + (directionMultiplier * segment.radius * sin(startAngleRad + Math.PI / 2));

        let innerRadius = segment.radius - (Track.ROAD_WIDTH / 2);  // Divide by 2 since we want half width offset
        let outerRadius = segment.radius + (Track.ROAD_WIDTH / 2);  // Divide by 2 since we want half width offset

        let prevInnerX, prevInnerY, prevOuterX, prevOuterY;

        for (let i = 0; i <= steps; i++) {
            let angle = radians(startAngle + i * angleStep);

            let innerX = centerX + (directionMultiplier * innerRadius * cos(angle - Math.PI / 2));
            let innerY = centerY + (directionMultiplier * innerRadius * sin(angle - Math.PI / 2));
            let outerX = centerX + (directionMultiplier * outerRadius * cos(angle - Math.PI / 2));
            let outerY = centerY + (directionMultiplier * outerRadius * sin(angle - Math.PI / 2));

            if (i > 0) {
                this.createWallBody(prevInnerX, prevInnerY, innerX, innerY);
                this.createWallBody(prevOuterX, prevOuterY, outerX, outerY);
            }

            prevInnerX = innerX;
            prevInnerY = innerY;
            prevOuterX = outerX;
            prevOuterY = outerY;
        }
    }

    calculateCurveEndpoint(segment, currentPosition, angles) {
        const { startAngle, endAngle, directionMultiplier } = angles;
        let startAngleRad = radians(startAngle);
        let centerX = currentPosition.x + (directionMultiplier * segment.radius * cos(startAngleRad + Math.PI / 2));
        let centerY = currentPosition.y + (directionMultiplier * segment.radius * sin(startAngleRad + Math.PI / 2));

        let endAngleRad = radians(endAngle);
        let newPosition = createVector(
            centerX + (directionMultiplier * segment.radius * cos(endAngleRad - Math.PI / 2)),
            centerY + (directionMultiplier * segment.radius * sin(endAngleRad - Math.PI / 2))
        );

        return { position: newPosition, angle: endAngle };
    }

    drawCurveSegment(segment, currentPosition, angles) {
        const { startAngle, endAngle, directionMultiplier } = angles;
        let steps = Track.CURVE_DRAW_STEPS;
        let angleStep = (endAngle - startAngle) / steps;

        let startAngleRad = radians(startAngle);
        let centerX = currentPosition.x + (directionMultiplier * segment.radius * cos(startAngleRad + Math.PI / 2));
        let centerY = currentPosition.y + (directionMultiplier * segment.radius * sin(startAngleRad + Math.PI / 2));

        let innerRadius = segment.radius - (Track.ROAD_WIDTH / 2);  // Divide by 2 since we want half width offset
        let outerRadius = segment.radius + (Track.ROAD_WIDTH / 2);  // Divide by 2 since we want half width offset
        let middleRadius = segment.radius;

        return {
            ...this.calculateCurveEndpoint(segment, currentPosition, angles),
            roadSurface: { centerX, centerY, startAngle, steps, angleStep, directionMultiplier, radius: middleRadius },
            walls: { centerX, centerY, startAngle, steps, angleStep, directionMultiplier, innerRadius, outerRadius },
        };
    }

    drawCurveWalls(centerX, centerY, startAngle, steps, angleStep, directionMultiplier, innerRadius, outerRadius) {
        beginShape();
        for (let i = 0; i <= steps; i++) {
            let angle = radians(startAngle + i * angleStep);
            let x = centerX + (directionMultiplier * innerRadius * cos(angle - Math.PI / 2));
            let y = centerY + (directionMultiplier * innerRadius * sin(angle - Math.PI / 2));
            vertex(x, y);
        }
        endShape();

        beginShape();
        for (let i = 0; i <= steps; i++) {
            let angle = radians(startAngle + i * angleStep);
            let x = centerX + (directionMultiplier * outerRadius * cos(angle - Math.PI / 2));
            let y = centerY + (directionMultiplier * outerRadius * sin(angle - Math.PI / 2));
            vertex(x, y);
        }
        endShape();
    }

    drawCurveRoadSurface(centerX, centerY, startAngle, steps, angleStep, directionMultiplier, radius) {
        beginShape();
        for (let i = 0; i <= steps; i++) {
            let angle = radians(startAngle + i * angleStep);
            let x = centerX + (directionMultiplier * radius * cos(angle - Math.PI / 2));
            let y = centerY + (directionMultiplier * radius * sin(angle - Math.PI / 2));
            vertex(x, y);
        }
        endShape();
    }

    draw() {
        noFill();

        let currentPosition = createVector(0, 0);
        let currentAngle = 0;
        let startPosition = currentPosition.copy();

        // Collect all drawing instructions
        let roadSurfaceInstructions = [];
        let wallsInstructions = [];

        // Gather all drawing instructions
        for (let segment of this.trackDefinition) {
            if (segment.type === 'straight' || segment.type === 's') {
                const drawData = this.drawStraightSegment(segment, currentPosition, currentAngle);
                roadSurfaceInstructions.push({ type: 'straight', data: drawData.roadSurface });
                wallsInstructions.push({ type: 'straight', data: drawData.walls });
                currentPosition = drawData.endPosition;
            } else if (segment.type === 'curve' || segment.type === 'c') {
                const angles = this.calculateCurveAngles(segment, currentAngle);
                if (!angles) continue;

                const drawData = this.drawCurveSegment(segment, currentPosition, angles);
                roadSurfaceInstructions.push({ type: 'curve', data: drawData.roadSurface });
                wallsInstructions.push({ type: 'curve', data: drawData.walls });
                currentPosition = drawData.position;
                currentAngle = drawData.angle;
            }
        }

        if (this.type === 'loop') {
            // Add loop connection to drawing instructions
            roadSurfaceInstructions.push({
                type: 'straight',
                data: { start: currentPosition, end: startPosition }
            });

            wallsInstructions.push({
                type: 'straight',
                data: {
                    start: currentPosition,
                    end: startPosition,
                    offsetX: (Track.ROAD_WIDTH / 2) * cos(radians(currentAngle) + Math.PI / 2),
                    offsetY: (Track.ROAD_WIDTH / 2) * sin(radians(currentAngle) + Math.PI / 2)
                }
            });
        }

        // Draw all road surfaces
        this.drawAllRoadSurface(Track.ROAD_COLOR, Track.ROAD_WIDTH, roadSurfaceInstructions);

        // Draw all walls
        stroke(Track.WALL_COLOR);
        strokeWeight(0.5);
        for (const instruction of wallsInstructions) {
            if (instruction.type === 'straight') {
                this.drawWalls(
                    instruction.data.start,
                    instruction.data.end,
                    instruction.data.offsetX,
                    instruction.data.offsetY
                );
            } else {
                this.drawCurveWalls(
                    instruction.data.centerX,
                    instruction.data.centerY,
                    instruction.data.startAngle,
                    instruction.data.steps,
                    instruction.data.angleStep,
                    instruction.data.directionMultiplier,
                    instruction.data.innerRadius,
                    instruction.data.outerRadius
                );
            }
        }

        if (this.debug) {
            this.drawAllRoadSurface(Track.DEBUG_COLOR, 0.05, roadSurfaceInstructions);
        }

        // Draw start/finish and checkpoints
        this.drawStartFinishLine();
        this.drawCheckpoints();
    }

    drawAllRoadSurface(color, width, roadInstructions) {
        stroke(color);
        strokeWeight(width);
        for (const instruction of roadInstructions) {
            if (instruction.type === 'straight') {
                this.drawRoadSurface(instruction.data.start, instruction.data.end);
            } else {
                this.drawCurveRoadSurface(
                    instruction.data.centerX,
                    instruction.data.centerY,
                    instruction.data.startAngle,
                    instruction.data.steps,
                    instruction.data.angleStep,
                    instruction.data.directionMultiplier,
                    instruction.data.radius
                );
            }
        }
    }

    createStartFinishLine(startPosition, endPosition, currentAngle) {
        const perpendicularAngle = currentAngle + 90;
        this.createLineBody(startPosition, perpendicularAngle, Track.START_GROUP);
        this.createLineBody(endPosition, perpendicularAngle, Track.FINISH_GROUP);
        this.startLine = { position: startPosition.copy(), angle: perpendicularAngle };
        this.finishLine = { position: endPosition.copy(), angle: perpendicularAngle };
    }

    createCheckpoint(position, angle) {
        const perpendicularAngle = angle + 90;
        const checkpointBody = this.createLineBody(position, perpendicularAngle, Track.CHECKPOINT_GROUP);
        checkpointBody.checkpointIndex = this.checkpoints.length;
        this.checkpoints.push({ position: position.copy(), angle: perpendicularAngle });
    }

    createLineBody(position, angle = 0, group = Track.CHECKPOINT_GROUP) {
        const p2line = new p2.Body({
            mass: 0,
            position: [position.x, position.y],
            angle: radians(angle),
            collisionResponse: false,
        });

        // Set up collision groups based on the line type
        let collisionGroup, collisionMask;
        switch (group) {
            case Track.CHECKPOINT_GROUP:
                collisionGroup = Track.COLLISION_GROUP.CHECKPOINT;
                break;
            case Track.START_GROUP:
                collisionGroup = Track.COLLISION_GROUP.START;
                break;
            case Track.FINISH_GROUP:
                collisionGroup = Track.COLLISION_GROUP.FINISH;
                break;
            default:
                collisionGroup = Track.COLLISION_GROUP.WALL;
        }

        const shape = new p2.Box({
            width: Track.ROAD_WIDTH,
            height: Track.WALL_THICKNESS,
            collisionGroup: collisionGroup,
            // The shape should collide with the car
            collisionMask: Track.COLLISION_GROUP.CAR
        });
        p2line.addShape(shape);

        this.world.addBody(p2line);
        return p2line;
    }

    drawStartFinishLine() {
        if (this.startLine && this.finishLine) {
            // Draw finish line
            stroke(Track.FINISH_LINE_COLOR);
            strokeWeight(Track.WALL_THICKNESS);
            const finishAngleRad = radians(this.finishLine.angle);
            const finishOffsetX = (Track.ROAD_WIDTH / 2) * cos(finishAngleRad);
            const finishOffsetY = (Track.ROAD_WIDTH / 2) * sin(finishAngleRad);
            const finishPerpOffsetX = -cos(finishAngleRad - Math.PI / 2) * 0.2; // Small perpendicular offset
            const finishPerpOffsetY = -sin(finishAngleRad - Math.PI / 2) * 0.2;
            line(
                this.finishLine.position.x - finishOffsetX + finishPerpOffsetX,
                this.finishLine.position.y - finishOffsetY + finishPerpOffsetY,
                this.finishLine.position.x + finishOffsetX + finishPerpOffsetX,
                this.finishLine.position.y + finishOffsetY + finishPerpOffsetY
            );

            // Draw start line
            stroke(Track.START_LINE_COLOR);
            strokeWeight(Track.WALL_THICKNESS);
            const startAngleRad = radians(this.startLine.angle);
            const startOffsetX = (Track.ROAD_WIDTH / 2) * cos(startAngleRad);
            const startOffsetY = (Track.ROAD_WIDTH / 2) * sin(startAngleRad);
            const startPerpOffsetX = cos(startAngleRad - Math.PI / 2) * 0.2; // Small perpendicular offset in opposite direction
            const startPerpOffsetY = sin(startAngleRad - Math.PI / 2) * 0.2;
            line(
                this.startLine.position.x - startOffsetX + startPerpOffsetX,
                this.startLine.position.y - startOffsetY + startPerpOffsetY,
                this.startLine.position.x + startOffsetX + startPerpOffsetX,
                this.startLine.position.y + startOffsetY + startPerpOffsetY
            );
        }
    }

    drawCheckpoints() {
        stroke(Track.CHECKPOINT_COLOR);
        strokeWeight(Track.WALL_THICKNESS);
        for (const checkpoint of this.checkpoints) {
            const angleRad = radians(checkpoint.angle);
            const offsetX = (Track.ROAD_WIDTH / 2) * cos(angleRad);
            const offsetY = (Track.ROAD_WIDTH / 2) * sin(angleRad);

            line(
                checkpoint.position.x - offsetX,
                checkpoint.position.y - offsetY,
                checkpoint.position.x + offsetX,
                checkpoint.position.y + offsetY
            );
        }
    }

    getTotalCheckpoints() {
        return this.checkpoints.length;
    }
}
class Track {
    trackSegmentsConfig = [];
    curveSegmentsConfig = [];
    track = [];

    constructor(world) {
        this.world = world;


        this.generateSegments();
    }

    generateSegments() {
        this.trackSegmentsConfig = [
            // [x, y, width, length, angle]
            [0, 0, 4, 10, 90],  // Right
            [7, -22, 4, 40, 0],    // Top
            // [4, 40, 90],  // Left
            // [4, 40, 0],   // Bottom
            // [4, 40, 90],   // Right
        ];

        this.curveSegmentsConfig = [
            // [x, y, width, length, startAngle, endAngle, segments]
            [5, -2, 4, 2, 0, 90, 20]  // Curve from top to right segment
        ];
    }

    setup() {
        this.createStraightSegments();
        this.createCurvedSegments();
    }

    createStraightSegments() {
        this.trackSegmentsConfig.forEach(([x, y, width, length, angle]) => {
            const angleRad = angle * Math.PI / 180;
            const wallOffset = width / 2 + WALL_THICKNESS / 2;

            this.createWallPair(x, y, wallOffset, angleRad, length);
        });
    }

    createWallPair(x, y, wallOffset, angleRad, length) {
        // Left wall
        const leftWall = this.createWall(
            x - wallOffset * Math.cos(angleRad),
            y - wallOffset * Math.sin(angleRad),
            angleRad,
            length
        );
        this.track.push(leftWall);

        // Right wall
        const rightWall = this.createWall(
            x + wallOffset * Math.cos(angleRad),
            y + wallOffset * Math.sin(angleRad),
            angleRad,
            length
        );
        this.track.push(rightWall);
    }

    createWall(x, y, angle, length) {
        const wall = new p2.Body({ ...WALL_OPTIONS });
        wall.addShape(new p2.Box({ width: WALL_THICKNESS, height: length }));
        wall.position[0] = x;
        wall.position[1] = y;
        wall.angle = angle;
        this.world.addBody(wall);
        return wall;
    }

    createCurvedSegments() {
        this.curveSegmentsConfig.forEach(([centerX, centerY, width, radius, startAngle, endAngle, segments]) => {
            const startRad = startAngle * Math.PI / 180;
            const endRad = endAngle * Math.PI / 180;
            const angleStep = (endRad - startRad) / segments;
            const wallOffset = width / 2 + WALL_THICKNESS / 2;

            this.createCurveWalls(centerX, centerY, radius, width, wallOffset, startRad, angleStep, segments);
        });
    }

    createCurveWalls(centerX, centerY, radius, width, wallOffset, startRad, angleStep, segments) {
        for (let i = 0; i < segments; i++) {
            const angle = startRad + i * angleStep;
            const midAngle = angle + angleStep / 2;

            // Create inner wall if segment is long enough
            if (radius * angleStep >= width / 2) {
                const innerWall = this.createCurveWall(
                    centerX,
                    centerY,
                    radius - wallOffset,
                    radius * angleStep,
                    midAngle
                );
                this.track.push(innerWall);
            }

            // Create outer wall
            const outerWall = this.createCurveWall(
                centerX,
                centerY,
                radius + wallOffset,
                (radius + width) * angleStep,
                midAngle
            );
            this.track.push(outerWall);
        }
    }

    createCurveWall(centerX, centerY, radius, length, angle) {
        const wall = new p2.Body({ ...WALL_OPTIONS });
        wall.addShape(new p2.Box({ width: WALL_THICKNESS, height: length }));
        wall.position[0] = centerX + radius * Math.cos(angle);
        wall.position[1] = centerY + radius * Math.sin(angle);
        wall.angle = angle;
        this.world.addBody(wall);
        return wall;
    }

    draw() {
        // Draw track walls
        for (const trackSegment of this.track) {
            this.drawTrackSegment(trackSegment);
        }
        this.drawCenterLine();
    }

    drawCenterLine() {
        // Draw center lines
        stroke(0, 255, 0); // Green color
        strokeWeight(0.1);

        // Draw straight segment center lines
        this.trackSegmentsConfig.forEach(([x, y, width, length, angle]) => {
            const angleRad = angle * Math.PI / 180;
            // Calculate start and end points from center
            const halfLength = length / 2;
            const x1 = x - halfLength * Math.sin(angleRad);
            const y1 = y - halfLength * Math.cos(angleRad);
            const x2 = x + halfLength * Math.sin(angleRad);
            const y2 = y + halfLength * Math.cos(angleRad);
            line(x1, y1, x2, y2);
        });

        // Draw curved segment center lines
        this.curveSegmentsConfig.forEach(([centerX, centerY, width, radius, startAngle, endAngle, segments]) => {
            const startRad = startAngle * Math.PI / 180;
            const endRad = endAngle * Math.PI / 180;
            beginShape();
            noFill();
            for (let i = 0; i <= segments; i++) {
                const angle = startRad + (i / segments) * (endRad - startRad);
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                vertex(x, y);
            }
            endShape();
        });
    }

    drawTrackSegment(segment) {
        beginShape();
        const vertices = segment.shapes[0].vertices;
        for (let i = 0; i < vertices.length; i++) {
            const worldPoint = p2.vec2.create();
            segment.toWorldFrame(worldPoint, vertices[i]);
            vertex(worldPoint[0], worldPoint[1]);
        }
        endShape(CLOSE);
    }
}

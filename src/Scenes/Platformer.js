class State {
    constructor(stateMachine, player) {
        this.stateMachine = stateMachine;
        this.player = player;
    }
    enter() {}
    execute() {}
    exit() {}
}

class IdleState extends State {
    enter() {
        this.player.fullSprite.play('idle');
        this.player.physics.setVelocityX(0);
        this.player.physics.setDragX(this.player.DRAG);
        if (this.player.physics.body.blocked.down) { // Reset if entering idle while grounded
            this.player.hasAirDashed = false;
        }
    }

    execute() {
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash) {
            if (this.player.physics.body.blocked.down) { // Check if grounded
                this.stateMachine.transition('groundDash');
            }
            // Note: You generally wouldn't dash from idle if in the air,
            // but if that logic changes, you'd add an else for airDash.
            return;
        }
        
        if (this.player.physics.body.blocked.down) {
            if (this.player.cursors.left.isDown || this.player.cursors.right.isDown) {
                this.stateMachine.transition('run');
            } else if (Phaser.Input.Keyboard.JustDown(this.player.jumpKey)) {
                this.stateMachine.transition('jump');
            }
        } else { // In the air
            const onWall = (this.player.physics.body.blocked.left || this.player.physics.body.blocked.right);
            const pressingIntoWall =
                (this.player.physics.body.blocked.left && this.player.cursors.left.isDown) ||
                (this.player.physics.body.blocked.right && this.player.cursors.right.isDown);

            if (this.player.scene.time.now > this.player.wallJumpGraceTimer &&
                onWall && pressingIntoWall && this.player.physics.body.velocity.y > 0) {
                this.stateMachine.transition('wallSlide');
            } else {
                this.stateMachine.transition('jump'); // Or a dedicated 'fall' state
            }
        }
    }
}

class RunState extends State {
    enter() {
        this.player.fullSprite.play('run');
        if (this.player.physics.body.blocked.down) { // Reset if entering run while grounded
            this.player.hasAirDashed = false;
        }
    }

    execute() {
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash) {
            // Run state implies player is on the ground
            this.stateMachine.transition('groundDash');
            return;
        }
        
        if (this.player.cursors.left.isDown) {
            this.player.physics.setVelocityX(-this.player.MAX_SPEED);
            this.player.setFacingDirection(-1);
        } else if (this.player.cursors.right.isDown) {
            this.player.physics.setVelocityX(this.player.MAX_SPEED);
            this.player.setFacingDirection(1);
        } else {
            this.stateMachine.transition('idle');
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.player.jumpKey)) {
            this.stateMachine.transition('jump');
            return;
        }

        // Check for falling off an edge into a wall slide
        if (!this.player.physics.body.blocked.down) {
            const onWall = (this.player.physics.body.blocked.left || this.player.physics.body.blocked.right);
            const pressingIntoWall =
                (this.player.physics.body.blocked.left && this.player.cursors.left.isDown) ||
                (this.player.physics.body.blocked.right && this.player.cursors.right.isDown);

            if (this.player.scene.time.now > this.player.wallJumpGraceTimer &&
                onWall && pressingIntoWall && this.player.physics.body.velocity.y > 0) { // onWall and pressingIntoWall defined locally
                this.stateMachine.transition('wallSlide');
            } else {
                this.stateMachine.transition('jump');
            }
            return;
        }
    }

    exit() {
        this.player.physics.setVelocityX(0);
    }
}

class JumpState extends State {
    enter() {
    this.player.fullSprite.play('jump');
    this.player.physics.setDragX(0);

    if (this.player.physics.body.blocked.down) {
        this.player.physics.setVelocityY(this.player.JUMP_VELOCITY);
        this.player.jumpBeingHeld = true;
        this.player.jumpCutoff = false;
    }
}


    execute() {
        // const onWall = (this.player.physics.body.blocked.left || this.player.physics.body.blocked.right);
        // const pressingIntoWall =
        //     (this.player.physics.body.blocked.left && this.player.cursors.left.isDown) ||
        //     (this.player.physics.body.blocked.right && this.player.cursors.right.isDown);

        if (this.player.jumpBeingHeld && !this.player.jumpKey.isDown && !this.player.jumpCutoff && this.player.physics.body.velocity.y < 0) {
            this.player.physics.setVelocityY(this.player.physics.body.velocity.y * 0.35);
            this.player.jumpCutoff = true;
        }
        if (this.player.jumpKey.isDown) {
            this.player.jumpCutoff = false;
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash && !this.player.hasAirDashed) {
            this.stateMachine.transition('airDash');
            return;
        }

        if (!this.player.isDashing && this.player.shouldWallSlide()) { //
            if (this.player.scene.time.now > this.player.wallJumpGraceTimer) { //
                // console.log(`JumpState: Transitioning to WallSlide. Grace timer allows. Now: ${this.player.scene.time.now}, Grace End: ${this.player.wallJumpGraceTimer}`);
                this.stateMachine.transition('wallSlide'); // <-- ADDED TRANSITION
                return; // <-- ADDED RETURN: Exit after transition
            } else {
                // This log helps confirm if the grace timer is the reason for not sliding
                // console.log(`JumpState: shouldWallSlide() is true, but wallJumpGraceTimer is active. Time: ${this.player.scene.time.now}, Grace ends: ${this.player.wallJumpGraceTimer}`);
            }
        }


        // Horizontal movement
        if (this.player.cursors.left.isDown) {
            this.player.physics.setVelocityX(-this.player.AIR_SPEED);
            this.player.setFacingDirection(-1);
        } else if (this.player.cursors.right.isDown) {
            this.player.physics.setVelocityX(this.player.AIR_SPEED);
            this.player.setFacingDirection(1);
        } else {
            this.player.physics.setVelocityX(0);
        }

        // Air Attack
        if (Phaser.Input.Keyboard.JustDown(this.player.pogoKey)) {
            this.stateMachine.transition('airAttack');
            return; // Prevent immediate transition back if grounded
        }

        // Transition to Idle when grounded
        if (this.player.physics.body.blocked.down && (this.player.cursors.left.isDown || this.player.cursors.right.isDown)) {
            this.stateMachine.transition('run');
        } else if (this.player.physics.body.blocked.down) {
            this.stateMachine.transition('idle');
        }

        // if (this.player.physics.body.blocked.down) {
        //     this.player.hasAirDashed = false; // Reset here
        //     this.stateMachine.transition('idle');
        // }
    }

    exit() {
        this.player.jumpBeingHeld = false;
        this.player.physics.setVelocityX(0);
        // this.player.canWallJump = false; // Reset this here too, just in case
    }
}

class AirAttackState extends State {
    enter() {
        this.player.attackHitbox.setVisible(true);
        this.player.attackHitbox.body.setEnable(true);
        this.player.attackHitbox.x = this.player.physics.x;
        this.player.attackHitbox.y = this.player.physics.y + 40;

        // Delay hitbox activation slightly to avoid instant abuse
        this.hitboxDelayTimer = this.player.scene.time.delayedCall(100, () => {
        this.player.attackHitbox.setVisible(true);
        this.player.attackHitbox.body.setEnable(true);
        this.player.attackHitbox.x = this.player.physics.x;
        this.player.attackHitbox.y = this.player.physics.y + 40;
       });

        this.player.fullSprite.setVisible(false);
        this.player.legsSprite.setVisible(true);
        this.player.upperSprite.setVisible(true);
        this.player.legsSprite.setTexture('legs_up');
        this.player.upperSprite.play('pogoslash1', true);

        this.player._airAttackUpdateHandler = () => {
            let vY = this.player.physics.body.velocity.y;
            if (vY < -600) {
                this.player.legsSprite.setTexture('legs_up');
            } else if (vY < -200) {
                this.player.legsSprite.setTexture('legs_max');
            } else {
                this.player.legsSprite.setTexture('legs_down');
            }
        };

        this.player.upperSprite.on('animationupdate', this.player._airAttackUpdateHandler);

        this.player.upperSprite.once('animationcomplete', () => {
            this.player.fullSprite.setVisible(true);
            this.player.legsSprite.setVisible(false);
            this.player.upperSprite.setVisible(false);
            this.player.upperSprite.off('animationupdate', this.player._airAttackUpdateHandler);
            this.player._airAttackUpdateHandler = null;
        });

        this.attackTimer = this.player.scene.time.delayedCall(400, () => {
            this.stateMachine.transition('jump');
        });

        this.player.isSliding = false; // Ensure not considered sliding during air attack
        this.player.canWallJump = false;
    }

    execute() {
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash && !this.player.hasAirDashed) {
            // Clear attack timer and other attack-specific cleanup if dashing out of attack
            if (this.attackTimer) this.attackTimer.remove();
            if (this.hitboxDelayTimer) this.hitboxDelayTimer.remove();
            this.player.attackHitbox.setVisible(false);
            this.player.attackHitbox.body.setEnable(false);
            if (this.player._airAttackUpdateHandler) {
                this.player.upperSprite.off('animationupdate', this.player._airAttackUpdateHandler);
                this.player._airAttackUpdateHandler = null;
            }
            this.player.fullSprite.setVisible(true); // Ensure full sprite is visible for dash
            this.player.legsSprite.setVisible(false);
            this.player.upperSprite.setVisible(false);

            this.stateMachine.transition('airDash');
            return;
        }

        if (this.player.cursors.left.isDown) {
            this.player.physics.setVelocityX(-this.player.POGO_AIR_CONTROL_SPEED);
            // For pogo, usually, you don't change facing direction, but if you want to:
            // this.player.setFacingDirection(-1);
        } else if (this.player.cursors.right.isDown) {
            this.player.physics.setVelocityX(this.player.POGO_AIR_CONTROL_SPEED);
            // this.player.setFacingDirection(1);
        } else {
            // What happens when no horizontal input is pressed during pogo:
            // Option 1: Actively stop horizontal movement (makes pogo feel very deliberate).
            // this.player.physics.setVelocityX(0);

            // Option 2: Gradually decay existing horizontal momentum (feels more natural if you had speed entering the pogo).
            this.player.physics.setVelocityX(this.player.physics.body.velocity.x * 0.95); // Tune the multiplier (0.90 to 0.98)

            // Option 3: Maintain existing horizontal velocity (comment out any setVelocityX(0) or decay).
            // No line here means velocityX remains as it was from before the pogo or from the last frame.
        }

        const onWall = (this.player.physics.body.blocked.left || this.player.physics.body.blocked.right);
        const pressingIntoWall =
            (this.player.physics.body.blocked.left && this.player.cursors.left.isDown) ||
            (this.player.physics.body.blocked.right && this.player.cursors.right.isDown);

        if (!this.attackTimer || this.attackTimer.getProgress() === 1) { // If attack timer is done or doesn't exist
             if (onWall && !this.player.physics.body.blocked.down && this.player.physics.body.velocity.y > 0 && pressingIntoWall) {
                this.stateMachine.transition('wallSlide');
                return;
            }
        }


        if (!this.player.attackHitbox.body.enable) return;
        this.player.attackHitbox.x = this.player.physics.x;
        this.player.attackHitbox.y = this.player.physics.y - 10;
    }

    exit() {
        this.player.attackHitbox.setVisible(false);
        this.player.attackHitbox.body.setEnable(false);

        if (this.hitboxDelayTimer) this.hitboxDelayTimer.remove();
        this.player.attackHitbox.setVisible(false);
        this.player.attackHitbox.body.setEnable(false);

        if (this.attackTimer) this.attackTimer.remove();
        if (this.player._airAttackUpdateHandler) {
            this.player.upperSprite.off('animationupdate', this.player._airAttackUpdateHandler);
            this.player._airAttackUpdateHandler = null;
        }
    }
}


class WallSlideState extends State {
    enter() {
        this.player.fullSprite.play('wallSlide');
        this.player.physics.setVelocityY(0); // Initially stop vertical movement
        this.player.physics.setVelocityX(0); // CRITICAL: Stop horizontal movement that might pull away from the wall

        const body = this.player.physics.body;
        let facingDirectionToSet = 0;
        let determinedLastWallSide = null;
        let wallSideBasedOnBlocked = null; // <<< DECLARED HERE


        

        // Determine wall and facing direction
        // It's possible body.blocked is not yet true if shouldWallSlide was based on a tile edge graze
        // So, prioritize current input if body.blocked isn't definitive yet.
        if (body.blocked.left) {
            facingDirectionToSet = -1; // Face right (away from left wall)
            determinedLastWallSide = 'left';
        } else if (body.blocked.right) {
            facingDirectionToSet = 1; // Face left (away from right wall)
            determinedLastWallSide = 'right';
        } else if (this.player.cursors.left.isDown && this.player.physics.body.velocity.y > 0) {
            // If pressing left and falling, likely trying to attach to a left wall
            // Check if a wall is *actually* there if body.blocked.left isn't true yet.
            // For now, assume input means intent if body.blocked isn't yet set from a hard collision.
            facingDirectionToSet = 1;
            determinedLastWallSide = 'left';
        } else if (this.player.cursors.right.isDown && this.player.physics.body.velocity.y > 0) {
            // If pressing right and falling
            facingDirectionToSet = -1;
            determinedLastWallSide = 'right';
        }


        if (determinedLastWallSide) {
            this.player.lastWallSide = determinedLastWallSide;
            if (facingDirectionToSet !== 0) {
                this.player.setFacingDirection(facingDirectionToSet, true); // Force the direction
            }

            const immediateNudgeForce = 15; // Or try 20-30
            if (wallSideBasedOnBlocked === 'left') {
                this.player.physics.setVelocityX(-immediateNudgeForce);
            } else if (wallSideBasedOnBlocked === 'right') {
                this.player.physics.setVelocityX(immediateNudgeForce);
            }
        } else {
            // If still no wall determined (e.g., entered from a state where input wasn't held, or no wall nearby)
            console.warn("WallSlideState enter: Could not determine a wall to slide on based on current body.blocked or input. Transitioning to jump.");
            this.stateMachine.transition('jump'); // Bail out
            return;
        }

        console.log(`Entering WallSlide, lastWallSide: ${this.player.lastWallSide}, Facing: ${this.player.container.scaleX > 0 ? 1 : -1}, VelX After Nudge: ${this.player.physics.body.velocity.x.toFixed(2)}`); // Keep your log
        
        this.player.timeLostWallContact = 0;

        this.player.isSliding = true;
        this.player.canWallJump = true;
        this.player.hasAirDashed = false;
    }

    execute() {
        const body = this.player.physics.body;
        const cursors = this.player.cursors;
        const sceneTime = this.player.scene.time; // Get reference to scene.time


        // --- Primary Exits (Should interrupt sliding immediately) ---

        // 1. Dash Off Wall
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash && !this.player.hasAirDashed) {
            this.stateMachine.transition('airDash');
            return;
        }

        // 2. Wall Jump
        if (Phaser.Input.Keyboard.JustDown(this.player.jumpKey)) {
            this.stateMachine.transition('wallJump');
            return;
        }

        // 3. Explicit Detach (Pressing away from the wall)
        let explicitlyDetaching = false;
        if (this.player.lastWallSide === 'left' && cursors.right.isDown && !cursors.left.isDown) {
            explicitlyDetaching = true;
        } else if (this.player.lastWallSide === 'right' && cursors.left.isDown && !cursors.right.isDown) {
            explicitlyDetaching = true;
        }

        if (explicitlyDetaching) {
            this.player.wallJumpGraceTimer = this.player.scene.time.now + 150; // Grace of 150ms for explicit detach
            this.player.physics.setVelocityX(0); // Stop any inward hold if detaching
            this.stateMachine.transition('jump');
            return;
        }

        // --- Apply Slide Dynamics ---
        this.player.physics.setVelocityY(this.player.WALL_SLIDE_SPEED);

        // Apply a slight inward force to maintain contact IF NOT detaching AND pressing into wall
        const wallStickForce = 100; // Small force, adjust as needed.
        if (this.player.lastWallSide === 'left' && cursors.left.isDown) {
            this.player.physics.setVelocityX(-wallStickForce);
        } else if (this.player.lastWallSide === 'right' && cursors.right.isDown) {
            this.player.physics.setVelocityX(wallStickForce);
        } else {
            // If not pressing into the wall, don't apply stick force. Player might detach.
            // Set X velocity to 0 to prevent carrying over old stick force or other momentum.
            this.player.physics.setVelocityX(0);
        }

        // --- Conditions to Stop Sliding (and transition) ---

        // A. Hit the ground
        if (body.blocked.down) {
            this.stateMachine.transition('idle');
            return;
        }

        // B. No longer falling (e.g., hit an overhang that's not ground but stops Y movement)
        // Only transition if Y velocity is not already being driven by WALL_SLIDE_SPEED.
        // This check is usually for external forces stopping the slide.
        // If WALL_SLIDE_SPEED is positive, this means something else made velocity Y <= 0.
        if (body.velocity.y <= 0 && this.player.WALL_SLIDE_SPEED > 0 && !body.blocked.down) {
            console.log(`WS: Vertical movement stopped unexpectedly. VelY: ${body.velocity.y.toFixed(2)}. Transitioning to jump.`);
            this.stateMachine.transition('jump');
            return;
        }

        // C. "Stickiness" Logic: Check if still intending to slide and if the specific wall contact is maintained.
        let isPressingIntoCorrectWall = false;
        let specificWallIsCurrentlyBlocked = false;

        if (this.player.lastWallSide === 'left' && cursors.left.isDown) {
            isPressingIntoCorrectWall = true;
            if (body.blocked.left) {
                specificWallIsCurrentlyBlocked = true;
            }
        } else if (this.player.lastWallSide === 'right' && cursors.right.isDown) {
            isPressingIntoCorrectWall = true;
            if (body.blocked.right) {
                specificWallIsCurrentlyBlocked = true;
            }
        }

        if (isPressingIntoCorrectWall) {
        if (specificWallIsCurrentlyBlocked) {
            // Solid contact with the expected wall, continue wall sliding.
            this.player.timeLostWallContact = 0; // Reset lost contact timer

            // Inner corner switch logic (your existing logic for this is good)
            if (body.blocked.right && this.player.lastWallSide === 'left' && cursors.right.isDown && !cursors.left.isDown) {
                console.log("WS: Switched to right wall in inner corner.");
                this.player.lastWallSide = 'right';
                this.player.setFacingDirection(-1, true);
            } else if (body.blocked.left && this.player.lastWallSide === 'right' && cursors.left.isDown && !cursors.right.isDown) {
                console.log("WS: Switched to left wall in inner corner.");
                this.player.lastWallSide = 'left';
                this.player.setFacingDirection(1, true);
            }
        } else {
            // Pressing into the wall, but the specific wall is NOT currently blocked.
            // Start or check the grace period timer.
            if (this.player.timeLostWallContact === 0) {
                // First frame contact was lost according to physics, start the timer.
                this.player.timeLostWallContact = sceneTime.now + this.player.wallContactGracePeriodDuration;
                console.log(`WS: Initial lost contact with ${this.player.lastWallSide} wall. Grace period started (until ${this.player.timeLostWallContact}). Blocked L/R: <span class="math-inline">\{body\.blocked\.left\}/</span>{body.blocked.right}.`);
            } else if (sceneTime.now > this.player.timeLostWallContact) {
                // Grace period has expired, and contact was not re-established. Detach.
                console.log(`WS: Grace period for ${this.player.lastWallSide} wall EXPIRED. Lost contact. Blocked L/R: <span class="math-inline">\{body\.blocked\.left\}/</span>{body.blocked.right}. VelY: ${body.velocity.y.toFixed(2)}. Transitioning to jump.`);
                this.stateMachine.transition('jump');
                return;
            } else {
                // Grace period is active, still "sliding" for a few frames hoping for re-contact.
                // console.log(`WS: Lost contact grace period active for ${this.player.lastWallSide} wall. Time: ${scene.time.now}, Expires: ${this.player.timeLostWallContact}`);
            }
        }
    } else {
        // Not pressing into the correct wall direction anymore. This should still be an immediate detach.
        console.log(`WS: Detaching - No longer pressing into ${this.player.lastWallSide} wall. Blocked L/R: <span class="math-inline">\{body\.blocked\.left\}/</span>{body.blocked.right}. VelY: ${body.velocity.y.toFixed(2)}. Transitioning to jump.`);
        this.player.physics.setVelocityX(0); // Ensure X velocity is neutral
        this.stateMachine.transition('jump');
        return;
    }
    }

    exit() {
        this.player.isSliding = false;
        this.player.canWallJump = false;
        // this.player.physics.setVelocityX(0); // Optional: reset X velocity on exit if needed by subsequent states

        const explicitDetachGracePeriod = 150; //
        // Check if wallJumpGraceTimer was ALREADY set by an explicit detach in execute()
        // If not, then set the general grace period.
        if (!(this.player.wallJumpGraceTimer > this.player.scene.time.now &&
              this.player.wallJumpGraceTimer < this.player.scene.time.now + explicitDetachGracePeriod + 10)) { //
             this.player.wallJumpGraceTimer = this.player.scene.time.now + 200; // General grace period //
        }
    }
}

class WallJumpState extends State {
    enter() {
        this.player.fullSprite.play('jump'); // Or a specific wall jump animation

        let wallJumpDirection = 0;
        // Try to use current blocked status first as it's most immediate
        if (this.player.physics.body.blocked.left) {
            wallJumpDirection = 1; // Push right
            this.player.lastWallSide = 'left'; // Update lastWallSide based on definitive contact
            // console.log("WallJump ENTER: Wall contact on left.");
        } else if (this.player.physics.body.blocked.right) {
            wallJumpDirection = -1; // Push left
            this.player.lastWallSide = 'right'; // Update lastWallSide
            // console.log("WallJump ENTER: Wall contact on right.");
        } else if (this.player.lastWallSide === 'left') {
            // Fallback: No direct body.blocked, but we were just on the left wall
            console.log("WallJump ENTER: No direct wall contact, using lastWallSide 'left' to jump right.");
            wallJumpDirection = 1;
        } else if (this.player.lastWallSide === 'right') {
            // Fallback: No direct body.blocked, but we were just on the right wall
            console.log("WallJump ENTER: No direct wall contact, using lastWallSide 'right' to jump left.");
            wallJumpDirection = -1;
        }

        if (wallJumpDirection !== 0) {
            this.player.physics.setVelocityX(this.player.WALL_JUMP_X_VELOCITY * wallJumpDirection);
            this.player.physics.setVelocityY(this.player.WALL_JUMP_Y_VELOCITY); // Upward velocity
            this.player.setFacingDirection(wallJumpDirection, true); // Force facing away from wall
            console.log(`WallJumpState ENTER: Applied jump. Direction: ${wallJumpDirection}, VelX=${this.player.physics.body.velocity.x.toFixed(2)}, VelY=${this.player.physics.body.velocity.y.toFixed(2)}`);
        } else {
            // Truly no wall information to act on (should be very rare now)
            console.error("WallJumpState ENTER: Critical - No wall detected AND no lastWallSide! Transitioning to jump.");
            this.stateMachine.transition('jump');
            return; // Essential to stop further execution in this enter() call
        }

        this.player.hasAirDashed = false;   // Reset air dash
        this.player.jumpBeingHeld = true;   // Allow variable jump height if key is held/re-pressed
        this.player.jumpCutoff = false;

        // Timer to delay when the player can regain air control or re-attach to a wall slide
        this.player.wallJumpActionDelayTimer = this.player.scene.time.now + 150; // e.g., 150ms

        // Timer to briefly delay the ground check, allowing player to get off the ground
        this.player.wallJumpGroundCheckDelayTimer = this.player.scene.time.now + 60; // e.g., ~3-4 frames
    }

    execute() {
        const scene = this.player.scene;
        const body = this.player.physics.body;
        const cursors = this.player.cursors;

        // Log current state values for debugging
        console.log(`WallJump EXECUTE: blocked.down=${body.blocked.down}, Y=${this.player.physics.y.toFixed(2)}, VelY=${body.velocity.y.toFixed(2)}, GroundCheckAllowed=${scene.time.now > this.player.wallJumpGroundCheckDelayTimer}`);

        // 1. Check for landing (only after the brief ground check delay)
        if (scene.time.now > this.player.wallJumpGroundCheckDelayTimer && body.blocked.down) {
            console.log("WallJumpState: Transitioning to idle (ground detected after delay).");
            this.stateMachine.transition('idle');
            return;
        }

        // 2. Air Dash
        if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash && !this.player.hasAirDashed) {
            this.stateMachine.transition('airDash');
            return;
        }
        
        const allowActions = scene.time.now > this.player.wallJumpActionDelayTimer; // Can regain control / re-slide

        // 3. Check for re-attaching to wall slide (only after action delay)
        if (allowActions && this.player.shouldWallSlide()) {
            // Ensure the GENERAL wallJumpGraceTimer (the 200ms one from WallSlideState.exit)
            // is also respected if you want to prevent quick re-attachment from any wall slide exit.
            // However, wallJumpActionDelayTimer is specific to *this* wall jump.
            this.stateMachine.transition('wallSlide');
            return; 
        }

        // 4. Horizontal Air Control (only after action delay)
        if (allowActions) {
            if (cursors.left.isDown) {
                this.player.physics.setVelocityX(-this.player.AIR_SPEED);
                this.player.setFacingDirection(-1);
            } else if (cursors.right.isDown) {
                this.player.physics.setVelocityX(this.player.AIR_SPEED);
                this.player.setFacingDirection(1);
            } else {
                // If you want horizontal momentum to stop when no keys are pressed (Hollow Knight like)
                this.player.physics.setVelocityX(0);
                // Or, for some air drift:
                // this.player.physics.setVelocityX(body.velocity.x * 0.98); 
            }
        }

        // 5. Variable Jump Height cut-off for the wall jump (if jump key released)
        if (this.player.jumpBeingHeld && !this.player.jumpKey.isDown && !this.player.jumpCutoff && body.velocity.y < 0) {
            this.player.physics.setVelocityY(body.velocity.y * 0.35); // Adjust multiplier as needed
            this.player.jumpCutoff = true;
        }

        // Note: The original WallJumpState had a second, unguarded if(this.player.shouldWallSlide()) check.
        // That is removed here as the check is now gated by `allowActions`.
    }

    exit() {
        // Resetting horizontal velocity on exit can be good if the next state
        // shouldn't inherit wall jump's potentially high horizontal speed by default.
        // However, if going into 'jump' state, JumpState's air control will take over.
        // this.player.physics.setVelocityX(0); 

        this.player.jumpBeingHeld = false; // Reset jump holding state
        // console.log("Exiting WallJumpState");
    }
}

// class WallJumpState extends State {
//     enter() {
//         this.player.fullSprite.play('jump');
//         this.player.physics.setDragX(0);

//         let dir = 0;
//         if (this.player.physics.body.blocked.left) {
//             dir = 1;
//         } else if (this.player.physics.body.blocked.right) {
//             dir = -1;
//         }

//         if (dir !== 0) {
//             this.player.physics.setVelocityX(this.player.WALL_JUMP_X_VELOCITY * dir);
//             this.player.physics.setVelocityY(this.player.WALL_JUMP_Y_VELOCITY);
//             this.player.setFacingDirection(dir, true);
//         }

//         this.player.hasAirDashed = false; // <--- RESET AIR DASH ON WALL JUMP
//         this.player.jumpBeingHeld = true; // <--- Allow variable jump height off wall jump
//         this.player.jumpCutoff = false;   // <--- Reset jump cutoff

//         this.player.wallJumpTimer = this.player.scene.time.now + 150; // short grace period to prevent sliding
//     }

//     execute() {
//         //Airdash Check
//         if (Phaser.Input.Keyboard.JustDown(this.player.dashKey) && this.player.canDash && !this.player.hasAirDashed) {
//             this.stateMachine.transition('airDash');
//             return;
//         }
        
//         if (this.player.shouldWallSlide()) {
//             if (this.player.scene.time.now > this.player.wallJumpTimer) { // Use wallJumpTimer to prevent immediate re-slide
//                 if (this.player.shouldWallSlide()) {
//                     this.stateMachine.transition('wallSlide');
//                     return; // Important: exit after transition
//                 }
//         }
//     }

//         // Allow directional control mid-air after a delay
//         const allowControl = this.player.scene.time.now > this.player.wallJumpTimer;

//         if (allowControl) {
//             if (this.player.cursors.left.isDown) {
//                 this.player.physics.setVelocityX(-this.player.AIR_SPEED);
//                 this.player.setFacingDirection(-1);
//             } else if (this.player.cursors.right.isDown) {
//                 this.player.physics.setVelocityX(this.player.AIR_SPEED);
//                 this.player.setFacingDirection(1);
//             } else {
//                 this.player.physics.setVelocityX(0);
//             }
//         }

//         if (this.player.shouldWallSlide()) {
//             this.stateMachine.transition('wallSlide');
//         }

//         if (this.player.physics.body.blocked.down) {
//             this.stateMachine.transition('idle');
//         }
//     }

//     exit() {
//         this.player.physics.setVelocityX(0);
//     }
// }

// class DashState extends State {
//     enter() {
//         this.player.fullSprite.setVisible(true); // Ensure full sprite is visible
//         this.player.legsSprite.setVisible(false);
//         this.player.upperSprite.setVisible(false);
//         this.player.fullSprite.play('dash');
//         this.player.isDashing = true;
//         this.player.canDash = false; // Set canDash to false immediately

//         const dashDirection = this.player.container.scaleX > 0 ? 1 : -1;
//         this.player.physics.setVelocityX(this.player.DASH_SPEED * dashDirection);
//         this.player.physics.setVelocityY(0); // Optional: make dash purely horizontal
//         this.player.physics.body.setAllowGravity(false); // Temporarily ignore gravity

//         // Dash duration timer
//         this.dashTimer = this.player.scene.time.delayedCall(this.player.DASH_DURATION, () => {
//             if (this.stateMachine.currentState === this) { // Only transition if still in DashState
//                  this.stateMachine.transition(this.player.physics.body.blocked.down ? 'idle' : 'jump'); // Or a dedicated 'fall' state
//             }
//         });

//         // Dash cooldown timer
//         this.player.scene.time.delayedCall(this.player.DASH_COOLDOWN, () => {
//             this.player.canDash = true;
//         });
//     }

//     execute() {
//         // You might add logic here if the dash can be interrupted by hitting a wall,
//         // or if you want to allow slight air control during the end of the dash.
//         // For now, we rely on the dashTimer.

//         // Example: Stop dash if hitting a wall and you don't want to pass through
//         // if ((this.player.physics.body.blocked.left && this.player.physics.body.velocity.x < 0) ||
//         //     (this.player.physics.body.blocked.right && this.player.physics.body.velocity.x > 0)) {
//         //     if (this.dashTimer) this.dashTimer.remove(); // Stop the timer
//         //     this.stateMachine.transition(this.player.physics.body.blocked.down ? 'idle' : 'jump');
//         // }
//     }

//     exit() {
//         this.player.isDashing = false;
//         this.player.physics.body.setAllowGravity(true);
//         // Optional: If you want to kill horizontal momentum after dash, uncomment:
//         // this.player.physics.setVelocityX(0);
//         // If you want to maintain some momentum but with normal drag:
//         this.player.physics.setDragX(this.player.DRAG);


//         if (this.dashTimer && this.dashTimer.getProgress() < 1) {
//             // If exiting dash state before timer finishes (e.g. hit wall and transitioned early)
//             this.dashTimer.remove();
//         }
//          // Ensure the correct animation plays when exiting dash (e.g., idle or jump)
//         if (this.player.physics.body.blocked.down) {
//             this.player.fullSprite.play('idle', true);
//         } else {
//             this.player.fullSprite.play('jump', true);
//         }
//     }
// }

class GroundDashState extends State {
    enter() {
        this.player.fullSprite.setVisible(true);
        this.player.legsSprite.setVisible(false);
        this.player.upperSprite.setVisible(false);
        this.player.fullSprite.play('dash');
        this.player.isDashing = true;
        this.player.canDash = false;

        let dashDirection = 0;
        if (this.player.cursors.left.isDown) {
            dashDirection = -1;
        } else if (this.player.cursors.right.isDown) {
            dashDirection = 1;
        } else {
            // Default to facing direction if no key is pressed
            dashDirection = this.player.container.scaleX > 0 ? 1 : -1;
        }

        // Set facing direction based on dash
        if (dashDirection !== 0) {
            this.player.setFacingDirection(dashDirection, true); // Force face direction during dash
        }


        this.player.physics.setVelocityX(this.player.DASH_SPEED * dashDirection);
        this.player.physics.setVelocityY(0); // Ground dash is purely horizontal
        this.player.physics.body.setAllowGravity(false);

        this.dashTimer = this.player.scene.time.delayedCall(this.player.DASH_DURATION, () => {
            if (this.stateMachine.currentState === this) {
                this.stateMachine.transition(this.player.physics.body.blocked.down ? 'idle' : 'jump');
            }
        });

        this.player.scene.time.delayedCall(this.player.DASH_COOLDOWN, () => {
            this.player.canDash = true;
        });
    }

    execute() {
        // Stop dash if hitting a wall (optional, like original DashState)
        // if ((this.player.physics.body.blocked.left && this.player.physics.body.velocity.x < 0) ||
        //     (this.player.physics.body.blocked.right && this.player.physics.body.velocity.x > 0)) {
        //     if (this.dashTimer) this.dashTimer.remove();
        //     this.stateMachine.transition(this.player.physics.body.blocked.down ? 'idle' : 'jump');
        // }
    }

    exit() {
        this.player.isDashing = false;
        this.player.physics.body.setAllowGravity(true);
        this.player.physics.setDragX(this.player.DRAG);

        if (this.dashTimer && this.dashTimer.getProgress() < 1) {
            this.dashTimer.remove();
        }
        // Ensure the correct animation plays when exiting dash
        if (this.player.physics.body.blocked.down) {
            this.player.fullSprite.play('idle', true);
        } else {
            this.player.fullSprite.play('jump', true);
        }
    }
}

class AirDashState extends State {
    enter() {
        this.player.fullSprite.setVisible(true);
        this.player.legsSprite.setVisible(false);
        this.player.upperSprite.setVisible(false);
        this.player.fullSprite.play('dash');
        this.player.isDashing = true;
        this.player.canDash = false;

        let dashDirection = 0;
        if (this.player.cursors.left.isDown) {
            dashDirection = -1;
        } else if (this.player.cursors.right.isDown) {
            dashDirection = 1;
        } else {
            // Default to facing direction if no key is pressed
            dashDirection = this.player.container.scaleX > 0 ? 1 : -1;
        }

        // Set facing direction based on dash
        if (dashDirection !== 0) {
            this.player.setFacingDirection(dashDirection, true); // Force face direction during dash
        }

        this.player.physics.setVelocityX(this.player.AIR_DASH_SPEED * dashDirection);
        this.player.physics.setVelocityY(0); // Air dash is purely horizontal
        this.player.physics.body.setAllowGravity(false);

        this.player.hasAirDashed = true;

        this.dashTimer = this.player.scene.time.delayedCall(this.player.DASH_DURATION, () => {
            if (this.stateMachine.currentState === this) {
                this.stateMachine.transition('jump'); // Or a dedicated 'fall' state
            }
        });

        this.player.scene.time.delayedCall(this.player.DASH_COOLDOWN, () => {
            this.player.canDash = true;
        });
    }

    execute() {
        // Optional: interrupt conditions for air dash (e.g., hitting a wall)
    }

    exit() {
        this.player.isDashing = false;
        this.player.physics.body.setAllowGravity(true);
        this.player.physics.setDragX(this.player.DRAG); // Or maybe less drag for air control after dash

        if (this.dashTimer && this.dashTimer.getProgress() < 1) {
            this.dashTimer.remove();
        }
        // Always transition to an aerial animation
        this.player.fullSprite.play('jump', true);
    }
}


class StateMachine {
    constructor(initialState, possibleStates, player) {
        this.player = player;
        this.states = possibleStates;
        this.transition(initialState);
    }

    transition(newStateName) {

        console.log('Transitioning to:', newStateName);
        if (this.currentState) this.currentState.exit();
        this.currentState = new this.states[newStateName](this, this.player);
        this.currentState.enter();
    }

    step() {
        if (this.currentState) this.currentState.execute();
    }
}

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        this.MAX_SPEED = 350;
        this.DRAG = 1000;
        this.JUMP_VELOCITY = -900;
        this.POGO_VELOCITY = -700;
        this.POGO_AIR_CONTROL_SPEED = 320; // Adjust as needed
        this.AIR_SPEED = 325; // Speed when in the air
        this.physics.world.gravity.y = 1500;

        this.WALL_SLIDE_SPEED = 200; // Max speed while sliding down a wall
        this.WALL_JUMP_X_VELOCITY = 400; // Horizontal velocity when jumping off a wall
        this.WALL_JUMP_Y_VELOCITY = -700; // Vertical velocity when jumping off a wall

        this.AIR_DASH_SPEED = 700;       // Adjust as needed
        this.DASH_SPEED = 700;          // Adjust as needed
        this.DASH_DURATION = 250;   // Dash duration in milliseconds
        this.DASH_COOLDOWN = 700;   // Cooldown in milliseconds

        // this.WALL_SLIDE_CONTACT_LOST_DURATION = 1000; // Duration in ms (e.g., ~5 frames at 60FPS) - TUNE THIS
        this.WALL_JUMP_ACTION_DELAY = 150;       // For WallJumpState air control
        this.WALL_JUMP_GROUND_CHECK_DELAY = 60; // For WallJumpState ground check
    }

    create() {
        this.map = this.add.tilemap("playground", 16, 16, 100, 40);
        this.tileset = this.map.addTilesetImage("monochrome_tilemap_packed", "tilemap_tiles");
        this.backgroundLayer = this.map.createLayer("Background", this.tileset, 0, 0).setScale(2.0);
        this.groundLayer = this.map.createLayer("Ground&Platforms", this.tileset, 0, 0).setScale(2.0);
        this.groundLayer.setCollisionByProperty({ collides: true });
        this.spikeGroup = this.physics.add.staticGroup();
        const objectLayer = this.map.getObjectLayer('Spikes&Objects');
        this.physics.world.TILE_BIAS = 32;
        
        const layerScale = this.groundLayer.scaleX; // Assuming uniform scaling

        objectLayer.objects.forEach(obj => {
            const scaledX = obj.x * layerScale;
            const scaledY = obj.y * layerScale;
            const scaledWidth = obj.width * layerScale;
            const scaledHeight = obj.height * layerScale;

            const spikeCollider = this.spikeGroup.create(scaledX, scaledY, null)
                .setOrigin(0)
                .setVisible(false);

            // Directly set the body size & offset
            spikeCollider.body.setSize(scaledWidth, scaledHeight);
            spikeCollider.body.setOffset(15, 15);

            spikeCollider.pogoable = obj.properties?.find(p => p.name === 'pogoable')?.value ?? true;

        });


        let physics = this.physics.add.sprite(200, 300, '__WHITE').setVisible(false);
        physics.body.setSize(30, 60).setOffset(-12, -74);
        physics.setCollideWorldBounds(true);
        this.physics.world.setBounds(0, 0, this.map.widthInPixels * this.groundLayer.scaleX, this.map.heightInPixels * this.groundLayer.scaleY);
        // this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(physics);
        //camera offset
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels * this.groundLayer.scaleX, this.map.heightInPixels * this.groundLayer.scaleY);


        let container = this.add.container(physics.x, physics.y);
        let fullSprite = this.add.sprite(0, 0, 'playerIdle').setOrigin(0.5, 1);
        let legsSprite = this.add.sprite(0, 0, 'legs_down').setOrigin(0.5, 1).setVisible(false);
        let upperSprite = this.add.sprite(0, 0, 'playerPogoslash').setOrigin(0.5, 1).setVisible(false);
        container.add([legsSprite, fullSprite, upperSprite]);

        container.setScale(2.0);

        let attackHitbox = this.physics.add.sprite(0, 0, '__WHITE').setVisible(false).setSize(40, 60).setOrigin(0.5, 0);
        attackHitbox.body.setAllowGravity(false);
        attackHitbox.body.setEnable(false);



        this.cursors = this.input.keyboard.createCursorKeys();
        this.jumpKey = this.input.keyboard.addKey('Z');
        this.pogoKey = this.input.keyboard.addKey('X');
        this.dashKey = this.input.keyboard.addKey('C');

        this.player = {
            physics,
            container,
            fullSprite,
            legsSprite,
            upperSprite,
            attackHitbox,
            cursors: this.cursors,
            jumpKey: this.jumpKey,
            pogoKey: this.pogoKey,
            dashKey: this.dashKey,
            isDashing: false,
            canDash: true, // Player can dash initially
            hasAirDashed: false,  
            DASH_SPEED: this.DASH_SPEED,
            AIR_DASH_SPEED: this.AIR_DASH_SPEED,
            DASH_DURATION: this.DASH_DURATION,
            DASH_COOLDOWN: this.DASH_COOLDOWN,
            MAX_SPEED: this.MAX_SPEED,
            AIR_SPEED: this.AIR_SPEED,
            DRAG: this.DRAG,
            JUMP_VELOCITY: this.JUMP_VELOCITY,
            POGO_VELOCITY: this.POGO_VELOCITY,
            POGO_AIR_CONTROL_SPEED: this.POGO_AIR_CONTROL_SPEED,
            WALL_SLIDE_SPEED: this.WALL_SLIDE_SPEED,
            WALL_JUMP_X_VELOCITY: this.WALL_JUMP_X_VELOCITY,
            WALL_JUMP_Y_VELOCITY: this.WALL_JUMP_Y_VELOCITY,
            playerScale: 2,
            scene: this,
            isSliding: false, // Helper flag
            canWallJump: false, // Helper flag
            lastWallSide: null,           
            wallJumpGraceTimer: 0,
            jumpBeingHeld: false,
            jumpCutoff: false,
            wallContactGracePeriodDuration: 50, // ms (e.g., roughly 3 frames at 60FPS, adjust as needed)
            timeLostWallContact: 0, 

            wallJumpActionDelayTimer: 0,
            wallJumpGroundCheckDelayTimer: 0,

            setFacingDirection(dir, force = false) {
                if (!force && (this.isSliding || this.isDashing)) {
                    return;
                }

                // Ensure dir is not 0 if it's used for scaling directly
                if (dir === 0) return; // Or handle default direction if dir is 0

                const scaleX = dir > 0 ? this.playerScale : -this.playerScale;
                this.container.setScale(scaleX, this.playerScale);
            },

            shouldWallSlide() {
                if (this.isDashing) return false; // Cannot wall slide while dashing
                const body = this.physics.body;
                const onWall = body.blocked.left || body.blocked.right;
                const pressingIntoWall = (body.blocked.left && this.cursors.left.isDown) ||
                                        (body.blocked.right && this.cursors.right.isDown);
                return onWall && !body.blocked.down && body.velocity.y > 0 && pressingIntoWall;
            }
        };

        this.physics.add.collider(this.player.physics, this.groundLayer);
        this.physics.add.overlap(this.player.attackHitbox, this.spikeGroup, this.handlePogoHit, null, this);


        this.playerStateMachine = new StateMachine('idle', {
            idle: IdleState,
            run: RunState,
            jump: JumpState,
            airAttack: AirAttackState,
            wallSlide: WallSlideState,
            wallJump: WallJumpState,
            groundDash: GroundDashState,
            airDash: AirDashState
            // dash: DashState

        }, this.player);

        this.cameras.main.startFollow(physics);
    }

    update() {
        this.playerStateMachine.step();
        this.player.container.x = this.player.physics.x;
        this.player.container.y = this.player.physics.y;
    }

    handlePogoHit(hitbox, target) {
        if (!(this.playerStateMachine.currentState instanceof AirAttackState)) return;

        // Support for both tile or object
        const playerBottom = this.player.physics.body.bottom;
        const targetTop = target instanceof Phaser.Tilemaps.Tile ? target.pixelY * this.groundLayer.scaleY : target.getBounds().top;

        // Check pogoable property (works for tile or object with custom property)
        const isPogoable = target.properties?.pogoable || target.pogoable === true;

        // Pixel-perfect check: player must be clearly above target
        if (isPogoable && playerBottom < targetTop + 10) {
            console.log('Pogo valid on target:', target);

            this.player.attackHitbox.setVisible(false);
            this.player.attackHitbox.body.setEnable(false);

            this.player.physics.setVelocityY(this.player.POGO_VELOCITY);
            this.player.hasAirDashed = false; // Reset air dash after pogo
            // this.player.jumpBeingHeld = true;
            // this.player.jumpCutoff = false;

            const currentState = this.playerStateMachine.currentState;
            if (currentState.attackTimer) currentState.attackTimer.remove();

            this.playerStateMachine.transition('jump');
        }
    }

}

import * as pc from 'playcanvas';
import * as TWEEN from '@tweenjs/tween.js';

export class CameraController {
  constructor(app, camera) {
    this.app = app;
    this.camera = camera;

    // Orbit camera settings
    this.orbitSensitivity = 0.3;
    this.distanceMin = 0.5;
    this.distanceMax = 20;

    // Current orbit state
    this.yaw = 0;
    this.pitch = 0;
    this.distance = 0;
    this.targetPosition = new pc.Vec3();

    // Touch/Mouse state
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.pinchDistance = 0;

    // Movement state
    this.isMoving = false;
    this.currentTween = null;

    // Keyboard movement state
    this.moveSpeed = 3.0;
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };

    this.setupControls();
    this.setupKeyboardControls();
    this.setupUpdateLoop();
  }

  setupControls() {
    const canvas = this.app.graphicsDevice.canvas;

    // Mouse controls
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e));

    // Touch controls
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (this.isMoving) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'KeyQ':
        case 'ShiftLeft':
          this.keys.down = true;
          break;
        case 'KeyE':
        case 'Space':
          this.keys.up = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'KeyQ':
        case 'ShiftLeft':
          this.keys.down = false;
          break;
        case 'KeyE':
        case 'Space':
          this.keys.up = false;
          break;
      }
    });
  }

  setupUpdateLoop() {
    this.app.on('update', (dt) => {
      TWEEN.update();
      this.updateKeyboardMovement(dt);
    });
  }

  updateKeyboardMovement(dt) {
    if (this.isMoving) return;

    const speed = this.moveSpeed * dt;

    // Get camera directions
    const forward = new pc.Vec3();
    const right = new pc.Vec3();
    const up = new pc.Vec3(0, 1, 0);

    this.camera.getWorldTransform().getZ(forward);
    this.camera.getWorldTransform().getX(right);
    forward.scale(-1); // Forward is negative Z

    const movement = new pc.Vec3();

    if (this.keys.forward) {
      movement.add(forward.clone().scale(speed));
    }
    if (this.keys.backward) {
      movement.sub(forward.clone().scale(speed));
    }
    if (this.keys.left) {
      movement.sub(right.clone().scale(speed));
    }
    if (this.keys.right) {
      movement.add(right.clone().scale(speed));
    }
    if (this.keys.up) {
      movement.add(up.clone().scale(speed));
    }
    if (this.keys.down) {
      movement.sub(up.clone().scale(speed));
    }

    if (movement.length() > 0) {
      const pos = this.camera.getPosition();
      pos.add(movement);
      this.camera.setPosition(pos);
    }
  }

  onMouseDown(e) {
    if (this.isMoving) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onMouseMove(e) {
    if (!this.isDragging || this.isMoving) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    this.yaw -= dx * this.orbitSensitivity;
    this.pitch -= dy * this.orbitSensitivity;
    this.pitch = Math.max(-89, Math.min(89, this.pitch));

    this.updateCameraRotation();

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onWheel(e) {
    if (this.isMoving) return;
    e.preventDefault();

    // In look-around mode, we don't change distance
    // This could be used for FOV adjustment if desired
  }

  onTouchStart(e) {
    if (this.isMoving) return;

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.pinchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  onTouchMove(e) {
    if (this.isMoving) return;
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastX;
      const dy = e.touches[0].clientY - this.lastY;

      this.yaw -= dx * this.orbitSensitivity;
      this.pitch -= dy * this.orbitSensitivity;
      this.pitch = Math.max(-89, Math.min(89, this.pitch));

      this.updateCameraRotation();

      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    }
  }

  onTouchEnd() {
    this.isDragging = false;
    this.pinchDistance = 0;
  }

  updateCameraRotation() {
    this.camera.setEulerAngles(this.pitch, this.yaw, 0);
  }

  moveTo(position, rotation, animate = true, duration = 1500) {
    return new Promise((resolve) => {
      if (this.currentTween) {
        this.currentTween.stop();
      }

      if (!animate) {
        this.camera.setPosition(position.x, position.y, position.z);
        this.yaw = rotation.y;
        this.pitch = rotation.x;
        this.updateCameraRotation();
        resolve();
        return;
      }

      this.isMoving = true;

      const startPos = this.camera.getPosition().clone();
      const startYaw = this.yaw;
      const startPitch = this.pitch;

      // Normalize yaw difference for shortest path
      let targetYaw = rotation.y;
      let yawDiff = targetYaw - startYaw;
      if (yawDiff > 180) yawDiff -= 360;
      if (yawDiff < -180) yawDiff += 360;
      targetYaw = startYaw + yawDiff;

      const tweenState = { t: 0 };

      this.currentTween = new TWEEN.Tween(tweenState)
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          const t = tweenState.t;

          // Interpolate position
          const x = startPos.x + (position.x - startPos.x) * t;
          const y = startPos.y + (position.y - startPos.y) * t;
          const z = startPos.z + (position.z - startPos.z) * t;
          this.camera.setPosition(x, y, z);

          // Interpolate rotation
          this.yaw = startYaw + (targetYaw - startYaw) * t;
          this.pitch = startPitch + (rotation.x - startPitch) * t;
          this.updateCameraRotation();
        })
        .onComplete(() => {
          this.isMoving = false;
          this.currentTween = null;
          resolve();
        })
        .start();
    });
  }

  getPosition() {
    return this.camera.getPosition();
  }

  getRotation() {
    return { x: this.pitch, y: this.yaw, z: 0 };
  }

  setPosition(x, y, z) {
    this.camera.setPosition(x, y, z);
  }

  setRotation(pitch, yaw) {
    this.pitch = pitch;
    this.yaw = yaw;
    this.updateCameraRotation();
  }

  isAnimating() {
    return this.isMoving;
  }
}

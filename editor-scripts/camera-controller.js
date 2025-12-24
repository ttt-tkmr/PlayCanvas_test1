/**
 * PlayCanvas Editor用 カメラコントローラー
 *
 * 使い方:
 * 1. このスクリプトをPlayCanvas Editorにアップロード
 * 2. カメラエンティティにアタッチ
 * 3. 属性を設定（感度、移動速度など）
 */
var CameraController = pc.createScript('cameraController');

// 属性定義（Editorで設定可能）
CameraController.attributes.add('orbitSensitivity', {
    type: 'number',
    default: 0.3,
    title: 'Orbit Sensitivity',
    description: 'マウス/タッチの回転感度'
});

CameraController.attributes.add('moveSpeed', {
    type: 'number',
    default: 3.0,
    title: 'Move Speed',
    description: 'キーボード移動速度'
});

CameraController.attributes.add('enableKeyboard', {
    type: 'boolean',
    default: true,
    title: 'Enable Keyboard',
    description: 'WASD/矢印キーによる移動を有効化'
});

CameraController.attributes.add('enableMouse', {
    type: 'boolean',
    default: true,
    title: 'Enable Mouse',
    description: 'マウスドラッグによる回転を有効化'
});

CameraController.attributes.add('enableTouch', {
    type: 'boolean',
    default: true,
    title: 'Enable Touch',
    description: 'タッチ操作を有効化'
});

// 初期化
CameraController.prototype.initialize = function() {
    // 回転状態
    this.yaw = 0;
    this.pitch = 0;

    // 初期回転を取得
    var eulers = this.entity.getEulerAngles();
    this.pitch = eulers.x;
    this.yaw = eulers.y;

    // ドラッグ状態
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    // アニメーション状態
    this.isMoving = false;
    this.tweenData = null;

    // キー入力状態
    this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
    };

    // イベントリスナー設定
    if (this.enableMouse) {
        this.setupMouseControls();
    }
    if (this.enableTouch) {
        this.setupTouchControls();
    }
    if (this.enableKeyboard) {
        this.setupKeyboardControls();
    }
};

// マウス操作
CameraController.prototype.setupMouseControls = function() {
    var self = this;
    var canvas = this.app.graphicsDevice.canvas;

    this.onMouseDown = function(e) {
        if (self.isMoving) return;
        self.isDragging = true;
        self.lastX = e.clientX;
        self.lastY = e.clientY;
    };

    this.onMouseMove = function(e) {
        if (!self.isDragging || self.isMoving) return;

        var dx = e.clientX - self.lastX;
        var dy = e.clientY - self.lastY;

        self.yaw -= dx * self.orbitSensitivity;
        self.pitch -= dy * self.orbitSensitivity;
        self.pitch = pc.math.clamp(self.pitch, -89, 89);

        self.entity.setEulerAngles(self.pitch, self.yaw, 0);

        self.lastX = e.clientX;
        self.lastY = e.clientY;
    };

    this.onMouseUp = function() {
        self.isDragging = false;
    };

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);

    // クリーンアップ用に保存
    this.on('destroy', function() {
        canvas.removeEventListener('mousedown', self.onMouseDown);
        canvas.removeEventListener('mousemove', self.onMouseMove);
        canvas.removeEventListener('mouseup', self.onMouseUp);
        canvas.removeEventListener('mouseleave', self.onMouseUp);
    });
};

// タッチ操作
CameraController.prototype.setupTouchControls = function() {
    var self = this;
    var canvas = this.app.graphicsDevice.canvas;

    this.onTouchStart = function(e) {
        if (self.isMoving) return;
        if (e.touches.length === 1) {
            self.isDragging = true;
            self.lastX = e.touches[0].clientX;
            self.lastY = e.touches[0].clientY;
        }
    };

    this.onTouchMove = function(e) {
        if (self.isMoving) return;
        e.preventDefault();

        if (e.touches.length === 1 && self.isDragging) {
            var dx = e.touches[0].clientX - self.lastX;
            var dy = e.touches[0].clientY - self.lastY;

            self.yaw -= dx * self.orbitSensitivity;
            self.pitch -= dy * self.orbitSensitivity;
            self.pitch = pc.math.clamp(self.pitch, -89, 89);

            self.entity.setEulerAngles(self.pitch, self.yaw, 0);

            self.lastX = e.touches[0].clientX;
            self.lastY = e.touches[0].clientY;
        }
    };

    this.onTouchEnd = function() {
        self.isDragging = false;
    };

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);

    this.on('destroy', function() {
        canvas.removeEventListener('touchstart', self.onTouchStart);
        canvas.removeEventListener('touchmove', self.onTouchMove);
        canvas.removeEventListener('touchend', self.onTouchEnd);
    });
};

// キーボード操作
CameraController.prototype.setupKeyboardControls = function() {
    var self = this;

    this.app.keyboard.on('keydown', function(e) {
        if (self.isMoving) return;

        switch (e.key) {
            case pc.KEY_W:
            case pc.KEY_UP:
                self.keys.forward = true;
                break;
            case pc.KEY_S:
            case pc.KEY_DOWN:
                self.keys.backward = true;
                break;
            case pc.KEY_A:
            case pc.KEY_LEFT:
                self.keys.left = true;
                break;
            case pc.KEY_D:
            case pc.KEY_RIGHT:
                self.keys.right = true;
                break;
            case pc.KEY_Q:
            case pc.KEY_SHIFT:
                self.keys.down = true;
                break;
            case pc.KEY_E:
            case pc.KEY_SPACE:
                self.keys.up = true;
                break;
        }
    });

    this.app.keyboard.on('keyup', function(e) {
        switch (e.key) {
            case pc.KEY_W:
            case pc.KEY_UP:
                self.keys.forward = false;
                break;
            case pc.KEY_S:
            case pc.KEY_DOWN:
                self.keys.backward = false;
                break;
            case pc.KEY_A:
            case pc.KEY_LEFT:
                self.keys.left = false;
                break;
            case pc.KEY_D:
            case pc.KEY_RIGHT:
                self.keys.right = false;
                break;
            case pc.KEY_Q:
            case pc.KEY_SHIFT:
                self.keys.down = false;
                break;
            case pc.KEY_E:
            case pc.KEY_SPACE:
                self.keys.up = false;
                break;
        }
    });
};

// 更新ループ
CameraController.prototype.update = function(dt) {
    // アニメーション中の処理
    if (this.isMoving && this.tweenData) {
        this.updateTween(dt);
        return;
    }

    // キーボード移動
    if (this.enableKeyboard) {
        this.updateKeyboardMovement(dt);
    }
};

// キーボード移動更新
CameraController.prototype.updateKeyboardMovement = function(dt) {
    if (this.isMoving) return;

    var speed = this.moveSpeed * dt;

    var forward = new pc.Vec3();
    var right = new pc.Vec3();
    var up = new pc.Vec3(0, 1, 0);

    this.entity.getWorldTransform().getZ(forward);
    this.entity.getWorldTransform().getX(right);
    forward.scale(-1);

    var movement = new pc.Vec3();

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
        var pos = this.entity.getPosition();
        pos.add(movement);
        this.entity.setPosition(pos);
    }
};

/**
 * 指定位置へカメラを移動（アニメーション付き）
 * @param {pc.Vec3} position - 目標位置
 * @param {Object} rotation - 目標回転 {x: pitch, y: yaw, z: roll}
 * @param {boolean} animate - アニメーションするか
 * @param {number} duration - アニメーション時間（秒）
 */
CameraController.prototype.moveTo = function(position, rotation, animate, duration) {
    animate = animate !== false;
    duration = duration || 1.5;

    if (!animate) {
        this.entity.setPosition(position.x, position.y, position.z);
        this.yaw = rotation.y;
        this.pitch = rotation.x;
        this.entity.setEulerAngles(this.pitch, this.yaw, 0);
        return;
    }

    this.isMoving = true;

    var startPos = this.entity.getPosition().clone();
    var startYaw = this.yaw;
    var startPitch = this.pitch;

    // 最短経路で回転
    var targetYaw = rotation.y;
    var yawDiff = targetYaw - startYaw;
    if (yawDiff > 180) yawDiff -= 360;
    if (yawDiff < -180) yawDiff += 360;
    targetYaw = startYaw + yawDiff;

    this.tweenData = {
        t: 0,
        duration: duration,
        startPos: startPos,
        endPos: new pc.Vec3(position.x, position.y, position.z),
        startYaw: startYaw,
        endYaw: targetYaw,
        startPitch: startPitch,
        endPitch: rotation.x
    };
};

// Tweenアニメーション更新
CameraController.prototype.updateTween = function(dt) {
    var data = this.tweenData;
    data.t += dt / data.duration;

    if (data.t >= 1) {
        data.t = 1;
        this.isMoving = false;
    }

    // イージング（Cubic InOut）
    var t = data.t;
    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // 位置補間
    var x = data.startPos.x + (data.endPos.x - data.startPos.x) * t;
    var y = data.startPos.y + (data.endPos.y - data.startPos.y) * t;
    var z = data.startPos.z + (data.endPos.z - data.startPos.z) * t;
    this.entity.setPosition(x, y, z);

    // 回転補間
    this.yaw = data.startYaw + (data.endYaw - data.startYaw) * t;
    this.pitch = data.startPitch + (data.endPitch - data.startPitch) * t;
    this.entity.setEulerAngles(this.pitch, this.yaw, 0);

    if (!this.isMoving) {
        this.tweenData = null;
        this.app.fire('camera:moveComplete');
    }
};

// 外部からのアクセス用メソッド
CameraController.prototype.getPosition = function() {
    return this.entity.getPosition();
};

CameraController.prototype.getRotation = function() {
    return { x: this.pitch, y: this.yaw, z: 0 };
};

CameraController.prototype.isAnimating = function() {
    return this.isMoving;
};

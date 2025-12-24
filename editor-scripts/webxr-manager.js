/**
 * PlayCanvas Editor用 WebXRマネージャー
 *
 * 使い方:
 * 1. このスクリプトをPlayCanvas Editorにアップロード
 * 2. カメラエンティティにアタッチ（または別のエンティティ）
 * 3. VRボタンのHTMLエレメントIDを指定（オプション）
 */
var WebXRManager = pc.createScript('webXRManager');

// 属性定義
WebXRManager.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera Entity',
    description: 'XRセッションで使用するカメラエンティティ'
});

WebXRManager.attributes.add('vrButtonId', {
    type: 'string',
    default: 'vr-button',
    title: 'VR Button ID',
    description: 'VRボタンのDOM要素ID'
});

WebXRManager.attributes.add('autoHideUI', {
    type: 'boolean',
    default: true,
    title: 'Auto Hide UI',
    description: 'VR開始時にUIを自動的に非表示にする'
});

WebXRManager.attributes.add('uiElementIds', {
    type: 'string',
    array: true,
    default: ['ui-panel', 'point-menu'],
    title: 'UI Element IDs',
    description: 'VR時に非表示にするDOM要素のID'
});

// 初期化
WebXRManager.prototype.initialize = function() {
    this.isVRSupported = false;
    this.isInVR = false;
    this.vrButton = null;

    // カメラが指定されていない場合は自身のエンティティを使用
    if (!this.cameraEntity) {
        this.cameraEntity = this.entity;
    }

    // VRサポートチェック
    this.checkVRSupport();

    // XRイベント設定
    this.setupXREvents();
};

// VRサポートチェック
WebXRManager.prototype.checkVRSupport = function() {
    var self = this;

    if (!this.app.xr) {
        console.log('WebXRManager: WebXR not available');
        return;
    }

    this.app.xr.isAvailable(pc.XRTYPE_VR).then(function(available) {
        self.isVRSupported = available;

        if (available) {
            console.log('WebXRManager: VR is supported');
            self.setupVRButton();
        } else {
            console.log('WebXRManager: VR is not supported on this device');
        }
    }).catch(function(error) {
        console.error('WebXRManager: Error checking VR support:', error);
    });
};

// VRボタン設定
WebXRManager.prototype.setupVRButton = function() {
    var self = this;

    this.vrButton = document.getElementById(this.vrButtonId);
    if (this.vrButton) {
        this.vrButton.classList.add('supported');
        this.vrButton.style.display = '';

        this.onVRButtonClick = function() {
            self.toggleVR();
        };

        this.vrButton.addEventListener('click', this.onVRButtonClick);

        this.on('destroy', function() {
            if (self.vrButton) {
                self.vrButton.removeEventListener('click', self.onVRButtonClick);
            }
        });
    }
};

// XRイベント設定
WebXRManager.prototype.setupXREvents = function() {
    var self = this;

    if (!this.app.xr) return;

    this.app.xr.on('start', function() {
        console.log('WebXRManager: XR session started');
        self.isInVR = true;

        if (self.autoHideUI) {
            self.hideUI();
        }

        self.app.fire('xr:start');
    });

    this.app.xr.on('end', function() {
        console.log('WebXRManager: XR session ended');
        self.isInVR = false;

        if (self.autoHideUI) {
            self.showUI();
        }

        self.app.fire('xr:end');
    });

    this.app.xr.on('error', function(error) {
        console.error('WebXRManager: XR error:', error);
        self.app.fire('xr:error', error);
    });
};

// VRトグル
WebXRManager.prototype.toggleVR = function() {
    if (this.isInVR) {
        this.exitVR();
    } else {
        this.enterVR();
    }
};

// VR開始
WebXRManager.prototype.enterVR = function() {
    var self = this;

    if (!this.isVRSupported) {
        console.log('WebXRManager: VR is not supported');
        return Promise.resolve(false);
    }

    if (!this.cameraEntity || !this.cameraEntity.camera) {
        console.error('WebXRManager: No camera entity specified');
        return Promise.resolve(false);
    }

    return this.app.xr.start(
        this.cameraEntity.camera,
        pc.XRTYPE_VR,
        pc.XRSPACE_LOCAL
    ).then(function() {
        return true;
    }).catch(function(error) {
        console.error('WebXRManager: Failed to enter VR:', error);
        return false;
    });
};

// VR終了
WebXRManager.prototype.exitVR = function() {
    if (!this.isInVR) {
        return Promise.resolve(true);
    }

    return this.app.xr.end().then(function() {
        return true;
    }).catch(function(error) {
        console.error('WebXRManager: Failed to exit VR:', error);
        return false;
    });
};

// UI非表示
WebXRManager.prototype.hideUI = function() {
    var self = this;
    this.uiElementIds.forEach(function(id) {
        var element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
};

// UI表示
WebXRManager.prototype.showUI = function() {
    var self = this;
    this.uiElementIds.forEach(function(id) {
        var element = document.getElementById(id);
        if (element) {
            element.style.display = '';
        }
    });
};

// 外部アクセス用
WebXRManager.prototype.isSupported = function() {
    return this.isVRSupported;
};

WebXRManager.prototype.isActive = function() {
    return this.isInVR;
};

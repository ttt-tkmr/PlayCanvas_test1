/**
 * PlayCanvas Editor用 ツアーマネージャー
 *
 * 使い方:
 * 1. このスクリプトをPlayCanvas Editorにアップロード
 * 2. 空のエンティティを作成し、このスクリプトをアタッチ
 * 3. カメラエンティティを属性で指定
 * 4. TourPointスクリプトを持つエンティティが自動検出される
 */
var TourManager = pc.createScript('tourManager');

// 属性定義
TourManager.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera Entity',
    description: 'CameraControllerスクリプトを持つカメラエンティティ'
});

TourManager.attributes.add('startPointId', {
    type: 'string',
    default: '',
    title: 'Start Point ID',
    description: '開始地点のポイントID（空の場合は最初に見つかったポイント）'
});

TourManager.attributes.add('markerTemplate', {
    type: 'entity',
    title: 'Marker Template',
    description: 'ポイントマーカーのテンプレートエンティティ（任意）'
});

TourManager.attributes.add('markerScale', {
    type: 'number',
    default: 0.15,
    title: 'Marker Scale',
    description: 'マーカーのスケール'
});

TourManager.attributes.add('markerColor', {
    type: 'rgb',
    default: [0, 212, 255],
    title: 'Marker Color',
    description: 'マーカーの色'
});

TourManager.attributes.add('hoverColor', {
    type: 'rgb',
    default: [255, 255, 255],
    title: 'Hover Color',
    description: 'ホバー時のマーカー色'
});

// 初期化
TourManager.prototype.initialize = function() {
    // ポイント管理
    this.points = new Map();
    this.currentPoint = null;
    this.markerEntities = new Map();
    this.hoveredMarker = null;

    // カメラコントローラー参照
    this.cameraController = null;
    if (this.cameraEntity && this.cameraEntity.script) {
        this.cameraController = this.cameraEntity.script.cameraController;
    }

    // レイキャスト用
    this.ray = new pc.Ray();

    // マテリアル作成
    this.normalMaterial = this.createMarkerMaterial(this.markerColor);
    this.hoverMaterial = this.createMarkerMaterial(this.hoverColor);

    // シーンからTourPointを検索して登録
    this.findTourPoints();

    // イベントリスナー設定
    this.setupEventListeners();

    // 開始地点へ移動
    this.goToStartPoint();
};

// TourPointスクリプトを持つエンティティを検索
TourManager.prototype.findTourPoints = function() {
    var self = this;
    var entities = this.app.root.findByTag('tourpoint');

    // タグがない場合はスクリプトで検索
    if (entities.length === 0) {
        entities = this.app.root.find(function(node) {
            return node.script && node.script.tourPoint;
        });
    }

    entities.forEach(function(entity) {
        var tourPoint = entity.script ? entity.script.tourPoint : null;
        if (tourPoint) {
            var pointData = {
                id: tourPoint.pointId,
                name: tourPoint.pointName,
                entity: entity,
                script: tourPoint,
                position: entity.getPosition().clone(),
                rotation: {
                    x: tourPoint.cameraRotationX,
                    y: tourPoint.cameraRotationY,
                    z: 0
                },
                description: tourPoint.description,
                connections: tourPoint.connections || []
            };
            self.points.set(tourPoint.pointId, pointData);
            self.createMarker(pointData);
        }
    });

    console.log('TourManager: Found ' + this.points.size + ' tour points');
};

// マーカー作成
TourManager.prototype.createMarker = function(pointData) {
    var marker;

    if (this.markerTemplate) {
        marker = this.markerTemplate.clone();
    } else {
        marker = new pc.Entity('marker-' + pointData.id);
        marker.addComponent('render', {
            type: 'sphere'
        });
        marker.render.material = this.normalMaterial;
    }

    marker.setLocalScale(this.markerScale, this.markerScale, this.markerScale);
    marker.setPosition(pointData.position.x, pointData.position.y - 0.5, pointData.position.z);
    marker.tags.add('marker');

    this.app.root.addChild(marker);
    this.markerEntities.set(pointData.id, marker);
};

// マテリアル作成
TourManager.prototype.createMarkerMaterial = function(color) {
    var material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r || color[0]/255, color.g || color[1]/255, color.b || color[2]/255);
    material.emissive = new pc.Color(
        (color.r || color[0]/255) * 0.5,
        (color.g || color[1]/255) * 0.5,
        (color.b || color[2]/255) * 0.5
    );
    material.opacity = 0.8;
    material.blendType = pc.BLEND_NORMAL;
    material.update();
    return material;
};

// イベントリスナー設定
TourManager.prototype.setupEventListeners = function() {
    var self = this;
    var canvas = this.app.graphicsDevice.canvas;

    // クリックでポイント移動
    this.onCanvasClick = function(e) {
        if (self.cameraController && self.cameraController.isAnimating()) return;

        var rect = canvas.getBoundingClientRect();
        var hitId = self.getMarkerAtScreenPos(e.clientX - rect.left, e.clientY - rect.top);

        if (hitId) {
            self.goToPoint(hitId, true);
        }
    };

    // ホバーエフェクト
    this.onCanvasMouseMove = function(e) {
        if (self.cameraController && self.cameraController.isAnimating()) {
            self.clearHover();
            return;
        }

        var rect = canvas.getBoundingClientRect();
        var hitId = self.getMarkerAtScreenPos(e.clientX - rect.left, e.clientY - rect.top);

        if (hitId) {
            if (self.hoveredMarker !== hitId) {
                self.clearHover();
                self.setHover(hitId);
            }
            canvas.style.cursor = 'pointer';
        } else {
            self.clearHover();
            canvas.style.cursor = 'grab';
        }
    };

    canvas.addEventListener('click', this.onCanvasClick);
    canvas.addEventListener('mousemove', this.onCanvasMouseMove);

    this.on('destroy', function() {
        canvas.removeEventListener('click', self.onCanvasClick);
        canvas.removeEventListener('mousemove', self.onCanvasMouseMove);
    });
};

// スクリーン座標からマーカーを検出
TourManager.prototype.getMarkerAtScreenPos = function(screenX, screenY) {
    if (!this.cameraEntity || !this.cameraEntity.camera) return null;

    var camera = this.cameraEntity.camera;
    var nearPoint = new pc.Vec3();
    var farPoint = new pc.Vec3();

    camera.screenToWorld(screenX, screenY, camera.nearClip, nearPoint);
    camera.screenToWorld(screenX, screenY, camera.farClip, farPoint);

    var direction = new pc.Vec3();
    direction.sub2(farPoint, nearPoint).normalize();

    this.ray.origin.copy(nearPoint);
    this.ray.direction.copy(direction);

    var closestHit = null;
    var closestDistance = Infinity;
    var self = this;

    this.markerEntities.forEach(function(entity, id) {
        if (!entity.enabled) return;

        var position = entity.getPosition();
        var radius = 0.3;
        var hit = self.raySphereIntersect(self.ray, position, radius);

        if (hit !== null && hit < closestDistance) {
            closestDistance = hit;
            closestHit = id;
        }
    });

    return closestHit;
};

// レイ-球体交差判定
TourManager.prototype.raySphereIntersect = function(ray, sphereCenter, sphereRadius) {
    var oc = new pc.Vec3();
    oc.sub2(ray.origin, sphereCenter);

    var a = ray.direction.dot(ray.direction);
    var b = 2.0 * oc.dot(ray.direction);
    var c = oc.dot(oc) - sphereRadius * sphereRadius;
    var discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return null;
    }

    var t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t > 0 ? t : null;
};

// ホバー設定
TourManager.prototype.setHover = function(markerId) {
    this.hoveredMarker = markerId;
    var entity = this.markerEntities.get(markerId);
    if (entity && entity.render) {
        entity.render.material = this.hoverMaterial;
        entity.setLocalScale(this.markerScale * 1.3, this.markerScale * 1.3, this.markerScale * 1.3);
    }
};

// ホバー解除
TourManager.prototype.clearHover = function() {
    if (this.hoveredMarker) {
        var entity = this.markerEntities.get(this.hoveredMarker);
        if (entity && entity.render) {
            entity.render.material = this.normalMaterial;
            entity.setLocalScale(this.markerScale, this.markerScale, this.markerScale);
        }
        this.hoveredMarker = null;
    }
};

// 開始地点へ移動
TourManager.prototype.goToStartPoint = function() {
    var startId = this.startPointId;

    if (!startId && this.points.size > 0) {
        startId = this.points.keys().next().value;
    }

    if (startId) {
        this.goToPoint(startId, false);
    }
};

/**
 * 指定ポイントへ移動
 * @param {string} pointId - ポイントID
 * @param {boolean} animate - アニメーションするか
 */
TourManager.prototype.goToPoint = function(pointId, animate) {
    var point = this.points.get(pointId);
    if (!point) {
        console.error('TourManager: Point not found: ' + pointId);
        return;
    }

    var previousPoint = this.currentPoint;
    this.currentPoint = point;

    // マーカー表示更新
    this.updateMarkerVisibility(pointId);

    // カメラ移動
    if (this.cameraController) {
        var position = new pc.Vec3(point.position.x, point.position.y, point.position.z);
        this.cameraController.moveTo(position, point.rotation, animate);
    }

    // イベント発火
    this.app.fire('tour:pointChanged', point, previousPoint);
};

// マーカー表示更新
TourManager.prototype.updateMarkerVisibility = function(currentPointId) {
    var self = this;

    this.markerEntities.forEach(function(entity, id) {
        entity.enabled = id !== currentPointId;
    });
};

// 外部からのアクセス用メソッド
TourManager.prototype.getCurrentPoint = function() {
    return this.currentPoint;
};

TourManager.prototype.getPoint = function(pointId) {
    return this.points.get(pointId);
};

TourManager.prototype.getAllPoints = function() {
    return Array.from(this.points.values());
};

/**
 * PlayCanvas Editor用 ツアーポイント
 *
 * 使い方:
 * 1. このスクリプトをPlayCanvas Editorにアップロード
 * 2. 空のエンティティを作成（または既存のオブジェクトを使用）
 * 3. このスクリプトをアタッチ
 * 4. 属性でポイントの情報を設定
 * 5. エンティティの位置がカメラの移動先になる
 *
 * ヒント: エンティティに「tourpoint」タグを追加するとTourManagerが自動検出する
 */
var TourPoint = pc.createScript('tourPoint');

// 属性定義
TourPoint.attributes.add('pointId', {
    type: 'string',
    default: 'point-1',
    title: 'Point ID',
    description: 'ユニークなポイントID'
});

TourPoint.attributes.add('pointName', {
    type: 'string',
    default: 'New Point',
    title: 'Point Name',
    description: '表示名'
});

TourPoint.attributes.add('description', {
    type: 'string',
    default: '',
    title: 'Description',
    description: 'ポイントの説明文'
});

TourPoint.attributes.add('cameraRotationX', {
    type: 'number',
    default: 0,
    min: -89,
    max: 89,
    title: 'Camera Pitch',
    description: 'カメラの上下角度（-89〜89）'
});

TourPoint.attributes.add('cameraRotationY', {
    type: 'number',
    default: 0,
    title: 'Camera Yaw',
    description: 'カメラの左右角度'
});

TourPoint.attributes.add('connections', {
    type: 'string',
    array: true,
    default: [],
    title: 'Connections',
    description: '接続先のポイントID（カンマ区切り）'
});

TourPoint.attributes.add('showGizmo', {
    type: 'boolean',
    default: true,
    title: 'Show Gizmo',
    description: 'エディターでカメラ方向ギズモを表示'
});

TourPoint.attributes.add('gizmoLength', {
    type: 'number',
    default: 1.0,
    title: 'Gizmo Length',
    description: '方向ギズモの長さ'
});

// 初期化
TourPoint.prototype.initialize = function() {
    // タグを追加（TourManagerが検出できるように）
    this.entity.tags.add('tourpoint');

    // エディター用ギズモ作成
    if (this.showGizmo) {
        this.createDirectionGizmo();
    }

    // 属性変更時の更新
    this.on('attr:cameraRotationX', this.updateGizmo, this);
    this.on('attr:cameraRotationY', this.updateGizmo, this);
    this.on('attr:gizmoLength', this.updateGizmo, this);
    this.on('attr:showGizmo', function(value) {
        if (this.gizmoEntity) {
            this.gizmoEntity.enabled = value;
        }
    }, this);
};

// 方向ギズモ作成（エディターでカメラの向きを視覚化）
TourPoint.prototype.createDirectionGizmo = function() {
    // 矢印エンティティ
    this.gizmoEntity = new pc.Entity('direction-gizmo');

    // 矢印の軸
    var arrow = new pc.Entity('arrow');
    arrow.addComponent('render', {
        type: 'cylinder'
    });
    arrow.setLocalScale(0.05, this.gizmoLength / 2, 0.05);
    arrow.setLocalPosition(0, 0, -this.gizmoLength / 2);
    arrow.setLocalEulerAngles(90, 0, 0);

    // マテリアル
    var material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(1, 0.5, 0);
    material.emissive = new pc.Color(0.5, 0.25, 0);
    material.opacity = 0.7;
    material.blendType = pc.BLEND_NORMAL;
    material.update();
    arrow.render.material = material;

    // 矢印の先端
    var tip = new pc.Entity('tip');
    tip.addComponent('render', {
        type: 'cone'
    });
    tip.setLocalScale(0.15, 0.2, 0.15);
    tip.setLocalPosition(0, 0, -this.gizmoLength);
    tip.setLocalEulerAngles(90, 0, 0);
    tip.render.material = material;

    this.gizmoEntity.addChild(arrow);
    this.gizmoEntity.addChild(tip);
    this.entity.addChild(this.gizmoEntity);

    this.updateGizmo();
};

// ギズモ更新
TourPoint.prototype.updateGizmo = function() {
    if (!this.gizmoEntity) return;

    // カメラの回転をギズモに反映
    this.gizmoEntity.setLocalEulerAngles(this.cameraRotationX, this.cameraRotationY, 0);

    // 長さ更新
    var arrow = this.gizmoEntity.findByName('arrow');
    var tip = this.gizmoEntity.findByName('tip');

    if (arrow) {
        arrow.setLocalScale(0.05, this.gizmoLength / 2, 0.05);
        arrow.setLocalPosition(0, 0, -this.gizmoLength / 2);
    }
    if (tip) {
        tip.setLocalPosition(0, 0, -this.gizmoLength);
    }
};

/**
 * ポイントデータを取得
 * @returns {Object} ポイントデータ
 */
TourPoint.prototype.getPointData = function() {
    var pos = this.entity.getPosition();
    return {
        id: this.pointId,
        name: this.pointName,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: this.cameraRotationX, y: this.cameraRotationY, z: 0 },
        description: this.description,
        connections: this.connections
    };
};

/**
 * JSONからポイントデータを設定
 * @param {Object} data - ポイントデータ
 */
TourPoint.prototype.setPointData = function(data) {
    if (data.id) this.pointId = data.id;
    if (data.name) this.pointName = data.name;
    if (data.description) this.description = data.description;
    if (data.rotation) {
        this.cameraRotationX = data.rotation.x || 0;
        this.cameraRotationY = data.rotation.y || 0;
    }
    if (data.connections) this.connections = data.connections;
    if (data.position) {
        this.entity.setPosition(data.position.x, data.position.y, data.position.z);
    }

    this.updateGizmo();
};

// 破棄時
TourPoint.prototype.destroy = function() {
    if (this.gizmoEntity) {
        this.gizmoEntity.destroy();
    }
};

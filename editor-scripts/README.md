# PlayCanvas Editor用スクリプト

このディレクトリには、PlayCanvas Editor（https://playcanvas.com）で使用できる互換スクリプトが含まれています。

## セットアップ手順

### 1. PlayCanvas Editorでプロジェクト作成

1. https://playcanvas.com にログイン
2. 「NEW PROJECT」をクリック
3. 「Blank Project」を選択

### 2. スクリプトのアップロード

1. Editorの「ASSETS」パネルを開く
2. 以下のファイルをドラッグ&ドロップ:
   - `camera-controller.js`
   - `tour-manager.js`
   - `tour-point.js`
   - `webxr-manager.js`（VRを使う場合）

### 3. Gaussian Splatファイルのアップロード

1. `.ply`ファイルをASSETSパネルにドラッグ&ドロップ
2. PlayCanvasが自動的にGSplat形式として認識

### 4. シーン構築

#### カメラのセットアップ

1. Hierarchyで「Camera」エンティティを選択
2. 「ADD COMPONENT」→「Script」
3. 「cameraController」スクリプトを追加
4. 必要に応じて属性を調整:
   - **Orbit Sensitivity**: マウス感度（デフォルト: 0.3）
   - **Move Speed**: 移動速度（デフォルト: 3.0）

#### Gaussian Splatの配置

1. Hierarchyで右クリック →「New Entity」→「GSplat」
2. または空のエンティティを作成し「ADD COMPONENT」→「GSplat」
3. GSplatコンポーネントの「Asset」にアップロードした`.ply`を指定

#### ツアーポイントの作成

1. Hierarchyで右クリック →「New Entity」→「Empty」
2. エンティティ名を「Point-Entrance」などに変更
3. 「ADD COMPONENT」→「Script」
4. 「tourPoint」スクリプトを追加
5. 属性を設定:
   - **Point ID**: ユニークなID（例: `entrance`）
   - **Point Name**: 表示名（例: `エントランス`）
   - **Description**: 説明文
   - **Camera Pitch**: カメラ上下角度
   - **Camera Yaw**: カメラ左右角度
6. エンティティの位置を調整（これがカメラの移動先）
7. 必要な数だけポイントを作成

**ヒント**: エンティティに「tourpoint」タグを追加すると検出が確実になります

#### TourManagerのセットアップ

1. Hierarchyで右クリック →「New Entity」→「Empty」
2. エンティティ名を「TourManager」に変更
3. 「ADD COMPONENT」→「Script」
4. 「tourManager」スクリプトを追加
5. 属性を設定:
   - **Camera Entity**: カメラエンティティをドラッグ
   - **Start Point ID**: 開始ポイントのID

## スクリプト一覧

### camera-controller.js
カメラの操作を制御します。

**機能:**
- マウスドラッグで視点回転
- タッチ操作対応
- WASD/矢印キーで移動
- Q/Eまたはスペース/シフトで上下移動
- スムーズなカメラアニメーション

**主な属性:**
| 属性 | 型 | 説明 |
|------|-----|------|
| orbitSensitivity | number | 回転感度 |
| moveSpeed | number | 移動速度 |
| enableKeyboard | boolean | キーボード操作の有効/無効 |
| enableMouse | boolean | マウス操作の有効/無効 |
| enableTouch | boolean | タッチ操作の有効/無効 |

### tour-manager.js
ツアー全体を管理します。

**機能:**
- TourPointの自動検出
- クリックでポイント間移動
- マーカーのホバーエフェクト
- カメラアニメーション連携

**主な属性:**
| 属性 | 型 | 説明 |
|------|-----|------|
| cameraEntity | entity | カメラエンティティ |
| startPointId | string | 開始ポイントID |
| markerScale | number | マーカーサイズ |
| markerColor | rgb | マーカー色 |
| hoverColor | rgb | ホバー時の色 |

**イベント:**
- `tour:pointChanged` - ポイント移動時に発火

### tour-point.js
個々のツアーポイントを定義します。

**機能:**
- ポイント情報の保持
- エディターでカメラ方向を視覚化
- 接続先ポイントの設定

**主な属性:**
| 属性 | 型 | 説明 |
|------|-----|------|
| pointId | string | ユニークID |
| pointName | string | 表示名 |
| description | string | 説明文 |
| cameraRotationX | number | カメラPitch |
| cameraRotationY | number | カメラYaw |
| connections | string[] | 接続先ID |
| showGizmo | boolean | 方向ギズモ表示 |

### webxr-manager.js
WebXR（VR）対応を追加します。

**機能:**
- VRサポート検出
- VRセッション開始/終了
- UI自動非表示

**主な属性:**
| 属性 | 型 | 説明 |
|------|-----|------|
| cameraEntity | entity | XRカメラ |
| vrButtonId | string | VRボタンのDOM ID |
| autoHideUI | boolean | VR時にUI非表示 |

## 既存のツアーデータをインポート

`data/tour.json`の形式からEditor用に変換する場合:

```javascript
// ブラウザコンソールで実行
fetch('/data/tour.json')
  .then(r => r.json())
  .then(data => {
    data.points.forEach(p => {
      console.log(`
Entity: ${p.name}
Position: ${p.position.x}, ${p.position.y}, ${p.position.z}
Point ID: ${p.id}
Camera Pitch: ${p.rotation.x}
Camera Yaw: ${p.rotation.y}
Description: ${p.description}
      `);
    });
  });
```

## チーム開発

PlayCanvas Editorでのリアルタイムコラボレーション:

1. **プロジェクト共有**: Settings → Permissions でチームメンバーを招待
2. **リアルタイム編集**: 複数人が同時にシーンを編集可能
3. **バージョン管理**: Editor内でチェックポイントを作成可能

## 注意事項

- PlayCanvas Editorのスクリプトは `pc.createScript()` 形式を使用
- ES Modules（import/export）は使用不可
- `this.app` でアプリケーションにアクセス
- `this.entity` で自身のエンティティにアクセス

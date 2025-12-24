# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PlayCanvasエンジンを使用したGaussian Splatting (3DGS) バーチャルツアーアプリケーション。`.ply`ファイルから3Dスプラットを読み込み、定義されたポイント間をナビゲートできるインタラクティブなツアー体験を提供する。

## 開発コマンド

```bash
# 開発サーバー起動 (port 3000)
npm run dev

# プロダクションビルド
npm run build

# ビルドのプレビュー
npm run preview
```

## アーキテクチャ

### エントリーポイント
- `index.html` - ビューアーアプリ（ツアー体験用）
- `admin.html` - 管理画面（ツアーポイント編集用）

### コアモジュール (`src/`)

**VirtualTourApp** (`app.js`)
- メインアプリケーションクラス
- 各モジュールの初期化とシーン構築
- `.ply`ファイルと対応するJSONツアーデータの読み込み

**SplatLoader** (`splat-loader.js`)
- PlayCanvasの`GsplatHandler`を使用してGaussian Splatファイル(`.ply`)を読み込む
- `pc.Asset`として登録し、`gsplat`コンポーネントでシーンに追加

**CameraController** (`camera-controller.js`)
- マウスドラッグ/タッチによる視点回転（yaw/pitch制御）
- WASD/矢印キーによる移動（Q/Eで上下）
- Tween.jsによるポイント間のスムーズなカメラアニメーション

**TourManager** (`tour-manager.js`)
- ツアーポイントデータの管理（位置、回転、接続情報）
- 3Dマーカー（スフィア）の生成とレイキャスティングによるクリック検出
- ポイント間ナビゲーションとマーカー表示/非表示制御

**UIManager** (`ui-manager.js`)
- ローディング画面、ポイントリスト、情報パネルのDOM操作
- フルスクリーン切り替え

**WebXRManager** (`webxr-manager.js`)
- WebXR VRセッションの開始/終了
- VR対応ブラウザでVRボタンを表示

**AdminApp** (`admin/admin-app.js`)
- ツアーポイントのCRUD操作
- カメラ位置からのポイント作成・更新
- ポイント間の接続設定
- JSONデータの保存（Viteカスタムプラグイン経由）

### カスタムViteプラグイン (`vite.config.js`)
- `/api/save-tour` - ツアーJSONを`assets/`に保存
- `/api/list-ply` - `assets/`内の`.ply`ファイル一覧を返す

### データ構造

ツアーデータJSON（`assets/*.json`）:
```json
{
  "name": "ツアー名",
  "splatFile": "/assets/example.ply",
  "startPoint": "entrance",
  "points": [
    {
      "id": "entrance",
      "name": "エントランス",
      "position": { "x": 0, "y": 1.6, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "description": "説明文",
      "connections": ["next-point-id"]
    }
  ]
}
```

## 主要な依存関係

- **playcanvas** - 3Dエンジン（Gaussian Splat対応）
- **@tweenjs/tween.js** - カメラアニメーション
- **vite** - ビルドツール

## アセット配置

- `.ply`ファイル → `assets/`
- 対応するJSONファイル → `assets/`（同名で拡張子違い: `example.ply` → `example.json`）

## PlayCanvas Editor用スクリプト (`editor-scripts/`)

Webベースの[PlayCanvas Editor](https://playcanvas.com)で使用するための互換スクリプト。チーム開発やビジュアル編集に対応。

| スクリプト | 用途 |
|-----------|------|
| `camera-controller.js` | カメラ操作（`src/camera-controller.js`相当） |
| `tour-manager.js` | ツアー管理（`src/tour-manager.js`相当） |
| `tour-point.js` | 各ポイント定義（エンティティにアタッチ） |
| `webxr-manager.js` | VR対応（`src/webxr-manager.js`相当） |

**形式の違い:**
- `src/` ... ES Modules形式（Vite/npm用）
- `editor-scripts/` ... `pc.createScript()`形式（Editor用）

詳細は `editor-scripts/README.md` を参照。

import * as pc from 'playcanvas';

export class SplatLoader {
  constructor(app) {
    this.app = app;
    this.splatEntity = null;
    this.splatInstance = null;
  }

  async load(splatFile, onProgress) {
    return new Promise((resolve, reject) => {
      // Register GSplat handler if not already registered
      if (!this.app.loader.getHandler('gsplat')) {
        this.app.loader.addHandler('gsplat', new pc.GsplatHandler(this.app));
      }

      const asset = new pc.Asset('splat', 'gsplat', {
        url: splatFile
      });

      asset.on('load', () => {
        this.createSplatEntity(asset);
        if (onProgress) onProgress(100);
        resolve(asset);
      });

      asset.on('error', (err) => {
        console.error('Error loading splat:', err);
        reject(err);
      });

      asset.on('progress', (value) => {
        if (onProgress) onProgress(value * 100);
      });

      this.app.assets.add(asset);
      this.app.assets.load(asset);
    });
  }

  createSplatEntity(asset) {
    // Create entity for the splat
    this.splatEntity = new pc.Entity('gsplat');

    // Add GSplat component
    this.splatEntity.addComponent('gsplat', {
      asset: asset
    });

    // Add to scene
    this.app.root.addChild(this.splatEntity);

    console.log('Gaussian Splat loaded successfully');
  }

  getSplatEntity() {
    return this.splatEntity;
  }

  dispose() {
    if (this.splatEntity) {
      this.splatEntity.destroy();
      this.splatEntity = null;
    }
  }
}

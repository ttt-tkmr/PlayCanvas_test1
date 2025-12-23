import * as pc from 'playcanvas';

export class WebXRManager {
  constructor(app, camera) {
    this.app = app;
    this.camera = camera;
    this.xrSession = null;
    this.isVRSupported = false;
    this.isInVR = false;
    this.onEnterVR = null;
    this.onExitVR = null;
  }

  async init() {
    // Check if WebXR is supported
    if (!this.app.xr) {
      console.log('WebXR not available in this browser');
      return false;
    }

    try {
      // Check for VR support
      this.isVRSupported = await this.app.xr.isAvailable(pc.XRTYPE_VR);

      if (this.isVRSupported) {
        console.log('VR is supported');
        this.setupVRButton();
        this.setupXREvents();
        return true;
      } else {
        console.log('VR is not supported on this device');
        return false;
      }
    } catch (error) {
      console.error('Error checking VR support:', error);
      return false;
    }
  }

  setupVRButton() {
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
      vrButton.classList.add('supported');
      vrButton.addEventListener('click', () => this.toggleVR());
    }
  }

  setupXREvents() {
    this.app.xr.on('start', () => {
      console.log('XR session started');
      this.isInVR = true;
      this.hideUI();
      if (this.onEnterVR) this.onEnterVR();
    });

    this.app.xr.on('end', () => {
      console.log('XR session ended');
      this.isInVR = false;
      this.showUI();
      if (this.onExitVR) this.onExitVR();
    });

    this.app.xr.on('error', (error) => {
      console.error('XR error:', error);
    });
  }

  async toggleVR() {
    if (this.isInVR) {
      await this.exitVR();
    } else {
      await this.enterVR();
    }
  }

  async enterVR() {
    if (!this.isVRSupported) {
      console.log('VR is not supported');
      return false;
    }

    try {
      // Add XR camera component if not present
      if (!this.camera.camera.xr) {
        // Enable XR on camera
      }

      await this.app.xr.start(this.camera.camera, pc.XRTYPE_VR, pc.XRSPACE_LOCAL);
      return true;
    } catch (error) {
      console.error('Failed to enter VR:', error);
      return false;
    }
  }

  async exitVR() {
    if (!this.isInVR) return;

    try {
      await this.app.xr.end();
      return true;
    } catch (error) {
      console.error('Failed to exit VR:', error);
      return false;
    }
  }

  hideUI() {
    const elements = [
      document.getElementById('point-menu'),
      document.getElementById('ui-panel')
    ];

    elements.forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  showUI() {
    const elements = [
      document.getElementById('point-menu'),
      document.getElementById('ui-panel')
    ];

    elements.forEach(el => {
      if (el) el.style.display = '';
    });
  }

  setOnEnterVR(callback) {
    this.onEnterVR = callback;
  }

  setOnExitVR(callback) {
    this.onExitVR = callback;
  }

  isSupported() {
    return this.isVRSupported;
  }

  isActive() {
    return this.isInVR;
  }
}

import * as pc from 'playcanvas';
import { SplatLoader } from './splat-loader.js';
import { CameraController } from './camera-controller.js';
import { TourManager } from './tour-manager.js';
import { UIManager } from './ui-manager.js';
import { WebXRManager } from './webxr-manager.js';

class VirtualTourApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.app = null;
    this.camera = null;
    this.splatLoader = null;
    this.cameraController = null;
    this.tourManager = null;
    this.uiManager = null;
    this.webxrManager = null;
  }

  async init() {
    // Create PlayCanvas application
    this.app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(this.canvas),
      touch: new pc.TouchDevice(this.canvas),
      keyboard: new pc.Keyboard(window),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
        preferWebGl2: true
      }
    });

    // Configure application
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.app.resizeCanvas();
    });

    // Start the application
    this.app.start();

    // Set up scene
    this.setupScene();

    // Initialize modules
    this.splatLoader = new SplatLoader(this.app);
    this.cameraController = new CameraController(this.app, this.camera);
    this.tourManager = new TourManager(this.app, this.cameraController);
    this.tourManager.setCamera(this.camera);
    this.uiManager = new UIManager(this.tourManager);
    this.webxrManager = new WebXRManager(this.app, this.camera);

    // Load tour data and splat
    await this.loadTour();

    // Initialize WebXR if supported
    await this.webxrManager.init();
  }

  setupScene() {
    // Create camera entity
    this.camera = new pc.Entity('camera');
    this.camera.addComponent('camera', {
      clearColor: new pc.Color(0.1, 0.1, 0.15),
      fov: 75,
      nearClip: 0.1,
      farClip: 1000
    });
    this.camera.setPosition(0, 1.6, 5);
    this.app.root.addChild(this.camera);

    // Create ambient light
    const ambientLight = new pc.Entity('ambient-light');
    ambientLight.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 1, 1),
      intensity: 1
    });
    ambientLight.setEulerAngles(45, 30, 0);
    this.app.root.addChild(ambientLight);
  }

  getJsonPathFromPly(plyPath) {
    return plyPath.replace(/\.ply$/, '.json');
  }

  async getSplatFile() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const plyParam = urlParams.get('ply');
    if (plyParam) {
      return plyParam;
    }

    // Otherwise, get the first .ply file from the API
    try {
      const response = await fetch('/api/list-ply');
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0];
      }
    } catch (error) {
      console.error('Failed to get .ply file list:', error);
    }

    return null;
  }

  async loadTour() {
    try {
      // Get the splat file to use
      const splatFile = await this.getSplatFile();

      if (!splatFile) {
        this.uiManager.showError('No .ply file found in assets folder');
        return;
      }

      // Load corresponding JSON file
      const jsonPath = this.getJsonPathFromPly(splatFile);
      let tourData;

      try {
        const response = await fetch(jsonPath);
        if (response.ok) {
          tourData = await response.json();
        } else {
          // Create default tour data
          tourData = {
            name: splatFile.split('/').pop().replace('.ply', ''),
            splatFile: splatFile,
            startPoint: '',
            points: []
          };
        }
      } catch (error) {
        // Create default tour data
        tourData = {
          name: splatFile.split('/').pop().replace('.ply', ''),
          splatFile: splatFile,
          startPoint: '',
          points: []
        };
      }

      // Ensure splat file is set
      tourData.splatFile = splatFile;

      // Initialize tour manager with data
      this.tourManager.loadTourData(tourData);

      // Update UI
      this.uiManager.updatePointList(tourData.points);

      // Load the splat file
      await this.splatLoader.load(tourData.splatFile, (progress) => {
        this.uiManager.updateLoadingProgress(progress);
      });

      // Go to start point
      if (tourData.startPoint) {
        const startPoint = tourData.points.find(p => p.id === tourData.startPoint);
        if (startPoint) {
          this.tourManager.goToPoint(startPoint.id, false);
        }
      } else if (tourData.points.length > 0) {
        // Go to first point if no start point specified
        this.tourManager.goToPoint(tourData.points[0].id, false);
      }

      // Hide loading screen
      this.uiManager.hideLoading();

    } catch (error) {
      console.error('Failed to load tour:', error);
      this.uiManager.showError('Failed to load tour data');
    }
  }
}

// Initialize application
const app = new VirtualTourApp();
app.init().catch(console.error);

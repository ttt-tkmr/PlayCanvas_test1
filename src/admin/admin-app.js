import * as pc from 'playcanvas';
import * as TWEEN from '@tweenjs/tween.js';

class AdminApp {
  constructor() {
    this.canvas = document.getElementById('preview-canvas');
    this.app = null;
    this.camera = null;

    // Current splat file
    this.currentSplatFile = '';

    // Tour data
    this.tourData = {
      name: '',
      description: '',
      splatFile: '',
      startPoint: '',
      points: []
    };

    this.selectedPoint = null;
    this.splatEntity = null;

    // Camera control state
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.yaw = 0;
    this.pitch = 0;

    this.init();
  }

  async init() {
    // Create PlayCanvas application
    this.app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(this.canvas),
      touch: new pc.TouchDevice(this.canvas),
      keyboard: new pc.Keyboard(window)
    });

    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    window.addEventListener('resize', () => this.app.resizeCanvas());

    this.app.start();
    this.setupScene();
    this.setupCameraControls();
    this.setupUI();

    // Load available .ply files
    await this.loadPlyFileList();

    // Update loop
    this.app.on('update', () => {
      TWEEN.update();
      this.updateCameraPosition();
    });
  }

  setupScene() {
    // Create camera
    this.camera = new pc.Entity('camera');
    this.camera.addComponent('camera', {
      clearColor: new pc.Color(0.05, 0.05, 0.1),
      fov: 75
    });
    this.camera.setPosition(0, 1.6, 5);
    this.app.root.addChild(this.camera);

    // Create ambient light
    const light = new pc.Entity('light');
    light.addComponent('light', {
      type: 'directional',
      intensity: 1
    });
    light.setEulerAngles(45, 30, 0);
    this.app.root.addChild(light);

    // Create grid helper
    this.createGrid();
  }

  createGrid() {
    const gridSize = 20;
    const divisions = 20;

    for (let i = -gridSize / 2; i <= gridSize / 2; i += gridSize / divisions) {
      const lineX = new pc.Entity();
      lineX.addComponent('render', { type: 'box' });
      lineX.setLocalScale(gridSize, 0.01, 0.01);
      lineX.setPosition(0, 0, i);
      lineX.render.material = this.createGridMaterial();
      this.app.root.addChild(lineX);

      const lineZ = new pc.Entity();
      lineZ.addComponent('render', { type: 'box' });
      lineZ.setLocalScale(0.01, 0.01, gridSize);
      lineZ.setPosition(i, 0, 0);
      lineZ.render.material = this.createGridMaterial();
      this.app.root.addChild(lineZ);
    }
  }

  createGridMaterial() {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.2, 0.3);
    material.emissive = new pc.Color(0.1, 0.1, 0.15);
    material.update();
    return material;
  }

  setupCameraControls() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;

      this.yaw -= dx * 0.3;
      this.pitch -= dy * 0.3;
      this.pitch = Math.max(-89, Math.min(89, this.pitch));

      this.camera.setEulerAngles(this.pitch, this.yaw, 0);

      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    // Keyboard movement
    this.app.keyboard.on('keydown', (e) => {
      const speed = 0.5;
      const forward = new pc.Vec3();
      const right = new pc.Vec3();
      this.camera.getWorldTransform().getZ(forward);
      this.camera.getWorldTransform().getX(right);
      forward.scale(-1);

      const pos = this.camera.getPosition();

      if (e.key === pc.KEY_W) pos.add(forward.scale(speed));
      if (e.key === pc.KEY_S) pos.sub(forward.scale(speed));
      if (e.key === pc.KEY_A) pos.sub(right.scale(speed));
      if (e.key === pc.KEY_D) pos.add(right.scale(speed));
      if (e.key === pc.KEY_Q) pos.y -= speed;
      if (e.key === pc.KEY_E) pos.y += speed;

      this.camera.setPosition(pos);
    });
  }

  updateCameraPosition() {
    const pos = this.camera.getPosition();
    document.getElementById('camera-pos').textContent =
      `Position: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)} | Rotation: ${this.pitch.toFixed(0)}, ${this.yaw.toFixed(0)}`;
  }

  async loadPlyFileList() {
    try {
      const response = await fetch('/api/list-ply');
      const data = await response.json();

      const select = document.getElementById('splat-file');
      select.innerHTML = '<option value="">Select a .ply file...</option>';

      data.files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file.split('/').pop();
        select.appendChild(option);
      });

      // If there's only one file, select it automatically
      if (data.files.length === 1) {
        select.value = data.files[0];
        this.onSplatFileChange(data.files[0]);
      }
    } catch (error) {
      console.error('Failed to load .ply file list:', error);
    }
  }

  getJsonPathFromPly(plyPath) {
    return plyPath.replace(/\.ply$/, '.json');
  }

  async onSplatFileChange(splatFile) {
    if (!splatFile) return;

    this.currentSplatFile = splatFile;
    this.tourData.splatFile = splatFile;

    // Try to load corresponding JSON file
    const jsonPath = this.getJsonPathFromPly(splatFile);

    try {
      const response = await fetch(jsonPath);
      if (response.ok) {
        const data = await response.json();
        this.tourData = data;
        this.tourData.splatFile = splatFile; // Ensure splat file is set
        document.getElementById('tour-name').value = data.name || '';
        document.getElementById('tour-description').value = data.description || '';
      } else {
        // Create new tour data
        this.tourData = {
          name: splatFile.split('/').pop().replace('.ply', ''),
          description: '',
          splatFile: splatFile,
          startPoint: '',
          points: []
        };
        document.getElementById('tour-name').value = this.tourData.name;
        document.getElementById('tour-description').value = '';
      }
    } catch (error) {
      // Create new tour data
      this.tourData = {
        name: splatFile.split('/').pop().replace('.ply', ''),
        description: '',
        splatFile: splatFile,
        startPoint: '',
        points: []
      };
      document.getElementById('tour-name').value = this.tourData.name;
      document.getElementById('tour-description').value = '';
    }

    this.selectedPoint = null;
    document.getElementById('no-selection').style.display = 'flex';
    document.getElementById('point-editor').classList.remove('visible');
    document.getElementById('editor-actions').style.display = 'none';

    this.renderPointsList();
    this.updateStartPointSelect();
    this.loadSplat(splatFile);
  }

  updateStartPointSelect() {
    const select = document.getElementById('start-point');
    select.innerHTML = '<option value="">Select start point...</option>';

    this.tourData.points.forEach(point => {
      const option = document.createElement('option');
      option.value = point.id;
      option.textContent = point.name;
      if (this.tourData.startPoint === point.id) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  setupUI() {
    // Splat file selection
    document.getElementById('splat-file').addEventListener('change', (e) => {
      this.onSplatFileChange(e.target.value);
    });

    // Tour name
    document.getElementById('tour-name').addEventListener('input', (e) => {
      this.tourData.name = e.target.value;
    });

    // Tour description
    document.getElementById('tour-description').addEventListener('input', (e) => {
      this.tourData.description = e.target.value;
    });

    // Start point selection
    document.getElementById('start-point').addEventListener('change', (e) => {
      this.tourData.startPoint = e.target.value;
    });

    // Add point button
    document.getElementById('add-point-btn').addEventListener('click', () => {
      this.addNewPoint();
    });

    // Set position button
    document.getElementById('set-position-btn').addEventListener('click', () => {
      this.setCurrentPositionToPoint();
    });

    // Preview point button
    document.getElementById('preview-point-btn').addEventListener('click', () => {
      this.previewSelectedPoint();
    });

    // Delete point button
    document.getElementById('delete-point-btn').addEventListener('click', () => {
      this.deleteSelectedPoint();
    });

    // Add connection button
    document.getElementById('add-connection-btn').addEventListener('click', () => {
      this.addConnection();
    });

    // Import/Save
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-modal').classList.add('visible');
    });

    document.getElementById('import-cancel-btn').addEventListener('click', () => {
      document.getElementById('import-modal').classList.remove('visible');
    });

    document.getElementById('import-confirm-btn').addEventListener('click', () => {
      this.importTourData();
    });

    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveTourData();
    });

    // Point editor inputs
    const inputs = ['point-id', 'point-name', 'point-pos-x', 'point-pos-y', 'point-pos-z',
      'point-rot-x', 'point-rot-y', 'point-rot-z', 'point-description'];

    inputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        this.updateSelectedPointFromInputs();
      });
    });
  }

  async loadSplat(splatFile) {
    // Remove existing splat
    if (this.splatEntity) {
      this.splatEntity.destroy();
      this.splatEntity = null;
    }

    try {
      if (!this.app.loader.getHandler('gsplat')) {
        this.app.loader.addHandler('gsplat', new pc.GsplatHandler(this.app));
      }

      const asset = new pc.Asset('splat', 'gsplat', { url: splatFile });

      asset.on('load', () => {
        this.splatEntity = new pc.Entity('gsplat');
        this.splatEntity.addComponent('gsplat', { asset: asset });
        this.app.root.addChild(this.splatEntity);
        console.log('Splat loaded for preview');
      });

      asset.on('error', (err) => {
        console.log('Could not load splat:', err);
      });

      this.app.assets.add(asset);
      this.app.assets.load(asset);
    } catch (error) {
      console.log('Error loading splat:', error);
    }
  }

  renderPointsList() {
    const list = document.getElementById('points-list');
    list.innerHTML = '';

    // Clear existing markers
    this.tourData.points.forEach(point => {
      const existing = this.app.root.findByName(`marker-${point.id}`);
      if (existing) existing.destroy();
    });

    this.tourData.points.forEach((point) => {
      const card = document.createElement('div');
      card.className = 'point-card' + (this.selectedPoint === point ? ' selected' : '');
      card.innerHTML = `
        <div class="point-card-header">
          <span class="point-card-name">${point.name}</span>
          <span class="point-card-id">${point.id}</span>
        </div>
        <div class="point-card-pos">
          ${point.position.x.toFixed(1)}, ${point.position.y.toFixed(1)}, ${point.position.z.toFixed(1)}
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectPoint(point);
      });

      list.appendChild(card);

      // Create marker in 3D
      this.createPointMarker(point);
    });
  }

  createPointMarker(point) {
    const existing = this.app.root.findByName(`marker-${point.id}`);
    if (existing) existing.destroy();

    const marker = new pc.Entity(`marker-${point.id}`);
    marker.addComponent('render', { type: 'sphere' });
    marker.setLocalScale(0.2, 0.2, 0.2);
    marker.setPosition(point.position.x, point.position.y, point.position.z);

    const material = new pc.StandardMaterial();
    material.diffuse = this.selectedPoint === point
      ? new pc.Color(0, 0.83, 1)
      : new pc.Color(0.5, 0.5, 0.6);
    material.emissive = this.selectedPoint === point
      ? new pc.Color(0, 0.4, 0.5)
      : new pc.Color(0.2, 0.2, 0.25);
    material.update();
    marker.render.material = material;

    this.app.root.addChild(marker);
  }

  selectPoint(point) {
    this.selectedPoint = point;
    this.renderPointsList();

    document.getElementById('no-selection').style.display = 'none';
    document.getElementById('point-editor').classList.add('visible');
    document.getElementById('editor-actions').style.display = 'flex';

    document.getElementById('point-id').value = point.id;
    document.getElementById('point-name').value = point.name;
    document.getElementById('point-pos-x').value = point.position.x;
    document.getElementById('point-pos-y').value = point.position.y;
    document.getElementById('point-pos-z').value = point.position.z;
    document.getElementById('point-rot-x').value = point.rotation.x;
    document.getElementById('point-rot-y').value = point.rotation.y;
    document.getElementById('point-rot-z').value = point.rotation.z;
    document.getElementById('point-description').value = point.description;

    this.renderConnections();
    this.updateConnectionSelect();
  }

  renderConnections() {
    const list = document.getElementById('connections-list');
    list.innerHTML = '';

    if (!this.selectedPoint || !this.selectedPoint.connections) return;

    this.selectedPoint.connections.forEach(connId => {
      const connPoint = this.tourData.points.find(p => p.id === connId);
      if (!connPoint) return;

      const tag = document.createElement('div');
      tag.className = 'connection-tag';
      tag.innerHTML = `
        <span>${connPoint.name}</span>
        <button data-id="${connId}">&times;</button>
      `;

      tag.querySelector('button').addEventListener('click', (e) => {
        this.removeConnection(e.target.dataset.id);
      });

      list.appendChild(tag);
    });
  }

  updateConnectionSelect() {
    const select = document.getElementById('add-connection-select');
    select.innerHTML = '<option value="">Select point...</option>';

    this.tourData.points.forEach(point => {
      if (point === this.selectedPoint) return;
      if (this.selectedPoint.connections && this.selectedPoint.connections.includes(point.id)) return;

      const option = document.createElement('option');
      option.value = point.id;
      option.textContent = point.name;
      select.appendChild(option);
    });
  }

  addConnection() {
    const select = document.getElementById('add-connection-select');
    const connId = select.value;
    if (!connId || !this.selectedPoint) return;

    if (!this.selectedPoint.connections) {
      this.selectedPoint.connections = [];
    }

    this.selectedPoint.connections.push(connId);
    this.renderConnections();
    this.updateConnectionSelect();
  }

  removeConnection(connId) {
    if (!this.selectedPoint || !this.selectedPoint.connections) return;

    const index = this.selectedPoint.connections.indexOf(connId);
    if (index > -1) {
      this.selectedPoint.connections.splice(index, 1);
    }

    this.renderConnections();
    this.updateConnectionSelect();
  }

  updateSelectedPointFromInputs() {
    if (!this.selectedPoint) return;

    const oldId = this.selectedPoint.id;
    const newId = document.getElementById('point-id').value;

    this.selectedPoint.id = newId;
    this.selectedPoint.name = document.getElementById('point-name').value;
    this.selectedPoint.position.x = parseFloat(document.getElementById('point-pos-x').value) || 0;
    this.selectedPoint.position.y = parseFloat(document.getElementById('point-pos-y').value) || 0;
    this.selectedPoint.position.z = parseFloat(document.getElementById('point-pos-z').value) || 0;
    this.selectedPoint.rotation.x = parseFloat(document.getElementById('point-rot-x').value) || 0;
    this.selectedPoint.rotation.y = parseFloat(document.getElementById('point-rot-y').value) || 0;
    this.selectedPoint.rotation.z = parseFloat(document.getElementById('point-rot-z').value) || 0;
    this.selectedPoint.description = document.getElementById('point-description').value;

    // Update startPoint if ID changed
    if (oldId !== newId && this.tourData.startPoint === oldId) {
      this.tourData.startPoint = newId;
    }

    // Update connections referencing old ID
    if (oldId !== newId) {
      this.tourData.points.forEach(point => {
        if (point.connections) {
          const idx = point.connections.indexOf(oldId);
          if (idx > -1) {
            point.connections[idx] = newId;
          }
        }
      });
    }

    this.renderPointsList();
    this.updateStartPointSelect();
  }

  addNewPoint() {
    if (!this.currentSplatFile) {
      alert('Please select a .ply file first');
      return;
    }

    const pos = this.camera.getPosition();
    const newId = `point-${Date.now()}`;

    const newPoint = {
      id: newId,
      name: 'New Point',
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: this.pitch, y: this.yaw, z: 0 },
      description: '',
      connections: []
    };

    this.tourData.points.push(newPoint);

    if (this.tourData.points.length === 1) {
      this.tourData.startPoint = newId;
    }

    this.renderPointsList();
    this.updateStartPointSelect();
    this.selectPoint(newPoint);
  }

  setCurrentPositionToPoint() {
    if (!this.selectedPoint) return;

    const pos = this.camera.getPosition();
    this.selectedPoint.position = { x: pos.x, y: pos.y, z: pos.z };
    this.selectedPoint.rotation = { x: this.pitch, y: this.yaw, z: 0 };

    document.getElementById('point-pos-x').value = pos.x.toFixed(2);
    document.getElementById('point-pos-y').value = pos.y.toFixed(2);
    document.getElementById('point-pos-z').value = pos.z.toFixed(2);
    document.getElementById('point-rot-x').value = this.pitch.toFixed(0);
    document.getElementById('point-rot-y').value = this.yaw.toFixed(0);
    document.getElementById('point-rot-z').value = '0';

    this.renderPointsList();
  }

  previewSelectedPoint() {
    if (!this.selectedPoint) return;

    const pos = this.selectedPoint.position;
    const rot = this.selectedPoint.rotation;

    this.camera.setPosition(pos.x, pos.y, pos.z);
    this.pitch = rot.x;
    this.yaw = rot.y;
    this.camera.setEulerAngles(this.pitch, this.yaw, 0);
  }

  deleteSelectedPoint() {
    if (!this.selectedPoint) return;

    const index = this.tourData.points.indexOf(this.selectedPoint);
    if (index > -1) {
      this.tourData.points.splice(index, 1);
    }

    const deletedId = this.selectedPoint.id;

    // Reset startPoint if deleted
    if (this.tourData.startPoint === deletedId) {
      this.tourData.startPoint = this.tourData.points.length > 0 ? this.tourData.points[0].id : '';
    }

    this.tourData.points.forEach(point => {
      if (point.connections) {
        const connIndex = point.connections.indexOf(deletedId);
        if (connIndex > -1) {
          point.connections.splice(connIndex, 1);
        }
      }
    });

    const marker = this.app.root.findByName(`marker-${deletedId}`);
    if (marker) marker.destroy();

    this.selectedPoint = null;
    document.getElementById('no-selection').style.display = 'flex';
    document.getElementById('point-editor').classList.remove('visible');
    document.getElementById('editor-actions').style.display = 'none';

    this.renderPointsList();
    this.updateStartPointSelect();
  }

  importTourData() {
    try {
      const json = document.getElementById('import-json').value;
      const data = JSON.parse(json);

      this.tourData = data;

      // Update splat file selector if the file exists
      const select = document.getElementById('splat-file');
      if (data.splatFile) {
        select.value = data.splatFile;
        this.currentSplatFile = data.splatFile;
      }

      document.getElementById('tour-name').value = data.name || '';
      document.getElementById('tour-description').value = data.description || '';

      this.selectedPoint = null;
      document.getElementById('no-selection').style.display = 'flex';
      document.getElementById('point-editor').classList.remove('visible');
      document.getElementById('editor-actions').style.display = 'none';

      this.renderPointsList();
      this.updateStartPointSelect();

      if (data.splatFile) {
        this.loadSplat(data.splatFile);
      }

      document.getElementById('import-modal').classList.remove('visible');
      document.getElementById('import-json').value = '';

    } catch (error) {
      alert('Invalid JSON format');
    }
  }

  async saveTourData() {
    if (!this.currentSplatFile) {
      alert('Please select a .ply file first');
      return;
    }

    const jsonPath = this.getJsonPathFromPly(this.currentSplatFile);

    try {
      const response = await fetch('/api/save-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath: jsonPath,
          tourData: this.tourData
        })
      });

      const result = await response.json();

      if (result.success) {
        // Show save confirmation
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = '#2ecc71';
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.style.background = '';
        }, 2000);
      } else {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
  }
}

// Initialize
new AdminApp();

import * as pc from 'playcanvas';

export class TourManager {
  constructor(app, cameraController) {
    this.app = app;
    this.cameraController = cameraController;
    this.tourData = null;
    this.points = new Map();
    this.currentPoint = null;
    this.markerEntities = new Map();
    this.onPointChange = null;
    this.camera = null;

    // For raycasting
    this.ray = new pc.Ray();
    this.hoveredMarker = null;

    // Colors
    this.normalColor = new pc.Color(0, 0.83, 1);
    this.normalEmissive = new pc.Color(0, 0.4, 0.5);
    this.hoverColor = new pc.Color(1, 1, 1);
    this.hoverEmissive = new pc.Color(0.5, 0.8, 1);
  }

  setCamera(camera) {
    this.camera = camera;
    this.setupClickHandler();
    this.setupHoverHandler();
  }

  setupClickHandler() {
    const canvas = this.app.graphicsDevice.canvas;

    canvas.addEventListener('click', (e) => {
      this.onCanvasClick(e);
    });
  }

  setupHoverHandler() {
    const canvas = this.app.graphicsDevice.canvas;

    canvas.addEventListener('mousemove', (e) => {
      this.onCanvasMouseMove(e);
    });

    canvas.addEventListener('mouseleave', () => {
      this.clearHover();
    });
  }

  onCanvasMouseMove(event) {
    if (!this.camera || this.cameraController.isAnimating()) {
      this.clearHover();
      return;
    }

    const canvas = this.app.graphicsDevice.canvas;
    const rect = canvas.getBoundingClientRect();
    const hitId = this.getMarkerAtScreenPos(event.clientX - rect.left, event.clientY - rect.top);

    if (hitId) {
      if (this.hoveredMarker !== hitId) {
        this.clearHover();
        this.setHover(hitId);
      }
      canvas.style.cursor = 'pointer';
    } else {
      this.clearHover();
      canvas.style.cursor = 'grab';
    }
  }

  getMarkerAtScreenPos(screenX, screenY) {
    const cameraComponent = this.camera.camera;

    const nearPoint = new pc.Vec3();
    const farPoint = new pc.Vec3();

    cameraComponent.screenToWorld(screenX, screenY, cameraComponent.nearClip, nearPoint);
    cameraComponent.screenToWorld(screenX, screenY, cameraComponent.farClip, farPoint);

    const direction = new pc.Vec3();
    direction.sub2(farPoint, nearPoint).normalize();

    this.ray.origin.copy(nearPoint);
    this.ray.direction.copy(direction);

    let closestHit = null;
    let closestDistance = Infinity;

    this.markerEntities.forEach((entity, id) => {
      if (!entity.enabled) return;

      const position = entity.getPosition();
      const radius = 0.3;
      const hit = this.raySphereIntersect(this.ray, position, radius);

      if (hit !== null && hit < closestDistance) {
        closestDistance = hit;
        closestHit = id;
      }
    });

    return closestHit;
  }

  setHover(markerId) {
    this.hoveredMarker = markerId;
    const entity = this.markerEntities.get(markerId);
    if (entity && entity.render) {
      entity.render.material.diffuse = this.hoverColor;
      entity.render.material.emissive = this.hoverEmissive;
      entity.render.material.update();
      entity.setLocalScale(0.2, 0.2, 0.2);
    }
  }

  clearHover() {
    if (this.hoveredMarker) {
      const entity = this.markerEntities.get(this.hoveredMarker);
      if (entity && entity.render) {
        entity.render.material.diffuse = this.normalColor;
        entity.render.material.emissive = this.normalEmissive;
        entity.render.material.update();
        entity.setLocalScale(0.15, 0.15, 0.15);
      }
      this.hoveredMarker = null;
    }
  }

  onCanvasClick(event) {
    if (!this.camera || this.cameraController.isAnimating()) return;

    const canvas = this.app.graphicsDevice.canvas;
    const rect = canvas.getBoundingClientRect();

    // Calculate normalized device coordinates
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    // Get camera component
    const cameraComponent = this.camera.camera;

    // Create ray from camera through click point
    const nearPoint = new pc.Vec3();
    const farPoint = new pc.Vec3();

    cameraComponent.screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
      cameraComponent.nearClip,
      nearPoint
    );

    cameraComponent.screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
      cameraComponent.farClip,
      farPoint
    );

    const direction = new pc.Vec3();
    direction.sub2(farPoint, nearPoint).normalize();

    this.ray.origin.copy(nearPoint);
    this.ray.direction.copy(direction);

    // Check intersection with markers
    let closestHit = null;
    let closestDistance = Infinity;

    this.markerEntities.forEach((entity, id) => {
      if (!entity.enabled) return;

      const position = entity.getPosition();
      const radius = 0.3; // Collision radius

      // Ray-sphere intersection
      const hit = this.raySphereIntersect(this.ray, position, radius);

      if (hit !== null && hit < closestDistance) {
        closestDistance = hit;
        closestHit = id;
      }
    });

    if (closestHit) {
      this.goToPoint(closestHit, true);
    }
  }

  raySphereIntersect(ray, sphereCenter, sphereRadius) {
    const oc = new pc.Vec3();
    oc.sub2(ray.origin, sphereCenter);

    const a = ray.direction.dot(ray.direction);
    const b = 2.0 * oc.dot(ray.direction);
    const c = oc.dot(oc) - sphereRadius * sphereRadius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t > 0 ? t : null;
  }

  loadTourData(data) {
    this.tourData = data;

    // Index points by ID
    data.points.forEach(point => {
      this.points.set(point.id, point);
    });

    // Create 3D markers for each point
    this.createMarkers();
  }

  createMarkers() {
    this.points.forEach((point, id) => {
      const marker = this.createMarker(point);
      this.markerEntities.set(id, marker);
    });
  }

  createMarker(point) {
    const entity = new pc.Entity(`marker-${point.id}`);

    // Create a simple sphere marker
    entity.addComponent('render', {
      type: 'sphere',
      material: this.createMarkerMaterial()
    });

    entity.setLocalScale(0.15, 0.15, 0.15);
    entity.setPosition(point.position.x, point.position.y - 0.5, point.position.z);

    // Add collision for picking
    entity.addComponent('collision', {
      type: 'sphere',
      radius: 0.3
    });

    // Store point reference
    entity.pointData = point;

    this.app.root.addChild(entity);

    return entity;
  }

  createMarkerMaterial() {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0.83, 1);
    material.emissive = new pc.Color(0, 0.4, 0.5);
    material.opacity = 0.8;
    material.blendType = pc.BLEND_NORMAL;
    material.update();
    return material;
  }

  async goToPoint(pointId, animate = true) {
    const point = this.points.get(pointId);
    if (!point) {
      console.error(`Point not found: ${pointId}`);
      return;
    }

    // Update current point
    const previousPoint = this.currentPoint;
    this.currentPoint = point;

    // Update marker visibility
    this.updateMarkerVisibility(pointId);

    // Move camera
    const position = new pc.Vec3(point.position.x, point.position.y, point.position.z);
    const rotation = { x: point.rotation.x, y: point.rotation.y, z: point.rotation.z };

    await this.cameraController.moveTo(position, rotation, animate);

    // Notify listeners
    if (this.onPointChange) {
      this.onPointChange(point, previousPoint);
    }
  }

  updateMarkerVisibility(currentPointId) {
    this.markerEntities.forEach((entity, id) => {
      // Hide marker at current position, show others
      entity.enabled = id !== currentPointId;

      // Highlight connected points
      const point = this.points.get(currentPointId);
      if (point && point.connections) {
        const isConnected = point.connections.includes(id);
        if (isConnected && entity.render) {
          entity.render.material.emissive = new pc.Color(0, 0.6, 0.8);
          entity.render.material.update();
        }
      }
    });
  }

  getPoint(pointId) {
    return this.points.get(pointId);
  }

  getCurrentPoint() {
    return this.currentPoint;
  }

  getConnectedPoints() {
    if (!this.currentPoint || !this.currentPoint.connections) {
      return [];
    }
    return this.currentPoint.connections.map(id => this.points.get(id)).filter(Boolean);
  }

  getAllPoints() {
    return Array.from(this.points.values());
  }

  setOnPointChange(callback) {
    this.onPointChange = callback;
  }

  // Get direction to a point from current position
  getDirectionToPoint(pointId) {
    const point = this.points.get(pointId);
    if (!point || !this.currentPoint) return null;

    const currentPos = this.cameraController.getPosition();
    const targetPos = new pc.Vec3(point.position.x, point.position.y, point.position.z);

    const direction = new pc.Vec3();
    direction.sub2(targetPos, currentPos);
    direction.normalize();

    return direction;
  }

  // Calculate distance to a point
  getDistanceToPoint(pointId) {
    const point = this.points.get(pointId);
    if (!point) return Infinity;

    const currentPos = this.cameraController.getPosition();
    const targetPos = new pc.Vec3(point.position.x, point.position.y, point.position.z);

    return currentPos.distance(targetPos);
  }
}

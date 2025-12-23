export class UIManager {
  constructor(tourManager) {
    this.tourManager = tourManager;

    // DOM elements
    this.loadingEl = document.getElementById('loading');
    this.progressBar = document.getElementById('progress-bar');
    this.infoPanel = document.getElementById('info-panel');
    this.infoTitle = document.getElementById('info-title');
    this.infoDescription = document.getElementById('info-description');
    this.pointList = document.getElementById('point-list');
    this.fullscreenBtn = document.getElementById('fullscreen-button');

    this.setupEventListeners();
    this.setupTourCallbacks();
  }

  setupEventListeners() {
    // Fullscreen button
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
  }

  setupTourCallbacks() {
    this.tourManager.setOnPointChange((point, previousPoint) => {
      this.showPointInfo(point);
      this.updateActivePoint(point.id);
    });
  }

  updateLoadingProgress(progress) {
    if (this.progressBar) {
      this.progressBar.style.width = `${progress}%`;
    }
  }

  hideLoading() {
    if (this.loadingEl) {
      this.loadingEl.classList.add('hidden');
      setTimeout(() => {
        this.loadingEl.style.display = 'none';
      }, 500);
    }
  }

  showError(message) {
    if (this.loadingEl) {
      const textEl = this.loadingEl.querySelector('.loading-text');
      if (textEl) {
        textEl.textContent = message;
        textEl.style.color = '#ff6b6b';
      }
      const spinner = this.loadingEl.querySelector('.loading-spinner');
      if (spinner) spinner.style.display = 'none';
    }
  }

  updatePointList(points) {
    if (!this.pointList) return;

    this.pointList.innerHTML = '';

    points.forEach(point => {
      const item = document.createElement('div');
      item.className = 'point-item';
      item.dataset.pointId = point.id;
      item.innerHTML = `
        <span class="dot"></span>
        <span>${point.name}</span>
      `;

      item.addEventListener('click', () => {
        this.tourManager.goToPoint(point.id, true);
      });

      this.pointList.appendChild(item);
    });
  }

  updateActivePoint(pointId) {
    if (!this.pointList) return;

    // Remove active class from all items
    this.pointList.querySelectorAll('.point-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to current point
    const activeItem = this.pointList.querySelector(`[data-point-id="${pointId}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  showPointInfo(point) {
    if (!this.infoPanel || !point) return;

    this.infoTitle.textContent = point.name;
    this.infoDescription.textContent = point.description;
    this.infoPanel.classList.add('visible');
  }

  hidePointInfo() {
    if (this.infoPanel) {
      this.infoPanel.classList.remove('visible');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen not available:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  showVRButton() {
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
      vrButton.classList.add('supported');
    }
  }

  hideVRButton() {
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
      vrButton.classList.remove('supported');
    }
  }

  setVRButtonCallback(callback) {
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
      vrButton.addEventListener('click', callback);
    }
  }
}

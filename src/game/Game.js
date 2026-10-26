import * as THREE from 'three';
import { Track } from './Track.js';
import { PlayerCar } from '../vehicles/PlayerCar.js';
import { AICar } from '../vehicles/AICar.js';
import { carFactory } from '../vehicles/CarFactory.js';
import { CameraController } from './CameraController.js';
import { CollisionSystem } from './CollisionSystem.js';
import { RaceManager, RACE_STATES } from './RaceManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { RacingHUD } from '../ui/RacingHUD.js';
import { Garage } from '../ui/Garage.js';
import { DSALab } from '../ui/DSALab.js';
import { RaceResults } from '../ui/RaceResults.js';
import { Modals } from '../ui/Modals.js';
import { Storage } from '../utils/Storage.js';
import { sound } from './AudioSystem.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { PowerUpManager } from '../combat/PowerUpManager.js';

export const GAME_SCREENS = {
  MENU: 'menu',
  GARAGE: 'garage',
  RACING: 'racing',
  DSA_LAB: 'dsa_lab'
};

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');

    this.currentScreen = GAME_SCREENS.MENU;
    this.isPaused = false;
    this.lastTime = 0;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Systems
    this.track = null;
    this.playerCar = null;
    this.aiCars = [];
    this.cameraController = null;
    this.collisionSystem = new CollisionSystem(1.8);
    this.raceManager = null;

    // Showcase Car for Menu / Garage
    this.showcaseGroup = null;
    this.selectedCarId = Storage.getItem('sr_selected_car', 'factory_gt');

    // UI Modules
    this.mainMenu = null;
    this.racingHUD = null;
    this.garage = null;
    this.dsaLab = null;
    this.raceResults = null;
    this.modals = null;

    this.initThree();
    this.initWorld();
    this.initUI();
    this.bindGlobalKeys();
    this.openMainMenu();

    // Start render loop
    requestAnimationFrame(this.loop.bind(this));
  }

  initThree() {
    // 1. Scene with atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070e);
    this.scene.fog = new THREE.FogExp2(0x05070e, 0.002);

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1500);
    this.camera.position.set(0, 5, 12);

    // 3. Renderer with robust fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('High-performance WebGL renderer creation fallback:', e);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2233, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaaccff, 1.6);
    dirLight.position.set(100, 200, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    const shadowD = 150;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    this.scene.add(dirLight);

    // Cyan & orange trackside accent lights
    const accent1 = new THREE.PointLight(0x00f0ff, 2.5, 180);
    accent1.position.set(0, 25, -100);
    this.scene.add(accent1);

    const accent2 = new THREE.PointLight(0xff6600, 2.0, 180);
    accent2.position.set(230, 25, -150);
    this.scene.add(accent2);

    // 5. Camera controller
    this.cameraController = new CameraController(this.camera);

    // 6. Handle Window Resizing
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initWorld() {
    // 1. Build Track circuit with asphalt texture & checkpoints
    this.track = new Track(this.scene);

    // 2. Build Showcase car for Menu & Garage
    this.showcaseGroup = new THREE.Group();
    this.showcaseGroup.position.set(0, 0, -100);
    this.scene.add(this.showcaseGroup);
    this.showShowcaseCar(this.selectedCarId);

    // 3. Create Player Car
    this.playerCar = new PlayerCar(this.scene, this.selectedCarId);

    // 4. Create 3 Distinct AI Opponents (Apex, Nitro, Shadow)
    const aiSpecs = [
      {
        racerId: 'apex',
        carId: 'apex_phantom',
        personality: {
          name: 'Apex',
          speedMult: 0.98,
          accelMult: 1.05,
          corneringGrip: 0.95,
          lookaheadDist: 13.0,
          routePreference: 'shortcut'
        }
      },
      {
        racerId: 'nitro',
        carId: 'nitro_blaze',
        personality: {
          name: 'Nitro',
          speedMult: 1.08,
          accelMult: 1.15,
          corneringGrip: 0.78,
          lookaheadDist: 16.0,
          routePreference: 'highway'
        }
      },
      {
        racerId: 'shadow',
        carId: 'shadow_stealth',
        personality: {
          name: 'Shadow',
          speedMult: 1.0,
          accelMult: 1.0,
          corneringGrip: 0.90,
          lookaheadDist: 14.0,
          routePreference: 'fastest'
        }
      }
    ];

    this.aiCars = aiSpecs.map(spec => new AICar(
      this.scene,
      spec.racerId,
      spec.carId,
      spec.personality
    ));

    // 5. Race Manager
    this.raceManager = new RaceManager(this.track, this.playerCar, this.aiCars, {
      totalLaps: 3,
      onCountdownUpdate: (num, text) => {
        if (this.racingHUD) this.racingHUD.setCountdown(num, text);
      },
      onLapComplete: (lapNum, lapTime) => {
        if (this.racingHUD) {
          this.racingHUD.showNotification(`LAP ${lapNum} COMPLETED!`);
        }
      },
      onRaceFinish: (results) => {
        if (this.raceResults) {
          this.raceResults.show(results);
        }
      }
    });

    // 6. Combat System (DSA Object Pool, Projectiles, 3D Shield Bars)
    this.combatSystem = new CombatSystem(this.scene, this.track, this.playerCar, this.aiCars);

    this.playerCar.onFireCallback = () => {
      if (this.currentScreen === GAME_SCREENS.RACING && !this.isPaused) {
        this.combatSystem.firePlayerWeapon();
      }
    };

    this.combatSystem.onHit = (hitInfo) => {
      if (this.racingHUD) {
        if (hitInfo.isShieldBreak) {
          this.racingHUD.showCombatNotice(`SHIELD BREAK! ${hitInfo.target.name}`);
        } else {
          this.racingHUD.showCombatNotice(`HIT! ${hitInfo.target.name} -20 HP`);
        }
      }
    };

    // 7. Track Pickups & Power-ups (Ammo, Shield, Nitro)
    this.powerUpManager = new PowerUpManager(this.scene, this.track);

    this.cameraController.setTarget(this.playerCar);
  }

  initUI() {
    this.mainMenu = new MainMenu(this);
    this.racingHUD = new RacingHUD(this);
    this.garage = new Garage(this);
    this.dsaLab = new DSALab(this);
    this.raceResults = new RaceResults(this);
    this.modals = new Modals(this);
  }

  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentScreen === GAME_SCREENS.RACING) {
        this.togglePause();
      }
    });
  }

  showShowcaseCar(carId) {
    while (this.showcaseGroup.children.length > 0) {
      this.showcaseGroup.remove(this.showcaseGroup.children[0]);
    }

    const modelData = carFactory.createCarModel(carId);
    this.showcaseCarData = modelData;
    this.showcaseGroup.add(modelData.group);
  }

  setPlayerCarSelection(carId) {
    this.selectedCarId = carId;
    if (this.playerCar) {
      this.playerCar.destroy();
      this.playerCar = new PlayerCar(this.scene, carId);
      this.cameraController.setTarget(this.playerCar);
      this.raceManager.playerCar = this.playerCar;
      this.raceManager.allCars[0] = this.playerCar;
      this.raceManager.initStartingGrid();

      if (this.combatSystem) {
        this.playerCar.onFireCallback = () => {
          if (this.currentScreen === GAME_SCREENS.RACING && !this.isPaused) {
            this.combatSystem.firePlayerWeapon();
          }
        };
        this.combatSystem.registerCar(this.playerCar);
      }
    }
  }

  // ==========================================
  // SCREEN TRANSITIONS
  // ==========================================
  openMainMenu() {
    this.currentScreen = GAME_SCREENS.MENU;
    this.cameraController.mode = 'orbit';
    this.cameraController.orbitRadius = 7.5;
    this.cameraController.orbitSpeed = 0.3;

    if (this.combatSystem) {
      this.combatSystem.reset();
    }

    this.showcaseGroup.visible = true;
    this.playerCar.mesh.visible = false;
    this.aiCars.forEach(ai => ai.mesh.visible = false);

    this.mainMenu.show();
    this.racingHUD.hide();
    this.garage.hide();
    this.dsaLab.hide();
    this.raceResults.hide();
  }

  openGarage() {
    this.currentScreen = GAME_SCREENS.GARAGE;
    this.cameraController.mode = 'orbit';
    this.cameraController.orbitRadius = 6.8;
    this.cameraController.orbitSpeed = 0.45;

    this.showcaseGroup.visible = true;
    this.playerCar.mesh.visible = false;
    this.aiCars.forEach(ai => ai.mesh.visible = false);

    this.mainMenu.hide();
    this.racingHUD.hide();
    this.garage.show();
    this.dsaLab.hide();
    this.raceResults.hide();
  }

  openDSALab() {
    this.currentScreen = GAME_SCREENS.DSA_LAB;
    this.mainMenu.hide();
    this.racingHUD.hide();
    this.garage.hide();
    this.dsaLab.show();
    this.raceResults.hide();
  }

  openHowToPlay() {
    this.modals.openHowToPlay();
  }

  openSettings() {
    this.modals.openSettings();
  }

  startRace() {
    try {
      sound.ensureContext();
    } catch (e) {}

    console.log('[Game] Starting Quick Race mode with 3D Combat Systems...');
    this.currentScreen = GAME_SCREENS.RACING;
    this.isPaused = false;

    this.showcaseGroup.visible = false;
    this.playerCar.mesh.visible = true;
    this.aiCars.forEach(ai => ai.mesh.visible = true);

    this.mainMenu.hide();
    this.garage.hide();
    this.dsaLab.hide();
    this.raceResults.hide();
    this.racingHUD.show();

    // Reset combat state and power-ups for new race
    if (this.combatSystem) {
      this.combatSystem.reset();
    }
    if (this.powerUpManager) {
      this.powerUpManager.reset();
    }

    // Reset grid & countdown
    this.raceManager.initStartingGrid();
    this.cameraController.mode = 'chase';
    this.cameraController.snapToTarget();

    // Start 3.. 2.. 1.. GO! countdown
    this.raceManager.startCountdown();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      sound.stopEngine();
    }
  }

  // ==========================================
  // MAIN ANIMATION LOOP
  // ==========================================
  loop(timestamp) {
    requestAnimationFrame(this.loop.bind(this));

    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (!this.isPaused) {
      if (this.currentScreen === GAME_SCREENS.RACING) {
        const isRacingActive = this.raceManager.state === RACE_STATES.RACING;

        // 1. Update Player Car
        this.playerCar.update(dt, this.track, isRacingActive);

        // 2. Update AI Opponents
        const allRacers = [this.playerCar, ...this.aiCars];
        for (const ai of this.aiCars) {
          ai.update(dt, this.track, isRacingActive, allRacers);
        }

        // 3. Resolve Car-to-Car collisions
        this.collisionSystem.resolveCarCollisions(allRacers);

        // 4. Update Combat System (DSA Projectile Pool, 3D Laser Bolts, AI Fire, Shield Bars)
        if (this.combatSystem) {
          this.combatSystem.update(dt, this.camera, isRacingActive);
        }

        // 5. Update Collectible Power-ups (Ammo, Shield, Nitro)
        if (this.powerUpManager) {
          this.powerUpManager.update(dt, allRacers, (pickupType, car) => {
            if (car === this.playerCar && this.racingHUD) {
              this.racingHUD.showNotification(`COLLECTED: ${pickupType}!`);
            }
          });
        }

        // 6. Update Race Manager (Checkpoints, Queue, MergeSort Leaderboard)
        this.raceManager.update(dt);

        // 7. Update Racing HUD
        this.racingHUD.update(this.playerCar, this.raceManager, this.track);

        // 8. Update Camera Chase
        this.cameraController.update(dt);
      } else {
        // Orbit showcase camera in Menu or Garage
        this.cameraController.update(dt);
        if (this.showcaseGroup && this.showcaseCarData) {
          for (const w of this.showcaseCarData.wheels) {
            w.roller.rotation.x += dt * 1.5;
          }
        }
      }
    }

    // Render WebGL frame
    this.renderer.render(this.scene, this.camera);
  }
}

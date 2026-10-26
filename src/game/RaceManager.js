import * as THREE from 'three';
import { Queue } from '../dsa/Queue.js';
import { MergeSort } from '../dsa/MergeSort.js';
import { sound } from './AudioSystem.js';

export const RACE_STATES = {
  STAGING: 'staging',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  FINISHED: 'finished'
};

export class RaceManager {
  /**
   * @param {import('./Track.js').Track} track
   * @param {import('../vehicles/PlayerCar.js').PlayerCar} playerCar
   * @param {Array<import('../vehicles/AICar.js').AICar>} aiCars
   * @param {Object} [options]
   */
  constructor(track, playerCar, aiCars, options = {}) {
    this.track = track;
    this.playerCar = playerCar;
    this.aiCars = aiCars;
    this.allCars = [playerCar, ...aiCars];
    this.totalLaps = options.totalLaps || 3;

    this.state = RACE_STATES.STAGING;
    this.raceTimer = 0;
    this.countdown = 3;
    this.countdownTimer = 0;

    // FIFO Starting Grid Queue
    this.startingQueue = new Queue(8);
    this.releasedRacers = new Set();
    this.queueReleaseHistory = [];

    // Checkpoint order tracking
    // Pre-calculate approximate cumulative distance for each node to evaluate accurate lap progress
    this.nodeDistances = this.computeCumulativeDistances();
    this.totalCircuitDistance = this.computeEstimatedLapLength();

    // Leaderboard state (sorted by MergeSort)
    this.leaderboard = [];
    this.leaderboardTimer = 0;
    this.bestLapTime = Infinity;
    this.lapStartTimes = new Map();

    // Event callbacks
    this.onCountdownUpdate = options.onCountdownUpdate || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onLapComplete = options.onLapComplete || (() => {});
    this.onRaceFinish = options.onRaceFinish || (() => {});

    this.initStartingGrid();
  }

  computeCumulativeDistances() {
    const map = new Map();
    let accumulated = 0;
    const trunkOrder = ['CP_0', 'CP_1', 'CP_2', 'CP_3', 'CP_4', 'CP_8', 'CP_9', 'CP_10', 'CP_11', 'CP_12', 'CP_15', 'CP_16'];

    for (let i = 0; i < trunkOrder.length; i++) {
      const curr = trunkOrder[i];
      map.set(curr, accumulated);
      if (i < trunkOrder.length - 1) {
        const next = trunkOrder[i + 1];
        const p1 = this.track.nodePositions[curr];
        const p2 = this.track.nodePositions[next];
        if (p1 && p2) accumulated += p1.distanceTo(p2);
      }
    }

    // Branch nodes estimate
    map.set('CP_5A', map.get('CP_4') + 90);
    map.set('CP_6A', map.get('CP_4') + 190);
    map.set('CP_7A', map.get('CP_4') + 290);
    map.set('CP_5B', map.get('CP_4') + 100);
    map.set('CP_6B', map.get('CP_4') + 180);
    map.set('CP_13A', map.get('CP_12') + 120);
    map.set('CP_14A', map.get('CP_12') + 240);
    map.set('CP_13B', map.get('CP_12') + 100);
    map.set('CP_14B', map.get('CP_12') + 180);

    return map;
  }

  computeEstimatedLapLength() {
    const cp0 = this.track.nodePositions['CP_0'];
    const cp16 = this.track.nodePositions['CP_16'];
    const distTo0 = cp16 ? cp16.distanceTo(cp0) : 100;
    return (this.nodeDistances.get('CP_16') || 1200) + distTo0;
  }

  initStartingGrid() {
    this.startingQueue.clear();
    this.releasedRacers.clear();
    this.queueReleaseHistory = [];

    // Enqueue racers in starting order into the FIFO Queue:
    // Slot 0: Player
    // Slot 1: Apex
    // Slot 2: Nitro
    // Slot 3: Shadow
    this.allCars.forEach((car, index) => {
      const slot = this.track.getStartingGridSlot(index);
      car.reset(slot, this.track);

      this.startingQueue.enqueue({
        racerId: car.racerId,
        name: car.name,
        color: car.color,
        slotIndex: index
      });
    });

    this.updateLeaderboard();
  }

  startCountdown() {
    this.state = RACE_STATES.COUNTDOWN;
    this.countdown = 3;
    this.countdownTimer = 1.0;
    this.raceTimer = 0;
    this.bestLapTime = Infinity;

    sound.playCountdown(3);
    this.onCountdownUpdate(3, '3');
    this.onStateChange(this.state);
  }

  update(dt) {
    if (this.state === RACE_STATES.COUNTDOWN) {
      this.handleCountdown(dt);
    } else if (this.state === RACE_STATES.RACING) {
      this.handleRacing(dt);
    }
  }

  handleCountdown(dt) {
    this.countdownTimer -= dt;

    if (this.countdownTimer <= 0) {
      this.countdown--;
      this.countdownTimer = 1.0;

      if (this.countdown > 0) {
        sound.playCountdown(this.countdown);
        this.onCountdownUpdate(this.countdown, String(this.countdown));
      } else if (this.countdown === 0) {
        // "GO!" - Release racers from FIFO queue!
        sound.playCountdown(0);
        this.onCountdownUpdate(0, 'GO!');
        this.state = RACE_STATES.RACING;
        this.onStateChange(this.state);

        // Record lap start times
        for (const car of this.allCars) {
          this.lapStartTimes.set(car.racerId, 0);
        }

        // Release racers in FIFO order from Queue
        this.releaseAllRacersFromQueue();
      }
    }
  }

  /**
   * Dequeue all racers in strict FIFO order from starting grid queue
   */
  releaseAllRacersFromQueue() {
    let releaseSequence = 0;
    while (!this.startingQueue.isEmpty()) {
      const releasedEntry = this.startingQueue.dequeue();
      if (releasedEntry && !this.releasedRacers.has(releasedEntry.racerId)) {
        this.releasedRacers.add(releasedEntry.racerId);
        this.queueReleaseHistory.push({
          ...releasedEntry,
          releaseTime: releaseSequence * 0.15,
          timestamp: this.raceTimer
        });
        releaseSequence++;
      }
    }
  }

  handleRacing(dt) {
    this.raceTimer += dt;

    // 1. Checkpoint triggers and progress update for all racers
    for (const car of this.allCars) {
      if (car.isFinished) continue;

      this.checkRacerCheckpoints(car);
      this.calculateCarLapProgress(car);
    }

    // 2. Leaderboard update every 0.2s using MergeSort
    this.leaderboardTimer += dt;
    if (this.leaderboardTimer >= 0.2) {
      this.leaderboardTimer = 0;
      this.updateLeaderboard();
    }

    // 3. Race finished condition (player finished or all finished)
    if (this.playerCar.isFinished && this.state !== RACE_STATES.FINISHED) {
      this.state = RACE_STATES.FINISHED;
      sound.playFinishFanfare();
      this.updateLeaderboard();
      this.onStateChange(this.state);
      this.onRaceFinish(this.getFinalResults());
    }
  }

  checkRacerCheckpoints(car) {
    for (const [id, cp] of this.track.checkpoints.entries()) {
      const carForward = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
      if (cp.isTriggered(car.position, carForward)) {
        if (id === car.currentCheckpointId) continue; // Already at this CP

        // Validate checkpoint progression
        car.currentCheckpointId = id;
        car.setSafeCheckpoint(cp);

        // Start / Finish line crossing
        if (cp.isStartFinish) {
          // Verify that racer actually drove a valid circuit before counting lap
          if (car.lapProgress > 0.75) {
            car.completedLaps++;
            const lapTime = this.raceTimer - (this.lapStartTimes.get(car.racerId) || 0);
            this.lapStartTimes.set(car.racerId, this.raceTimer);

            if (car === this.playerCar) {
              sound.playCheckpointChime();
              if (lapTime < this.bestLapTime) this.bestLapTime = lapTime;
              this.onLapComplete(car.completedLaps, lapTime);
            }

            // Check if finished total laps
            if (car.completedLaps >= this.totalLaps) {
              car.isFinished = true;
              car.finishTimestamp = this.raceTimer;
            }
          }
        }
      }
    }
  }

  calculateCarLapProgress(car) {
    const currentBaseDist = this.nodeDistances.get(car.currentCheckpointId) || 0;
    const nextCpPos = this.track.nodePositions[car.nextCheckpointId] || this.track.nodePositions['CP_0'];
    const currentCpPos = this.track.nodePositions[car.currentCheckpointId] || car.position;

    const segmentLength = currentCpPos.distanceTo(nextCpPos) || 1;
    const distToNext = car.position.distanceTo(nextCpPos);
    const fractionOnSegment = Math.max(0, Math.min(1, 1 - (distToNext / segmentLength)));

    const approxTraveled = currentBaseDist + fractionOnSegment * segmentLength;
    car.lapProgress = Math.max(0, Math.min(0.999, approxTraveled / this.totalCircuitDistance));
  }

  /**
   * Sort leaderboard using custom Merge Sort implementation
   */
  updateLeaderboard() {
    const rawRacerList = this.allCars.map(car => ({
      racerId: car.racerId,
      name: car.name,
      color: car.color,
      isAI: car.isAI,
      speed: car.speed,
      completedLaps: car.completedLaps,
      lapProgress: car.lapProgress,
      isFinished: car.isFinished,
      finishTimestamp: car.finishTimestamp,
      totalRaceTime: car.totalRaceTime || this.raceTimer
    }));

    // Execute custom Merge Sort algorithm
    this.leaderboard = MergeSort.sort(rawRacerList);
  }

  getPlayerStanding() {
    const idx = this.leaderboard.findIndex(r => r.racerId === 'player');
    return idx >= 0 ? idx + 1 : 1;
  }

  getFinalResults() {
    this.updateLeaderboard();
    return {
      playerWon: this.leaderboard[0] && this.leaderboard[0].racerId === 'player',
      playerPosition: this.getPlayerStanding(),
      totalRaceTime: this.playerCar.finishTimestamp || this.raceTimer,
      bestLapTime: this.bestLapTime === Infinity ? this.raceTimer : this.bestLapTime,
      leaderboard: this.leaderboard
    };
  }
}

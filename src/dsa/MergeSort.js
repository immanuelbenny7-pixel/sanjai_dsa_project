/**
 * STREET RACER: ALGORITHM WARS
 * Merge Sort Leaderboard Implementation
 * 
 * Sorts racers based on genuine race progress and finish times.
 * Pure divide-and-conquer algorithm without Array.prototype.sort.
 * 
 * Time Complexity: O(n log n) in all cases (Best, Average, Worst).
 * Space Complexity: O(n) auxiliary space.
 */

export class MergeSort {
  /**
   * Default comparator for racing leaderboard:
   * Rank 1 (best) to Rank N.
   * - Finished racers rank above unfinished.
   * - Among finished racers: earliest finishTimestamp wins.
   * - Among unfinished racers:
   *     1. More completed laps rank higher.
   *     2. For equal laps: greater lapProgress (0.0 to 1.0) ranks higher.
   *     3. Tie-breaker: racerId.
   * 
   * Returns negative if `a` is ahead of `b` (a comes first), positive if `b` is ahead of `a`.
   */
  static defaultRacerComparator(a, b) {
    // 1. Finished status
    if (a.isFinished && !b.isFinished) return -1;
    if (!a.isFinished && b.isFinished) return 1;

    // 2. Both finished: compare finishTimestamp (earliest is better)
    if (a.isFinished && b.isFinished) {
      if (a.finishTimestamp !== b.finishTimestamp) {
        return a.finishTimestamp - b.finishTimestamp;
      }
    }

    // 3. Unfinished: compare completed laps (higher is better)
    const lapsA = a.completedLaps || 0;
    const lapsB = b.completedLaps || 0;
    if (lapsA !== lapsB) {
      return lapsB - lapsA; // Descending
    }

    // 4. Same lap: compare lap progress (higher is better)
    const progA = a.lapProgress !== undefined ? a.lapProgress : 0;
    const progB = b.lapProgress !== undefined ? b.lapProgress : 0;
    const progressDiff = progB - progA;
    if (Math.abs(progressDiff) > 1e-5) {
      return progressDiff; // Descending
    }

    // 5. Tie break by racer ID
    const idA = String(a.racerId || a.id || '');
    const idB = String(b.racerId || b.id || '');
    return idA.localeCompare(idB);
  }

  /**
   * Sort an array using Merge Sort algorithm.
   * @param {Array<any>} array
   * @param {Function} [comparator=MergeSort.defaultRacerComparator]
   * @param {Object} [tracker] Optional stats collector { comparisons, writes, steps }
   * @returns {Array<any>} New sorted array
   */
  static sort(array, comparator = MergeSort.defaultRacerComparator, tracker = null) {
    if (!Array.isArray(array)) {
      throw new Error('Input must be a valid array');
    }
    if (array.length <= 1) {
      return [...array];
    }

    return this.mergeSortRecursive([...array], comparator, tracker, 0, array.length - 1);
  }

  /**
   * Recursive divide step
   */
  static mergeSortRecursive(arr, comparator, tracker, leftIdx, rightIdx) {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const leftPart = arr.slice(0, mid);
    const rightPart = arr.slice(mid);

    if (tracker && tracker.steps) {
      tracker.steps.push({
        type: 'split',
        left: leftPart.map(x => ({ ...x })),
        right: rightPart.map(x => ({ ...x })),
        description: `Split array of ${arr.length} elements into left (${leftPart.length}) and right (${rightPart.length}).`
      });
    }

    const sortedLeft = this.mergeSortRecursive(leftPart, comparator, tracker, leftIdx, leftIdx + mid - 1);
    const sortedRight = this.mergeSortRecursive(rightPart, comparator, tracker, leftIdx + mid, rightIdx);

    return this.merge(sortedLeft, sortedRight, comparator, tracker);
  }

  /**
   * Conquer/Merge step combining two sorted sub-arrays
   */
  static merge(left, right, comparator, tracker) {
    const result = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
      if (tracker) tracker.comparisons = (tracker.comparisons || 0) + 1;

      const comp = comparator(left[i], right[j]);

      if (comp <= 0) {
        result.push(left[i]);
        if (tracker) tracker.writes = (tracker.writes || 0) + 1;
        i++;
      } else {
        result.push(right[j]);
        if (tracker) tracker.writes = (tracker.writes || 0) + 1;
        j++;
      }
    }

    while (i < left.length) {
      result.push(left[i]);
      if (tracker) tracker.writes = (tracker.writes || 0) + 1;
      i++;
    }

    while (j < right.length) {
      result.push(right[j]);
      if (tracker) tracker.writes = (tracker.writes || 0) + 1;
      j++;
    }

    if (tracker && tracker.steps) {
      tracker.steps.push({
        type: 'merge',
        merged: result.map(x => ({ ...x })),
        description: `Merged sub-arrays [${left.length}] and [${right.length}] into [${result.length}] sorted elements.`
      });
    }

    return result;
  }
}

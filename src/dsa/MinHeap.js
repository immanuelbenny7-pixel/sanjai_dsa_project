/**
 * STREET RACER: ALGORITHM WARS
 * MinHeap Priority Queue Implementation
 * 
 * Used in Dijkstra's Algorithm to extract the minimum tentative distance checkpoint.
 * Time Complexity:
 *  - insert: O(log n)
 *  - extractMin: O(log n)
 *  - peek: O(1)
 *  - isEmpty: O(1)
 *  - size: O(1)
 * Space Complexity: O(n)
 */

export class MinHeap {
  /**
   * @param {Function} [compareFn] Optional comparison function. Defaults to comparing `.distance` or numeric value.
   */
  constructor(compareFn = null) {
    this.heap = [];
    this.compareFn = compareFn || ((a, b) => {
      const valA = typeof a === 'object' && a !== null && 'distance' in a ? a.distance : a;
      const valB = typeof b === 'object' && b !== null && 'distance' in b ? b.distance : b;
      return valA - valB;
    });

    // Statistical counters for DSA Lab & analysis
    this.comparisons = 0;
    this.swaps = 0;
    this.operationsHistory = [];
  }

  /**
   * Parent index calculation: floor((i - 1) / 2)
   */
  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Left child index: 2i + 1
   */
  getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  /**
   * Right child index: 2i + 2
   */
  getRightChildIndex(i) {
    return 2 * i + 2;
  }

  hasParent(i) {
    return this.getParentIndex(i) >= 0;
  }

  hasLeftChild(i) {
    return this.getLeftChildIndex(i) < this.heap.length;
  }

  hasRightChild(i) {
    return this.getRightChildIndex(i) < this.heap.length;
  }

  parent(i) {
    return this.heap[this.getParentIndex(i)];
  }

  leftChild(i) {
    return this.heap[this.getLeftChildIndex(i)];
  }

  rightChild(i) {
    return this.heap[this.getRightChildIndex(i)];
  }

  swap(i, j) {
    this.swaps++;
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  compare(a, b) {
    this.comparisons++;
    return this.compareFn(a, b);
  }

  /**
   * Peek at the minimum element without removing it. O(1)
   */
  peek() {
    if (this.isEmpty()) return null;
    return this.heap[0];
  }

  /**
   * Check if heap is empty. O(1)
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Number of items in heap. O(1)
   */
  size() {
    return this.heap.length;
  }

  /**
   * Clear all items
   */
  clear() {
    this.heap = [];
    this.comparisons = 0;
    this.swaps = 0;
    this.operationsHistory = [];
  }

  /**
   * Insert an item and bubble it up to maintain the min-heap property. O(log n)
   * @param {any} item
   */
  insert(item) {
    this.heap.push(item);
    const startIndex = this.heap.length - 1;
    this.bubbleUp(startIndex);
    this.operationsHistory.push({
      type: 'insert',
      item,
      heapSnapshot: this.getSnapshot()
    });
  }

  /**
   * Bubble up an element at index to restore min-heap property
   */
  bubbleUp(index) {
    let current = index;
    while (this.hasParent(current) && this.compare(this.heap[current], this.parent(current)) < 0) {
      const parentIdx = this.getParentIndex(current);
      this.swap(current, parentIdx);
      current = parentIdx;
    }
  }

  /**
   * Extract the root (minimum) item and bubble down. O(log n)
   */
  extractMin() {
    if (this.isEmpty()) return null;

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    this.operationsHistory.push({
      type: 'extractMin',
      extracted: min,
      heapSnapshot: this.getSnapshot()
    });

    return min;
  }

  /**
   * Bubble down an element at index to restore min-heap property
   */
  bubbleDown(index) {
    let current = index;

    while (this.hasLeftChild(current)) {
      let smallerChildIndex = this.getLeftChildIndex(current);

      if (this.hasRightChild(current) && this.compare(this.rightChild(current), this.leftChild(current)) < 0) {
        smallerChildIndex = this.getRightChildIndex(current);
      }

      if (this.compare(this.heap[current], this.heap[smallerChildIndex]) <= 0) {
        break;
      }

      this.swap(current, smallerChildIndex);
      current = smallerChildIndex;
    }
  }

  /**
   * Returns a copy of the heap array
   */
  getSnapshot() {
    return this.heap.map(item => (typeof item === 'object' && item !== null ? { ...item } : item));
  }
}

/**
 * STREET RACER: ALGORITHM WARS
 * Graph Data Structure (Adjacency List)
 * 
 * Represents racing circuit checkpoints (vertices) and road segments (edges).
 * Edge weights represent travel distance or time cost.
 */

export class Graph {
  constructor() {
    // Map of vertexId -> { id, data, neighbors: Map<targetId, Edge> }
    this.vertices = new Map();
  }

  /**
   * Add a vertex (checkpoint) to the graph
   * @param {string|number} id Unique identifier
   * @param {Object} [data] Associated metadata (position, name, routeType, etc.)
   */
  addVertex(id, data = {}) {
    if (id === undefined || id === null) {
      throw new Error('Vertex ID cannot be null or undefined');
    }
    const key = String(id);
    if (this.vertices.has(key)) {
      throw new Error(`Vertex with ID "${key}" already exists`);
    }

    this.vertices.set(key, {
      id: key,
      data: { ...data },
      neighbors: new Map()
    });
    return this;
  }

  /**
   * Check if a vertex exists
   */
  hasVertex(id) {
    return this.vertices.has(String(id));
  }

  /**
   * Retrieve vertex details
   */
  getVertex(id) {
    return this.vertices.get(String(id)) || null;
  }

  /**
   * Add a directed edge from `fromId` to `toId` with a non-negative weight
   * @param {string|number} fromId Source vertex ID
   * @param {string|number} toId Destination vertex ID
   * @param {number} weight Travel cost / road distance
   * @param {Object} [metadata] Extra edge info (routeType, curvature, speedLimit)
   */
  addEdge(fromId, toId, weight, metadata = {}) {
    const from = String(fromId);
    const to = String(toId);

    if (!this.vertices.has(from)) {
      throw new Error(`Source vertex "${from}" does not exist in graph`);
    }
    if (!this.vertices.has(to)) {
      throw new Error(`Destination vertex "${to}" does not exist in graph`);
    }
    if (typeof weight !== 'number' || isNaN(weight) || weight < 0) {
      throw new Error(`Edge weight must be a non-negative number. Received: ${weight}`);
    }

    const sourceVertex = this.vertices.get(from);
    sourceVertex.neighbors.set(to, {
      from,
      to,
      weight,
      metadata: { ...metadata }
    });

    return this;
  }

  /**
   * Add a bidirectional road segment between two vertices
   */
  addBidirectionalEdge(u, v, weight, metadata = {}) {
    this.addEdge(u, v, weight, metadata);
    this.addEdge(v, u, weight, metadata);
    return this;
  }

  /**
   * Get all outgoing edges from a vertex
   * @param {string|number} id
   * @returns {Array<{to: string, weight: number, metadata: Object}>}
   */
  getNeighbors(id) {
    const key = String(id);
    const vertex = this.vertices.get(key);
    if (!vertex) {
      throw new Error(`Vertex "${key}" does not exist`);
    }
    return Array.from(vertex.neighbors.values());
  }

  /**
   * Get specific edge details between two vertices
   */
  getEdge(fromId, toId) {
    const vertex = this.vertices.get(String(fromId));
    if (!vertex) return null;
    return vertex.neighbors.get(String(toId)) || null;
  }

  /**
   * Return array of all vertex IDs
   */
  getVertexIds() {
    return Array.from(this.vertices.keys());
  }

  /**
   * Total number of vertices
   */
  get vertexCount() {
    return this.vertices.size;
  }

  /**
   * Total number of directed edges
   */
  get edgeCount() {
    let count = 0;
    for (const v of this.vertices.values()) {
      count += v.neighbors.size;
    }
    return count;
  }

  /**
   * Clear entire graph
   */
  clear() {
    this.vertices.clear();
  }
}

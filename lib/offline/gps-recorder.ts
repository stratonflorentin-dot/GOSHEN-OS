/**
 * GPS Recorder for offline boundary capture (Phase 9)
 * Handles GPS "Walk the Boundary" recording with filtering and validation
 */

import { idb, type GPSTrace } from "./idb";

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface RecordingState {
  status: "idle" | "recording" | "paused" | "reviewing" | "completed";
  points: GPSPoint[];
  startTime: number | null;
  endTime: number | null;
  distance: number;
  duration: number;
}

export class GPSRecorder {
  private watchId: number | null = null;
  private state: RecordingState = {
    status: "idle",
    points: [],
    startTime: null,
    endTime: null,
    distance: 0,
    duration: 0,
  };
  private minAccuracy = 25; // meters
  private minDistance = 2; // meters
  private minInterval = 3000; // 3 seconds
  private lastPoint: GPSPoint | null = null;
  private lastTimestamp = 0;

  async startRecording(farmId: string, plotId?: string): Promise<string> {
    if (this.state.status === "recording") {
      throw new Error("Already recording");
    }

    this.state = {
      status: "recording",
      points: [],
      startTime: Date.now(),
      endTime: null,
      distance: 0,
      duration: 0,
    };

    const traceId = this.generateId();

    // Request GPS permission and start watching
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported");
    }

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePosition(position),
        (error) => this.handleError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      // Initialize trace in IndexedDB
      await idb.saveGPSTrace({
        id: traceId,
        farmId,
        plotId,
        points: [],
        status: "recording",
        startTime: Date.now(),
      });

      return traceId;
    } catch (error) {
      this.state.status = "idle";
      throw error;
    }
  }

  pauseRecording(): void {
    if (this.state.status !== "recording") return;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.state.status = "paused";
  }

  resumeRecording(): void {
    if (this.state.status !== "paused") return;

    this.state.status = "recording";

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async stopRecording(traceId: string): Promise<GPSTrace> {
    if (this.state.status === "idle") {
      throw new Error("Not recording");
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.state.status = "completed";
    this.state.endTime = Date.now();
    this.state.duration = this.state.endTime - (this.state.startTime || 0);

    // Save final trace to IndexedDB
    const trace: GPSTrace = {
      id: traceId,
      farmId: "", // Will be updated from saved trace
      points: this.state.points,
      status: "completed",
      startTime: this.state.startTime || 0,
      endTime: this.state.endTime,
    };

    await idb.saveGPSTrace(trace);

    // Reset state
    this.state = {
      status: "idle",
      points: [],
      startTime: null,
      endTime: null,
      distance: 0,
      duration: 0,
    };

    return trace;
  }

  private handlePosition(position: GeolocationPosition): void {
    const now = Date.now();
    const point: GPSPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: now,
    };

    // Apply filters
    if (!this.passesFilters(point, now)) {
      return;
    }

    // Add to points
    this.state.points.push(point);
    this.lastPoint = point;
    this.lastTimestamp = now;

    // Update distance
    if (this.state.points.length > 1) {
      this.state.distance = this.calculateTotalDistance();
    }

    // Update duration
    if (this.state.startTime) {
      this.state.duration = now - this.state.startTime;
    }

    // Save to IndexedDB periodically
    this.saveToIndexedDB();
  }

  private passesFilters(point: GPSPoint, currentTime: number): boolean {
    // Accuracy filter
    if (point.accuracy > this.minAccuracy) {
      return false;
    }

    // Time interval filter
    if (this.lastTimestamp && currentTime - this.lastTimestamp < this.minInterval) {
      return false;
    }

    // Distance filter
    if (this.lastPoint) {
      const distance = this.calculateDistance(this.lastPoint, point);
      if (distance < this.minDistance) {
        return false;
      }
    }

    // Speed filter (prevent unrealistic jumps)
    if (this.lastPoint) {
      const distance = this.calculateDistance(this.lastPoint, point);
      const timeDiff = (point.timestamp - this.lastPoint.timestamp) / 1000; // seconds
      const speed = distance / timeDiff; // m/s

      if (speed > 15) { // 15 m/s = 54 km/h, unrealistic for walking
        return false;
      }
    }

    return true;
  }

  private calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateTotalDistance(): number {
    let total = 0;
    for (let i = 1; i < this.state.points.length; i++) {
      total += this.calculateDistance(this.state.points[i - 1], this.state.points[i]);
    }
    return total;
  }

  private handleError(error: GeolocationPositionError): void {
    console.error("GPS error:", error);
    // Could implement retry logic here
  }

  private async saveToIndexedDB(): Promise<void> {
    // This would save the current state to IndexedDB for persistence
    // For now, it's a placeholder
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  private generateId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const gpsRecorder = new GPSRecorder();
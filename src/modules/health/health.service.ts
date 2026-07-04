import { healthRepository } from './health.repository';

export interface HealthStatus {
  status: 'ok';
  db: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

export interface LivenessStatus {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  db: 'up' | 'down';
  timestamp: string;
}

/**
 * Service layer for health/probes. Liveness = "the process is up" (no
 * dependencies — used to decide restart). Readiness = "safe to receive traffic"
 * (checks the DB — used to gate the load balancer). `check` is the legacy
 * combined endpoint kept for back-compat.
 */
export const healthService = {
  async check(now: Date): Promise<HealthStatus> {
    let db: 'up' | 'down' = 'down';
    try {
      await healthRepository.ping();
      db = 'up';
    } catch {
      db = 'down';
    }

    return {
      status: 'ok',
      db,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: now.toISOString(),
    };
  },

  /** Liveness: no dependency checks — only that the event loop is serving. */
  liveness(now: Date): LivenessStatus {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: now.toISOString(),
    };
  },

  /** Readiness: healthy only when the DB is reachable. */
  async readiness(now: Date): Promise<ReadinessStatus> {
    let db: 'up' | 'down' = 'down';
    try {
      await healthRepository.ping();
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: db === 'up' ? 'ready' : 'not_ready', db, timestamp: now.toISOString() };
  },
};

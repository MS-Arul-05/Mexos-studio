import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Virus/malware scan hook for user-uploaded design files (G5). Runs when an
 * upload is attached to a custom order — the one moment the file enters our
 * workflow. Follows the provider-factory pattern: `noop` accepts everything
 * (dev/launch default); a real engine (ClamAV daemon, S3 bucket AV, VirusTotal)
 * plugs in behind this interface without touching order logic.
 *
 * Fail-closed contract: a provider ERROR rejects the file (scan required but
 * unavailable ≠ clean). The noop provider never errors.
 */
export interface ScanTarget {
  /** Storage object key (preferred — lets engines fetch server-side). */
  key?: string;
  /** Public URL within our own storage origin. */
  url: string;
}

export interface ScanResult {
  clean: boolean;
  reason?: string;
}

export interface VirusScanProvider {
  readonly name: string;
  scan(target: ScanTarget): Promise<ScanResult>;
}

const noopVirusScanProvider: VirusScanProvider = {
  name: 'noop',
  async scan(): Promise<ScanResult> {
    return { clean: true };
  },
};

function resolveProvider(): VirusScanProvider {
  switch (env.VIRUS_SCAN_PROVIDER) {
    case 'noop':
      return noopVirusScanProvider;
    default:
      logger.warn(
        `VIRUS_SCAN_PROVIDER="${env.VIRUS_SCAN_PROVIDER}" adapter not implemented yet; using noop.`,
      );
      return noopVirusScanProvider;
  }
}

export const virusScanProvider: VirusScanProvider = resolveProvider();

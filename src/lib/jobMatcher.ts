import { JobMatchCandidate, SourceOfTruthJob } from '../types';

type CaptureForMatching = {
  capturedAt?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
};

const DEFAULT_GPS_ACCURACY_METERS = 50;
const DISTANCE_FALLOFF_METERS = 1000;
const RECENCY_FALLOFF_HOURS = 24 * 30;
const DEFAULT_JOB_GEOFENCE_METERS = 250;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const calculateDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const deriveRecencyHours = (job: SourceOfTruthJob, now = Date.now()) => {
  const reference = job.updatedAt || job.createdAt;
  const timestamp = Date.parse(reference);
  if (Number.isNaN(timestamp)) return RECENCY_FALLOFF_HOURS;
  return Math.max(0, (now - timestamp) / 3600000);
};

export const scoreMatch = (
  distance: number,
  gpsAccuracy = DEFAULT_GPS_ACCURACY_METERS,
  recency = 0,
  geofenceRadius = DEFAULT_JOB_GEOFENCE_METERS
): number => {
  const effectiveAccuracy = Math.max(gpsAccuracy || DEFAULT_GPS_ACCURACY_METERS, 10);
  const effectiveGeofence = Math.max(geofenceRadius || DEFAULT_JOB_GEOFENCE_METERS, effectiveAccuracy);
  const distanceRatio = distance / Math.max(effectiveAccuracy, 1);
  const distanceScore = clamp(1 - distance / Math.max(effectiveGeofence, DISTANCE_FALLOFF_METERS), 0, 1);
  const withinAccuracyBonus = distanceRatio <= 1 ? 0.2 : 0;
  const withinGeofenceBonus = distance <= effectiveGeofence ? 0.1 : 0;
  const recencyScore = clamp(1 - recency / RECENCY_FALLOFF_HOURS, 0, 1);

  return clamp((distanceScore * 0.75) + (recencyScore * 0.15) + withinAccuracyBonus + withinGeofenceBonus, 0, 1);
};

export const findNearestJobs = (
  capture: CaptureForMatching,
  jobs: SourceOfTruthJob[],
  limit = 5
): JobMatchCandidate[] => {
  if (capture.gpsLatitude === undefined || capture.gpsLongitude === undefined) {
    return [];
  }

  return jobs
    .filter(job => job.active && job.latitude !== undefined && job.longitude !== undefined)
    .map((job) => {
      const distanceMeters = calculateDistanceMeters(
        capture.gpsLatitude!,
        capture.gpsLongitude!,
        job.latitude!,
        job.longitude!
      );
      const recencyHours = deriveRecencyHours(job);
      const confidence = scoreMatch(
        distanceMeters,
        capture.gpsAccuracyMeters,
        recencyHours,
        job.geofenceRadiusMeters
      );

      return {
        jobId: job.id,
        sourceJobId: job.jobId,
        confidence,
        distanceMeters: Math.round(distanceMeters),
        recencyHours: Math.round(recencyHours * 10) / 10,
      };
    })
    .sort((a, b) => b.confidence - a.confidence || (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, limit);
};

import { spawn } from 'node:child_process';
import { AppError } from './errors.js';
import { LIMITS } from '@clipper/shared/constants';

export interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

export interface FfprobeFormat {
  filename?: string;
  format_name?: string;
  format_long_name?: string;
  duration?: string;
  size?: string;
}

export interface FfprobeResult {
  streams: FfprobeStream[];
  format: FfprobeFormat;
}

export interface ValidatedVideoMeta {
  durationSec: number;
  mimeType: string;
}

export async function runFfprobe(filePath: string, timeoutMs = 15000): Promise<FfprobeResult> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn('ffprobe', args, {
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new AppError('UNSUPPORTED_MEDIA_TYPE', 'ffprobe timed out while analyzing video'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(
          new AppError(
            'UNSUPPORTED_MEDIA_TYPE',
            'Failed to probe video file (invalid or corrupted format)'
          )
        );
      }

      try {
        const parsed = JSON.parse(stdout) as FfprobeResult;
        resolve(parsed);
      } catch {
        reject(
          new AppError(
            'UNSUPPORTED_MEDIA_TYPE',
            'Failed to parse ffprobe video metadata'
          )
        );
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new AppError('INTERNAL', `ffprobe execution error: ${err.message}`));
    });
  });
}

export function validateVideoProbe(probeData: FfprobeResult, extension: string): ValidatedVideoMeta {
  const hasVideoStream = probeData.streams?.some((s) => s.codec_type === 'video');
  if (!hasVideoStream) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'File does not contain a valid video stream');
  }

  const formatName = probeData.format?.format_name?.toLowerCase() || '';
  const isMp4OrMov =
    formatName.includes('mp4') ||
    formatName.includes('mov') ||
    formatName.includes('quicktime') ||
    formatName.includes('m4a');
  const isWebmOrMatroska =
    formatName.includes('webm') || formatName.includes('matroska');

  if (!isMp4OrMov && !isWebmOrMatroska) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      `Unsupported video container format: ${formatName}`
    );
  }

  let mimeType = 'video/mp4';
  if (isWebmOrMatroska) {
    mimeType = 'video/webm';
  } else if (extension.toLowerCase() === '.mov') {
    mimeType = 'video/quicktime';
  }

  const rawDuration = probeData.format?.duration;
  if (!rawDuration) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Video duration could not be determined');
  }

  const durationSec = parseFloat(rawDuration);
  if (isNaN(durationSec) || durationSec <= 0) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Invalid video duration');
  }

  if (durationSec > LIMITS.MAX_VIDEO_MINUTES * 60) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Video duration (${Math.round(durationSec)}s) exceeds maximum allowed limit of ${LIMITS.MAX_VIDEO_MINUTES} minutes`
    );
  }

  return {
    durationSec,
    mimeType,
  };
}

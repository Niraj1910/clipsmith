import type { UserDto, VideoDto } from '@clipper/shared/dto';
import type { UserDocument, VideoDocument } from '@clipper/shared/models';

export function toUserDto(user: UserDocument | any): UserDto {
  return {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
    role: user.role,
    credits: user.credits,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function toVideoDto(video: VideoDocument | any): VideoDto {
  return {
    id: video._id ? video._id.toString() : video.id,
    ...(video.title ? { title: video.title } : {}),
    ...(video.originalFilename ? { originalFilename: video.originalFilename } : {}),
    ...(video.sizeBytes !== undefined ? { sizeBytes: video.sizeBytes } : {}),
    ...(video.durationSec !== undefined ? { durationSec: video.durationSec } : {}),
    status: video.status,
    ...(video.failureReason ? { failureReason: video.failureReason } : {}),
    createdAt: video.createdAt ? new Date(video.createdAt).toISOString() : new Date().toISOString(),
  };
}

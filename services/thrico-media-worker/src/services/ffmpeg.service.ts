import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import path from "path";
import { logger } from "../utils/logger";

// Point fluent-ffmpeg to the bundled static binaries so FFmpeg works
// without a system-level install (fixes "Cannot find ffmpeg" error).
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

export class FFmpegService {
  static async optimizeVideo(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    logger.info(`Optimizing video: ${inputPath} -> ${outputPath}`);
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-vf scale=720:1280",
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
        ])
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => {
          logger.error("FFmpeg optimization error", { error: err.message });
          reject(err);
        });
    });
  }

  static async convertToHLS(
    inputPath: string,
    outputDir: string,
    baseName: string,
  ): Promise<string> {
    logger.info(`Converting to HLS: ${inputPath} -> ${outputDir}`);
    const playlistPath = path.join(outputDir, `${baseName}.m3u8`);
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-profile:v baseline",
          "-level 3.0",
          "-start_number 0",
          "-hls_time 4",
          "-hls_list_size 0",
          "-f hls",
        ])
        .save(playlistPath)
        .on("end", () => resolve(playlistPath))
        .on("error", (err) => {
          logger.error("FFmpeg HLS error", { error: err.message });
          reject(err);
        });
    });
  }

  static async getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          logger.error("FFprobe duration error", { error: err.message });
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  static async generateThumbnailAtTimestamp(
    inputPath: string,
    outputPath: string,
    timestamp: number | string,
  ): Promise<void> {
    return this.generateMultipleThumbnails(
      inputPath,
      path.dirname(outputPath),
      [timestamp],
      path.basename(outputPath),
    );
  }

  static async generateMultipleThumbnails(
    inputPath: string,
    outputDir: string,
    timestamps: (number | string)[],
    filenamePattern: string,
  ): Promise<void> {
    logger.info(
      `Generating ${timestamps.length} thumbnails for: ${inputPath} in ${outputDir}`,
    );
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: timestamps as any[],
          filename: filenamePattern,
          folder: outputDir,
          size: "720x1280",
        })
        .on("end", () => resolve())
        .on("error", (err) => {
          logger.error("FFmpeg thumbnails error", {
            timestamps,
            error: err.message,
          });
          reject(err);
        });
    });
  }

  static async generateThumbnail(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return this.generateThumbnailAtTimestamp(inputPath, outputPath, "00:00:01");
  }
}

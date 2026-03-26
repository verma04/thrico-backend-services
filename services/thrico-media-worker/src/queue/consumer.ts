import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from "amqp-connection-manager";
import { config } from "../config";
import { logger } from "../utils/logger";
import { S3Service } from "../services/s3.service";
import { FFmpegService } from "../services/ffmpeg.service";
import { DBService } from "../services/db.service";
import { RabbitMQService } from "../services/rabbitmq.service";
import path from "path";
import fs from "fs";
import os from "os";
import { v4 as uuidv4 } from "uuid";

export class MomentConsumer {
  private static connection: AmqpConnectionManager;
  private static channelWrapper: ChannelWrapper;

  static async start() {
    this.connection = amqp.connect([config.rabbitmq.url]);

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: any) => {
        return Promise.all([
          channel.assertQueue(config.rabbitmq.queue, { durable: true }),
          channel.prefetch(config.worker.maxConcurrentJobs),
          channel.consume(config.rabbitmq.queue, (data: any) =>
            this.processMessage(data),
          ),
        ]);
      },
    });

    logger.info("Moment Consumer started", { queue: config.rabbitmq.queue });
  }

  private static async processMessage(message: any) {
    if (!message) return;

    try {
      const payload = JSON.parse(message.content.toString());
      const { momentId, videoUrl, entityId, userId, caption, shareInFeed } =
        payload;
      const jobId = uuidv4();
      const tempDir = path.join(os.tmpdir(), `moment-${jobId}`);

      logger.info("Processing moment job", { momentId, jobId });

      try {
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // 1. Mark as PROCESSING
        await DBService.updateMomentStatus(momentId, "PROCESSING");

        // 2. Download original
        let originalKey = "";
        try {
          const url = new URL(videoUrl);
          originalKey = url.pathname.startsWith("/")
            ? url.pathname.substring(1)
            : url.pathname;
        } catch (e) {
          // Handle case where videoUrl is already a path/key
          originalKey = videoUrl.startsWith("/")
            ? videoUrl.substring(1)
            : videoUrl;
        }
        const inputPath = path.join(tempDir, "original.mp4");
        await S3Service.downloadFile(originalKey, inputPath);

        // 3. Optimize Video
        const optimizedPath = path.join(tempDir, "optimized.mp4");
        await FFmpegService.optimizeVideo(inputPath, optimizedPath);

        // 4. Generate HLS
        const hlsDir = path.join(tempDir, "hls");
        if (!fs.existsSync(hlsDir)) fs.mkdirSync(hlsDir, { recursive: true });
        const hlsPlaylistPath = await FFmpegService.convertToHLS(
          optimizedPath,
          hlsDir,
          "index",
        );

        // 5. Generate Thumbnails
        const thumbnailOptions: string[] = [];
        let thumbnailUrl = "";
        try {
          const duration = await FFmpegService.getVideoDuration(inputPath);
          const interval = 2; // Every 2 seconds
          const numberOfThumbnails = Math.max(
            1,
            Math.floor(duration / interval),
          );
          const timestamps: number[] = [];

          for (let i = 1; i <= numberOfThumbnails; i++) {
            // Ensure timestamp doesn't exceed duration
            const ts = i * interval;
            timestamps.push(ts > duration ? duration - 0.1 : ts);
          }

          logger.info("Generating thumbnails every 2 seconds", {
            duration,
            count: timestamps.length,
          });

          await FFmpegService.generateMultipleThumbnails(
            inputPath,
            tempDir,
            timestamps,
            "thumb_%i.jpg",
          );

          for (let i = 0; i < timestamps.length; i++) {
            const thumbName = `thumb_${i + 1}.jpg`;
            const thumbPath = path.join(tempDir, thumbName);

            // Check if file exists (just in case)
            if (!fs.existsSync(thumbPath)) {
              logger.warn(`Thumbnail file not found: ${thumbPath}`);
              continue;
            }

            const thumbKey = `moments/${entityId}/${momentId}/${thumbName}`;
            const url = await S3Service.uploadFile(
              thumbKey,
              thumbPath,
              "image/jpeg",
            );
            const stats = fs.statSync(thumbPath);
            await DBService.trackStorage({
              entityId,
              fileKey: thumbKey,
              fileUrl: url,
              mimeType: "image/jpeg",
              sizeInBytes: stats.size,
              userId,
              module: "MOMENT",
              referenceId: momentId,
              metadata: { type: "thumbnail", index: i + 1 },
            });
            thumbnailOptions.push(url);

            // Set main thumbnailUrl to the one roughly in the middle
            const middleIndex = Math.floor(timestamps.length / 2);
            if (i === middleIndex) {
              thumbnailUrl = url;
            }
          }

          if (!thumbnailUrl && thumbnailOptions.length > 0) {
            thumbnailUrl = thumbnailOptions[0]!;
          }
        } catch (thumbError: any) {
          logger.error("Thumbnail generation/upload failed", {
            momentId,
            error: thumbError.message,
          });
        }

        // 6. Upload to S3
        const optimizedKey = `moments/${entityId}/${momentId}/optimized.mp4`;
        const optimizedUrl = await S3Service.uploadFile(
          optimizedKey,
          optimizedPath,
          "video/mp4",
        );

        const videoStats = fs.statSync(optimizedPath);
        let videoMetadata: any = { type: "optimized_video" };
        try {
          const duration = await FFmpegService.getVideoDuration(optimizedPath);
          videoMetadata.duration = duration;
          // Optionally get resolution if needed, but for now duration is a good addition.
        } catch (e: any) {
          logger.warn("Failed to get optimized video metadata", { error: e.message });
        }

        await DBService.trackStorage({
          entityId,
          fileKey: optimizedKey,
          fileUrl: optimizedUrl,
          mimeType: "video/mp4",
          sizeInBytes: videoStats.size,
          userId,
          module: "MOMENT",
          referenceId: momentId,
          metadata: videoMetadata,
        });

        // Upload HLS segments
        const hlsFiles = fs.readdirSync(hlsDir);
        let hlsUrl = "";
        for (const file of hlsFiles) {
          const fileKey = `moments/${entityId}/${momentId}/hls/${file}`;
          const filePath = path.join(hlsDir, file);
          const url = await S3Service.uploadFile(
            fileKey,
            filePath,
            file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T",
          );

          const hlsStats = fs.statSync(filePath);
          await DBService.trackStorage({
            entityId,
            fileKey,
            fileUrl: url,
            mimeType: file.endsWith(".m3u8")
              ? "application/x-mpegURL"
              : "video/MP2T",
            sizeInBytes: hlsStats.size,
            userId,
            module: "MOMENT",
            referenceId: momentId,
            metadata: {
              type: file.endsWith(".m3u8") ? "hls_playlist" : "hls_segment",
              filename: file,
            },
          });

          if (file.endsWith(".m3u8")) hlsUrl = url;
        }

        // 7. Trigger AI Analysis in Background Worker
        if (caption) {
          try {
            logger.info("Triggering background AI analysis", { momentId });
            await RabbitMQService.publishToQueue("PROCESS_AI_ANALYSIS", {
              momentId,
              caption,
              userId,
              entityId,
            });
          } catch (aiError: any) {
            logger.error("Failed to trigger AI analysis queue", {
              momentId,
              error: aiError.message,
            });
          }
        }

        // 8. Update DB
        await DBService.updateMomentStatus(momentId, "PUBLISHED", {
          optimizedVideoUrl: optimizedUrl,
          thumbnailUrl,
          thumbnailOptions,
          hlsUrl,
        });

        // 8.5 Trigger Close Friend Notification
        try {
          logger.info("Triggering close friend notification for moment", {
            momentId,
          });
          await RabbitMQService.publishToQueue("CLOSE_FRIEND_NOTIFICATIONS", {
            creatorId: userId,
            entityId,
            type: "MOMENT_POSTED",
            contentId: momentId,
            title: caption || "a new moment",
            timestamp: new Date().toISOString(),
            module: "MOMENT",
          });
        } catch (nfError: any) {
          logger.error("Failed to trigger close friend notification", {
            momentId,
            error: nfError.message,
          });
        }

        // 9. Share to feed automatically if requested
        if (shareInFeed) {
          logger.info("Automatically sharing moment to feed", {
            momentId,
            shareInFeed,
          });
          await DBService.shareMomentToFeed({
            momentId,
            userId,
            entityId,
            caption,
            videoUrl: optimizedUrl,
            thumbnailUrl,
          });
        }

        this.channelWrapper.ack(message);
        logger.info("Moment job completed successfully", { momentId, jobId });
      } catch (innerError: any) {
        logger.error("Moment job failed", {
          momentId,
          jobId,
          error: innerError.message,
        });
        await DBService.updateMomentStatus(momentId, "FAILED");
        this.channelWrapper.ack(message); // Ack to prevent infinite loop
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (outerError: any) {
      logger.error("Outer consumer error", { error: outerError.message });
      this.channelWrapper.nack(message, false, true);
    }
  }
}

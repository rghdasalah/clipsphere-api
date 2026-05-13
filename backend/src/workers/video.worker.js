const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const { s3Client } = require('../config/s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { probeVideo } = require('../utils/videoProbe');
const Video = require('../models/Video');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const worker = new Worker(
  'video',
  async (job) => {
    if (job.name !== 'probe') {
      console.warn(`[video.worker] unknown job name: ${job.name}`);
      return;
    }
    const { videoId, bucket, key } = job.data;
    const obj = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const buf = await streamToBuffer(obj.Body);
    const meta = await probeVideo(buf);
    await Video.findByIdAndUpdate(videoId, {
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      codec: meta.codec,
    });
    console.log(
      `[video.worker] probed ${videoId} duration=${meta.duration} ${meta.width}x${meta.height} codec=${meta.codec}`
    );
  },
  { connection, concurrency: 2 }
);

module.exports = worker;

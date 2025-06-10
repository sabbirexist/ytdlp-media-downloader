const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { tmpdir } = require('os');
const { promisify } = require('util');
const ytdlp = require('yt-dlp-exec');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { url, type } = JSON.parse(event.body || '{}');
  if (!url || !type) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing URL or type" }) };
  }

  try {
    const outDir = tmpdir();
    const format = type === 'video' ? 'bestvideo+bestaudio/best' :
                   type === 'audio' ? 'bestaudio' : 'best';

    const ext = type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : 'mp4';
    const output = path.join(outDir, `media.%(ext)s`);

    await ytdlp(url, {
      output,
      format,
      extractAudio: type === 'audio',
      audioFormat: 'mp3',
      skipDownload: type === 'image',
      writeThumbnail: type === 'image',
      noCheckCertificates: true,
      preferFreeFormats: true,
      noWarnings: true,
      embedThumbnail: type === 'audio',
      verbose: false
    });

    const downloadedFile = fs.readdirSync(outDir).find(f => f.startsWith("media.") && f.endsWith(ext));
    const filePath = path.join(outDir, downloadedFile);
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const mimeType = ext === 'mp3' ? 'audio/mpeg' : ext === 'jpg' ? 'image/jpeg' : 'video/mp4';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        downloadUrl: `data:${mimeType};base64,${base64}`
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unknown error' })
    };
  }
};

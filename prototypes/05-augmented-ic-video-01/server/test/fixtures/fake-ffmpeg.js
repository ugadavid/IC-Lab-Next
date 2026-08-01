"use strict";

const fs = require("node:fs");

const role = process.argv[2];
const args = process.argv.slice(3);

if (args.includes("-version")) {
  process.stdout.write(role === "--ffprobe" ? "ffprobe version fixture-1.0\n" : "ffmpeg version fixture-1.0\n");
  process.exit(0);
}

if (role === "--ffprobe") {
  const bytes = fs.readFileSync(args.at(-1));
  if (!bytes.length) process.exit(1);
  process.stdout.write(JSON.stringify({
    streams: [
      { codec_type: "video", codec_name: "h264", width: 320, height: 180, r_frame_rate: "25/1" },
      { codec_type: "audio", codec_name: "aac" }
    ],
    format: { duration: "2.000" }
  }));
  process.exit(0);
}

async function main() {
  const input = args[args.indexOf("-i") + 1];
  const output = args.at(-1);
  const manifest = await fetch(input);
  if (!manifest.ok) throw new Error(`fixture input HTTP ${manifest.status}`);
  const text = await manifest.text();
  const segment = text.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith("#"));
  const response = segment ? await fetch(new URL(segment, input)) : manifest;
  if (!response.ok) throw new Error(`fixture segment HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(output, bytes.length ? bytes : Buffer.from("PROTO05-HLS-FIXTURE"));
  process.stdout.write("out_time_us=2000000\nspeed=10.0x\nprogress=end\n");
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
});

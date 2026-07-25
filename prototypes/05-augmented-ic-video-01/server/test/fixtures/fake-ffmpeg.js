"use strict";

const fs = require("node:fs");
const { spawn } = require("node:child_process");

const role = process.argv[2];
const args = process.argv.slice(3);
const mode = process.env.PROTO05_TEST_FFMPEG_MODE || "success";

if (args.includes("-version")) {
  process.stdout.write(role === "--ffprobe" ? "ffprobe version fixture-1.0\n" : "ffmpeg version fixture-1.0\n");
  process.exit(0);
}

if (role === "--ffprobe") {
  const file = args.at(-1);
  const bytes = fs.readFileSync(file);
  if (!bytes.length || bytes.subarray(0, 7).toString() === "INVALID") {
    process.stderr.write("fixture media unreadable\n");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1280, height: 720, r_frame_rate: "25/1" },
      { codec_type: "audio", codec_name: "aac" }
    ],
    format: { duration: "12.000" }
  }));
  process.exit(0);
}

async function main() {
  if (mode === "fail") {
    process.stderr.write("fixture failure without a remote URL\n");
    process.exit(7);
  }
  const inputIndex = args.indexOf("-i");
  const input = args[inputIndex + 1];
  const output = args.at(-1);
  if (!input || !output) throw new Error("missing fixture input or output");
  if (mode === "slow-child") {
    const child = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { windowsHide: true, stdio: "ignore" });
    if (process.env.PROTO05_TEST_CHILD_PID_FILE) fs.writeFileSync(process.env.PROTO05_TEST_CHILD_PID_FILE, String(child.pid));
  }
  const response = await fetch(input);
  if (!response.ok) throw new Error(`fixture input HTTP ${response.status}`);
  let bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString("utf8");
  if (text.startsWith("#EXTM3U")) {
    const segment = text.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith("#"));
    if (segment) {
      const segmentResponse = await fetch(new URL(segment, input));
      if (!segmentResponse.ok) throw new Error(`fixture segment HTTP ${segmentResponse.status}`);
      bytes = Buffer.from(await segmentResponse.arrayBuffer());
    }
  }
  if (mode === "invalid") bytes = Buffer.from("INVALID-output");
  if (mode === "slow" || mode === "slow-child") {
    for (let index = 1; index <= 40; index += 1) {
      fs.appendFileSync(output, bytes.subarray(0, Math.max(1, Math.ceil(bytes.length / 40))));
      process.stdout.write(`out_time_us=${index * 250000}\nspeed=1.0x\nprogress=continue\n`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } else {
    fs.writeFileSync(output, bytes.length ? bytes : Buffer.from("fixture-video"));
    process.stdout.write("out_time_us=12000000\nspeed=1.25x\nprogress=end\n");
  }
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
});

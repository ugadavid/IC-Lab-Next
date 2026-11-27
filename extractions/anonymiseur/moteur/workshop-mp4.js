"use strict";

const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

function probeMedia(probe, file) {
  const data = JSON.parse(execFileSync(probe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    {encoding:"utf8", windowsHide:true, timeout:30000}));
  const select = type => {
    const streams = data.streams.filter(s => s.codec_type === type && !s.disposition?.attached_pic);
    return streams.find(s => s.disposition?.default) || streams[0];
  };
  const video = select("video");
  if (!video) throw Error("La source ne contient aucune piste vidéo lisible.");
  return {video, audio:select("audio"), streams:data.streams, duration:Number(data.format.duration),
    start:Number(data.format.start_time) || 0};
}

// Comme dans l’aperçu, le dernier passage dans le tableau gagne sur [début, fin).
function audioIntervals(parts) {
  const audio = parts.filter(p => p.type === "audio");
  const edges = [...new Set(audio.flatMap(p => [p.start, p.end]))].sort((a, b) => a - b);
  const intervals = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const start = edges[i], end = edges[i + 1];
    const active = audio.findLast(p => p.start <= start && start < p.end);
    if (!active) continue;
    const last = intervals.at(-1);
    if (last?.effect === active.effect && last.end === start) last.end = end;
    else intervals.push({start, end, effect:active.effect});
  }
  return intervals;
}

const sec = value => Number(value).toFixed(9);
function windowExpr({start, end}) {
  return `gte(t,${sec(start)})*lt(t,${sec(end)})`;
}

function buildRecipe(project, input) {
  const {width, height} = input.video;
  const masks = project.parts.filter(p => p.type === "image");
  if (!Number.isFinite(input.duration) || Math.abs(input.duration - project.duration) > .08)
    throw Error("La durée de la source ne correspond plus à la version enregistrée.");
  if (input.video.side_data_list?.some(item => Number(item.rotation)) ||
      !["1:1", "0:1", "N/A", undefined].includes(input.video.sample_aspect_ratio))
    throw Error("La rotation ou le format de pixel de cette source nécessite une préparation carrée sans rotation.");
  const graph = [], frame = "0:" + input.video.index;
  // Travailler en 4:4:4 pour placer chaque bord au pixel de l’image utile.
  const base = `[${frame}]scale=iw:ih:flags=neighbor,format=yuv444p`;
  let video = "base";
  if (masks.length) {
    graph.push(base + ",split=3[original][sharp][stencil]");
    const resolution = Math.min(1, 1280 / Math.max(width, height));
    const sigma = Math.max(4, Math.round(Math.round(width * resolution) * .017)) / resolution;
    graph.push("[sharp]gblur=sigma=" + sigma + ":steps=3[blurred]");
    const shapes = masks.map(p => {
      const x = Math.floor(p.x * width), y = Math.floor(p.y * height);
      const w = Math.min(width, Math.ceil((p.x + p.w) * width)) - x;
      const h = Math.min(height, Math.ceil((p.y + p.h) * height)) - y;
      return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=white:t=fill:enable='${windowExpr(p)}'`;
    });
    // Un masque binaire commun aux trois plans conserve le flou une seule fois dans les intersections.
    graph.push("[stencil]extractplanes=y,lut=y=0," + shapes.join(",") +
      ",lut=y='if(gt(val,0),255,0)',mergeplanes=0x000000:yuv444p[mask]");
    graph.push("[original][blurred][mask]maskedmerge[base]");
  } else video = frame;
  graph.push(`[${video}]scale=iw:ih:flags=neighbor,format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2[outv]`);

  const intervals = audioIntervals(project.parts);
  const tone = intervals.filter(i => i.effect === "Remplacer par un bip");
  const hasAudio = Boolean(input.audio || tone.length);
  if (hasAudio && intervals.length) {
    const src = input.audio ? `[0:${input.audio.index}]aresample=48000:first_pts=0,apad` : "anullsrc=r=48000:cl=stereo";
    // aeval évalue chaque échantillon. Le bip de la V12 est une sinusoïde à 650 Hz, gain 0,045.
    const original = input.audio ? "val(ch)" : "0";
    const sum = list => list.map(windowExpr).join("+") || "0";
    const expr = `if(${sum(tone)},0.045*sin(2*PI*650*t),if(${sum(intervals)},0,${original}))`;
    graph.push(`${src},atrim=end=${sec(input.duration)},aeval=exprs='${expr}':c=same[outa]`);
  }
  const copyAudio = !intervals.length && input.audio?.codec_name === "aac";
  if (hasAudio && !intervals.length && !copyAudio)
    graph.push(`[0:${input.audio.index}]aresample=48000:first_pts=0,apad,atrim=end=${sec(input.duration)}[outa]`);
  return {graph:graph.join(";\n"), audioMap:!hasAudio ? null : copyAudio ? "0:" + input.audio.index : "[outa]", copyAudio};
}

function execute(program, args, signal, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {windowsHide:true, signal, stdio:["ignore","pipe","pipe"]});
    let message = "", spawnError;
    child.stdout.setEncoding("utf8").on("data", text => onProgress?.(text));
    child.stderr.setEncoding("utf8").on("data", text => { message = (message + text).slice(-1500); });
    child.on("error", error => { spawnError = error; });
    child.once("close", code => {
      if (spawnError || code !== 0) reject(Error(signal.aborted ? "Export interrompu ou délai dépassé." :
        "FFmpeg a interrompu le traitement. " + (message.trim() || spawnError?.message || code)));
      else resolve();
    });
  });
}

async function renderWorkshopMp4({ffmpeg, ffprobe, input, output, project, signal, maxBytes, progress, validating}) {
  const source = probeMedia(ffprobe, input);
  const recipe = buildRecipe(project, source);
  const script = path.join(path.dirname(output), "montage.ffgraph");
  await fs.writeFile(script, recipe.graph, {flag:"wx"});
  const maps = ["-map","[outv]"];
  if (recipe.audioMap) maps.push("-map",recipe.audioMap);
  await execute(ffmpeg, ["-nostdin","-v","error","-xerror","-n","-copyts","-start_at_zero","-i",input,
    "-filter_complex_script",script,...maps,"-map_metadata","-1","-map_chapters","-1","-sn","-dn",
    "-c:v","libx264","-preset","veryfast","-crf","18","-fps_mode:v","passthrough","-enc_time_base:v","1:90000",
    ...(recipe.copyAudio ? ["-c:a","copy"] : ["-c:a","aac","-b:a","192k"]),
    "-movflags","+faststart","-fs",String(maxBytes),"-progress","pipe:1","-nostats",output], signal, progress);
  validating?.();
  const result = probeMedia(ffprobe, output);
  const expectedCount = recipe.audioMap ? 2 : 1;
  const startOffset = media => (Number(media.video.start_time) || 0) - media.start;
  if (result.streams.length !== expectedCount || result.video.codec_name !== "h264" ||
      (recipe.audioMap && result.audio?.codec_name !== "aac") ||
      !Number.isFinite(result.duration) || Math.abs(result.duration - source.duration) > .08 ||
      Math.abs(startOffset(result) - startOffset(source)) > .04 ||
      Math.abs(Number(result.video.duration) - Number(source.video.duration)) > .08 ||
      (Number(source.video.nb_frames) > 0 && Number(source.video.nb_frames) !== Number(result.video.nb_frames)) ||
      (await fs.stat(output)).size >= maxBytes)
    throw Error("Le contrôle des pistes, de la durée ou de la taille du MP4 a échoué.");
  await execute(ffmpeg, ["-nostdin","-v","error","-xerror","-i",output,"-map","0:v:0","-map","0:a:0?","-f","null","-"], signal);
  return result;
}

module.exports = {renderWorkshopMp4, audioIntervals};

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {createHash} = require("node:crypto");
const {renderWorkshopMp4, audioIntervals} = require("../moteur/workshop-mp4");

const {ffmpeg, ffprobe} = require("../atelier").programs();
const image = {type:"image", x:.1, y:.2, w:.25, h:.4, start:.5, end:2.5};
const mute = {type:"audio", effect:"Couper le son", start:1, end:2.5};
const beep = {type:"audio", effect:"Remplacer par un bip", start:1.5, end:2};
const project = {duration:3, parts:[image, mute, beep]};
const run = args => execFileSync(ffmpeg, ["-nostdin","-v","error",...args], {windowsHide:true, maxBuffer:20*1024*1024});
const digest = async file => createHash("sha256").update(await fs.readFile(file)).digest("hex");

function contrast(file, t, x, y) {
  const bytes = run(["-ss",String(t),"-i",file,"-frames:v","1","-vf",`crop=16:16:${x}:${y},format=gray`,"-f","rawvideo","pipe:1"]);
  assert.equal(bytes.length, 256);
  return Math.max(...bytes) - Math.min(...bytes);
}
function spectrum(file) {
  const bytes = run(["-i",file,"-map","0:a:0","-ac","1","-ar","48000","-f","f32le","pipe:1"]);
  return (start, hz) => {
    let sin=0, cos=0;
    for (let n=0; n<2400; n++) {
      const sample=bytes.readFloatLE(4*(Math.round(start*48000)+n)), phase=2*Math.PI*hz*n/48000;
      sin+=sample*Math.sin(phase); cos+=sample*Math.cos(phase);
    }
    return 2*Math.hypot(sin, cos)/2400;
  };
}

test("le MP4 contient les masques actifs et la dernière instruction sonore, sans piste de repli", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),"proto05-export-"));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const input = path.join(dir,"source.mp4"), silent=path.join(dir,"muet.mp4");
  run(["-f","lavfi","-i","nullsrc=s=160x100:r=20:d=3,geq=lum='35+180*mod(floor(X/3)+floor(Y/3),2)':cb=128:cr=128",
    "-f","lavfi","-i","sine=frequency=440:sample_rate=48000:duration=3","-f","lavfi","-i","sine=frequency=980:sample_rate=48000:duration=3",
    "-map","0:v","-map","1:a","-map","2:a","-c:v","libx264","-c:a","aac","-disposition:a:0","default","-disposition:a:1","0",input]);
  run(["-i",input,"-map","0:v:0","-c","copy",silent]);
  async function render(name, parts, source=input) {
    const out=path.join(dir,name);await fs.mkdir(out);
    const output=path.join(out,"sortie.mp4");
    const info=await renderWorkshopMp4({ffmpeg,ffprobe,input:source,output,project:{...project,parts},signal:new AbortController().signal,maxBytes:20e6});
    return {output,info};
  }
  const original=await digest(input), secondMask={...image,x:.55,start:1,end:2};
  const both=await render("visages-voix",[image,secondMask,mute,beep]);
  assert.deepEqual(both.info.streams.map(s=>s.codec_type),["video","audio"]);
  for(const [time,left,right] of [[.45,true,true],[.5,false,true],[1,false,false],[2,false,true],[2.5,true,true]]) {
    assert.equal(contrast(both.output,time,24,28)>100,left);
    assert.equal(contrast(both.output,time,94,28)>100,right);
  }
  const sound=spectrum(both.output);
  for(const time of [.5,.94,2.51,2.9]) assert.ok(sound(time,440)>.08);
  for(const time of [1.01,1.44,1.51,2.01,2.44]) assert.ok(sound(time,440)<.002);
  assert.ok(sound(1.6,650)>.035 && sound(1.6,650)<.058);
  assert.ok(sound(1.4,650)<.002 && sound(2.1,650)<.002 && sound(.5,980)<.002);
  const first=await digest(both.output);
  const faces=await render("visages",[image]), continuous=spectrum(faces.output);
  for(const time of [.1,1.1,1.6,2.2,2.8]) assert.ok(continuous(time,440)>.08);
  const onlyAudio=await render("voix",[beep,mute]);
  assert.ok(contrast(onlyAudio.output,1.6,24,28)>100 && spectrum(onlyAudio.output)(1.6,650)<.002);
  assert.deepEqual(audioIntervals([beep,mute]),[{start:1,end:2.5,effect:mute.effect}]);
  assert.equal((await render("muet",[image,mute],silent)).info.streams.length,1);
  const generated=await render("bip",[beep],silent);
  assert.ok(spectrum(generated.output)(1.6,650)>.025);
  const delayed = path.join(dir,"piste-decalee.mp4");
  run(["-i",silent,"-itsoffset","0.25","-i",input,"-map","0:v:0","-map","1:a:0","-t","3","-c","copy",delayed]);
  const offsetSound = spectrum((await render("synchro",[mute],delayed)).output);
  assert.ok(offsetSound(.08,440)<.002 && offsetSound(.32,440)>.08);
  assert.ok(offsetSound(1.05,440)<.002 && offsetSound(2.55,440)>.08);
  assert.equal(await digest(input),original);assert.equal(await digest(both.output),first);
});

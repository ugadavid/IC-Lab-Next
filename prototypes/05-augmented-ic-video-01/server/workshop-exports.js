"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {renderWorkshopMp4} = require("./workshop-mp4");

const type = "workshop-mp4";
function completedExport(treatment) {
  return treatment.type === type && Boolean(treatment.parameters?.workshopVersionId) &&
    treatment.status === "completed" && Boolean(treatment.outputPlayableId);
}

function createWorkshopExports({write, readLibrary, resolveInput, tools, publish, mediaUrl, progress, root, maxBytes, timeoutMs, engineVersion}) {
  const active = new Map();

  function last(library, version) {
    return library.treatments.filter(t => t.type === type && t.sourceAssetId === version.project.assetId &&
      t.sourcePlayableId === version.project.playableId && t.parameters?.workshopVersionId === version.id)
      .sort((a,b) => Number(b.parameters.attempt) - Number(a.parameters.attempt))[0];
  }

  function status(library, version) {
    const live = active.get(version.id);
    if (live) return {id:live.id, versionId:version.id, name:version.name, status:live.phase, progress:Number.isFinite(live.mediaTimeMs) ? live.progress : null};
    const t = last(library, version);
    const common = {id:t?.id || null, versionId:version.id, name:version.name};
    if (!t) return {...common, status:"idle"};
    if (completedExport(t)) {
      const url = mediaUrl(library, t);
      return url ? {...common, status:"completed", mediaUrl:url} :
        {...common, status:"unavailable", error:"Le fichier de cet export a été retiré de la vidéothèque."};
    }
    return {...common, status:"failed", error:t.error?.message || "Le traitement précédent a été interrompu. Vous pouvez le relancer."};
  }

  async function run(job, version, locator) {
    const timer = setTimeout(() => job.controller.abort(), timeoutMs);
    const signal = job.controller.signal;
    let workspace;
    try {
      const input = await resolveInput(version.project, locator);
      const programs = tools();
      await fs.mkdir(root,{recursive:true});
      workspace = await fs.mkdtemp(path.join(root,"atelier-"));
      const output = path.join(workspace,"export.mp4");
      job.phase = "rendering";
      const info = await renderWorkshopMp4({...programs,input,output,project:version.project,signal,maxBytes,
        progress:chunk => progress(job,chunk), validating:()=>{job.phase="validating";}});
      signal.throwIfAborted();
      job.phase = "publishing";
      await publish(job, version, output, info, programs.ffmpeg);
    } catch (error) {
      // Si l'accusé de commit s'est perdu, la ligne terminée prime sur l’erreur réseau.
      const t = last(await readLibrary(), version);
      if (!t || !completedExport(t))
        await write().updateMediaTreatment({id:job.id, status:"failed", progress:job.progress, error:{message:error.message}});
    } finally {
      clearTimeout(timer);
      if (workspace) await fs.rm(workspace,{recursive:true,force:true});
    }
  }

  async function start(library, version, {retryOf = null, ...locator}) {
    const current = status(library, version);
    if (active.has(version.id) || ["completed","unavailable"].includes(current.status) || retryOf !== current.id) return current;
    const previous = last(library,version);
    const attempt = (Number(previous?.parameters.attempt) || 0) + 1;
    let finish;
    const job = {id:`atelier-${version.id}-${attempt}`, phase:"starting", progress:0,
      durationMs:Math.round(version.project.duration*1000), controller:new AbortController(),
      done:new Promise(resolve => { finish = resolve; })};
    active.set(version.id,job);
    try {
      if (previous && ["running","queued","cancelling"].includes(previous.status))
        await write().updateMediaTreatment({id:previous.id,status:"interrupted",progress:previous.progress,error:{message:"Proto05 a redémarré."}});
      await write().startInlineMediaTreatment({id:job.id, sourceAssetId:version.project.assetId, sourcePlayableId:version.project.playableId,
        type,label:"Atelier · " + version.name,runtimeJobId:job.id,engine:"ffmpeg",engineVersion,
        parameters:{workshopVersionId:version.id, versionName:version.name, attempt}});
    } catch (error) {
      active.delete(version.id);
      finish();
      if (error.cause?.errno === 30511) return status(await readLibrary(), version);
      throw error;
    }
    void run(job,version,locator).catch(error => console.error("[export atelier]",error.message))
      .finally(()=>{ active.delete(version.id); finish(); });
    return status(library, version);
  }

  async function stop() {
    const jobs=[...active.values()];
    for(const job of jobs) job.controller.abort();
    await Promise.allSettled(jobs.map(job=>job.done));
  }
  return {start,status,stop};
}

module.exports = {createWorkshopExports,completedExport};

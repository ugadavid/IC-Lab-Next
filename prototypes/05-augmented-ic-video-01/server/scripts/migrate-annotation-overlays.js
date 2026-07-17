"use strict";

const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "..", "..", "data", "activities.json");
const store = JSON.parse(fs.readFileSync(file, "utf8"));
if (!store || !Array.isArray(store.activities)) throw new Error("activities.json invalide.");

let migrated = 0;
for (const activity of store.activities) {
  const segments = new Map((activity.segments || []).map(segment => [segment.id, segment]));
  const overlays = Array.isArray(activity.overlays) ? [...activity.overlays] : [];
  const overlayIds = new Set(overlays.map(overlay => overlay.id));
  for (const annotation of activity.teacherAnnotations || []) {
    if (!Object.prototype.hasOwnProperty.call(annotation, "overlay")) continue;
    if (!annotation.overlay) {
      delete annotation.overlay;
      continue;
    }
    const segment = segments.get(annotation.segmentId);
    if (!segment) throw new Error(`Segment inconnu pour ${annotation.id}.`);
    let id = `overlay-${annotation.id}`;
    let suffix = 1;
    while (overlayIds.has(id)) id = `overlay-${annotation.id}-${suffix++}`;
    overlays.push({
      id,
      annotationId: annotation.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      title: annotation.overlay.title,
      text: annotation.overlay.text,
      layerIds: [...(annotation.overlay.layerIds || [])]
    });
    overlayIds.add(id);
    delete annotation.overlay;
    migrated++;
  }
  activity.overlays = overlays;
}

fs.copyFileSync(file, `${file}.pre-overlay-migration`);
fs.writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ file, migrated, activities: store.activities.length }));

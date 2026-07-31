"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  annotationsAtTime,
  presentationAtTime,
  projectAnnotations
} = require("../../shared/playable-annotations");
const { projectSegments } = require("../../shared/playable-transcription");

const prototypeDirectory = path.resolve(__dirname, "..", "..");

function activityWithAnnotations() {
  return {
    segments: [{
      id: "segment-m147",
      startMs: 0,
      endMs: 5000,
      text: "Segment témoin"
    }],
    teacherAnnotations: [{
      id: "annotation-z",
      segmentId: "segment-m147",
      note: "ANNOTATION-M147-DEBUT",
      pedagogicalQuestion: "Question Z"
    }, {
      id: "annotation-a",
      segmentId: "segment-m147",
      note: "ANNOTATION-M147-SECONDE",
      pedagogicalQuestion: "Question A"
    }]
  };
}

test("les annotations auteur suivent l’intervalle du segment avec une fin exclusive", () => {
  const annotations = projectAnnotations(activityWithAnnotations());
  assert.deepEqual(annotations.map(annotation => annotation.id), ["annotation-a", "annotation-z"]);
  assert.deepEqual(annotationsAtTime(annotations, 0).map(annotation => annotation.id), ["annotation-a", "annotation-z"]);
  assert.deepEqual(annotationsAtTime(annotations, 2).map(annotation => annotation.id), ["annotation-a", "annotation-z"]);
  assert.deepEqual(annotationsAtTime(annotations, 5), []);
  assert.deepEqual(annotationsAtTime(annotations, 6), []);
});

test("plusieurs annotations actives sont rendues dans un ordre déterministe", () => {
  const presentation = presentationAtTime(projectAnnotations(activityWithAnnotations()), 2);
  assert.equal(presentation.note, "ANNOTATION-M147-SECONDE\n\nANNOTATION-M147-DEBUT");
  assert.deepEqual(presentation.questions, ["Question A", "Question Z"]);
  const [segment] = projectSegments(activityWithAnnotations());
  assert.deepEqual(segment.annotations.map(annotation => annotation.id), ["annotation-a", "annotation-z"]);
  assert.equal(segment.note, presentation.note);
});

test("modification et suppression remplacent le texte sans conserver de valeur historique", () => {
  const activity = activityWithAnnotations();
  activity.teacherAnnotations = [activity.teacherAnnotations[0]];
  let presentation = presentationAtTime(projectAnnotations(activity), 2);
  assert.equal(presentation.note, "ANNOTATION-M147-DEBUT");

  activity.teacherAnnotations[0].note = "ANNOTATION-M147-MODIFIEE";
  presentation = presentationAtTime(projectAnnotations(activity), 2);
  assert.equal(presentation.note, "ANNOTATION-M147-MODIFIEE");
  assert.doesNotMatch(presentation.note, /ANNOTATION-M147-DEBUT/);

  activity.teacherAnnotations = [];
  presentation = presentationAtTime(projectAnnotations(activity), 2);
  assert.equal(presentation.note, "");
  assert.deepEqual(presentation.active, []);
});

test("une nouvelle activité vide n’injecte aucun contenu canonique historique", () => {
  const presentation = presentationAtTime(projectAnnotations({
    segments: [{ id: "segment-vide", startMs: 0, endMs: 5000, text: "Texte simple" }],
    teacherAnnotations: []
  }), 2);
  assert.equal(presentation.note, "");
  const playerSource = fs.readFileSync(path.join(prototypeDirectory, "index-0.0.9.html"), "utf8");
  assert.doesNotMatch(playerSource, /Ce segment continue d’exister dans la vidéo/);
  assert.match(playerSource, /Proto05PlayableAnnotations\.presentationAtTime/);
});

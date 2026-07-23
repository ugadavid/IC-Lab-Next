# Mission 090 — Proto05 : observabilité FFmpeg

Date : 2026-07-23

## État diagnostiqué

Le job de la dernière recette complète est `hls-temporal-derivation-1784830512394-9e298e1f-gYzHTx`.
Son lancement est identifiable par le timestamp de l’identifiant : `2026-07-23T20:15:12.394+02:00`.
La dérivation a finalement abouti avant le redémarrage du serveur : la Library conserve le dérivé `media-proto05-anonymized-b58b98549ae94f4bacf10050`, de taille `32 220 934` octets, avec le SHA-256 `b58b98549ae94f4bacf100505abb346940bad56b8e0ded3674a4a006db699850`.

Après redémarrage, les jobs sont en mémoire et ce job n’est plus interrogeable par son endpoint. Il n’y a actuellement aucun job actif ni processus FFmpeg ; aucun traitement n’a été interrompu par cette mission. Le fichier temporaire de travail a également été nettoyé. Le serveur Proto05 redémarré répond en version `0.1.29` sur le port `8791`.

Les éléments runtime demandés — PID, dernier `time=`, stdout/stderr complets, code de sortie et taille évolutive — n’étaient pas persistés par la version qui a exécuté ce job et sont donc indisponibles rétroactivement. Le statut `completed` et le dérivé persistant établissent que la sortie a été validée ; le code de sortie exact n’a pas été conservé.

## Commande FFmpeg réellement enregistrée

Le serveur lançait `ffmpeg`, résolu sur cette machine par `C:\Tools\FFmpeg\bin\ffmpeg.exe`.

Répertoire de travail :

```text
J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next\prototypes\05-augmented-ic-video-01\server
```

Entrée absolue :

```text
C:\Users\david\AppData\Local\Temp\proto05-hls-preparations\hls-prep-1784830461370-5aff62fb-sEWPmq\work.mp4
```

Sortie originale absolue :

```text
C:\Users\david\AppData\Local\Temp\proto05-hls-derivations\hls-temporal-derivation-1784830512394-9e298e1f-gYzHTx\derived.mp4
```

Tableau d’arguments exact, dans l’ordre :

```json
[
  "-hide_banner",
  "-y",
  "-i",
  "C:\\Users\\david\\AppData\\Local\\Temp\\proto05-hls-preparations\\hls-prep-1784830461370-5aff62fb-sEWPmq\\work.mp4",
  "-filter_complex",
  "[0:v]split=2[temporalBase0][temporalBlur0];[temporalBlur0]boxblur=luma_radius=2:luma_power=1[temporalBlur0b];[temporalBase0][temporalBlur0b]blend=all_expr='if(gte(X,W*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))))*lt(X,W*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))+if(lt(T,0),0.2,if(lt(T,28.177),0.2+(0)*(T-0),0.2))))*gte(Y,H*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))))*lt(Y,H*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))+if(lt(T,0),0.2,if(lt(T,28.177),0.2+(0)*(T-0),0.2))))*gte(T,0)*lte(T,939.238),B,A)'[temporalComposite0];[temporalComposite0]split=2[temporalBase1][temporalBlur1];[temporalBlur1]boxblur=luma_radius=2:luma_power=1[temporalBlur1b];[temporalBase1][temporalBlur1b]blend=all_expr='if(gte(X,W*(if(lt(T,28.177),0.55,0.55)))*lt(X,W*(if(lt(T,28.177),0.55,0.55)+if(lt(T,28.177),0.2,0.2)))*gte(Y,H*(if(lt(T,28.177),0.1,0.1)))*lt(Y,H*(if(lt(T,28.177),0.1,0.1)+if(lt(T,28.177),0.2,0.2)))*gte(T,28.177)*lte(T,939.238),B,A)'[outv]",
  "-map", "[outv]",
  "-map", "0:a?",
  "-c:v", "libx264",
  "-preset", "veryfast",
  "-crf", "23",
  "-c:a", "aac",
  "-movflags", "+faststart",
  "C:\\Users\\david\\AppData\\Local\\Temp\\proto05-hls-derivations\\hls-temporal-derivation-1784830512394-9e298e1f-gYzHTx\\derived.mp4"
]
```

La commande utilise `libx264`, preset `veryfast`, CRF `23`, audio `aac`, `+faststart`, sans cadence ni résolution imposées explicitement. Elle active `-y`, masque la bannière et conserve la progression extraite de stderr par le serveur. Aucun fichier de filtre externe ni variable d’environnement spécifique non nulle n’était utilisé ; le serveur pouvait consulter `FFMPEG_PATH` et `PROTO05_HLS_DERIVATION_TIMEOUT_MS`.

## Reproduction PowerShell sûre — à ne pas lancer automatiquement

Le fichier temporaire d’entrée a été nettoyé. David devra donc fournir une nouvelle entrée préparée avant d’exécuter ce script. La sortie porte un suffixe distinct et ne remplace pas le dérivé enregistré.

```powershell
$ffmpegExe = 'C:\Tools\FFmpeg\bin\ffmpeg.exe'
$workDir = 'J:\2026\UGA\M2\Stage-Memoire\Applications\IC-Lab-Next\prototypes\05-augmented-ic-video-01\server'
$inputPath = 'C:\Users\david\AppData\Local\Temp\proto05-hls-preparations\hls-prep-1784830461370-5aff62fb-sEWPmq\work.mp4'
$outputPath = 'C:\Users\david\AppData\Local\Temp\proto05-hls-derivations\hls-temporal-derivation-1784830512394-9e298e1f-gYzHTx\derived_manual-debug.mp4'
$logPath = 'C:\Users\david\AppData\Local\Temp\proto05-hls-derivations\hls-temporal-derivation-1784830512394-9e298e1f-gYzHTx\ffmpeg-manual-debug.log'
$filterComplex = @'
[0:v]split=2[temporalBase0][temporalBlur0];[temporalBlur0]boxblur=luma_radius=2:luma_power=1[temporalBlur0b];[temporalBase0][temporalBlur0b]blend=all_expr='if(gte(X,W*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))))*lt(X,W*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))+if(lt(T,0),0.2,if(lt(T,28.177),0.2+(0)*(T-0),0.2))))*gte(Y,H*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))))*lt(Y,H*(if(lt(T,0),0,if(lt(T,28.177),0+(0)*(T-0),0))+if(lt(T,0),0.2,if(lt(T,28.177),0.2+(0)*(T-0),0.2))))*gte(T,0)*lte(T,939.238),B,A)'[temporalComposite0];[temporalComposite0]split=2[temporalBase1][temporalBlur1];[temporalBlur1]boxblur=luma_radius=2:luma_power=1[temporalBlur1b];[temporalBase1][temporalBlur1b]blend=all_expr='if(gte(X,W*(if(lt(T,28.177),0.55,0.55)))*lt(X,W*(if(lt(T,28.177),0.55,0.55)+if(lt(T,28.177),0.2,0.2)))*gte(Y,H*(if(lt(T,28.177),0.1,0.1)))*lt(Y,H*(if(lt(T,28.177),0.1,0.1)+if(lt(T,28.177),0.2,0.2)))*gte(T,28.177)*lte(T,939.238),B,A)'[outv]
'@
$ffmpegArgs = @(
  '-hide_banner', '-y', '-i', $inputPath,
  '-filter_complex', $filterComplex,
  '-map', '[outv]', '-map', '0:a?',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
  '-c:a', 'aac', '-movflags', '+faststart', $outputPath
)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logPath) | Out-Null
Set-Location -LiteralPath $workDir
& $ffmpegExe @ffmpegArgs 2>&1 | Tee-Object -FilePath $logPath
$exitCode = $LASTEXITCODE
"FFMPEG_EXIT_CODE=$exitCode"
```

## Instrumentation ajoutée

`server/server.js` conserve désormais, pendant la durée de vie du job : exécutable, `cwd`, arguments structurés, commande PowerShell reproductible, entrée, sortie, journal persistant, début/fin, PID, code de sortie, dernier temps média, taille observée, stdout, stderr, erreur et variables pertinentes. Le journal est écrit sous le répertoire temporaire des dérivations sous le nom `<jobId>.ffmpeg.log` et n’est pas supprimé avec le workspace de sortie.

La réponse publique du job expose ces informations sous `ffmpeg`. Aucun comportement de dérivation, modèle temporel ou masque n’a été modifié.

## Vérifications

- `npm.cmd run check` dans `prototypes/05-augmented-ic-video-01/server` : OK, version serveur `0.1.30`.
- `node --test test/hls-preparation.test.js` : 6 tests réussis, dont l’exposition de la commande et des sorties FFmpeg.
- serveur réellement redémarré après instrumentation : `/api/health` répond `200`, version servie `0.1.29`.
- aucune nouvelle dérivation lancée ; aucune activité canonique modifiée.

## Fichiers modifiés pour cette mission

- `prototypes/05-augmented-ic-video-01/server/server.js`
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js`

Les autres changements signalés par Git sont antérieurs ou issus des missions Proto05 précédentes et ont été préservés.

Version applicative : inchangée (`0.1.29` réellement servie ; package serveur `0.1.30`).

État Git : modifications locales conservées, aucun commit et aucun push.

Limite restante : les détails du job historique ne peuvent pas être reconstitués rétroactivement après le redémarrage. Une prochaine dérivation — après validation de David — exposera ces détails en direct via l’endpoint et le fichier journal, mais elle n’a pas été lancée dans cette mission.

Message de commit proposé, non créé : `proto05: expose exact ffmpeg derivation runtime`.

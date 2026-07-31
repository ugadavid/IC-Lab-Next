-- The ordinary author bundle remains compatible with sp_activity_get. The
-- reserved internal selector exposes the complete application snapshot as
-- ordered result sets so Node never has to bypass the routine boundary for a
-- business read.
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_author_activity_bundle$$
CREATE PROCEDURE sp_author_activity_bundle(
  IN p_activity_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  IF p_activity_id = '__PROTO05_CANONICAL_SNAPSHOT__' THEN
    SELECT * FROM data_projection_metadata ORDER BY document_key;
    SELECT * FROM languages ORDER BY id;
    SELECT * FROM activity_folders ORDER BY sort_order, id;
    SELECT * FROM media_folders ORDER BY sort_order, id;
    SELECT * FROM media_tags ORDER BY id;
    SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY id;
    SELECT * FROM activity_pedagogical_identities ORDER BY activity_id;
    SELECT * FROM activity_pedagogical_text_fields ORDER BY activity_id, field_key;
    SELECT * FROM activity_pedagogical_qualifications ORDER BY activity_id, id;
    SELECT * FROM activity_languages ORDER BY activity_id, sort_order, language_id;
    SELECT * FROM activity_transcriptions ORDER BY activity_id;
    SELECT * FROM activity_speakers ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_segments ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_segment_speakers ORDER BY activity_id, segment_id, speaker_id;
    SELECT * FROM activity_segment_languages ORDER BY activity_id, segment_id, language_id;
    SELECT * FROM activity_language_intervals ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_layers ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_layer_visibility ORDER BY activity_id, layer_id, audience;
    SELECT * FROM activity_phenomena ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_annotations ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_overlays ORDER BY activity_id, sort_order, id;
    SELECT * FROM activity_overlay_layers ORDER BY activity_id, overlay_id, layer_id;
    SELECT link.*
    FROM activity_media_links link
    INNER JOIN activities activity ON activity.id = link.activity_id
    WHERE activity.deleted_at IS NULL
    ORDER BY link.activity_id, link.role, link.sort_order, link.id;
    SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY id;
    SELECT source.*
    FROM media_sources source
    INNER JOIN media_assets asset ON asset.id = source.asset_id
    WHERE asset.deleted_at IS NULL
    ORDER BY source.id;
    SELECT playable.*
    FROM media_playables playable
    INNER JOIN media_assets asset ON asset.id = playable.asset_id
    WHERE playable.removed_at IS NULL AND asset.deleted_at IS NULL
    ORDER BY playable.id;
    SELECT metadata.*
    FROM media_playable_metadata metadata
    INNER JOIN media_playables playable ON playable.id = metadata.playable_id
    INNER JOIN media_assets asset ON asset.id = playable.asset_id
    WHERE playable.removed_at IS NULL AND asset.deleted_at IS NULL
    ORDER BY metadata.playable_id;
    SELECT link.*
    FROM media_asset_tags link
    INNER JOIN media_assets asset ON asset.id = link.asset_id
    WHERE asset.deleted_at IS NULL
    ORDER BY link.asset_id, link.tag_id;
    SELECT treatment.*
    FROM media_treatments treatment
    INNER JOIN media_assets source_asset ON source_asset.id = treatment.source_asset_id
    LEFT JOIN media_assets output_asset ON output_asset.id = treatment.output_asset_id
    WHERE source_asset.deleted_at IS NULL
      AND (treatment.output_asset_id IS NULL OR output_asset.deleted_at IS NULL)
    ORDER BY treatment.id;
  ELSE
    CALL sp_activity_get(p_activity_id);
  END IF;
END$$

DELIMITER ;

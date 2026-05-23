# Audio Playback Examples

This file demonstrates inline audio playback in the viewer. Any image-style Markdown link pointing at an audio file is rendered as an HTML5 `<audio>` player.

## Syntax

Use the standard image syntax. The alt text becomes the player caption:

```markdown
![Optional caption](path/to/clip.mp3)
```

## Supported formats

`.mp3`, `.wav`, `.ogg`, `.oga`, `.m4a`, `.aac`, `.flac`, `.opus`

## Captions

The alt text is shown above the player. Leave it empty for a bare player:

```markdown
![](recording.mp3)
![Demo voiceover](recording.mp3)
```

## Notes

- Metadata is loaded lazily as the player scrolls into view, so large folders of audio files stay snappy.
- Paths are resolved relative to the current Markdown file, just like images.
- Standard browser controls (play, scrub, volume, download) are exposed via `<audio controls>`.

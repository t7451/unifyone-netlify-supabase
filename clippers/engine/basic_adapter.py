from __future__ import annotations

import json
import os
import shutil
import subprocess
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Sequence

from .adapter import IClipperEngine
from .config import ClipperEngineConfig, DEFAULT_ENGINE_CONFIG


KEYWORD_BOOSTS = {
    "how": 0.08,
    "why": 0.08,
    "secret": 0.15,
    "mistake": 0.13,
    "best": 0.11,
    "worst": 0.11,
    "fast": 0.08,
    "viral": 0.16,
    "growth": 0.1,
    "money": 0.12,
    "revenue": 0.12,
    "problem": 0.09,
    "solution": 0.09,
}


@dataclass
class WordTiming:
    """Word-level timing produced by the transcription step."""

    word: str
    start: float
    end: float


@dataclass
class TranscriptSegment:
    """Time-bounded transcript segment."""

    start: float
    end: float
    text: str
    words: List[WordTiming]


@dataclass
class ScoredClip:
    """Candidate clip selected by the highlight scorer."""

    start: float
    end: float
    score: float
    title_suggestion: str
    caption: str
    words: List[WordTiming]


class TranscriptionService:
    """Transcribe the source video with faster-whisper when available."""

    def __init__(self, config: ClipperEngineConfig) -> None:
        self.config = config

    def transcribe(self, video_path: Path, target_duration: int) -> List[TranscriptSegment]:
        """Return transcript segments with word-level timestamps."""

        try:
            from faster_whisper import WhisperModel
        except ImportError:
            return self._fallback_segments(video_path, target_duration)

        for model_size in (
            self.config.whisper_model_size,
            self.config.fallback_whisper_model_size,
        ):
            try:
                model = WhisperModel(
                    model_size,
                    device="auto",
                    compute_type=self.config.whisper_compute_type,
                )
                segments, _ = model.transcribe(
                    str(video_path),
                    beam_size=5,
                    word_timestamps=True,
                    vad_filter=True,
                )
                parsed_segments = [self._parse_segment(segment) for segment in segments]
                return [segment for segment in parsed_segments if segment.text.strip()]
            except Exception:
                continue

        return self._fallback_segments(video_path, target_duration)

    def _parse_segment(self, segment: Any) -> TranscriptSegment:
        words = [
            WordTiming(
                word=(word.word or "").strip(),
                start=float(word.start or segment.start),
                end=float(word.end or segment.end),
            )
            for word in (segment.words or [])
            if (word.word or "").strip()
        ]
        return TranscriptSegment(
            start=float(segment.start),
            end=float(segment.end),
            text=(segment.text or "").strip(),
            words=words,
        )

    def _fallback_segments(
        self,
        video_path: Path,
        target_duration: int,
    ) -> List[TranscriptSegment]:
        duration = probe_video_duration(video_path) or float(target_duration * 3)
        step = max(self.config.min_clip_length, min(target_duration, self.config.max_clip_length))
        seed_texts = [
            "Hook the audience with a strong opening statement.",
            "Explain the core lesson with a clear, memorable example.",
            "Close with a concise takeaway and call to action.",
        ]
        segments: List[TranscriptSegment] = []
        start = 0.0
        index = 0
        while start < duration:
            end = min(duration, start + step)
            text = seed_texts[index % len(seed_texts)]
            words = build_even_word_timings(text, start, end)
            segments.append(
                TranscriptSegment(start=start, end=end, text=text, words=words)
            )
            start = end
            index += 1
        return segments


class AudioEnergyAnalyzer:
    """Score timeline windows with RMS energy peaks."""

    def analyze(self, video_path: Path) -> List[tuple[float, float]]:
        """Return timestamp/strength tuples for detected energy peaks."""

        try:
            import librosa
            import numpy as np
        except ImportError:
            return []

        try:
            signal, sample_rate = librosa.load(str(video_path), sr=None, mono=True)
            if len(signal) == 0:
                return []
            rms = librosa.feature.rms(y=signal)[0]
            if len(rms) == 0:
                return []
            peak_threshold = float(rms.mean() + rms.std())
            timestamps = librosa.times_like(rms, sr=sample_rate)
            peaks: List[tuple[float, float]] = []
            for timestamp, strength in zip(timestamps, rms, strict=False):
                if float(strength) >= peak_threshold:
                    normalized = min(1.0, float(strength) / max(float(rms.max()), 1e-6))
                    peaks.append((float(timestamp), normalized))
            return peaks
        except Exception:
            return []


class SceneDetectorService:
    """Detect scene boundaries with PySceneDetect when available."""

    def detect(self, video_path: Path) -> List[tuple[float, float]]:
        """Return scene start/end ranges in seconds."""

        try:
            from scenedetect import SceneManager, open_video
            from scenedetect.detectors import ContentDetector
        except ImportError:
            return []

        try:
            scene_manager = SceneManager()
            scene_manager.add_detector(ContentDetector())
            video = open_video(str(video_path))
            scene_manager.detect_scenes(video, show_progress=False)
            scenes = scene_manager.get_scene_list()
            return [
                (
                    start.get_seconds(),
                    end.get_seconds(),
                )
                for start, end in scenes
            ]
        except Exception:
            return []


class LLMViralityScorer:
    """Optional local Ollama scoring for transcripts."""

    def __init__(self, config: ClipperEngineConfig) -> None:
        self.config = config

    def score(self, transcript: str) -> float:
        """Return a lightweight virality score in the 0..1 range."""

        endpoint = os.getenv("OLLAMA_URL")
        model = os.getenv("OLLAMA_MODEL", "llama3.1")
        if not endpoint or not transcript.strip():
            return 0.0

        payload = json.dumps(
            {
                "model": model,
                "stream": False,
                "prompt": (
                    "Rate this short-form video moment for virality from 0 to 1. "
                    "Return only a decimal number.\n\n"
                    f"Transcript:\n{transcript}"
                ),
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            endpoint.rstrip("/") + "/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=self.config.ollama_timeout_seconds,
            ) as response:
                body = json.loads(response.read().decode("utf-8"))
                raw_score = str(body.get("response", "0")).strip()
                return clamp(float(raw_score))
        except (
            ValueError,
            urllib.error.URLError,
            socket.timeout,
            TimeoutError,
            json.JSONDecodeError,
        ):
            return 0.0


class HighlightScorer:
    """Combine transcript, energy, scene, and optional LLM signals."""

    def __init__(self, config: ClipperEngineConfig) -> None:
        self.config = config
        self.llm_scorer = LLMViralityScorer(config)

    def rank(
        self,
        transcript_segments: Sequence[TranscriptSegment],
        energy_peaks: Sequence[tuple[float, float]],
        scene_ranges: Sequence[tuple[float, float]],
        num_clips: int,
        target_duration: int,
    ) -> List[ScoredClip]:
        """Return the best ranked, non-overlapping candidate clips."""

        weights = self.config.highlight_scoring_weights
        candidates: List[ScoredClip] = []
        for segment in transcript_segments:
            clip_start, clip_end = self._resolve_window(segment, target_duration)
            transcript_score = score_transcript_text(segment.text)
            energy_score = score_energy_window(energy_peaks, clip_start, clip_end)
            scene_score = score_scene_window(scene_ranges, clip_start, clip_end)
            llm_score = self.llm_scorer.score(segment.text)
            total = (
                transcript_score * weights.transcript
                + energy_score * weights.energy
                + scene_score * weights.scene
                + llm_score * weights.llm
            )
            candidates.append(
                ScoredClip(
                    start=round(clip_start, 2),
                    end=round(clip_end, 2),
                    score=round(total, 4),
                    title_suggestion=build_title(segment.text),
                    caption=segment.text,
                    words=segment.words,
                )
            )

        ranked = sorted(candidates, key=lambda clip: clip.score, reverse=True)
        selected: List[ScoredClip] = []
        for candidate in ranked:
            if any(overlaps(candidate, existing) for existing in selected):
                continue
            selected.append(candidate)
            if len(selected) >= max(1, num_clips):
                break

        return selected or [
            ScoredClip(
                start=0.0,
                end=float(target_duration),
                score=0.5,
                title_suggestion="Generated Highlight",
                caption="Generated fallback clip.",
                words=[],
            )
        ]

    def _resolve_window(
        self,
        segment: TranscriptSegment,
        target_duration: int,
    ) -> tuple[float, float]:
        desired = max(self.config.min_clip_length, min(target_duration, self.config.max_clip_length))
        segment_length = max(segment.end - segment.start, 1.0)
        if segment_length >= desired:
            return segment.start, min(segment.end, segment.start + desired)

        padding = max((desired - segment_length) / 2, 0)
        start = max(0.0, segment.start - padding)
        end = start + desired
        return start, end


class CaptionRenderer:
    """Create caption sidecars for ffmpeg subtitle burn-in."""

    def __init__(self, config: ClipperEngineConfig) -> None:
        self.config = config

    def create_srt(self, clip: ScoredClip, output_dir: Path) -> Path | None:
        """Write an SRT file for the clip words when timings are available."""

        if not clip.words:
            return None

        entries: List[str] = []
        group_size = max(1, self.config.caption_words_per_group)
        for index in range(0, len(clip.words), group_size):
            chunk = clip.words[index : index + group_size]
            start = max(0.0, chunk[0].start - clip.start)
            end = max(start + 0.2, chunk[-1].end - clip.start)
            text = " ".join(word.word for word in chunk).strip()
            if not text:
                continue
            entries.append(
                "\n".join(
                    [
                        str(len(entries) + 1),
                        f"{format_srt_time(start)} --> {format_srt_time(end)}",
                        text,
                        "",
                    ]
                )
            )

        if not entries:
            return None

        output_dir.mkdir(parents=True, exist_ok=True)
        srt_path = output_dir / "captions.srt"
        srt_path.write_text("\n".join(entries), encoding="utf-8")
        return srt_path


class ClipExtractor:
    """Extract vertical clips with ffmpeg-python when available."""

    def __init__(self, config: ClipperEngineConfig) -> None:
        self.config = config

    def extract(
        self,
        video_path: Path,
        clip: ScoredClip,
        output_path: Path,
        captions_path: Path | None,
    ) -> None:
        """Create the final clip output or a placeholder when extraction fails."""

        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            import ffmpeg
        except ImportError:
            self._write_placeholder(output_path, clip)
            return

        if not shutil.which("ffmpeg"):
            self._write_placeholder(output_path, clip)
            return

        try:
            stream = ffmpeg.input(str(video_path), ss=clip.start, to=clip.end)
            video = (
                stream.video.filter(
                    "crop",
                    "if(gte(iw/ih,9/16),ih*9/16,iw)",
                    "if(gte(iw/ih,9/16),ih,iw*16/9)",
                )
                .filter("scale", self.config.target_width, self.config.target_height)
            )
            if captions_path:
                video = video.filter("subtitles", escape_filter_path(captions_path))
            output = ffmpeg.output(
                video,
                stream.audio,
                str(output_path),
                vcodec="libx264",
                acodec="aac",
                preset="veryfast",
                movflags="+faststart",
            )
            ffmpeg.run(output, overwrite_output=True, quiet=True)
        except Exception:
            self._write_placeholder(output_path, clip)

    def _write_placeholder(self, output_path: Path, clip: ScoredClip) -> None:
        output_path.touch()
        placeholder_path = output_path.with_suffix(output_path.suffix + ".json")
        placeholder_path.write_text(
            json.dumps(
                {
                    "start": clip.start,
                    "end": clip.end,
                    "score": clip.score,
                    "caption": clip.caption,
                },
                indent=2,
            ),
            encoding="utf-8",
        )


class BasicClipperEngine(IClipperEngine):
    """Baseline real adapter with modular transcription, scoring, and extraction."""

    def __init__(self, config: ClipperEngineConfig | None = None) -> None:
        self.config = config or DEFAULT_ENGINE_CONFIG
        self.transcriber = TranscriptionService(self.config)
        self.energy_analyzer = AudioEnergyAnalyzer()
        self.scene_detector = SceneDetectorService()
        self.highlight_scorer = HighlightScorer(self.config)
        self.caption_renderer = CaptionRenderer(self.config)
        self.extractor = ClipExtractor(self.config)

    def process_video(
        self,
        video_path: Path,
        num_clips: int = 12,
        target_duration: int = 45,
        style: str = "default",
    ) -> List[Dict[str, Any]]:
        """Process a source video into ranked clip outputs."""

        source = video_path.expanduser().resolve()
        if not source.exists():
            raise FileNotFoundError(f"Video not found: {source}")

        transcript_segments = self.transcriber.transcribe(source, target_duration)
        energy_peaks = self.energy_analyzer.analyze(source)
        scene_ranges = self.scene_detector.detect(source)
        scored_clips = self.highlight_scorer.rank(
            transcript_segments=transcript_segments,
            energy_peaks=energy_peaks,
            scene_ranges=scene_ranges,
            num_clips=num_clips,
            target_duration=target_duration,
        )

        run_dir = self.config.output_root / "basic" / source.stem / style
        run_dir.mkdir(parents=True, exist_ok=True)
        output: List[Dict[str, Any]] = []
        for index, clip in enumerate(scored_clips, start=1):
            clip_dir = run_dir / f"clip_{index:02d}"
            captions_path = self.caption_renderer.create_srt(clip, clip_dir)
            output_path = clip_dir / "output.mp4"
            self.extractor.extract(source, clip, output_path, captions_path)
            output.append(
                {
                    "start": clip.start,
                    "end": clip.end,
                    "score": clip.score,
                    "title_suggestion": clip.title_suggestion,
                    "caption": clip.caption,
                    "output_path": str(output_path),
                }
            )

        return output


def build_even_word_timings(text: str, start: float, end: float) -> List[WordTiming]:
    """Split fallback text into evenly spaced word timings."""

    words = [word for word in text.split() if word]
    if not words:
        return []
    duration = max(end - start, 0.5)
    step = duration / len(words)
    return [
        WordTiming(word=word, start=start + step * index, end=start + step * (index + 1))
        for index, word in enumerate(words)
    ]


def probe_video_duration(video_path: Path) -> float | None:
    """Read the video duration with ffprobe when available."""

    ffprobe_path = shutil.which("ffprobe")
    if not ffprobe_path:
        return None
    command = [
        ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return None


def score_transcript_text(text: str) -> float:
    """Score transcript text using simple hook heuristics."""

    lowered = text.lower()
    score = 0.25
    if "?" in text:
        score += 0.12
    if "!" in text:
        score += 0.08
    word_count = len(text.split())
    score += min(0.18, word_count / 100)
    for keyword, boost in KEYWORD_BOOSTS.items():
        if keyword in lowered:
            score += boost
    return clamp(score)


def score_energy_window(
    peaks: Sequence[tuple[float, float]],
    start: float,
    end: float,
) -> float:
    """Return the strongest energy peak inside the clip window."""

    values = [strength for timestamp, strength in peaks if start <= timestamp <= end]
    if not values:
        return 0.0
    return clamp(max(values))


def score_scene_window(
    scenes: Sequence[tuple[float, float]],
    start: float,
    end: float,
) -> float:
    """Reward segments aligned to scene boundaries."""

    if not scenes:
        return 0.0
    for scene_start, scene_end in scenes:
        if scene_start <= start <= scene_end or scene_start <= end <= scene_end:
            return 1.0
        if abs(scene_start - start) <= 2 or abs(scene_end - end) <= 2:
            return 0.75
    return 0.0


def build_title(text: str) -> str:
    """Convert transcript text into a short title suggestion."""

    words = [word.strip(" ,.!?") for word in text.split() if word.strip(" ,.!?")]
    if not words:
        return "Generated Highlight"
    return " ".join(words[:8]).title()


def overlaps(left: ScoredClip, right: ScoredClip) -> bool:
    """Check whether two candidate windows overlap substantially."""

    intersection = max(0.0, min(left.end, right.end) - max(left.start, right.start))
    shortest = max(min(left.end - left.start, right.end - right.start), 1.0)
    return (intersection / shortest) >= 0.4


def format_srt_time(seconds: float) -> str:
    """Format seconds for SRT timestamps."""

    milliseconds = int(round(max(seconds, 0.0) * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def escape_filter_path(path: Path) -> str:
    """Escape a filesystem path for ffmpeg filter usage."""

    return str(path).replace("\\", "\\\\").replace(":", "\\:")


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    """Clamp a value to a fixed range."""

    return max(minimum, min(maximum, value))

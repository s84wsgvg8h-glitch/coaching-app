import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { showAppToast } from "@/lib/appToast";
import {
  type ProgramExercise,
  type VideoRecorderTarget,
} from "@/lib/programWeek/types";

type UseProgramVideoRecorderOptions = {
  onUpload: (
    exercise: ProgramExercise,
    setNumber: number,
    file: File,
    caption: string | null,
  ) => Promise<void>;
  getExistingCaption: (exerciseId: string, setNumber: number) => string;
  uploadingVideoSetKey: string;
  scrollMobileFieldIntoView: (target: HTMLElement) => void;
};

export function useProgramVideoRecorder({
  onUpload,
  getExistingCaption,
  uploadingVideoSetKey,
  scrollMobileFieldIntoView,
}: UseProgramVideoRecorderOptions) {
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [videoRecorderTarget, setVideoRecorderTarget] =
    useState<VideoRecorderTarget | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "user" | "environment"
  >("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimmingVideo, setTrimmingVideo] = useState(false);
  const [videoCaption, setVideoCaption] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [activeTrimHandle, setActiveTrimHandle] = useState<"start" | "end" | null>(
    null,
  );
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const trimSliderRef = useRef<HTMLDivElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    if (!videoRecorderOpen) {
      stopCameraStream();
      return;
    }

    if (recordedVideoUrl) {
      stopCameraStream();
    }
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    if (!videoRecorderOpen || recordedVideoUrl) return;

    stopCameraStream();
    void startCameraStream();
  }, [cameraFacingMode]);

  useEffect(() => {
    void applyTorch(flashOn);
  }, [flashOn]);

  useEffect(() => {
    if (!videoRecorderOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = recordedVideoUrl ? "manipulation" : "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      stopCameraStream();
      stopRecordingTimer();
    };
  }, [recordedVideoUrl]);

  function getSupportedVideoMimeType() {
    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function getRecordedFileExtension(type: string) {
    return type.includes("mp4") ? "mp4" : "webm";
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function openVideoRecorder(exercise: ProgramExercise, setNumber: number) {
    if (!navigator.mediaDevices?.getUserMedia) {
      showAppToast("Je browser ondersteunt opnemen in de app niet.");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setVideoRecorderTarget({ exercise, setNumber });
    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(true);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption(getExistingCaption(exercise.id, setNumber));
    setCameraError("");
    setCameraReady(false);
    setVideoRecorderOpen(true);
    // iOS Safari requires getUserMedia inside the tap/click handler.
    void startCameraStream();
  }

  function closeVideoRecorder() {
    if (isRecordingVideo) {
      mediaRecorderRef.current?.stop();
    }

    stopCameraStream();
    setVideoRecorderOpen(false);
    setVideoRecorderTarget(null);
    setIsRecordingVideo(false);
    stopRecordingTimer();
    setRecordingSeconds(0);
    setCameraReady(false);
    setCameraError("");

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(true);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption("");
  }

  function isIgnorableCameraError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return /aborted|AbortError|interrupted by a new load request/i.test(message);
  }

  function getCameraErrorMessage(error: unknown) {
    if (isIgnorableCameraError(error)) return "";

    const message = error instanceof Error ? error.message : String(error);

    return (
      message ||
      "Camera kon niet worden geopend. Geef Safari/Chrome toestemming voor camera en microfoon."
    );
  }

  async function playCameraPreview() {
    if (!cameraVideoRef.current) return;

    try {
      await cameraVideoRef.current.play();
    } catch (error) {
      if (!isIgnorableCameraError(error)) {
        console.warn("CAMERA PREVIEW PLAY ERROR:", error);
      }
    }
  }

  async function startCameraStream() {
    setCameraError("");

    if (cameraStreamRef.current) {
      if (
        cameraVideoRef.current &&
        cameraVideoRef.current.srcObject !== cameraStreamRef.current
      ) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        await playCameraPreview();
      }
      setCameraReady(true);
      await applyTorch(flashOn);
      return;
    }

    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 720, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        // Video-only: avoids iOS pausing background music (Spotify, Apple Music).
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await playCameraPreview();
      }

      setCameraReady(true);
      await applyTorch(flashOn);
    } catch (error: unknown) {
      console.error("CAMERA ERROR:", error);
      const message = getCameraErrorMessage(error);
      if (message) {
        setCameraError(message);
      }
      setCameraReady(false);
    }
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function applyTorch(nextFlashOn: boolean) {
    const videoTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (!capabilities?.torch) return;

      await videoTrack.applyConstraints({
        advanced: [{ torch: nextFlashOn } as MediaTrackConstraintSet],
      });
    } catch (error) {
      console.warn("FLASH NOT SUPPORTED:", error);
      if (nextFlashOn) setFlashOn(false);
    }
  }

  function toggleFlash() {
    setFlashOn((current) => !current);
  }

  function switchCameraFacingMode() {
    if (isRecordingVideo) return;
    setFlashOn(false);
    setCameraFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  function handleRecordButtonClick() {
    if (isRecordingVideo) {
      stopVideoRecording();
    } else {
      startVideoRecording();
    }
  }

  function handleGalleryFiles(files: FileList | null) {
    const videos = Array.from(files || []).filter((file) =>
      file.type.startsWith("video/"),
    );

    if (videos.length === 0) {
      showAppToast("Kies minimaal één video uit je camerarol");
      return;
    }

    setGalleryFiles(videos);
    setGalleryOpen(true);
  }

  function chooseGalleryFile(file: File) {
    if (!file.type.startsWith("video/")) {
      showAppToast("Kies een video uit je camerarol");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    const url = URL.createObjectURL(file);
    setRecordedVideoFile(file);
    setRecordedVideoUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setMuteVideoAudio(false);
    stopRecordingTimer();
    setIsRecordingVideo(false);
  }

  function startVideoRecording() {
    const stream = cameraStreamRef.current;

    if (!stream) {
      showAppToast("Camera is nog niet klaar");
      return;
    }

    const mimeType = getSupportedVideoMimeType();

    try {
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_500_000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingType = recorder.mimeType || mimeType || "video/mp4";
        const extension = getRecordedFileExtension(recordingType);
        const blob = new Blob(recordedChunksRef.current, {
          type: recordingType,
        });
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: recordingType,
        });
        const url = URL.createObjectURL(blob);

        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

        setRecordedVideoFile(file);
        setRecordedVideoUrl(url);
        setTrimStart(0);
        setTrimEnd(0);
        stopRecordingTimer();
        setIsRecordingVideo(false);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      stopRecordingTimer();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecordingVideo(true);
    } catch (error: unknown) {
      console.error("RECORD ERROR:", error);
      showAppToast(error instanceof Error ? error.message : "Opnemen mislukt");
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    if (!mediaRecorderRef.current) return;

    stopRecordingTimer();

    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecordedVideo() {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setActiveTrimHandle(null);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setCameraError("");
    setVideoCaption("");

    window.setTimeout(() => {
      if (!videoRecorderOpen) return;

      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        void playCameraPreview();
        setCameraReady(true);
        return;
      }

      void startCameraStream();
    }, 80);
  }

  function handlePreviewLoadedMetadata() {
    const duration = previewVideoRef.current?.duration || 0;

    if (!Number.isFinite(duration) || duration <= 0) return;

    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  }

  function formatVideoTime(value: number) {
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function togglePreviewMute() {
    setMuteVideoAudio((current) => {
      const nextValue = !current;
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = nextValue;
        previewVideoRef.current.volume = nextValue ? 0 : 1;
      }
      return nextValue;
    });
  }

  function updateTrimFromClientX(clientX: number, handle?: "start" | "end") {
    if (!trimSliderRef.current || !videoDuration) return;

    const rect = trimSliderRef.current.getBoundingClientRect();
    const rawPercent = (clientX - rect.left) / rect.width;
    const nextTime = Math.min(
      videoDuration,
      Math.max(0, rawPercent * videoDuration),
    );
    const minGap = Math.min(0.4, Math.max(0.1, videoDuration / 30));
    const currentEnd = trimEnd || videoDuration;
    const chosenHandle =
      handle ||
      (Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
        ? "start"
        : "end");

    if (chosenHandle === "start") {
      const nextStart = Math.min(nextTime, currentEnd - minGap);
      setTrimStart(nextStart);
      if (previewVideoRef.current) previewVideoRef.current.currentTime = nextStart;
      return;
    }

    const nextEnd = Math.max(nextTime, trimStart + minGap);
    setTrimEnd(nextEnd);
    if (previewVideoRef.current) previewVideoRef.current.currentTime = nextEnd;
  }

  async function getFFmpeg() {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = ffmpegRef.current || new FFmpeg();
    ffmpegRef.current = ffmpeg;

    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    return ffmpeg;
  }

  async function trimVideoFile(file: File, start: number, end: number) {
    const effectiveEnd = end > 0 ? end : videoDuration;

    if (
      !muteVideoAudio &&
      (!videoDuration ||
        (start <= 0.05 &&
          effectiveEnd >= Math.max(videoDuration - 0.05, 0)))
    ) {
      return file;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = videoDuration
      ? Math.min(videoDuration, effectiveEnd || videoDuration)
      : Math.max(effectiveEnd || 0, safeStart + 0.5);

    if (safeEnd <= safeStart) {
      return file;
    }

    setTrimmingVideo(true);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = file.name.toLowerCase().endsWith(".webm")
        ? "input.webm"
        : "input.mp4";
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const ffmpegArgs = [
        "-ss",
        String(safeStart),
        "-to",
        String(safeEnd),
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
      ];

      if (muteVideoAudio) {
        ffmpegArgs.push("-an");
      } else {
        ffmpegArgs.push("-c:a", "aac");
      }

      ffmpegArgs.push(outputName);
      await ffmpeg.exec(ffmpegArgs);

      const output = await ffmpeg.readFile(outputName);
      const outputData =
        output instanceof Uint8Array ? output : new TextEncoder().encode(output);
      const fixedOutputData = new Uint8Array(outputData as Uint8Array).buffer;

      const trimmedBlob = new Blob([fixedOutputData], {
        type: "video/mp4",
      });

      await ffmpeg.deleteFile(inputName).catch(() => undefined);
      await ffmpeg.deleteFile(outputName).catch(() => undefined);

      return new File([trimmedBlob], `trimmed-${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } finally {
      setTrimmingVideo(false);
    }
  }

  async function saveRecordedVideo() {
    if (!videoRecorderTarget || !recordedVideoFile) {
      showAppToast("Neem eerst een video op");
      return;
    }

    const target = videoRecorderTarget;
    const endTime = trimEnd || videoDuration || 0;
    let fileToUpload = recordedVideoFile;
    const skipTrim =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1023px)").matches ||
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        "ontouchstart" in window);

    try {
      if (!skipTrim) {
        try {
          fileToUpload = await trimVideoFile(
            recordedVideoFile,
            trimStart,
            endTime,
          );
        } catch (trimError) {
          console.error("TRIM ERROR, uploading original video:", trimError);
          fileToUpload = recordedVideoFile;
        }
      }

      closeVideoRecorder();
      showAppToast("Video uploaden…");

      await onUpload(
        target.exercise,
        target.setNumber,
        fileToUpload,
        videoCaption.trim() || null,
      );
    } catch (error: unknown) {
      console.error("SAVE VIDEO ERROR:", error);
      showAppToast(error instanceof Error ? error.message : "Video opslaan mislukt");
    }
  }

  return {
    openVideoRecorder,
    isOpen: videoRecorderOpen,
    videoRecorderTarget,
    recordedVideoUrl,
    cameraVideoRef,
    closeVideoRecorder,
    toggleFlash,
    isRecordingVideo,
    flashOn,
    cameraError,
    formatVideoTime,
    recordingSeconds,
    galleryOpen,
    galleryFiles,
    setGalleryOpen,
    chooseGalleryFile,
    galleryInputRef,
    handleGalleryFiles,
    handleRecordButtonClick,
    cameraReady,
    switchCameraFacingMode,
    previewVideoRef,
    muteVideoAudio,
    handlePreviewLoadedMetadata,
    trimSliderRef,
    trimEnd,
    videoDuration,
    trimStart,
    activeTrimHandle,
    setActiveTrimHandle,
    updateTrimFromClientX,
    togglePreviewMute,
    scrollMobileFieldIntoView,
    videoCaption,
    setVideoCaption,
    resetRecordedVideo,
    trimmingVideo,
    uploadingVideoSetKey,
    saveRecordedVideo,
  };
}

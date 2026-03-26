import { useRef, useState } from "react";
import styles from "./AudioRecorder.module.css";

type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

interface AudioRecorderState {
  status: RecordingStatus;
  audioUrl: string | null;
  audioBlob: Blob | null;
  errorMessage: string | null;
}

export default function AudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    status: "idle",
    audioUrl: null,
    audioBlob: null,
    errorMessage: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getMicrophoneAccess = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        errorMessage: "Microfone não encontrado ou permissão negada. Verifique as configurações do seu navegador.",
      }));
      return null;
    }
  };

  const handleStart = async () => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);

    setState({ status: "recording", audioUrl: null, audioBlob: null, errorMessage: null });

    const stream = await getMicrophoneAccess();
    if (!stream) return;

    streamRef.current = stream;
    chunksRef.current = [];

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setState((prev) => ({ ...prev, status: "stopped", audioBlob: blob, audioUrl: url }));
    };

    mediaRecorder.start();
  };

  const handlePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      setState((prev) => ({ ...prev, status: "paused" }));
    } else if (recorder.state === "paused") {
      recorder.resume();
      setState((prev) => ({ ...prev, status: "recording" }));
    }
  };

  const handleStop = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.stop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const isRecordingActive = state.status === "recording" || state.status === "paused";

  const statusLabel = {
    idle: "Aguardando",
    recording: "Gravando",
    paused: "Pausado",
    stopped: "Concluído",
  }[state.status];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Gravador de áudio</h1>
          <p className={styles.subtitle}>Captura · Pausa · Download</p>
        </div>

        {/* Error */}
        {state.errorMessage && <p className={styles.error}>{state.errorMessage}</p>}

        {/* Status indicator */}
        <div className={styles.statusRow}>
          <span className={`${styles.dot} ${styles[state.status]}`} />
          <span className={`${styles.statusText} ${state.status === "recording" ? styles.recording : ""}`}>
            {statusLabel}
          </span>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          {!isRecordingActive && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleStart}>
              {state.status === "stopped" ? "Nova gravação" : "Iniciar"}
            </button>
          )}

          {isRecordingActive && (
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handlePause}>
              {state.status === "paused" ? "Retomar" : "Pausar"}
            </button>
          )}

          {isRecordingActive && (
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleStop}>
              Parar
            </button>
          )}
        </div>

        {/* Playback + Download */}
        {state.status === "stopped" && state.audioUrl && (
          <div className={styles.playback}>
            <span className={styles.playbackLabel}>Sua gravação</span>
            <audio className={styles.audioPlayer} controls src={state.audioUrl} />
            <a className={styles.downloadLink} href={state.audioUrl} download="gravacao.webm">
              Baixar gravação
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

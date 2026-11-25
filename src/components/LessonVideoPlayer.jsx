"use client";

import { useState, useRef } from "react";

export default function LessonVideoPlayer({ videoUrl, title = "Lesson video" }) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  if (!videoUrl) return null;

  // Extract YouTube ID if applicable
  const ytMatch = videoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  if (ytMatch) {
    const videoId = ytMatch[1];
    return (
      <div className="video-player-container">
        {hasError ? (
          <div className="video-error-state" role="alert">
            <span aria-hidden="true" className="video-error-icon">⚠️</span>
            <h3>Video playback unavailable</h3>
            <p>{errorMessage || "The video could not be loaded. Please check your network connection."}</p>
            <div className="video-error-actions">
              <button
                type="button"
                className="button button-primary text-xs"
                onClick={handleRetry}
              >
                Retry Playback ↻
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-outline text-xs"
              >
                Watch on YouTube ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="video-frame-wrapper">
            <iframe
              className="lesson-video"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => {
                setHasError(true);
                setErrorMessage("Unable to load embedded video player.");
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="video-player-container">
      {hasError ? (
        <div className="video-error-state" role="alert">
          <span aria-hidden="true" className="video-error-icon">⚠️</span>
          <h3>Video playback error</h3>
          <p>{errorMessage || "Failed to load the media file. Please check your connection."}</p>
          <div className="video-error-actions">
            <button
              type="button"
              className="button button-primary text-xs"
              onClick={handleRetry}
            >
              Retry Playback ↻
            </button>
          </div>
        </div>
      ) : (
        <div className="video-native-wrapper">
          {isLoading && (
            <div className="video-loading-overlay">
              <span>Loading video...</span>
            </div>
          )}
          <video
            ref={videoRef}
            className="lesson-video"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
            onCanPlay={() => setIsLoading(false)}
            onWaiting={() => setIsLoading(true)}
            onError={(e) => {
              setIsLoading(false);
              setHasError(true);
              setErrorMessage("Unable to play video file. Please check your connection.");
            }}
          >
            Your browser does not support embedded video.
          </video>
        </div>
      )}
    </div>
  );
}

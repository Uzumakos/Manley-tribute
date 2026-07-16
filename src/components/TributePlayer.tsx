/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, SkipForward, Music, Sparkles, 
  Download, X, Film, Image as ImageIcon, FileText, Lock, Shield, Check
} from 'lucide-react';
import { Photo, Testimonial, TributeVideoConfig, AudioTrack } from '../types';

interface TributePlayerProps {
  config: TributeVideoConfig | null;
  photos: Photo[];
  testimonials: Testimonial[];
  lang: 'fr' | 'ht';
  audioTracks?: AudioTrack[];
}

export default function TributePlayer({ config, photos, testimonials, lang, audioTracks = [] }: TributePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); // 0 = Opening, then slides, then Closing
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedMusicUrl, setSelectedMusicUrl] = useState(config?.musicUrl || '');
  const ytPlayerRef = useRef<any>(null);

  useEffect(() => {
    if (config?.musicUrl) {
      setSelectedMusicUrl(config.musicUrl);
    }
  }, [config?.musicUrl]);

  // Helper to extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper to resolve a YouTube URL to its corresponding MP3 audio link if available in the playlist
  const getPlayableAudioUrl = (url: string): string => {
    if (!url) return '';
    const track = audioTracks.find(t => t.youtubeUrl === url || t.audioUrl === url);
    if (track && track.audioUrl) {
      return track.audioUrl;
    }
    return url;
  };

  // Dynamic Video Recording States
  const [videoRecordingState, setVideoRecordingState] = useState<'idle' | 'loading' | 'recording' | 'saving' | 'done' | 'error'>('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatusText, setVideoStatusText] = useState('');

  // Permission Request States
  const [photosPermission, setPhotosPermission] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [pdfPermission, setPdfPermission] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [photosReqId, setPhotosReqId] = useState<string | null>(null);
  const [pdfReqId, setPdfReqId] = useState<string | null>(null);

  const [requestModalType, setRequestModalType] = useState<'photos' | 'pdf' | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Load and check request status
  const checkRequestStatuses = async () => {
    const pId = localStorage.getItem('memorial_req_photos_id');
    const pdfId = localStorage.getItem('memorial_req_pdf_id');
    setPhotosReqId(pId);
    setPdfReqId(pdfId);

    const idsToCheck = [pId, pdfId].filter(Boolean) as string[];
    if (idsToCheck.length === 0) return;

    try {
      const res = await fetch(`/api/download-requests/status?ids=${idsToCheck.join(',')}`);
      if (res.ok) {
        const statuses = await res.json() as Record<string, string>;
        if (pId && statuses[pId]) {
          setPhotosPermission(statuses[pId] as any);
        }
        if (pdfId && statuses[pdfId]) {
          setPdfPermission(statuses[pdfId] as any);
        }
      }
    } catch (e) {
      console.warn("Failed to check request statuses:", e);
    }
  };

  useEffect(() => {
    checkRequestStatuses();
    const interval = setInterval(checkRequestStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showDownloadModal) {
      checkRequestStatuses();
    }
  }, [showDownloadModal]);

  const handleRequestPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName || !requestModalType) return;

    setIsSubmittingRequest(true);
    try {
      const res = await fetch('/api/download-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: requesterName, type: requestModalType })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(`memorial_req_${requestModalType}_id`, data.id);
        if (requestModalType === 'photos') {
          setPhotosReqId(data.id);
          setPhotosPermission('pending');
        } else {
          setPdfReqId(data.id);
          setPdfPermission('pending');
        }
        setRequestModalType(null);
        setRequesterName('');
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Filter and arrange slides based on configuration
  const slidePhotos = config?.selectedPhotos
    .map(id => photos.find(p => p.id === id))
    .filter(Boolean) as Photo[] || photos.slice(0, 5);

  const downloadPhotos = () => {
    slidePhotos.forEach((p, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = p.imageUrl;
        link.download = `manley-memorial-photo-${idx + 1}.jpg`;
        link.target = '_blank';
        link.referrerPolicy = 'no-referrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300);
    });
  };

  const slideQuotes = config?.selectedTestimonials
    .map(id => testimonials.find(t => t.id === id))
    .filter(Boolean) as Testimonial[] || testimonials.slice(0, 3);

  const slideDuration = (config?.slideDuration || 6) * 1000;
  
  // Create unified slide list
  // Slide 0: Opening
  // Slide 1..N: Photo + optional quote
  // Slide N+1: Closing
  const totalSlides = slidePhotos.length + 2;

  // Word wrap utility for Canvas Text rendering
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines;
  };

  // Canvas drawing handler for recording
  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    slideIdx: number,
    slideProgress: number,
    loadedImgs: Record<string, HTMLImageElement>
  ) => {
    // Clear to deep dark background
    ctx.fillStyle = '#0B131F';
    ctx.fillRect(0, 0, width, height);

    if (slideIdx === 0) {
      // Opening Slide
      ctx.fillStyle = '#0B131F';
      ctx.fillRect(0, 0, width, height);

      // Delicate gold frame
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, width - 100, height - 100);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // "En mémoire de"
      ctx.fillStyle = '#D4AF37'; // Gold
      ctx.font = 'normal bold tracking-[0.2em] 14px sans-serif';
      ctx.fillText(lang === 'fr' ? "EN MÉMOIRE DE" : "NAN MEMWA", width / 2, height / 2 - 100);

      // "Alcide Emmanuel"
      ctx.fillStyle = '#FFFFF0'; // Ivory
      ctx.font = 'italic 56px Georgia, serif';
      ctx.fillText("Alcide Emmanuel", width / 2, height / 2 - 35);

      // Separator
      ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.fillRect(width / 2 - 40, height / 2 + 15, 80, 1);

      // "Manley"
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'italic 40px Georgia, serif';
      ctx.fillText('"Manley"', width / 2, height / 2 + 55);

      // Footer
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = 'normal 12px monospace';
      ctx.fillText(
        lang === 'fr' ? "26 JUIN — À JAMAIS DANS NOS CŒURS" : "26 JEN — POU TOUT TAN NAN KÈ NOU",
        width / 2,
        height / 2 + 125
      );
    } else if (slideIdx === totalSlides - 1) {
      // Closing Slide
      ctx.fillStyle = '#0B131F';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, width - 100, height - 100);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'italic 34px Georgia, serif';
      ctx.fillText('"Manley"', width / 2, height / 2 - 60);

      ctx.fillStyle = '#FFFFF0';
      ctx.font = 'italic 24px Georgia, serif';
      const closingMsg = lang === 'fr' 
        ? "Tu continueras à vivre dans nos souvenirs." 
        : "W ap toujou kontinye viv nan souvni nou yo.";
      ctx.fillText(closingMsg, width / 2, height / 2 + 10);

      ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.fillRect(width / 2 - 30, height / 2 + 60, 60, 1);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = 'normal 12px sans-serif';
      ctx.fillText(
        lang === 'fr' ? "Album commémoratif interactif" : "Albòm komemoratif entèaktif",
        width / 2,
        height / 2 + 100
      );
    } else {
      // Photo slide
      const photoIdx = slideIdx - 1;
      const photo = slidePhotos[photoIdx % slidePhotos.length];
      const quote = slideQuotes[photoIdx % slideQuotes.length];

      if (photo) {
        const img = loadedImgs[photo.id];
        if (img) {
          // Ken Burns zoom effect
          const scale = 1.0 + 0.12 * slideProgress;
          const dx = -15 * slideProgress;
          const dy = -10 * slideProgress;

          ctx.save();
          ctx.translate(width / 2 + dx, height / 2 + dy);
          ctx.scale(scale, scale);

          const imgAspect = img.width / img.height;
          const canvasAspect = width / height;
          let drawW, drawH;
          if (imgAspect > canvasAspect) {
            drawH = height;
            drawW = height * imgAspect;
          } else {
            drawW = width;
            drawH = width / imgAspect;
          }
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        }
      }

      // Cinematic Vignette Gradient Overlay
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.1)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Quote Text (if present)
      if (quote) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#FFFFF0'; // Ivory quote color
        ctx.font = 'italic 20px Georgia, serif';

        const quoteText = `« ${quote.message} »`;
        const quoteLines = wrapText(ctx, quoteText, width - 200);

        const startX = 100;
        let startY = height - 190 - (quoteLines.length * 28);
        if (startY < 80) startY = 80;

        quoteLines.forEach((line, idx) => {
          ctx.fillText(line, startX, startY + (idx * 28));
        });

        const endY = startY + (quoteLines.length * 28);
        // Vertical Gold Line Accent on the left
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(startX - 20, startY - 2);
        ctx.lineTo(startX - 20, endY + 2);
        ctx.stroke();

        // Quote Author
        ctx.fillStyle = '#D4AF37'; // gold
        ctx.font = 'normal bold uppercase tracking-wider 11px sans-serif';
        const authorLabel = `— ${quote.isAnonymous ? 'Anonyme' : quote.authorName}${quote.relationship ? ` (${quote.relationship})` : ''}`;
        ctx.fillText(authorLabel, startX, endY + 12);
      }

      // Photo Caption
      if (photo?.caption) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'italic 13px sans-serif';
        ctx.fillText(photo.caption, 80, height - 45);
      }

      // Share Tag
      if (photo?.uploadedBy) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'normal 10px monospace';
        ctx.fillText(`${lang === 'fr' ? 'PARTAGÉ PAR' : 'PATAJE PA'}: ${photo.uploadedBy}`, width - 60, height - 45);
      }
    }

    // Dynamic Top Watermark Header
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = 'normal 10px monospace';
    ctx.fillText("ALCIDE EMMANUEL MANLEY — MEMORIAL", width - 60, 45);
  };

  // Core recorder launcher
  const handleGenerateVideo = async () => {
    try {
      setVideoRecordingState('loading');
      setVideoStatusText(lang === 'fr' ? "Chargement des photographies..." : "Kolekte foto yo...");
      setVideoProgress(5);

      // Preload images
      const loadedImages: Record<string, HTMLImageElement> = {};
      const preloadPromises = slidePhotos.map(async (p, idx) => {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.src = p.imageUrl;
            tempImg.onload = () => resolve(tempImg);
            tempImg.onerror = () => {
              // fallback without crossOrigin
              const tempImg2 = new Image();
              tempImg2.src = p.imageUrl;
              tempImg2.onload = () => resolve(tempImg2);
              tempImg2.onerror = (err) => reject(err);
            };
          });
          loadedImages[p.id] = img;
          setVideoProgress(Math.floor(5 + ((idx + 1) / slidePhotos.length) * 20));
        } catch (err) {
          console.warn(`Failed to preload image: ${p.imageUrl}`, err);
        }
      });

      await Promise.all(preloadPromises);

      // Create Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize 2D context");

      setVideoRecordingState('recording');
      setVideoProgress(25);

      // Set up streaming
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const tracks = [...canvasStream.getVideoTracks()];

      let recorderAudioSource: MediaElementAudioSourceNode | null = null;
      let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
      let recAudio: HTMLAudioElement | null = null;
      let audioCtx: AudioContext | null = null;
      let muteGain: GainNode | null = null;

      const playableUrl = getPlayableAudioUrl(selectedMusicUrl);
      if (playableUrl) {
        try {
          if (isYouTubeUrl(playableUrl)) {
            // Warn that YouTube audio stream is CORS-blocked and cannot be compiled into standard browser video file
            console.warn("YouTube audio cannot be captured in browser WebM compilation due to CORS restrictions.");
            setVideoStatusText(
              lang === 'fr'
                ? "Note: Audio YouTube muet dans le fichier téléchargé (sécurité)."
                : "Remak: Audio YouTube an silans nan videyo a pou sekirite."
            );
            // Quick 2.5 second sleep so the user can read the notice
            await new Promise(resolve => setTimeout(resolve, 2500));
          } else {
            setVideoStatusText(lang === 'fr' ? "Préparation de la mélodie d'ambiance..." : "Ap prepare mizik la...");
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            recAudio = new Audio(playableUrl);
            recAudio.crossOrigin = 'anonymous';
            recAudio.volume = 0.45;
            recAudio.loop = true; // Loop so it never terminates the audio stream early

            mediaStreamDestination = audioCtx.createMediaStreamDestination();
            recorderAudioSource = audioCtx.createMediaElementSource(recAudio);
            recorderAudioSource.connect(mediaStreamDestination);

            // Workaround for Chrome/WebKit bug: if MediaElementAudioSourceNode is not connected 
            // to an active physical speakers destination (even muted), the browser halts/suspends
            // the decoding process after 9-10 seconds of buffering, causing recording truncation.
            muteGain = audioCtx.createGain();
            muteGain.gain.value = 0.0;
            recorderAudioSource.connect(muteGain);
            muteGain.connect(audioCtx.destination);

            const audioTracks = mediaStreamDestination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              tracks.push(audioTracks[0]);
            }
          }
        } catch (audioErr) {
          console.warn("Audio node extraction failed. Proceeding with silent video compilation.", audioErr);
        }
      }

      const combinedStream = new MediaStream(tracks);

      // Set best supported recorder mime type
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      const chunks: Blob[] = [];

      // CRITICAL: Block aggressive Chromium garbage collection (GC)
      // If we don't hold active, long-lived references to these nodes, Chrome garbage-collects
      // them after exactly 9-10 seconds, cutting off the audio tracks and halting compilation.
      (window as any)._activeRecordingRefs = {
        canvas,
        loadedImages,
        audioCtx,
        recAudio,
        mediaStreamDestination,
        recorderAudioSource,
        muteGain,
        canvasStream,
        combinedStream,
        mediaRecorder,
        tracks
      };

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          setVideoRecordingState('saving');
          setVideoStatusText(lang === 'fr' ? "Création du fichier vidéo finale..." : "Ap anrejistre fichye a...");
          const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `Alcide-Emmanuel-Manley-Hommage.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setVideoRecordingState('done');
          setVideoProgress(100);
        } catch (err) {
          console.error("Compilation failed:", err);
          setVideoRecordingState('error');
        } finally {
          // Keep references active for 3 seconds to let the browser safely write the file
          setTimeout(() => {
            (window as any)._activeRecordingRefs = null;
          }, 3000);
        }
      };

      // Start recording
      mediaRecorder.start();
      if (recAudio && audioCtx) {
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        recAudio.play().catch(e => console.warn(e));
      }

      // Drawing loop constants
      const fps = 30;
      const durationPerSlide = 3500; // 3.5 seconds per slide (fast & beautifully optimized duration)
      const totalSlidesToRecord = totalSlides;
      const totalDuration = totalSlidesToRecord * durationPerSlide;
      
      let frameCount = 0;
      const frameDuration = 1000 / fps;
      const totalFrames = Math.ceil(totalDuration / frameDuration);

      const timerId = setInterval(() => {
        // Auto-resume AudioContext if suspended by browser
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(e => console.warn("Failed to resume AudioContext during record loop:", e));
        }

        if (frameCount >= totalFrames) {
          clearInterval(timerId);
          mediaRecorder.stop();
          if (recAudio) recAudio.pause();
          if (audioCtx) audioCtx.close();
          return;
        }

        const elapsed = frameCount * frameDuration;
        const currentSlideIdx = Math.floor(elapsed / durationPerSlide);
        const slideElapsed = elapsed % durationPerSlide;
        const slideProgressPercent = slideElapsed / durationPerSlide;

        // Draw current frame on canvas
        drawFrame(ctx, 1280, 720, currentSlideIdx, slideProgressPercent, loadedImages);

        frameCount++;

        // Update UI progress
        const currentProgress = Math.floor(25 + (frameCount / totalFrames) * 75);
        setVideoProgress(currentProgress);
        setVideoStatusText(
          lang === 'fr' 
            ? `Enregistrement du diaporama (${currentSlideIdx + 1}/${totalSlidesToRecord})` 
            : `Ap kreye videyo a (${currentSlideIdx + 1}/${totalSlidesToRecord})`
        );
      }, frameDuration);

    } catch (err) {
      console.error("Error generating video compilation:", err);
      setVideoRecordingState('error');
    }
  };

  const isYouTubeUrl = (url: string) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  // Setup YouTube player dynamically if needed
  useEffect(() => {
    const playableUrl = getPlayableAudioUrl(selectedMusicUrl);
    const videoId = getYouTubeId(playableUrl);
    let active = true;

    if (isYouTubeUrl(playableUrl) && videoId) {
      const initYT = () => {
        if (!active) return;

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          try {
            ytPlayerRef.current.loadVideoById({ videoId, startSeconds: 0 });
            if (!isPlaying) {
              ytPlayerRef.current.pauseVideo();
            }
            return;
          } catch (e) {
            console.warn("Failed to reuse YT player:", e);
          }
        }

        // If player exists but is not ready or has failed, destroy it before creating a new one
        if (ytPlayerRef.current) {
          try {
            if (typeof ytPlayerRef.current.destroy === 'function') {
              ytPlayerRef.current.destroy();
            }
          } catch (e) {
            console.warn("Failed to destroy YT player:", e);
          }
          ytPlayerRef.current = null;
        }

        if ((window as any).YT && (window as any).YT.Player) {
          ytPlayerRef.current = new (window as any).YT.Player('youtube-tribute-player', {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              origin: window.location.origin, // Explicitly specify parent origin to satisfy postMessage checks
              modestbranding: 1
            },
            events: {
              onReady: (event: any) => {
                if (!active) return;
                event.target.setVolume(isMuted ? 0 : volume * 100);
                if (isPlaying) {
                  event.target.playVideo();
                }
              }
            }
          });
        }
      };

      if (!(window as any).YT || !(window as any).YT.Player) {
        // Load YouTube API script if missing
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        (window as any).onYouTubeIframeAPIReady = initYT;
      } else {
        initYT();
      }
    }

    return () => {
      active = false;
    };
  }, [selectedMusicUrl]);

  // Clean up player on component unmount
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.destroy === 'function') {
            ytPlayerRef.current.destroy();
          }
        } catch (e) {
          console.warn("Failed to clean up YT player on unmount:", e);
        }
        ytPlayerRef.current = null;
      }
    };
  }, []);

  // Playback control effect
  useEffect(() => {
    const playableUrl = getPlayableAudioUrl(selectedMusicUrl);
    if (isPlaying) {
      if (isYouTubeUrl(playableUrl)) {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
        }
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        }
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.warn(e));
        }
      }
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, selectedMusicUrl]);

  // Setup MP3 audio if selected
  useEffect(() => {
    const playableUrl = getPlayableAudioUrl(selectedMusicUrl);
    if (playableUrl && !isYouTubeUrl(playableUrl)) {
      audioRef.current = new Audio(playableUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = isMuted ? 0 : volume;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.warn(e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedMusicUrl]);

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  // Handle slide advance logic
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSlideIndex(prev => {
          if (prev >= totalSlides - 1) {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
            if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
              ytPlayerRef.current.pauseVideo();
            }
            return 0; // Reset
          }
          return prev + 1;
        });
      }, slideDuration);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentSlideIndex, totalSlides, slideDuration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentSlideIndex(0);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(0, true);
    }
  };

  const handleSkip = () => {
    setCurrentSlideIndex(prev => (prev + 1) % totalSlides);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
  };

  // Render current slide helper
  const renderSlideContent = () => {
    if (currentSlideIndex === 0) {
      // Opening Slide
      return (
        <motion.div
          key="opening"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-midnight z-10"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="space-y-4"
          >
            <span className="text-gold tracking-[0.25em] text-xs md:text-sm font-serif block uppercase">
              {lang === 'fr' ? "En mémoire de" : "Nan memwa"}
            </span>
            <h1 className="text-4xl md:text-6xl text-ivory font-serif tracking-wide font-medium italic">
              Alcide Emmanuel
            </h1>
            <div className="w-16 h-[1px] bg-gold/50 mx-auto my-6" />
            <p className="text-3xl md:text-5xl text-gold font-serif italic">
              "Manley"
            </p>
            <p className="text-sage/80 tracking-widest text-xs md:text-sm mt-8 font-light uppercase">
              {lang === 'fr' ? "26 Juin — À jamais dans nos cœurs" : "26 Jen — Pou tout tan nan kè nou"}
            </p>
          </motion.div>
        </motion.div>
      );
    }

    if (currentSlideIndex === totalSlides - 1) {
      // Closing Slide
      return (
        <motion.div
          key="closing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-midnight z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="space-y-4 max-w-xl"
          >
            <p className="text-gold font-serif italic text-2xl md:text-3xl">
              "Manley"
            </p>
            <h2 className="text-2xl md:text-4xl text-ivory font-serif font-light leading-relaxed">
              {lang === 'fr' 
                ? "Tu continueras à vivre dans nos souvenirs." 
                : "W ap toujou kontinye viv nan souvni nou yo."}
            </h2>
            <div className="w-12 h-[1px] bg-gold/30 mx-auto my-6" />
            <p className="text-sage/60 text-xs tracking-widest uppercase">
              {lang === 'fr' ? "Album commémoratif interactif" : "Albòm komemoratif entèaktif"}
            </p>
          </motion.div>
        </motion.div>
      );
    }

    // Interactive Photo + Testimonial Slides
    const photoIndex = currentSlideIndex - 1;
    const photo = slidePhotos[photoIndex % slidePhotos.length];
    // Pick an associated quote if available, or rotate through quotes
    const quote = slideQuotes[photoIndex % slideQuotes.length];

    return (
      <motion.div
        key={`slide-${photoIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 bg-black overflow-hidden"
      >
        {/* Ken Burns Animated Background Image */}
        {photo && (
          <motion.div
            key={`img-${photo.id}`}
            className="absolute inset-0 w-full h-full bg-cover bg-center origin-center"
            style={{ backgroundImage: `url(${photo.imageUrl})` }}
            animate={{
              scale: [1, 1.08],
              x: [0, -10],
              y: [0, -5]
            }}
            transition={{
              duration: slideDuration / 1000,
              ease: "linear"
            }}
          />
        )}

        {/* Elegant Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />

        {/* Caption & Testimonial Layout */}
        <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 text-left flex flex-col md:flex-row justify-between items-end gap-6 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="max-w-2xl"
          >
            {quote && (
              <div className="mb-6 border-l-2 border-gold/40 pl-6 space-y-2">
                <p className="text-lg md:text-xl text-ivory font-serif italic leading-relaxed">
                  « {quote.message} »
                </p>
                <p className="text-xs text-gold/90 font-sans tracking-wide uppercase">
                  — {quote.isAnonymous ? (lang === 'fr' ? 'Anonyme' : 'Anonyme') : quote.authorName}
                  {quote.relationship && ` (${quote.relationship})`}
                </p>
              </div>
            )}
            
            {photo?.caption && (
              <p className="text-xs md:text-sm text-sage/90 italic font-sans">
                {photo.caption}
              </p>
            )}
          </motion.div>

          {photo?.uploadedBy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-right text-[10px] tracking-wider text-ivory/60 uppercase shrink-0 font-mono"
            >
              {lang === 'fr' ? 'Partagé par' : 'Pataje pa'}: {photo.uploadedBy}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  if (config?.videoEnabled === false) {
    return (
      <div className="w-full bg-midnight rounded-3xl overflow-hidden border border-gold/15 shadow-xl relative aspect-video flex flex-col items-center justify-center p-8 text-center text-ivory">
        {/* Background gradient layout matching the site aesthetics */}
        <div className="absolute inset-0 bg-gradient-to-tr from-midnight via-slate-900 to-midnight opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="w-16 h-16 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center mx-auto"
          >
            <Film className="w-8 h-8 text-gold" />
          </motion.div>

          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-3"
          >
            <h3 className="text-xl md:text-2xl font-serif text-gold font-medium">
              {lang === 'fr' ? "Film Hommage Indisponible" : "Fim Omaj la pa Disponib"}
            </h3>
            <p className="text-sm text-sage leading-relaxed whitespace-pre-line font-serif italic max-w-md mx-auto">
              {lang === 'fr'
                ? (config?.disabledMessageFr || "Le film hommage n'est pas encore disponible au visionnage.")
                : (config?.disabledMessageHt || "Fim omaj la poko disponib pou gade.")}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-midnight rounded-2xl shadow-2xl overflow-hidden border border-gold/10 relative">
      
      {/* Aspect ratio frame (ideal for cinematic experience) */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <AnimatePresence mode="wait">
          {renderSlideContent()}
        </AnimatePresence>

        {/* Visual Play / Overlay Hint when Paused */}
        {!isPlaying && currentSlideIndex === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <button
              onClick={handlePlayPause}
              className="p-6 rounded-full bg-gold hover:bg-gold/90 text-midnight transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center"
            >
              <Play className="w-8 h-8 fill-midnight ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="bg-slate-900 border-t border-gold/10 p-4 md:px-6 flex flex-wrap items-center justify-between gap-4">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="p-2.5 rounded-full bg-gold/10 text-gold hover:bg-gold hover:text-midnight transition"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <button
            onClick={handleSkip}
            className="p-2.5 rounded-full bg-slate-800 text-ivory/80 hover:bg-slate-700 hover:text-ivory transition"
            title={lang === 'fr' ? 'Suivant' : 'Swivan'}
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleRestart}
            className="p-2.5 rounded-full bg-slate-800 text-ivory/80 hover:bg-slate-700 hover:text-ivory transition"
            title={lang === 'fr' ? 'Recommencer' : 'Rekòmanse'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDownloadModal(true)}
            className="p-2.5 rounded-full bg-slate-800 text-gold hover:bg-gold hover:text-midnight transition"
            title={lang === 'fr' ? 'Télécharger le film / Souvenirs' : 'Telechaje videyo a / Souvni yo'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Timeline */}
        <div className="flex-1 min-w-[120px] hidden sm:flex items-center gap-2">
          <span className="text-[10px] text-sage font-mono">
            {currentSlideIndex + 1} / {totalSlides}
          </span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold transition-all duration-500" 
              style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
            />
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sage text-xs font-serif italic hidden lg:flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-gold" />
            {config?.title ? config.title.substring(0, 30) + '...' : "Tribut audio"}
          </span>
          
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-ivory/80 hover:text-gold transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 accent-gold bg-slate-800 rounded-lg cursor-pointer h-1"
          />
        </div>
      </div>

      {/* Download Options Modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDownloadModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()} 
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gold/20 flex flex-col p-6 cursor-default text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-serif text-midnight font-semibold">
                    {lang === 'fr' ? "Télécharger le Film Hommage" : "Telechaje Fim Omaj la"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'fr' 
                      ? "Conservez un souvenir précieux de la mémoire de Manley" 
                      : "Chwazi kijan ou vle sove bèl souvni Manley yo"}
                  </p>
                </div>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-midnight transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {videoRecordingState !== 'idle' && videoRecordingState !== 'done' ? (
                <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-6">
                  {videoRecordingState === 'error' ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                        <X className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-midnight">
                          {lang === 'fr' ? "Une erreur est survenue" : "Gen yon erè ki fèt"}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                          {lang === 'fr'
                            ? "Désolé, nous n'avons pas pu encoder la vidéo dans votre navigateur. Vous pouvez toujours télécharger les photos ou la bande son individuellement."
                            : "Eskize nou, nou pa ka kreye videyo a nan navigatè w la. Ou ka toujou telechaje foto yo oswa mizik la."}
                        </p>
                      </div>
                      <button
                        onClick={() => setVideoRecordingState('idle')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        {lang === 'fr' ? "Réessayer" : "Eseye ankò"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-gold animate-spin" />
                        <span className="absolute text-xs font-mono font-bold text-midnight">
                          {videoProgress}%
                        </span>
                      </div>
                      <div className="space-y-2 max-w-sm">
                        <h4 className="text-sm font-semibold text-midnight animate-pulse">
                          {videoStatusText}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {lang === 'fr'
                            ? "Veuillez patienter et laisser cet onglet ouvert. Le navigateur assemble vos souvenirs en haute résolution..."
                            : "Tanpri rete sou paj sa a epi pa fèmen l. Navigatè w la ap rasanble bèl souvni yo..."}
                        </p>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gold h-full transition-all duration-300"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : videoRecordingState === 'done' ? (
                <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-midnight">
                      {lang === 'fr' ? "Vidéo générée avec succès !" : "Videyo a pare !"}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                      {lang === 'fr'
                        ? "Le téléchargement a commencé. Vous pouvez retrouver le fichier .webm dans votre dossier Téléchargements."
                        : "Telechajman an kòmanse. Ou ka jwenn vèsyon .webm nan katab telechajman w lan."}
                    </p>
                  </div>
                  <button
                    onClick={() => setVideoRecordingState('idle')}
                    className="px-4 py-2 bg-gold hover:bg-gold/90 text-midnight text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {lang === 'fr' ? "Générer une autre vidéo" : "Kreye yon lòt videyo"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 my-2">
                  {/* Option 0: Dynamic WebM Video Compiler (Recommended) */}
                  <div className="p-4 bg-gold/10 border-2 border-gold/40 rounded-2xl flex flex-col gap-4 hover:bg-gold/15 transition relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 bg-gold/10 text-gold text-[9px] uppercase tracking-wider font-bold rounded-bl-xl font-mono">
                      {lang === 'fr' ? 'Recommandé' : 'Rekòmande'}
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-midnight flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                          {lang === 'fr' ? "Générer la Vidéo du Diaporama" : "Kreye Videyo Diaporam nan"}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          {lang === 'fr' 
                            ? "Génère dynamiquement un film vidéo complet (WebM) avec la musique, les photos et les textes d'hommage." 
                            : "Kreye yon videyo konplè (vèsyon WebM) avèk mizik background nan, foto yo, ak tout mesaj souvni yo."}
                        </p>
                      </div>

                      {/* Song Selector */}
                      {audioTracks && audioTracks.length > 0 && (
                        <div className="space-y-1 max-w-xs">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {lang === 'fr' ? "Musique de fond du film" : "Mizik background videyo a"}
                          </label>
                          <select
                            value={selectedMusicUrl}
                            onChange={(e) => setSelectedMusicUrl(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-white text-xs font-semibold"
                          >
                            <option value={config?.musicUrl || ''}>
                              {lang === 'fr' ? "Mélodie par défaut" : "Mizik pa defo"}
                            </option>
                            {audioTracks.filter(t => t.audioUrl).map((track) => (
                              <option key={track.id} value={track.audioUrl}>
                                {track.title} — {track.artist}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleGenerateVideo}
                      className="px-4 py-2 bg-midnight text-gold hover:bg-slate-900 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                    >
                      <Film className="w-3.5 h-3.5" />
                      {lang === 'fr' ? "Créer la vidéo" : "Kreye videyo a"}
                    </button>
                  </div>

                  {/* Option 1: Direct MP4 (if configured by admin) */}
                  {config?.downloadUrl && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-100 transition">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-midnight flex items-center gap-1.5">
                          <Film className="w-4 h-4 text-gold" />
                          {lang === 'fr' ? "Fichier Vidéo (MP4)" : "Fichye Videyo (MP4)"}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          {lang === 'fr' 
                            ? "Téléchargez le film hommage complet pré-enregistré par l'administrateur." 
                            : "Telechaje vèsyon videyo omaj la dirèkteman."}
                        </p>
                      </div>
                      <a
                        href={config.downloadUrl}
                        download={`Alcide-Emmanuel-Manley-Tribute.mp4`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gold hover:bg-gold/90 text-midnight text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {lang === 'fr' ? "Télécharger" : "Telechaje"}
                      </a>
                    </div>
                  )}

                  {/* Option 2: Background music track download */}
                  {config?.musicUrl && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-100 transition">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-midnight flex items-center gap-1.5">
                          <Music className="w-4 h-4 text-gold" />
                          {lang === 'fr' ? "Musique de fond (MP3)" : "Mizik background nan (MP3)"}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          {lang === 'fr' 
                            ? "Téléchargez la mélodie d'accompagnement de cet hommage." 
                            : "Telechaje bèl mizik k ap jwe nan background nan."}
                        </p>
                      </div>
                      <a
                        href={config.musicUrl}
                        download="Manley-Tribute-Soundtrack.mp3"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-950 text-ivory text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-gold" />
                        {lang === 'fr' ? "Télécharger" : "Telechaje"}
                      </a>
                    </div>
                  )}

                  {/* Option 3: Download all slide photos */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-100 transition">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-midnight flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-gold" />
                        {lang === 'fr' ? `Album Photo (${slidePhotos.length} clichés)` : `Bèl Foto yo (${slidePhotos.length} foto)`}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {lang === 'fr' 
                          ? "Téléchargez toutes les photographies historiques du film d'hommage." 
                          : "Telechaje tout bèl foto istorik ki pase nan videyo a."}
                      </p>
                    </div>
                    {photosPermission === 'approved' ? (
                      <button
                        onClick={downloadPhotos}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-950 text-ivory text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-gold" />
                        {lang === 'fr' ? "Télécharger" : "Telechaje"}
                      </button>
                    ) : photosPermission === 'pending' ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed shrink-0"
                      >
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        {lang === 'fr' ? "En attente d'accès..." : "Ap tann otorizasyon..."}
                      </button>
                    ) : photosPermission === 'rejected' ? (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-red-500 font-bold uppercase">{lang === 'fr' ? "Accès refusé" : "Aksè refize"}</span>
                        <button
                          onClick={() => {
                            localStorage.removeItem('memorial_req_photos_id');
                            setPhotosPermission('none');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-midnight text-[10px] font-semibold rounded-lg transition"
                        >
                          {lang === 'fr' ? "Réessayer" : "Refè demann lan"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRequestModalType('photos')}
                        className="px-4 py-2 bg-gold hover:bg-gold/90 text-midnight text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {lang === 'fr' ? "Demander l'accès" : "Mande otorizasyon"}
                      </button>
                    )}
                  </div>

                  {/* Option 4: Print/PDF Memorial Keepsake Album */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-100 transition">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-midnight flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-gold" />
                        {lang === 'fr' ? "Imprimer le Livre d'Or / PDF" : "Ekspòte kòm Liv PDF enprimab"}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {lang === 'fr' 
                          ? "Générez un magnifique livret souvenir contenant toutes les diapositives." 
                          : "Kreye yon bèl ti liv souvni enprimab ak tout bèl foto ak mesaj yo."}
                      </p>
                    </div>
                    {pdfPermission === 'approved' ? (
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-950 text-ivory text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-gold" />
                        {lang === 'fr' ? "Imprimer / PDF" : "Enprime / PDF"}
                      </button>
                    ) : pdfPermission === 'pending' ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-not-allowed shrink-0"
                      >
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        {lang === 'fr' ? "En attente d'accès..." : "Ap tann otorizasyon..."}
                      </button>
                    ) : pdfPermission === 'rejected' ? (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-red-500 font-bold uppercase">{lang === 'fr' ? "Accès refusé" : "Aksè refize"}</span>
                        <button
                          onClick={() => {
                            localStorage.removeItem('memorial_req_pdf_id');
                            setPdfPermission('none');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-midnight text-[10px] font-semibold rounded-lg transition"
                        >
                          {lang === 'fr' ? "Réessayer" : "Refè demann lan"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRequestModalType('pdf')}
                        className="px-4 py-2 bg-gold hover:bg-gold/90 text-midnight text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {lang === 'fr' ? "Demander l'accès" : "Mande otorizasyon"}
                      </button>
                    )}
                  </div>

                  {/* Nested Permission Request Modal Overlay */}
                  <AnimatePresence>
                    {requestModalType && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[110] flex items-center justify-center p-4 cursor-default"
                      >
                        <motion.div
                          initial={{ scale: 0.95, y: 10 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.95, y: 10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gold/20 shadow-2xl space-y-4"
                        >
                          <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                            <h4 className="text-sm font-serif font-semibold text-midnight flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-gold" />
                              {lang === 'fr' ? "Demande d'autorisation" : "Demann otorizasyon"}
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestModalType(null);
                                setRequesterName('');
                              }}
                              className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-normal">
                            {lang === 'fr'
                              ? "Pour télécharger ou imprimer ces souvenirs, veuillez introduire votre nom complet. Votre demande sera soumise à l'approbation de l'administrateur du mémorial."
                              : "Pou telechaje oswa enprime souvni sa yo, tanpri antre non konplè ou. Demann ou an pral ale jwenn admin nan pou l apwouve l."}
                          </p>

                          <form onSubmit={handleRequestPermission} className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-semibold text-slate-700">
                                {lang === 'fr' ? "Votre Nom Complet" : "Non konplè ou"}
                              </label>
                              <input
                                type="text"
                                required
                                value={requesterName}
                                onChange={(e) => setRequesterName(e.target.value)}
                                placeholder="Ex: Marie Emmanuel"
                                className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-gold outline-none text-xs"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmittingRequest || !requesterName.trim()}
                              className="w-full py-2.5 bg-midnight hover:bg-slate-900 text-gold font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              {isSubmittingRequest ? (
                                <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              {lang === 'fr' ? "Envoyer la demande" : "Voye demann nan"}
                            </button>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Footer notice */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center uppercase tracking-wider font-mono">
                {lang === 'fr' 
                  ? "A la douce mémoire de Alcide Emmanuel" 
                  : "Nan memwa Alcide Emmanuel"}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden YouTube Player Iframe Target */}
      <div id="youtube-tribute-player" style={{ display: 'none', width: 0, height: 0 }} />
    </div>
  );
}

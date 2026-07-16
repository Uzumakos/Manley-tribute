import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RotateCcw, ChevronUp, ChevronDown, Maximize2, Minimize2, Music
} from 'lucide-react';
import { AudioTrack } from '../types';

interface MusicPlayerProps {
  tracks: AudioTrack[];
  lang: 'fr' | 'ht';
}

export default function MusicPlayer({ tracks, lang }: MusicPlayerProps) {
  if (!tracks || tracks.length === 0) return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(true); // start muted so browser allows autoplay
  const [isRepeat, setIsRepeat] = useState(true);

  const activeTrack = tracks[currentTrackIndex];

  // Ref to hold the YT player instance
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const activeVideoId = getYouTubeId(activeTrack?.youtubeUrl);
  const activeThumbnail = activeVideoId 
    ? `https://img.youtube.com/vi/${activeVideoId}/mqdefault.jpg` 
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=300';

  // Load YouTube Iframe API Script
  useEffect(() => {
    // Only load if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Define global callback
      (window as any).onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Initialize YT Player on the hidden div
  const initPlayer = () => {
    const videoId = getYouTubeId(tracks[0]?.youtubeUrl);
    if (!videoId) return;

    playerRef.current = new (window as any).YT.Player('youtube-hidden-player', {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        mute: 1,      // required for browser autoplay policy
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: (event: any) => {
          event.target.mute();          // ensure muted for autoplay
          event.target.setVolume(volume);
          event.target.playVideo();     // will succeed because muted
        },
        onStateChange: (event: any) => {
          // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
          const state = event.data;
          if (state === 1) {
            setIsPlaying(true);
            startProgressLoop();
          } else {
            setIsPlaying(false);
            stopProgressLoop();
          }

          if (state === 0) {
            handleTrackEnd();
          }
        }
      }
    });
  };

  // Keep tracking progress
  const startProgressLoop = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        setCurrentTime(current);
        setDuration(total || 0);
      }
    }, 250);
  };

  const stopProgressLoop = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Change track ID when activeTrack changes
  useEffect(() => {
    if (playerRef.current && activeVideoId) {
      playerRef.current.loadVideoById({
        videoId: activeVideoId,
        startSeconds: 0
      });
      // Reset times
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(true);
    }
  }, [currentTrackIndex]);

  // Handle player controls
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleTrackEnd = () => {
    const isLastTrack = currentTrackIndex === tracks.length - 1;
    if (isLastTrack) {
      if (isRepeat) {
        setCurrentTrackIndex(0);
      } else {
        setIsPlaying(false);
      }
    } else {
      handleNext();
    }
  };

  const handleNext = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (playerRef.current) {
      playerRef.current.seekTo(seekTime, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (playerRef.current) playerRef.current.unMute();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    // Auto play when selected from playlist
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    }, 100);
  };

  return (
    <>
      {/* Offscreen hidden YouTube player element */}
      <div id="youtube-hidden-player" className="fixed top-0 left-0 w-0 h-0 pointer-events-none opacity-0 invisible" />

      {/* Floating capsule bottom right/center */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {/* COLLAPSED CAPSULE */}
        {!isExpanded && (
          <div className="flex items-center gap-2">
            {/* Mute/Unmute quick button — visible when muted so user knows music is playing */}
            {isMuted && isPlaying && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="flex items-center gap-1.5 bg-gold text-midnight text-[10px] font-bold px-3 py-2 rounded-full shadow-lg hover:bg-gold/90 transition animate-pulse"
                title={lang === 'fr' ? 'Activer le son' : 'Aktive son an'}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">{lang === 'fr' ? 'Son' : 'Son'}</span>
              </button>
            )}

            <button 
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-3.5 bg-slate-950/90 hover:bg-slate-900 border border-gold/25 hover:border-gold/50 shadow-2xl rounded-full py-2.5 px-4.5 text-ivory text-left transition select-none cursor-pointer group"
            >
              {/* Spinning track art — glows gold when muted to hint at interaction */}
              <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-800 relative flex items-center justify-center ${
                isMuted && isPlaying
                  ? 'border-2 border-gold ring-2 ring-gold/30 ring-offset-1 ring-offset-slate-950'
                  : 'border border-gold/30'
              }`}>
                <img 
                  src={activeThumbnail} 
                  alt="" 
                  className={`w-full h-full object-cover transition-transform ${isPlaying ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '20s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 rounded-full" />
              </div>

              <div className="min-w-[120px] max-w-[180px]">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                  YOUTUBE • {isPlaying
                    ? isMuted
                      ? (lang === 'fr' ? 'MUET' : 'SAN SON')
                      : (lang === 'fr' ? 'EN LECTURE' : 'AP JWE')
                    : (lang === 'fr' ? 'EN PAUSE' : 'EN PAZ')}
                </p>
                <p className="text-xs font-serif font-semibold text-ivory truncate mt-0.5 group-hover:text-gold transition">
                  {activeTrack.title}
                </p>
              </div>

              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-gold shrink-0 transition" />
            </button>
          </div>
        )}

        {/* EXPANDED DETAILED CARD */}
        {isExpanded && (
          <div className="bg-slate-950/95 border border-gold/20 shadow-2xl rounded-3xl p-5 w-80 max-w-full text-ivory flex flex-col space-y-5 backdrop-blur-md">
            
            {/* Expanded Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-gold animate-pulse' : 'bg-slate-600'}`} />
                {isPlaying ? (lang === 'fr' ? 'EN LECTURE' : 'AP JWE') : (lang === 'fr' ? 'EN PAUSE' : 'EN PAZ')}
              </span>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-gold transition"
                title={lang === 'fr' ? 'Réduire' : 'Fèmen'}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Rotating Album Art & Track Info */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              
              {/* Spinning record disk cover */}
              <div className="relative w-36 h-36 rounded-full border-4 border-slate-900 shadow-2xl flex items-center justify-center bg-slate-800 shrink-0 select-none">
                <img 
                  src={activeThumbnail} 
                  alt="" 
                  className="w-full h-full object-cover rounded-full"
                  style={{ 
                    animation: isPlaying ? 'spin 20s linear infinite' : 'none',
                    transform: !isPlaying ? 'rotate(0deg)' : undefined
                  }}
                  referrerPolicy="no-referrer"
                />
                {/* Center hole mimicking vinyl record */}
                <div className="absolute w-6 h-6 rounded-full bg-slate-950 border border-slate-900/50 flex items-center justify-center z-10 shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                </div>
                <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
              </div>

              {/* Title & Artist */}
              <div className="space-y-1 w-full px-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none shrink-0 uppercase tracking-widest font-mono">
                    YT
                  </span>
                  <p className="text-[10px] text-sage font-bold tracking-wider uppercase truncate max-w-[200px]">
                    {activeTrack.artist}
                  </p>
                </div>
                <h4 className="text-base font-serif font-bold text-ivory tracking-wide leading-tight truncate">
                  {activeTrack.title}
                </h4>
                <p className="text-[9px] text-slate-500 font-medium tracking-widest uppercase">
                  {lang === 'fr' ? 'PLAYLIST MÉMORIAL' : 'PLAYLIST OMAJ'}
                </p>
              </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="space-y-1.5 px-1">
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                value={currentTime} 
                onChange={handleSeekChange}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold border-none outline-none"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control Row */}
            <div className="flex items-center gap-2 px-1 text-slate-400">
              <button onClick={toggleMute} className="hover:text-gold transition">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400 border-none outline-none"
              />
            </div>

            {/* Control Actions Row */}
            <div className="flex items-center justify-center gap-6 pt-1">
              {/* Repeat Button */}
              <button 
                onClick={() => setIsRepeat(!isRepeat)}
                className={`transition p-1 ${isRepeat ? 'text-gold' : 'text-slate-500 hover:text-gold'}`}
                title={lang === 'fr' ? 'Répéter' : 'Repete'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Prev Button */}
              <button 
                onClick={handlePrev}
                className="text-slate-300 hover:text-gold transition p-1"
                title={lang === 'fr' ? 'Précédent' : 'Dènye'}
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Play/Pause Circle */}
              <button 
                onClick={togglePlay}
                className="w-11 h-11 bg-ivory hover:bg-gold text-slate-950 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 shrink-0 cursor-pointer"
                title={isPlaying ? (lang === 'fr' ? 'Pause' : 'Poz') : (lang === 'fr' ? 'Lecture' : 'Jwe')}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current text-slate-950" /> : <Play className="w-5 h-5 fill-current text-slate-950 translate-x-0.5" />}
              </button>

              {/* Next Button */}
              <button 
                onClick={handleNext}
                className="text-slate-300 hover:text-gold transition p-1"
                title={lang === 'fr' ? 'Suivant' : 'Pwochen'}
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Dummy spacing/placeholder to balance repeat button */}
              <div className="w-6 h-6 flex items-center justify-center text-slate-600">
                <Music className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Playlist Track Selection Drawer */}
            <div className="border-t border-white/5 pt-3.5 space-y-2">
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block leading-none px-1">
                {lang === 'fr' ? 'LISTE DES MORCEAUX' : 'LIS MIZIK YO'}
              </span>

              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {tracks.map((track, idx) => {
                  const isActive = idx === currentTrackIndex;
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleTrackSelect(idx)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition border border-transparent ${
                        isActive 
                          ? 'bg-gold/10 border-gold/15 text-gold font-semibold' 
                          : 'hover:bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate leading-tight">{track.title}</p>
                        <p className={`text-[9px] truncate mt-0.5 ${isActive ? 'text-gold/80' : 'text-slate-500'}`}>
                          {track.artist}
                        </p>
                      </div>

                      {isActive && (
                        <div className="w-2.5 h-2.5 bg-gold rounded-full flex items-center justify-center shrink-0">
                          <Play className="w-1.5 h-1.5 fill-current text-slate-950 translate-x-px" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Embedded Spin Animation CSS keyframe if not present */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 20s linear infinite;
        }
      `}</style>
    </>
  );
}

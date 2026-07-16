/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Calendar, Image as ImageIcon, Film, BookOpen, PenTool, ShieldAlert,
  ChevronRight, ArrowRight, CheckCircle2, Upload, Sparkles, Languages, Globe, Menu, X, ExternalLink
} from 'lucide-react';

import { Memorial, Testimonial, Photo, TributeVideoConfig, Language, AudioTrack } from './types';
import { translations } from './translations';
import TestimonialCard from './components/TestimonialCard';
import TributePlayer from './components/TributePlayer';
import AdminPanel from './components/AdminPanel';
import MusicPlayer from './components/MusicPlayer';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [activeTab, setActiveTab] = useState<'home' | 'memorial' | 'testimonials' | 'gallery' | 'video' | 'write-memory' | 'admin'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core backend states
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialSort, setTestimonialSort] = useState<'recent' | 'likes'>('recent');

  const handleTestimonialLike = (id: string, newLikesCount: number) => {
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, likes: newLikesCount } : t));
  };
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tributeVideo, setTributeVideo] = useState<TributeVideoConfig | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Form states (Write memory)
  const [authorName, setAuthorName] = useState('');
  const [nickname, setNickname] = useState('');
  const [relationship, setRelationship] = useState<'family' | 'friend' | 'colleague' | 'other'>('friend');
  const [testimonialMessage, setTestimonialMessage] = useState('');
  const [testimonialLang, setTestimonialLang] = useState<Language>('fr');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string>('');
  const [formUploading, setFormUploading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Gallery view and uploads states
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('All');
  const [galleryPhoto, setGalleryPhoto] = useState<File | null>(null);
  const [galleryPhotoPreview, setGalleryPhotoPreview] = useState<string>('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [galleryCategory, setGalleryCategory] = useState<'Childhood' | 'Family' | 'Friends' | 'Important Moments' | 'Memories'>('Memories');
  const [galleryUploadedBy, setGalleryUploadedBy] = useState('');
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [gallerySuccess, setGallerySuccess] = useState(false);

  const t = translations[lang];

  // Derived dynamic personality and traits content
  const personalityTitle = lang === 'fr'
    ? (memorial?.personalityTitleFr || t.personalityTitle)
    : (memorial?.personalityTitleHt || t.personalityTitle);

  const personalityText = lang === 'fr'
    ? (memorial?.personalityTextFr || t.personalityText)
    : (memorial?.personalityTextHt || t.personalityText);

  const traitsTitle = lang === 'fr'
    ? (memorial?.traitsTitleFr || "Traits Distinctifs")
    : (memorial?.traitsTitleHt || "Karakteristik yo");

  const defaultTraits = lang === 'fr'
    ? [
      "Humilité profonde",
      "Ingénieur de solutions élégantes",
      "Mélomane & guitariste passionné",
      "Fierté culturelle haïtienne"
    ]
    : [
      "Gwo imilite",
      "Kreyatè solisyon elegant",
      "Mizisyen ak jitaris pasyone",
      "Fiyète kiltirèl ayisyen"
    ];

  const traitsList = lang === 'fr'
    ? (memorial?.traitsFr ? memorial.traitsFr.split('\n').map(item => item.trim()).filter(Boolean) : defaultTraits)
    : (memorial?.traitsHt ? memorial.traitsHt.split('\n').map(item => item.trim()).filter(Boolean) : defaultTraits);

  // Fetch all core memorial resources from full-stack APIs
  const fetchResources = async () => {
    try {
      setIsLoading(true);

      // Load biography
      const mRes = await fetch('/api/memorial');
      const mData = await mRes.json();
      setMemorial(mData);

      // Load testimonials (admin headers included if saved in session storage)
      const adminPass = sessionStorage.getItem('admin_session_key') || '';
      const tRes = await fetch('/api/testimonials', {
        headers: adminPass ? { 'x-admin-password': adminPass } : {}
      });
      const tData = await tRes.json();
      setTestimonials(tData);

      // Load photos
      const pRes = await fetch('/api/photos');
      const pData = await pRes.json();
      setPhotos(pData);

      // Load video tribute configuration
      const vRes = await fetch('/api/tribute-video');
      const vData = await vRes.json();
      setTributeVideo(vData);

      // Load audio tracks
      const aRes = await fetch('/api/audio-tracks');
      const aData = await aRes.json();
      setAudioTracks(aData || []);

    } catch (err) {
      console.error('Failed to load memorial data from fullstack backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Set initial language form states when active tab shifts
  useEffect(() => {
    setTestimonialLang(lang);
  }, [lang, activeTab]);

  // Handle Photo uploading conversions helper
  const uploadImageBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: reader.result,
              fileName: file.name
            })
          });
          const data = await res.json();
          if (data.url) {
            resolve(data.url);
          } else {
            reject(data.error || 'Upload error');
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Submit Testimonial Form Handler
  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormUploading(true);

    if (!authorName || !testimonialMessage) {
      setFormError(lang === 'fr' ? 'Veuillez remplir les champs obligatoires.' : 'Tanpri ranpli tout jaden obligatwa yo.');
      setFormUploading(false);
      return;
    }

    try {
      let photoUrl = '';
      if (formPhoto) {
        photoUrl = await uploadImageBase64(formPhoto);
      }

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: isAnonymous ? (lang === 'fr' ? 'Anonyme' : 'Anonyme') : authorName,
          nickname,
          relationship,
          language: testimonialLang,
          message: testimonialMessage,
          photoUrl,
          isAnonymous
        })
      });

      if (res.ok) {
        setFormSuccess(true);
        // Reset Form
        setAuthorName('');
        setNickname('');
        setTestimonialMessage('');
        setFormPhoto(null);
        setFormPhotoPreview('');
        fetchResources();
      } else {
        const errorData = await res.json();
        setFormError(errorData.error || 'Erreur lors de la soumission.');
      }
    } catch (err) {
      setFormError(lang === 'fr' ? 'Erreur de connexion avec le serveur.' : 'Erè koneksyon rezo.');
    } finally {
      setFormUploading(false);
    }
  };

  // Submit Gallery Photo Handler
  const handleGalleryPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryPhoto || !galleryUploadedBy) {
      alert(lang === 'fr' ? 'Veuillez sélectionner une photo et saisir votre nom.' : 'Tanpri chwazi yon foto epi ekri non w.');
      return;
    }

    setGalleryUploading(true);
    try {
      const imageUrl = await uploadImageBase64(galleryPhoto);
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: galleryCategory,
          imageUrl,
          caption: galleryCaption,
          uploadedBy: galleryUploadedBy
        })
      });

      if (res.ok) {
        setGallerySuccess(true);
        setGalleryPhoto(null);
        setGalleryPhotoPreview('');
        setGalleryCaption('');
        setGalleryUploadedBy('');
        fetchResources();
        setTimeout(() => setGallerySuccess(false), 5000);
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving photo');
    } finally {
      setGalleryUploading(false);
    }
  };

  // Drag and drop events helpers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>, target: 'form' | 'gallery') => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (target === 'form') {
        setFormPhoto(file);
        setFormPhotoPreview(previewUrl);
      } else {
        setGalleryPhoto(file);
        setGalleryPhotoPreview(previewUrl);
      }
    }
  };

  const handleFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'gallery') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (target === 'form') {
        setFormPhoto(file);
        setFormPhotoPreview(previewUrl);
      } else {
        setGalleryPhoto(file);
        setGalleryPhotoPreview(previewUrl);
      }
    }
  };

  if (isLoading && !memorial) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-serif italic text-midnight/75 tracking-wider">{t.loading}</p>
      </div>
    );
  }

  // Categories helper mapping
  const activePhotos = selectedGalleryCategory === 'All'
    ? photos
    : photos.filter(p => p.category.toLowerCase() === selectedGalleryCategory.toLowerCase() || (selectedGalleryCategory === 'Moments' && p.category === 'Important Moments'));

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-midnight antialiased selection:bg-gold/25">

      {/* --- TOP REFINED STICKY HEADER --- */}
      <header className="sticky top-0 bg-ivory/80 backdrop-blur-md border-b border-gold/10 z-30 px-4 py-3 md:px-8 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo Title */}
          <div
            onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-full border border-gold/40 flex items-center justify-center text-gold bg-gold/5 group-hover:bg-gold group-hover:text-midnight transition duration-300">
              <Heart className="w-4 h-4 fill-current text-xs" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-serif font-semibold tracking-tight text-midnight leading-none">
                {t.title}
              </h1>
              <p className="text-[10px] text-sage tracking-widest uppercase font-light mt-0.5">
                {t.subtitle} — {t.dates}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide uppercase transition ${activeTab === 'home' ? 'text-gold bg-gold/5 font-semibold' : 'text-slate-600 hover:text-midnight hover:bg-slate-50'
                }`}
            >
              {t.navHome}
            </button>
            <button
              onClick={() => setActiveTab('memorial')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide uppercase transition ${activeTab === 'memorial' ? 'text-gold bg-gold/5 font-semibold' : 'text-slate-600 hover:text-midnight hover:bg-slate-50'
                }`}
            >
              {t.navMemorial}
            </button>
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide uppercase transition ${activeTab === 'testimonials' ? 'text-gold bg-gold/5 font-semibold' : 'text-slate-600 hover:text-midnight hover:bg-slate-50'
                }`}
            >
              {t.navTestimonials}
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide uppercase transition ${activeTab === 'gallery' ? 'text-gold bg-gold/5 font-semibold' : 'text-slate-600 hover:text-midnight hover:bg-slate-50'
                }`}
            >
              {t.navGallery}
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide uppercase transition flex items-center gap-1 ${activeTab === 'video' ? 'text-gold bg-gold/5 font-semibold' : 'text-slate-600 hover:text-midnight hover:bg-slate-50'
                }`}
            >
              <Film className="w-3.5 h-3.5" />
              {t.navVideo}
            </button>
            <button
              onClick={() => setActiveTab('write-memory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition border border-gold/25 hover:bg-gold/5 flex items-center gap-1 ${activeTab === 'write-memory' ? 'text-midnight bg-gold/10 border-gold/50' : 'text-gold bg-transparent'
                }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              {t.navWrite}
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`ml-2 p-1.5 rounded-lg text-slate-400 hover:text-gold hover:bg-slate-50 transition`}
              title={t.navAdmin}
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </nav>

          {/* Right actions: Language toggle and Mobile menu toggler */}
          <div className="flex items-center gap-3">

            {/* Lang switcher pill */}
            <div className="bg-slate-100 rounded-full p-0.5 flex items-center border border-slate-200">
              <button
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition ${lang === 'fr' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-midnight'
                  }`}
              >
                FR
              </button>
              <button
                onClick={() => setLang('ht')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition ${lang === 'ht' ? 'bg-white text-midnight shadow-sm' : 'text-slate-500 hover:text-midnight'
                  }`}
              >
                KREYÒL
              </button>
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-midnight"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* --- MOBILE NAVIGATION DRAWER --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden bg-ivory border-b border-gold/10 px-6 py-4 space-y-2 z-20 absolute top-[57px] left-0 right-0 shadow-lg"
          >
            {[
              { tab: 'home', label: t.navHome, icon: null },
              { tab: 'memorial', label: t.navMemorial, icon: null },
              { tab: 'testimonials', label: t.navTestimonials, icon: null },
              { tab: 'gallery', label: t.navGallery, icon: null },
              { tab: 'video', label: t.navVideo, icon: Film },
              { tab: 'write-memory', label: t.navWrite, icon: PenTool, highlight: true },
              { tab: 'admin', label: t.navAdmin, icon: ShieldAlert }
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => { setActiveTab(item.tab as any); setMobileMenuOpen(false); }}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium tracking-wide uppercase flex items-center gap-2 ${item.highlight
                    ? 'text-gold border border-gold/30 bg-gold/5'
                    : activeTab === item.tab
                      ? 'text-gold bg-gold/5 font-semibold'
                      : 'text-slate-600'
                  }`}
              >
                {item.icon && React.createElement(item.icon, { className: "w-4 h-4" })}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE VIEW PORT (ANIMATED TRANSITIONS) --- */}
      <main className="flex-1 py-8 px-4 md:px-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">

          {/* --- LANDING HERO TAB --- */}
          {activeTab === 'home' && (
            <motion.section
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="space-y-12"
            >
              {/* Cinematic hero card */}
              <div className="relative rounded-3xl overflow-hidden bg-midnight min-h-[420px] md:min-h-[480px] py-10 md:py-6 shadow-2xl border border-gold/10 flex items-center">
                {/* Background Ken Burns banner */}
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60 animate-ken-burns origin-center"
                  style={{ backgroundImage: `url(${memorial?.coverImage})` }}
                />

                {/* Visual Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/90 to-transparent" />

                <div className="relative z-10 px-8 md:px-16 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className={`${memorial?.profileImage ? 'md:col-span-7 lg:col-span-8' : 'md:col-span-12 max-w-2xl'} space-y-4`}>
                    <span className="text-gold tracking-[0.25em] text-xs md:text-sm font-serif block uppercase animate-pulse">
                      {lang === 'fr' ? "Album commémoratif officiel" : "Espas memwa ofisyèl"}
                    </span>
                    <h1 className="text-4xl md:text-6xl text-ivory font-serif tracking-wide leading-tight">
                      {memorial?.fullName}
                    </h1>
                    <p className="text-3xl md:text-5xl text-gold font-serif italic">
                      " {memorial?.nickname} "
                    </p>
                    <p className="text-sage text-sm md:text-base font-light tracking-wide pt-2">
                      {lang === 'fr' ? "26 Juin 1995 — À jamais dans notre mémoire collective" : "26 Jen 1994 — Pou tout tan nan kè nou"}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-6">
                      <button
                        onClick={() => setActiveTab('write-memory')}
                        className="px-6 py-3 rounded-xl bg-gold hover:bg-gold/90 text-midnight font-semibold text-sm transition transform hover:scale-[1.02] shadow-lg flex items-center gap-2"
                      >
                        <PenTool className="w-4 h-4" />
                        {t.shareMemory}
                      </button>
                      <button
                        onClick={() => setActiveTab('memorial')}
                        className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-ivory border border-white/20 font-medium text-sm transition flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        {t.visitMemorial}
                      </button>
                    </div>
                  </div>

                  {memorial?.profileImage && (
                    <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-end">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotate: -2, y: 15 }}
                        animate={{ opacity: 1, scale: 1, rotate: 2, y: 0 }}
                        whileHover={{ scale: 1.03, rotate: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => setViewingImageUrl(memorial.profileImage)}
                        className="relative p-3 bg-white hover:bg-ivory rounded-2xl shadow-2xl border-2 border-gold/40 max-w-[260px] md:max-w-[280px] cursor-pointer"
                      >
                        {/* Frame borders & design */}
                        <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-slate-900 border border-slate-200">
                          <img
                            src={memorial.profileImage}
                            alt={memorial.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        </div>
                        {/* Name plate / Caption under the photo */}
                        <div className="text-center mt-3 font-serif text-xs text-midnight font-semibold tracking-wider uppercase">
                          {memorial.nickname}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>

              {/* Biography Section Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gold rounded-full" />
                    <h2 className="text-2xl md:text-3xl font-serif text-midnight font-medium">
                      {lang === 'fr' ? "Une Vie Remarquable" : "Yon Bèl Lavi ki Pase"}
                    </h2>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-serif text-lg italic pr-4">
                    « {t.introText} »
                  </p>
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                    {memorial?.biography}
                  </p>
                  <div>
                    <button
                      onClick={() => setActiveTab('memorial')}
                      className="text-gold font-semibold text-sm hover:text-gold/90 transition flex items-center gap-1.5 group"
                    >
                      {lang === 'fr' ? "En savoir plus sur Manley" : "Aprann plis sou Manley"}
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                    </button>
                  </div>
                </div>

                {/* Decorative Timeline Sidebar Box */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-gold/15 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -z-10" />

                  <h3 className="text-lg font-serif text-midnight font-medium mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gold" />
                    {t.timelineTitle}
                  </h3>

                  <div className="relative border-l border-gold/25 pl-6 space-y-8">
                    <div className="relative">
                      <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-gold border-4 border-white shadow-sm" />
                      <p className="text-xs font-semibold text-gold font-mono uppercase tracking-widest">26 Juin 1994</p>
                      <p className="text-sm font-medium text-midnight mt-1">{t.birthText}</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-gold/70 border-4 border-white shadow-sm" />
                      <p className="text-xs font-semibold text-sage font-mono uppercase tracking-widest">26 Juin</p>
                      <p className="text-sm font-medium text-midnight mt-1">{t.june26Text}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Featured Memories Strip */}
              <div className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gold rounded-full" />
                    <h2 className="text-2xl font-serif text-midnight font-medium">
                      {t.featuredTitle}
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('testimonials')}
                    className="text-xs text-sage hover:text-midnight transition font-medium uppercase tracking-wider flex items-center gap-1"
                  >
                    {lang === 'fr' ? 'Tout lire' : 'Klike pou tout'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testimonials.filter(t => t.status === 'approved').slice(0, 3).map((item) => (
                    <TestimonialCard key={item.id} testimonial={item} lang={lang} onLike={handleTestimonialLike} />
                  ))}
                </div>
              </div>

            </motion.section>
          )}

          {/* --- DETAILED BIOGRAPHY TAB --- */}
          {activeTab === 'memorial' && (
            <motion.section
              key="memorial"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="text-center space-y-2">
                <span className="text-gold tracking-[0.25em] text-xs font-serif block uppercase">
                  {t.navMemorial}
                </span>
                <h2 className="text-3xl md:text-5xl font-serif text-midnight font-medium">
                  {t.whoWasManley}
                </h2>
                <div className="w-16 h-[1px] bg-gold/50 mx-auto mt-4" />
              </div>

              {/* Cover layout */}
              <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-gold/10 bg-slate-900 min-h-[300px] sm:min-h-[400px] md:min-h-[460px] flex items-center justify-center">
                <img
                  src={memorial?.coverImage}
                  alt={memorial?.fullName}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/40 to-midnight/20" />

                {memorial?.profileImage && (
                  <div className="relative z-10 p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotate: -2, y: 15 }}
                      animate={{ opacity: 1, scale: 1, rotate: 2, y: 0 }}
                      whileHover={{ scale: 1.03, rotate: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setViewingImageUrl(memorial.profileImage)}
                      className="relative p-2.5 bg-white hover:bg-ivory rounded-2xl shadow-2xl border-2 border-gold/40 w-44 h-56 sm:w-56 sm:h-72 md:w-64 md:h-80 cursor-pointer flex flex-col"
                    >
                      <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-slate-900 border border-slate-200 flex-1">
                        <img
                          src={memorial.profileImage}
                          alt={memorial.fullName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <div className="text-center mt-2.5 font-serif text-[10px] md:text-xs text-midnight font-semibold tracking-wider uppercase">
                        {memorial.nickname}
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Biography & Personality Sections (Stacked Vertically) */}
              <div className="space-y-10 pt-8 md:pt-12">
                {/* Biography */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-serif text-midnight font-semibold border-b border-gold/10 pb-3">
                    {lang === 'fr' ? "Parcours d'une âme d'exception" : "Biyografi yon bèl moun"}
                  </h3>
                  <div className="text-slate-700 leading-relaxed font-serif text-base whitespace-pre-line">
                    {memorial?.biography}
                  </div>
                </div>

                {/* Personality & Traits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Personality (Wider - col-span-2) */}
                  <div className="md:col-span-2 p-8 bg-white border border-gold/15 rounded-3xl space-y-5 shadow-sm">
                    <h3 className="text-xl font-serif text-midnight font-semibold border-b border-gold/10 pb-2">
                      {personalityTitle}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {personalityText}
                    </p>
                  </div>

                  {/* Distinctive Traits (col-span-1) */}
                  <div className="p-8 bg-white border border-gold/15 rounded-3xl space-y-5 shadow-sm">
                    <h3 className="text-xl font-serif text-midnight font-semibold border-b border-gold/10 pb-2">
                      {traitsTitle}
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-3">
                      {traitsList.map((trait, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                          <span className="font-serif italic">{trait}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* --- TESTIMONIALS BOARD TAB --- */}
          {activeTab === 'testimonials' && (
            <motion.section
              key="testimonials"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gold/10 pb-6">
                <div>
                  <span className="text-gold tracking-[0.25em] text-xs font-serif block uppercase">
                    {t.navTestimonials}
                  </span>
                  <h2 className="text-3xl font-serif text-midnight font-medium mt-1">
                    {lang === 'fr' ? "Le Mur d'Amour et de Souvenirs" : "Mi Lanmou ak Souvni yo"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'fr' ? "Prescription des messages de cœur de ses proches." : "Mesaj sansib ak bèl souvni tout fanmi ak zanmi kite."}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('write-memory')}
                  className="px-5 py-2.5 rounded-xl bg-midnight hover:bg-slate-800 text-ivory text-xs font-semibold tracking-wider uppercase transition flex items-center gap-1.5 self-start"
                >
                  <PenTool className="w-4 h-4 text-gold" />
                  {t.shareMemory}
                </button>
              </div>

              {/* Sorting Bar */}
              {testimonials.filter(t => t.status === 'approved').length > 0 && (
                <div className="flex items-center gap-3 py-1 bg-white/40 backdrop-blur-sm px-4 rounded-xl border border-gold/10 self-start text-xs">
                  <span className="text-slate-500 font-medium">{t.sortBy} :</span>
                  <div className="bg-slate-100 rounded-lg p-0.5 flex items-center border border-slate-200 shadow-sm">
                    <button
                      onClick={() => setTestimonialSort('recent')}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-md transition ${
                        testimonialSort === 'recent'
                          ? 'bg-white text-midnight shadow-sm'
                          : 'text-slate-500 hover:text-midnight'
                      }`}
                    >
                      {t.sortRecent}
                    </button>
                    <button
                      onClick={() => setTestimonialSort('likes')}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 ${
                        testimonialSort === 'likes'
                          ? 'bg-white text-midnight shadow-sm'
                          : 'text-slate-500 hover:text-midnight'
                      }`}
                    >
                      <Heart className="w-3 h-3 text-rose-500 fill-current" />
                      {t.sortMostLiked}
                    </button>
                  </div>
                </div>
              )}

              {/* Grid showing approved testimonials */}
              {testimonials.filter(t => t.status === 'approved').length === 0 ? (
                <div className="py-16 text-center bg-white border border-slate-100 rounded-3xl max-w-xl mx-auto p-8 space-y-4">
                  <p className="text-slate-500 italic font-serif">
                    {lang === 'fr' ? "Aucun souvenir n'a encore été publié." : "Pa gen okenn souvni ki pibliye ankò."}
                  </p>
                  <button
                    onClick={() => setActiveTab('write-memory')}
                    className="text-gold text-sm font-semibold underline"
                  >
                    {lang === 'fr' ? 'Soyez le premier à contribuer' : 'Se pou w premye moun ki pataje'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testimonials
                    .filter(t => t.status === 'approved')
                    .sort((a, b) => {
                      if (testimonialSort === 'likes') {
                        const likesA = a.likes || 0;
                        const likesB = b.likes || 0;
                        if (likesB !== likesA) {
                          return likesB - likesA;
                        }
                      }
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .map((item) => (
                      <TestimonialCard key={item.id} testimonial={item} lang={lang} onLike={handleTestimonialLike} />
                    ))}
                </div>
              )}
            </motion.section>
          )}

          {/* --- COLLABORATIVE MUSEUM GALLERY TAB --- */}
          {activeTab === 'gallery' && (
            <motion.section
              key="gallery"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              <div className="text-center space-y-2">
                <span className="text-gold tracking-[0.25em] text-xs font-serif block uppercase">
                  {t.navGallery}
                </span>
                <h2 className="text-3xl font-serif text-midnight font-medium">
                  {t.galleryTitle}
                </h2>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  {t.gallerySubtitle}
                </p>
                <div className="w-12 h-[1px] bg-gold/50 mx-auto mt-4" />
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  { id: 'All', label: t.catAll },
                  { id: 'Childhood', label: t.catChildhood },
                  { id: 'Family', label: t.catFamily },
                  { id: 'Friends', label: t.catFriends },
                  { id: 'Moments', label: t.catMoments },
                  { id: 'Memories', label: t.catMemories }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedGalleryCategory(cat.id)}
                    className={`px-4 py-1.5 rounded-full text-xs transition uppercase tracking-wider font-medium ${selectedGalleryCategory === cat.id
                        ? 'bg-midnight text-ivory shadow-sm'
                        : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Collaborative upload component overlay */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-4">

                {/* Visual Museum Exhibition Grid */}
                <div className="lg:col-span-8 space-y-6">
                  {activePhotos.length === 0 ? (
                    <div className="py-16 text-center bg-white border border-slate-100 rounded-3xl">
                      <p className="text-slate-500 italic font-serif">
                        {lang === 'fr' ? "Aucun cliché disponible dans cette catégorie." : "Pa gen okenn foto nan kategori sa a."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {activePhotos.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white p-4 rounded-2xl border border-gold/10 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                        >
                          <div
                            onClick={() => setViewingImageUrl(p.imageUrl)}
                            className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 relative group cursor-zoom-in"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.caption}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute top-2 left-2 text-[9px] bg-midnight/80 text-ivory font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest z-10">
                              {p.category}
                            </span>
                          </div>

                          <div className="pt-3.5 flex flex-col gap-1 text-left">
                            <p className="text-sm font-serif italic text-midnight/90 leading-snug">
                              « {p.caption || (lang === 'fr' ? 'Image souvenir' : 'Foto souvni')} »
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5">
                              {lang === 'fr' ? 'Immortalisé par' : 'Foto pa'}: {p.uploadedBy}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct collaborative image upload panel */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gold/15 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-serif text-midnight font-medium flex items-center gap-1.5 border-b border-gold/10 pb-2">
                      <ImageIcon className="w-4 h-4 text-gold" />
                      {t.uploadPhotoTitle}
                    </h3>
                  </div>

                  <form onSubmit={handleGalleryPhotoSubmit} className="space-y-4">
                    {/* Drag and Drop Box */}
                    <div>
                      <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                        {t.labelPhoto} <span className="text-red-500">*</span>
                      </label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleFileDrop(e, 'gallery')}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${galleryPhotoPreview
                            ? 'border-gold/40 bg-gold/5'
                            : 'border-gold/20 hover:border-gold/40 hover:bg-slate-50'
                          }`}
                        onClick={() => document.getElementById('gallery-file-pick')?.click()}
                      >
                        {galleryPhotoPreview ? (
                          <div className="space-y-2">
                            <img src={galleryPhotoPreview} alt="Preview" className="mx-auto h-24 object-cover rounded" />
                            <p className="text-[10px] text-emerald-600 font-semibold">✓ {lang === 'fr' ? 'Photo sélectionnée' : 'Foto chwazi'}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-6 h-6 text-gold mx-auto" />
                            <p className="text-xs text-slate-500">{t.dropPrompt}</p>
                          </div>
                        )}
                        <input
                          id="gallery-file-pick"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelectChange(e, 'gallery')}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-midnight/80 mb-1">
                        {t.labelCaption}
                      </label>
                      <input
                        type="text"
                        value={galleryCaption}
                        onChange={(e) => setGalleryCaption(e.target.value)}
                        placeholder="Ex: Manley jouant de la guitare..."
                        className="w-full p-2.5 rounded-lg border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-midnight/80 mb-1">
                          {t.labelCategory}
                        </label>
                        <select
                          value={galleryCategory}
                          onChange={(e) => setGalleryCategory(e.target.value as any)}
                          className="w-full p-2.5 rounded-lg border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs"
                        >
                          <option value="Childhood">{t.catChildhood}</option>
                          <option value="Family">{t.catFamily}</option>
                          <option value="Friends">{t.catFriends}</option>
                          <option value="Important Moments">{t.catMoments}</option>
                          <option value="Memories">{t.catMemories}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-midnight/80 mb-1">
                          {t.labelUploadedBy} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={galleryUploadedBy}
                          onChange={(e) => setGalleryUploadedBy(e.target.value)}
                          placeholder="Votre nom"
                          required
                          className="w-full p-2.5 rounded-lg border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs"
                        />
                      </div>
                    </div>

                    {gallerySuccess && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-medium text-center">
                        ✓ {lang === 'fr' ? 'Photo ajoutée avec succès !' : 'Foto a sove ak siksè !'}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={galleryUploading}
                      className="w-full py-2.5 bg-midnight hover:bg-slate-800 text-ivory text-xs tracking-wider uppercase font-semibold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {galleryUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{lang === 'fr' ? 'Chargement...' : 'Ap chaje...'}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-gold" />
                          <span>{t.uploadButton}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>
            </motion.section>
          )}

          {/* --- TRIBUTE VIDEO DOCUMENTARY TAB --- */}
          {activeTab === 'video' && (
            <motion.section
              key="video"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <span className="text-gold tracking-[0.25em] text-xs font-serif block uppercase">
                  {t.navVideo}
                </span>
                <h2 className="text-3xl font-serif text-midnight font-medium">
                  {lang === 'fr' ? "Le Film d'Hommage à Manley" : "Videyo Omaj pou Manley"}
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {lang === 'fr' ? "Une projection documentaire interactive mariant mélodies, clichés historiques et mots du cœur." : "Yon bèl fim dokimantè ki melanje bèl mizik dous ak bèl mesaj fanmi yo pataje."}
                </p>
                <div className="w-12 h-[1px] bg-gold/50 mx-auto mt-4" />
              </div>

              {/* Renders high-fidelity tribute movie player */}
              <TributePlayer
                config={tributeVideo}
                photos={photos}
                testimonials={testimonials.filter(t => t.status === 'approved')}
                lang={lang}
                audioTracks={audioTracks}
              />

              <div className="p-6 bg-slate-900 border border-gold/10 text-ivory rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center text-center md:text-left">
                <div className="space-y-1">
                  <p className="text-sm font-serif italic text-gold">« Manley continuera de vivre dans nos souvenirs. »</p>
                  <p className="text-[10px] text-sage tracking-wider uppercase font-light">
                    {lang === 'fr' ? "Un film généré par les contributions de la communauté" : "Yon bèl videyo ki fèt ak kontribisyon nou tout"}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('write-memory')}
                  className="px-4 py-2 bg-gold hover:bg-gold/95 text-midnight rounded-xl text-xs font-semibold transition"
                >
                  {t.shareMemory}
                </button>
              </div>
            </motion.section>
          )}

          {/* --- WRITE MEMORY CONTRIBUTION FORM TAB --- */}
          {activeTab === 'write-memory' && (
            <motion.section
              key="write-memory"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto"
            >
              <AnimatePresence mode="wait">
                {!formSuccess ? (
                  <motion.div
                    key="form-fields"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white p-8 rounded-3xl border border-gold/15 shadow-md space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <span className="text-gold tracking-[0.25em] text-xs font-serif block uppercase">
                        {t.navWrite}
                      </span>
                      <h2 className="text-2xl font-serif text-midnight font-medium">
                        {t.formTitle}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {t.formSubtitle}
                      </p>
                      <div className="w-12 h-[1px] bg-gold/50 mx-auto mt-4" />
                    </div>

                    <form onSubmit={handleTestimonialSubmit} className="space-y-5">

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                            {t.labelName} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="Ex: Jean-Luc Deslandes"
                            required
                            disabled={isAnonymous}
                            className="w-full p-2.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                            {t.labelNickname}
                          </label>
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Ex: Nanou"
                            disabled={isAnonymous}
                            className="w-full p-2.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                            {t.labelRelationship} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={relationship}
                            onChange={(e) => setRelationship(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs"
                          >
                            <option value="friend">{t.relFriend}</option>
                            <option value="family">{t.relFamily}</option>
                            <option value="colleague">{t.relColleague}</option>
                            <option value="other">{t.relOther}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                            {t.labelLanguage}
                          </label>
                          <select
                            value={testimonialLang}
                            onChange={(e) => setTestimonialLang(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs font-semibold"
                          >
                            <option value="fr">Français (FR)</option>
                            <option value="ht">Kreyòl Ayisyen (HT)</option>
                          </select>
                        </div>
                      </div>

                      {/* Anonymous checkbox */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="anonymous-box"
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => {
                            setIsAnonymous(e.target.checked);
                            if (e.target.checked) {
                              setAuthorName(lang === 'fr' ? 'Anonyme' : 'Anonyme');
                              setNickname('');
                            } else {
                              setAuthorName('');
                            }
                          }}
                          className="w-4 h-4 rounded border-gold/25 accent-gold text-midnight bg-white cursor-pointer"
                        />
                        <label htmlFor="anonymous-box" className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                          {t.labelAnonymous}
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                          {t.labelMessage} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          required
                          value={testimonialMessage}
                          onChange={(e) => setTestimonialMessage(e.target.value)}
                          placeholder={testimonialLang === 'fr' ? "Écrivez ici votre message de gratitude, une anecdote ou des pensées d'amour..." : "Ekri yon bèl souvni, anèkdot, oubyen remèsiman isit la..."}
                          className="w-full p-3.5 rounded-xl border border-gold/25 outline-none focus:border-gold bg-ivory/20 text-xs leading-relaxed font-serif"
                        />
                      </div>

                      {/* Optional Photo Drag & Drop Upload */}
                      <div>
                        <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                          {t.labelPhoto}
                        </label>
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleFileDrop(e, 'form')}
                          onClick={() => document.getElementById('form-file-pick')?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${formPhotoPreview
                              ? 'border-gold bg-gold/5'
                              : 'border-gold/20 hover:border-gold/40 hover:bg-slate-50'
                            }`}
                        >
                          {formPhotoPreview ? (
                            <div className="space-y-2">
                              <img src={formPhotoPreview} alt="Preview" className="mx-auto h-20 object-cover rounded" />
                              <p className="text-[10px] text-emerald-600 font-semibold">✓ {lang === 'fr' ? 'Cliché sélectionné' : 'Foto chwazi'}</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <Upload className="w-5 h-5 text-gold mx-auto" />
                              <p className="text-[11px] text-slate-500">{t.dropPrompt}</p>
                            </div>
                          )}
                          <input
                            id="form-file-pick"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelectChange(e, 'form')}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {formError && (
                        <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                          {formError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={formUploading}
                        className="w-full py-3 bg-midnight hover:bg-slate-800 text-ivory text-xs tracking-widest uppercase font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {formUploading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{lang === 'fr' ? 'Envoi...' : 'Ap pibliye...'}</span>
                          </>
                        ) : (
                          <>
                            <PenTool className="w-4 h-4 text-gold" />
                            <span>{t.submitButton}</span>
                          </>
                        )}
                      </button>

                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-success"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white p-8 rounded-3xl border border-gold/15 shadow-md text-center space-y-6 py-12"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-serif text-midnight font-semibold">
                        {t.submitSuccess}
                      </h2>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {t.submitSuccessSub}
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => setFormSuccess(false)}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-midnight text-xs font-semibold tracking-wide uppercase transition"
                      >
                        {t.writeAnother}
                      </button>

                      <button
                        onClick={() => setActiveTab('testimonials')}
                        className="px-5 py-2.5 rounded-xl bg-midnight hover:bg-slate-800 text-ivory text-xs font-semibold tracking-wide uppercase transition flex items-center gap-1.5 justify-center"
                      >
                        {lang === 'fr' ? "Voir les témoignages" : "Gade temwayaj yo"}
                        <ChevronRight className="w-4 h-4 text-gold" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {/* --- ADMIN MODERATION TAB --- */}
          {activeTab === 'admin' && (
            <motion.section
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              {/* Load Admin Dashboard Control Console */}
              <AdminPanel
                onRefresh={fetchResources}
                lang={lang}
                memorial={memorial}
                testimonials={testimonials}
                photos={photos}
                tributeVideo={tributeVideo}
                audioTracks={audioTracks}
              />
            </motion.section>
          )}

        </AnimatePresence>
      </main>

      {/* --- REFINED STYLISH FOOTER --- */}
      <footer className="bg-slate-900 text-ivory py-12 px-6 md:px-12 border-t border-gold/15 mt-16 text-center md:text-left transition-all">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

          <div className="space-y-2">
            <h3 className="text-lg font-serif font-medium tracking-wide text-gold">
              En mémoire d'Alcide Emmanuel
            </h3>
            <p className="text-xs text-sage/70 font-light leading-relaxed max-w-xs">
              {lang === 'fr' ? 'Un espace d\'héritage virtuel intemporel célébrant son parcours et la trace indélébile qu\'il laisse dans nos âmes.' : 'Yon espas vityèl pou n onore bèl lanmou ak konpasyon li te toujou gen pou nou tout.'}
            </p>
          </div>

          {/* Center visual divider with simple quote */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <Heart className="w-5 h-5 fill-gold text-gold animate-pulse" />
            <p className="text-xs font-serif italic text-sage/80">
              « {lang === 'fr' ? "Sourire à la vie, quoi qu'il arrive." : "Souri bay lavi, kèlkeswa sa k rive."} »
            </p>
          </div>

          <div className="flex flex-col md:items-end justify-center space-y-3">
            <div className="text-[10px] text-sage/50 font-mono tracking-widest uppercase">
              {lang === 'fr' ? "Date commémorative" : "Dat Komemoratif"}
            </div>
            <p className="text-sm font-semibold text-gold font-serif">
              {lang === 'fr' ? "26 Juin — Annuel" : "26 Jen — Chak ane"}
            </p>
            <p className="text-[9px] text-sage/40">
              © 2026 {lang === 'fr' ? "Livre de Vie Virtuel" : "Albòm Memwa Vityèl"}.
            </p>
          </div>

        </div>
      </footer>

      {/* Expanded Image Viewer Modal */}
      {viewingImageUrl && (
        <div
          onClick={() => setViewingImageUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-gold/20 flex flex-col p-2 cursor-default animate-scale-up"
          >
            <button
              onClick={() => setViewingImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition shadow-lg z-10"
              title={lang === 'fr' ? 'Fermer' : 'Fèmen'}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-1">
              <img
                src={viewingImageUrl}
                alt="Aperçu"
                className="max-h-[75vh] object-contain rounded-lg shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="py-3 px-4 flex items-center justify-between text-xs text-slate-500 font-mono bg-white border-t border-slate-100">
              <span>{lang === 'fr' ? "Aperçu de l'image" : "Gade foto a"}</span>
              <a
                href={viewingImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold flex items-center gap-1 hover:underline text-xs font-semibold"
              >
                {lang === 'fr' ? 'Ouvrir dans un nouvel onglet' : 'Lese nan yon lòt onglet'}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Persistent floating audio player */}
      <MusicPlayer tracks={audioTracks} lang={lang} />

    </div>
  );
}

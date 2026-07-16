/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Lock, Check, X, Shield, RefreshCw, Trash2, Save, FileText, Image, Film, Edit3, Plus, ExternalLink, Music
} from 'lucide-react';
import { Memorial, Testimonial, Photo, TributeVideoConfig, AudioTrack, DownloadRequest } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  lang: 'fr' | 'ht';
  memorial: Memorial | null;
  testimonials: Testimonial[];
  photos: Photo[];
  tributeVideo: TributeVideoConfig | null;
  audioTracks: AudioTrack[];
}

export default function AdminPanel({ onRefresh, lang, memorial, testimonials, photos, tributeVideo, audioTracks }: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'moderation' | 'photos' | 'tribute' | 'memorial' | 'playlist' | 'requests'>('moderation');

  // Memorial Edit State
  const [bioEdit, setBioEdit] = useState('');
  const [nicknameEdit, setNicknameEdit] = useState('');
  const [fullNameEdit, setFullNameEdit] = useState('');
  const [birthDateEdit, setBirthDateEdit] = useState('');
  const [importantDateEdit, setImportantDateEdit] = useState('');
  const [coverImageEdit, setCoverImageEdit] = useState('');
  const [profileImageEdit, setProfileImageEdit] = useState('');

  // New personality & traits edit states
  const [personalityTitleFr, setPersonalityTitleFr] = useState('');
  const [personalityTitleHt, setPersonalityTitleHt] = useState('');
  const [personalityTextFr, setPersonalityTextFr] = useState('');
  const [personalityTextHt, setPersonalityTextHt] = useState('');
  const [traitsTitleFr, setTraitsTitleFr] = useState('');
  const [traitsTitleHt, setTraitsTitleHt] = useState('');
  const [traitsFr, setTraitsFr] = useState('');
  const [traitsHt, setTraitsHt] = useState('');

  // Tribute Video Edit State
  const [videoTitle, setVideoTitle] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [disabledMessageFr, setDisabledMessageFr] = useState('');
  const [disabledMessageHt, setDisabledMessageHt] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedTestimonials, setSelectedTestimonials] = useState<string[]>([]);
  const [slideDuration, setSlideDuration] = useState(6);

  // Playlist Edit States
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackYoutubeUrl, setTrackYoutubeUrl] = useState('');
  const [trackAudioUrl, setTrackAudioUrl] = useState('');
  const [isAddingTrack, setIsAddingTrack] = useState(false);

  // Status flags
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Permission requests management
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const fetchRequests = async () => {
    const adminPass = sessionStorage.getItem('admin_session_key') || password;
    if (!adminPass) return;
    setIsLoadingRequests(true);
    try {
      const res = await fetch('/api/download-requests', {
        headers: {
          'x-admin-password': adminPass
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.warn("Failed to fetch download requests:", e);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    }
  }, [isAuthenticated]);

  const handleRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    setSaveStatus({ type: null, msg: '' });
    try {
      const adminPass = sessionStorage.getItem('admin_session_key') || password;
      const res = await fetch(`/api/download-requests/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        setSaveStatus({
          type: 'success',
          msg: action === 'approved' 
            ? (lang === 'fr' ? 'Demande approuvée avec succès !' : 'Demann lan apwouve ak siksè !')
            : (lang === 'fr' ? 'Demande rejetée.' : 'Demann lan refize.')
        });
        fetchRequests();
      } else {
        const err = await res.json();
        setSaveStatus({ type: 'error', msg: err.error || 'Failed to update request' });
      }
    } catch (e) {
      setSaveStatus({ type: 'error', msg: 'Network error' });
    }
  };

  useEffect(() => {
    // Check if password exists in session storage
    const savedPassword = sessionStorage.getItem('admin_session_key');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (memorial) {
      setBioEdit(memorial.biography);
      setNicknameEdit(memorial.nickname);
      setFullNameEdit(memorial.fullName);
      setBirthDateEdit(memorial.birthDate);
      setImportantDateEdit(memorial.importantDate);
      setCoverImageEdit(memorial.coverImage);
      setProfileImageEdit(memorial.profileImage || '');
      setPersonalityTitleFr(memorial.personalityTitleFr || 'Sa Personnalité & Ses Valeurs');
      setPersonalityTitleHt(memorial.personalityTitleHt || 'Pèsonalite l ak Valè li yo');
      setPersonalityTextFr(memorial.personalityTextFr || 'Manley se distinguait par un alliage rare d\'esprit scientifique rigoureux et de sensibilité artistique pure. D\'une générosité naturelle, il partageait sans compter ses connaissances d\'ingénieur et de musicien. Sa résilience, son écoute attentive et son humilité exemplaire laissaient une empreinte immédiate sur tous ceux qui collaboraient ou vivaient avec lui.');
      setPersonalityTextHt(memorial.personalityTextHt || 'Manley te briye paske li te genyen yon entèlijans syantifik trè solid melanje ak yon bèl sansibilite pou mizik. Li te genyen yon nati jenerod jenerozite, li te pataje konesans li kòm enjenyè ak mizisyen san limit. Pasyans li, kapasite l pou l koute moun, ak imilite l te toujou touche kè tout moun ki te kolabore avè l.');
      setTraitsTitleFr(memorial.traitsTitleFr || 'Traits Distinctifs');
      setTraitsTitleHt(memorial.traitsTitleHt || 'Karakteristik yo');
      setTraitsFr(memorial.traitsFr || "Humilité profonde\nIngénieur de solutions élégantes\nMélomane & guitariste passionné\nFierté culturelle haïtienne");
      setTraitsHt(memorial.traitsHt || "Gwo imilite\nKreyatè solisyon elegant\nMizisyen ak jitaris pasyone\nFiyète kiltirèl ayisyen");
    }
  }, [memorial]);

  useEffect(() => {
    if (tributeVideo) {
      setVideoTitle(tributeVideo.title);
      setMusicUrl(tributeVideo.musicUrl);
      setDownloadUrl(tributeVideo.downloadUrl || '');
      setVideoEnabled(tributeVideo.videoEnabled !== false);
      setDisabledMessageFr(tributeVideo.disabledMessageFr || '');
      setDisabledMessageHt(tributeVideo.disabledMessageHt || '');
      setSelectedPhotos(tributeVideo.selectedPhotos || []);
      setSelectedTestimonials(tributeVideo.selectedTestimonials || []);
      setSlideDuration(tributeVideo.slideDuration || 6);
    }
  }, [tributeVideo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_session_key', password);
        onRefresh();
      } else {
        setAuthError(data.error || 'Mot de passe invalide / Modpas pa valid');
      }
    } catch (err) {
      setAuthError('Erreur de serveur / Erè sèvè');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    sessionStorage.removeItem('admin_session_key');
  };

  const handleModerateTestimonial = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/testimonials/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert('Erreur lors de la modération');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm(lang === 'fr' ? 'Supprimer cette photo ?' : 'Efase foto sa a ?')) return;

    try {
      const res = await fetch(`/api/photos/${id}/delete`, {
        method: 'POST',
        headers: {
          'x-admin-password': password
        }
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMemorial = async () => {
    setSaveStatus({ type: null, msg: '' });
    try {
      const res = await fetch('/api/memorial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({
          fullName: fullNameEdit,
          nickname: nicknameEdit,
          biography: bioEdit,
          birthDate: birthDateEdit,
          importantDate: importantDateEdit,
          coverImage: coverImageEdit,
          profileImage: profileImageEdit,
          personalityTitleFr,
          personalityTitleHt,
          personalityTextFr,
          personalityTextHt,
          traitsTitleFr,
          traitsTitleHt,
          traitsFr,
          traitsHt
        })
      });

      if (res.ok) {
        setSaveStatus({ type: 'success', msg: lang === 'fr' ? 'Biographie mise à jour !' : 'Biyografi a mete ajou !' });
        onRefresh();
      } else {
        setSaveStatus({ type: 'error', msg: 'Échec de la sauvegarde / Sove echwe' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Erreur réseau / Erè rezo' });
    }
  };

  const handleSaveTributeVideo = async () => {
    setSaveStatus({ type: null, msg: '' });
    try {
      const res = await fetch('/api/tribute-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({
          title: videoTitle,
          musicUrl,
          downloadUrl,
          videoEnabled,
          disabledMessageFr,
          disabledMessageHt,
          selectedPhotos,
          selectedTestimonials,
          slideDuration
        })
      });

      if (res.ok) {
        setSaveStatus({ type: 'success', msg: lang === 'fr' ? 'Vidéo hommage mise à jour !' : 'Videyo omaj la sove !' });
        onRefresh();
      } else {
        setSaveStatus({ type: 'error', msg: 'Échec de la sauvegarde' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Erreur réseau' });
    }
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotos(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectTestimonial = (id: string) => {
    setSelectedTestimonials(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle || !trackArtist || !trackYoutubeUrl) {
      setSaveStatus({ type: 'error', msg: lang === 'fr' ? 'Veuillez remplir tous les champs.' : 'Tanpri ranpli tout jaden yo.' });
      return;
    }

    setIsAddingTrack(true);
    setSaveStatus({ type: null, msg: '' });
    try {
      const adminPass = sessionStorage.getItem('admin_session_key') || password;
      const res = await fetch('/api/audio-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({
          title: trackTitle,
          artist: trackArtist,
          youtubeUrl: trackYoutubeUrl,
          audioUrl: trackAudioUrl || null
        })
      });

      if (res.ok) {
        setTrackTitle('');
        setTrackArtist('');
        setTrackYoutubeUrl('');
        setTrackAudioUrl('');
        setSaveStatus({ type: 'success', msg: lang === 'fr' ? 'Piste audio ajoutée avec succès !' : 'Mizik la ajoute ak siksè !' });
        onRefresh();
      } else {
        const err = await res.json();
        setSaveStatus({ type: 'error', msg: err.error || 'Failed to add track' });
      }
    } catch (e) {
      setSaveStatus({ type: 'error', msg: 'Network error' });
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm(lang === 'fr' ? 'Voulez-vous vraiment supprimer cette piste ?' : 'Èske ou vle efase mizik sa a ?')) return;

    setSaveStatus({ type: null, msg: '' });
    try {
      const adminPass = sessionStorage.getItem('admin_session_key') || password;
      const res = await fetch(`/api/audio-tracks/${id}/delete`, {
        method: 'POST',
        headers: {
          'x-admin-password': adminPass
        }
      });

      if (res.ok) {
        setSaveStatus({ type: 'success', msg: lang === 'fr' ? 'Piste audio supprimée avec succès !' : 'Mizik la efase ak siksè !' });
        onRefresh();
      } else {
        const err = await res.json();
        setSaveStatus({ type: 'error', msg: err.error || 'Failed to delete track' });
      }
    } catch (e) {
      setSaveStatus({ type: 'error', msg: 'Network error' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl shadow-xl border border-gold/10">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-gold/10 rounded-full text-gold mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif text-midnight font-medium text-center">
            {lang === 'fr' ? "Administration privée" : "Administrasyon prive"}
          </h2>
          <p className="text-xs text-sage mt-1 text-center">
            {lang === 'fr' ? "Entrez le mot de passe pour gérer le mémorial" : "Antre kod sekrè a pou modere paj la"}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-midnight/80 mb-1.5">
              {lang === 'fr' ? "Mot de passe" : "Modpas"}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none bg-ivory/30 text-sm font-mono"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {authError && (
            <p className="text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
              {authError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-midnight text-ivory font-medium hover:bg-slate-800 transition text-sm flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-gold" />
            {lang === 'fr' ? "Déverrouiller" : "Debloke"}
          </button>
        </form>
      </div>
    );
  }

  // Loaded Dashboard Stats
  const pendingCount = testimonials.filter(t => t.status === 'pending').length;
  const approvedCount = testimonials.filter(t => t.status === 'approved').length;

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-gold/10 overflow-hidden">

      {/* Dashboard Top Header */}
      <div className="bg-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-gold/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 text-gold rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif text-ivory font-medium leading-tight">
              {lang === 'fr' ? "Espace Modérateur" : "Espas Moderatè"}
            </h2>
            <p className="text-[10px] text-sage tracking-wider uppercase font-light">
              Manley Memorial Admin Panel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 text-ivory/80 hover:text-gold hover:bg-white/5 rounded-lg transition"
            title={lang === 'fr' ? "Rafraîchir" : "Rafrechi"}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:border-red-400 hover:bg-red-400/5 rounded-lg transition"
          >
            {lang === 'fr' ? "Se déconnecter" : "Dekonekte"}
          </button>
        </div>
      </div>

      {/* Dashboard Stats Strip */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">{lang === 'fr' ? 'Témoignages en attente' : 'Temwayaj an atant'}</p>
          <p className={`text-2xl font-serif font-bold mt-1 ${pendingCount > 0 ? 'text-gold' : 'text-slate-400'}`}>
            {pendingCount}
          </p>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">{lang === 'fr' ? 'Témoignages approuvés' : 'Temwayaj apwouve'}</p>
          <p className="text-2xl font-serif font-bold text-midnight mt-1">{approvedCount}</p>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">{lang === 'fr' ? 'Total Photos' : 'Total Foto'}</p>
          <p className="text-2xl font-serif font-bold text-midnight mt-1">{photos.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">{lang === 'fr' ? 'Statut Hommage' : 'Estati Omaj'}</p>
          <p className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-full inline-block mt-2 font-mono uppercase">
            {tributeVideo?.status || 'Active'}
          </p>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('moderation'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'moderation'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <FileText className="w-4 h-4" />
          {lang === 'fr' ? "Modération" : "Moderasyon"}
          {pendingCount > 0 && (
            <span className="bg-gold text-midnight text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('photos'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'photos'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <Image className="w-4 h-4" />
          {lang === 'fr' ? "Photos" : "Foto yo"}
        </button>
        <button
          onClick={() => { setActiveTab('tribute'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'tribute'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <Film className="w-4 h-4" />
          {lang === 'fr' ? "Vidéo Hommage" : "Videyo Omaj"}
        </button>
        <button
          onClick={() => { setActiveTab('memorial'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'memorial'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <Edit3 className="w-4 h-4" />
          {lang === 'fr' ? "Informations" : "Biyografi"}
        </button>
        <button
          onClick={() => { setActiveTab('playlist'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'playlist'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <Music className="w-4 h-4" />
          {lang === 'fr' ? "Musique" : "Mizik"}
        </button>
        <button
          onClick={() => { setActiveTab('requests'); setSaveStatus({ type: null, msg: '' }); }}
          className={`flex-1 py-3 px-4 text-xs font-medium tracking-wide uppercase border-b-2 text-center whitespace-nowrap transition flex items-center justify-center gap-1.5 ${activeTab === 'requests'
              ? 'border-gold text-gold bg-gold/5'
              : 'border-transparent text-slate-500 hover:text-midnight hover:bg-slate-50'
            }`}
        >
          <Shield className="w-4 h-4 text-gold" />
          {lang === 'fr' ? "Autorisations" : "Otorizasyon yo"}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Dashboard Body */}
      <div className="p-6">

        {/* --- SAVE STATUS TOAST --- */}
        {saveStatus.type && (
          <div className={`mb-6 p-3.5 rounded-xl text-sm border flex items-center gap-2 ${saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
            }`}>
            {saveStatus.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {saveStatus.msg}
          </div>
        )}

        {/* --- MODERATION TAB --- */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-serif text-midnight font-medium">
              {lang === 'fr' ? "Modération des témoignages" : "Modere temwayaj yo"}
            </h3>

            {testimonials.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-50 rounded-xl">
                {lang === 'fr' ? "Aucun témoignage partagé pour le moment." : "Pa gen temwayaj ki pataje ankò."}
              </p>
            ) : (
              <div className="space-y-4">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start justify-between ${t.status === 'pending'
                        ? 'bg-amber-50/50 border-amber-200/60'
                        : t.status === 'approved'
                          ? 'bg-white border-slate-100'
                          : 'bg-red-50/20 border-red-100'
                      }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-midnight">
                          {t.isAnonymous ? (lang === 'fr' ? 'Anonyme' : 'Anonyme') : t.authorName}
                        </span>
                        {t.nickname && (
                          <span className="text-xs text-slate-500">({t.nickname})</span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-serif font-light capitalize">
                          {t.relationship}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${t.language === 'fr' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                          {t.language === 'fr' ? 'FR' : 'HT'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold font-mono ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : t.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                          {t.status}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed font-serif italic">
                        « {t.message} »
                      </p>

                      {t.photoUrl && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setViewingImageUrl(t.photoUrl || null)}
                            className="text-xs text-gold flex items-center gap-1.5 hover:underline cursor-pointer font-medium"
                          >
                            <Image className="w-3.5 h-3.5" />
                            {lang === 'fr' ? 'Voir l\'image attachée' : 'Gade foto ki tache a'}
                          </button>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0 self-end md:self-start">
                      {t.status !== 'approved' && (
                        <button
                          onClick={() => handleModerateTestimonial(t.id, 'approved')}
                          className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          title={lang === 'fr' ? 'Approuver' : 'Apwouve'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {t.status !== 'rejected' && (
                        <button
                          onClick={() => handleModerateTestimonial(t.id, 'rejected')}
                          className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition"
                          title={lang === 'fr' ? 'Rejeter / Masquer' : 'Rejete / Kache'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- PHOTOS TAB --- */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <h3 className="text-lg font-serif text-midnight font-medium">
              {lang === 'fr' ? "Gestion de l'album de photos" : "Jere bèl albòm foto yo"}
            </h3>

            {photos.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-50 rounded-xl">
                {lang === 'fr' ? "Aucune photo dans la galerie." : "Pa gen okenn foto nan galeri a."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((p) => (
                  <div key={p.id} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex flex-col">
                    <div
                      onClick={() => setViewingImageUrl(p.imageUrl)}
                      className="aspect-video w-full overflow-hidden bg-slate-200 relative cursor-zoom-in group"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.caption}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-2 left-2 text-[10px] bg-slate-900/80 text-ivory px-2 py-1 rounded-full uppercase tracking-wider font-light z-10">
                        {p.category}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-700 font-serif italic line-clamp-2">
                          {p.caption || (lang === 'fr' ? 'Sans description' : 'San esplikasyon')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase">
                          {lang === 'fr' ? 'Par' : 'Pa'}: {p.uploadedBy}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="w-full py-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {lang === 'fr' ? 'Supprimer' : 'Efase'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TRIBUTE TAB --- */}
        {activeTab === 'tribute' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-serif text-midnight font-medium">
                  {lang === 'fr' ? "Générateur du Film Hommage" : "Konfigire Videyo Omaj la"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'fr' ? "Sélectionnez le contenu et configurez la musique de fond du diaporama." : "Chwazi bèl mizik background, foto ak temwayaj pou videyo omaj la."}
                </p>
              </div>
              <button
                onClick={handleSaveTributeVideo}
                className="px-4 py-2 bg-midnight hover:bg-slate-800 text-ivory text-xs font-semibold rounded-xl transition flex items-center gap-1.5 self-start"
              >
                <Save className="w-4 h-4 text-gold" />
                {lang === 'fr' ? 'Mettre à jour le film' : 'Mete videyo a ajou'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Settings block */}
              <div className="lg:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 border-b pb-1.5 mb-2 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-gold" />
                  {lang === 'fr' ? 'Configuration Générale' : 'Konfigirasyon jeneral'}
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {lang === 'fr' ? "Titre du Tribute" : "Tit Omaj la"}
                    </label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {lang === 'fr' ? "Musique de fond (URL MP3)" : "Mizik background (MP3 URL)"}
                    </label>
                    <input
                      type="text"
                      value={musicUrl}
                      onChange={(e) => setMusicUrl(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white font-mono"
                    />

                    {/* Helper dropdown to choose MP3 link directly from playlist */}
                    {audioTracks && audioTracks.filter(t => t.audioUrl).length > 0 && (
                      <div className="mt-1.5">
                        <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          {lang === 'fr' 
                            ? "Ou choisir de la playlist" 
                            : "Oswa chwazi nan playlist la"}
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setMusicUrl(e.target.value);
                            }
                          }}
                          value={audioTracks.some(t => t.audioUrl === musicUrl) ? musicUrl : ""}
                          className="w-full p-1.5 text-[11px] rounded-lg border border-gold/25 outline-none focus:border-gold bg-white font-semibold text-slate-800"
                        >
                          <option value="">
                            {lang === 'fr' ? "-- Choisir une piste MP3 --" : "-- Chwazi yon mizik MP3 --"}
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

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {lang === 'fr' ? "Fichier vidéo MP4 téléchargeable (Lien direct)" : "Fichye videyo MP4 pou telechaje (Direk lyen)"}
                    </label>
                    <input
                      type="text"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="Ex: /uploads/v1_hommage.mp4 ou un lien cloud"
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {lang === 'fr' ? "Durée par diapositive (sec)" : "Dire chak foto (segond)"}
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={slideDuration}
                      onChange={(e) => setSlideDuration(parseInt(e.target.value))}
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white"
                    />
                  </div>

                  {/* Activation Toggle & Disabled Messages */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={videoEnabled}
                        onChange={(e) => setVideoEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-gold border-slate-300 focus:ring-gold cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-midnight">
                        {lang === 'fr' 
                          ? "Activer le visionnage/téléchargement du film" 
                          : "Aktive gade/telechaje fim nan"}
                      </span>
                    </label>

                    {!videoEnabled && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {lang === 'fr' ? "Message d'indisponibilité (Français)" : "Mesaj lè li dezaktive (Franse)"}
                          </label>
                          <textarea
                            rows={2}
                            value={disabledMessageFr}
                            onChange={(e) => setDisabledMessageFr(e.target.value)}
                            placeholder="Ex: Le film hommage est en cours de préparation..."
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {lang === 'fr' ? "Message d'indisponibilité (Créole)" : "Mesaj lè li dezaktive (Kreyòl)"}
                          </label>
                          <textarea
                            rows={2}
                            value={disabledMessageHt}
                            onChange={(e) => setDisabledMessageHt(e.target.value)}
                            placeholder="Ex: Fim omaj la ap prepare..."
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-gold bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos pick block */}
              <div className="lg:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 border-b pb-1.5 mb-2 flex items-center gap-1">
                  <Image className="w-3.5 h-3.5 text-gold" />
                  {lang === 'fr' ? 'Photos incluses' : 'Chwazi foto yo'} ({selectedPhotos.length})
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {photos.map(p => {
                    const isChecked = selectedPhotos.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectPhoto(p.id)}
                        className={`p-2 rounded-lg border flex items-center gap-3 cursor-pointer select-none transition ${isChecked ? 'bg-gold/10 border-gold/40' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-slate-100">
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-serif italic text-midnight truncate">{p.caption || 'Sans légende'}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">{p.category}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? 'bg-gold border-gold text-midnight' : 'border-slate-300'
                          }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Testimonials pick block */}
              <div className="lg:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 border-b pb-1.5 mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gold" />
                  {lang === 'fr' ? 'Citations incluses' : 'Chwazi temwayaj yo'} ({selectedTestimonials.length})
                </h4>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {testimonials.filter(t => t.status === 'approved').map(t => {
                    const isChecked = selectedTestimonials.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectTestimonial(t.id)}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer select-none transition ${isChecked ? 'bg-gold/10 border-gold/40' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[10px] text-slate-700 leading-tight italic line-clamp-2">« {t.message} »</p>
                          <p className="text-[9px] font-semibold text-midnight mt-1">— {t.authorName}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChecked ? 'bg-gold border-gold text-midnight' : 'border-slate-300'
                          }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- MEMORIAL TAB --- */}
        {activeTab === 'memorial' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif text-midnight font-medium">
                {lang === 'fr' ? "Informations biographiques" : "Mete enfòmasyon yo ajou"}
              </h3>
              <button
                onClick={handleSaveMemorial}
                className="px-4 py-2 bg-midnight hover:bg-slate-800 text-ivory text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4 text-gold" />
                {lang === 'fr' ? 'Sauvegarder les modifications' : 'Sove biyografi'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Nom Complet" : "Non konplè"}
                </label>
                <input
                  type="text"
                  value={fullNameEdit}
                  onChange={(e) => setFullNameEdit(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Surnom (Nickname)" : "Surnon (Ti non)"}
                </label>
                <input
                  type="text"
                  value={nicknameEdit}
                  onChange={(e) => setNicknameEdit(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Date de naissance (AAAA-MM-JJ)" : "Dat nesans (AAAA-MM-JJ)"}
                </label>
                <input
                  type="text"
                  value={birthDateEdit}
                  onChange={(e) => setBirthDateEdit(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Date d'hommage importante" : "Dat espesyal komemoratif"}
                </label>
                <input
                  type="text"
                  value={importantDateEdit}
                  onChange={(e) => setImportantDateEdit(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Image de couverture (URL)" : "Imaj kouvèti (URL)"}
                </label>
                <input
                  type="text"
                  value={coverImageEdit}
                  onChange={(e) => setCoverImageEdit(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs font-mono"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Photo de portrait de Manley (URL)" : "Foto pòtrè Manley (URL)"}
                </label>
                <input
                  type="text"
                  value={profileImageEdit}
                  onChange={(e) => setProfileImageEdit(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'fr' ? "Sera affichée dans un cadre élégant avec une animation d'entrée" : "Ap parèt nan yon bèl kad ak animasyon sou paj prensipal la"}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {lang === 'fr' ? "Qui était Manley ? (Biographie)" : "Kiyès Manley te ye ? (Biyografi detaye)"}
                </label>
                <textarea
                  rows={8}
                  value={bioEdit}
                  onChange={(e) => setBioEdit(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm leading-relaxed font-serif"
                />
              </div>

              {/* Personnalité & Valeurs - FR */}
              <div className="md:col-span-2 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-midnight mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-gold rounded-full" />
                  {lang === 'fr' ? "Personnalité & Valeurs (Français)" : "Pèsonalite l ak Valè li yo (Franse)"}
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Titre de la section" : "Tit seksyon an"}
                    </label>
                    <input
                      type="text"
                      value={personalityTitleFr}
                      onChange={(e) => setPersonalityTitleFr(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Texte de la personnalité" : "Tèks pèsonalite a"}
                    </label>
                    <textarea
                      rows={4}
                      value={personalityTextFr}
                      onChange={(e) => setPersonalityTextFr(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Personnalité & Valeurs - HT */}
              <div className="md:col-span-2 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-midnight mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-gold rounded-full" />
                  {lang === 'fr' ? "Personnalité & Valeurs (Kreyòl)" : "Pèsonalite l ak Valè li yo (Kreyòl)"}
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Titre de la section" : "Tit Seksyon an"}
                    </label>
                    <input
                      type="text"
                      value={personalityTitleHt}
                      onChange={(e) => setPersonalityTitleHt(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Texte de la personnalité" : "Tèks pèsonalite a"}
                    </label>
                    <textarea
                      rows={4}
                      value={personalityTextHt}
                      onChange={(e) => setPersonalityTextHt(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Traits Distinctifs - FR */}
              <div className="md:col-span-1 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-midnight mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-gold rounded-full" />
                  {lang === 'fr' ? "Traits Distinctifs (Français)" : "Karakteristik yo (Franse)"}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Titre de la section" : "Tit Seksyon an"}
                    </label>
                    <input
                      type="text"
                      value={traitsTitleFr}
                      onChange={(e) => setTraitsTitleFr(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Liste des traits (un par ligne)" : "Lis karakteristik yo (yonn pou chak liy)"}
                    </label>
                    <textarea
                      rows={5}
                      value={traitsFr}
                      onChange={(e) => setTraitsFr(e.target.value)}
                      placeholder="Humilité profonde&#10;Ingénieur..."
                      className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Traits Distinctifs - HT */}
              <div className="md:col-span-1 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-midnight mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-gold rounded-full" />
                  {lang === 'fr' ? "Traits Distinctifs (Kreyòl)" : "Karakteristik yo (Kreyòl)"}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Titre de la section" : "Tit Seksyon an"}
                    </label>
                    <input
                      type="text"
                      value={traitsTitleHt}
                      onChange={(e) => setTraitsTitleHt(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {lang === 'fr' ? "Liste des traits (un par ligne)" : "Lis karakteristik yo (yonn pou chak liy)"}
                    </label>
                    <textarea
                      rows={5}
                      value={traitsHt}
                      onChange={(e) => setTraitsHt(e.target.value)}
                      placeholder="Gwo imilite&#10;Kreyatè..."
                      className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-sm leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PLAYLIST TAB --- */}
        {activeTab === 'playlist' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-serif text-midnight font-medium">
                  {lang === 'fr' ? "Gestion de la Playlist Hommage" : "Jere Playlist Omaj la"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'fr' ? "Ajoutez et supprimez des morceaux de musique à partir de liens YouTube." : "Ajoute epi efase mizik nan playlist la ak lyen YouTube."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form to add a track */}
              <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-serif font-semibold text-midnight border-b border-gold/15 pb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-gold" />
                  {lang === 'fr' ? "Ajouter un morceau" : "Ajoute yon mizik"}
                </h4>

                <form onSubmit={handleAddTrack} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                      {lang === 'fr' ? "Titre du morceau" : "Tit mizik la"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      placeholder="Ex: Laho"
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                      {lang === 'fr' ? "Artiste" : "Atis"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={trackArtist}
                      onChange={(e) => setTrackArtist(e.target.value)}
                      placeholder="Ex: Shallipopi"
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                      {lang === 'fr' ? "Lien YouTube" : "Lyen YouTube"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={trackYoutubeUrl}
                      onChange={(e) => setTrackYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-midnight/80 mb-1.5">
                      {lang === 'fr' ? "Lien de Fichier Audio Direct (Optionnel)" : "Lyen Fichye Audio Dirèk (Si ou vle)"}
                    </label>
                    <input
                      type="url"
                      value={trackAudioUrl}
                      onChange={(e) => setTrackAudioUrl(e.target.value)}
                      placeholder="https://example.com/song.mp3"
                      className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-gold bg-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {lang === 'fr' 
                        ? "Permet aux utilisateurs d'inclure cette musique dans la compilation vidéo téléchargée (Lien MP3 direct)." 
                        : "Pèmèt itilizatè yo telechaje videyo a ak bèl mizik sa a kòm fon sonore (Lyen MP3 dirèk)."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingTrack}
                    className="w-full py-2.5 bg-midnight hover:bg-slate-800 text-ivory text-xs tracking-wider uppercase font-semibold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isAddingTrack ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'fr' ? 'Ajout...' : 'Ap ajoute...'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-gold" />
                        <span>{lang === 'fr' ? 'Ajouter à la playlist' : 'Ajoute nan playlist la'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* List of tracks */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-sm font-serif font-semibold text-midnight border-b border-gold/15 pb-2 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-gold" />
                  {lang === 'fr' ? "Morceaux actuels" : "Mizik ki la yo"} ({audioTracks ? audioTracks.length : 0})
                </h4>

                {!audioTracks || audioTracks.length === 0 ? (
                  <p className="text-slate-500 text-xs italic py-8 text-center bg-slate-50 rounded-xl">
                    {lang === 'fr' ? "Aucun morceau dans la playlist." : "Pa gen okenn mizik nan playlist la."}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto pr-2">
                    {audioTracks.map((track) => (
                      <div key={track.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <Music className="w-5 h-5 text-gold/60" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-midnight truncate">{track.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{track.artist}</p>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              <a
                                href={track.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-gold hover:underline flex items-center gap-0.5"
                              >
                                {lang === 'fr' ? 'Lien YouTube' : 'Lyen YouTube'}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              {track.audioUrl && (
                                <a
                                  href={track.audioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-emerald-600 hover:underline flex items-center gap-0.5"
                                >
                                  {lang === 'fr' ? 'Audio MP3' : 'Audio MP3'}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title={lang === 'fr' ? "Supprimer" : "Efase"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- REQUESTS TAB --- */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-midnight font-medium">
                {lang === 'fr' ? "Demandes d'Autorisation" : "Demann Otorizasyon yo"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'fr' 
                  ? "Gérez les permissions d'impression du PDF et de téléchargement de l'album photo." 
                  : "Jere dwa pou enprime liv PDF ak telechaje bèl foto yo."}
              </p>
            </div>

            {isLoadingRequests ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-8 text-center bg-slate-50 rounded-xl">
                {lang === 'fr' ? "Aucune demande reçue pour le moment." : "Pa gen okenn demann anrejistre ankò."}
              </p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                      <tr>
                        <th className="p-4">{lang === 'fr' ? "Nom du Visiteur" : "Non Vizitè a"}</th>
                        <th className="p-4">{lang === 'fr' ? "Type de Demande" : "Kategori Demann"}</th>
                        <th className="p-4">{lang === 'fr' ? "Date" : "Dat"}</th>
                        <th className="p-4">{lang === 'fr' ? "Statut" : "Estati"}</th>
                        <th className="p-4 text-right">{lang === 'fr' ? "Actions" : "Aksyon"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-semibold text-midnight">{r.name}</td>
                          <td className="p-4 capitalize">
                            <span className="flex items-center gap-1.5">
                              {r.type === 'photos' ? (
                                <>
                                  <Image className="w-3.5 h-3.5 text-gold" />
                                  {lang === 'fr' ? "Album Photo" : "Liv Foto"}
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                  {lang === 'fr' ? "Livre d'Or PDF" : "Liv PDF"}
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(r.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'approved' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : r.status === 'rejected' 
                                  ? 'bg-rose-50 text-rose-700' 
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                              {r.status === 'approved' 
                                ? (lang === 'fr' ? 'Approuvé' : 'Apwouve')
                                : r.status === 'rejected'
                                  ? (lang === 'fr' ? 'Refusé' : 'Refize')
                                  : (lang === 'fr' ? 'En attente' : 'An atant')}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            {r.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleRequestAction(r.id, 'approved')}
                                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  {lang === 'fr' ? 'Accepter' : 'Apwouve'}
                                </button>
                                <button
                                  onClick={() => handleRequestAction(r.id, 'rejected')}
                                  className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                >
                                  {lang === 'fr' ? 'Refuser' : 'Refize'}
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                {lang === 'fr' ? "Traité" : "Trete"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Expanded Image Viewer Modal */}
      {viewingImageUrl && (
        <div
          onClick={() => setViewingImageUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-gold/20 flex flex-col p-2 cursor-default"
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
                className="max-h-[75vh] object-contain rounded-lg"
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

    </div>
  );
}

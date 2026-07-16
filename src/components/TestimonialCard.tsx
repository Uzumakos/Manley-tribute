/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Quote, Heart, Calendar, Eye } from 'lucide-react';
import { Testimonial } from '../types';

interface TestimonialCardProps {
  key?: string;
  testimonial: Testimonial;
  lang: 'fr' | 'ht';
  onLike?: (id: string, newLikesCount: number) => void;
}

export default function TestimonialCard({ testimonial, lang, onLike }: TestimonialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [liked, setLiked] = useState(() => {
    try {
      const likedItems = JSON.parse(localStorage.getItem('liked_testimonials') || '{}');
      return !!likedItems[testimonial.id];
    } catch {
      return false;
    }
  });

  const formatRelation = (rel: string) => {
    const mapFr: Record<string, string> = {
      family: 'Famille',
      friend: 'Ami',
      colleague: 'Collègue',
      other: 'Proche'
    };
    const mapHt: Record<string, string> = {
      family: 'Fanmi',
      friend: 'Zanmi',
      colleague: 'Koleg',
      other: 'Pwòch'
    };
    return lang === 'fr' ? mapFr[rel] || rel : mapHt[rel] || rel;
  };

  const handleLike = async () => {
    const action = liked ? 'unlike' : 'like';
    const newLiked = !liked;
    
    // Toggle liked state optimistically
    setLiked(newLiked);

    try {
      const likedItems = JSON.parse(localStorage.getItem('liked_testimonials') || '{}');
      if (newLiked) {
        likedItems[testimonial.id] = true;
      } else {
        delete likedItems[testimonial.id];
      }
      localStorage.setItem('liked_testimonials', JSON.stringify(likedItems));
    } catch (e) {
      console.error('Failed to save liked state in local storage:', e);
    }

    try {
      const res = await fetch(`/api/testimonials/${testimonial.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        if (onLike) {
          onLike(testimonial.id, data.likes || 0);
        }
      } else {
        // Rollback on failure
        setLiked(liked);
        const likedItems = JSON.parse(localStorage.getItem('liked_testimonials') || '{}');
        if (liked) {
          likedItems[testimonial.id] = true;
        } else {
          delete likedItems[testimonial.id];
        }
        localStorage.setItem('liked_testimonials', JSON.stringify(likedItems));
      }
    } catch (err) {
      console.error('Like request failed:', err);
      // Rollback
      setLiked(liked);
      const likedItems = JSON.parse(localStorage.getItem('liked_testimonials') || '{}');
      if (liked) {
        likedItems[testimonial.id] = true;
      } else {
        delete likedItems[testimonial.id];
      }
      localStorage.setItem('liked_testimonials', JSON.stringify(likedItems));
    }
  };

  return (
    <div className="handwritten-card p-6 rounded-2xl bg-white border border-gold/15 shadow-sm transition hover:shadow-md hover:border-gold/30 flex flex-col justify-between gap-5">
      
      {/* Testimonial Quote Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gold/5 rounded-lg text-gold inline-flex">
              <Quote className="w-4 h-4 scale-x-[-1]" />
            </span>
            <div>
              <p className="text-sm font-medium text-midnight font-serif">
                {testimonial.isAnonymous ? (lang === 'fr' ? 'Anonyme' : 'Anonyme') : testimonial.authorName}
              </p>
              {testimonial.nickname && (
                <p className="text-[11px] text-sage italic">
                  « {testimonial.nickname} »
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-sage/90 font-sans px-2.5 py-1 bg-sage/5 rounded-full uppercase tracking-wider font-medium">
              {formatRelation(testimonial.relationship)}
            </span>
            <span 
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                testimonial.language === 'fr' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
              }`}
              title={testimonial.language === 'fr' ? 'Français' : 'Kreyòl Ayisyen'}
            >
              {testimonial.language === 'fr' ? 'FR' : 'HT'}
            </span>
          </div>
        </div>

        {/* Message Content */}
        <p className="text-slate-900 font-serif font-bold text-base md:text-lg leading-relaxed italic border-l-2 border-gold/30 pl-4 py-1">
          « {testimonial.message} »
        </p>

        {/* Attachment Image */}
        {testimonial.photoUrl && (
          <div className="relative rounded-xl overflow-hidden group max-h-48 bg-slate-50 border border-slate-100">
            <img 
              src={testimonial.photoUrl} 
              alt={`Photo par ${testimonial.authorName}`} 
              className="w-full object-cover max-h-48 transition duration-300 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-white/95 rounded-full text-midnight shadow transition transform scale-90 group-hover:scale-100"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer with Interaction */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(testimonial.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })}
        </span>

        <button 
          onClick={handleLike}
          className={`flex items-center gap-1 py-1 px-2 rounded-md hover:bg-rose-50 hover:text-rose-600 transition ${
            liked ? 'text-rose-600' : ''
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-600' : ''}`} />
          <span>{(testimonial.likes && testimonial.likes > 0) ? testimonial.likes : ''}</span>
        </button>
      </div>

      {/* Expanded Modal Photo Viewer */}
      {isExpanded && testimonial.photoUrl && (
        <div 
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-xl bg-white p-2 border border-gold/20 flex flex-col">
            <img 
              src={testimonial.photoUrl} 
              alt="" 
              className="object-contain max-h-[75vh]" 
              referrerPolicy="no-referrer"
            />
            <div className="p-2.5 text-center bg-white text-xs font-serif italic text-midnight">
              {testimonial.message.substring(0, 80)}...
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

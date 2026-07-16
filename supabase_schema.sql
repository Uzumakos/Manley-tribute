-- Create memorial table
CREATE TABLE IF NOT EXISTS memorial (
  id TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  nickname TEXT,
  "birthDate" TEXT,
  "importantDate" TEXT,
  biography TEXT,
  "coverImage" TEXT,
  "profileImage" TEXT,
  "personalityTitleFr" TEXT,
  "personalityTitleHt" TEXT,
  "personalityTextFr" TEXT,
  "personalityTextHt" TEXT,
  "traitsTitleFr" TEXT,
  "traitsTitleHt" TEXT,
  "traitsFr" TEXT,
  "traitsHt" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  "memorialId" TEXT REFERENCES memorial(id) ON DELETE CASCADE,
  "authorName" TEXT NOT NULL,
  nickname TEXT,
  relationship TEXT NOT NULL,
  language TEXT NOT NULL,
  message TEXT NOT NULL,
  "photoUrl" TEXT,
  status TEXT DEFAULT 'pending',
  "isAnonymous" BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  "memorialId" TEXT REFERENCES memorial(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  caption TEXT,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tribute_video table
CREATE TABLE IF NOT EXISTS tribute_video (
  id TEXT PRIMARY KEY,
  "memorialId" TEXT REFERENCES memorial(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "musicUrl" TEXT,
  status TEXT DEFAULT 'published',
  "selectedPhotos" TEXT[] DEFAULT '{}',
  "selectedTestimonials" TEXT[] DEFAULT '{}',
  "slideDuration" INTEGER DEFAULT 6,
  "downloadUrl" TEXT,
  "videoEnabled" BOOLEAN DEFAULT TRUE,
  "disabledMessageFr" TEXT,
  "disabledMessageHt" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audio_tracks table
CREATE TABLE IF NOT EXISTS audio_tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  "youtubeUrl" TEXT NOT NULL,
  "audioUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
INSERT INTO memorial (id, "fullName", nickname, "birthDate", "importantDate", biography, "coverImage", "profileImage", "createdAt")
VALUES (
  'manley-memorial',
  'Alcide Emmanuel',
  'Manley',
  '1995-06-26',
  '26 Juin',
  'Alcide Emmanuel, affectueusement connu par tous sous le nom de « Manley », était une âme d''une générosité sans borne, un ingénieur passionné, et un musicien talentueux. Né le 26 juin, il a consacré sa vie à créer des ponts entre les personnes, à partager son amour pour la culture haïtienne, et à inspirer ses proches par son humilité et sa soif insatiable de savoir.\n\nQue ce soit à travers les mélodies qu''il jouait à la guitare ou les lignes de code élégantes qu''il écrivait pour résoudre des problèmes complexes, Manley mettait son cœur entier dans chaque création. Son sourire contagieux, sa bienveillance et sa sagesse continuent d''éclairer le chemin de tous ceux qui ont eu le privilège de croiser sa route. Ce mémorial est un espace vivant pour célébrer sa lumière, préserver ses mots, et lui dire merci pour chaque instant partagé.',
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
  '2026-07-11T22:00:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO testimonials (id, "memorialId", "authorName", nickname, relationship, language, message, "photoUrl", status, "isAnonymous", "createdAt")
VALUES 
(
  't1',
  'manley-memorial',
  'Chantal Desrosiers',
  'Tati Chantal',
  'family',
  'fr',
  'Manley était une personne extraordinaire. Son sourire chaleureux restera à jamais gravé dans nos mémoires. Il portait en lui une joie de vivre qui illuminait chaque réunion de famille. Repose en paix, mon cher neveu.',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
  'approved',
  false,
  '2026-07-01T10:30:00Z'
),
(
  't2',
  'manley-memorial',
  'Jean-Pierre Bastien',
  'JP',
  'friend',
  'ht',
  'Manley se te yon moun espesyal anpil. Souri li ap toujou rete nan kè nou. Nou te konn pase anpil nwit ap diskite sou pwojè teknoloji, li te toujou prè pou l ede san l pa mande anyen an retou. Yon vrè frè.',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300',
  'approved',
  false,
  '2026-07-02T14:45:00Z'
),
(
  't3',
  'manley-memorial',
  'Naomie Pierre',
  '',
  'colleague',
  'fr',
  'Un professionnel exceptionnel et un esprit brillant. Travailler avec Manley était un honneur. Sa rigueur, sa créativité et surtout son humilité exemplaire ont profondément marqué notre équipe technique. Son héritage se perpétue dans nos réalisations.',
  NULL,
  'approved',
  false,
  '2026-07-03T09:15:00Z'
),
(
  't4',
  'manley-memorial',
  'Makenzy Jean',
  'Kenzy',
  'friend',
  'ht',
  'Manley te renmen mizik ak tout kè l. M p ap janm bliye lè n te konn ap jwe gita ansanm nan lakou a. Li te konn rann chak moman senp tounen yon bèl melodi. Limyè w pap janm mouri, frè m.',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=300',
  'approved',
  false,
  '2026-07-04T18:20:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO photos (id, "memorialId", category, "imageUrl", caption, "uploadedBy", "createdAt")
VALUES
(
  'p1',
  'manley-memorial',
  'Childhood',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800',
  'Premiers sourires, déjà plein de curiosité pour le monde.',
  'Famille Emmanuel',
  '2026-07-01T08:00:00Z'
),
(
  'p2',
  'manley-memorial',
  'Family',
  'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
  'Une fête de famille mémorable où Manley jouait de la guitare.',
  'Chantal Desrosiers',
  '2026-07-02T11:30:00Z'
),
(
  'p3',
  'manley-memorial',
  'Friends',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
  'Soirée de rires et de partage avec l''équipe de développement.',
  'Jean-Pierre Bastien',
  '2026-07-03T16:40:00Z'
),
(
  'p4',
  'manley-memorial',
  'Important Moments',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
  'La consécration de ses travaux d''ingénierie.',
  'Naomie Pierre',
  '2026-07-04T12:00:00Z'
),
(
  'p5',
  'manley-memorial',
  'Memories',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
  'Manley contemplant le coucher de soleil au bord de la mer en Haïti.',
  'Makenzy Jean',
  '2026-07-05T19:10:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tribute_video (id, "memorialId", title, "musicUrl", status, "selectedPhotos", "selectedTestimonials", "slideDuration", "createdAt")
VALUES (
  'v1',
  'manley-memorial',
  'Alcide Emmanuel (Manley) - Une Vie de Lumière',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'published',
  ARRAY['p1', 'p2', 'p3', 'p4', 'p5'],
  ARRAY['t1', 't2', 't4'],
  6,
  '2026-07-10T15:00:00Z'
) ON CONFLICT (id) DO NOTHING;

-- Seed initial audio tracks
INSERT INTO audio_tracks (id, title, artist, "youtubeUrl", "createdAt")
VALUES
(
  'a1',
  'Laho',
  'Shallipopi',
  'https://www.youtube.com/watch?v=kY7Uf1D8vss',
  '2026-07-11T12:00:00Z'
),
(
  'a2',
  'CONFESSION',
  'AV',
  'https://www.youtube.com/watch?v=FhkbW4rJ0gM',
  '2026-07-11T12:05:00Z'
),
(
  'a3',
  'Bandana',
  'Fireboy DML Ft. Asake',
  'https://www.youtube.com/watch?v=cM5021e1h8Q',
  '2026-07-11T12:10:00Z'
),
(
  'a4',
  'Asiwaju',
  'Ruger',
  'https://www.youtube.com/watch?v=zJ8VfS7sV7c',
  '2026-07-11T12:15:00Z'
) ON CONFLICT (id) DO NOTHING;

-- Create download_requests table
CREATE TABLE IF NOT EXISTS download_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'photos' or 'pdf'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

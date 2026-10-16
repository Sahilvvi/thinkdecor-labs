/**
 * Template catalogue for the Create flow — one source of truth shared by the
 * Templates gallery, the Create composer and the Library labels.
 *
 * Style names mirror the ones already shown on the marketing site
 * (DesignGenerator.tsx, SmartWizard.tsx) so the app speaks the same language.
 * Preview images reuse /assets/samples/* — swap for real style renders later.
 */

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'dining' | 'office' | 'bathroom';

export const ROOM_TYPES: { key: RoomType; label: string }[] = [
  { key: 'living', label: 'Living room' },
  { key: 'bedroom', label: 'Bedroom' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'dining', label: 'Dining room' },
  { key: 'office', label: 'Home office' },
  { key: 'bathroom', label: 'Bathroom' },
];

export interface Template {
  key: string;
  label: string;
  description: string;
  image: string;
  /** Seed prompt handed to the generator; the user's own prompt is appended. */
  prompt: string;
  tags: string[];
  /** Shown first in the gallery and preselected in Create. */
  featured?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    key: 'modern',
    label: 'Modern',
    description: 'Clean lines, warm neutrals and statement lighting.',
    image: '/assets/samples/styled_room.png',
    prompt: 'modern interior, clean lines, warm neutral palette, statement lighting',
    tags: ['Popular', 'Neutral'],
    featured: true,
  },
  {
    key: 'scandinavian',
    label: 'Scandinavian',
    description: 'Light oak, soft linen and a calm, airy palette.',
    image: '/assets/rooms/t-scandi.webp',
    prompt: 'scandinavian interior, light oak, soft linen textiles, airy bright palette',
    tags: ['Light', 'Cosy'],
    featured: true,
  },
  {
    key: 'minimal',
    label: 'Minimal',
    description: 'Fewer, better pieces with plenty of breathing room.',
    image: '/assets/rooms/s-minimal.webp',
    prompt: 'minimalist interior, uncluttered, restrained palette, quality materials',
    tags: ['Calm', 'Neutral'],
    featured: true,
  },
  {
    key: 'classic',
    label: 'Classic',
    description: 'Timeless furniture, rich fabrics and traditional detail.',
    image: '/assets/rooms/t-classic.webp',
    prompt: 'classic interior, timeless furniture, rich fabrics, traditional detailing',
    tags: ['Elegant'],
  },
  {
    key: 'japandi',
    label: 'Japandi',
    description: 'Japanese restraint meets Scandinavian warmth.',
    image: '/assets/rooms/t-japandi.webp',
    prompt: 'japandi interior, low furniture, natural wood, muted earthy tones',
    tags: ['Natural', 'Calm'],
  },
  {
    key: 'industrial',
    label: 'Industrial',
    description: 'Exposed textures, dark metal and deep leather.',
    image: '/assets/rooms/t-noir.webp',
    prompt: 'industrial interior, exposed textures, dark metal, leather, moody lighting',
    tags: ['Bold'],
  },
  {
    key: 'warm-natural',
    label: 'Warm Natural',
    description: 'Earthy tones, plants and tactile materials.',
    image: '/assets/samples/5.webp',
    prompt: 'warm natural interior, earthy tones, indoor plants, rattan and wool',
    tags: ['Natural', 'Cosy'],
  },
];

export const DEFAULT_TEMPLATE_KEY = TEMPLATES.find((t) => t.featured)!.key;

export function templateByKey(key?: string | null): Template | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

export function roomLabel(key?: string | null): string | undefined {
  return ROOM_TYPES.find((r) => r.key === key)?.label;
}

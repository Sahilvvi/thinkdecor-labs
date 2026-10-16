/**
 * Hero demo data — illustrative example rooms (not the visitor's own photo).
 * Each room has a few colour pins (sofa, floor, a key piece of furniture):
 * tap one and pick a swatch to see that item recoloured. The recoloured
 * photos are real Mantha/Gemini edits generated ahead of time by
 * scripts/gen_hero_colours.py from src/lib/heroColours.json — nothing here
 * calls the API live.
 */
import colourData from './heroColours.json';

export interface Swatch {
  key: string;
  label: string;
  hex: string;
  /** Recoloured room photo; the base photo for the "original" swatch. */
  image: string;
}

export interface ColourPin {
  key: string;
  /** Position as a percentage of the image, matching the source photo's layout. */
  x: number;
  y: number;
  name: string;
  swatches: Swatch[];
}

type RoomKey = 'living' | 'bedroom' | 'kitchen' | 'hall';

const BASE_IMAGE: Record<RoomKey, string> = {
  living: '/assets/rooms/hero.webp',
  bedroom: '/assets/rooms/room-bedroom.webp',
  kitchen: '/assets/rooms/room-kitchen.webp',
  hall: '/assets/rooms/room-hall.webp',
};

function pinsFor(room: RoomKey): ColourPin[] {
  return colourData[room].map((pin) => ({
    key: pin.key,
    x: pin.x,
    y: pin.y,
    name: pin.name,
    swatches: pin.swatches.map((s) => ({
      key: s.key,
      label: s.label,
      hex: s.hex,
      image: s.key === 'original' ? BASE_IMAGE[room] : `/assets/rooms/colours/${room}-${pin.key}-${s.key}.webp`,
    })),
  }));
}

export type StyleKey = 'Minimal' | 'Maximalism' | 'Scandinavian' | 'Japanese';

export interface DemoRoom {
  key: RoomKey;
  label: string;
  image: string;
  alt: string;
  /** Colour pins — tap one, pick a swatch, the item changes colour. */
  pins: ColourPin[];
  /** This room redesigned in each style — what the stage shows once a style tile is tapped. */
  styles: Record<StyleKey, { image: string; alt: string }>;
}

export const DEMO_ROOMS: DemoRoom[] = [
  {
    key: 'living',
    label: 'Living room',
    image: '/assets/rooms/hero.webp',
    alt: 'Warm living room with a dark leather chaise sofa, oak wall cabinets, glass side tables and a floor lamp',
    styles: {
      Minimal: { image: '/assets/rooms/room-living-minimal.webp', alt: 'Living room redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-living-maximalism.webp', alt: 'Living room redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-living-scandinavian.webp', alt: 'Living room redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-living-japanese.webp', alt: 'Living room redesigned in a Japanese style' },
    },
    pins: pinsFor('living'),
  },
  {
    key: 'bedroom',
    label: 'Bedroom',
    image: '/assets/rooms/room-bedroom.webp',
    alt: 'Bedroom with a black wooden double bed, gallery wall, reading lamp and grey rug',
    styles: {
      Minimal: { image: '/assets/rooms/room-bedroom-minimal.webp', alt: 'Bedroom redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-bedroom-maximalism.webp', alt: 'Bedroom redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-bedroom-scandinavian.webp', alt: 'Bedroom redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-bedroom-japanese.webp', alt: 'Bedroom redesigned in a Japanese style' },
    },
    pins: pinsFor('bedroom'),
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    image: '/assets/rooms/room-kitchen.webp',
    alt: 'Oak kitchen with built-in ovens, white pendant lamp and a dining table with black chairs',
    styles: {
      Minimal: { image: '/assets/rooms/room-kitchen-minimal.webp', alt: 'Kitchen redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-kitchen-maximalism.webp', alt: 'Kitchen redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-kitchen-scandinavian.webp', alt: 'Kitchen redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-kitchen-japanese.webp', alt: 'Kitchen redesigned in a Japanese style' },
    },
    pins: pinsFor('kitchen'),
  },
  {
    key: 'hall',
    label: 'Hall',
    image: '/assets/rooms/room-hall.webp',
    alt: 'Dark hallway with a white console table, arched mirror, gallery wall and roses',
    styles: {
      Minimal: { image: '/assets/rooms/room-hall-minimal.webp', alt: 'Hall redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-hall-maximalism.webp', alt: 'Hall redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-hall-scandinavian.webp', alt: 'Hall redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-hall-japanese.webp', alt: 'Hall redesigned in a Japanese style' },
    },
    pins: pinsFor('hall'),
  },
];

export interface DemoStyle {
  key: StyleKey;
  label: string;
  image: string;
  alt: string;
}

export const DEMO_STYLES: DemoStyle[] = [
  { key: 'Minimal', label: 'Minimal', image: '/assets/rooms/s-minimal.webp', alt: 'Minimal bedroom with oak drawers and a round mirror' },
  { key: 'Maximalism', label: 'Maximalism', image: '/assets/rooms/s-maximal.webp', alt: 'Colourful maximalist living room with bright wall cabinets' },
  { key: 'Scandinavian', label: 'Scandinavian', image: '/assets/rooms/s-scandi.webp', alt: 'Bright Scandinavian dining room with white chairs and plants' },
  { key: 'Japanese', label: 'Japanese', image: '/assets/rooms/s-japanese.webp', alt: 'Calm Japanese-style corner with pale wood, linen curtain and daybed' },
];


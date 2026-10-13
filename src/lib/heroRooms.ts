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
  living: '/assets/rooms/hero.jpg',
  bedroom: '/assets/rooms/room-bedroom.jpg',
  kitchen: '/assets/rooms/room-kitchen.jpg',
  hall: '/assets/rooms/room-hall.jpg',
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
      image: s.key === 'original' ? BASE_IMAGE[room] : `/assets/rooms/colours/${room}-${pin.key}-${s.key}.jpg`,
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
    image: '/assets/rooms/hero.jpg',
    alt: 'Warm living room with a dark leather chaise sofa, oak wall cabinets, glass side tables and a floor lamp',
    styles: {
      Minimal: { image: '/assets/rooms/room-living-minimal.jpg', alt: 'Living room redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-living-maximalism.jpg', alt: 'Living room redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-living-scandinavian.jpg', alt: 'Living room redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-living-japanese.jpg', alt: 'Living room redesigned in a Japanese style' },
    },
    pins: pinsFor('living'),
  },
  {
    key: 'bedroom',
    label: 'Bedroom',
    image: '/assets/rooms/room-bedroom.jpg',
    alt: 'Bedroom with a black wooden double bed, gallery wall, reading lamp and grey rug',
    styles: {
      Minimal: { image: '/assets/rooms/room-bedroom-minimal.jpg', alt: 'Bedroom redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-bedroom-maximalism.jpg', alt: 'Bedroom redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-bedroom-scandinavian.jpg', alt: 'Bedroom redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-bedroom-japanese.jpg', alt: 'Bedroom redesigned in a Japanese style' },
    },
    pins: pinsFor('bedroom'),
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    image: '/assets/rooms/room-kitchen.jpg',
    alt: 'Oak kitchen with built-in ovens, white pendant lamp and a dining table with black chairs',
    styles: {
      Minimal: { image: '/assets/rooms/room-kitchen-minimal.jpg', alt: 'Kitchen redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-kitchen-maximalism.jpg', alt: 'Kitchen redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-kitchen-scandinavian.jpg', alt: 'Kitchen redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-kitchen-japanese.jpg', alt: 'Kitchen redesigned in a Japanese style' },
    },
    pins: pinsFor('kitchen'),
  },
  {
    key: 'hall',
    label: 'Hall',
    image: '/assets/rooms/room-hall.jpg',
    alt: 'Dark hallway with a white console table, arched mirror, gallery wall and roses',
    styles: {
      Minimal: { image: '/assets/rooms/room-hall-minimal.jpg', alt: 'Hall redesigned in a minimal style' },
      Maximalism: { image: '/assets/rooms/room-hall-maximalism.jpg', alt: 'Hall redesigned in a maximalist style' },
      Scandinavian: { image: '/assets/rooms/room-hall-scandinavian.jpg', alt: 'Hall redesigned in a Scandinavian style' },
      Japanese: { image: '/assets/rooms/room-hall-japanese.jpg', alt: 'Hall redesigned in a Japanese style' },
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
  { key: 'Minimal', label: 'Minimal', image: '/assets/rooms/s-minimal.jpg', alt: 'Minimal bedroom with oak drawers and a round mirror' },
  { key: 'Maximalism', label: 'Maximalism', image: '/assets/rooms/s-maximal.jpg', alt: 'Colourful maximalist living room with bright wall cabinets' },
  { key: 'Scandinavian', label: 'Scandinavian', image: '/assets/rooms/s-scandi.jpg', alt: 'Bright Scandinavian dining room with white chairs and plants' },
  { key: 'Japanese', label: 'Japanese', image: '/assets/rooms/s-japanese.jpg', alt: 'Calm Japanese-style corner with pale wood, linen curtain and daybed' },
];


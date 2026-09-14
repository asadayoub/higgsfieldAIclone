export const creationCategories = [
  "fashion",
  "cinematic",
  "architecture",
  "product",
  "graphic",
  "surreal",
  "lifestyle",
] as const;

export const creationTypes = ["all", "image", "video"] as const;

export type CreationCategory = (typeof creationCategories)[number];
export type CreationType = Exclude<(typeof creationTypes)[number], "all">;

export type Creation = {
  id: string;
  title: string;
  prompt: string;
  author: string;
  category: CreationCategory;
  type: CreationType;
  model: string;
  preset: string;
  ratio: string;
  src: string;
  width: number;
  height: number;
  accent: string;
  featured?: boolean;
};

export const creations: readonly Creation[] = [
  {
    id: "fabric-orbit",
    title: "Fabric Orbit",
    prompt:
      "Sculptural cobalt tailoring caught in a clean orbital movement, tactile studio grain and deep negative space.",
    author: "LumaForge Studio",
    category: "fashion",
    type: "image",
    model: "Flux 2 Pro",
    preset: "Editorial Form",
    ratio: "3:4",
    src: "/media/showcase/portrait-01-fabric-orbit.svg",
    width: 900,
    height: 1200,
    accent: "Cobalt",
    featured: true,
  },
  {
    id: "monolith-tide",
    title: "Monolith Tide",
    prompt:
      "A brutalist coastal observatory meeting a rising dark tide at blue hour, restrained cinematic scale.",
    author: "Mira Vale",
    category: "architecture",
    type: "image",
    model: "Luma Image v1",
    preset: "Quiet Monument",
    ratio: "14:9",
    src: "/media/showcase/landscape-01-monolith-tide.svg",
    width: 1400,
    height: 900,
    accent: "Midnight",
    featured: true,
  },
  {
    id: "cobalt-vessel",
    title: "Cobalt Vessel",
    prompt:
      "Translucent cobalt glass vessel on volcanic stone, hard edge light and precise luxury product framing.",
    author: "Noor Objects",
    category: "product",
    type: "image",
    model: "Seedream 5",
    preset: "Object Study",
    ratio: "1:1",
    src: "/media/showcase/square-01-cobalt-vessel.svg",
    width: 1000,
    height: 1000,
    accent: "Cobalt",
  },
  {
    id: "drift-study",
    title: "Drift Study 04",
    prompt:
      "One continuous tracking move through a windswept salt plain as a chrome form drifts across frame.",
    author: "Aster Motion",
    category: "cinematic",
    type: "video",
    model: "Seedance 2",
    preset: "Slow Pursuit",
    ratio: "16:9",
    src: "/media/system/video-poster-drift.svg",
    width: 1400,
    height: 788,
    accent: "Silver",
    featured: true,
  },
  {
    id: "ember-veil",
    title: "Ember Veil",
    prompt:
      "An ember-toned veil suspended around an editorial silhouette, quiet movement and warm halation.",
    author: "LumaForge Studio",
    category: "fashion",
    type: "image",
    model: "Flux 2 Pro",
    preset: "Editorial Form",
    ratio: "3:4",
    src: "/media/showcase/portrait-02-ember-veil.svg",
    width: 900,
    height: 1200,
    accent: "Ember",
  },
  {
    id: "glass-horizon",
    title: "Glass Horizon",
    prompt:
      "A liquid glass horizon bending around an impossible desert, pale atmosphere and quiet surrealism.",
    author: "Sana North",
    category: "surreal",
    type: "image",
    model: "Luma Image v1",
    preset: "Lucid Terrain",
    ratio: "14:9",
    src: "/media/showcase/landscape-02-glass-horizon.svg",
    width: 1400,
    height: 900,
    accent: "Ice",
  },
  {
    id: "orbit-chair",
    title: "Orbit Chair",
    prompt:
      "A soft industrial chair balanced inside a brushed aluminum orbit, catalog precision with playful geometry.",
    author: "Noor Objects",
    category: "product",
    type: "image",
    model: "GPT Image 2",
    preset: "Object Study",
    ratio: "1:1",
    src: "/media/showcase/square-02-orbit-chair.svg",
    width: 1000,
    height: 1000,
    accent: "Chrome",
  },
  {
    id: "pulse-study",
    title: "Pulse / Signal",
    prompt:
      "Rhythmic bands of electric lime light pulse through a black soundstage in one seamless camera move.",
    author: "Aster Motion",
    category: "graphic",
    type: "video",
    model: "Veo 3.1",
    preset: "Signal Path",
    ratio: "16:9",
    src: "/media/system/video-poster-pulse.svg",
    width: 1400,
    height: 788,
    accent: "Signal",
  },
  {
    id: "moonlit-form",
    title: "Moonlit Form",
    prompt:
      "A solitary figure shaped by moonlight and deep shadow, photographed with soft anamorphic falloff.",
    author: "Mira Vale",
    category: "cinematic",
    type: "image",
    model: "Luma Image v1",
    preset: "Noir Frame",
    ratio: "3:4",
    src: "/media/showcase/portrait-03-moonlit-form.svg",
    width: 900,
    height: 1200,
    accent: "Moon",
  },
  {
    id: "amber-transit",
    title: "Amber Transit",
    prompt:
      "An amber transit line crossing a vast nocturnal plain, compressed perspective and practical haze.",
    author: "Sana North",
    category: "cinematic",
    type: "image",
    model: "Seedream 5",
    preset: "Night Passage",
    ratio: "14:9",
    src: "/media/showcase/landscape-03-amber-transit.svg",
    width: 1400,
    height: 900,
    accent: "Amber",
  },
  {
    id: "liquid-type",
    title: "Liquid Type",
    prompt:
      "Heavy letterforms becoming reflective liquid, immaculate grid, black field and electric highlights.",
    author: "Aster Type",
    category: "graphic",
    type: "image",
    model: "GPT Image 2",
    preset: "Graphic Matter",
    ratio: "1:1",
    src: "/media/showcase/square-03-liquid-type.svg",
    width: 1000,
    height: 1000,
    accent: "Ink",
  },
  {
    id: "veil-motion",
    title: "Veil in Motion",
    prompt:
      "A translucent textile lifts through a dark architectural volume, slow motion with a soft handheld drift.",
    author: "Mira Vale",
    category: "fashion",
    type: "video",
    model: "Kling 3",
    preset: "Soft Ascent",
    ratio: "16:9",
    src: "/media/system/video-poster-veil.svg",
    width: 1400,
    height: 788,
    accent: "Pearl",
  },
  {
    id: "lime-signal",
    title: "Lime Signal",
    prompt:
      "Electric lime signal wear isolated against charcoal, graphic flash and sharp fashion posture.",
    author: "LumaForge Studio",
    category: "graphic",
    type: "image",
    model: "Flux 2 Pro",
    preset: "Vivid Signal",
    ratio: "3:4",
    src: "/media/showcase/portrait-04-lime-signal.svg",
    width: 900,
    height: 1200,
    accent: "Signal",
  },
  {
    id: "silent-coast",
    title: "Silent Coast",
    prompt:
      "A minimal coastal shelter at first light, salt air, weathered concrete and an unhurried human scale.",
    author: "Sana North",
    category: "lifestyle",
    type: "image",
    model: "Luma Image v1",
    preset: "Quiet Monument",
    ratio: "14:9",
    src: "/media/showcase/landscape-04-silent-coast.svg",
    width: 1400,
    height: 900,
    accent: "Mist",
  },
  {
    id: "mineral-bloom",
    title: "Mineral Bloom",
    prompt:
      "Crystalline mineral petals opening from dark stone, macro optics, restrained iridescence and tactile detail.",
    author: "Noor Objects",
    category: "surreal",
    type: "image",
    model: "Seedream 5",
    preset: "Lucid Terrain",
    ratio: "1:1",
    src: "/media/showcase/square-04-mineral-bloom.svg",
    width: 1000,
    height: 1000,
    accent: "Mineral",
  },
] as const;

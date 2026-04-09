export type GalleryCategory =
  | "living"
  | "bedrooms"
  | "bathrooms"
  | "kitchen"
  | "outdoor";

export interface GalleryImage {
  id: number;
  category: GalleryCategory;
  src: string;
  alt: string;
}

/**
 * Fotos en public/images/. No incluye coyoacan.jpg (solo sección Neighborhood).
 * Hero usa sala-main2.jpeg aparte; aquí también aparece en Living Room si quieres verla en la galería.
 */
export const galleryImages: GalleryImage[] = [
  // Living room & dining
  {
    id: 1,
    category: "living",
    src: "/images/sala-main2.jpeg",
    alt: "Main living room",
  },
  {
    id: 2,
    category: "living",
    src: "/images/living2.jpeg",
    alt: "Living room",
  },
  {
    id: 3,
    category: "living",
    src: "/images/living3.jpeg",
    alt: "Living space",
  },
  {
    id: 4,
    category: "living",
    src: "/images/dinning.jpeg",
    alt: "Dining area",
  },
  // Bedrooms
  {
    id: 5,
    category: "bedrooms",
    src: "/images/bedroom2.jpeg",
    alt: "Bedroom",
  },
  {
    id: 6,
    category: "bedrooms",
    src: "/images/bedroom11.jpg",
    alt: "Bedroom",
  },
  // Bathrooms
  {
    id: 7,
    category: "bathrooms",
    src: "/images/fullbath.jpg",
    alt: "Full bathroom",
  },
  {
    id: 8,
    category: "bathrooms",
    src: "/images/halfbath.jpeg",
    alt: "Half bathroom",
  },
  // Kitchen & laundry
  {
    id: 9,
    category: "kitchen",
    src: "/images/kitchen.jpg",
    alt: "Kitchen",
  },
  {
    id: 10,
    category: "kitchen",
    src: "/images/kitchen2.jpg",
    alt: "Kitchen",
  },
  {
    id: 11,
    category: "kitchen",
    src: "/images/kitchen3.jpg",
    alt: "Kitchen",
  },
  {
    id: 12,
    category: "kitchen",
    src: "/images/kitchen4.jpg",
    alt: "Kitchen",
  },
  {
    id: 13,
    category: "kitchen",
    src: "/images/washer.jpg",
    alt: "Laundry area",
  },
  // Outdoor
  {
    id: 14,
    category: "outdoor",
    src: "/images/Patio.jpeg",
    alt: "Patio",
  },
  {
    id: 15,
    category: "outdoor",
    src: "/images/exterior.jpg",
    alt: "Exterior",
  },
  {
    id: 16,
    category: "outdoor",
    src: "/images/exterior2.jpg",
    alt: "Exterior",
  },
  {
    id: 17,
    category: "outdoor",
    src: "/images/exterior3.jpg",
    alt: "Exterior",
  },
];

export const galleryFilterOptions: {
  key: GalleryCategory | "all";
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "living", label: "Living Room" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "kitchen", label: "Kitchen" },
  { key: "outdoor", label: "Outdoor" },
];

export interface Testimonial {
  id: number;
  name: string;
  country: string;
  text: string;
  stars: number;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Claire M.",
    country: "France",
    text: "Beautiful space, incredibly peaceful, and the location in Coyoacán is perfect. We felt at home from the first night.",
    stars: 5,
  },
  {
    id: 2,
    name: "James R.",
    country: "United Kingdom",
    text: "Thoughtful design, spotless, and exactly as photographed. The neighborhood cafés and walks made our stay unforgettable.",
    stars: 5,
  },
  {
    id: 3,
    name: "Sofía L.",
    country: "Mexico",
    text: "A calm retreat after busy days in the city. Elegant minimalism with warm touches—highly recommend.",
    stars: 5,
  },
  {
    id: 4,
    name: "Anna K.",
    country: "Germany",
    text: "Quiet, safe, and full of character. Communication was seamless and the apartment exceeded our expectations.",
    stars: 5,
  },
];

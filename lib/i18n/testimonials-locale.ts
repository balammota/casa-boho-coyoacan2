import type { Locale } from "./types";

/** Texto y país localizados; en inglés se usan los datos por defecto del módulo data. */
export const testimonialOverrides: Partial<
  Record<
    Locale,
    Record<number, { text: string; country: string }>
  >
> = {
  es: {
    1: {
      text: "Espacio hermoso, increíblemente tranquilo y la ubicación en Coyoacán es perfecta. Nos sentimos en casa desde la primera noche.",
      country: "Francia",
    },
    2: {
      text: "Diseño cuidadoso, impecable y tal como en las fotos. Los cafés del barrio y los paseos hicieron inolvidable la estancia.",
      country: "Reino Unido",
    },
    3: {
      text: "Un refugio tranquilo después de días intensos en la ciudad. Minimalismo elegante con detalles cálidos—muy recomendable.",
      country: "México",
    },
    4: {
      text: "Silencioso, seguro y con mucho carácter. La comunicación fue fluida y el departamento superó nuestras expectativas.",
      country: "Alemania",
    },
  },
};

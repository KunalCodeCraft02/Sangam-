export interface HeroImage {
  url: string;
  location: string;
  alt: string;
}

export const HERO_IMAGES: HeroImage[] = [
  {
    url: "https://images.unsplash.com/photo-1572628334966-5ddaef772fce?fm=jpg&q=80&w=1920&auto=format&fit=crop",
    location: "Agra",
    alt: "The Taj Mahal at golden hour, Agra, India",
  },
  {
    url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?fm=jpg&q=80&w=1920&auto=format&fit=crop",
    location: "Kerala",
    alt: "A traditional houseboat drifting through the Kerala backwaters",
  },
  {
    url: "https://images.unsplash.com/photo-1578999935853-4ec5fa6c1f60?fm=jpg&q=80&w=1920&auto=format&fit=crop",
    location: "Jaipur",
    alt: "The Hawa Mahal, Jaipur's Palace of Winds",
  },
  {
    url: "https://images.unsplash.com/photo-1777732786164-1f6e359e69ca?fm=jpg&q=80&w=1920&auto=format&fit=crop",
    location: "Local Bazaars",
    alt: "Sacks of colorful Indian spices at a local market",
  },
];

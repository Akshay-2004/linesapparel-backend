// Hero Section Content
export interface IHeroContent {
  slides: Array<{
    imageUrl: string;
    pretitle?: string;
    title: string;
    subtitle: string;
  }>;
  autoPlay: boolean;
  interval: number;
}

// Fashion Section Content
export interface IFashionContent {
  header1: string;
  header2: string;
  description: string;
  banners: Array<{
    imageUrl: string;
    topText: string;
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  }>;
  productIds: string[];
}

// Banner Section Content
export interface IBannerContent {
  imageUrl: string;
  topText?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  overlayStyle?: {
    backgroundColor?: string;
    opacity?: number;
  };
}

// Product Section Content
export interface IProductSectionContent {
  title: string;
  description: string;
  topText: string;
  buttonText: string;
  buttonLink: string;
  tag: string; // men, women, trending-now, etc.
  carouselSettings: {
    cardsPerView: {
      base: number;
      md: number;
      lg: number;
    };
    autoPlay: boolean;
    interval: number;
  };
}

// Generic Section interface
export interface IHomepageSection {
  sectionId: string;
  title: string;
  key: string;
  order: number;
  type: 'hero' | 'fashion' | 'banner' | 'product' | 'custom';
  isPublished: boolean;
  content: IHeroContent | IFashionContent | IBannerContent | IProductSectionContent | Record<string, any>;
  settings?: Record<string, any>;
}

// SEO Interface
export interface IHomepageSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: string;
}

// Simplified Homepage Data Interface (compatible with Page model)
export interface IHomepageData {
  hero: IHeroContent;
  fashion: IFashionContent;
  banners: [IBannerContent, IBannerContent]; // Fixed array of exactly 2 banners
  productSections: IProductSectionContent[]; // Array of product sections (2 or more)
  seo: IHomepageSEO;
  isPublished: boolean;
  publishedAt?: string;
  settings?: Record<string, any>;
}

// Type guards for section identification
export const isHeroSection = (section: IHomepageSection): boolean => {
  return section.type === 'hero' || section.key === 'hero';
};

export const isFashionSection = (section: IHomepageSection): boolean => {
  return section.type === 'fashion' || section.key === 'fashion';
};

export const isBannerSection = (section: IHomepageSection): boolean => {
  return section.type === 'banner' || section.key.startsWith('banner');
};

export const isProductSection = (section: IHomepageSection): boolean => {
  return section.type === 'product';
};

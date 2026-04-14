export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'yemek', name: 'Yemek & İçecek', icon: 'restaurant', color: '#FF8C69' },
  { id: 'market', name: 'Market', icon: 'cart', color: '#4ADE80' },
  { id: 'ulasim', name: 'Ulaşım', icon: 'car', color: '#60A5FA' },
  { id: 'faturalar', name: 'Faturalar', icon: 'flash', color: '#FBBF24' },
  { id: 'saglik', name: 'Sağlık', icon: 'heart', color: '#F472B6' },
  { id: 'eglence', name: 'Eğlence', icon: 'game-controller', color: '#A78BFA' },
  { id: 'giyim', name: 'Giyim', icon: 'shirt', color: '#34D399' },
  { id: 'bakim', name: 'Kişisel Bakım', icon: 'sparkles', color: '#FB923C' },
  { id: 'egitim', name: 'Eğitim', icon: 'book', color: '#38BDF8' },
  { id: 'ev', name: 'Ev & Yaşam', icon: 'home', color: '#E879F9' },
  { id: 'diger', name: 'Diğer', icon: 'ellipsis-horizontal', color: '#94A3B8' },
];

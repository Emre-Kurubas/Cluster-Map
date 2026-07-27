export const t = {
  searchPlaceholder: 'İlan, il veya kategori ara…',
  searchLabel: 'İlanlarda ara',
  clearSearch: 'Aramayı temizle',
  removeFilter: 'Filtreyi kaldır',

  resultCount: (n: number) => `${n} ilan`,
  noResults: 'Sonuç bulunamadı',
  noResultsHint: 'Filtreleri temizleyip yeniden deneyin.',
  clearFilters: 'Filtreleri temizle',
  emptyData: 'Görüntülenecek ilan yok',

  categories: 'Kategoriler',
  priceRange: 'Fiyat aralığı',
  sort: 'Sırala',
  sortRelevance: 'İlgi düzeyi',
  sortPriceAsc: 'Fiyat (artan)',
  sortPriceDesc: 'Fiyat (azalan)',
  filters: 'Filtreler',
  activeFilters: (n: number) => `${n} etkin filtre`,

  zoomIn: 'Yakınlaştır',
  zoomOut: 'Uzaklaştır',
  resetView: 'Görünümü sıfırla',
  openRail: 'Listeyi aç',
  closeRail: 'Listeyi kapat',
  closeDetail: 'Detayı kapat',

  goToListing: 'İlana git',
  noImage: 'Görsel yok',

  tileError: 'Harita altlığı yüklenemedi. İlanlar listeden görüntülenebilir.',
  webglError: 'Tarayıcınız harita görüntülemeyi desteklemiyor. İlanlar liste halinde gösteriliyor.',
  dismiss: 'Kapat',
} as const;

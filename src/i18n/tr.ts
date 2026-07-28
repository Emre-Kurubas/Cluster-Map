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
  hideCategory: (name: string) => `${name} kategorisini haritadan gizle`,
  showCategory: (name: string) => `${name} kategorisini haritada göster`,
  priceRange: 'Fiyat aralığı',
  priceMinLabel: 'En düşük fiyat',
  priceMaxLabel: 'En yüksek fiyat',
  /** The typed fields, which reach the same two bounds as the thumbs above. */
  priceMinInput: 'En düşük fiyatı gir',
  priceMaxInput: 'En yüksek fiyatı gir',
  currencySymbol: '₺',
  sort: 'Sırala',
  sortRelevance: 'İlgi düzeyi',
  sortPriceAsc: 'Fiyat (artan)',
  sortPriceDesc: 'Fiyat (azalan)',
  filters: 'Filtreler',
  activeFilters: (n: number) => `${n} etkin filtre`,

  /** Landmark name for the map container. */
  mapRegion: 'İlan haritası',
  /** Overrides MapLibre's own English label on the focusable canvas. */
  mapCanvas: 'Harita',

  zoomIn: 'Yakınlaştır',
  zoomOut: 'Uzaklaştır',
  resetView: 'Görünümü sıfırla',
  openRail: 'Listeyi aç',
  closeRail: 'Listeyi kapat',
  closeDetail: 'Detayı kapat',
  backToList: 'Listeye dön',
  openPhoto: 'Fotoğrafı büyüt',
  closePhoto: 'Fotoğrafı kapat',
  listingPhoto: 'İlan fotoğrafı',

  fieldCategory: 'Kategori',
  fieldSaleType: 'Satış türü',
  fieldOffice: 'İcra dairesi',
  fieldPrice: 'Muhammen bedel',
  fieldDescription: 'Açıklama',

  goToListing: 'İlana git',
  noImage: 'Görsel yok',

  tileError: 'Harita altlığı yüklenemedi. İlanlar listeden görüntülenebilir.',
  webglError: 'Tarayıcınız harita görüntülemeyi desteklemiyor. İlanlar liste halinde gösteriliyor.',
  dismiss: 'Kapat',
} as const;

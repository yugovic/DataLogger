export interface TireProductCatalogEntry {
  manufacturer: string;
  productName: string;
}

/** 入力補助用の主要製品。完全な製品マスターではなく、自由入力を常に許可する。 */
export const TIRE_PRODUCT_CATALOG: TireProductCatalogEntry[] = [
  { manufacturer: '横浜ゴム', productName: 'ADVAN A050' },
  { manufacturer: 'ブリヂストン', productName: 'POTENZA RE-71RS' },
  { manufacturer: 'ミシュラン', productName: 'PILOT SPORT CUP 2' },
  { manufacturer: 'ダンロップ', productName: 'DIREZZA 03G' },
  { manufacturer: 'TOYO TIRE', productName: 'PROXES R888R' },
  { manufacturer: 'ピレリ', productName: 'P ZERO TROFEO R' },
];

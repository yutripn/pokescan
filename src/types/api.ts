export type TcgTrackingSetResponse = {
  id: string | number;
  name: string;
  code?: string;
  releaseDate?: string;
};

export type TcgTrackingCardResponse = {
  id: string | number;
  setId?: string | number;
  set?: string;
  name: string;
  number?: string;
  rarity?: string;
  image?: string;
  [key: string]: unknown;
};

export type TcgTrackingSkuResponse = {
  id: string | number;
  productId?: string | number;
  finish?: string;
  variant?: string;
  language?: string;
  condition?: string;
  [key: string]: unknown;
};

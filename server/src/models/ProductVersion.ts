import { ObjectId } from 'mongodb';

export interface ProductVersion {
  _id?: ObjectId;
  productId: ObjectId;
  version: number;
  scrapedAt: Date;
  product: {
    title: string;
    imageUrl: string;
    rating: number;
    reviewCount: number;
  };
  reviews: Array<{
    text: string;
    rating: number;
    date: string;
  }>;
  source: string;
  reviewCount: number;
}

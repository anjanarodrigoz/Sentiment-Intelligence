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
  source: string;
  reviewCount: number;
  newReviewCount: number;
  cumulativeReviewCount: number;
}

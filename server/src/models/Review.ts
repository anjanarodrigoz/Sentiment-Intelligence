import { ObjectId } from 'mongodb';

export interface Review {
  _id?: ObjectId;
  productVersionId: ObjectId;
  productId: ObjectId;
  version: number;
  text: string;
  rating: number;
  date: string;
  createdAt: Date;
}

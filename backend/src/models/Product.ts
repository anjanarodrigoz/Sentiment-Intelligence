import { ObjectId } from 'mongodb';

export interface Product {
  _id?: ObjectId;
  url: string;
  urlHash: string;
  brandId: string;
  title: string;
  imageUrl: string;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

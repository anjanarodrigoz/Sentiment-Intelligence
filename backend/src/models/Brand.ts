import { ObjectId } from 'mongodb';

export interface Brand {
  _id?: ObjectId;
  id: string;
  name: string;
  logoUrl: string;
  scraperType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

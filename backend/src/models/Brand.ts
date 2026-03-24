import { ObjectId } from 'mongodb';

export interface Brand {
  _id?: ObjectId;
  id: string;
  name: string;
  logoUrl: string;
  scraperType: string;
  isActive: boolean;
  onboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
}

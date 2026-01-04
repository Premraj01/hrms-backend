import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OfferLetterDocument = OfferLetter & Document;

@Schema({ timestamps: true })
export class OfferLetter {
  @Prop({ required: true })
  referralId: string; // Reference to PostgreSQL JobReferral.id

  @Prop({ required: true })
  offerId: string; // Reference to PostgreSQL CandidateOffer.id

  @Prop({ required: true })
  candidateName: string;

  @Prop({ required: true })
  candidateEmail: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  data: Buffer; // Binary data of the offer letter

  @Prop({ required: true })
  size: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const OfferLetterSchema = SchemaFactory.createForClass(OfferLetter);

// Index for faster lookups
OfferLetterSchema.index({ referralId: 1 });
OfferLetterSchema.index({ offerId: 1 });
OfferLetterSchema.index({ candidateEmail: 1 });


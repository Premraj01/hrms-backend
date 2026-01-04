import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum OfferStatus {
  pending = 'pending',
  accepted = 'accepted',
  declined = 'declined',
  revoked = 'revoked',
  expired = 'expired',
}

export enum OfferType {
  original = 'original',
  revised = 'revised',
}

export class CreateOfferDto {
  @IsDateString()
  validUntil: string;
}

export class RevokeOfferDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateOfferStatusDto {
  @IsEnum(OfferStatus)
  status: OfferStatus;
}

export interface CandidateOfferResponse {
  id: string;
  referralId: string;
  offerLetterUrl: string;
  validUntil: string;
  status: OfferStatus;
  offerType: OfferType;
  version: number;
  createdById: string;
  createdByName: string;
  respondedAt?: string;
  revokedAt?: string;
  revokedById?: string;
  revokedByName?: string;
  revokeReason?: string;
  createdAt: string;
  isExpired: boolean;
}

export interface CandidateOffersResponse {
  referralId: string;
  candidateName: string;
  candidateEmail: string;
  originalOffers: CandidateOfferResponse[];
  revisedOffers: CandidateOfferResponse[];
  currentOffer?: CandidateOfferResponse;
  canMakeNewOffer: boolean;
}


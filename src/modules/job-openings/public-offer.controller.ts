import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JobOpeningsService } from './job-openings.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Public controller for candidate offer access
 * These endpoints do NOT require authentication
 */
@Controller('public/offers')
@Public()
export class PublicOfferController {
  constructor(private readonly jobOpeningsService: JobOpeningsService) {}

  /**
   * Get offer details by public token
   * Candidates use this to view their offer
   */
  @Get(':token')
  async getOfferByToken(@Param('token') token: string) {
    return this.jobOpeningsService.getOfferByPublicToken(token);
  }

  /**
   * Accept an offer by public token
   */
  @Post(':token/accept')
  async acceptOffer(@Param('token') token: string) {
    return this.jobOpeningsService.acceptOfferByPublicToken(token);
  }

  /**
   * Download offer letter by public token
   */
  @Get(':token/download')
  async downloadOfferLetter(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const { data, filename, mimetype } =
      await this.jobOpeningsService.getOfferLetterByPublicToken(token);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': data.length,
    });

    res.status(HttpStatus.OK).send(data);
  }
}


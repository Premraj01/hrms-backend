import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobOpeningsService } from './job-openings.service';
import { JobOpeningsController } from './job-openings.controller';
import { PublicOfferController } from './public-offer.controller';
import { PublicJobsController } from './public-jobs.controller';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { Resume, ResumeSchema } from './schemas/resume.schema';
import { OfferLetter, OfferLetterSchema } from './schemas/offer-letter.schema';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: OfferLetter.name, schema: OfferLetterSchema },
    ]),
  ],
  controllers: [JobOpeningsController, PublicOfferController, PublicJobsController],
  providers: [JobOpeningsService],
  exports: [JobOpeningsService],
})
export class JobOpeningsModule {}


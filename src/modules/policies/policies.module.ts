import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PrismaModule } from '../../database/prisma/prisma.module';
import {
  PolicyDocument,
  PolicyDocumentSchema,
} from './schemas/policy-document.schema';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: PolicyDocument.name, schema: PolicyDocumentSchema },
    ]),
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}


import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShoutoutsService } from './shoutouts.service';
import { ShoutoutsController } from './shoutouts.controller';
import { Shoutout, ShoutoutSchema } from './schemas/shoutout.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shoutout.name, schema: ShoutoutSchema },
    ]),
  ],
  controllers: [ShoutoutsController],
  providers: [ShoutoutsService],
  exports: [ShoutoutsService],
})
export class ShoutoutsModule {}


import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfilePhotosController } from './profile-photos.controller';
import { ProfilePhotosService } from './profile-photos.service';
import {
  ProfilePhoto,
  ProfilePhotoSchema,
} from './schemas/profile-photo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProfilePhoto.name, schema: ProfilePhotoSchema },
    ]),
  ],
  controllers: [ProfilePhotosController],
  providers: [ProfilePhotosService],
  exports: [ProfilePhotosService],
})
export class ProfilePhotosModule {}


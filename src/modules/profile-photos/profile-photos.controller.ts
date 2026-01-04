import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ProfilePhotosService } from './profile-photos.service';
import { Public } from '../../common/decorators';

@Controller('profile-photos')
export class ProfilePhotosController {
  constructor(private readonly profilePhotosService: ProfilePhotosService) {}

  /**
   * Get profile photo by employee ID
   * This endpoint is public to allow images to be displayed in img tags
   */
  @Public()
  @Get(':employeeId')
  async getPhoto(
    @Param('employeeId') employeeId: string,
    @Res() res: Response,
  ) {
    const photo = await this.profilePhotosService.getPhoto(employeeId);

    if (!photo) {
      throw new NotFoundException('Profile photo not found');
    }

    // Set appropriate headers
    res.set({
      'Content-Type': photo.mimeType,
      'Content-Length': photo.data.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });

    // Send the binary data
    res.send(photo.data);
  }
}


import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProfilePhoto,
  ProfilePhotoDocument,
} from './schemas/profile-photo.schema';

@Injectable()
export class ProfilePhotosService {
  private readonly logger = new Logger(ProfilePhotosService.name);

  constructor(
    @InjectModel(ProfilePhoto.name)
    private profilePhotoModel: Model<ProfilePhotoDocument>,
  ) {}

  /**
   * Upload or update a profile photo for an employee
   */
  async uploadPhoto(
    employeeId: string,
    file: Express.Multer.File,
  ): Promise<ProfilePhoto> {
    this.logger.log(`Uploading profile photo for employee: ${employeeId}`);

    // Upsert - update if exists, create if not
    const result = await this.profilePhotoModel.findOneAndUpdate(
      { employeeId },
      {
        employeeId,
        data: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
        size: file.size,
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Profile photo saved for employee: ${employeeId}`);
    return result;
  }

  /**
   * Get a profile photo by employee ID
   */
  async getPhoto(
    employeeId: string,
  ): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
    const photo = await this.profilePhotoModel.findOne({ employeeId });

    if (!photo) {
      return null;
    }

    return {
      data: photo.data,
      mimeType: photo.mimeType,
      filename: photo.filename,
    };
  }

  /**
   * Check if an employee has a profile photo
   */
  async hasPhoto(employeeId: string): Promise<boolean> {
    const count = await this.profilePhotoModel.countDocuments({ employeeId });
    return count > 0;
  }

  /**
   * Delete a profile photo
   */
  async deletePhoto(employeeId: string): Promise<boolean> {
    const result = await this.profilePhotoModel.deleteOne({ employeeId });
    return result.deletedCount > 0;
  }

  /**
   * Get photo metadata (without binary data)
   */
  async getPhotoMetadata(
    employeeId: string,
  ): Promise<{ mimeType: string; filename: string; size: number } | null> {
    const photo = await this.profilePhotoModel
      .findOne({ employeeId })
      .select('mimeType filename size')
      .lean();

    if (!photo) {
      return null;
    }

    return {
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size,
    };
  }
}


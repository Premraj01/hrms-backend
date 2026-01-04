import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shoutout, ShoutoutDocument, ShoutoutType } from './schemas/shoutout.schema';
import { CreateShoutoutDto } from './dto/create-shoutout.dto';

@Injectable()
export class ShoutoutsService {
  private readonly logger = new Logger(ShoutoutsService.name);

  constructor(
    @InjectModel(Shoutout.name)
    private shoutoutModel: Model<ShoutoutDocument>,
  ) {}

  /**
   * Create a new shoutout
   */
  async create(
    createShoutoutDto: CreateShoutoutDto,
    givenById: string,
    givenByName: string,
    givenByPhoto?: string,
  ): Promise<Shoutout> {
    this.logger.log(`Creating shoutout from ${givenByName}`);

    const shoutout = new this.shoutoutModel({
      ...createShoutoutDto,
      givenById,
      givenByName,
      givenByPhoto,
    });

    return shoutout.save();
  }

  /**
   * Get all shoutouts (with pagination)
   */
  async findAll(limit = 50, skip = 0): Promise<Shoutout[]> {
    this.logger.log('Fetching all shoutouts');

    return this.shoutoutModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Get recent shoutouts for dashboard
   */
  async findRecent(limit = 10): Promise<Shoutout[]> {
    this.logger.log('Fetching recent shoutouts');

    return this.shoutoutModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get shoutouts by type
   */
  async findByType(type: ShoutoutType, limit = 20): Promise<Shoutout[]> {
    this.logger.log(`Fetching shoutouts of type: ${type}`);

    return this.shoutoutModel
      .find({ type, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get shoutouts received by an employee
   */
  async findByRecipient(recipientId: string): Promise<Shoutout[]> {
    this.logger.log(`Fetching shoutouts for recipient: ${recipientId}`);

    return this.shoutoutModel
      .find({ recipientId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get shoutouts given by an employee
   */
  async findByGiver(givenById: string): Promise<Shoutout[]> {
    this.logger.log(`Fetching shoutouts given by: ${givenById}`);

    return this.shoutoutModel
      .find({ givenById, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get shoutouts for a project
   */
  async findByProject(projectId: string): Promise<Shoutout[]> {
    this.logger.log(`Fetching shoutouts for project: ${projectId}`);

    return this.shoutoutModel
      .find({ projectId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get a single shoutout by ID
   */
  async findOne(id: string): Promise<Shoutout> {
    const shoutout = await this.shoutoutModel.findById(id).exec();

    if (!shoutout) {
      throw new NotFoundException('Shoutout not found');
    }

    return shoutout;
  }

  /**
   * Delete a shoutout (soft delete)
   */
  async delete(id: string): Promise<Shoutout> {
    this.logger.log(`Deleting shoutout: ${id}`);

    const shoutout = await this.shoutoutModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!shoutout) {
      throw new NotFoundException('Shoutout not found');
    }

    return shoutout;
  }

  /**
   * Get shoutout count
   */
  async getCount(): Promise<number> {
    return this.shoutoutModel.countDocuments({ isActive: true }).exec();
  }
}


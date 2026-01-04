import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a new notification
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for recipient: ${createNotificationDto.recipientId}`);
    
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  /**
   * Create multiple notifications (for department-wide notifications)
   */
  async createMany(createNotificationDtos: CreateNotificationDto[]): Promise<NotificationDocument[]> {
    this.logger.log(`Creating ${createNotificationDtos.length} notifications`);

    return this.notificationModel.insertMany(createNotificationDtos);
  }

  /**
   * Get all notifications for a user
   */
  async findByRecipient(recipientId: string, limit = 50): Promise<Notification[]> {
    this.logger.log(`Fetching notifications for recipient: ${recipientId}`);
    
    return this.notificationModel
      .find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId, isRead: false }).exec();
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, recipientId: string): Promise<Notification> {
    this.logger.log(`Marking notification ${id} as read`);
    
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, recipientId },
      { isRead: true, readAt: new Date() },
      { new: true },
    ).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(recipientId: string): Promise<{ modifiedCount: number }> {
    this.logger.log(`Marking all notifications as read for recipient: ${recipientId}`);
    
    const result = await this.notificationModel.updateMany(
      { recipientId, isRead: false },
      { isRead: true, readAt: new Date() },
    ).exec();

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete a notification
   */
  async delete(id: string, recipientId: string): Promise<void> {
    this.logger.log(`Deleting notification ${id}`);
    
    const result = await this.notificationModel.deleteOne({ _id: id, recipientId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(recipientId: string): Promise<{ deletedCount: number }> {
    this.logger.log(`Deleting all notifications for recipient: ${recipientId}`);
    
    const result = await this.notificationModel.deleteMany({ recipientId }).exec();

    return { deletedCount: result.deletedCount };
  }

  /**
   * Delete old read notifications (cleanup job)
   */
  async deleteOldReadNotifications(daysOld = 30): Promise<{ deletedCount: number }> {
    this.logger.log(`Deleting read notifications older than ${daysOld} days`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationModel.deleteMany({
      isRead: true,
      readAt: { $lt: cutoffDate },
    }).exec();

    return { deletedCount: result.deletedCount };
  }
}


import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Get all notifications for the current user
   * GET /api/notifications
   */
  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Fetching notifications for user ${user.id}`);
    return this.notificationsService.findByRecipient(user.id, limit);
  }

  /**
   * Get unread count for the current user
   * GET /api/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  /**
   * Mark a notification as read
   * POST /api/notifications/:id/read
   */
  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.logger.log(`Marking notification ${id} as read for user ${user.id}`);
    const notification = await this.notificationsService.markAsRead(id, user.id);
    
    // Update unread count via WebSocket
    await this.notificationsGateway.updateUnreadCount(user.id);
    
    return notification;
  }

  /**
   * Mark all notifications as read
   * POST /api/notifications/read-all
   */
  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`Marking all notifications as read for user ${user.id}`);
    const result = await this.notificationsService.markAllAsRead(user.id);
    
    // Update unread count via WebSocket
    await this.notificationsGateway.updateUnreadCount(user.id);
    
    return result;
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:id
   */
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    this.logger.log(`Deleting notification ${id} for user ${user.id}`);
    await this.notificationsService.delete(id, user.id);
    return { success: true };
  }

  /**
   * Delete all notifications
   * DELETE /api/notifications
   */
  @Delete()
  async deleteAllNotifications(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`Deleting all notifications for user ${user.id}`);
    const result = await this.notificationsService.deleteAll(user.id);
    return result;
  }
}


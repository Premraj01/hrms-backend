import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = payload.sub;
      
      // Store user-socket mapping
      this.userSockets.set(userId, client.id);
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id}, User: ${userId}`);

      // Send unread count on connection
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      client.emit('unreadCount', { count: unreadCount });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.delete(userId);
      this.logger.log(`Client disconnected: ${client.id}, User: ${userId}`);
    }
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: Notification) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      this.logger.log(`Sent notification to user ${userId}`);
    } else {
      this.logger.debug(`User ${userId} is not connected`);
    }
  }

  /**
   * Send notifications to multiple users
   */
  sendNotificationsToUsers(userIds: string[], notification: Notification) {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Update unread count for a user
   */
  async updateUnreadCount(userId: string) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      this.server.to(socketId).emit('unreadCount', { count: unreadCount });
    }
  }

  @SubscribeMessage('getNotifications')
  async handleGetNotifications(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const notifications = await this.notificationsService.findByRecipient(userId);
    return { event: 'notifications', data: notifications };
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = client.data.userId;
    await this.notificationsService.markAsRead(data.notificationId, userId);
    await this.updateUnreadCount(userId);
    return { event: 'markedAsRead', data: { success: true } };
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.notificationsService.markAllAsRead(userId);
    await this.updateUnreadCount(userId);
    return { event: 'markedAllAsRead', data: { success: true } };
  }
}


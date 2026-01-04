import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ShoutoutsModule } from './modules/shoutouts/shoutouts.module';
import { EventsModule } from './modules/events/events.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { ProfilePhotosModule } from './modules/profile-photos/profile-photos.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { JobOpeningsModule } from './modules/job-openings/job-openings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuditMiddleware } from './common/middleware/audit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || process.env.MONGODB_URI,
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    DepartmentsModule,
    DesignationsModule,
    EmployeesModule,
    LeavesModule,
    ChatbotModule,
    NotificationsModule,
    ProductsModule,
    ProjectsModule,
    ShoutoutsModule,
    EventsModule,
    HolidaysModule,
    ProfilePhotosModule,
    PoliciesModule,
    DocumentsModule,
    JobOpeningsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');

    consumer
      .apply(AuditMiddleware)
      .forRoutes('*');
  }
}

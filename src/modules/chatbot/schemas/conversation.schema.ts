import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Message, MessageSchema } from './message.schema';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Index for faster queries
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });


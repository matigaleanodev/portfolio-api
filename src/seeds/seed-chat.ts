import 'dotenv/config';
import mongoose from 'mongoose';
import { ChatFaq, ChatFaqSchema } from '../chat/chat-faq.schema';
import { chatFaqSeed } from './chat-faq.seed';

async function run(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI no está definido');
  }

  await mongoose.connect(mongoUri);

  const ChatFaqModel =
    mongoose.models[ChatFaq.name] ??
    mongoose.model(ChatFaq.name, ChatFaqSchema);

  try {
    await ChatFaqModel.deleteMany({});
    await ChatFaqModel.insertMany(chatFaqSeed);
  } finally {
    await mongoose.connection.close();
  }
}

void run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Error desconocido en seed';
  console.error(message);
  process.exitCode = 1;
});

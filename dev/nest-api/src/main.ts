import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID,
        brokers: [process.env.KAFKA_BROKER],
      },
      consumer: {
        groupId:
          !process.env.KAFKA_CONSUMER_GROUP_ID ||
          process.env.KAFKA_CONSUMER_GROUP_ID === ''
            ? `my-consumer-${Math.random()}`
            : process.env.KAFKA_CONSUMER_GROUP_ID,
      },
    },
  });

  await app.startAllMicroservicesAsync();
  await app.listen(process.env.PORT || '3000');
}
bootstrap();

import { BackgroundController } from './controllers/background.controller';

const bootstrap = async () => {
  await BackgroundController.instance().run();
};

bootstrap().catch((error) => {
  console.error('[Background] Fatal error during bootstrap', error);
});

import { BackgroundController } from './controllers/BackgroundController';
import { itemsDataService } from '../shared/services/ItemsDataService';

const bootstrap = async () => {
  try {
    await itemsDataService.init();
  } catch (error) {
    console.error('[Background] Failed to initialize items data service', error);
  }

  await BackgroundController.instance().run();
};

bootstrap().catch((error) => {
  console.error('[Background] Fatal error during bootstrap', error);
});


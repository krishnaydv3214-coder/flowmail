// Load environment variables immediately before any other imports are evaluated
import 'dotenv/config';

import { initDatabase } from '../src/lib/db/init';

initDatabase()
  .then(() => {
    console.log('Setup finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });

import * as migration_20260709_235205 from './20260709_235205';
import * as migration_20260710_001958_username_auth from './20260710_001958_username_auth';

export const migrations = [
  {
    up: migration_20260709_235205.up,
    down: migration_20260709_235205.down,
    name: '20260709_235205',
  },
  {
    up: migration_20260710_001958_username_auth.up,
    down: migration_20260710_001958_username_auth.down,
    name: '20260710_001958_username_auth'
  },
];

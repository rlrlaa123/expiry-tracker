import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** enableChangeListener: useLiveQuery가 데이터 변경을 구독하기 위해 필요 */
export const expoDb = openDatabaseSync('expiry-tracker.db', { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

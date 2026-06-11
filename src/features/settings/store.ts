import { File, Paths } from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { DigestSettings } from '@/domain/notification-planner';

/** 설정 보관소 — 기기 로컬 settings.json (ADR 009). 데이터 모델(SQLite)과 분리 */
const settingsFile = new File(Paths.document, 'settings.json');

const fileStorage: StateStorage = {
  getItem: () => {
    try {
      return settingsFile.exists ? settingsFile.textSync() : null;
    } catch {
      return null;
    }
  },
  setItem: (_name, value) => {
    try {
      settingsFile.write(value);
    } catch {
      // 저장 실패해도 메모리 상태로 동작
    }
  },
  removeItem: () => {
    try {
      settingsFile.delete();
    } catch {
      // 무시
    }
  },
};

export interface SettingsState extends DigestSettings {
  setTime: (hour: number, minute: number) => void;
  setStage: (key: keyof DigestSettings['stages'], on: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      // 기본: 매일 09:00, 전 단계 on (SPEC §4)
      hour: 9,
      minute: 0,
      stages: { d30: true, d7: true, d1: true, d0: true },
      setTime: (hour, minute) => set({ hour, minute }),
      setStage: (key, on) => set((s) => ({ stages: { ...s.stages, [key]: on } })),
    }),
    {
      name: 'expiry-tracker-settings',
      storage: createJSONStorage(() => fileStorage),
      partialize: (s) => ({ hour: s.hour, minute: s.minute, stages: s.stages }),
    },
  ),
);

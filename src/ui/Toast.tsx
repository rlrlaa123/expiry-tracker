import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { spacing } from '@/ui/tokens';

/** 목업 .toast — 하단 다크 스낵바, 2.6초 후 자동 사라짐 */
const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  // Animated.Value는 렌더에서 읽어도 되는 안정 객체 — ref 대신 state 초기화로 보관
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMsg(next);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(
          () => setMsg(null),
        );
      }, 2600);
    },
    [opacity],
  );

  const translateY = useMemo(
    () => opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
    [opacity],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.text}>{msg}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 88,
    backgroundColor: '#22241F',
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13.5,
  },
});

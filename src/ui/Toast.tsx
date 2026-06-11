import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { spacing } from '@/ui/tokens';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

/** 목업 .toast — 하단 다크 스낵바 (+선택 액션 버튼), 자동 사라짐 */
const ToastContext = createContext<(msg: string, action?: ToastAction) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<{ msg: string; action?: ToastAction } | null>(null);
  // Animated.Value는 렌더에서 읽어도 되는 안정 객체 — ref 대신 state 초기화로 보관
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
      setContent(null),
    );
  }, [opacity]);

  const show = useCallback(
    (msg: string, action?: ToastAction) => {
      setContent({ msg, action });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      // 액션이 있으면 누를 시간을 조금 더 준다 (목업 3.2s)
      hideTimer.current = setTimeout(hide, action ? 3200 : 2600);
    },
    [opacity, hide],
  );

  const translateY = useMemo(
    () => opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
    [opacity],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {content !== null && (
        <Animated.View
          pointerEvents={content.action ? 'box-none' : 'none'}
          style={[styles.toast, { opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.text}>{content.msg}</Text>
          {content.action ? (
            <Pressable
              onPress={() => {
                if (hideTimer.current) clearTimeout(hideTimer.current);
                hide();
                content.action?.onPress();
              }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.actionLabel}>{content.action.label}</Text>
            </Pressable>
          ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13.5,
    flexShrink: 1,
  },
  actionLabel: {
    color: '#7FD4BC',
    fontWeight: '700',
    fontSize: 14,
  },
});

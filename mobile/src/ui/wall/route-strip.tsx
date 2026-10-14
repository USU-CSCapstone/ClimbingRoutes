import { useEffect, useRef } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Uuid } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/text';
import { GradePill, NumberBadge } from '@/ui/wall/parts';
import { CARD_HEIGHT, RouteCard } from '@/ui/wall/route-card';
import type { ShownRoute } from '@/ui/wall/types';

export const PILL_HEIGHT = 46;
const SIDE = Spacing.three;
const GAP = Spacing.two + Spacing.half;
/** How much of the next card shows, so it's clear the cards swipe. */
const PEEK = 30;
/** Room under the cards for their shadow, which the scroll view would otherwise clip. */
const SHADOW_ROOM = Spacing.three;

/** How tall the strip is, so the camera can frame routes above it. */
export function stripHeight(cards: boolean): number {
  return cards ? CARD_HEIGHT + SHADOW_ROOM : PILL_HEIGHT;
}

/**
 * The bottom of the phone layout. With no route selected, a row of route
 * pills; with one, a card per route that swipes left and right, and the
 * card that comes to rest becomes the selected route.
 */
export function RouteStrip({
  routes,
  index,
  linesKnown,
  onSelect,
}: {
  routes: ShownRoute[];
  /** The selected route's place in `routes`, or -1. */
  index: number;
  linesKnown: boolean;
  onSelect: (uuid: Uuid | null) => void;
}) {
  if (index < 0) return <RoutePills routes={routes} linesKnown={linesKnown} onSelect={onSelect} />;
  return <RouteCards routes={routes} index={index} linesKnown={linesKnown} onSelect={onSelect} />;
}

function RoutePills({
  routes,
  linesKnown,
  onSelect,
}: {
  routes: ShownRoute[];
  linesKnown: boolean;
  onSelect: (uuid: Uuid) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {routes.map((route) => (
        <Pressable
          key={route.uuid}
          role="button"
          accessibilityLabel={`${route.number}. ${route.name}, ${route.grade?.text ?? 'no grade'}`}
          onPress={() => onSelect(route.uuid)}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: theme.background, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <NumberBadge route={route} linesKnown={linesKnown} size={32} />
          <AppText numberOfLines={1} style={styles.pillName}>
            {route.name}
          </AppText>
          <GradePill grade={route.grade} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function RouteCards({
  routes,
  index,
  linesKnown,
  onSelect,
}: {
  routes: ShownRoute[];
  index: number;
  linesKnown: boolean;
  onSelect: (uuid: Uuid | null) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 2 * SIDE - PEEK, 420);
  const interval = cardWidth + GAP;
  const list = useRef<FlatList<ShownRoute>>(null);
  /** The card the strip rests on, which matches the selection once a swipe settles. */
  const resting = useRef(index);
  const offset = useRef(index * interval);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A route picked on the model or with the arrows slides its card into place.
  useEffect(() => {
    if (resting.current === index) return;
    resting.current = index;
    list.current?.scrollToOffset({ offset: index * interval, animated: true });
  }, [index, interval]);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  // Native snaps on its own; web has no interval snapping, so both also snap here once scrolling stops.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    offset.current = e.nativeEvent.contentOffset.x;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const nearest = Math.max(0, Math.min(routes.length - 1, Math.round(offset.current / interval)));
      if (Math.abs(offset.current - nearest * interval) > 1) {
        list.current?.scrollToOffset({ offset: nearest * interval, animated: true });
      }
      if (nearest !== resting.current) {
        resting.current = nearest;
        onSelect(routes[nearest].uuid);
      }
    }, 140);
  }

  return (
    <FlatList
      ref={list}
      horizontal
      data={routes}
      keyExtractor={(r) => r.uuid}
      getItemLayout={(_, i) => ({ length: interval, offset: interval * i, index: i })}
      initialScrollIndex={index}
      snapToInterval={interval}
      decelerationRate="fast"
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={32}
      style={{ height: stripHeight(true) }}
      contentContainerStyle={{ paddingLeft: SIDE, paddingRight: width - SIDE - cardWidth }}
      renderItem={({ item, index: i }) => (
        <View style={{ width: interval }}>
          <RouteCard
            route={item}
            index={i}
            total={routes.length}
            linesKnown={linesKnown}
            onPrevious={() => onSelect(routes[i - 1]?.uuid ?? item.uuid)}
            onNext={() => onSelect(routes[i + 1]?.uuid ?? item.uuid)}
            onClose={() => onSelect(null)}
            style={{ width: cardWidth }}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pills: { paddingHorizontal: SIDE, gap: Spacing.two },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.one + Spacing.half,
    paddingRight: Spacing.two + Spacing.half,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillName: { fontWeight: '600', maxWidth: 160 },
  pressed: { opacity: 0.75 },
});

// Pictures the photo tips page is built from: cuts of Home's still of Date
// Wall, and the row of photo frames at the top of the page.
import { Image } from 'expo-image';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { FEATURED_WALL } from '@/ui/home/featured-wall';
import { CLIP } from '@/ui/home/kit';
import { FRAME } from '@/ui/tips/card';

/**
 * A cut of the Date Wall still filling a box. The picture is `picWidth` wide,
 * and `focusX` and `focusY` are the share of its overflow cut from the left and top.
 */
export function WallCut({
  width,
  height,
  picWidth,
  focusX = 0.5,
  focusY = 0.5,
  style,
}: {
  width: number;
  height: number;
  picWidth: number;
  focusX?: number;
  focusY?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const picHeight = picWidth / FEATURED_WALL.aspect;
  return (
    <View style={[{ width, height, overflow: CLIP }, style]}>
      <Image
        source={FEATURED_WALL.plain}
        contentFit="fill"
        style={{
          position: 'absolute',
          width: picWidth,
          height: picHeight,
          left: -(picWidth - width) * focusX,
          top: -(picHeight - height) * focusY,
        }}
      />
    </View>
  );
}

/**
 * A walk along the wall as a row of photos, each covering most of the one
 * before, with the newest in blue. Drawn 264 wide and scaled to `width`.
 */
export function PhotoFrames({ width }: { width: number }) {
  return (
    <Svg pointerEvents="none" width={width} height={(width * 142) / 264} viewBox="0 0 264 142">
      {[0.22, 0.34, 0.48, 0.64, 0.82].map((opacity, i) => (
        <Rect
          key={opacity}
          x={5 + i * 34}
          y={3}
          width={84}
          height={112}
          rx={9}
          fill="#FFFFFF"
          fillOpacity={0.03}
          stroke="#FFFFFF"
          strokeWidth={1.8}
          opacity={opacity}
        />
      ))}
      <Rect x={175} y={3} width={84} height={112} rx={9} fill={FRAME} fillOpacity={0.16} stroke={FRAME} strokeWidth={2.5} />
      <Path d="M47 131h186" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeDasharray="1 9" opacity={0.85} />
      <Path d="M233 131h20M246 124l8 7-8 7" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </Svg>
  );
}

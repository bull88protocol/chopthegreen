import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE } from '../lib/social';
import { PHOTO_SCRIM, radius, useColors, useStyles, type Colors } from '../theme';
import { Tap, Txt } from './ui';

/** YouTube's own thumbnail CDN — no API key needed. */
export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Opens the video in the native YouTube app when it's installed, falling back
 * to an in-app browser tab. Going out to the app is what earns a proper view
 * on the channel and puts the subscribe button in front of the viewer.
 */
export async function openOnYouTube(id: string) {
  const appUrl = Platform.select({
    ios: `youtube://www.youtube.com/watch?v=${id}`,
    default: `vnd.youtube:${id}`,
  })!;
  try {
    if (await Linking.canOpenURL(appUrl)) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {
    // canOpenURL can throw when the scheme isn't declared; fall through.
  }
  try {
    await WebBrowser.openBrowserAsync(watchUrl(id));
  } catch {
    await Linking.openURL(watchUrl(id)).catch(() => {});
  }
}

/**
 * Poster first, player on tap. Embedding rather than auto-opening YouTube
 * keeps the cook inside the recipe, and embedded plays still count as views.
 */
export function VideoCard({ id, isShort, title }:
  { id: string; isShort?: boolean; title?: string }) {
  const [playing, setPlaying] = useState(false);
  // If the embed is refused (owner disabled embedding, region block), fall
  // back to the poster rather than leaving YouTube's error card on screen.
  const [failed, setFailed] = useState(false);
  const c = useColors();
  const s = useStyles(styles);

  // Shorts are vertical; a 16:9 frame would letterbox them badly.
  const aspect = isShort ? 9 / 16 : 16 / 9;

  // These videos are already embedded on chopthegreens.com, so presenting that
  // as the embedding origin is both accurate and the domain YouTube expects.
  // Claiming youtube.com as the origin is self-referential and gets refused
  // with "Video unavailable, error 152".
  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="referrer" content="origin">
<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}
iframe{border:0;width:100%;height:100%;display:block}</style></head><body>
<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(SITE)}"
 allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
 referrerpolicy="origin"
 allowfullscreen></iframe></body></html>`;

  return (
    <View style={{ marginTop: 8 }}>
      <View style={[s.frame, { aspectRatio: aspect }]}>
        {playing && !failed ? (
          <WebView
            source={{ html, baseUrl: SITE }}
            style={{ flex: 1, backgroundColor: '#000' }}
            // Android WebView's default UA carries a "wv" token, and YouTube
            // serves "Video unavailable" to it. Presenting a plain Chrome UA
            // is the other half of the error-152 fix.
            userAgent={Platform.OS === 'android'
              ? 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
              : undefined}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
          />
        ) : (
          <Tap onPress={() => setPlaying(true)} haptic="medium" style={StyleSheet.absoluteFill}>
            <Image source={thumbUrl(id)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <View style={s.posterVeil} />
            <View style={s.playWrap}>
              <View style={s.play}>
                <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
              </View>
            </View>
          </Tap>
        )}
      </View>

      <Tap onPress={() => void openOnYouTube(id)} haptic="light" style={s.ytRow}>
        <Ionicons name="logo-youtube" size={17} color="#FF0033" />
        <Txt variant="smallMed" color={c.textSoft} style={{ flex: 1 }} numberOfLines={1}>
          Watch on YouTube
        </Txt>
        <Ionicons name="open-outline" size={15} color={c.textMute} />
      </Tap>
    </View>
  );
}

const styles = (c: Colors) => ({
  frame: {
    width: '100%' as const, borderRadius: radius.md,
    overflow: 'hidden' as const, backgroundColor: '#000',
  },
  posterVeil: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,13,11,0.28)' },
  playWrap: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  play: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,0,51,0.92)',
    borderWidth: 2, borderColor: PHOTO_SCRIM.chipBorder,
  },
  ytRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10,
    marginTop: 10, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.md, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.hairline,
  },
});

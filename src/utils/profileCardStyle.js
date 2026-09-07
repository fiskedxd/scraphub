export const CARD_PRESETS = {
  dark: {
    bgColor: '#050505',
    bgOpacity: 95,
    blur: 0,
    borderColor: '#ffffff',
    borderOpacity: 12,
    textColor: '#ffffff',
    radius: 16,
    overlay: 40,
    shadow: 'soft'
  },
  light: {
    bgColor: '#ffffff',
    bgOpacity: 95,
    blur: 0,
    borderColor: '#d4d4d8',
    borderOpacity: 80,
    textColor: '#0a0a0a',
    radius: 16,
    overlay: 22,
    shadow: 'soft'
  },
  glass: {
    bgColor: '#ffffff',
    bgOpacity: 12,
    blur: 22,
    borderColor: '#ffffff',
    borderOpacity: 22,
    textColor: '#ffffff',
    radius: 18,
    overlay: 38,
    shadow: 'glow'
  },
  invisible: {
    bgColor: '#000000',
    bgOpacity: 0,
    blur: 0,
    borderColor: '#ffffff',
    borderOpacity: 0,
    textColor: '#ffffff',
    radius: 16,
    overlay: 15,
    shadow: 'none'
  }
};

export const CARD_PRESET_LABELS = {
  dark: 'Sombre',
  light: 'Clair',
  glass: 'Verre',
  invisible: 'Invisible',
  custom: 'Perso'
};

function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function hexToRgba(hex, opacityPercent) {
  const raw = String(hex || '#000000').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(0, 0, 0, ${clamp(opacityPercent, 0, 100) / 100})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacityPercent, 0, 100) / 100})`;
}

export function presetToCardFields(name) {
  const preset = CARD_PRESETS[name] || CARD_PRESETS.dark;
  return {
    profileTheme: name,
    cardBgColor: preset.bgColor,
    cardBgOpacity: preset.bgOpacity,
    cardBlur: preset.blur,
    cardBorderColor: preset.borderColor,
    cardBorderOpacity: preset.borderOpacity,
    cardTextColor: preset.textColor,
    cardRadius: preset.radius,
    bannerOverlay: preset.overlay,
    cardShadow: preset.shadow
  };
}

export function normalizeCardFields(source = {}) {
  const theme = source.profileTheme && CARD_PRESETS[source.profileTheme] ? source.profileTheme : 'dark';
  const fallback = CARD_PRESETS[theme];
  const stored = source.cardStyle && typeof source.cardStyle === 'object' ? source.cardStyle : {};
  return {
    profileTheme: source.profileTheme === 'custom' ? 'custom' : theme,
    cardBgColor: stored.bgColor || source.cardBgColor || fallback.bgColor,
    cardBgOpacity: stored.bgOpacity ?? source.cardBgOpacity ?? fallback.bgOpacity,
    cardBlur: stored.blur ?? source.cardBlur ?? fallback.blur,
    cardBorderColor: stored.borderColor || source.cardBorderColor || fallback.borderColor,
    cardBorderOpacity: stored.borderOpacity ?? source.cardBorderOpacity ?? fallback.borderOpacity,
    cardTextColor: stored.textColor || source.cardTextColor || fallback.textColor,
    cardRadius: stored.radius ?? source.cardRadius ?? fallback.radius,
    bannerOverlay: stored.overlay ?? source.bannerOverlay ?? fallback.overlay,
    cardShadow: stored.shadow || source.cardShadow || fallback.shadow
  };
}

export function fieldsToCardStyle(fields) {
  return {
    bgColor: fields.cardBgColor,
    bgOpacity: clamp(fields.cardBgOpacity, 0, 100),
    blur: clamp(fields.cardBlur, 0, 40),
    borderColor: fields.cardBorderColor,
    borderOpacity: clamp(fields.cardBorderOpacity, 0, 100),
    textColor: fields.cardTextColor,
    radius: clamp(fields.cardRadius, 0, 40),
    overlay: clamp(fields.bannerOverlay, 0, 80),
    shadow: fields.cardShadow || 'none'
  };
}

function shadowCss(kind) {
  if (kind === 'glow') return '0 0 40px rgba(255,255,255,0.12), 0 18px 40px rgba(0,0,0,0.25)';
  if (kind === 'soft') return '0 18px 40px rgba(0,0,0,0.28)';
  return 'none';
}

export function getProfileCardCss(fields) {
  const card = fieldsToCardStyle(fields);
  const blur = card.blur;
  return {
    backgroundColor: hexToRgba(card.bgColor, card.bgOpacity),
    borderColor: hexToRgba(card.borderColor, card.borderOpacity),
    color: card.textColor,
    borderRadius: `${card.radius}px`,
    borderWidth: '1px',
    borderStyle: 'solid',
    backdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
    WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : 'none',
    boxShadow: shadowCss(card.shadow)
  };
}

export function getMutedTextColor(fields) {
  return hexToRgba(fields.cardTextColor || '#ffffff', 62);
}

export function getInnerTileCss(fields) {
  const opacity = Math.max(0, Math.min(18, Number(fields.cardBgOpacity) || 0));
  const border = Math.max(0, Number(fields.cardBorderOpacity) || 0);
  return {
    backgroundColor: hexToRgba(fields.cardBgColor || '#ffffff', opacity),
    borderColor: hexToRgba(fields.cardBorderColor || '#ffffff', border),
    color: fields.cardTextColor || '#ffffff'
  };
}

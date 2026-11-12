export const colors = {
  bg: '#F3F4FA',
  card: '#FFFFFF',
  text: '#161A2E',
  muted: '#646A85',
  faint: '#9AA0B8',
  primary: '#5B4CF0',
  primarySoft: '#ECEAFE',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  ok: '#17A34A',
  okSoft: '#E5F7EC',
  warn: '#F5A524',
  border: '#E4E6F0',
  // Lock screen
  lockTop: '#1D1747',
  lockBottom: '#4A2A9C',
  lockCard: 'rgba(255,255,255,0.09)',
  lockText: '#FFFFFF',
  lockMuted: '#C8C3EC',
  accent: '#FFC94A',
};

export const radius = { sm: 10, md: 16, lg: 24 };

export const shadow = {
  shadowColor: '#1B1D3A',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const errorText: Record<string, string> = {
  invalid_pin: 'PIN musí mít 4–8 číslic.',
  wrong_pin: 'Špatný PIN.',
  locked: 'Nejdřív vypněte zámek.',
  no_pin: 'Nejdřív nastavte PIN.',
  accessibility_disabled: 'Zapněte službu „Rodičovský zámek“ v Usnadnění přístupu.',
  device_admin_inactive: 'Zapněte ochranu proti odinstalování.',
  not_locked: 'Zámek už není zapnutý.',
};

export function waitText(ms: number) {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `Zkuste to znovu za ${Math.ceil(s / 60)} min.` : `Zkuste to znovu za ${s} s.`;
}

/** 1:05:09 / 5:09 */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function formatClock(ts: number) {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 1 ? 'hodina' : h < 5 ? 'hodiny' : 'hodin';
  return m ? `${h} h ${m} min` : `${h} ${hours}`;
}

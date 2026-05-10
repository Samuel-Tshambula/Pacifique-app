/**
 * src/services/sounds.ts
 * Sons de l'application — utilisés avec l'API Web Audio (pas de dépendance externe).
 * Sons discrets et professionnels, uniquement sur les actions importantes.
 */

// type SoundType =
//   | 'success'      // Commande validée, paiement, check-in
//   | 'notification' // Commande prête à servir
//   | 'error'        // Erreur critique
//   | 'click'        // Clic produit dans la commande
//   | 'checkout'     // Check-out hébergement

function getCtx(): AudioContext | null {
  try {
    return new AudioContext()
  } catch {
    return null
  }
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  delay = 0,
  ctx?: AudioContext
) {
  const audioCtx = ctx || getCtx()
  if (!audioCtx) return

  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)

  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0, audioCtx.currentTime + delay)
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + delay + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration)
  osc.start(audioCtx.currentTime + delay)
  osc.stop(audioCtx.currentTime + delay + duration + 0.05)
}

export const sounds = {
  /** Commande validée, paiement réussi — 2 notes montantes */
  success() {
    const ctx = getCtx()
    if (!ctx) return
    playTone(523, 0.12, 'sine', 0.2, 0,    ctx) // Do
    playTone(659, 0.18, 'sine', 0.2, 0.13, ctx) // Mi
  },

  /** Commande prête à servir — 3 bips */
  notification() {
    const ctx = getCtx()
    if (!ctx) return
    ;[0, 0.15, 0.30].forEach((t) => playTone(880, 0.1, 'sine', 0.25, t, ctx))
  },

  /** Erreur — note grave descendante */
  error() {
    const ctx = getCtx()
    if (!ctx) return
    playTone(300, 0.25, 'sine', 0.2, 0, ctx)
  },

  /** Clic produit — tick discret */
  click() {
    const ctx = getCtx()
    if (!ctx) return
    playTone(1200, 0.04, 'sine', 0.08, 0, ctx)
  },

  /** Check-out — accord final */
  checkout() {
    const ctx = getCtx()
    if (!ctx) return
    playTone(392, 0.15, 'sine', 0.18, 0,    ctx) // Sol
    playTone(523, 0.15, 'sine', 0.18, 0.08, ctx) // Do
    playTone(659, 0.22, 'sine', 0.18, 0.16, ctx) // Mi
  },
}

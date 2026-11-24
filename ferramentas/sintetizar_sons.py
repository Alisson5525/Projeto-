"""Sintese procedural dos efeitos sonoros novos (Naruto Striker+ - Edicao Definitiva).

Gera WAV mono 44.1 kHz com numpy e converte para OGG Vorbis (ffmpeg/libvorbis).
Todos os sons sao normalizados para o mesmo pico (-3 dBFS) e recebem fade de
entrada/saida curto (sem estalos). Volumes finais sao ajustados no sound_definitions.
"""
import os, subprocess, sys, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(1337)  # deterministico


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=0.08, curva=3.0):
    e = np.ones(n)
    na, nr = int(SR * a), int(SR * r)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** curva
    return e


def decay(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def sine(f, d, fase=0):
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * t(d) + fase)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + fase)


def ruido(d):
    return rng.standard_normal(int(SR * d))


def lowpass(x, fc):
    # filtro de 1 polo (repetido 2x = 12 dB/oit)
    a = np.exp(-2 * np.pi * fc / SR)
    for _ in range(2):
        y = np.zeros_like(x); acc = 0.0
        for i, v in enumerate(x):
            acc = (1 - a) * v + a * acc; y[i] = acc
        x = y
    return x


def highpass(x, fc):
    return x - lowpass(x, fc)


def mix(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out


def atraso(x, s):
    return np.concatenate([np.zeros(int(SR * s)), x])


def norm(x, pico=0.708):
    m = np.max(np.abs(x)) or 1
    return x / m * pico


# ------------------------------------------------------------------ sons
def ui_clique():
    d = 0.07
    x = sine(1850, d) * decay(int(SR * d), 0.012) + 0.4 * sine(3700, d) * decay(int(SR * d), 0.006)
    return x * env(len(x), 0.001, 0.02)


def ui_abrir():  # pergaminho se abrindo: papel (ruido filtrado) + "whoosh"
    d = 0.42
    n = ruido(d)
    papel = highpass(n, 2500) * (0.25 + 0.75 * np.abs(np.sin(np.linspace(0, 9, len(n))))) * decay(len(n), 0.18)
    sweep = lowpass(n, 900) * np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return mix(papel * 0.6, sweep * 1.4) * env(len(n), 0.01, 0.1)


def desbloqueio():  # arpejo pentatonico com brilho
    notas = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    partes = []
    for i, f in enumerate(notas):
        d = 0.55
        tom = (sine(f, d) + 0.35 * sine(f * 2, d) + 0.12 * sine(f * 3, d)) * decay(int(SR * d), 0.22)
        partes.append(atraso(tom * env(len(tom), 0.004, 0.2), i * 0.075))
    brilho = highpass(ruido(0.9), 6000) * decay(int(SR * 0.9), 0.3) * 0.08
    return mix(*partes, atraso(brilho, 0.3))


def level_up():  # fanfarra curta: acorde maior subindo + taiko
    acorde = [392.0, 493.88, 587.33, 783.99]
    partes = []
    for i, f in enumerate(acorde):
        d = 0.9
        v = sine(f * (1 + 0.003 * np.sin(2 * np.pi * 5 * t(d))), d) if False else sine(f, d)
        tom = (v + 0.5 * sine(f * 2, d) + 0.2 * sine(f * 3, d)) * decay(int(SR * d), 0.35)
        partes.append(atraso(tom * env(len(tom), 0.01, 0.3), i * 0.06))
    taiko = sine(np.linspace(120, 55, int(SR * 0.4)), 0.4) * decay(int(SR * 0.4), 0.09) * 1.6
    return mix(*partes, taiko)


def aviso_perigo():  # dois bipes graves dissonantes (telegrafia de ataque de chefe)
    d = 0.16
    bip = (np.sign(sine(220, d)) * 0.35 + sine(233, d)) * env(int(SR * d), 0.004, 0.05)
    bip = lowpass(bip, 1800)
    return mix(bip, atraso(bip, 0.2))


def fase_chefe():  # impacto grave + subida de tensao
    d = 1.6
    boom = sine(np.linspace(90, 32, int(SR * 0.9)), 0.9) * decay(int(SR * 0.9), 0.3) * 1.5
    rumble = lowpass(ruido(d), 200) * decay(int(SR * d), 0.6) * 2.0
    sobe = sine(np.linspace(110, 330, int(SR * d)), d) * np.linspace(0, 1, int(SR * d)) ** 2 * 0.35
    return mix(boom, rumble, sobe) * env(int(SR * d), 0.002, 0.3)


def atordoado():  # "clang" metalico com estrelas
    d = 0.8
    parciais = [(523, 1.0), (1307, 0.6), (2093, 0.4), (2950, 0.25)]
    x = sum(a * sine(f, d) * decay(int(SR * d), 0.25 / (1 + i * 0.6)) for i, (f, a) in enumerate(parciais))
    estrelas = mix(*[atraso(sine(2637 + 300 * k, 0.12) * decay(int(SR * 0.12), 0.03) * 0.25, 0.12 + 0.09 * k) for k in range(4)])
    return mix(x, estrelas) * 1.0


def esquiva():  # whoosh rapido
    d = 0.28
    n = ruido(d)
    corpo = np.sin(np.linspace(0, np.pi, len(n))) ** 1.5
    x = highpass(lowpass(n, 3500), 400) * corpo
    return x * env(len(x), 0.005, 0.05)


def chakra_carga():  # zumbido que sobe (concentrar chakra)
    d = 0.9
    f = np.linspace(140, 420, int(SR * d))
    x = sine(f, d) + 0.5 * sine(f * 1.5, d) + 0.25 * sine(f * 2.01, d)
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * np.linspace(6, 18, int(SR * d)) * t(d))
    ar = highpass(ruido(d), 3000) * 0.08 * np.linspace(0, 1, int(SR * d))
    return (x * trem * np.linspace(0.2, 1, int(SR * d)) + ar) * env(int(SR * d), 0.02, 0.12)


def impacto():  # soco/golpe pesado
    d = 0.35
    corpo = sine(np.linspace(160, 60, int(SR * d)), d) * decay(int(SR * d), 0.06) * 1.4
    estalo = lowpass(ruido(0.05), 4000) * decay(int(SR * 0.05), 0.01)
    return mix(corpo, estalo) * env(int(SR * d), 0.001, 0.08)


def kawarimi():  # "puf" de fumaca
    d = 0.4
    n = lowpass(ruido(d), 1400)
    x = n * decay(len(n), 0.09) + 0.3 * sine(np.linspace(300, 120, len(n)), d) * decay(len(n), 0.05)
    return x * env(len(x), 0.002, 0.12)


SONS = {
    "ui_clique": ui_clique, "ui_abrir": ui_abrir, "desbloqueio": desbloqueio, "level_up": level_up,
    "aviso_perigo": aviso_perigo, "fase_chefe": fase_chefe, "atordoado": atordoado, "esquiva": esquiva,
    "chakra_carga": chakra_carga, "impacto": impacto, "kawarimi": kawarimi,
}


def salvar(nome, x, pasta):
    x = norm(x)
    pcm = (x * 32767).astype(np.int16)
    wavp = os.path.join(pasta, nome + ".wav")
    with wave.open(wavp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    oggp = os.path.join(pasta, nome + ".ogg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wavp, "-c:a", "libvorbis", "-q:a", "4", oggp], check=True)
    os.remove(wavp)
    return oggp


if __name__ == "__main__":
    pasta = sys.argv[1]
    os.makedirs(pasta, exist_ok=True)
    for n, f in SONS.items():
        p = salvar(n, f(), pasta)
        print(p, os.path.getsize(p))

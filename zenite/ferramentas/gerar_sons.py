#!/usr/bin/env python3
"""Sintetiza os efeitos sonoros do Zênite (originais, gerados do zero).

Cada som é mono, 44,1 kHz, normalizado a -1 dBFS e gravado em OGG Vorbis
(RP/sounds/zenite/<nome>.ogg). Também escreve RP/sounds/sound_definitions.json.
Requer numpy, scipy e ffmpeg com libvorbis.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "RP" / "sounds" / "zenite"
RNG = np.random.default_rng(20261127)


# ------------------------------------------------------------------ ferramentas
def tempo(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def osc(freq, n: int | None = None, forma: str = "sen", fase0: float = 0.0) -> np.ndarray:
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, dtype=float)
    fase = 2 * np.pi * np.cumsum(f) / SR + fase0
    if forma == "sen":
        return np.sin(fase)
    if forma == "serra":
        return 2 * ((fase / (2 * np.pi)) % 1.0) - 1
    if forma == "quadrada":
        return np.sign(np.sin(fase))
    raise ValueError(forma)


def ruido(n: int) -> np.ndarray:
    return RNG.standard_normal(n)


def env_exp(n: int, tau: float, atraso: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.exp(-np.maximum(0, t - atraso) / tau)
    e[t < atraso] = 0
    return e


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    dur = n / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / max(a, 1e-6)
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-6)
    m = t > dur - r
    e[m] *= np.clip((dur - t[m]) / max(r, 1e-6), 0, 1)
    return e


def sweep(f0: float, f1: float, n: int, curva: str = "exp") -> np.ndarray:
    x = np.linspace(0, 1, n)
    return f0 * (f1 / f0) ** x if curva == "exp" else f0 + (f1 - f0) * x


def passa_baixa(x: np.ndarray, fc: float, ordem: int = 2) -> np.ndarray:
    sos = signal.butter(ordem, min(fc, SR / 2 - 100), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def passa_alta(x: np.ndarray, fc: float, ordem: int = 2) -> np.ndarray:
    sos = signal.butter(ordem, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def passa_banda(x: np.ndarray, f0: float, f1: float, ordem: int = 2) -> np.ndarray:
    sos = signal.butter(ordem, [f0, min(f1, SR / 2 - 100)], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def filtro_variavel(x: np.ndarray, cortes: np.ndarray) -> np.ndarray:
    """Passa-baixa de 2 polos com corte variando no tempo (por amostra)."""
    y = np.zeros_like(x)
    a1 = a2 = 0.0
    g = 1 - np.exp(-2 * np.pi * np.clip(cortes, 20, SR / 2 - 100) / SR)
    for i in range(len(x)):
        a1 += g[i] * (x[i] - a1)
        a2 += g[i] * (a1 - a2)
        y[i] = a2
    return y


def reverb(x: np.ndarray, dur: float = 1.6, mix: float = 0.3, brilho: float = 5000) -> np.ndarray:
    n = int(dur * SR)
    ir = ruido(n) * np.exp(-np.arange(n) / SR / (dur / 5))
    ir = passa_baixa(ir, brilho)
    ir /= np.sqrt(np.sum(ir ** 2))
    molhado = np.zeros(len(x) + n)
    conv = signal.fftconvolve(x, ir)
    molhado[: len(conv)] = conv[: len(x) + n]
    seco = np.concatenate([x, np.zeros(n)])
    return (1 - mix) * seco + mix * molhado


def sino(freq: float, dur: float, tau: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    parciais = [(1.0, 1.0, tau), (2.0, 0.45, tau * 0.6), (2.76, 0.3, tau * 0.45), (5.4, 0.12, tau * 0.25), (8.93, 0.05, tau * 0.15)]
    y = sum(a * osc(freq * k, n, fase0=RNG.random() * 6.28) * env_exp(n, tt) for k, a, tt in parciais)
    return y * adsr(n, 0.003, 0.0, 1.0, 0.02)


def colocar(base: np.ndarray, som: np.ndarray, em: float, ganho: float = 1.0) -> np.ndarray:
    i = int(em * SR)
    fim = min(len(base), i + len(som))
    base[i:fim] += ganho * som[: fim - i]
    return base


def finalizar(x: np.ndarray, pico: float = 0.89, fade_ms: float = 8) -> np.ndarray:
    x = x - np.mean(x)
    nf = int(fade_ms / 1000 * SR)
    if nf and len(x) > 2 * nf:
        x[:nf] *= np.linspace(0, 1, nf)
        x[-nf:] *= np.linspace(1, 0, nf)
    m = np.max(np.abs(x))
    return x * (pico / m) if m > 0 else x


# ------------------------------------------------------------------ sons
def veu_on() -> np.ndarray:
    n = int(0.9 * SR)
    f = sweep(700, 1400, n)
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 18 * tempo(0.9))
    brilho = sum(a * osc(f * k, n, fase0=k) for k, a in ((1, 1), (1.5, 0.5), (2.01, 0.4), (2.98, 0.25), (4.2, 0.15)))
    brilho *= adsr(n, 0.04, 0.3, 0.45, 0.4) * trem
    sopro = filtro_variavel(ruido(n), sweep(500, 6000, n)) * adsr(n, 0.15, 0.2, 0.5, 0.4) * 0.8
    return finalizar(reverb(0.6 * brilho + sopro, 1.2, 0.35))


def veu_off() -> np.ndarray:
    n = int(0.6 * SR)
    f = sweep(1400, 500, n)
    y = sum(a * osc(f * k, n) for k, a in ((1, 1), (2.01, 0.4), (2.98, 0.2))) * adsr(n, 0.01, 0.1, 0.6, 0.45)
    sopro = filtro_variavel(ruido(n), sweep(5000, 300, n)) * adsr(n, 0.02, 0.1, 0.5, 0.4)
    return finalizar(reverb(0.6 * y + 0.7 * sopro, 0.9, 0.3))


def veu_bloqueio() -> np.ndarray:
    n = int(0.35 * SR)
    y = sum(a * osc(fr, n, fase0=RNG.random() * 6) * env_exp(n, tau) for fr, a, tau in ((2093, 1, 0.12), (3136, 0.6, 0.09), (4699, 0.4, 0.06), (6272, 0.25, 0.04)))
    clique = passa_alta(ruido(n), 3000) * env_exp(n, 0.004)
    return finalizar(reverb(y + 0.6 * clique, 0.6, 0.25))


def poco() -> np.ndarray:
    dur = 2.6
    n = int(dur * SR)
    t = tempo(dur)
    vib = 3 * np.sin(2 * np.pi * 6 * t)
    drone = osc(50 + vib + 12 * t, n) + 0.5 * osc(100 + 2 * vib, n) + 0.25 * osc(151 + vib, n, "serra")
    drone = passa_baixa(drone, 600) * adsr(n, 0.4, 0.5, 0.8, 0.5)
    lfo = 0.55 + 0.45 * np.sin(2 * np.pi * (3 + 2 * t) * t)
    vortice = filtro_variavel(ruido(n), 300 + 900 * (t / dur) + 400 * np.sin(2 * np.pi * 4 * t)) * lfo * adsr(n, 0.3, 0.4, 0.8, 0.5)
    suc = np.zeros(n)
    nsuc = int(0.6 * SR)
    suc[-nsuc:] = osc(sweep(1500, 90, nsuc), nsuc) * adsr(nsuc, 0.05, 0.2, 0.6, 0.2) * 0.5
    return finalizar(reverb(1.1 * drone + 1.3 * vortice + suc, 1.5, 0.3))


def nova_disparo() -> np.ndarray:
    n = int(0.7 * SR)
    zap = osc(np.concatenate([sweep(1800, 240, int(0.25 * SR)), np.full(n - int(0.25 * SR), 240.0)]), n) * env_exp(n, 0.12)
    estalo = passa_banda(ruido(n), 2000, 6000) * env_exp(n, 0.03)
    chiado = passa_alta(ruido(n), 4000) * env_exp(n, 0.2) * 0.3
    return finalizar(reverb(np.tanh(2.2 * zap) + 0.8 * estalo + chiado, 0.8, 0.25))


def nova_impacto() -> np.ndarray:
    dur = 2.2
    n = int(dur * SR)
    pancada = osc(np.concatenate([sweep(90, 35, int(0.3 * SR)), np.full(n - int(0.3 * SR), 35.0)]), n) * env_exp(n, 0.35)
    estouro = filtro_variavel(ruido(n), np.concatenate([sweep(6000, 300, SR), np.full(n - SR, 300.0)])) * env_exp(n, 0.28)
    detritos = np.zeros(n)
    for _ in range(70):
        i = int(RNG.uniform(0.02, 1.5) * SR)
        k = int(0.004 * SR)
        detritos[i : i + k] += RNG.uniform(0.2, 1) * np.hanning(k) * RNG.choice([-1, 1]) * np.exp(-i / SR / 0.6)
    detritos = passa_banda(detritos, 1500, 7000)
    return finalizar(np.tanh(1.6 * reverb(1.4 * pancada + 1.2 * estouro + 0.8 * detritos, 1.8, 0.35)))


def passo() -> np.ndarray:
    n = int(0.55 * SR)
    t = tempo(0.55)
    corte = 400 + 3600 * np.sin(np.pi * np.clip(t / 0.3, 0, 1))
    fwip = filtro_variavel(ruido(n), corte) * adsr(n, 0.02, 0.2, 0.2, 0.3)
    ting = np.zeros(n)
    ting = colocar(ting, sino(2637, 0.3, 0.12), 0.22, 0.25)
    return finalizar(reverb(1.4 * fwip + ting, 0.8, 0.3))


def reversao() -> np.ndarray:
    dur = 1.8
    n = int(dur * SR)
    y = np.zeros(n)
    for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
        y = colocar(y, sino(f, 1.4, 0.5), 0.08 * i, 0.5)
    pad = sum(osc(f, n, "serra") for f in (523.25, 659.25, 783.99))
    pad = passa_baixa(pad, 1500) * adsr(n, 0.35, 0.3, 0.6, 0.6) * 0.18
    brilho = passa_alta(ruido(n), 6000) * adsr(n, 0.2, 0.3, 0.3, 0.8) * 0.15
    return finalizar(reverb(y + pad + brilho, 2.0, 0.4))


def horizonte_carga() -> np.ndarray:
    dur = 2.3
    n = int(dur * SR)
    t = tempo(dur)
    x = t / dur
    vib = (2 + 10 * x) * np.sin(2 * np.pi * (5 + 6 * x) * t)
    a = osc(220 * 2 ** x + vib, n, "serra")
    b = osc(880 * 0.5 ** x - vib, n, "serra")
    tons = passa_baixa(a + b, 2500) * (0.2 + 0.8 * x ** 1.5)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * (4 + 20 * x ** 2) * t)
    ar = filtro_variavel(ruido(n), 300 + 7000 * x ** 2) * x ** 2
    return finalizar(reverb((tons + 0.8 * ar) * trem, 1.0, 0.25), fade_ms=4)


def horizonte_disparo() -> np.ndarray:
    dur = 2.8
    n = int(dur * SR)
    pancada = osc(np.concatenate([sweep(70, 30, int(0.4 * SR)), np.full(n - int(0.4 * SR), 30.0)]), n) * env_exp(n, 0.6)
    rugido = filtro_variavel(ruido(n), sweep(8000, 200, n)) * env_exp(n, 0.55)
    zap = osc(np.concatenate([sweep(3000, 200, int(0.4 * SR)), np.full(n - int(0.4 * SR), 200.0)]), n) * env_exp(n, 0.15)
    sub = osc(40, n) * adsr(n, 0.01, 0.4, 0.5, 1.5) * 0.6
    return finalizar(np.tanh(1.8 * reverb(1.5 * pancada + 1.3 * rugido + 0.5 * zap + sub, 2.2, 0.4)))


def abobada() -> np.ndarray:
    dur = 4.5
    n = int(dur * SR)
    t = tempo(dur)
    notas = (146.83, 220.0, 293.66, 369.99, 440.0, 659.26)
    pad = np.zeros(n)
    for f in notas:
        for d in (-7, 0, 7):
            pad += osc(f * 2 ** (d / 1200), n, "serra", fase0=RNG.random() * 6)
    pad = filtro_variavel(pad, 400 + 2600 * np.clip(t / 3, 0, 1))
    coro = passa_banda(pad, 600, 800) + passa_banda(pad, 1100, 1300)
    pad = (pad + 0.8 * coro) * adsr(n, 1.2, 0.5, 0.85, 1.0) * 0.12
    sub = osc(73.42, n) * adsr(n, 1.0, 0.5, 0.8, 1.0) * 0.5
    sinos = np.zeros(n)
    for _ in range(9):
        f = RNG.choice([587.33, 659.26, 880.0, 987.77, 1174.66, 1318.5, 1760.0])
        sinos = colocar(sinos, sino(f, 1.2, 0.4), RNG.uniform(0.6, 3.2), 0.12)
    return finalizar(reverb(pad + sub + sinos, 2.8, 0.5))


def abobada_fim() -> np.ndarray:
    dur = 1.6
    n = int(dur * SR)
    f = sweep(2000, 300, n)
    y = sum(a * osc(f * k, n) for k, a in ((1, 1), (1.5, 0.5), (2.01, 0.3))) * adsr(n, 0.02, 0.3, 0.5, 0.8)
    sopro = filtro_variavel(ruido(n), sweep(6000, 200, n)) * adsr(n, 0.05, 0.3, 0.5, 0.7)
    baque = osc(sweep(80, 40, n), n) * env_exp(n, 0.3, 1.0) * 0.8
    return finalizar(reverb(0.5 * y + 0.8 * sopro + baque, 1.5, 0.35))


def nivel() -> np.ndarray:
    dur = 1.7
    n = int(dur * SR)
    y = np.zeros(n)
    for i, f in enumerate((523.25, 659.25, 783.99, 1046.5, 1318.5)):
        y = colocar(y, sino(f, 1.3, 0.45), 0.07 * i, 0.45)
    acorde = sum(sino(f, 1.2, 0.7) for f in (1046.5, 1318.5, 1568.0)) * 0.3
    y = colocar(y, acorde, 0.4)
    faisca = passa_alta(ruido(n), 7000) * adsr(n, 0.3, 0.3, 0.2, 0.8) * 0.12
    return finalizar(reverb(y + faisca, 1.8, 0.35))


def ui() -> np.ndarray:
    n = int(0.12 * SR)
    y = (osc(1500, n) + 0.3 * osc(3000, n)) * adsr(n, 0.002, 0.0, 1.0, 0.0) * env_exp(n, 0.03)
    return finalizar(y, fade_ms=2)


def negado() -> np.ndarray:
    n = int(0.36 * SR)
    y = np.zeros(n)
    for f, ini in ((330, 0.0), (247, 0.15)):
        k = int(0.16 * SR)
        tom = (osc(f, k) + 0.3 * osc(3 * f, k)) * adsr(k, 0.005, 0.05, 0.7, 0.04)
        y = colocar(y, tom, ini)
    return finalizar(passa_baixa(y, 2500), fade_ms=3)


def arconte_rugido() -> np.ndarray:
    dur = 2.2
    n = int(dur * SR)
    t = tempo(dur)
    f = 65 + 10 * np.sin(np.pi * t / dur) + 6 * np.sin(2 * np.pi * 5 * t)
    base = osc(f, n, "serra") + 0.5 * osc(f * 1.01, n, "serra")
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 1.5 * t)
    voz = passa_banda(base, 400, 650) * (0.6 + 0.4 * lfo) + passa_banda(base, 800, 1100) * (1 - 0.5 * lfo)
    rugido = passa_banda(ruido(n), 200, 1500) * 0.6
    y = np.tanh(3 * (voz + rugido)) * adsr(n, 0.15, 0.4, 0.8, 0.6)
    return finalizar(reverb(y, 1.6, 0.3))


def arconte_ritual() -> np.ndarray:
    dur = 5.0
    n = int(dur * SR)
    t = tempo(dur)
    drone = sum(osc(f, n, "serra") for f in (73.42, 77.78, 110.0))
    drone = passa_baixa(drone, 500) * (0.2 + 0.8 * (t / dur)) * adsr(n, 0.8, 0.5, 1.0, 0.5) * 0.5
    vento = filtro_variavel(ruido(n), 200 + 1800 * (t / dur) ** 2) * (t / dur) * 0.9
    y = drone + vento
    for em in (1.0, 1.8, 2.5, 3.1, 3.6, 4.0, 4.35):
        k = int(0.5 * SR)
        batida = osc(sweep(70, 40, k), k) * env_exp(k, 0.12)
        y = colocar(y, batida, em, 0.9)
    k = int(0.6 * SR)
    final = osc(sweep(90, 30, k), k) * env_exp(k, 0.3) + filtro_variavel(ruido(k), sweep(5000, 200, k)) * env_exp(k, 0.15)
    y = colocar(y, final, 4.45, 1.3)
    return finalizar(np.tanh(1.3 * reverb(y, 2.0, 0.45)))


def arconte_morte() -> np.ndarray:
    dur = 3.2
    n = int(dur * SR)
    t = tempo(dur)
    sobe = passa_alta(ruido(n), 1500) * np.where(t < 1.2, (t / 1.2) ** 3, 0)
    k = int(1.4 * SR)
    implosao = osc(sweep(80, 25, k), k) * env_exp(k, 0.4)
    y = colocar(sobe, implosao, 1.2, 1.5)
    k = int(1.9 * SR)
    f = sweep(3000, 400, k)
    brilho = sum(a * osc(f * m, k) for m, a in ((1, 1), (1.5, 0.4), (2.4, 0.3))) * env_exp(k, 0.5) * 0.4
    y = colocar(y, brilho, 1.25)
    return finalizar(np.tanh(1.4 * reverb(y, 2.4, 0.5)))


def arconte_feixe() -> np.ndarray:
    dur = 2.0
    n = int(dur * SR)
    t = tempo(dur)
    indice = 2 + 6 * (t / dur)
    fm = np.sin(2 * np.pi * 880 * t + indice * np.sin(2 * np.pi * 110 * t))
    zumbido = osc(110, n, "serra") + 0.6 * fm
    zumbido = passa_banda(zumbido, 400, 3500) * (0.7 + 0.3 * np.sin(2 * np.pi * 30 * t))
    chiado = passa_alta(ruido(n), 5000) * 0.25
    y = np.tanh(2 * (zumbido + chiado)) * adsr(n, 0.05, 0.2, 0.9, 0.25)
    return finalizar(reverb(y, 1.2, 0.25))


SONS = {
    # nome: (função, categoria, volume, distância máxima)
    "veu_on": (veu_on, "player", 0.9, 24),
    "veu_off": (veu_off, "player", 0.8, 24),
    "veu_bloqueio": (veu_bloqueio, "player", 0.7, 20),
    "poco": (poco, "player", 1.0, 48),
    "nova_disparo": (nova_disparo, "player", 0.9, 40),
    "nova_impacto": (nova_impacto, "player", 1.0, 64),
    "passo": (passo, "player", 0.8, 24),
    "reversao": (reversao, "player", 0.8, 24),
    "horizonte_carga": (horizonte_carga, "player", 1.0, 64),
    "horizonte_disparo": (horizonte_disparo, "player", 1.0, 96),
    "abobada": (abobada, "player", 1.0, 64),
    "abobada_fim": (abobada_fim, "player", 0.9, 48),
    "nivel": (nivel, "ui", 0.8, 16),
    "ui": (ui, "ui", 0.45, 8),
    "negado": (negado, "ui", 0.5, 8),
    "arconte_rugido": (arconte_rugido, "hostile", 1.0, 64),
    "arconte_ritual": (arconte_ritual, "hostile", 1.0, 64),
    "arconte_morte": (arconte_morte, "hostile", 1.0, 96),
    "arconte_feixe": (arconte_feixe, "hostile", 1.0, 64),
}


def gravar_ogg(x: np.ndarray, destino: Path) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with tempfile.TemporaryDirectory() as d:
        wav = Path(d) / "s.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5", "-map_metadata", "-1", str(destino)], check=True)


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    definicoes = {}
    for nome, (fn, categoria, volume, dist) in SONS.items():
        gravar_ogg(fn(), SAIDA / f"{nome}.ogg")
        definicoes[f"zenite.{nome}"] = {
            "category": categoria,
            "max_distance": float(dist),
            "min_distance": None,
            "sounds": [{"name": f"sounds/zenite/{nome}", "volume": volume, "load_on_low_memory": True}],
        }
    (RAIZ / "RP" / "sounds" / "sound_definitions.json").write_text(
        json.dumps({"format_version": "1.20.20", "sound_definitions": definicoes}, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"{len(SONS)} sons gerados")


if __name__ == "__main__":
    main()

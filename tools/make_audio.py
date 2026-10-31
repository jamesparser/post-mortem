"""Synthesize every original sound asset for POST-Mortem.

Run: python3 tools/make_audio.py
Needs numpy, scipy, and ffmpeg on the path. Writes mp3 files into audio/.
Everything here is generated from oscillators and noise. No samples.
"""

import os
import subprocess
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "audio")
rng = np.random.default_rng(1031)


def seconds(t):
    return int(t * SR)


def midi_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def envelope(n, attack, release, sustain_level=1.0):
    env = np.full(n, sustain_level)
    a = min(seconds(attack), n)
    r = min(seconds(release), n)
    env[:a] = np.linspace(0, sustain_level, a)
    if r:
        env[n - r:] *= np.linspace(1, 0, r)
    return env


def reverb(x, length=3.2, decay=3.0, wet=0.35, seed=7):
    local = np.random.default_rng(seed)
    n = seconds(length)
    t = np.arange(n) / SR
    ir = local.standard_normal(n) * np.exp(-decay * t)
    b, a = signal.butter(2, 4500 / (SR / 2), "low")
    ir = signal.lfilter(b, a, ir)
    ir /= np.sqrt(np.sum(ir ** 2))
    tail = signal.fftconvolve(x, ir)[: len(x) + n]
    dry = np.concatenate([x, np.zeros(len(tail) - len(x))])
    return (1 - wet) * dry + wet * tail


def normalize(x, peak_db=-6.0):
    peak = np.max(np.abs(x)) or 1.0
    return x / peak * (10 ** (peak_db / 20))


def write_mp3(name, x, bitrate="80k"):
    x = np.clip(x, -1, 1)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wavfile.write(tmp.name, SR, (x * 32767).astype(np.int16))
        path = os.path.join(OUT, name)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
             "-ac", "1", "-b:a", bitrate, path],
            check=True,
        )
    os.unlink(tmp.name)
    print("wrote", name, round(len(x) / SR, 1), "s")


def loop_crossfade(x, fade):
    f = seconds(fade)
    head, body, tail = x[:f], x[f:-f], x[-f:]
    ramp = np.linspace(0, 1, f)
    joined = tail * (1 - ramp) + head * ramp
    return np.concatenate([body, joined])


# Organ section

DRAWBARS = [(0.5, 0.55), (1, 1.0), (2, 0.5), (3, 0.22), (4, 0.18), (6, 0.06), (8, 0.05)]


def organ_note(freq, dur, level=1.0):
    n = seconds(dur)
    t = np.arange(n) / SR
    tone = np.zeros(n)
    for mult, amp in DRAWBARS:
        f = freq * mult
        if f > 9000:
            continue
        detune = 1 + rng.uniform(-0.0012, 0.0012)
        tone += amp * np.sin(2 * np.pi * f * detune * t + rng.uniform(0, 6.28))
    chiff = rng.standard_normal(n) * np.exp(-t * 40) * 0.05
    tremulant = 1 + 0.06 * np.sin(2 * np.pi * 5.2 * t)
    return (tone + chiff) * tremulant * envelope(n, 0.08, 0.35) * level


def organ_dirge():
    beat = 1.25
    # Chords in D minor, written as midi notes. Each lasts three beats.
    progression = [
        [38, 50, 57, 62, 65],
        [43, 50, 55, 62, 70],
        [37, 49, 57, 64, 67],
        [38, 50, 57, 62, 65],
        [46, 53, 58, 62, 65],
        [43, 55, 58, 62, 67],
        [45, 52, 57, 61, 64],
        [38, 50, 57, 62, 65],
        [41, 53, 57, 60, 65],
        [46, 50, 58, 62, 70],
        [44, 50, 56, 59, 65],
        [45, 49, 57, 64, 67],
        [38, 50, 57, 62, 65],
        [43, 50, 58, 62, 67],
        [45, 49, 55, 61, 64],
        [38, 50, 57, 62, 62],
    ]
    melody = [74, 74, 72, 70, 69, 70, 69, 67, 69, 69, 67, 65, 64, 65, 64, 62,
              72, 72, 70, 69, 70, 69, 67, 65, 65, 67, 68, 69, 69, 70, 69, 67,
              69, 67, 65, 64, 62, 64, 65, 67, 65, 64, 62, 61, 62, 62, 62, 62]
    chord_len = beat * 3
    total = seconds(chord_len * len(progression) + 4)
    mix = np.zeros(total)
    for i, chord in enumerate(progression):
        start = seconds(i * chord_len)
        for k, note in enumerate(chord):
            level = 0.55 if k == 0 else 0.32
            nd = organ_note(midi_hz(note), chord_len + 0.1, level)
            mix[start:start + len(nd)] += nd
    for i, note in enumerate(melody):
        start = seconds(i * beat)
        nd = organ_note(midi_hz(note), beat * 0.96, 0.42)
        mix[start:start + len(nd)] += nd
    b, a = signal.butter(2, 3800 / (SR / 2), "low")
    mix = signal.lfilter(b, a, mix)
    wet = reverb(mix, length=4.5, decay=1.6, wet=0.45)
    wet = wet[: seconds(62)]
    wet *= envelope(len(wet), 0.6, 3.0)
    return normalize(wet, -7)


# Storm section

def brown_noise(n):
    w = rng.standard_normal(n)
    b = np.cumsum(w)
    b -= signal.lfilter([1], [1, -0.995], b) * 0.005
    b = signal.lfilter([1, -1], [1, -0.995], b)
    return b / (np.max(np.abs(b)) or 1)


def storm_bed(duration=96):
    n = seconds(duration)
    t = np.arange(n) / SR
    wind = brown_noise(n)
    gust = 0.5 + 0.5 * np.sin(2 * np.pi * t / 13.0) * np.sin(2 * np.pi * t / 7.3 + 1)
    out = np.zeros(n)
    block = 2048
    centers = 220 + 380 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 17.0))
    for i in range(0, n, block):
        c = centers[i]
        b, a = signal.butter(2, [max(60, c * 0.6) / (SR / 2), (c * 1.6) / (SR / 2)], "band")
        seg = signal.lfilter(b, a, wind[max(0, i - 4000):i + block])[-min(block, n - i):]
        out[i:i + len(seg)] = seg
    out *= 0.6 + 0.4 * gust
    drops = np.zeros(n)
    count = int(duration * 900)
    idx = rng.integers(0, n - 200, count)
    drops[idx] = rng.uniform(0.2, 1.0, count) * rng.choice([1, -1], count)
    b, a = signal.butter(2, [1800 / (SR / 2), 7000 / (SR / 2)], "band")
    rain = signal.lfilter(b, a, drops) * 0.35
    hiss = rng.standard_normal(n)
    b, a = signal.butter(2, [3000 / (SR / 2), 9000 / (SR / 2)], "band")
    rain += signal.lfilter(b, a, hiss) * 0.025
    thunder = np.zeros(n)
    for start in (22, 61):
        s = seconds(start)
        length = seconds(6)
        rumble = brown_noise(length)
        b, a = signal.butter(3, 140 / (SR / 2), "low")
        rumble = signal.lfilter(b, a, rumble)
        tt = np.arange(length) / SR
        rumble *= (1 - np.exp(-tt * 3)) * np.exp(-tt * 0.7)
        thunder[s:s + length] += rumble * 3.0
    mix = out * 1.0 + rain + thunder
    mix = loop_crossfade(mix, 4)
    return normalize(mix, -10)


# Small sounds section

def knock(freq=180, decay=30, level=1.0, noise=0.4):
    n = seconds(0.25)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * decay)
    body += 0.5 * np.sin(2 * np.pi * freq * 2.7 * t) * np.exp(-t * decay * 1.8)
    click = rng.standard_normal(n) * np.exp(-t * 300) * noise
    return (body + click) * level


def place(buf, sound, at):
    s = seconds(at)
    e = min(len(buf), s + len(sound))
    buf[s:e] += sound[: e - s]


def footsteps_wood():
    buf = np.zeros(seconds(8))
    times = [0.4, 1.35, 2.3, 3.3, 5.2, 6.4]
    for i, at in enumerate(times):
        place(buf, knock(110 + rng.uniform(-10, 10), 22, 1.0, 0.6), at)
        place(buf, knock(230, 45, 0.3, 0.2), at + 0.05)
        if i in (2, 4):
            place(buf, creak(0.5), at + 0.1)
    return normalize(reverb(buf, 1.8, 3.5, 0.3), -8)


def creak(dur):
    n = seconds(dur)
    t = np.arange(n) / SR
    f = 330 + 60 * np.sin(2 * np.pi * 1.3 * t)
    pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.97).astype(float)
    b, a = signal.butter(2, [600 / (SR / 2), 2400 / (SR / 2)], "band")
    return signal.lfilter(b, a, pulses) * envelope(n, 0.1, 0.2) * 1.5


def nails_tap():
    # Fingertips and nails on wood. A short, irregular skitter. Loopable.
    buf = np.zeros(seconds(1.2))
    at = 0.02
    while at < 1.12:
        tick = knock(rng.uniform(1600, 2600), 160, rng.uniform(0.25, 0.6), 1.2)
        place(buf, tick, at)
        if rng.random() < 0.5:
            place(buf, knock(rng.uniform(260, 340), 70, 0.35, 0.1), at + 0.004)
        at += rng.uniform(0.045, 0.11)
    return normalize(buf, -9)


def scuffle():
    n = seconds(0.7)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    b, a = signal.butter(2, [500 / (SR / 2), 3500 / (SR / 2)], "band")
    x = signal.lfilter(b, a, x)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 14 * t + np.sin(2 * np.pi * 3 * t))
    return normalize(x * am * envelope(n, 0.03, 0.3), -10)


def soft_thud():
    x = knock(70, 14, 1.0, 0.25)
    b, a = signal.butter(2, 600 / (SR / 2), "low")
    return normalize(signal.lfilter(b, a, x), -9)


def groan():
    dur = 3.4
    n = seconds(dur)
    t = np.arange(n) / SR
    f0 = 92 + 18 * np.sin(np.pi * t / dur) - 10 * t / dur
    phase = 2 * np.pi * np.cumsum(f0 * (1 + 0.01 * rng.standard_normal(n).cumsum() / 400)) / SR
    saw = signal.sawtooth(phase)
    out = np.zeros(n)
    for formant, bw, amp in ((520, 90, 1.0), (880, 120, 0.5), (2400, 300, 0.15)):
        b, a = signal.iirpeak(formant / (SR / 2), formant / bw)
        out += signal.lfilter(b, a, saw) * amp
    breath = rng.standard_normal(n) * 0.08
    out = (out + breath) * envelope(n, 0.8, 1.4)
    b, a = signal.butter(2, 1800 / (SR / 2), "low")
    out = signal.lfilter(b, a, out)
    return normalize(reverb(out, 3.5, 1.8, 0.6), -14)


def breath():
    dur = 4.0
    n = seconds(dur)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    b, a = signal.butter(2, [400 / (SR / 2), 2200 / (SR / 2)], "band")
    x = signal.lfilter(b, a, x)
    cycle = np.clip(np.sin(2 * np.pi * t / 2.0), 0, None) ** 1.5
    cycle += 0.6 * np.clip(-np.sin(2 * np.pi * t / 2.0), 0, None) ** 2
    return normalize(x * cycle * envelope(n, 0.05, 0.05), -16)


def sting():
    # Short dissonant cluster swell and a low hit. Peaks are kept modest.
    dur = 2.2
    n = seconds(dur)
    t = np.arange(n) / SR
    cluster = np.zeros(n)
    for note in (50, 51, 56, 57, 62, 63):
        f = midi_hz(note)
        cluster += signal.sawtooth(2 * np.pi * f * t * (1 + rng.uniform(-0.002, 0.002)))
    b, a = signal.butter(2, 2400 / (SR / 2), "low")
    cluster = signal.lfilter(b, a, cluster) / 6
    swell = np.clip(t / 0.35, 0, 1) * np.exp(-np.clip(t - 0.35, 0, None) * 1.8)
    hit = knock(55, 6, 1.6, 0.4)
    out = cluster * swell
    place(out, hit, 0.33)
    return normalize(reverb(out, 2.5, 2.0, 0.4), -8)


def chime():
    dur = 3.0
    n = seconds(dur)
    t = np.arange(n) / SR
    f = midi_hz(74)
    out = np.zeros(n)
    for mult, amp, dec in ((1, 1.0, 1.4), (2.76, 0.35, 2.4), (5.4, 0.15, 3.5)):
        out += amp * np.sin(2 * np.pi * f * mult * t) * np.exp(-t * dec)
    return normalize(reverb(out * envelope(n, 0.005, 0.3), 2.0, 2.2, 0.35), -12)


def peek_tone():
    dur = 0.9
    n = seconds(dur)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * midi_hz(57) * t) + 0.3 * np.sin(2 * np.pi * midi_hz(64) * t)
    return normalize(out * envelope(n, 0.05, 0.6), -16)


def buzz():
    # A phone on vibrate, heard through a closed wooden lid. Three pulses.
    n = seconds(2.4)
    t = np.arange(n) / SR
    gate = np.zeros(n)
    for start in (0.0, 0.75, 1.5):
        s = seconds(start)
        e = seconds(start + 0.45)
        gate[s:e] = 1
    b, a = signal.butter(2, 30 / (SR / 2), "low")
    gate = signal.lfilter(b, a, gate)
    motor = signal.square(2 * np.pi * 165 * t) * 0.6 + np.sin(2 * np.pi * 330 * t) * 0.3
    rattle = rng.standard_normal(n) * (0.5 + 0.5 * np.sin(2 * np.pi * 165 * t))
    b, a = signal.butter(2, [900 / (SR / 2), 2600 / (SR / 2)], "band")
    rattle = signal.lfilter(b, a, rattle) * 0.25
    out = (motor + rattle) * gate
    b, a = signal.butter(3, 900 / (SR / 2), "low")
    out = signal.lfilter(b, a, out)
    return normalize(reverb(out, 0.8, 9, 0.2), -12)


def main():
    os.makedirs(OUT, exist_ok=True)
    write_mp3("organ-dirge.mp3", organ_dirge(), "96k")
    write_mp3("storm-bed.mp3", storm_bed(), "64k")
    write_mp3("footsteps-wood.mp3", footsteps_wood(), "64k")
    write_mp3("nails-tap.mp3", nails_tap(), "64k")
    write_mp3("scuffle.mp3", scuffle(), "64k")
    write_mp3("thud.mp3", soft_thud(), "64k")
    write_mp3("groans.mp3", groan(), "64k")
    write_mp3("breath.mp3", breath(), "48k")
    write_mp3("sting.mp3", sting(), "80k")
    write_mp3("chime.mp3", chime(), "64k")
    write_mp3("peek-tone.mp3", peek_tone(), "48k")
    write_mp3("buzz.mp3", buzz(), "64k")


if __name__ == "__main__":
    main()

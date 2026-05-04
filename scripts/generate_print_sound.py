import os
import wave
import math
import struct

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'sounds')
os.makedirs(out, exist_ok=True)
path = os.path.join(out, 'print-confirmation.wav')
framerate = 44100
duration = 0.18
frequency = 880.0
amplitude = 16000
nframes = int(duration * framerate)
with wave.open(path, 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(framerate)
    for i in range(nframes):
        value = int(amplitude * math.sin(2 * math.pi * frequency * i / framerate))
        f.writeframes(struct.pack('<h', value))
print('created', path)

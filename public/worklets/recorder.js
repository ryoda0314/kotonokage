// Hands each block of microphone samples to the page (src/components/mic.ts).
class KageRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("kage-recorder", KageRecorder);

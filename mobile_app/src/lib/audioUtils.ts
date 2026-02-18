import { encode as btoa } from 'base-64';

export const createWavHeader = (pcmDataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitDepth: number = 16) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmDataLength, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmDataLength, true);

    return header;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

export const appendWavHeader = (pcmBase64: string, sampleRate = 24000) => {
    // Decode base64 to binary string
    const binaryString = global.atob(pcmBase64);
    const len = binaryString.length;
    const header = createWavHeader(len, sampleRate);

    // Convert header to binary string
    let headerStr = '';
    const headerBytes = new Uint8Array(header);
    for (let i = 0; i < headerBytes.length; i++) {
        headerStr += String.fromCharCode(headerBytes[i]);
    }

    // Combine
    return global.btoa(headerStr + binaryString);
};

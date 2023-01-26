const {LzwDecompress} = require("../src/lzw");
const {BitBuffer, ByteBuffer} = require('../src/buffer');

function BitWriter() {
    this.data = []
    this.rem = 8;
    this.byte = 0;
}

BitWriter.prototype.add = function(bits, n) {
    while(n > 0) {
        if(this.rem === 0) {
            this.data.push(this.byte);
            this.byte = 0;
            this.rem = 8;
        }
        const bitsToTake = Math.min(n, this.rem);
        const v = bits >> (n - bitsToTake);
        bits -= v << (n - bitsToTake);
        this.byte |= v << (this.rem - bitsToTake);
        n -= bitsToTake;
        this.rem -= bitsToTake;
    }
}

BitWriter.prototype.asBytes = function() {
    if(this.rem !== 8) {
        this.data.push(this.byte);
    }
    return new Uint8Array(this.data);
}

describe('bitbuffer test', () => {
    it('adds bits correctly', () => {
        const buf = new BitWriter();
        buf.add(0b01110111, 7);
        buf.add(0b11, 2);
        const result = buf.asBytes();
        expect(result).toEqual(new Uint8Array([0b11101111, 128]));
    })

    it('adds and reads correctly', () => {
        const writer = new BitWriter();
        writer.add(256, 9);
        writer.add(1, 9);
        writer.add(2, 9);
        writer.add(1, 9);
        writer.add(2, 9);
        const buf = new BitBuffer(new ByteBuffer(writer.asBytes()));
        expect(buf.readBits(9)).toEqual(256);
        expect(buf.readBits(9)).toEqual(1);
        expect(buf.readBits(9)).toEqual(2);
        expect(buf.readBits(9)).toEqual(1);
        expect(buf.readBits(9)).toEqual(2);
    })
});
describe('lzw decompression', () => {
    it('decompresses example', () => {
        const buf = new BitWriter();
        buf.add(256, 9);
        buf.add(7, 9);
        buf.add(258, 9);
        buf.add(8, 9);
        buf.add(8, 9);
        buf.add(258, 9);
        buf.add(6, 9);
        buf.add(6, 9);
        buf.add(257, 9);
        const result = new LzwDecompress().decompress(new ByteBuffer(buf.asBytes()));
        expect(result).toEqual(new Uint8Array([7, 7, 7, 8, 8, 7, 7, 6, 6]));
    });

    it('decompresses example 2', () => {
        const buf = new BitWriter();
        buf.add(256, 9);
        buf.add(1, 9);
        buf.add(2, 9);
        buf.add(3, 9);
        buf.add(258, 9);
        buf.add(260, 9);
        buf.add(259, 9);
        buf.add(261, 9);
        buf.add(264, 9);
        buf.add(259, 9);
        buf.add(257, 9);
        const result = new LzwDecompress().decompress(new ByteBuffer(buf.asBytes()));
        expect(result).toEqual(new Uint8Array([1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]));
    });

    it('decompresses repeated', () => {
        const buf = new BitWriter();
        buf.add(256, 9);
        buf.add(1, 9);
        buf.add(2, 9);
        buf.add(258, 9);
        buf.add(258, 9);
        buf.add(259, 9);
        buf.add(257, 9);
        const result = new LzwDecompress().decompress(new ByteBuffer(buf.asBytes()));
        expect(result).toEqual(new Uint8Array([1, 2, 1, 2, 1, 2, 2, 1]));
    });
});
const {BitBuffer, ByteBuffer} = require("../src/buffer");
describe('bitbuffer', () => {

    it('reads half byte intervals', () => {
        const data = new Uint8Array([0xab, 0xcd, 0xde]);
        const bitBuffer = new BitBuffer(new ByteBuffer(data));
        expect(bitBuffer.readBits(4)).toEqual(0x0a);
        expect(bitBuffer.readBits(4)).toEqual(0x0b);
        expect(bitBuffer.readBits(4)).toEqual(0x0c);
        expect(bitBuffer.readBits(4)).toEqual(0x0d);
        expect(bitBuffer.readBits(4)).toEqual(0x0d);
        expect(bitBuffer.atEnd()).toBeFalsy();
        expect(bitBuffer.readBits(4)).toEqual(0x0e);
        expect(bitBuffer.atEnd()).toBeTruthy();
    })

    it('reads single bit intervals', () => {
        const data = new Uint8Array([0b10010010]);
        const bitBuffer = new BitBuffer(new ByteBuffer(data));
        expect(bitBuffer.readBits(1)).toEqual(1);
        expect(bitBuffer.readBits(1)).toEqual(0);
        expect(bitBuffer.readBits(1)).toEqual(0);
        expect(bitBuffer.readBits(1)).toEqual(1);
    })

    it('crosses single byte boundary correctly', () => {
        const data = new Uint8Array([0b10010010, 0b01010100]);
        const bitBuffer = new BitBuffer(new ByteBuffer(data));
        expect(bitBuffer.readBits(1)).toEqual(1);
        expect(bitBuffer.readBits(1)).toEqual(0);
        expect(bitBuffer.readBits(1)).toEqual(0);
        expect(bitBuffer.readBits(1)).toEqual(1);
        expect(bitBuffer.readBits(8)).toEqual(0b00100101);
    })

    it('crosses multiple byte boundaries correctly', () => {
        const data = new Uint8Array([0xab, 0xcd, 0xef]);
        const bitBuffer = new BitBuffer(new ByteBuffer(data));
        expect(bitBuffer.readBits(4)).toEqual(0x0a);
        expect(bitBuffer.readBits(16)).toEqual(0xbcde);
        expect(bitBuffer.readBits(1)).toEqual(1);
    })
})
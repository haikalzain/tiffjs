function ByteBuffer(byteArray) {
    // TODO this is roundabout
    this.byteArray = byteArray;
    this.buffer= byteArray.buffer;
    this.data = new DataView(this.buffer, byteArray.byteOffset, byteArray.byteLength);
    this.offset = 0;
    this.littleEndian = true;
}

ByteBuffer.prototype.setLittleEndian = function(b) {
    this.littleEndian = b;
}

ByteBuffer.prototype.readUint = function(bytes) {
    if(bytes === 1) return this.readUint8();
    if(bytes === 2) return this.readUint16();
    if(bytes === 4) return this.readUint32();
    throw new Error(`Unsupported readUint for ${bytes} bytes`)
}

ByteBuffer.prototype.readUint8 = function() {
    const ret = this.data.getUint8(this.offset);
    this.offset++;
    return ret;
}

ByteBuffer.prototype.readUint16 = function() {
    const ret = this.data.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return ret;
}

ByteBuffer.prototype.readUint32 = function() {
    const ret = this.data.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return ret;
}

ByteBuffer.prototype.readInt8 = function() {
    const ret = this.data.getInt8(this.offset);
    this.offset++;
    return ret;
}

ByteBuffer.prototype.seek = function(i) {
    this.offset = i;
}

ByteBuffer.prototype.skip = function(i) {
    this.offset += i;
}

ByteBuffer.prototype.clone = function() {
    const buf = new ByteBuffer(this.buffer);
    buf.skip(this.offset);
    return buf;
}

ByteBuffer.prototype.slice = function(offset, length) {
    const byteArray = new Uint8Array(this.buffer, this.byteArray.byteOffset + offset, length);
    const buf = new ByteBuffer(byteArray);
    buf.setLittleEndian(this.littleEndian);
    return buf;
}

ByteBuffer.prototype.atEnd = function() {
    return this.offset === this.data.byteLength;
}

function BitBuffer(buffer) {
    this.buffer = buffer;
    this.remainingBits = 0;
    this.cachedByte = 0;
}

BitBuffer.prototype.readBits = function(n) {
    let result = 0;
    while(n > 0) {
        if (this.remainingBits === 0) {
            if(this.buffer.atEnd()) return result; // handle weird erroneous behaviour in some images
            this.cachedByte = this.buffer.readUint8();
            this.remainingBits += 8;
        } else if (this.remainingBits !== 8) {
            this.cachedByte &= (1 << this.remainingBits) - 1;
        }
        let bitsToTake = Math.min(n, this.remainingBits);
        result = result << bitsToTake;
        result |= this.cachedByte >> (this.remainingBits - bitsToTake);
        this.remainingBits -= bitsToTake;
        n -= bitsToTake;
    }
    return result;
}

BitBuffer.prototype.atEnd = function() {
    return this.buffer.atEnd() && this.remainingBits === 0;
}

BitBuffer.prototype.skipRemainingBits = function() {
    this.remainingBits = 0;
}

module.exports = {
    ByteBuffer,
    BitBuffer
}
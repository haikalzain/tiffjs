function Buffer(byteArray) {
    // TODO this is roundabout
    this.buffer= byteArray.buffer;
    this.data = new DataView(this.buffer, byteArray.byteOffset, byteArray.byteLength);
    this.offset = 0;
    this.littleEndian = true;
}

Buffer.prototype.setLittleEndian = function(b) {
    this.littleEndian = b;
}

Buffer.prototype.readUint = function(bytes) {
    if(bytes === 1) return this.readUint8();
    if(bytes === 2) return this.readUint16();
    if(bytes === 4) return this.readUint32();
    throw new Error(`Unsupported readUint for ${bytes} bytes`)
}

Buffer.prototype.readUint8 = function() {
    const ret = this.data.getUint8(this.offset);
    this.offset++;
    return ret;
}

Buffer.prototype.readUint16 = function() {
    const ret = this.data.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return ret;
}

Buffer.prototype.readUint32 = function() {
    const ret = this.data.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return ret;
}

Buffer.prototype.seek = function(i) {
    this.offset = i;
}

Buffer.prototype.skip = function(i) {
    this.offset += i;
}

Buffer.prototype.clone = function() {
    const buf = new Buffer(this.buffer);
    buf.skip(this.offset);
    return buf;
}

Buffer.prototype.slice = function(offset, length) {
    const byteArray = new Uint8Array(this.buffer, offset, length);
    return new Buffer(byteArray);
}

Buffer.prototype.atEnd = function() {
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
            this.cachedByte = this.buffer.readUint8();
            this.remainingBits += 8;
        } else if (this.remainingBits !== 8) {
            this.cachedByte &= (1 << this.remainingBits) - 1;
        }
        let bitsToTake = n;
        if (bitsToTake > this.remainingBits) {
            bitsToTake = this.remainingBits;
        }
        result |= this.cachedByte >> (this.remainingBits - bitsToTake);
        this.remainingBits -= bitsToTake;
        n -= bitsToTake;
    }
    return result;
}

module.exports = {
    Buffer,
    BitBuffer
}

function TiffDecoder() {
}

TiffDecoder.prototype.decode = function(data) {
    // data must be uint8array buffer
    const buf = new Buffer(data);

    //only allow little endian
    if(buf.readUint16() !== 0x4949 || buf.readUint16() !== 42) {
        throw new Error("Invalid header");
    }

    const ifdOffset = buf.readUint32();
    buf.seek(ifdOffset);
    const ifd = this.decodeIfd(buf);

    return ifd;
}

TiffDecoder.prototype.decodeIfd = function(buf) {
    const nEntries = buf.readUint16();
    const map = new Map();
    for(let i=0;i<nEntries;i++) {
        const {tag, value} = this.readEntry(buf);
        map.set(tag, value);
    }
    // should wrap Tag data in a class and throw if tags incorrect/absent

    const width = map.get(Tag.ImageWidth)[0];
    const height = map.get(Tag.ImageLength)[0];

    const stripOffsets = map.get(Tag.StripOffsets);
    let stripByteCounts = map.get(Tag.StripByteCounts);
    const rowsPerStrip = map.get(Tag.RowsPerStrip)[0];
    const compression = map.get(Tag.Compression)[0];

    // this won't support 4 bits
    const bytesPerSample = map.get(Tag.BitsPerSample)[0] / 8;

    const pmi = map.get(Tag.PhotometricInterpolation)[0];


    // try to infer strip byte counts
    if(stripByteCounts === undefined) {
        if(compression !== 1) {
            throw new Error('Missing StripByteCounts');
        }
        stripByteCounts = [];
        let rows = height;
        for(let i=0;i<stripOffsets.length;i++) {
            if(rows >= rowsPerStrip) {
                stripByteCounts.push(rowsPerStrip * width * bytesPerSample);
            } else {
                stripByteCounts.push(rows * width * bytesPerSample);
            }
            rows -= rowsPerStrip;
        }
    }

    if(stripOffsets.length !== stripByteCounts.length) {
        throw new Error('Strip offset and byte count lengths are not equal');
    }

    // R, G, B array
    const builder = new TiffDataBuilder(width, height);
    for(let i=0;i<stripOffsets.length;i++) {
        const stripOffset = stripOffsets[i];
        let stripBytes = stripByteCounts[i];
        buf.seek(stripOffset);
        while(stripBytes > 0) {
            // need to convert this properly
            const v = buf.readUint(bytesPerSample);
            if(pmi === 0) {
                if(v === 0) {
                    builder.addRgb(0xff, 0xff, 0xff);
                } else {
                    builder.addRgb(0, 0, 0);
                }
            } else if(pmi === 1) {
                if(v === 0) {
                    builder.addRgb(0, 0, 0);
                } else {
                    builder.addRgb(0xffff, 0xffff, 0xffff);
                }
            }
            stripBytes -= bytesPerSample;
        }
    }


    return builder.build();
}

TiffDecoder.prototype.readEntry = function(buf) {
    const tag = buf.readUint16();
    const type = buf.readUint16();
    const count = buf.readUint32();


    if(type < 1 || type > 6) {
        throw new Error(`Unsupported type ${type}`);
    }
    const typeObj = lookupType[type];
    const oldOffset = buf.offset;
    if(typeObj.size * count > 4) {
        const offset = buf.readUint32();
        buf.seek(offset);
    }
    const result = [];
    for(let i=0;i<count;i++) {
        result.push(typeObj.read(buf));
    }
    buf.offset = oldOffset + 4;
    return {tag, value: result};
}

function TiffDataBuilder(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 3);
    this.offset = 0;
}

TiffDataBuilder.prototype.addRgb = function(r, g, b) {
    this.data[this.offset++] = r;
    this.data[this.offset++] = g;
    this.data[this.offset++] = b;
}

TiffDataBuilder.prototype.build = function() {
    console.assert(this.offset === this.data.length);
    return new TiffData(this.width, this.height, this.data);
}


function TiffData(width, height, data) {
    this.data = data;
    this.height = height;
    this.width = width;
}

TiffData.prototype.getRgb = function(x, y) {
    let idx = (x + y * this.width) * 3;
    return this.data.slice(idx, idx + 3);
}

function Buffer(byteArray) {
    this.buffer= byteArray.buffer;
    this.data = new DataView(this.buffer);
    this.offset = 0;
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
    const ret = this.data.getUint16(this.offset, true);
    this.offset += 2;
    return ret;
}

Buffer.prototype.readUint32 = function() {
    const ret = this.data.getUint32(this.offset, true);
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

// constants

const lookupType = {
    1: { // BYTE
        size: 1,
        read: (buf) => buf.readUint8()
    },
    2: { // ASCII
        size: 1,
        read: (buf) => buf.readUint8()
    },
    3: { // SHORT
        size: 2,
        read: (buf) => buf.readUint16()
    },
    4: { // LONG
        size: 4,
        read: (buf) => buf.readUint32()
    },
    5: { // RATIONAL
        size: 8,
        read: (buf) => buf.readUint32()
    },
    6: { //SBYTE
        size: 1,
        read: (buf) => buf.readInt8()
    }
};

const Tag = {
    ImageWidth: 256,
    ImageLength: 257,
    BitsPerSample: 258,
    Compression: 259,
    PhotometricInterpolation: 262,
    StripOffsets: 273,
    SamplesPerPixel: 277,
    RowsPerStrip: 278,
    StripByteCounts: 279,
    XResolution: 282,
    YResolution: 283,
    ResolutionUnit: 296,
    ColorMap: 320
}


module.exports = {
    TiffDecoder
}


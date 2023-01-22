
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
        try {
            const {tag, value} = this.readEntry(buf);
            map.set(tag, value);
        } catch(e) {}
    }
    console.log(map);

    const ifdMeta = new IfdMetaData(map);

    const builder = new TiffDataBuilder(ifdMeta.width, ifdMeta.height);
    for(let i=0;i<ifdMeta.stripOffsets.length;i++) {
        const stripOffset = ifdMeta.stripOffsets[i];
        const stripBytes = ifdMeta.stripByteCounts[i];
        const strip = this.decompressStrip(ifdMeta, buf.slice(stripOffset, stripBytes));
        buf.seek(stripOffset + stripBytes);

        switch(ifdMeta.imageType) {
            case IfdImageType.Bilevel:
                this.decodeBilevel(ifdMeta, strip, builder);
                break;
            case IfdImageType.Grayscale:
                this.decodeGrayscale(ifdMeta, strip, builder);
                break;
            case IfdImageType.PaletteColor:
                this.decodePaletteColor(ifdMeta, strip, builder);
                break;
            case IfdImageType.Rgb:
                this.decodeRgb(ifdMeta, strip, builder);
                break;
            default:
                throw new Error('Unexpected image type');
        }

    }
    return builder.build();
}

TiffDecoder.prototype.decompressStrip = function(ifdMeta, strip) {
    if(ifdMeta.compression === 1) {
        return strip;
    }
    return new LzwDecompress().decompress(strip);
}

TiffDecoder.prototype.decodeBilevel = function(ifdMeta, buf, builder) {
    while(!buf.atEnd()) {
        const v = buf.readUint8();
        if(ifdMeta.pmi === 0) {
            if(v === 0) {
                builder.addRgb(0xff, 0xff, 0xff);
            } else {
                builder.addRgb(0, 0, 0);
            }
        } else {
            if(v === 0) {
                builder.addRgb(0, 0, 0);
            } else {
                builder.addRgb(0xff, 0xff, 0xff);
            }
        }
    }
}

TiffDecoder.prototype.decodeGrayscale = function(ifdMeta, buf, builder) {
    const maxColor = (2 ** ifdMeta.bitsPerSample) - 1;
    while(!buf.atEnd()) {
        // assume v <= maxColor
        let rawValue = buf.readUint8();
        if(ifdMeta.pmi === 0) {
            rawValue = maxColor - rawValue;
        }
        const v = 255 * rawValue / maxColor;
        builder.addRgb(v, v, v);
    }
}

TiffDecoder.prototype.decodeRgb = function(ifdMeta, buf, builder) {
    while(!buf.atEnd()) {
        // assume bits per sample is 8, 8, 8
        const r = buf.readUint8();
        const g = buf.readUint8();
        const b = buf.readUint8();
        builder.addRgb(r, g, b);
    }
}

TiffDecoder.prototype.decodePaletteColor = function(ifdMeta, buf, builder) {
    const l = ifdMeta.colorMap.length / 3;
    while(!buf.atEnd()) {
        // TODO verify if colors are correct
        const v = buf.readUint8();

        const r = Math.floor(ifdMeta.colorMap[v] / 256);
        const g = Math.floor(ifdMeta.colorMap[v + l] / 256);
        const b = Math.floor(ifdMeta.colorMap[v + l * 2] / 256);
        builder.addRgb(r, g, b);
    }
}

TiffDecoder.prototype.readEntry = function(buf) {
    const tag = buf.readUint16();
    const type = buf.readUint16();
    const count = buf.readUint32();

    // TODO should ignore unsupported tags
    if(type < 1 || type > 6) {
        buf.skip(4);
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

const IfdImageType = {
    Bilevel: 0,
    Grayscale: 1,
    PaletteColor: 2,
    Rgb: 3
}
function IfdMetaData(map) {
    // TODO implement resolution
    this.map = map;

    // validate properties
    this._assertSingle('ImageWidth', Tag.ImageWidth);
    this._assertSingle('ImageLength', Tag.ImageLength);
    this._assertSingle('RowPerStrip', Tag.RowsPerStrip);
    this._assertSingle('Compression', Tag.Compression);


    this.width = map.get(Tag.ImageWidth)[0];
    this.height = map.get(Tag.ImageLength)[0];

    this.stripOffsets = map.get(Tag.StripOffsets);
    this.stripByteCounts = map.get(Tag.StripByteCounts);
    this.rowsPerStrip = map.get(Tag.RowsPerStrip)[0];
    this.compression = map.get(Tag.Compression)[0];


    // should set image type
    this.pmi = map.get(Tag.PhotometricInterpolation)[0];

    switch(this.pmi) {
        case 0:
        case 1: // Bilevel or grayscale
            if(map.get(Tag.BitsPerSample) == null) {
                this.bitsPerSample = 8;
                this.imageType = IfdImageType.Bilevel;
                break;
            }
            this.imageType = IfdImageType.Grayscale;
            this.bitsPerSample = map.get(Tag.BitsPerSample)[0];
            break;
        case 2: // RGB
            this.imageType = IfdImageType.Rgb;
            this.bitsPerSample = map.get(Tag.BitsPerSample); // should be 8, 8, 8
            break;
        case 3: // Palette Color
            this.imageType = IfdImageType.PaletteColor
            this.bitsPerSample = map.get(Tag.BitsPerSample)[0];
            this.colorMap = map.get(Tag.ColorMap);
            if(this.colorMap.length !== (2 ** this.bitsPerSample) * 3) {
                throw new Error(`Color map length ${this.colorMap.length} 
                not appropriate for bits per sample ${this.bitsPerSample}`);
            }
            break;
        default:
            throw new Error(`Invalid PMI ${this.pmi}`);
    }

    // try to infer strip byte counts
    if(this.stripByteCounts === undefined) {
        this.stripByteCounts = this._inferStripByteCounts(
            this.compression, this.rowsPerStrip, this.stripOffsets,
            this.bitsPerSample, this.width, this.height);
    }

    if(this.stripOffsets.length !== this.stripByteCounts.length) {
        throw new Error('Strip offset and byte count lengths are not equal');
    }

    // TODO support other compression types
    if(this.compression !== 1 && this.compression !== 5) {
        throw new Error(`Unsupported compression type ${this.compression}`);
    }
}

IfdMetaData.prototype._assertSingle = function(name, key) {
    const list = this.map.get(key);
    if(list == null) {
        throw new Error(`Param ${name} should not be null/undefined`);
    }
    if(list.length !== 1) {
        throw new Error(`Param ${name} has length ${list.length} instead of 1`);
    }
}

IfdMetaData.prototype._inferStripByteCounts = function(
    compression, rowsPerStrip, stripOffsets, bitsPerSample, width, height) {
    if(compression !== 1) {
        throw new Error('Missing StripByteCounts');
    }
    const stripByteCounts = [];
    let rows = height;
    for(let i=0;i<stripOffsets.length;i++) {
        if(rows >= rowsPerStrip) {
            stripByteCounts.push(rowsPerStrip * width * bitsPerSample / 8);
        } else {
            stripByteCounts.push(rows * width * bitsPerSample / 8);
        }
        rows -= rowsPerStrip;
    }
    return stripByteCounts;
}

function Buffer(byteArray) {
    // TODO this is roundabout
    this.buffer= byteArray.buffer;
    this.data = new DataView(this.buffer, byteArray.byteOffset, byteArray.byteLength);
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

Buffer.prototype.slice = function(offset, length) {
    const byteArray = new Uint8Array(this.buffer, offset, length);
    return new Buffer(byteArray);
}

Buffer.prototype.atEnd = function() {
    return this.offset === this.data.byteLength;
}

function LzwDecompress() {
}

LzwDecompress.prototype.decompress = function() {

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
    6: { // SBYTE
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

/*
Notes
- how do we pack bitsPerSample = 4?
- dealing with bitsPerSample > 8
- we should probably not be downsampling 48bit rgb
- support big endian

 */


module.exports = {
    TiffDecoder
}


const {lookupType, Tag} = require("./constants");
const {ByteBuffer, BitBuffer} = require("./buffer");
const {LzwDecompress} = require('./lzw');
const {PackBitsDecoder} = require('./packbits');

function TiffDecoder() {
}

TiffDecoder.prototype.decode = function(data) {
    // data must be uint8array buffer
    const buf = new ByteBuffer(data);
    const endianHeader = buf.readUint16();
    if(endianHeader === 0x4d4d) {
        buf.setLittleEndian(false);
    } else if(endianHeader !== 0x4949) {
        throw new Error("Invalid header");
    }

    if(buf.readUint16() !== 42) {
        throw new Error('Invalid header');
    }

    const ifdOffset = buf.readUint32();
    buf.seek(ifdOffset);
    return this.decodeIfd(buf);
}

TiffDecoder.prototype.decodeIfdMeta = function(buf) {
    const nEntries = buf.readUint16();
    const map = new Map();
    for(let i=0;i<nEntries;i++) {
        try {
            const {tag, value} = this.readEntry(buf);
            map.set(tag, value);
        } catch(e) {}
    }

    return new IfdMetaData(map);
}

TiffDecoder.prototype.decodeIfd = function(buf) {
    const ifdMeta = this.decodeIfdMeta(buf);
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
    if(ifdMeta.compression === 5) {
        const data = new LzwDecompress().decompress(strip);
        if(ifdMeta.predictor === 2) {
            this.applyPredictor(data, ifdMeta.bitsPerSample, ifdMeta.samplesPerPixel, ifdMeta.width);
        }
        return new ByteBuffer(data);
    }
    if(ifdMeta.compression === 32773) {
        const data = new PackBitsDecoder().decode(strip)
        return new ByteBuffer(data);
    }
    throw new Error(`Unsupported compression value: ${ifdMeta.compression}`);
}

TiffDecoder.prototype.applyPredictor = function(byteArray, bitsPerSample, samplesPerPixel, width) {
    let data = byteArray;
    let mask = 255;
    if(bitsPerSample === 16) {
        data = new Uint16Array(byteArray);
        mask = 65535;
    }
    if(bitsPerSample !== 8) {
        // don't support 1, 2, 4 bits for now
        throw new Error(`Unsupported bits per sample for predictor : ${bitsPerSample}`);
    }

    for(let i=0;i<data.length;i++) {
        if(i % (width * samplesPerPixel) < samplesPerPixel) continue;
        data[i] = (data[i] + data[i - samplesPerPixel]) & mask;
    }
}

TiffDecoder.prototype.decodeBilevel = function(ifdMeta, buf, builder) {
    const [readNext, atEnd] = getBitReader(buf, ifdMeta.bitsPerSample, ifdMeta.width);
    while(!atEnd()) {
        const v = readNext();
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
    const [readNext, atEnd] = getBitReader(buf, ifdMeta.bitsPerSample, ifdMeta.width);
    while(!atEnd()) {
        let v = readNext();
        if(ifdMeta.pmi === 0) {
            v = 255 - v;
        }
        builder.addRgb(v, v, v);
    }
}

TiffDecoder.prototype.decodeRgb = function(ifdMeta, buf, builder) {
    const [readNext, atEnd] = getBitReader(buf, ifdMeta.bitsPerSample, ifdMeta.width);

    while(!atEnd()) {
        const r = readNext();
        const g = readNext();
        const b = readNext();
        // TODO finish supporting extrasamples
        if(ifdMeta.samplesPerPixel === 4) {
            const a = readNext();
            builder.addRgba(r, g, b, a);
        } else {
            builder.addRgb(r, g, b);
        }
    }
}

function getBitReader(buf, n, columnLength) {
    if(n === 8) {
        return [() => buf.readUint8(), () => buf.atEnd()];
    }
    if(n === 16) {
        return [() => Math.floor(buf.readUint16() / 256), () => buf.atEnd()];
    }
    const maxVal = (1 << n) - 1;
    const bitBuffer = new BitBuffer(buf);
    let counter = 0;
    return [
        () => {
            const v = bitBuffer.readBits(n);
            counter++;
            // ensure that bytes are aligned to columns
            if(columnLength === counter) {
                counter = 0;
                bitBuffer.skipRemainingBits();
            }
            return Math.floor(v * 255 / maxVal);
        },
        () => bitBuffer.atEnd()
    ];
}

function getPaletteBitReader(buf, n, columnLength) {
    if(n === 8) {
        return [() => buf.readUint8(), () => buf.atEnd()];
    }
    if(n === 16) {
        return [() => buf.readUint16(), () => buf.atEnd()];
    }
    const bitBuffer = new BitBuffer(buf);
    let counter = 0;
    return [
        () => {
            const v = bitBuffer.readBits(n);
            counter++;
            // ensure that bytes are aligned to columns
            if(columnLength === counter) {
                counter = 0;
                bitBuffer.skipRemainingBits();
            }
            return Math.floor(v);
        },
        () => bitBuffer.atEnd()
    ];
}

TiffDecoder.prototype.decodePaletteColor = function(ifdMeta, buf, builder) {
    const l = ifdMeta.colorMap.length / 3;
    const [readNext, atEnd] = getPaletteBitReader(buf, ifdMeta.bitsPerSample, ifdMeta.width);
    while(!atEnd()) {
        // TODO verify if colors are correct
        const v = readNext();

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
    this.data = new Uint8Array(width * height * 4);
    this.offset = 0;
}

TiffDataBuilder.prototype.atEnd = function() {
    return this.offset === this.data.length;
}

TiffDataBuilder.prototype.addRgb = function(r, g, b) {
    this.addRgba(r, g, b, 255);
}

TiffDataBuilder.prototype.addRgba = function(r, g, b, a) {
    this.data[this.offset++] = r;
    this.data[this.offset++] = g;
    this.data[this.offset++] = b;
    this.data[this.offset++] = a;
}

TiffDataBuilder.prototype.build = function() {
    return new TiffData(this.width, this.height, this.data);
}


function TiffData(width, height, data) {
    this.data = data;
    this.height = height;
    this.width = width;
}

TiffData.prototype.getRgb = function(x, y) {
    let idx = (x + y * this.width) * 4;
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
    this.predictor = map.get(Tag.Predictor) == null ? 1 : map.get(Tag.Predictor)[0];


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
            this.samplesPerPixel = 1;
            break;
        case 2: // RGB
            this.imageType = IfdImageType.Rgb;
            this.bitsPerSample = map.get(Tag.BitsPerSample)[0]; // assume bits per each rgb are the same
            this.samplesPerPixel = map.get(Tag.SamplesPerPixel)[0];
            // TODO also need to parse ExtraSamples
            break;
        case 3: // Palette Color
            this.imageType = IfdImageType.PaletteColor
            this.bitsPerSample = map.get(Tag.BitsPerSample)[0];
            this.samplesPerPixel = 1;
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
    if(this.compression !== 1 && this.compression !== 5 && this.compression !== 32773) {
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

/*
Notes
- dealing with float32
- Planar configuration

 */


module.exports = {
    TiffDecoder
}


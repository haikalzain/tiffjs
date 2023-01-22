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
    lookupType,
    Tag
}
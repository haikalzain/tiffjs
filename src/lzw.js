const {BitBuffer} = require("./buffer");

function LzwDecompress() {
    this._reset();
}

LzwDecompress.prototype.decompress = function(buf) {
    const output = []; // TODO optimize
    let curString = [];
    let prevString = [];
    const bitBuffer = new BitBuffer(buf);
    while(!bitBuffer.atEnd()) {
        const v = bitBuffer.readBits(this.nBits);

        if(v === 256) {
            this._reset();
            prevString = [];
            continue;
        }
        if(v === 257) {
            break;
        }
        //if(v < 0 || v >= this.nEntries) throw new Error(`Error in LZW decode, unexpected value ${v}`);

        curString = this._lookup(v);
        if(curString === undefined) {
            prevString.push(prevString[0]);
            this._addEntry([...prevString]);
            output.push(...prevString);
        }  else {
            output.push(...curString);
            prevString.push(curString[0]);
            if(prevString.length > 1) this._addEntry([...prevString]);
            prevString = [...curString];
        }
    }
    return new Uint8Array(output);
}

LzwDecompress.prototype._repr = function(entry) {
    return entry.join(',');
}

LzwDecompress.prototype._lookup = function(code) {
    if(code < 256) {
        return [code];
    }
    return this.table.get(code);
}

LzwDecompress.prototype._addEntry = function(entry) {
    if(this.nEntries > 4095) {
        throw new Error('LZW table too large');
    }
    if(this.nEntries === 510 || this.nEntries === 1022 || this.nEntries === 2046) {
        this.nBits++;
    }
    this.table.set(this.nEntries++, entry);
}

LzwDecompress.prototype._reset = function() {
    this.table = new Map(); // stores code -> sequence
    this.nBits = 9;
    this.nEntries = 258;
}

module.exports = {
    LzwDecompress
}
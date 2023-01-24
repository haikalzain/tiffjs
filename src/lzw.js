
function LzwDecompress() {
    this.table = new Map();
}

LzwDecompress.prototype.decompress = function(buf) {
    while(!buf.atEnd()) {
        const b = buf.readUint8();

    }

}

LzwDecompress.prototype._isInTable = function() {

}

module.exports = {
    LzwDecompress
}
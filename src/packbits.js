const {ByteBuffer} = require("./buffer");

// function BufWriter(byteArray) {
// }
//
// BufWriter.prototype.setUInt8 = function(value) {
//     const ret = this.data.setUInt8(this.offset, value);
//     this.offset++;
//     return ret;
// }
//
// BufWriter.prototype.setInt8 = function(value) {
//     const ret = this.data.setInt8(this.offset, value);
//     this.offset++;
//     return ret;
// }

function Packbits() {}

Packbits.prototype._encode_chunk = function(byteArray, start, cnt, r) {
    output = []
    if (cnt === 0) {
        return output
    }

    if (r) {
        let n = -(cnt-1)
        output.push(n)
        output.push(byteArray[start])
    } else {
        let n = cnt-1
        output.push(n)
        output.push(...byteArray.slice(start, start+cnt))
    }
    return output
}

Packbits.prototype.encode = function(byteArray) {
    const output = []
    let cnt = 1
    let prev = byteArray[0]
    let r = false

    let i = 1
    for (; i < byteArray.length; i++) {
        let cur = byteArray[i]

        if (cnt === 128) {
            output.push(...this._encode_chunk(byteArray, i-cnt, cnt, r))
            prev = cur
            cnt = 1
            r = false
            continue
        }

        if (cur !== prev) {
            if (r) {
                output.push(...this._encode_chunk(byteArray, i-cnt, cnt, r))
                cnt = 0
                r = false
            }
        } else {
            if (!r) {
                output.push(...this._encode_chunk(byteArray, i-cnt, cnt-1, r))
                cnt = 1
                r = true
            }
        }
        prev = cur
        cnt++
    }

    output.push(...this._encode_chunk(byteArray, i-cnt, cnt, r))

    return new Uint8Array(output)
}

Packbits.prototype.decode = function(buffer) {
    const output = []
    while(!buffer.atEnd()){
        let n = buffer.readInt8()
        // console.log("n:", n)
        if (n === -128) {
            continue
        }
        if (0 <= n && n <= 127) {
            for (let i = 0; i < (n+1); i++) {
                let b = buffer.readUint8()
                output.push(b)
            }
            continue
        }
        if (-127 <= n && n <= -1) {
            let b = buffer.readUint8()
            for (let i = 0; i < (-n+1); i++) {
                output.push(b)
            }
            continue
        }

        throw new Error(`Invalid int8: ${n}`)
    }
    return new Uint8Array(output)
}

const encodeMaps = [
    [
        [0xAA, 0xAA, 0xAA, 0xBB, 0xCC, 0xDD, 0xAA, 0xAA, 0xAA, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA],
        [0xFE, 0xAA, 0x02, 0xBB, 0xCC, 0xDD, 0xFD, 0xAA, 0x03, 0xBB, 0xCC, 0xDD, 0xEE, 0xF7, 0xAA],
    ],
    [
        [0xAA],
        [0x00, 0xAA],
    ],
    [
        [0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA],
        [0xF9, 0xAA],
    ],
    [
        [0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xBB],
        [0xF9, 0xAA, 0x00, 0xBB],
    ],
    [
        [0xA0, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8],
        [0x07, 0xA0, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8],
    ],
    [
        [0xA0, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA8],
        [0x06, 0xA0, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xFF, 0xA8],
    ],
]

function testEncode() {
    let pb = new Packbits()
    for (let test of encodeMaps) {
        let testDecoded = new Uint8Array(test[0])
        let testEncoded = new Uint8Array(test[1])
        let encoded = pb.encode(testDecoded)
        console.log(encoded, testEncoded, "\n\n")
        console.assert( encoded.toString() === testEncoded.toString(), `actual: ${encoded} expected: ${testEncoded}`)
    }
}

function testDecode() {
    let pb = new Packbits()
    for (let test of encodeMaps) {
        let testDecoded = new Uint8Array(test[0])
        let testEncoded = new Uint8Array(test[1])
        let decoded = pb.decode(new ByteBuffer(testEncoded))
        console.log(decoded, testDecoded, "\n\n")
        console.assert(decoded.toString() === testDecoded.toString(), `actual: ${decoded} expected: ${testDecoded}`)
    }
    console.log("testDecode complete")
}

testEncode()
testDecode()


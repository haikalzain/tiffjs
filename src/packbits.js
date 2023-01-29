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

function PackBitsEncoder() {}
PackBitsEncoder.prototype._encode_chunk = function(byteArray, start, cnt, r) {
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

PackBitsEncoder.prototype.encode = function(byteArray) {
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

function PackBitsDecoder() {}

PackBitsDecoder.prototype.decode = function(buffer) {
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




module.exports = {
    PackBitsEncoder,
    PackBitsDecoder
}

// testEncode()
// testDecode()


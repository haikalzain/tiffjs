const fs = require('fs');
const path = require('path');
const { TiffDecoder } = require('..');
function readImage(name) {
    return fs.readFileSync(path.join(__dirname, '../img', name));
}

describe('reads tiff correctly', () => {
    it('reads black.tif correctly', () => {
        const data = readImage('black.tif');
        const decoder = new TiffDecoder();
        const result = decoder.decode(data);
        expect(result.height).toEqual(2690);
        expect(result.width).toEqual(9192);
        expect(result.data.length).toEqual(result.height * result.width * 3);
        /*if(result.data.length === result.height * result.width * 3) {
            for (let i = 0; i < result.height * result.width * 3; i++) {
                if(i %10000 === 0)console.log(i);
                //expect(result.data[i]).toEqual(0);
            }
        }*/
    });
});
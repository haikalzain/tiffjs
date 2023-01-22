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

    it('reads palette.tif correctly', () => {
        const data = readImage('palette.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.height).toEqual(9);
        expect(result.width).toEqual(9);
        for(let i=0;i<9;i++) {
            expect(result.getRgb(i, 0)[0]).toEqual(255);
            expect(result.getRgb(i, 0)[1]).toEqual(0);
            expect(result.getRgb(i, 0)[2]).toEqual(0);
        }
        for(let i=0;i<9;i++) {
            expect(result.getRgb(i, 1)[0]).toEqual(0);
            expect(result.getRgb(i, 1)[1]).toEqual(255);
            expect(result.getRgb(i, 1)[2]).toEqual(0);
        }
        for(let i=0;i<9;i++) {
            expect(result.getRgb(i, 2)[0]).toEqual(0);
            expect(result.getRgb(i, 2)[1]).toEqual(0);
            expect(result.getRgb(i, 2)[2]).toEqual(255);
        }
    })
});
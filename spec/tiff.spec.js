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
        expect(result.data.length).toEqual(result.height * result.width * 4);
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

    it('reads rgb-3c-8b.tiff', () => {
        const data = readImage('rgb-3c-8b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads rgb-3c-16b.tiff', () => {
        const data = readImage('rgb-3c-16b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads palette-1c-8b.tiff', () => {
        const data = readImage('palette-1c-8b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads palette-1c-4b.tiff', () => {
        const data = readImage('palette-1c-4b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads palette-1c-1b.tiff', () => {
        const data = readImage('palette-1c-1b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads cells.tif', () => {
        const data = readImage('cells.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(2048);
        expect(result.height).toEqual(2048);
        //expect(result.data).toMatchSnapshot();
    });

    it('reads lzw-single-strip.tiff', () => {
        const data = readImage('lzw-single-strip.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(7795);
        expect(result.height).toEqual(3122);
        //expect(result.data).toMatchSnapshot();
    });

    it('reads color8-lzw.tif', () => {
        const data = readImage('color8-lzw.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(160);
        expect(result.height).toEqual(120);
        const expected = new TiffDecoder().decode(readImage('color8.tif'));
        expect(result).toEqual(expected);
    });

    it('reads color16-lzw.tif', () => {
        const data = readImage('color16-lzw.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(160);
        expect(result.height).toEqual(120);
        const expected = new TiffDecoder().decode(readImage('color16.tif'));
        expect(result).toEqual(expected);
    });

    it('reads grey8-lzw.tif', () => {
        const data = readImage('grey8-lzw.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(30);
        expect(result.height).toEqual(90);
        const expected = new TiffDecoder().decode(readImage('grey8.tif'));
        expect(result).toEqual(expected);
    });

    it('reads miniswhite-1c-1b.tiff', () => {
        const data = readImage('miniswhite-1c-1b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads minisblack-1c-8b.tiff', () => {
        const data = readImage('minisblack-1c-8b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads minisblack-1c-16b.tiff', () => {
        const data = readImage('minisblack-1c-16b.tiff');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(157);
        expect(result.height).toEqual(151);
        expect(result.data).toMatchSnapshot();
    });

    it('reads image-lzw.tif', () => {
        const data = readImage('image-lzw.tif');
        const result = new TiffDecoder().decode(data);
        expect(result.width).toEqual(2590);
        expect(result.height).toEqual(3062);
        //expect(result.data).toMatchSnapshot();
    });
});

// TODO hash snapshots of large images
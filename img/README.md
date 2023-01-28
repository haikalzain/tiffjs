### tiffjs
Pure javascript, zero dependencies library to render tiffs in browser.

tiffjs supports:
- RGB, palette, grayscale and color images (1, 2, 4, 8, 16 bit)
- LZW decompression
- 8 and 16 bit horizontal differencing predictor

### Usage
`TiffDecoder.decode` takes a Uint8Array of raw tiff bytes and returns a `TiffData` object.

```
const rawImg = await fetch('some-image.tiff');
const imgBytes = new Uint8Array(await rawImg.arrayBuffer());
const tiffData = new TiffDecoder.decode(imgBytes);
// do something with tiffData
```
TiffData exposes the image data as 8-bit RGB pixels
```
const height = tiffData.height;
const width = tiffData.width;
// get rgb of some pixel (0 - 255)
const [r, g, b] = tiffData.getRgb(h, w);
```


### Contributing

Bug reports and pull requests are welcome.

### Acknowledgements
tiffjs uses testing images from
- libtiff (https://gitlab.com/libtiff/libtiff)
- tiff (https://github.com/image-js/tiff)
let tiffDecoder = new tiff.TiffDecoder();

(async function() {
    const img = await fetch('../img/black-packbits.tiff');
    const imgBytes = new Uint8Array(await img.arrayBuffer());
    let data = tiffDecoder.decode(imgBytes);
    const imgData = data.data;
    let canvas = document.getElementById('canvas');

    canvas.width = data.width;
    canvas.height = data.height;
    let ctx = canvas.getContext('2d');


    const rgbaImageData = ctx.createImageData(canvas.width, canvas.height);
    console.log(canvas.height, canvas.width);
    for(let i=0;i<canvas.height * canvas.width;i++) {
        rgbaImageData.data[4 * i] = imgData[4 * i];
        rgbaImageData.data[4 * i + 1] = imgData[4 * i + 1];
        rgbaImageData.data[4 * i + 2] = imgData[4 * i + 2];
        rgbaImageData.data[4 * i + 3] = imgData[4 * i + 3];
    }
    //rgbaImageData.data = imgData;
    ctx.putImageData(rgbaImageData, 0, 0);
    //console.log('done');
    //console.log(rgbaImageData);
})()
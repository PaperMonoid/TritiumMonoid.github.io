(function() {

const canvas         = document.getElementById("canvas");
const context        = canvas.getContext("2d");
const classification = document.getElementById("classification");
const weights        = document.getElementById("weights");
const clear          = document.getElementById("clear");
const k              = 8;

const db = [
    createImage("db/db-1.jpg"),
    createImage("db/db-2.jpg")
];

Object.keys(db).forEach(i => db[i].onload = _ => {
    const numbers = [];
    for (let n = 0; n <= 9; n++) {
        numbers[n] = [];
        for (let j = 0; j < db[i].height / dbDigitHeight / 2; j++) {
            numbers[n].push(alignBWImageData(createBWImageData(
                getImageDataFromDB(db)(i)(n)(j),
                canvas.width, canvas.height)));
        }
    }
    db[i] = numbers;
});

const dbDigitWidth = 165;
const dbDigitHeight = 161;

function getImageDataFromDB(db) {
    return i => n => j => createImageData(db[i], 
        (n * dbDigitWidth) + 10, (j * dbDigitHeight * 2.055) + 8, 
        dbDigitWidth, dbDigitHeight);
};

function createImage(url) {
    const img = new Image();
    img.src = url;
    return img;
}

function createImageData(img, x, y, height, width) {
    const cnv = document.createElement("canvas");
    cnv.width = canvas.width;
    cnv.height = canvas.height;
    const ctx = cnv.getContext("2d");
    ctx.drawImage(img, x || 0, y || 0, width || cnv.width, height || cnv.height,
        0, 0, cnv.width, cnv.height);
    return ctx.getImageData(0, 0, cnv.width, cnv.height);
}

function createBWImageData(imageData) {
    const bwImageData = [];
    const threshold = 160;
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
        bwImageData[j] = (imageData.data[i + 0] < threshold &&
                          imageData.data[i + 1] < threshold &&
                          imageData.data[i + 2] < threshold);
    }
    return bwImageData;
}

function alignBWImageData(bwImageData, width, height) {
    let toPoint = i => [i % width, Math.floor(i / width)];
    let top, bottom, left, right;
    for (let i = 0; i < width * height; i += width) {
        for (let j = 0; j < width; j++) {
            if (bwImageData[i + j]) {
                if (!top || i < Math.floor(top / width)) {
                    top = i + j;
                }
                if (!bottom || i > Math.floor(bottom / width)) {
                    bottom = i + j;
                }
                if (!left || j < left % width) {
                    left = i + j;
                }
                if (!right || j > right % width) {
                    right = i + j;
                }
            }
        }
    }    
    let pointTop = toPoint(top), pointLeft = toPoint(left),
        pointBottom = toPoint(bottom), pointRight = toPoint(right);
    let sheight  = pointBottom[1] - pointTop[1];
    let swidth   = pointRight[0]  - pointLeft[0];
    let offsetTop, offsetLeft, offset;
 
    offsetLeft = pointLeft[0] - Math.round(width / 2) + Math.round(swidth / 2);
    offsetTop  = pointTop[1] - Math.round(height / 2) + Math.round(sheight / 2);
    offset     = (offsetTop + 10) * width + offsetLeft + 10; 

    for (let i = pointTop[1] * width; i < pointBottom[1] * width; i += width) {
        for (let j = pointLeft[0]; j < pointRight[0]; j++) {
            let swap = bwImageData[i + j];
            bwImageData[i + j] = bwImageData[i + j - offset];
            bwImageData[i + j - offset] = swap;
        }
    }
    return bwImageData;
}

function putBWImageData(bwImageData) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
        if (bwImageData[j]) {
            imageData.data[i + 0] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
        }
        else {
            imageData.data[i + 0] = 255;
            imageData.data[i + 1] = 255;
            imageData.data[i + 2] = 255;
        }
        imageData.data[i + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
}


function findPosition(e) {
    let position = [0, - e.offsetTop - 10];
    while (e = e.offsetParent) {
        position[0] += e.offsetLeft;
        position[1] += e.offsetTop;
    }
    return position;
}

function Mouse() {
    this.position = null;
    this.deltaPosition = null;
    this.active = false; 
}

Mouse.prototype.start = function() {
    this.active = true;
};

Mouse.prototype.end = function() {
    this.active = false;
    this.position = null;
    this.deltaPosition = null;
};

Mouse.prototype.updatePosition = function(x, y) {
    this.deltaPosition = this.position || [x, y];
    this.position = [x, y];
}; 

const mouse = new Mouse();

function updateCanvas(x, y) {
    if(mouse.active) {
        let position = findPosition(canvas);
        mouse.updatePosition(canvas.width / canvas.offsetWidth * (x - canvas
            .offsetLeft) - position[0], canvas.height / canvas.offsetHeight * 
            (y - canvas.offsetTop) - position[1]);
        context.lineWidth = 2; // wtf?
        context.beginPath();
        context.moveTo(mouse.deltaPosition[0], mouse.deltaPosition[1]);
        context.lineTo(mouse.position[0], mouse.position[1]);
        context.stroke();
    }
}

function clearCanvas(squaresx, squaresy) {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    context.lineWidth = 1;
    context.strokeStyle = "grey";
    for (let i = 0; i < canvas.width; i += squaresx) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, canvas.height);
        context.stroke();
    }
    for (let i = 0; i < canvas.height; i += squaresy) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(canvas.height, i);
        context.stroke();
    }
    context.strokeStyle = "black";
    classification.value = "Prediction";
    weights.value = "Rank";
    mouse.position = null;
    mouse.deltaposition = null;
}

clearCanvas(20, 20);

function classify() {
    let comparison = [];
    let bwImageData = createBWImageData(context.getImageData(0, 0, canvas.width,
        canvas.height));
    for (let i = 0; i < db.length; i++) {
        for (let n = 0; n < db[i].length; n++) {
            for (let j = 0; j < db[i][n].length; j++) {
                comparison.push([n, compare(bwImageData, db[i][n][j])]);
            }
        }
    }
    comparison = comparison
    .sort((a, b) => b[1] - a[1])
    .slice(0, (k < comparison.length) ? k : comparison.length);
    let results = determine(comparison, i => 1);
    weights.value = "";
    results.forEach(r => weights.value += r[0] + ": " + r[1] + "\n");
    classification.value = results[0][0];
}

function determine(arr, f) {
    let count = {};
    for (let i = 0; i < arr.length; i++) {
        if (!count[arr[i][0]]) {
            count[arr[i][0]] = f(i);
        }
        else {
            count[arr[i][0]] += f(i);
        }
    }
    count = Object.keys(count).sort((a, b) => count[b] - count[a])
        .map(key => [key, count[key]]);
    return count;
}

function compare(bwImageData1, bwImageData2) {
    let acumulator = 0;
    for (let i = 0; i < bwImageData1.length; i++) {
        if (bwImageData1[i] == bwImageData2[i])
            acumulator += (bwImageData1[i]) ? 6 : 1; 
    }
    return acumulator;
}

canvas.addEventListener("mousedown", e => mouse.start(), false);
canvas.addEventListener("mouseup", e => { mouse.end(); classify(); }, false);
canvas.addEventListener("mousemove", e => updateCanvas(e.clientX, e.clientY), 
    false);

canvas.addEventListener("touchstart", e => mouse.start(), false);
canvas.addEventListener("touchend", e => { mouse.end(); classify(); }, false);
canvas.addEventListener("touchmove", e => { e.preventDefault(); updateCanvas(
    e.touches[0].pageX, e.touches[0].pageY); }, false);

clear.addEventListener("click", e => clearCanvas(20, 20));

})();

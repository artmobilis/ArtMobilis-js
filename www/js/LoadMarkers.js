// todo: any size/mode image learning
// todo: init 3D objects associated here
// todo: read 3D ad image from json


var templateX = 400, templateY = 600; // size of learn patterns (portrait mode currently)
var trained_8u;

// using <img>
var load_trained_patterns = function (name) {
    var img2 = document.getElementById(name);
    var contx = container.getContext('2d');
    contx.drawImage(img2, 0, 0, templateX, templateY);
    var imageData = contx.getImageData(0, 0, templateX, templateY);

    trained_8u = new jsfeat.matrix_t(templateX, templateY, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.grayscale(imageData.data, templateX, templateY, trained_8u);
    trainpattern(trained_8u); // le pattern doit etre plus grand que 512*512 dans au moins une dimension (sinon pas de rescale et rien ne se passe)
};

// using direct link
var load_trained_patterns2 = function (name) {
    img = new Image();
    img.onload = function () {
        var contx = container.getContext('2d');
        contx.drawImage(img, 0, 0, templateX, templateY);

        var imageData = contx.getImageData(0, 0, templateX, templateY);
        trained_8u = new jsfeat.matrix_t(templateX, templateY, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, templateX, templateY, trained_8u);
        trainpattern(trained_8u); // le pattern doit etre plus grand que 512*512 dans au moins une dimension (sinon pas de rescale et rien ne se passe)
    }
    img.src = name;
};


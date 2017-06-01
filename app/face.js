function analyzeFace(canvas) {
    var params = {
        // Request parameters
    };
    var img = canvas.toDataURL();
    // Convert Base64 image to binary
    var file = dataURItoBlob(img);

    var params = {
        // Request parameters
        "returnFaceId": true,
        "returnFaceLandmarks": true,
        "returnFaceAttributes": "emotion",
    };

    return $.ajax({
        url: "https://westus.api.cognitive.microsoft.com/face/v1.0/detect?" + $.param(params),
        contentType: 'application/octet-stream',
        beforeSend: function(xhrObj){
            // Request headers
            xhrObj.setRequestHeader("Content-Type","application/octet-stream");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key",process.env.FACE_API_KEY);
        },
        type: "POST",
        // Request body
        data: file,
        processData: false
    })
    .done(function(data) {
        return Promise.resolve(data);
    })
    .fail(function(err) {
        console.error("Face API Error", err);
    });
}


function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {type:mimeString});
}


module.exports = {
  analyzeFace: analyzeFace
};
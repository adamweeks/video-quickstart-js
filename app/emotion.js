var EMOTIONS = {
  anger: '😡',
  contempt: '😒',
  disgust: '🤢',
  fear: '😱',
  happiness: '😀',
  neutral: '😐',
  sadness: '😥',
  surprise: '😲'
};


function getEmoji(emotions) {
  var s = emotions;
  var sortedEmotions = Object.keys(s).sort(function (a, b) {
    if (s[a] > s[b]) {
      return -1;
    }
    if (s[a] < s[b]) {
      return 1;
    }
    return 0;
  });
  var emotion = sortedEmotions[0];
  if (emotion === `neutral` && emotions[emotion] < 0.8) {
    emotion = sortedEmotions[1];
  }
  return EMOTIONS[emotion];
}

function analyzeEmotion(canvas) {
    var params = {
        // Request parameters
    };
    var img = canvas.toDataURL();
    // Convert Base64 image to binary
    var file = dataURItoBlob(img);
    return $.ajax({
        // NOTE: You must use the same location in your REST call as you used to obtain your subscription keys.
        //   For example, if you obtained your subscription keys from westcentralus, replace "westus" in the
        //   URL below with "westcentralus".
        url: "https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize?" + $.param(params),
        contentType: 'application/octet-stream',
        beforeSend: function(xhrObj){
            // Request headers
            xhrObj.setRequestHeader("Content-Type","application/octet-stream");

            // NOTE: Replace the "Ocp-Apim-Subscription-Key" value with a valid subscription  key.
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", process.env.EMOTION_API_KEY);
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
        console.error("Emotion API Error", err);
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
  analyzeEmotion: analyzeEmotion,
  getEmoji: getEmoji,
  EMOTIONS: EMOTIONS
};
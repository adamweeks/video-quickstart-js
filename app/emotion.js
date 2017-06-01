export var EMOTIONS = {
  anger: '😡',
  contempt: '😒',
  disgust: '🤢',
  fear: '😱',
  happiness: '😀',
  neutral: '😐',
  sadness: '😥',
  surprise: '😲'
};


export default function getEmoji(emotions) {
  var s = emotions.scores;
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
  if (emotion === `neutral` && emotions.scores[emotion] < 0.8) {
    emotion = sortedEmotions[1];
  }
  return EMOTIONS[emotion];
}
'use strict';
require('./styles.css');
var Video = require('twilio-video');
var getParameterByName = require('./utils').getParameterByName;
var getEmoji = require('./emotion').getEmoji;
var analyzeEmotion = require('./emotion').analyzeEmotion;
var activeRoom;
var previewTracks;
var identity;
var roomName;
var isPresenter = getParameterByName('presenter');
var isFaceEmoji = getParameterByName('easterEgg') === 'face';
var isJose = getParameterByName('easterEgg') === 'jose';
var isJoined = false;
window.participants = {};


// Attach the Tracks to the DOM.
function attachTracks(tracks, container, participant, save) {
  tracks.forEach(function(track) {
    let videoElement = track.attach();
    container.appendChild(videoElement);
    if (save) {
      window.participants[participant.sid].videoElement = videoElement;
    }
  });
}

// Attach the Participant's Tracks to the DOM.
function attachParticipantTracks(participant, container) {
  var tracks = Array.from(participant.tracks.values());
  attachTracks(tracks, container);
}

// Detach the Tracks from the DOM.
function detachTracks(tracks) {
  tracks.forEach(function(track) {
    track.detach().forEach(function(detachedElement) {
      detachedElement.remove();
    });
  });
}

// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
  var tracks = Array.from(participant.tracks.values());
  detachTracks(tracks);
}

// Check for WebRTC
if (!navigator.webkitGetUserMedia && !navigator.mozGetUserMedia) {
  alert('WebRTC is not available in your browser.');
}

// When we are about to transition away from this page, disconnect
// from the room, if joined.
window.addEventListener('beforeunload', leaveRoomIfJoined);

// Obtain a token from the server in order to connect to the Room.
$.getJSON('/token', function(data) {
  identity = data.identity;
  document.getElementById('room-controls').style.display = 'block';

  // Bind button to join Room.
  document.getElementById('self-display').onclick = function() {
    if (isJoined) {
      return;
    }
    roomName = `cs-spark`;
    log("Joining room '" + roomName + "'...");
    var connectOptions = {
      name: roomName,
      logLevel: 'debug'
    };

    if (previewTracks) {
      connectOptions.tracks = previewTracks;
    }

    // Join the Room with the token from the server and the
    // LocalParticipant's Tracks.
    Video.connect(data.token, connectOptions).then(roomJoined, function(error) {
      log('Could not connect to Twilio: ' + error.message);
    });
  };

  // Bind button to leave Room.
  document.getElementById('button-leave').onclick = function() {
    log('Leaving room...');
    activeRoom.disconnect();
  };
});

// Successfully connected!
function roomJoined(room) {
  window.room = activeRoom = room;

  log("Joined as '" + identity + "'");
  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  // Attach LocalParticipant's Tracks, if not already attached.
  var previewContainer = document.getElementById('self-display');
  if (!previewContainer.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer);
  }

  // Attach the Tracks of the Room's Participants.
  room.participants.forEach(function(participant) {
    log("Already in Room: '" + participant.identity + "'");
    var participantElement = addParticipantElement(participant);
    attachParticipantTracks(participant, participantElement);
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
    var participantElement = addParticipantElement(participant);
  });

  // When a Participant adds a Track, attach it to the DOM.
  room.on('trackAdded', function(track, participant) {
    log(participant.identity + " added track: " + track.kind);
    var participantContainer = document.getElementById(participant.sid);
    attachTracks([track], participantContainer, participant, track.kind === 'video');
  });

  // When a Participant removes a Track, detach it from the DOM.
  room.on('trackRemoved', function(track, participant) {
    log(participant.identity + " removed track: " + track.kind);
    detachTracks([track]);
    var trackContainer = document.getElementById(participant.sid);
    trackContainer.parentNode.removeChild(trackContainer);
  });

  // When a Participant leaves the Room, detach its Tracks.
  room.on('participantDisconnected', function(participant) {
    log("Participant '" + participant.identity + "' left the room");
    removeParticipant(participant);
  });

  // Once the LocalParticipant leaves the room, detach the Tracks
  // of all Participants, including that of the LocalParticipant.
  room.on('disconnected', function() {
    log('Left');
    if (previewTracks) {
      previewTracks.forEach(function(track) {
        track.stop();
      });
    }
    Object.keys(window.participants).forEach((participantId) => removeParticipant(window.participants[participantId].participant));
    activeRoom = null;
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';

  });
}

// Activity log.
function log(message) {
  var logDiv = document.getElementById('log');
  logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Leave Room.
function leaveRoomIfJoined() {
  if (activeRoom) {
    activeRoom.disconnect();
  }
}

function addParticipantElement(participant) {
  var participantsNumber = Object.keys(window.participants).length;
  var previewContainer = document.getElementById(`display-${participantsNumber}`);
  var participantContainer = document.createElement("div");
  participantContainer.id = participant.sid;
  participantContainer.className = "participant";

  var canvas = document.createElement("canvas");
  canvas.className = "snapshot";
  participantContainer.appendChild(canvas);

  var emotion = document.createElement("div");
  emotion.className = "emotion";
  participantContainer.appendChild(emotion);

  previewContainer.appendChild(participantContainer);
  addParticipantToObject(participant, participantContainer, canvas);
  return participantContainer;
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

function addParticipantToObject(participant, participantElement, canvasElement) {
  window.participants[participant.sid] = {
    participant,
    participantElement,
    canvasElement
  };
}

function removeParticipant(participant) {
  detachParticipantTracks(participant);
  var participantContainer = document.getElementById(participant.sid);
  participantContainer.parentElement.removeChild(participantContainer);
  delete participants[participant.sid];
}

function doSnapshots() {
  Object.keys(window.participants).forEach((participantId) => {
    var participant = window.participants[participantId];
    // TODO: convert participant.videoElement to canvas
    var $container = $(participant.participantElement);
    var video = $container.find('video')[0];
    var canvas = takeLocalVideoSnapshot(video, participant.canvasElement);
    runAnalysis(video, canvas)
      .then(function(data) {
        var $emotion = $container.find('.emotion');
        if (data && data[0]) {
          var emoji = getEmoji(data[0]);
          if (isFaceEmoji) {
            var face = data[0].faceRectangle;
            $emotion.css({
              fontSize: face.height + 10,
              left: face.left - 50,
              top: face.top,
              position: 'absolute'
            });
          }
          $emotion.text(emoji);
        }
        else {
          $emotion.text('');
        }
        console.log(data[0]);
      });
  })
}



/**
 * Take snapshot of the local video from the HTMLVideoElement and render it
 * in the HTMLCanvasElement.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 */
function takeLocalVideoSnapshot(video, canvas) {
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function runAnalysis(video, canvas) {
  if (video) {
    var canvas = takeLocalVideoSnapshot(video, canvas);
    return analyzeEmotion(canvas)
      .then(function(data) {
        return data;
      });
  }
}





$(function() {
  if (isPresenter) {
    // Count number of active videos
    window.setInterval(doSnapshots, 1000);
  }
});
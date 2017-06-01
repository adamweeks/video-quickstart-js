'use strict';

var Video = require('twilio-video');

var activeRoom;
var previewTracks;
var identity;
var roomName;
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
  document.getElementById('button-join').onclick = function() {
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

  document.getElementById('button-snapshot').onclick = function () {
    log('Snapshotting room...');
    doSnapshots();
  };
});

// Successfully connected!
function roomJoined(room) {
  window.room = activeRoom = room;

  log("Joined as '" + identity + "'");
  document.getElementById('button-join').style.display = 'none';
  document.getElementById('button-leave').style.display = 'inline';

  // Attach LocalParticipant's Tracks, if not already attached.
  var previewContainer = document.getElementById('local-media');
  if (!previewContainer.querySelector('video')) {
    attachParticipantTracks(room.localParticipant, previewContainer);
  }

  // Attach the Tracks of the Room's Participants.
  room.participants.forEach(function(participant) {
    log("Already in Room: '" + participant.identity + "'");
    var particpantElement = addParticipantElement(participant);
    attachParticipantTracks(participant, addParticipantElement);
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', function(participant) {
    log("Joining: '" + participant.identity + "'");
    var particpantElement = addParticipantElement(participant);
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
    detachParticipantTracks(room.localParticipant);
    room.participants.forEach(detachParticipantTracks);
    activeRoom = null;
    document.getElementById('button-join').style.display = 'inline';
    document.getElementById('button-leave').style.display = 'none';
  });
}

// Preview LocalParticipant's Tracks.
document.getElementById('button-preview').onclick = function() {
  var localTracksPromise = previewTracks
    ? Promise.resolve(previewTracks)
    : Video.createLocalTracks();

  localTracksPromise.then(function(tracks) {
    window.previewTracks = previewTracks = tracks;
    var previewContainer = document.getElementById('local-media');
    if (!previewContainer.querySelector('video')) {
      attachTracks(tracks, previewContainer);
    }
  }, function(error) {
    console.error('Unable to access local media', error);
    log('Unable to access Camera and Microphone');
  });
};

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
  var previewContainer = document.getElementById('remote-media');
  var participantContainer = document.createElement("div");
  participantContainer.id = participant.sid;
  participantContainer.className = "participant";
  var title = document.createElement("div");
  title.className = "title";
  title.innerHTML = `<p>${participant.identity}</p>`;
  participantContainer.appendChild(title)
  previewContainer.appendChild(participantContainer);
  addParticipantToObject(participant, participantContainer);
  return participantContainer;
}

function analyzeEmotion(canvas ) {
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
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key",process.env.EMOTION_API_KEY);
        },
        type: "POST",
        // Request body
        data: file,
        processData: false
    })
    .done(function(data) {
        alert("success");
    })
    .fail(function() {
        alert("error");
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

function addParticipantToObject(participant, particpantElement) {
  window.participants[participant.sid] = {
    participant,
    particpantElement
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
    //analyzeEmotion(participant.videoElement);
  })
}
//API Key for the credential: 007a7510217f28b0a00f0fd13c9071383ff3

// Calling the REST API TO fetch the TURN Server Credentials
const response =
    await fetch("https://oopisos.metered.live/api/v1/turn/credentials?apiKey=007a7510217f28b0a00f0fd13c9071383ff3");

// Saving the response in the iceServers array
const iceServers = await response.json();

// Using the iceServers array in the RTCPeerConnection method
var myPeerConnection = new RTCPeerConnection({
    iceServers: iceServers
});
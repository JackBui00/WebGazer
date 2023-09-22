import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import { initializeApp } from "firebase/app";
import {getFirestore,doc, getDocFromServer,setDoc,addDoc,collection, onSnapshot,updateDoc} from "firebase/firestore"

// firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCbrQkFhcjmZfqpt7I2p-UfdSmabLSu3PE",
  authDomain: "videoextraction.firebaseapp.com",
  projectId: "videoextraction",
  storageBucket: "videoextraction.appspot.com",
  messagingSenderId: "1036356578174",
  appId: "1:1036356578174:web:aac8e9dec955125a83e12f"
};

// structure of the firebase collection:
// top-level: calls collection 
// each instance has a unique CallId (i hard coded Test-001)
// calls:
//      call001
//          answer (json string, a json object that we store as a string)
//          offer (also a json string)
//          answerCandidate subcollection 
//              ansCandidate1
//              answCandidate2
//              ...
//          offerCandidate sub collection 
//              offerCandidate1
//              ....
//      call002
//          ....
const config= { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
const app = initializeApp(firebaseConfig);
const db= getFirestore();
const callId="Test-001"

async function recieveStream(){
    try{ 
        // init peer connection
        const pc = new RTCPeerConnection(config);
        //get offer, place into description object, then set this field
        await pc.setRemoteDescription(await waitForOffer(callId));
        // handle received candidates
        await handleReceivedCandidates(callId, pc);
        // create an answer
        const answer = await pc.createAnswer();
        console.log(answer);
        // set local description to answer and send off the answer for the offerer
        await pc.setLocalDescription(answer)
        await sendAnswer(answer,callId)
        //handle ICE candidate events
        pc.onicecandidate = async function(event) {
            if (event.candidate) {
                console.log(event.candidate)
                // send the ICE candidate to the remote peer via the signaling server
                await sendCandidate(event.candidate, callId);
            }
        };
        // get answer, set it to the remote description to successfully finsh the connection

        // Handle incoming tracks
        pc.ontrack = function(event) {
          const remoteVideo = document.getElementById('remoteVideo');
          // check if the video element already has a stream attached
          if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = new MediaStream();
          }
          // add the new track to the stream
          remoteVideo.srcObject.addTrack(event.track);
        };
       
  
    } catch (error){
        console.error("An error occured in:", error)
    }
}

async function sendCandidate(candidate, callId){
    const candidateCollection = collection(db, 'calls', callId, 'answerCandidates');
    await addDoc(candidateCollection, candidate.toJSON());
}
async function sendAnswer(answer,callId){
    const call = doc(db, 'calls', callId);
    await updateDoc(call, { answer: JSON.stringify(answer) });
}
async function waitForOffer(callId){
  return new Promise((resolve, reject) => {
    // get a reference to the call document by its callId
    const callDoc = doc(db, 'calls', callId);
    
    // sub to real-time updates on this document
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      //console.log("the data:")
      //console.log(data)
      //console.log("the offer:")
      //console.log(data.offer)
      // check if the answer has been set in the call document
      if (data && data.offer) {
        // If yes, stop listening to further updates
        unsubscribe();
        
        // Resolve the Promise with the received answer
        resolve(new RTCSessionDescription(JSON.parse(data.offer)));
      }
    }, 
    // Handle errors
    (error) => {
      unsubscribe();
      reject(error);
    });
  });
}
async function handleReceivedCandidates(callId, pc) {
  const candidateCollection = collection(db, 'calls', callId, 'offerCandidates');
  onSnapshot(candidateCollection, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
}

await recieveStream()
export default function getStream(mediaStreamObject){
    console.log(mediaStreamObject);
    
    const body = document.querySelector("body")
    console.log(body)
    const video =document.createElement("video");
    video.srcObject=mediaStreamObject;
    video.id = "testVideo";
    body.appendChild(video);
}









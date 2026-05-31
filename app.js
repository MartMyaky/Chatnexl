const socket = io();



let username = "";

let room = "";



let localStream = null;



const peers = {};



const configuration = {

    iceServers: [

        {

            urls: "stun:stun.l.google.com:19302"

        }

    ]

};



const loginScreen =

document.getElementById("loginScreen");



const app =

document.getElementById("app");



const joinBtn =

document.getElementById("joinBtn");



const roomName =

document.getElementById("roomName");



const userList =

document.getElementById("userList");



const messages =

document.getElementById("messages");



const messageInput =

document.getElementById("messageInput");



const sendBtn =

document.getElementById("sendBtn");



const muteBtn =

document.getElementById("muteBtn");



let muted = false;



joinBtn.onclick = async () => {



    username =

    document.getElementById("username").value.trim();



    room =

    document.getElementById("room").value.trim();



    if(!username || !room){

        alert("Preencha nome e sala");

        return;

    }



    try{



        localStream =

        await navigator.mediaDevices.getUserMedia({

            audio:true,

            video:false

        });



    }catch(err){



        alert("Permita acesso ao microfone");

        return;



    }



    loginScreen.style.display = "none";

    app.style.display = "flex";



    roomName.innerText = "Sala: " + room;



    socket.emit("join-room", {

        username,

        room

    });



};



function addMessage(user, text){



    const div =

    document.createElement("div");



    div.className = "message";



    div.innerHTML =

    `<span class="user">${user}</span>: ${text}`;



    messages.appendChild(div);



    messages.scrollTop =

    messages.scrollHeight;



}



sendBtn.onclick = () => {



    const text =

    messageInput.value.trim();



    if(!text) return;



    socket.emit("chat-message", text);



    messageInput.value = "";



};



messageInput.addEventListener("keydown", e => {



    if(e.key === "Enter"){



        sendBtn.click();



    }



});



socket.on("chat-message", data => {



    addMessage(

        data.username,

        data.message

    );



});



socket.on("user-list", users => {



    userList.innerHTML = "";



    users.forEach(user => {



        const li =

        document.createElement("li");



        li.innerText =

        user.username;



        userList.appendChild(li);



    });



});



muteBtn.onclick = () => {



    muted = !muted;



    localStream

    .getAudioTracks()

    .forEach(track => {



        track.enabled = !muted;



    });



    muteBtn.innerText =

    muted

    ? "🔇 Desmutar"

    : "🎤 Mutar";



};



function createPeer(targetId){



    const peer =

    new RTCPeerConnection(configuration);



    peers[targetId] = peer;



    localStream

    .getTracks()

    .forEach(track => {



        peer.addTrack(

            track,

            localStream

        );



    });



    peer.onicecandidate = event => {



        if(event.candidate){



            socket.emit("ice-candidate", {



                target: targetId,

                candidate:

                event.candidate



            });



        }



    };



    peer.ontrack = event => {



        let audio =

        document.getElementById(

            "audio-" + targetId

        );



        if(!audio){



            audio =

            document.createElement(

                "audio"

            );



            audio.id =

            "audio-" + targetId;



            audio.autoplay = true;



            document.body

            .appendChild(audio);



        }



        audio.srcObject =

        event.streams[0];



    };



    return peer;



} 

socket.on("existing-user", async data => {



    const peer =

    createPeer(data.id);



    const offer =

    await peer.createOffer();



    await peer.setLocalDescription(

        offer

    );



    socket.emit("offer", {



        target: data.id,

        offer



    });



});



socket.on("user-joined", async data => {



    console.log(

        data.username +

        " entrou"

    );



});



socket.on("offer", async data => {



    const peer =

    createPeer(data.sender);



    await peer.setRemoteDescription(

        new RTCSessionDescription(

            data.offer

        )

    );



    const answer =

    await peer.createAnswer();



    await peer.setLocalDescription(

        answer

    );



    socket.emit("answer", {



        target: data.sender,

        answer



    });



});



socket.on("answer", async data => {



    const peer =

    peers[data.sender];



    if(!peer) return;



    await peer.setRemoteDescription(

        new RTCSessionDescription(

            data.answer

        )

    );



});



socket.on(

    "ice-candidate",

    async data => {



        const peer =

        peers[data.sender];



        if(!peer) return;



        try{



            await peer.addIceCandidate(

                new RTCIceCandidate(

                    data.candidate

                )

            );



        }catch(err){



            console.error(err);



        }



    }

);



socket.on(

    "user-left",

    id => {



        if(peers[id]){



            peers[id].close();



            delete peers[id];



        }



        const audio =

        document.getElementById(

            "audio-" + id

        );



        if(audio){



            audio.remove();



        }



    }

);



window.addEventListener(

    "beforeunload",

    () => {



        Object.values(peers)

        .forEach(peer => {



            peer.close();



        });



    }

); 
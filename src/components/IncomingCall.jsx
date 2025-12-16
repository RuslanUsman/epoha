// src/components/IncomingCall.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export default function IncomingCall({ currentUserId }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    const channel = supabase
      .channel("calls")
      // уведомление о вызове
      .on("broadcast", { event: "call" }, (payload) => {
        const { from, to, callType, fromName } = payload.payload;
        if (to === currentUserId) {
          setIncomingCall({ from, fromName, callType });
        }
      })
      // получаем offer
      .on("broadcast", { event: "offer" }, (payload) => {
        const { from, to, sdp, callType, fromName } = payload.payload;
        if (to === currentUserId) {
          setIncomingCall({ from, fromName, callType, sdp });
        }
      })
      // получаем answer (для симметрии, если этот клиент инициировал вызов)
      .on("broadcast", { event: "answer" }, async (payload) => {
        const { to, sdp } = payload.payload;
        if (to === currentUserId && peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      })
      // получаем ICE кандидаты
      .on("broadcast", { event: "ice" }, async (payload) => {
        const { to, candidate } = payload.payload;
        if (to === currentUserId && peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Ошибка ICE:", err);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function acceptCall() {
    if (!incomingCall?.sdp) {
      console.warn("Нет SDP для принятия вызова");
      return;
    }
    const { from } = incomingCall;
    setIncomingCall(null);

    peerRef.current = new RTCPeerConnection();

    peerRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.channel("calls").send({
          type: "broadcast",
          event: "ice",
          payload: { from: currentUserId, to: from, candidate: event.candidate },
        });
      }
    };

    // локальный поток
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStream.getTracks().forEach(track => peerRef.current.addTrack(track, localStream));
    localVideoRef.current.srcObject = localStream;

    // устанавливаем удалённое описание (offer)
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

    // создаём и отправляем answer
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    supabase.channel("calls").send({
      type: "broadcast",
      event: "answer",
      payload: { from: currentUserId, to: from, sdp: answer },
    });
  }

  function declineCall() {
    setIncomingCall(null);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  }

  if (!incomingCall) return null;

  return (
    <div className="incoming-call">
      <p>
        📞 Входящий {incomingCall.callType} вызов от <strong>{incomingCall.fromName}</strong>
      </p>
      <button onClick={acceptCall}>Принять</button>
      <button onClick={declineCall}>Отклонить</button>

      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
}

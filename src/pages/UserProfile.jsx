// src/pages/UserProfile.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/UserAvatar';
import { FaRegCommentDots, FaPhoneAlt, FaVideo } from 'react-icons/fa';
import '../styles/global.css';

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const navigate = useNavigate();
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, [id]);

  // подписка на ответы и ICE от собеседника
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("calls")
      .on("broadcast", { event: "answer" }, async (payload) => {
        const { to, sdp } = payload.payload;
        // если ответ предназначен текущему пользователю
        if (to === profile.id && peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      })
      .on("broadcast", { event: "ice" }, async (payload) => {
        const { to, candidate } = payload.payload;
        if (to === profile.id && peerRef.current) {
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
  }, [profile?.id]);

  async function startCall(type) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('telegram_username')
      .eq('id', user.id)
      .single();

    peerRef.current = new RTCPeerConnection();

    peerRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.channel("calls").send({
          type: "broadcast",
          event: "ice",
          payload: { from: user.id, to: id, candidate: event.candidate },
        });
      }
    };

    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStream.getTracks().forEach(track => peerRef.current.addTrack(track, localStream));
    localVideoRef.current.srcObject = localStream;

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    // уведомление
    supabase.channel("calls").send({
      type: "broadcast",
      event: "call",
      payload: {
        from: user.id,
        fromName: myProfile?.telegram_username || user.id,
        to: id,
        callType: type,
      },
    });

    // сам offer
    supabase.channel("calls").send({
      type: "broadcast",
      event: "offer",
      payload: {
        from: user.id,
        fromName: myProfile?.telegram_username || user.id,
        to: id,
        callType: type,
        sdp: offer,
      },
    });
  }

  if (!profile) return <p>Загрузка...</p>;

  return (
    <div className="userProfile-container">
      <h1>Профиль пользователя</h1>
      <UserAvatar userId={profile.id} avatarPath={profile.avatar_path} size={120} />
      <p><strong>Имя:</strong> {profile.username}</p>

      <div className="userProfile-chat">
        <button onClick={() => navigate(`/chat/${profile.id}`)}>
          <FaRegCommentDots /> Написать
        </button>
      </div>

      <div className="userProfile-call">
        {!showCallOptions ? (
          <button onClick={() => setShowCallOptions(true)}>📞 Вызов</button>
        ) : (
          <div className="call-options">
            <button onClick={() => startCall("audio")}>
              <FaPhoneAlt /> Аудио вызов
            </button>
            <button onClick={() => startCall("video")}>
              <FaVideo /> Видео вызов
            </button>
          </div>
        )}
      </div>

      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
}

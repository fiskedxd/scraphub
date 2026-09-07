import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const ChatPage = () => {
  const { user } = useAuth();
  const { isWhite, isLight, isDark } = useTheme();
  const gridRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [gifPanelOpen, setGifPanelOpen] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifFavorites, setGifFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_gif_favorites') || '[]');
    } catch (err) {
      return [];
    }
  });
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareError, setScreenShareError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  
  
  const [isInVoiceChat, setIsInVoiceChat] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [soundboardOpen, setSoundboardOpen] = useState(false);
  const [activeSound, setActiveSound] = useState(null);
  
  
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);
  
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  
  useEffect(() => {
    const handleMove = (e) => {
      if (!gridRef.current) return;
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gridRef.current.style.backgroundPosition = `${x}% ${y}%`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
  
  
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream, screenStream]);

  useEffect(() => {
    try {
      localStorage.setItem('chat_gif_favorites', JSON.stringify(gifFavorites));
    } catch (err) {
      console.warn('Impossible de sauvegarder les favoris GIF', err);
    }
  }, [gifFavorites]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;
      try {
        setLoadingMessages(true);
        const response = await fetch('/api/chat/messages?limit=200', {
          headers: {
            ...getAuthHeaders()
          }
        });
        if (!response.ok) {
          throw new Error('Failed to load messages');
        }
        const data = await response.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages.map((msg) => ({ ...msg, id: msg._id || msg.id || `${msg.userId}-${msg.timestamp}-${Math.random()}` })));
        }
      } catch (error) {
        console.warn('Impossible de charger les messages du chat', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [user]);
  
  const Icons = {
    send: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
    mic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8M12 4a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z" />,
    micOff: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />,
    image: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    gif: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    voice: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2v-1m0 0H7a2 2 0 01-2-2v-2a2 2 0 012-2h2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v3" />,
    phone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    phoneOff: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z M23 3l-6 6m0 0l6 6m-6-6l-6-6" />,
    attachment: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    smile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    camera: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
    cameraOff: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z M3 3l18 18" />,
    screen: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v9.5A2.25 2.25 0 0118.75 18.5H13.5l-1.5 1.5-1.5-1.5H5.25A2.25 2.25 0 013 16.25v-9.5zM7.5 9h9" />,
    volume2: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />,
    music: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  };
  
  
  const soundboardSounds = [
    { name: 'Applause', emoji: '👏', url: 'https://www.soundboard.com/mediafiles/12/123456.mp3' },
    { name: 'Laugh', emoji: '😂', url: 'https://www.soundboard.com/mediafiles/12/123457.mp3' },
    { name: 'Drum Roll', emoji: '🥁', url: 'https://www.soundboard.com/mediafiles/12/123458.mp3' },
    { name: 'Air Horn', emoji: '📯', url: 'https://www.soundboard.com/mediafiles/12/123459.mp3' },
    { name: 'Sad Trombone', emoji: '🎺', url: 'https://www.soundboard.com/mediafiles/12/123460.mp3' },
    { name: 'Bruh', emoji: '😮', url: 'https://www.soundboard.com/mediafiles/12/123461.mp3' },
    { name: 'Oof', emoji: '💀', url: 'https://www.soundboard.com/mediafiles/12/123462.mp3' },
    { name: 'WOW', emoji: '😲', url: 'https://www.soundboard.com/mediafiles/12/123463.mp3' }
  ];
  
  
  const playSound = (sound) => {
    if (activeSound) {
      activeSound.pause();
      activeSound.currentTime = 0;
    }
    const audio = new Audio(sound.url);
    audio.play();
    setActiveSound(audio);
    
    
    addMessage({
      type: 'system',
      content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a joué ${sound.name} ${sound.emoji}`
    });
  };
  
  const createTemporaryMessage = (messageData) => {
    return {
      id: Date.now() + Math.random(),
      userId: user?.email || 'anonymous',
      userMongoId: user?.id || user?._id || null,
      userName: user?.publicProfile?.displayName || user?.name || 'Anonyme',
      userAvatar: user?.publicProfile?.avatar || '/pdp.png',
      timestamp: new Date().toISOString(),
      ...messageData
    };
  };

  const addMessage = async (messageData, options = { persist: true }) => {
    const tempMessage = createTemporaryMessage(messageData);
    setMessages(prev => [...prev, tempMessage]);

    if (!options.persist || !user) {
      return;
    }

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          type: messageData.type || 'text',
          content: messageData.content || '',
          fileName: messageData.fileName,
          isGif: messageData.isGif || false,
          duration: messageData.duration
        })
      });

      if (response.ok) {
        const saved = await response.json();
        setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? { ...saved, id: saved._id || saved.id || msg.id } : msg));
      } else {
        const data = await response.json().catch(() => ({}));
        console.warn('Erreur serveur chat:', data.error || response.statusText);
      }
    } catch (error) {
      console.warn('Impossible d’enregistrer le message sur le serveur', error);
    }
  };

  const deleteMessage = async (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message?._id) {
      try {
        const response = await fetch(`/api/chat/message/${message._id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn('Erreur suppression message:', data.error || response.statusText);
        }
      } catch (error) {
        console.warn('Impossible de supprimer le message sur le serveur', error);
      }
    }
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
    setEditText(message.content);
  };

  const saveEditMessage = async () => {
    if (!editText.trim() || !editingMessage) return;
    const updatedText = editText.trim();

    if (editingMessage?._id) {
      try {
        const response = await fetch(`/api/chat/message/${editingMessage._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ content: updatedText })
        });
        if (response.ok) {
          const saved = await response.json();
          setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...saved, id: saved._id || saved.id || msg.id } : msg));
        } else {
          const data = await response.json().catch(() => ({}));
          console.warn('Erreur modification message:', data.error || response.statusText);
          setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: updatedText, edited: true, editedAt: new Date().toISOString() } : msg));
        }
      } catch (error) {
        console.warn('Impossible de modifier le message sur le serveur', error);
        setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: updatedText, edited: true, editedAt: new Date().toISOString() } : msg));
      }
    } else {
      setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: updatedText, edited: true, editedAt: new Date().toISOString() } : msg));
    }

    setEditingMessage(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };
  
  
  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    addMessage({ type: 'text', content: inputMessage.trim() });
    setInputMessage('');
  };
  
  
  const sendImage = async (file) => {
    if (!file) return;
    setUploading(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      addMessage({ type: 'image', content: reader.result, fileName: file.name });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };
  
  const GIF_LIBRARY = [
    { url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', title: 'Happy vibes' },
    { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Party' },
    { url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', title: 'Fire' },
    { url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', title: 'Feels good' },
    { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', title: 'Cool' },
    { url: 'https://media.giphy.com/media/3o6Zt8MgUuvSbkZYWc/giphy.gif', title: 'Yes' },
    { url: 'https://media.giphy.com/media/l46CkATpdyLwLI7vi/giphy.gif', title: 'Wow' },
    { url: 'https://media.giphy.com/media/l3vRn5sPc4NR6i9Hy/giphy.gif', title: 'Nope' },
    { url: 'https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif', title: 'Cheers' },
    { url: 'https://media.giphy.com/media/26BGGJ7jnPIP6N4t6/giphy.gif', title: 'Good mood' },
    { url: 'https://media.giphy.com/media/l0HeuQm7Zyby5BfKc/giphy.gif', title: 'Stoked' },
    { url: 'https://media.giphy.com/media/26uTt19zC3E1wHJw0/giphy.gif', title: 'OMG' }
  ];

  const openGifPicker = () => {
    setGifPanelOpen(true);
  };

  const sendGifUrl = (gifUrl) => {
    addMessage({ type: 'image', content: gifUrl, isGif: true });
    setGifPanelOpen(false);
  };

  const toggleGifFavorite = (gifUrl) => {
    setGifFavorites(prev => {
      const next = prev.includes(gifUrl)
        ? prev.filter((url) => url !== gifUrl)
        : [...prev, gifUrl];
      return next;
    });
  };

  const getFilteredGifs = () => {
    const query = gifSearchQuery.trim().toLowerCase();
    if (!query) {
      return GIF_LIBRARY;
    }
    return GIF_LIBRARY.filter((gif) => gif.title.toLowerCase().includes(query));
  };

  const sendRandomGif = () => {
    const randomGif = GIF_LIBRARY[Math.floor(Math.random() * GIF_LIBRARY.length)];
    if (randomGif) {
      addMessage({ type: 'image', content: randomGif.url, isGif: true });
    }
  };
  
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          addMessage({ type: 'audio', content: reader.result, duration: '0:05' });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      setTimeout(() => {
        if (recorder.state === 'recording') stopRecording();
      }, 30000);
    } catch (err) {
      console.error('Erreur microphone:', err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };
  
  
  const joinVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      setIsInVoiceChat(true);
      setIsMuted(false);
      setIsVideoEnabled(false);
      
      
      setVoiceUsers([
        { id: 'user1', name: 'Alex', avatar: '/pdp.png', hasVideo: true },
        { id: 'user2', name: 'Sarah', avatar: '/pdp.png', hasVideo: false },
        { id: 'user3', name: 'Thomas', avatar: '/pdp.png', hasVideo: true }
      ]);
      
      
      addMessage({
        type: 'system',
        content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a rejoint le salon vocal`
      });
    } catch (err) {
      console.error('Erreur accès micro:', err);
    }
  };
  
  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (localStream) {
          
          const audioTrack = localStream.getAudioTracks()[0];
          const newStream = new MediaStream();
          if (audioTrack) newStream.addTrack(audioTrack);
          videoStream.getVideoTracks().forEach(track => newStream.addTrack(track));
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        } else {
          setLocalStream(videoStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoStream;
          }
        }
        setIsVideoEnabled(true);
        
        addMessage({
          type: 'system',
          content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a activé sa caméra`
        });
      } catch (err) {
        console.error('Erreur caméra:', err);
      }
    } else {
      
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const newStream = new MediaStream();
        if (audioTrack) newStream.addTrack(audioTrack);
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(newStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
      setIsVideoEnabled(false);
      
      addMessage({
        type: 'system',
        content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a désactivé sa caméra`
      });
    }
  };

  const toggleShareScreen = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setScreenSharing(false);
      addMessage({
        type: 'system',
        content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a arrêté le partage d'écran`
      });
      return;
    }

    try {
      setScreenShareError('');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (stream && stream.getVideoTracks().length) {
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenStream(null);
          setScreenSharing(false);
        });
      }
      setScreenStream(stream);
      setScreenSharing(true);
      addMessage({
        type: 'system',
        content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} partage maintenant son écran`
      });
    } catch (err) {
      console.error('Erreur de partage d écran:', err);
      setScreenShareError('Impossible d’accéder au partage d’écran');
    }
  };
  
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };
  
  const leaveVoiceChat = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsInVoiceChat(false);
    setVoiceUsers([]);
    setIsVideoEnabled(false);
    setIsMuted(false);
    
    addMessage({
      type: 'system',
      content: `${user?.publicProfile?.displayName || user?.name || 'Quelqu\'un'} a quitté le salon vocal`
    });
  };
  
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const isOwner = (msgUserId, message) => {
    const ownerIds = [user?.email, user?.id, user?._id, message?.userMongoId].filter(Boolean);
    return ownerIds.includes(msgUserId) || ownerIds.includes(message?.userId);
  };
  
  if (!user) {
    return (
      <div className={`relative min-h-screen ${isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'}`}>
        <div ref={gridRef} className="absolute inset-0 opacity-[0.2]" style={{
          backgroundImage: `linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px), linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-24">
          <div className={`rounded-3xl border p-10 text-center backdrop-blur-xl ${isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'}`}>
            <h1 className={`text-3xl font-semibold mb-4`}>Connexion requise</h1>
            <p className="text-white/40">Connectez-vous pour accéder au chat</p>
            <Link to="/login" className="mt-8 inline-flex rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10">Se connecter</Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative min-h-screen w-full overflow-hidden ${isWhite ? 'bg-white' : isLight ? 'bg-gray-50' : 'bg-black'}`}>
      {/* GRILLE ANIMEE */}
      <div ref={gridRef} className="absolute inset-0 opacity-[0.2]" style={{
        backgroundImage: `linear-gradient(${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px), linear-gradient(90deg, ${isWhite ? 'rgba(0,0,0,0.04)' : isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className={`group inline-flex items-center gap-2 transition text-sm ${isWhite ? 'text-black/50 hover:text-black' : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-white/50 hover:text-white'}`}>
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Bouton Soundboard */}
            <div className="relative">
              <button
                onClick={() => setSoundboardOpen(!soundboardOpen)}
                className={`rounded-full border px-4 py-2 text-sm transition hover:scale-105 flex items-center gap-2 ${isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border-white/20 bg-white/5 text-white hover:bg-white/10'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.music}</svg>
                Soundboard
              </button>
              
              {soundboardOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl border p-4 z-50 backdrop-blur-xl ${isWhite ? 'bg-white/95 border-black/10' : isLight ? 'bg-white/95 border-gray-200' : 'bg-black/90 border-white/10'}`}>
                  <div className="grid grid-cols-2 gap-2">
                    {soundboardSounds.map((sound, idx) => (
                      <button
                        key={idx}
                        onClick={() => playSound(sound)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm transition hover:scale-105 ${isWhite ? 'bg-black/5 hover:bg-black/10 text-black' : isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                      >
                        <span>{sound.emoji}</span>
                        <span>{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Salon vocal */}
            {!isInVoiceChat ? (
              <button
                onClick={joinVoiceChat}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:scale-105 ${isWhite ? 'border-black/20 bg-black/5 text-black hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border-white/20 bg-white/5 text-white hover:bg-white/10'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.phone}</svg>
                Rejoindre le vocal
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${isWhite ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  En vocal ({voiceUsers.length + 1})
                </div>
                <button
                  onClick={toggleMute}
                  className={`rounded-full border p-2 transition hover:scale-105 ${isMuted ? 'bg-red-500/20 border-red-500/30' : isWhite ? 'border-black/20 bg-black/5 hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{isMuted ? Icons.micOff : Icons.mic}</svg>
                </button>
                <button
                  onClick={toggleVideo}
                  className={`rounded-full border p-2 transition hover:scale-105 ${isVideoEnabled ? 'bg-blue-500/20 border-blue-500/30' : isWhite ? 'border-black/20 bg-black/5 hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{isVideoEnabled ? Icons.camera : Icons.cameraOff}</svg>
                </button>
                <button
                  onClick={toggleShareScreen}
                  className={`rounded-full border p-2 transition hover:scale-105 ${screenSharing ? 'bg-indigo-500/20 border-indigo-500/30' : isWhite ? 'border-black/20 bg-black/5 hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.screen}</svg>
                </button>
                <button
                  onClick={leaveVoiceChat}
                  className={`rounded-full border p-2 transition hover:scale-105 ${isWhite ? 'border-black/20 bg-black/5 hover:bg-black/10' : isLight ? 'border-gray-300 bg-gray-100 hover:bg-gray-200' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.phoneOff}</svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* SALON VOCAL AFFICHAGE */}
        {isInVoiceChat && (
          <div className={`mb-6 p-4 rounded-2xl border backdrop-blur-xl ${isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'}`}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.voice}</svg>
              <span className="text-sm font-medium">Salon vocal - Général</span>
              <span className="text-xs text-green-500">● Live</span>
            </div>
            {screenShareError && (
              <div className="mb-3 rounded-2xl border px-3 py-2 text-xs text-red-400 bg-red-500/10">{screenShareError}</div>
            )}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {/* Self view */}
              {isVideoEnabled && localVideoRef && (
                <div className="flex-shrink-0 text-center">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-32 h-24 rounded-xl bg-black/50 object-cover" />
                  <p className="text-xs mt-1">Vous {isMuted && '(muet)'}</p>
                </div>
              )}
              {screenSharing && screenVideoRef && (
                <div className="flex-shrink-0 text-center">
                  <video ref={screenVideoRef} autoPlay muted playsInline className="w-32 h-24 rounded-xl bg-black/50 object-cover" />
                  <p className="text-xs mt-1 text-indigo-300">Partage d'écran actif</p>
                </div>
              )}
              {/* Other users */}
              {voiceUsers.map(voicer => (
                <div key={voicer.id} className="flex-shrink-0 text-center">
                  <div className="relative">
                    <img src={voicer.avatar} alt={voicer.name} className="w-16 h-16 rounded-full border-2 border-green-500 object-cover" />
                    {voicer.hasVideo && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.camera}</svg>
                      </div>
                    )}
                    {!voicer.hasVideo && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.cameraOff}</svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-1">{voicer.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* CHAT PRINCIPAL */}
        <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden ${isWhite ? 'bg-white/80 border-black/10' : isLight ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/[0.08]'}`}>
          
          {/* MESSAGES */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {sortedMessages.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 mx-auto text-slate-500 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.smile}</svg>
                <p className={`mt-4 ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>Aucun message pour le moment</p>
                <p className={`text-sm ${isWhite ? 'text-black/30' : isLight ? 'text-gray-400' : 'text-white/30'}`}>Soyez le premier à envoyer un message !</p>
              </div>
            ) : (
              sortedMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group relative">
                  <img src={msg.userAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>{msg.userName}</span>
                      <span className={`text-xs ${isWhite ? 'text-black/30' : isLight ? 'text-gray-400' : 'text-white/30'}`}>{formatTime(msg.timestamp)}</span>
                      {msg.edited && <span className="text-xs text-gray-500">(modifié)</span>}
                    </div>
                    {msg.type === 'text' && editingMessage?.id === msg.id ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditMessage()}
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none ${isWhite ? 'border-black/10 bg-black/5 text-black' : isLight ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-white/10 bg-white/5 text-white'}`}
                          autoFocus
                        />
                        <button onClick={saveEditMessage} className="p-1.5 rounded-lg bg-green-500/20 text-green-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.check}</svg>
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.x}</svg>
                        </button>
                      </div>
                    ) : msg.type === 'text' ? (
                      <p className={`text-sm mt-1 ${isWhite ? 'text-black/70' : isLight ? 'text-gray-700' : 'text-gray-300'}`}>{msg.content}</p>
                    ) : null}
                    {msg.type === 'image' && (
                      <img src={msg.content} alt="Image" className={`mt-2 max-w-xs rounded-xl border ${msg.isGif ? 'max-h-48' : 'max-h-64'} object-contain`} />
                    )}
                    {msg.type === 'audio' && (
                      <audio controls src={msg.content} className="mt-2 h-10 max-w-xs rounded-lg" />
                    )}
                    {msg.type === 'system' && (
                      <p className={`text-sm italic mt-1 ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/40'}`}>{msg.content}</p>
                    )}
                  </div>
                  
                  {/* Actions (modifier/supprimer) - uniquement pour les messages de l'utilisateur */}
                  {isOwner(msg.userId, msg) && msg.type === 'text' && editingMessage?.id !== msg.id && (
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition flex gap-1">
                      <button
                        onClick={() => startEditMessage(msg)}
                        className={`p-1 rounded ${isWhite ? 'hover:bg-black/10' : isLight ? 'hover:bg-gray-200' : 'hover:bg-white/10'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.edit}</svg>
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 rounded hover:bg-red-500/20 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.trash}</svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {uploading && (
              <div className="flex gap-3 opacity-60">
                <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-20 w-40 bg-white/10 rounded mt-2 animate-pulse"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* INPUT */}
          <div className={`border-t p-4 ${isWhite ? 'border-black/10' : isLight ? 'border-gray-200' : 'border-white/[0.08]'}`}>
            <div className="flex gap-2 items-end">
              <div className="flex gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl transition ${isWhite ? 'hover:bg-black/5 text-black/60' : isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/60'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.image}</svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => sendImage(e.target.files[0])} />
                
                <button
                  onClick={openGifPicker}
                  className={`p-2 rounded-xl transition ${isWhite ? 'hover:bg-black/5 text-black/60' : isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/60'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.gif}</svg>
                </button>
                
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-2 rounded-xl transition ${isRecording ? 'bg-red-500/20 text-red-500' : isWhite ? 'hover:bg-black/5 text-black/60' : isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/60'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.mic}</svg>
                </button>
              </div>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Écrivez un message..."
                className={`flex-1 px-4 py-2.5 rounded-xl border focus:outline-none transition text-sm ${isWhite ? 'border-black/10 bg-black/5 text-black focus:border-black/30 placeholder-black/30' : isLight ? 'border-gray-200 bg-gray-100 text-gray-900 focus:border-gray-400 placeholder-gray-400' : 'border-white/[0.08] bg-white/5 text-white focus:border-white/20 placeholder-white/30'}`}
              />
              
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className={`p-2.5 rounded-xl transition ${inputMessage.trim() ? (isWhite ? 'bg-black/10 text-black hover:bg-black/20' : isLight ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-white/10 text-white hover:bg-white/20') : 'opacity-30 cursor-not-allowed'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{Icons.send}</svg>
              </button>
            </div>
            
            {gifPanelOpen && (
              <div className={`mt-4 rounded-2xl border p-4 ${isWhite ? 'bg-white/95 border-black/10' : isLight ? 'bg-white/95 border-gray-200' : 'bg-black/60 border-white/10'}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${isWhite ? 'text-black' : isLight ? 'text-gray-900' : 'text-white'}`}>Choisis un GIF</p>
                    <p className={`text-xs ${isWhite ? 'text-black/50' : isLight ? 'text-gray-500' : 'text-white/60'}`}>Favoris, recherche et import ici.</p>
                  </div>
                  <button onClick={() => setGifPanelOpen(false)} className="text-sm text-slate-400 hover:text-slate-600">Fermer</button>
                </div>
                <div className="mb-3 flex gap-2">
                  <input
                    type="search"
                    value={gifSearchQuery}
                    onChange={(e) => setGifSearchQuery(e.target.value)}
                    placeholder="Rechercher un GIF..."
                    className={`flex-1 px-3 py-2 rounded-2xl border ${isWhite ? 'border-black/10 bg-black/5 text-black' : isLight ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-white/20 bg-white/10 text-white'}`}
                  />
                  <button
                    onClick={sendRandomGif}
                    className={`rounded-2xl px-4 py-2 text-sm ${isWhite ? 'bg-black/5 text-black hover:bg-black/10' : isLight ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >Aléatoire</button>
                </div>
                {gifFavorites.length > 0 && (
                  <div className="mb-3">
                    <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${isWhite ? 'text-black/40' : isLight ? 'text-gray-500' : 'text-white/50'}`}>Favoris</p>
                    <div className="grid grid-cols-4 gap-2">
                      {gifFavorites.map((url) => (
                        <button
                          key={url}
                          onClick={() => sendGifUrl(url)}
                          className="group relative overflow-hidden rounded-2xl border border-white/10"
                        >
                          <img src={url} alt="GIF favori" className="h-20 w-full object-cover transition duration-200 group-hover:scale-105" />
                          <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">Use</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                  {getFilteredGifs().map((gif) => (
                    <div key={gif.url} className="group relative rounded-2xl overflow-hidden border border-white/10">
                      <img src={gif.url} alt={gif.title} className="h-28 w-full object-cover transition duration-200 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      <button
                        onClick={() => sendGifUrl(gif.url)}
                        className="absolute inset-x-0 bottom-0 m-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900 shadow-lg"
                      >Choisir</button>
                      <button
                        onClick={() => toggleGifFavorite(gif.url)}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white"
                      >{gifFavorites.includes(gif.url) ? '★' : '☆'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isRecording && (
              <div className="mt-2 flex items-center gap-2 text-red-500 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Enregistrement vocal... (relâchez pour envoyer)
              </div>
            )}
          </div>
        </div>
        
        {/* Vidéo locale cachée */}
        <video ref={localVideoRef} className="hidden" autoPlay muted playsInline />
      </div>
    </div>
  );
};

export default ChatPage;
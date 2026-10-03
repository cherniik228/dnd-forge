"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [worldName, setWorldName] = useState('');
  const [isDM, setIsDM] = useState(false);

  const handleCreateRoom = async () => {
    if (!nickname || !worldName) return alert("Введите ник и название мира!");
    const newKey = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    
    const { error } = await supabase.from('rooms').insert({
      room_key: newKey,
      dm_id: nickname,
      world_name: worldName
    });

    if (!error) {
      localStorage.setItem('dnd_user', nickname);
      localStorage.setItem('dnd_role', 'dm');
      alert(`Комната создана! Ваш ключ для игроков: ${newKey}`);
      window.location.href = `/dashboard?key=${newKey}`;
    } else {
      alert("Ошибка создания: " + error.message);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname || !roomKey) return alert("Введите ник и ключ комнаты!");
    
    const { data: room, error: roomError } = await supabase
      .from('rooms').select('id, dm_id').eq('room_key', roomKey.toUpperCase()).single();

    if (roomError || !room) return alert("Комната с таким ключом не найдена!");

    await supabase.from('room_members').insert({
      room_id: room.id,
      user_nickname: nickname,
      role: 'player'
    });

    localStorage.setItem('dnd_user', nickname);
    localStorage.setItem('dnd_role', 'player');
    window.location.href = `/dashboard?key=${roomKey.toUpperCase()}`;  // ← ИСПРАВЛЕНО
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-amber-500 mb-8">⚔️ Кузница D&D</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        <input 
          className="w-full p-3 mb-4 bg-gray-700 rounded text-white border border-gray-600 focus:border-amber-500 outline-none"
          placeholder="Ваш никнейм" 
          value={nickname} onChange={e => setNickname(e.target.value)} 
        />

        {!isDM ? (
          <>
            <input 
              className="w-full p-3 mb-4 bg-gray-700 rounded text-white border border-gray-600 focus:border-amber-500 outline-none"
              placeholder="Ключ комнаты (например, DRGN-42)" 
              value={roomKey} onChange={e => setRoomKey(e.target.value)} 
            />
            <button onClick={handleJoinRoom} className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold transition">
              Присоединиться как Игрок
            </button>
          </>
        ) : (
          <>
            <input 
              className="w-full p-3 mb-4 bg-gray-700 rounded text-white border border-gray-600 focus:border-amber-500 outline-none"
              placeholder="Название мира" 
              value={worldName} onChange={e => setWorldName(e.target.value)} 
            />
            <button onClick={handleCreateRoom} className="w-full bg-amber-600 hover:bg-amber-700 p-3 rounded font-bold transition">
              Создать стол Мастера
            </button>
          </>
        )}

        <button onClick={() => setIsDM(!isDM)} className="w-full mt-4 text-sm text-gray-400 hover:text-white underline">
          {isDM ? "Хочу присоединиться к чужой игре" : "Я Мастер, хочу создать новую игру"}
        </button>
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const playerMenu = [
  { id: 'character-sheet', label: 'Лист персонажа', icon: '🧙' },
  { id: 'abilities', label: 'Способности', icon: '✨' },
  { id: 'notes', label: 'Заметки', icon: '' },
  { id: 'wishes', label: 'Пожелания', icon: '' },
];

interface PlayerDashboardProps {
  roomId: string;
  user: string;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function PlayerDashboard({ roomId, user, activeMenu, setActiveMenu }: PlayerDashboardProps) {

  const renderContent = () => {
    if (activeMenu === 'character-sheet') return <CharacterSheetSection roomId={roomId} user={user} />;
    if (activeMenu === 'abilities') return <AbilitiesSection roomId={roomId} user={user} />;
    if (activeMenu === 'notes') return <NotesSection roomId={roomId} user={user} />;
    if (activeMenu === 'wishes') return <WishesSection roomId={roomId} user={user} />;
    return <div className="text-gray-400">Выберите пункт меню</div>;
  };

  const menuLabels: Record<string, string> = {
    'character-sheet': '🧙 Лист персонажа',
    'abilities': '✨ Способности',
    'notes': '📝 Заметки',
    'wishes': '💫 Пожелания',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* Меню игрока */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <h2 className="text-xl font-bold text-blue-500 mb-4">🎲 Меню Игрока</h2>
        <div className="space-y-1">
          {playerMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full text-left p-3 rounded flex items-center gap-2 transition ${
                activeMenu === item.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold text-blue-500 mb-4">{menuLabels[activeMenu] || 'Меню игрока'}</h2>
        {renderContent()}
      </div>
    </div>
  );
}

// ========== ЛИСТ ПЕРСОНАЖА ==========
function CharacterSheetSection({ roomId, user }: { roomId: string; user: string }) {
  const [charData, setCharData] = useState<any>({
    name: '', class: '', level: 1, hp: 10, maxHp: 10, armor: 10,
    strength: 10, dexterity: 10, intelligence: 10, wisdom: 10, charisma: 10, constitution: 10, description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCharacter(); }, [roomId, user]);

  const loadCharacter = async () => {
    const { data } = await supabase.from('characters').select('*').eq('room_id', roomId).eq('author_nickname', user).single();
    if (data) setCharData(data);
  };

  const saveCharacter = async () => {
    setSaving(true);
    const { error } = await supabase.from('characters').upsert({ room_id: roomId, author_nickname: user, ...charData, updated_at: new Date().toISOString() });
    if (error) alert('Ошибка: ' + error.message);
    else alert('Лист сохранён!');
    setSaving(false);
  };

  return (
    <div className="bg-gray-700 p-4 rounded space-y-3">
      <input className="w-full bg-gray-800 p-3 rounded text-white" placeholder="Имя персонажа" value={charData.name} onChange={e => setCharData({...charData, name: e.target.value})} />
      <div className="grid grid-cols-2 gap-3">
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Класс" value={charData.class} onChange={e => setCharData({...charData, class: e.target.value})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Уровень" type="number" value={charData.level} onChange={e => setCharData({...charData, level: Number(e.target.value)})} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="HP" type="number" value={charData.hp} onChange={e => setCharData({...charData, hp: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Макс. HP" type="number" value={charData.maxHp} onChange={e => setCharData({...charData, maxHp: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Класс брони" type="number" value={charData.armor} onChange={e => setCharData({...charData, armor: Number(e.target.value)})} />
      </div>
      <h3 className="text-lg font-bold text-amber-500 mt-4">Характеристики</h3>
      <div className="grid grid-cols-3 gap-3">
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Сила" type="number" value={charData.strength} onChange={e => setCharData({...charData, strength: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Ловкость" type="number" value={charData.dexterity} onChange={e => setCharData({...charData, dexterity: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Интеллект" type="number" value={charData.intelligence} onChange={e => setCharData({...charData, intelligence: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Мудрость" type="number" value={charData.wisdom} onChange={e => setCharData({...charData, wisdom: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Харизма" type="number" value={charData.charisma} onChange={e => setCharData({...charData, charisma: Number(e.target.value)})} />
        <input className="bg-gray-800 p-3 rounded text-white" placeholder="Телосложение" type="number" value={charData.constitution} onChange={e => setCharData({...charData, constitution: Number(e.target.value)})} />
      </div>
      <textarea className="w-full bg-gray-800 p-3 rounded text-white h-32" placeholder="Описание..." value={charData.description} onChange={e => setCharData({...charData, description: e.target.value})} />
      <button onClick={saveCharacter} disabled={saving} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold text-white disabled:opacity-50">{saving ? '⏳ Сохранение...' : '💾 Сохранить лист'}</button>
    </div>
  );
}

// ========== СПОСОБНОСТИ ==========
function AbilitiesSection({ roomId, user }: { roomId: string; user: string }) {
  const [abilities, setAbilities] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { loadAbilities(); }, [roomId, user]);

  const loadAbilities = async () => {
    const { data } = await supabase.from('abilities').select('*').eq('room_id', roomId).eq('author_nickname', user).order('created_at', { ascending: false });
    if (data) setAbilities(data);
  };

  const addAbility = async () => {
    if (!name) return alert('Введите название!');
    const { error } = await supabase.from('abilities').insert({ room_id: roomId, author_nickname: user, name, description });
    if (error) alert('Ошибка: ' + error.message);
    else { setName(''); setDescription(''); loadAbilities(); }
  };

  const deleteAbility = async (id: string) => {
    if (!confirm('Удалить?')) return;
    await supabase.from('abilities').delete().eq('id', id);
    loadAbilities();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-3">
        <h3 className="text-lg font-bold text-blue-500">✨ Добавить способность</h3>
        <input className="w-full bg-gray-800 p-2 rounded text-white" placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-24" placeholder="Описание..." value={description} onChange={e => setDescription(e.target.value)} />
        <button onClick={addAbility} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white">➕ Добавить</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {abilities.map(a => (
          <div key={a.id} className="bg-gray-700 p-4 rounded-lg border border-blue-600">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-lg">{a.name}</h4>
              <button onClick={() => deleteAbility(a.id)} className="text-red-500">🗑️</button>
            </div>
            <p className="text-gray-300 text-sm">{a.description}</p>
          </div>
        ))}
        {abilities.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-8">Пока нет способностей</p>}
      </div>
    </div>
  );
}

// ========== ЗАМЕТКИ ==========
function NotesSection({ roomId, user }: { roomId: string; user: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => { loadNotes(); }, [roomId, user]);

  const loadNotes = async () => {
    const { data } = await supabase.from('notes').select('*').eq('room_id', roomId).eq('author_nickname', user).order('created_at', { ascending: false });
    if (data) setNotes(data);
  };

  const addNote = async () => {
    if (!title) return alert('Введите заголовок!');
    const { error } = await supabase.from('notes').insert({ room_id: roomId, author_nickname: user, title, content });
    if (error) alert('Ошибка: ' + error.message);
    else { setTitle(''); setContent(''); loadNotes(); }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Удалить?')) return;
    await supabase.from('notes').delete().eq('id', id);
    loadNotes();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-3">
        <h3 className="text-lg font-bold text-blue-500">📝 Создать заметку</h3>
        <input className="w-full bg-gray-800 p-2 rounded text-white" placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-32" placeholder="Содержание..." value={content} onChange={e => setContent(e.target.value)} />
        <button onClick={addNote} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white">➕ Добавить</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {notes.map(n => (
          <div key={n.id} className="bg-gray-700 p-4 rounded-lg border border-blue-600">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-lg">{n.title}</h4>
              <button onClick={() => deleteNote(n.id)} className="text-red-500">🗑️</button>
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-8">Пока нет заметок</p>}
      </div>
    </div>
  );
}

// ========== ПОЖЕЛАНИЯ (для игрока) ==========
function WishesSection({ roomId, user }: { roomId: string; user: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wishType, setWishType] = useState<'item' | 'ability' | 'story' | 'other'>('other');
  const [wishes, setWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadWishes(); }, [roomId]);

  const loadWishes = async () => {
    try {
      const { data, error } = await supabase.from('wishes').select('*').eq('room_id', roomId).eq('player_nickname', user).order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      if (data) setWishes(data);
    } catch (err) { console.error(err); }
  };

  const addWish = async () => {
    if (!title) return alert('Введите заголовок!');
    setLoading(true);
    try {
      const { error } = await supabase.from('wishes').insert({
        room_id: roomId, player_nickname: user, title, description, wish_type: wishType, status: 'pending',
      });
      if (error) { alert('Ошибка: ' + error.message); }
      else { setTitle(''); setDescription(''); await loadWishes(); }
    } catch (err) { alert('Ошибка сети.'); }
    setLoading(false);
  };

  const getIcon = (t: string) => t === 'item' ? '⚔️' : t === 'ability' ? '✨' : t === 'story' ? '' : '💫';
  const getColor = (s: string) => s === 'approved' ? 'border-green-600 bg-green-900/20' : s === 'rejected' ? 'border-red-600 bg-red-900/20' : s === 'answered' ? 'border-blue-600 bg-blue-900/20' : 'border-yellow-600 bg-yellow-900/20';
  const getStatusName = (s: string) => s === 'approved' ? '✅ Одобрено' : s === 'rejected' ? '❌ Отклонено' : s === 'answered' ? '💬 Ответ дан' : '⏳ Ожидает';

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-3">
        <h3 className="text-lg font-bold text-blue-500">💫 Создать пожелание</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={wishType} onChange={e => setWishType(e.target.value as any)} className="bg-gray-800 p-2 rounded text-white">
            <option value="item">⚔️ Предмет</option><option value="ability">✨ Способность</option><option value="story">📖 Сюжет</option><option value="other">💫 Другое</option>
          </select>
          <input className="bg-gray-800 p-2 rounded text-white md:col-span-2" placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-24" placeholder="Описание..." value={description} onChange={e => setDescription(e.target.value)} />
        <button onClick={addWish} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white disabled:opacity-50">{loading ? '⏳ Отправка...' : ' Отправить'}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {wishes.map(wish => (
          <div key={wish.id} className={`p-4 rounded-lg border-2 ${getColor(wish.status)}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getIcon(wish.wish_type)}</span>
                <div><h4 className="font-bold text-white text-lg">{wish.title}</h4></div>
              </div>
              <span className="text-xs font-bold text-gray-300">{getStatusName(wish.status)}</span>
            </div>
            {wish.description && <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{wish.description}</p>}
            {wish.master_response && <div className="mt-3 p-2 bg-gray-800 rounded"><p className="text-xs text-amber-400 font-bold mb-1">Ответ мастера:</p><p className="text-gray-300 text-sm">{wish.master_response}</p></div>}
            <p className="text-xs text-gray-500 mt-3">{new Date(wish.created_at).toLocaleString('ru-RU')}</p>
          </div>
        ))}
        {wishes.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-8">У вас пока нет пожеланий</p>}
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type GameSave = {
  id: string;
  slot_number: number;
  save_name: string;
  world_name: string;
  dm_nickname: string;
  lore_data: any[];
  items_data: any[];
  objects_data: any[];
  npcs_data: any[];
  members_data: any[];
  created_at: string;
  updated_at: string;
};

type Member = {
  user_nickname: string;
  role: string;
};

const masterMenu = [
  { id: 'start-game', label: 'Начать игру', icon: '🎲' },
  { id: 'npcs', label: 'Список персонажей', icon: '👥' },
  { id: 'upload-map', label: 'Загрузить карту', icon: '🗺️' },
  { id: 'draw-map', label: 'Нарисовать карту', icon: '✏️' },
  { id: 'lore-full', label: 'Лор (полный)', icon: '📖' },
  { id: 'lore-brief', label: 'Краткий лор', icon: '📜' },
  { id: 'items', label: 'Список предметов', icon: '⚔️' },
  { id: 'objects', label: 'Список объектов', icon: '🏺' },
  { id: 'wishes', label: 'Пожелания', icon: '💫' },
];

interface MasterDashboardProps {
  roomId: string;
  user: string;
  members: Member[];
  gameSaves: GameSave[];
  saveName: string;
  setSaveName: (name: string) => void;
  onSaveGame: (slot: number) => void;
  onLoadGame: (save: GameSave) => void;
  onShowSaves: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function MasterDashboard({
  roomId, user, members, gameSaves, saveName, setSaveName,
  onSaveGame, onLoadGame, onShowSaves, activeMenu, setActiveMenu
}: MasterDashboardProps) {

  const renderContent = () => {
    if (activeMenu === 'saves') return <SavesManager gameSaves={gameSaves} onLoadGame={onLoadGame} />;
    if (activeMenu === 'start-game') return <StartGameSection />;
    if (activeMenu === 'npcs') return <NPCsSection roomId={roomId} user={user} />;
    if (activeMenu === 'upload-map') return <UploadMapSection roomId={roomId} user={user} />;
    if (activeMenu === 'draw-map') return <DrawMapSection />;
    if (activeMenu === 'lore-full') return <LoreSection roomId={roomId} user={user} isBrief={false} />;
    if (activeMenu === 'lore-brief') return <LoreSection roomId={roomId} user={user} isBrief={true} />;
    if (activeMenu === 'items') return <ItemsSection roomId={roomId} user={user} type="item" />;
    if (activeMenu === 'objects') return <ItemsSection roomId={roomId} user={user} type="object" />;
    if (activeMenu === 'wishes') return <WishesSection roomId={roomId} user={user} isMaster={true} />;
    return <div className="text-gray-400">Выберите пункт меню</div>;
  };

  const menuLabels: Record<string, string> = {
    'start-game': '🎲 Начать игру',
    'npcs': '👥 Список персонажей',
    'upload-map': '🗺️ Загрузить карту',
    'draw-map': '✏️ Нарисовать карту',
    'lore-full': '📖 Лор (полный)',
    'lore-brief': '📜 Краткий лор',
    'items': '⚔️ Список предметов',
    'objects': '🏺 Список объектов',
    'wishes': '💫 Пожелания игроков',
    'saves': '💾 Сохранения',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* Меню мастера */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold text-amber-500 mb-4">👑 Меню Мастера</h2>
        <div className="space-y-1 flex-1">
          {masterMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full text-left p-3 rounded flex items-center gap-2 transition ${
                activeMenu === item.id ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="text-sm font-bold text-amber-500 mb-2"> Сохранения</h3>
          <input
            className="w-full bg-gray-700 p-2 rounded text-white text-sm mb-2"
            placeholder="Название сохранения"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[1, 2, 3, 4, 5, 6].map(slot => {
              const save = gameSaves.find(s => s.slot_number === slot);
              return (
                <button
                  key={slot}
                  onClick={() => onSaveGame(slot)}
                  className={`p-2 rounded text-xs font-bold transition ${
                    save ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title={save ? save.save_name : `Пустой слот ${slot}`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <button
            onClick={onShowSaves}
            className="w-full bg-blue-700 hover:bg-blue-800 p-2 rounded text-sm font-bold text-white"
          >
            📋 Управление сохранениями
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold text-amber-500 mb-4">{menuLabels[activeMenu] || 'Панель Мастера'}</h2>
        {renderContent()}
      </div>
    </div>
  );
}

// ========== КОМПОНЕНТЫ МАСТЕРА ==========

function SavesManager({ gameSaves, onLoadGame }: { gameSaves: GameSave[]; onLoadGame: (save: GameSave) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(slot => {
        const save = gameSaves.find(s => s.slot_number === slot);
        return (
          <div key={slot} className={`p-4 rounded-lg border ${save ? 'bg-gray-700 border-green-600' : 'bg-gray-700 border-gray-600 border-dashed'}`}>
            <div className="text-center mb-2"><span className="text-3xl font-bold text-amber-500">Слот {slot}</span></div>
            {save ? (
              <>
                <h3 className="font-bold text-white mb-1">{save.save_name}</h3>
                <p className="text-xs text-gray-400 mb-1">Мир: {save.world_name}</p>
                <p className="text-xs text-gray-400 mb-1">Мастер: {save.dm_nickname}</p>
                <p className="text-xs text-gray-500 mb-3">Обновлено: {new Date(save.updated_at).toLocaleDateString('ru-RU')}</p>
                <button onClick={() => onLoadGame(save)} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm font-bold text-white">📥 Загрузить</button>
              </>
            ) : (
              <div className="text-center py-8"><p className="text-gray-500 text-sm">Пусто</p></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StartGameSection() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [diceResult, setDiceResult] = useState('');
  const [diceHistory, setDiceHistory] = useState<string[]>([]);
  const [customDice, setCustomDice] = useState('');

  useEffect(() => {
    if (sessionStarted && sessionStart) {
      const interval = setInterval(() => {
        const diff = Date.now() - sessionStart.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStarted, sessionStart]);

  const rollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const roll = ` d${sides}: ${result}`;
    setDiceResult(roll);
    setDiceHistory(prev => [roll, ...prev].slice(0, 20));
  };

  const rollCustom = () => {
    const match = customDice.match(/(\d+)?d(\d+)([+-]\d+)?/i);
    if (!match) return alert('Формат: 2d6+3 или d20');
    const count = parseInt(match[1] || '1');
    const sides = parseInt(match[2]);
    const modifier = parseInt(match[3] || '0');
    let total = modifier;
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); total += r; }
    const roll = `🎲 ${count}d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''}: [${rolls.join(', ')}] = ${total}`;
    setDiceResult(roll);
    setDiceHistory(prev => [roll, ...prev].slice(0, 20));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-700 p-6 rounded-lg text-center">
        <h3 className="text-lg font-bold text-amber-500 mb-3">️ Таймер сессии</h3>
        <div className="text-5xl font-mono font-bold text-white mb-4">{elapsed}</div>
        {!sessionStarted ? (
          <button onClick={() => { setSessionStarted(true); setSessionStart(new Date()); }} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold text-white text-lg">▶️ Начать</button>
        ) : (
          <button onClick={() => setSessionStarted(false)} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold text-white text-lg">⏸️ Пауза</button>
        )}
      </div>
      <div className="bg-gray-700 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-amber-500 mb-4">🎲 Броски кубиков</h3>
        {diceResult && <div className="bg-gray-900 p-4 rounded mb-4 text-center"><div className="text-3xl font-bold text-amber-400">{diceResult}</div></div>}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4">
          {[4, 6, 8, 10, 12, 20, 100].map(s => <button key={s} onClick={() => rollDice(s)} className="bg-amber-600 hover:bg-amber-700 p-3 rounded font-bold text-white">d{s}</button>)}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-gray-800 p-2 rounded text-white" placeholder="2d6+3" value={customDice} onChange={e => setCustomDice(e.target.value)} />
          <button onClick={rollCustom} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white">Бросить</button>
        </div>
        {diceHistory.length > 0 && (
          <div className="mt-4"><h4 className="text-sm font-bold text-gray-400 mb-2">История:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">{diceHistory.map((r, i) => <div key={i} className="text-sm text-gray-300 bg-gray-800 p-2 rounded">{r}</div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function NPCsSection({ roomId, user }: { roomId: string; user: string }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [charType, setCharType] = useState<'enemy' | 'story' | 'minor'>('enemy');
  const [npcs, setNpcs] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadNPCs(); }, [roomId]);

  const loadNPCs = async () => {
    const { data } = await supabase.from('entities').select('*').eq('room_id', roomId).eq('type', 'npc').order('created_at', { ascending: false });
    if (data) setNpcs(data);
  };

  const addNPC = async () => {
    if (!name) return alert('Введите имя!');
    const { error } = await supabase.from('entities').insert({ room_id: roomId, type: 'npc', character_type: charType, name, description: desc, author_nickname: user, status: 'canon' });
    if (error) alert('Ошибка: ' + error.message);
    else { setName(''); setDesc(''); loadNPCs(); }
  };

  const deleteNPC = async (id: string) => {
    if (!confirm('Удалить?')) return;
    await supabase.from('entities').delete().eq('id', id);
    loadNPCs();
  };

  const getIcon = (t: string) => t === 'enemy' ? '👹' : t === 'story' ? '📖' : '👤';
  const getColor = (t: string) => t === 'enemy' ? 'border-red-600 bg-red-900/20' : t === 'story' ? 'border-blue-600 bg-blue-900/20' : 'border-gray-600 bg-gray-900/20';
  const filtered = filter === 'all' ? npcs : npcs.filter(n => n.character_type === filter);

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-3">
        <h3 className="text-lg font-bold text-amber-500"> Создать персонажа</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={charType} onChange={e => setCharType(e.target.value as any)} className="bg-gray-800 p-2 rounded text-white">
            <option value="enemy">👹 Враг</option><option value="story">📖 Сюжетный</option><option value="minor">👤 Второстепенный</option>
          </select>
          <input className="bg-gray-800 p-2 rounded text-white md:col-span-2" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-24" placeholder="Описание..." value={desc} onChange={e => setDesc(e.target.value)} />
        <button onClick={addNPC} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold text-white">➕ Добавить</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'all' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Все ({npcs.length})</button>
        <button onClick={() => setFilter('enemy')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'enemy' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>👹 Враги</button>
        <button onClick={() => setFilter('story')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'story' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>📖 Сюжетные</button>
        <button onClick={() => setFilter('minor')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'minor' ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300'}`}>👤 Второстепенные</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(npc => (
          <div key={npc.id} className={`p-4 rounded-lg border-2 ${getColor(npc.character_type)}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getIcon(npc.character_type)}</span>
                <div><h4 className="font-bold text-white text-lg">{npc.name}</h4></div>
              </div>
              <button onClick={() => deleteNPC(npc.id)} className="text-red-500">🗑️</button>
            </div>
            {npc.description && <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{npc.description}</p>}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-8">Пока нет персонажей</p>}
      </div>
    </div>
  );
}

function UploadMapSection({ roomId, user }: { roomId: string; user: string }) {
  const [mapName, setMapName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [gridSize, setGridSize] = useState(50);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => { loadMaps(); }, [roomId]);

  const loadMaps = async () => {
    const { data } = await supabase.from('maps').select('*').eq('room_id', roomId).eq('is_drawn', false).order('created_at', { ascending: false });
    if (data) setMaps(data);
  };

  const handleUpload = async () => {
    if (!file || !mapName) return alert('Введите название и выберите файл!');
    if (file.size > 50 * 1024 * 1024) return alert('Файл слишком большой! Макс: 50 МБ.');
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('dnd-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) { alert('Ошибка загрузки: ' + uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('dnd-images').getPublicUrl(fileName);
    const { error: dbError } = await supabase.from('maps').insert({ room_id: roomId, name: mapName, image_url: publicUrl, is_drawn: false, author_nickname: user });
    if (dbError) alert('Ошибка базы: ' + dbError.message);
    else { alert('Карта загружена!'); setMapName(''); setFile(null); loadMaps(); }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-3">
        <h3 className="text-lg font-bold text-amber-500">🗺️ Загрузить карту</h3>
        <input className="w-full bg-gray-800 p-2 rounded text-white" placeholder="Название" value={mapName} onChange={e => setMapName(e.target.value)} />
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white" />
        <button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white disabled:opacity-50">{uploading ? '⏳ Загрузка...' : '️ Загрузить'}</button>
      </div>
      {maps.length > 0 && (
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-bold text-amber-500 mb-3">📚 Карты</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {maps.map(map => (
              <button key={map.id} onClick={() => setSelectedMap(map)} className={`p-3 rounded border-2 ${selectedMap?.id === map.id ? 'border-amber-500 bg-gray-800' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}`}>
                <p className="font-bold text-white text-sm truncate">{map.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedMap && (
        <div className="bg-gray-700 p-4 rounded">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-amber-500">🗺️ {selectedMap.name}</h3>
            <button onClick={() => setSelectedMap(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="flex gap-4 mb-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="w-4 h-4" />Сетка</label>
            <label className="flex items-center gap-2 text-sm text-gray-300">Размер: <input type="range" min="20" max="100" value={gridSize} onChange={e => setGridSize(Number(e.target.value))} className="w-32" /><span className="text-amber-500 font-bold">{gridSize}px</span></label>
          </div>
          <div className="relative border-2 border-gray-600 rounded overflow-hidden bg-gray-900">
            <img src={selectedMap.image_url} alt={selectedMap.name} className="w-full h-auto block" style={{ maxHeight: '600px', objectFit: 'contain' }} />
            {showGrid && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)`, backgroundSize: `${gridSize}px ${gridSize}px` }} />}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawMapSection() {
  return (
    <div className="bg-gray-700 p-4 rounded border-2 border-dashed border-gray-600 text-center h-96 flex items-center justify-center">
      <div><p className="text-6xl mb-2">✏️</p><p className="text-gray-400">Рисование карт (в разработке)</p></div>
    </div>
  );
}

function LoreSection({ roomId, user, isBrief }: { roomId: string; user: string; isBrief: boolean }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lores, setLores] = useState<any[]>([]);

  useEffect(() => { loadLore(); }, [roomId, isBrief]);

  const loadLore = async () => {
    const { data } = await supabase.from('lore').select('*').eq('room_id', roomId).eq('is_brief', isBrief).order('created_at', { ascending: false });
    if (data) setLores(data);
  };

  const saveLore = async () => {
    if (!title || !content) return alert('Заполните все поля!');
    await supabase.from('lore').insert({ room_id: roomId, title, content, is_brief: isBrief, author_nickname: user });
    setTitle(''); setContent(''); loadLore();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-2">
        <input className="w-full bg-gray-800 p-2 rounded text-white" placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-32" placeholder={isBrief ? 'Краткий лор для игроков...' : 'Полный лор...'} value={content} onChange={e => setContent(e.target.value)} />
        <button onClick={saveLore} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold text-white">💾 Сохранить</button>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-300">📚 Записи:</h3>
        {lores.map(l => (
          <div key={l.id} className="bg-gray-700 p-3 rounded">
            <h4 className="font-bold text-amber-400">{l.title}</h4>
            <p className="text-gray-300 mt-1 whitespace-pre-wrap">{l.content}</p>
            <p className="text-xs text-gray-500 mt-2">Автор: {l.author_nickname}</p>
          </div>
        ))}
        {lores.length === 0 && <p className="text-gray-500 italic">Пока нет записей</p>}
      </div>
    </div>
  );
}

function ItemsSection({ roomId, user, type }: { roomId: string; user: string; type: string }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { loadItems(); }, [roomId, type]);

  const loadItems = async () => {
    const { data } = await supabase.from('entities').select('*').eq('room_id', roomId).eq('type', type === 'item' ? 'item' : 'object').order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!name) return alert('Введите название!');
    await supabase.from('entities').insert({ room_id: roomId, type: type === 'item' ? 'item' : 'object', name, description: desc, author_nickname: user, status: 'canon' });
    setName(''); setDesc(''); loadItems();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded space-y-2">
        <input className="w-full bg-gray-800 p-2 rounded text-white" placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
        <textarea className="w-full bg-gray-800 p-2 rounded text-white h-20" placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        <button onClick={addItem} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold text-white"> Добавить</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-gray-700 p-3 rounded">
            <h4 className="font-bold text-amber-400">{item.name}</h4>
            <p className="text-gray-300 text-sm mt-1">{item.description}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 italic col-span-2">Пока пусто</p>}
      </div>
    </div>
  );
}

function WishesSection({ roomId, user, isMaster }: { roomId: string; user: string; isMaster: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wishType, setWishType] = useState<'item' | 'ability' | 'story' | 'other'>('other');
  const [wishes, setWishes] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadWishes(); }, [roomId]);

  const loadWishes = async () => {
    try {
      const { data, error } = await supabase.from('wishes').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
      if (error) { console.error('Ошибка загрузки пожеланий:', error); return; }
      if (data) setWishes(data);
    } catch (err) { console.error('Ошибка:', err); }
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
    } catch (err) { alert('Ошибка сети. Проверьте подключение.'); }
    setLoading(false);
  };

  const respondToWish = async (wishId: string, status: 'approved' | 'rejected' | 'answered') => {
    const { error } = await supabase.from('wishes').update({ status, master_response: responseText, updated_at: new Date().toISOString() }).eq('id', wishId);
    if (error) alert('Ошибка: ' + error.message);
    else { setResponseText(''); loadWishes(); }
  };

  const getIcon = (t: string) => t === 'item' ? '⚔️' : t === 'ability' ? '✨' : t === 'story' ? '📖' : '💫';
  const getColor = (s: string) => s === 'approved' ? 'border-green-600 bg-green-900/20' : s === 'rejected' ? 'border-red-600 bg-red-900/20' : s === 'answered' ? 'border-blue-600 bg-blue-900/20' : 'border-yellow-600 bg-yellow-900/20';
  const getStatusName = (s: string) => s === 'approved' ? '✅ Одобрено' : s === 'rejected' ? '❌ Отклонено' : s === 'answered' ? '💬 Ответ дан' : '⏳ Ожидает';

  const filtered = filter === 'all' ? wishes : wishes.filter(w => w.status === filter);

  return (
    <div className="space-y-4">
      {!isMaster && (
        <div className="bg-gray-700 p-4 rounded space-y-3">
          <h3 className="text-lg font-bold text-blue-500">💫 Создать пожелание</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={wishType} onChange={e => setWishType(e.target.value as any)} className="bg-gray-800 p-2 rounded text-white">
              <option value="item">⚔️ Предмет</option><option value="ability">✨ Способность</option><option value="story">📖 Сюжет</option><option value="other">💫 Другое</option>
            </select>
            <input className="bg-gray-800 p-2 rounded text-white md:col-span-2" placeholder="Заголовок" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <textarea className="w-full bg-gray-800 p-2 rounded text-white h-24" placeholder="Описание..." value={description} onChange={e => setDescription(e.target.value)} />
          <button onClick={addWish} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white disabled:opacity-50">{loading ? ' Отправка...' : '💫 Отправить'}</button>
        </div>
      )}
      {isMaster && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'all' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Все ({wishes.length})</button>
          <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>⏳ Ожидают</button>
          <button onClick={() => setFilter('approved')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>✅ Одобрены</button>
          <button onClick={() => setFilter('rejected')} className={`px-3 py-1 rounded text-sm font-bold ${filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>❌ Отклонены</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(wish => (
          <div key={wish.id} className={`p-4 rounded-lg border-2 ${getColor(wish.status)}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getIcon(wish.wish_type)}</span>
                <div><h4 className="font-bold text-white text-lg">{wish.title}</h4><span className="text-xs text-gray-400">От: {wish.player_nickname}</span></div>
              </div>
              <span className="text-xs font-bold text-gray-300">{getStatusName(wish.status)}</span>
            </div>
            {wish.description && <p className="text-gray-300 text-sm mt-2 whitespace-pre-wrap">{wish.description}</p>}
            {wish.master_response && <div className="mt-3 p-2 bg-gray-800 rounded"><p className="text-xs text-amber-400 font-bold mb-1">Ответ мастера:</p><p className="text-gray-300 text-sm">{wish.master_response}</p></div>}
            {isMaster && wish.status === 'pending' && (
              <div className="mt-3 space-y-2">
                <input className="w-full bg-gray-800 p-2 rounded text-white text-sm" placeholder="Ваш ответ..." value={responseText} onChange={e => setResponseText(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => respondToWish(wish.id, 'approved')} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-bold text-white">✅</button>
                  <button onClick={() => respondToWish(wish.id, 'rejected')} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold text-white">❌</button>
                  <button onClick={() => respondToWish(wish.id, 'answered')} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-bold text-white">💬</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-gray-500 italic col-span-2 text-center py-8">Пока нет пожеланий</p>}
      </div>
    </div>
  );
}
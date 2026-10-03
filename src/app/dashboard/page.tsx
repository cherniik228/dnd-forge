"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

type View = 'main' | 'map' | 'draw' | 'characters' | 'items' | 'objects' | 'lore-full' | 'lore-short' | 'upload-map' | 'proposals';
type Tool = 'pan' | 'brush' | 'eraser' | 'fog-add' | 'fog-remove';

interface Point { x: number; y: number; }
interface FogPolygon { points: Point[]; type: 'add' | 'remove'; }
interface DiceRoll { id: string; user_nickname: string; dice: string; rolls: string; modifier: number; total: number; created_at: string; }
interface Participant { id?: any; user_nickname: string; role: string; }

  const FOG_CANVAS_SIZE = 4000;

  const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  // Уменьшаем и пережимаем картинку в WebP (или JPEG, если WebP не поддерживается)
  const compressImage = async (file: File, maxSide: number, quality: number): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const toBlob = (type: string) => new Promise<Blob | null>(r => canvas.toBlob(r, type, quality));
    const webp = await toBlob('image/webp');
    if (webp && webp.type === 'image/webp') return webp;
    const jpeg = await toBlob('image/jpeg');
    if (!jpeg) throw new Error('Не удалось сжать изображение');
    return jpeg;
  };


export default function Dashboard() {
  const [roomKey, setRoomKey] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoomKey(params.get('key'));
  }, []);
  
  const [user, setUser] = useState('');
  const [role, setRole] = useState<'dm' | 'player'>('player');
  const [roomId, setRoomId] = useState('');
  const [currentView, setCurrentView] = useState<View>('main');
  
  const [mapImage, setMapImage] = useState<string>('');
  const [gridSize, setGridSize] = useState(40);

  const [entities, setEntities] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [newProposalMsg, setNewProposalMsg] = useState('');
  
  const [characters, setCharacters] = useState<any[]>([]);
  const [showCharForm, setShowCharForm] = useState(false);
  const [newChar, setNewChar] = useState({ name: '', race: '', strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, hit_points: 10, armor_class: 10, spells: '', description: '', image_url: '' });

  const [items, setItems] = useState<any[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '' });

  const [objects, setObjects] = useState<any[]>([]);
  const [showObjForm, setShowObjForm] = useState(false);
  const [newObj, setNewObj] = useState({ name: '', description: '', image_url: '', grid_size: 1 });

  const [loreFolders, setLoreFolders] = useState<any[]>([]);
  const [loreNotes, setLoreNotes] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  const [boardTokens, setBoardTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [currentTool, setCurrentTool] = useState<Tool>('pan');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [fogPolygons, setFogPolygons] = useState<FogPolygon[]>([]);
  const [currentFogPoints, setCurrentFogPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [diceHistory, setDiceHistory] = useState<DiceRoll[]>([]);
  const [isDicePanelOpen, setIsDicePanelOpen] = useState(true);

  // Refs для хранения актуальных значений в замыканиях
  const fogPolygonsRef = useRef(fogPolygons);
  const currentFogPointsRef = useRef(currentFogPoints);

  useEffect(() => {
    fogPolygonsRef.current = fogPolygons;
  }, [fogPolygons]);

  useEffect(() => {
    currentFogPointsRef.current = currentFogPoints;
  }, [currentFogPoints]);

  // Refs для drag-and-drop: обработчики на window иначе видят устаревший state
  const boardTokensRef = useRef<any[]>([]);
  const draggedTokenRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const mapOffsetRef = useRef(mapOffset);
  const zoomRef = useRef(zoom);
  const gridSizeRef = useRef(gridSize);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasSubscribedOnce = useRef(false);
  const [isMapUploading, setIsMapUploading] = useState(false);
  const [remoteFogPreview, setRemoteFogPreview] = useState<{ points: Point[]; type: 'add' | 'remove' } | null>(null);

  // Чужие мазки кистью: координаты нормализованы (0..1), чтобы совпадать на разных экранах
  const drawRemoteStroke = (s: any) => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !s) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(s.x1 * rect.width, s.y1 * rect.height);
    ctx.lineTo(s.x2 * rect.width, s.y2 * rect.height);
    ctx.strokeStyle = s.eraser ? 'rgba(0,0,0,0)' : s.color;
    ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.stroke();
  };

  useEffect(() => { boardTokensRef.current = boardTokens; }, [boardTokens]);
  useEffect(() => { mapOffsetRef.current = mapOffset; }, [mapOffset]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);

  // Сигнал остальным клиентам через Broadcast (работает без настроек publication)
  // Шлём только через открытый WebSocket. Без этого supabase-js превращает каждое сообщение
  // в отдельный HTTP-запрос, сотни запросов забивают соединение и рвут загрузку данных.
  const isChannelReadyRef = useRef(false);
  const broadcast = useCallback((event: string, payload: any = {}) => {
    if (!channelRef.current || !isChannelReadyRef.current) return;
    channelRef.current.send({ type: 'broadcast', event, payload });
  }, []);

  // Мазки кистью копим и отправляем пачкой раз в 80 мс, а не на каждое движение мыши
  const strokeBufferRef = useRef<any[]>([]);
  const strokeFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueStroke = useCallback((stroke: any) => {
    strokeBufferRef.current.push(stroke);
    if (strokeFlushTimerRef.current) return;
    strokeFlushTimerRef.current = setTimeout(() => {
      strokeFlushTimerRef.current = null;
      const strokes = strokeBufferRef.current;
      strokeBufferRef.current = [];
      if (strokes.length) broadcast('brush_strokes', { strokes });
    }, 80);
  }, [broadcast]);

  const upsertById = <T extends { id?: any }>(list: T[], row: T): T[] => {
    const exists = list.some(x => x.id === row.id);
    return exists ? list.map(x => (x.id === row.id ? { ...x, ...row } : x)) : [...list, row];
  };

  // Перезагрузка «тяжёлых» полей комнаты. Realtime не присылает поля,
  // если строка > 1MB (а base64-карта почти всегда больше), поэтому берём их из БД.
  const applyFog = (raw: any) => {
    const fog = typeof raw === 'string' ? JSON.parse(raw) : raw;
    setFogPolygons(Array.isArray(fog) ? fog : []);
  };

  // Лёгкая перезагрузка: туман и сетка (маленькие поля)
  const reloadRoomLight = useCallback(async (id: string) => {
    const { data } = await supabase.from('rooms').select('grid_size, fog_data').eq('id', id).single();
    if (!data) return;
    setGridSize(data.grid_size || 40);
    applyFog(data.fog_data);
  }, []);

  // Полная перезагрузка с картой; защищаемся от параллельных запросов
  const roomReloadInFlight = useRef(false);
  const reloadRoomState = useCallback(async (id: string) => {
    if (roomReloadInFlight.current) return;
    roomReloadInFlight.current = true;
    try {
      const { data } = await supabase
        .from('rooms')
        .select('map_image, grid_size, fog_data')
        .eq('id', id)
        .single();
      if (!data) return;
      setMapImage(data.map_image || '');
      setGridSize(data.grid_size || 40);
      applyFog(data.fog_data);
    } finally {
      roomReloadInFlight.current = false;
    }
  }, []);

  const tableSetters: Record<string, (rows: any[]) => void> = {
    characters: setCharacters,
    items: setItems,
    objects: setObjects,
    entities: setEntities,
    lore_folders: setLoreFolders,
    board_tokens: setBoardTokens,
    proposals: setProposals,
    room_participants: setParticipants,
  };

  const reloadTable = useCallback(async (table: string, id: string) => {
    const setter = tableSetters[table];
    if (!setter) return;
    const { data } = await supabase.from(table).select('*').eq('room_id', id);
    if (!data) return;
    if (table === 'board_tokens' && draggedTokenRef.current) {
      const dragged = boardTokensRef.current.find(t => t.id === draggedTokenRef.current);
      setter(data.map(t => (dragged && t.id === dragged.id ? dragged : t)));
      return;
    }
    setter(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const initRoom = async (savedUser: string) => {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_key', roomKey)
      .single();

    if (roomError || !room) {
      console.error("❌ Ошибка поиска комнаты:", roomError);
      return;
    }

    console.log("📦 Данные комнаты из БД:", room);
    console.log("️ fog_data:", room.fog_data);

    setRoomId(room.id);
    const isDM = room.dm_id === savedUser;
    const userRole = isDM ? 'dm' : 'player';
    setRole(userRole);
    localStorage.setItem('dnd_role', userRole);

    await supabase.from('room_participants').upsert({
      room_id: room.id,
      user_nickname: savedUser,
      role: userRole
    }, { onConflict: 'room_id,user_nickname' });

    setMapImage(room.map_image || '');
    setGridSize(room.grid_size || 40);
    
    if (room.fog_data && Array.isArray(room.fog_data)) {
      console.log("✅ Загружен туман войны:", room.fog_data.length, "полигонов");
      setFogPolygons(room.fog_data);
    } else {
      console.log("⚠️ fog_data пустой или не массив");
      setFogPolygons([]);
    }
    
    const { data: roomData, error: dataError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_participants (*),
        entities (*),
        proposals (*),
        characters (*),
        items (*),
        objects (*),
        lore_folders (*),
        board_tokens (*),
        dice_rolls (*)
      `)
      .eq('id', room.id)
      .single();

    if (dataError) {
      console.error("❌ Ошибка загрузки данных комнаты:", dataError);
      return;
    }

    setParticipants(roomData.room_participants || []);
    setEntities(roomData.entities || []);
    setProposals(roomData.proposals || []);
    setCharacters(roomData.characters || []);
    setItems(roomData.items || []);
    setObjects(roomData.objects || []);
    setLoreFolders(roomData.lore_folders || []);
    setBoardTokens(roomData.board_tokens || []);
    setDiceHistory(roomData.dice_rolls || []);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('dnd_user') || 'Аноним';
    setUser(savedUser);
    if (roomKey) initRoom(savedUser);
  }, [roomKey]);

  //  REALTIME СИНХРОНИЗАЦИЯ
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room-sync-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    // Универсальная подписка INSERT / UPDATE / DELETE для списков комнаты
    const listTables = ['room_participants', 'characters', 'items', 'objects', 'entities', 'lore_folders', 'proposals'];
    listTables.forEach(table => {
      const setter = tableSetters[table] as any;
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `room_id=eq.${roomId}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setter((prev: any[]) => prev.filter(x => x.id !== payload.old?.id));
        } else if (payload.new?.id !== undefined) {
          // Для больших строк (картинки base64) Realtime обрезает поля — перечитываем таблицу
          if (payload.errors?.length) reloadTable(table, roomId);
          else setter((prev: any[]) => upsertById(prev, payload.new));
        }
      });
    });

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls', filter: `room_id=eq.${roomId}` }, (payload) => {
        setDiceHistory(prev => (prev.some(r => r.id === (payload.new as any).id) ? prev : [payload.new as any, ...prev]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_tokens', filter: `room_id=eq.${roomId}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setBoardTokens(prev => prev.filter(t => t.id !== payload.old?.id));
          return;
        }
        const row = payload.new;
        if (!row?.id) return;
        // Не перетираем фишку, которую пользователь сейчас тащит
        if (row.id === draggedTokenRef.current) return;
        if (payload.errors?.length) {
          reloadTable('board_tokens', roomId);
          return;
        }
        setBoardTokens(prev => upsertById(prev, row));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload: any) => {
        const row = payload.new || {};
        // Небольшая строка приходит целиком — применяем без лишних запросов
        if (!payload.errors?.length && row.map_image !== undefined) {
          setMapImage(row.map_image || '');
          if (row.grid_size) setGridSize(row.grid_size);
          applyFog(row.fog_data);
        } else {
          reloadRoomLight(roomId);
        }
      })
      .on('broadcast', { event: 'map_updated' }, ({ payload }) => {
        if (payload?.url) {
          setMapImage(payload.url);
          if (payload.grid_size) setGridSize(payload.grid_size);
        } else {
          reloadRoomState(roomId);
        }
      })
      .on('broadcast', { event: 'fog_preview' }, ({ payload }) => {
        setRemoteFogPreview(Array.isArray(payload?.points) ? payload : null);
      })
      .on('broadcast', { event: 'brush_strokes' }, ({ payload }) => {
        if (Array.isArray(payload?.strokes)) payload.strokes.forEach(drawRemoteStroke);
      })
      .on('broadcast', { event: 'brush_clear' }, () => {
        const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      })
      // Broadcast-сигналы: мгновенно и не зависят от размера строки
      .on('broadcast', { event: 'token_moved' }, ({ payload }) => {
        if (payload.id === draggedTokenRef.current) return;
        setBoardTokens(prev => prev.map(t => (t.id === payload.id ? { ...t, ...payload } : t)));
      })
      .on('broadcast', { event: 'fog_updated' }, ({ payload }) => {
        if (Array.isArray(payload.fog)) setFogPolygons(payload.fog);
        setRemoteFogPreview(null);
      })
      .on('broadcast', { event: 'room_updated' }, () => {
        reloadRoomState(roomId);
      })
      .on('broadcast', { event: 'table_changed' }, ({ payload }) => {
        if (payload?.table) reloadTable(payload.table, roomId);
      })
      .subscribe((status) => {
        isChannelReadyRef.current = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime синхронизация подключена');
          // Догоняем изменения, пропущенные во время (пере)подключения.
          // Карту целиком качаем только при первом подключении — иначе каждое переподключение тянет мегабайты
          if (hasSubscribedOnce.current) reloadRoomLight(roomId);
          else reloadRoomState(roomId);
          hasSubscribedOnce.current = true;
          reloadTable('board_tokens', roomId);
        }
      });

    channelRef.current = channel;

    return () => {
      isChannelReadyRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, reloadRoomState, reloadRoomLight, reloadTable]);

  const saveFogToDatabase = useCallback(async (newFogPolygons: FogPolygon[]) => {
    if (role !== 'dm' || !roomId) {
      console.log("⚠️ Не мастер или нет roomId, туман не сохраняется");
      return;
    }
    
    console.log("💾 Сохраняем туман в БД:", newFogPolygons.length, "полигонов");
    broadcast('fog_updated', { fog: newFogPolygons });
    
    const { error } = await supabase
      .from('rooms')
      .update({ fog_data: newFogPolygons })
      .eq('id', roomId);
    
    if (error) {
      console.error("❌ Ошибка сохранения тумана:", error);
    } else {
      console.log("✅ Туман сохранён в БД");
    }
  }, [role, roomId, broadcast]);

  const fetchLoreNotes = async (folderId: string) => { 
    const { data } = await supabase.from('lore_notes').select('*').eq('folder_id', folderId).order('created_at', { ascending: false }); 
    if (data) setLoreNotes(data); 
  };

  const submitProposal = async () => {
    if (!newProposalMsg.trim()) return alert("Введите сообщение!");
    const { error } = await supabase.from('proposals').insert({ room_id: roomId, author_nickname: user, message: newProposalMsg });
    if (error) return alert("Ошибка: " + error.message);
    setNewProposalMsg('');
  };

  const rollDice = async (sides: number, count: number = 1, modifier: number = 0, throwerName?: string) => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0) + modifier;
    const { error } = await supabase.from('dice_rolls').insert({ 
      room_id: roomId, user_nickname: throwerName || user, dice: `${count}d${sides}`, 
      rolls: JSON.stringify(rolls), modifier, total 
    });
    if (error) return alert("Ошибка броска: " + error.message);
  };

  const updateRoomSettings = async (updates: any) => {
    const { error } = await supabase.from('rooms').update(updates).eq('id', roomId);
    if (!error) broadcast('room_updated');
  };

  // Вставка + мгновенное обновление своего списка + сигнал остальным
  const insertAndSync = async (table: string, newData: any) => {
    const { data, error } = await supabase.from(table).insert(newData).select().single();
    if (error) {
      alert("Ошибка: " + error.message);
      return null;
    }
    const setter = tableSetters[table] as any;
    if (setter && data) setter((prev: any[]) => upsertById(prev, data));
    broadcast('table_changed', { table });
    return data;
  };

  const addCharacter = async () => {
    if (!newChar.name) return alert("Введите имя!");
    const newData = { room_id: roomId, ...newChar, image_url: newChar.image_url || '', author_nickname: user };
    if (!(await insertAndSync('characters', newData))) return;
    setShowCharForm(false);
    setNewChar({ name: '', race: '', strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, hit_points: 10, armor_class: 10, spells: '', description: '', image_url: '' });
  };

  const addCharToBoard = async (char: any) => {
    const newData = { room_id: roomId, token_type: 'character', token_id: char.id, name: char.name, image_url: char.image_url || '', grid_size: 1, position_x: 400, position_y: 300, layer: 10, author_nickname: user };
    if (!(await insertAndSync('board_tokens', newData))) return;
    setCurrentView('map');
  };

  const addItem = async () => {
    if (!newItem.name) return alert("Введите название!");
    const newData = { room_id: roomId, ...newItem, author_nickname: user };
    if (!(await insertAndSync('items', newData))) return;
    setShowItemForm(false); setNewItem({ name: '', description: '' });
  };

  const addObject = async () => {
    if (!newObj.name) return alert("Введите название!");
    const newData = { room_id: roomId, name: newObj.name, description: newObj.description, image_url: newObj.image_url, grid_size: newObj.grid_size, author_nickname: user };
    if (!(await insertAndSync('objects', newData))) return;
    setShowObjForm(false); setNewObj({ name: '', description: '', image_url: '', grid_size: 1 });
  };

  const addObjectToBoard = async (obj: any) => {
    const newData = { room_id: roomId, token_type: 'object', token_id: obj.id, name: obj.name, image_url: obj.image_url || '', grid_size: obj.grid_size || 1, position_x: 400, position_y: 300, layer: 10, author_nickname: user };
    if (!(await insertAndSync('board_tokens', newData))) return;
    setCurrentView('map');
  };

  const setTokenLayer = async (token: any, layer: number) => {
    setBoardTokens(prev => prev.map(t => (t.id === token.id ? { ...t, layer } : t)));
    broadcast('token_moved', { id: token.id, layer });
    await supabase.from('board_tokens').update({ layer }).eq('id', token.id);
  };
  const raiseTokenLayer = (token: any) => setTokenLayer(token, Math.min((token.layer || 10) + 1, 99));
  const lowerTokenLayer = (token: any) => setTokenLayer(token, Math.max((token.layer || 10) - 1, 1));

  const addLoreFolder = async (type: 'full' | 'short') => {
    if (!newFolderName) return alert("Введите название!");
    if (!(await insertAndSync('lore_folders', { room_id: roomId, name: newFolderName, type, author_nickname: user }))) return;
    setShowFolderForm(false); setNewFolderName('');
  };

  const addLoreNote = async () => {
    if (!selectedFolder || !newNote.title) return alert("Заполните поля!");
    await supabase.from('lore_notes').insert({ folder_id: selectedFolder, ...newNote, author_nickname: user });
    setShowNoteForm(false); setNewNote({ title: '', content: '' });
    fetchLoreNotes(selectedFolder);
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return alert("Ошибка: выберите файл или дождитесь загрузки комнаты");

    setIsMapUploading(true);
    try {
      // Сжимаем: исходник в несколько МБ рвёт соединение (ERR_HTTP2_PING_FAILED / Failed to fetch)
      const blob = await compressImage(file, 2560, 0.82);
      let mapUrl = '';

      // 1) Пытаемся положить в Supabase Storage — в БД попадает только короткая ссылка
      const path = `${roomId}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('maps')
        .upload(path, blob, { contentType: blob.type, upsert: true });
      if (!uploadError) {
        mapUrl = supabase.storage.from('maps').getPublicUrl(path).data.publicUrl;
      } else {
        console.warn('Storage недоступен, сохраняем сжатую карту в БД:', uploadError.message);
        // 2) Запасной вариант — сжатый base64
        mapUrl = await blobToDataUrl(blob);
      }

      setMapImage(mapUrl);
      setCurrentView('map');

      const { error } = await supabase.from('rooms').update({ map_image: mapUrl, grid_size: gridSize }).eq('id', roomId);
      if (error) {
        console.error("❌ Ошибка сохранения карты:", error);
        alert("Не удалось сохранить карту: " + error.message);
        return;
      }
      // Ссылку отправляем прямо в сигнале; base64 игроки дочитают из БД
      broadcast('map_updated', mapUrl.startsWith('data:') ? {} : { url: mapUrl, grid_size: gridSize });
    } catch (err: any) {
      console.error("❌ Ошибка загрузки карты:", err);
      alert("Не удалось загрузить карту: " + (err?.message || err));
    } finally {
      setIsMapUploading(false);
      e.target.value = '';
    }
  };

  const handleCharImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewChar({ ...newChar, image_url: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleObjImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewObj({ ...newObj, image_url: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom * delta));
    const container = mapContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
      setZoom(newZoom);
      setMapOffset({ x: mouseX - (mouseX - mapOffset.x) * (newZoom / zoom), y: mouseY - (mouseY - mapOffset.y) * (newZoom / zoom) });
    }
  };

  const handleMapMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.token-element')) return;
    if (currentTool === 'fog-add' || currentTool === 'fog-remove') {
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Храним точки в координатах карты — тогда туман совпадает у всех, независимо от зума/сдвига/размера экрана
      const mapPoint = {
        x: (e.clientX - rect.left - mapOffset.x) / zoom,
        y: (e.clientY - rect.top - mapOffset.y) / zoom,
      };
      const nextPoints = [...currentFogPointsRef.current, mapPoint];
      currentFogPointsRef.current = nextPoints;
      setCurrentFogPoints(nextPoints);
      if (role === 'dm') broadcast('fog_preview', { points: nextPoints, type: currentTool === 'fog-add' ? 'add' : 'remove' });
      return;
    }
    if (currentTool === 'pan' && e.button === 0 && !draggedToken) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - mapOffset.x, y: e.clientY - mapOffset.y });
    }
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setMapOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (currentTool === 'fog-add' || currentTool === 'fog-remove') {
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
  };

  const handleTokenMouseDown = (e: React.MouseEvent, token: any) => {
    if ((e.target as HTMLElement).closest('.layer-controls')) { 
      e.stopPropagation(); 
      return; 
    }
    
    if (role === 'player' && token.author_nickname !== user) {
      console.log("🚫 Блокировка: игрок пытается двигать чужой токен");
      return;
    }

    e.stopPropagation(); 
    e.preventDefault();
    setSelectedToken(token.id); 
    setDraggedToken(token.id);
    draggedTokenRef.current = token.id;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Смещение курсора внутри фишки в экранных пикселях
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragOffset(dragOffsetRef.current);
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  // Используем только refs: эти функции живут на window и не видят свежий state
  const handleGlobalMouseMove = (e: MouseEvent) => {
    const id = draggedTokenRef.current;
    const container = mapContainerRef.current;
    if (!id || !container) return;
    
    const rect = container.getBoundingClientRect();
    const offset = mapOffsetRef.current;
    const z = zoomRef.current;
    const grid = gridSizeRef.current;
    const x = (e.clientX - rect.left - offset.x - dragOffsetRef.current.x) / z;
    const y = (e.clientY - rect.top - offset.y - dragOffsetRef.current.y) / z;
    const snappedX = Math.round(x / grid) * grid;
    const snappedY = Math.round(y / grid) * grid;
    
    const next = boardTokensRef.current.map(t =>
      t.id === id ? { ...t, position_x: snappedX, position_y: snappedY } : t
    );
    boardTokensRef.current = next;
    setBoardTokens(next);
  };

  const handleGlobalMouseUp = async () => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);

    const id = draggedTokenRef.current;
    if (!id) return;
    const token = boardTokensRef.current.find(t => t.id === id);
    draggedTokenRef.current = null;
    setDraggedToken(null);
    if (!token) return;

    // Сразу показываем другим, затем сохраняем в БД
    broadcast('token_moved', { id, position_x: token.position_x, position_y: token.position_y });
    const { error } = await supabase
      .from('board_tokens')
      .update({ position_x: token.position_x, position_y: token.position_y })
      .eq('id', id);
    
    if (error) {
      console.error("❌ Ошибка перемещения:", error);
      alert("Не удалось переместить: " + error.message);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth * 2; canvas.height = container.clientHeight * 2;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    redrawFogCanvas();
  };

  const redrawFogCanvas = useCallback(() => {
    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas) return;
    const ctx = fogCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogPolygons.forEach(polygon => {
      if (polygon.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
      ctx.closePath();
      if (polygon.type === 'add') {
        ctx.fillStyle = `rgba(0, 0, 0, ${role === 'dm' ? 0.5 : 1.0})`;
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  }, [fogPolygons, role]);

  useEffect(() => { if (currentView === 'map') setTimeout(initCanvas, 100); }, [currentView]);
  useEffect(() => { if (currentView === 'map') redrawFogCanvas(); }, [fogPolygons, role, currentView, redrawFogCanvas]);

  // ✅ ИСПРАВЛЕНО: используем refs для доступа к актуальным значениям
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (currentTool === 'fog-add' || currentTool === 'fog-remove')) {
        e.preventDefault();
        const points = currentFogPointsRef.current;
        if (points.length >= 2) {
          const newPolygon: FogPolygon = { 
            points: [...points], 
            type: currentTool === 'fog-add' ? 'add' : 'remove' 
          };
          const newFogPolygons = [...fogPolygonsRef.current, newPolygon];
          console.log("🌫️ Добавлен новый полигон тумана:", newPolygon);
          setFogPolygons(newFogPolygons);
          setCurrentFogPoints([]);
          setTimeout(() => redrawFogCanvas(), 0);
          saveFogToDatabase(newFogPolygons);
        } else { 
          setCurrentFogPoints([]); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, redrawFogCanvas, saveFogToDatabase]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'brush' || currentTool === 'eraser') { setIsDrawing(true); lastPos.current = getCanvasPos(e); }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getCanvasPos(e);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,0)' : brushColor;
    ctx.lineWidth = brushSize; ctx.lineCap = 'round'; ctx.stroke();
    const rect = canvas!.getBoundingClientRect();
    queueStroke({
      x1: lastPos.current.x / rect.width, y1: lastPos.current.y / rect.height,
      x2: pos.x / rect.width, y2: pos.y / rect.height,
      color: brushColor, size: brushSize, eraser: currentTool === 'eraser',
    });
    lastPos.current = pos;
  };

  const stopDrawing = () => { setIsDrawing(false); lastPos.current = null; };
  const clearCanvas = () => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    broadcast('brush_clear');
  };
  
  const clearFog = async () => { 
    setFogPolygons([]); 
    setCurrentFogPoints([]); 
    if (role === 'dm') {
      await saveFogToDatabase([]);
    }
  };

  // Точки хранятся в координатах карты, а превью рисуется в экранных
  const fogPreview = currentFogPoints.map(p => ({ x: p.x * zoom + mapOffset.x, y: p.y * zoom + mapOffset.y }));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {role === 'dm' && (
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col flex-shrink-0">
          <h2 className="text-xl font-bold text-amber-500 mb-4">👑 Меню Мастера</h2>
          <button onClick={() => setCurrentView('map')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'map' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🎲 Начать игру</button>
          <button onClick={() => setCurrentView('characters')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'characters' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}> Персонажи</button>
          <button onClick={() => setCurrentView('upload-map')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'upload-map' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🗺️ Загрузить карту</button>
          <button onClick={() => { setCurrentView('lore-full'); setSelectedFolder(null); }} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'lore-full' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>📖 Лор (полный)</button>
          <button onClick={() => { setCurrentView('lore-short'); setSelectedFolder(null); }} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'lore-short' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>📜 Краткий лор</button>
          <button onClick={() => setCurrentView('items')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'items' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>️ Предметы</button>
          <button onClick={() => setCurrentView('objects')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'objects' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🏺 Объекты</button>
          <button onClick={() => setCurrentView('proposals')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'proposals' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>💫 Пожелания</button>
          <div className="mt-auto">
            <h3 className="text-sm font-bold text-amber-500 mb-2">Сохранения</h3>
            <input className="w-full p-2 bg-gray-700 rounded mb-2 text-sm" placeholder="Название" />
            <div className="grid grid-cols-3 gap-1">{[1, 2, 3, 4, 5, 6].map(n => <button key={n} className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm">{n}</button>)}</div>
          </div>
        </div>
      )}

      {role === 'player' && (
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col flex-shrink-0">
          <h2 className="text-xl font-bold text-blue-500 mb-4">🎲 Меню Игрока</h2>
          <button onClick={() => setCurrentView('map')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'map' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🗺️ Карта</button>
          <button onClick={() => setCurrentView('characters')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'characters' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>👤 Мой персонаж</button>
          <button onClick={() => setCurrentView('items')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'items' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🎒 Предметы</button>
          <button onClick={() => setCurrentView('proposals')} className={`w-full p-3 rounded mb-2 text-left flex items-center gap-2 ${currentView === 'proposals' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}> Предложение</button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-4">
            {currentView !== 'main' && currentView !== 'map' && <button onClick={() => setCurrentView('main')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold">← Назад</button>}
            {currentView === 'map' && <button onClick={() => setCurrentView('main')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold">← К списку</button>}
            <h1 className="text-2xl font-bold text-amber-500 truncate">️ Стол: {roomKey}</h1>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{user}</p>
            <p className="text-sm text-gray-400 uppercase">{role === 'dm' ? '👑 Мастер' : ' Игрок'}</p>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {currentView === 'main' && (
            <div className="grid gap-4">
              <h2 className="text-2xl font-bold text-gray-300">📚 Активные объекты</h2>
              {entities.filter(e => role === 'dm' || e.status === 'canon').map((entity) => (
                <div key={entity.id} className={`p-4 rounded-lg border ${entity.status === 'pending' ? 'bg-yellow-900/30 border-yellow-600' : 'bg-gray-800 border-gray-700'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase text-gray-500 bg-gray-700 px-2 py-1 rounded">{entity.type}</span>
                      <h3 className="text-xl font-bold mt-1">{entity.name}</h3>
                      <p className="text-gray-400 mt-1">{entity.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentView === 'map' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2 flex-shrink-0">
                <h2 className="text-2xl font-bold text-amber-500">🗺️ Игровой стол</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  {role === 'dm' && (
                    <>
                      <button onClick={() => setCurrentTool('pan')} className={`px-3 py-2 rounded font-bold text-sm ${currentTool === 'pan' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>✋</button>
                      <button onClick={() => setCurrentTool('brush')} className={`px-3 py-2 rounded font-bold text-sm ${currentTool === 'brush' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>️</button>
                      <button onClick={() => setCurrentTool('eraser')} className={`px-3 py-2 rounded font-bold text-sm ${currentTool === 'eraser' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🧹</button>
                      <button onClick={() => setCurrentTool('fog-add')} className={`px-3 py-2 rounded font-bold text-sm ${currentTool === 'fog-add' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🌫️+</button>
                      <button onClick={() => setCurrentTool('fog-remove')} className={`px-3 py-2 rounded font-bold text-sm ${currentTool === 'fog-remove' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>️-</button>
                      
                      {currentTool !== 'pan' && currentTool !== 'fog-add' && currentTool !== 'fog-remove' && (
                        <>
                          <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                          <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24" />
                          <button onClick={clearCanvas} className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm">🗑️</button>
                        </>
                      )}
                      {(currentTool === 'fog-add' || currentTool === 'fog-remove') && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-yellow-400">Точек: {currentFogPoints.length} | Пробел = готово</span>
                          <button onClick={clearFog} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded font-bold text-sm">Очистить</button>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Сетка: {gridSize}px</span>
                    <input type="range" min="20" max="80" value={gridSize} onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setGridSize(newSize);
                      updateRoomSettings({ grid_size: newSize });
                    }} className="w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Зум: {Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="px-2 py-1 bg-gray-700 rounded">-</button>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="px-2 py-1 bg-gray-700 rounded">+</button>
                    <button onClick={() => { setZoom(1); setMapOffset({ x: 0, y: 0 }); }} className="px-2 py-1 bg-gray-700 rounded">Сброс</button>
                  </div>
                </div>
              </div>
              
              <div ref={mapContainerRef} className="flex-1 bg-gray-800 rounded-lg border-2 border-gray-600 relative overflow-hidden select-none"
                style={{ cursor: currentTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : (role === 'player' ? 'grab' : 'crosshair'), WebkitUserSelect: 'none', userSelect: 'none' }}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={handleMapMouseDown} onMouseMove={handleMapMouseMove} onMouseUp={handleMapMouseUp}
                onMouseLeave={() => { handleMapMouseUp(); setMousePos(null); }} onWheel={handleWheel}>
                
                <div className="absolute" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', zIndex: 0 }}>
                  {mapImage ? <img src={mapImage} alt="Карта" className="max-w-none select-none pointer-events-none" draggable={false} style={{ minWidth: '2000px', minHeight: '2000px' }} /> :
                    <div className="bg-gray-700 flex items-center justify-center" style={{ width: '2000px', height: '2000px' }}><p className="text-gray-400">Загрузите карту</p></div>}
                </div>

                <div className="absolute pointer-events-none" style={{
                  transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  zIndex: 101,
                  width: '10000px',
                  height: '10000px',
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)`,
                  backgroundSize: `${gridSize}px ${gridSize}px`
                }} />

                <div className="absolute" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', zIndex: 50 }}>
                  {boardTokens.map(token => (
                    <div key={token.id} 
                      className={`absolute select-none token-element ${(role === 'dm' || token.author_nickname === user) ? 'cursor-move' : 'cursor-default'}`}
                      style={{
                        left: token.position_x, top: token.position_y,
                        width: (token.grid_size || 1) * gridSize, height: (token.grid_size || 1) * gridSize,
                        zIndex: token.layer || 10,
                        border: selectedToken === token.id ? '3px solid #fbbf24' : (token.author_nickname === user ? '2px solid #22c55e' : '2px solid #3b82f6'),
                        boxShadow: selectedToken === token.id ? '0 0 15px rgba(251, 191, 36, 0.9), 0 0 30px rgba(251, 191, 36, 0.5)' : '0 4px 6px rgba(0,0,0,0.4)',
                        transition: draggedToken === token.id ? 'none' : 'all 0.15s ease'
                      }}
                      onMouseDown={(e) => handleTokenMouseDown(e, token)} 
                      onClick={(e) => { e.stopPropagation(); setSelectedToken(token.id); }}>
                      {token.image_url ? <img src={token.image_url} alt={token.name} className="w-full h-full object-cover rounded select-none pointer-events-none" draggable={false} /> :
                        <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center rounded text-xs font-bold p-1 text-center">{token.name}</div>}
                      {selectedToken === token.id && role === 'dm' && (
                        <div className="layer-controls absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-gray-900 rounded px-2 py-1 shadow-lg whitespace-nowrap border border-gray-600">
                          <button onClick={(e) => { e.stopPropagation(); raiseTokenLayer(token); }} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded">⬆️</button>
                          <span className="text-xs text-gray-400 self-center">{token.layer || 10}</span>
                          <button onClick={(e) => { e.stopPropagation(); lowerTokenLayer(token); }} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded">⬇️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {role === 'dm' && (
                  <canvas ref={canvasRef} className="absolute" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', left: 0, top: 0, zIndex: 100, pointerEvents: (currentTool === 'brush' || currentTool === 'eraser') ? 'auto' : 'none' }} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
                )}

                <canvas ref={fogCanvasRef} width={FOG_CANVAS_SIZE} height={FOG_CANVAS_SIZE} className="absolute" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', left: 0, top: 0, zIndex: 102, pointerEvents: 'none' }} />
                
                {role !== 'dm' && remoteFogPreview && remoteFogPreview.points.length > 1 && (
  <svg className="absolute" style={{ left: 0, top: 0, width: '100%', height: '100%', zIndex: 103, pointerEvents: 'none' }} aria-hidden="true">
  <polyline
    points={remoteFogPreview.points.map(p => `${p.x * zoom + mapOffset.x},${p.y * zoom + mapOffset.y}`).join(' ')}
    fill="none" stroke={remoteFogPreview.type === 'add' ? '#000' : '#fff'} strokeWidth={2} strokeDasharray="5,5" />
  </svg>
  )}
  {role === 'dm' && (currentTool === 'fog-add' || currentTool === 'fog-remove') && currentFogPoints.length > 0 && (
                  <svg className="absolute" style={{ left: 0, top: 0, width: '100%', height: '100%', zIndex: 103, pointerEvents: 'none' }}>
                    {fogPreview.map((point, i) => { if (i === 0) return null; const prev = fogPreview[i - 1]; return <line key={`line-${i}`} x1={prev.x} y1={prev.y} x2={point.x} y2={point.y} stroke={currentTool === 'fog-add' ? '#000' : '#fff'} strokeWidth={2} strokeDasharray="5,5" />; })}
                    {mousePos && fogPreview.length > 0 && <line x1={fogPreview[fogPreview.length - 1].x} y1={fogPreview[fogPreview.length - 1].y} x2={mousePos.x} y2={mousePos.y} stroke={currentTool === 'fog-add' ? '#000' : '#fff'} strokeWidth={2} strokeDasharray="5,5" opacity={0.5} />}
                    {fogPreview.map((point, i) => <circle key={`point-${i}`} cx={point.x} cy={point.y} r={6} fill={currentTool === 'fog-add' ? '#000' : '#fff'} stroke="#fbbf24" strokeWidth={2} />)}
                    {fogPreview.length >= 2 && mousePos && <polygon points={[...fogPreview, mousePos].map(p => `${p.x},${p.y}`).join(' ')} fill={currentTool === 'fog-add' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'} stroke={currentTool === 'fog-add' ? '#000' : '#fff'} strokeWidth={1} strokeDasharray="5,5" />}
                  </svg>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-400 flex-shrink-0">
                💡 Колесо — зум | ✋ — двигать карту | Клик по своей фигурке — переместить
              </div>
            </div>
          )}

          {currentView === 'upload-map' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-amber-500 mb-6">🗺️ Загрузить карту</h2>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <input type="file" accept="image/*" onChange={handleMapUpload} disabled={isMapUploading} className="w-full p-2 bg-gray-700 rounded mb-4 disabled:opacity-50" />
  {isMapUploading && <p className="text-sm text-yellow-400 mb-4" role="status">Сжимаем и загружаем карту...</p>}
                {mapImage && <img src={mapImage} alt="Предпросмотр" className="max-w-full h-64 object-contain border border-gray-600 rounded mb-4" />}
                <label className="block text-sm font-bold mb-2">Размер сетки: {gridSize}px</label>
                <input type="range" min="20" max="100" value={gridSize} onChange={(e) => {
                   const newSize = Number(e.target.value);
                   setGridSize(newSize);
                   updateRoomSettings({ grid_size: newSize });
                }} className="w-full mb-4" />
                <button onClick={() => setCurrentView('map')} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold">Применить</button>
              </div>
            </div>
          )}

          {currentView === 'characters' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-500">{role === 'player' ? '👤 Мой персонаж' : '👥 Персонажи'}</h2>
                <button onClick={() => setShowCharForm(true)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">+ С��здать</button>
              </div>
              {showCharForm && (
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
                  <h3 className="text-xl font-bold mb-4">Создать персонажа</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input className="bg-gray-700 p-2 rounded" placeholder="Имя" value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} />
                    <input className="bg-gray-700 p-2 rounded" placeholder="Раса" value={newChar.race} onChange={e => setNewChar({ ...newChar, race: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Фото:</label>
                    <input type="file" accept="image/*" onChange={handleCharImageUpload} className="w-full p-2 bg-gray-700 rounded" />
                    {newChar.image_url && <img src={newChar.image_url} alt="Предпросмотр" className="mt-2 max-w-xs h-32 object-cover rounded border border-gray-600" />}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(stat => (
                      <div key={stat}>
                        <label className="block text-sm text-gray-400 mb-1">{stat === 'strength' ? 'Сила' : stat === 'dexterity' ? 'Ловкость' : stat === 'constitution' ? 'Телосложение' : stat === 'intelligence' ? 'Интеллект' : stat === 'wisdom' ? 'Мудрость' : 'Харизма'}</label>
                        <input type="number" className="bg-gray-700 p-2 rounded w-full" value={(newChar as any)[stat]} onChange={e => setNewChar({ ...newChar, [stat]: Number(e.target.value) })} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-sm text-gray-400 mb-1">HP</label><input type="number" className="bg-gray-700 p-2 rounded w-full" value={newChar.hit_points} onChange={e => setNewChar({ ...newChar, hit_points: Number(e.target.value) })} /></div>
                    <div><label className="block text-sm text-gray-400 mb-1">AC</label><input type="number" className="bg-gray-700 p-2 rounded w-full" value={newChar.armor_class} onChange={e => setNewChar({ ...newChar, armor_class: Number(e.target.value) })} /></div>
                  </div>
                  <textarea className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Заклинания" value={newChar.spells} onChange={e => setNewChar({ ...newChar, spells: e.target.value })} rows={2} />
                  <textarea className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Описание" value={newChar.description} onChange={e => setNewChar({ ...newChar, description: e.target.value })} rows={3} />
                  <div className="flex gap-2">
                    <button onClick={addCharacter} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Сохранить</button>
                    <button onClick={() => setShowCharForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Отмена</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.filter(c => role === 'dm' || c.author_nickname === user).map(char => (
                  <div key={char.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    {char.image_url && <img src={char.image_url} alt={char.name} className="w-full h-40 object-cover rounded mb-3" />}
                    <div className="flex justify-between items-start mb-2">
                      <div><h3 className="text-xl font-bold">{char.name}</h3><p className="text-sm text-gray-400">{char.race}</p></div>
                      {(role === 'dm' || char.author_nickname === user) && (
                        <button onClick={() => addCharToBoard(char)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-bold">+ На доску</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">СИЛ</div><div className="font-bold">{char.strength}</div></div>
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">ЛОВ</div><div className="font-bold">{char.dexterity}</div></div>
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">ТЕЛ</div><div className="font-bold">{char.constitution}</div></div>
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">ИНТ</div><div className="font-bold">{char.intelligence}</div></div>
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">МУД</div><div className="font-bold">{char.wisdom}</div></div>
                      <div className="bg-gray-700 p-2 rounded text-center"><div className="text-gray-400">ХАР</div><div className="font-bold">{char.charisma}</div></div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <div className="bg-red-900/50 p-2 rounded flex-1 text-center"><div className="text-gray-400">HP</div><div className="font-bold">{char.hit_points}</div></div>
                      <div className="bg-blue-900/50 p-2 rounded flex-1 text-center"><div className="text-gray-400">AC</div><div className="font-bold">{char.armor_class}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-500">⚔️ Предметы</h2>
                {role === 'dm' && <button onClick={() => setShowItemForm(true)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">+ Создать</button>}
              </div>
              {showItemForm && role === 'dm' && (
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
                  <h3 className="text-xl font-bold mb-4">Создать предмет</h3>
                  <input className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Название" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                  <textarea className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Описание" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} rows={4} />
                  <div className="flex gap-2">
                    <button onClick={addItem} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Сохранить</button>
                    <button onClick={() => setShowItemForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Отмена</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                  <div key={item.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-gray-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'objects' && role === 'dm' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-500">🏺 Объекты</h2>
                <button onClick={() => setShowObjForm(true)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">+ Создать</button>
              </div>
              {showObjForm && (
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
                  <h3 className="text-xl font-bold mb-4">Создать объект</h3>
                  <input className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Название" value={newObj.name} onChange={e => setNewObj({ ...newObj, name: e.target.value })} />
                  <textarea className="bg-gray-700 p-2 rounded w-full mb-4" placeholder="Описание" value={newObj.description} onChange={e => setNewObj({ ...newObj, description: e.target.value })} rows={3} />
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Фото:</label>
                    <input type="file" accept="image/*" onChange={handleObjImageUpload} className="w-full p-2 bg-gray-700 rounded" />
                    {newObj.image_url && <img src={newObj.image_url} alt="Предпросмотр" className="mt-2 max-w-xs h-32 object-cover rounded border border-gray-600" />}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Размер: {newObj.grid_size}x{newObj.grid_size}</label>
                    <input type="range" min="1" max="5" value={newObj.grid_size} onChange={e => setNewObj({ ...newObj, grid_size: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addObject} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Сохранить</button>
                    <button onClick={() => setShowObjForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Отмена</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {objects.map(obj => (
                  <div key={obj.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold">{obj.name}</h3>
                      <button onClick={() => addObjectToBoard(obj)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-bold">+ На доску</button>
                    </div>
                    {obj.image_url && <img src={obj.image_url} alt={obj.name} className="w-full h-32 object-cover rounded mb-2" />}
                    <p className="text-gray-400 text-sm mb-2">{obj.description}</p>
                    <p className="text-xs text-gray-500">Размер: {obj.grid_size}x{obj.grid_size}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'proposals' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-amber-500 mb-6">{role === 'dm' ? '💫 Пожелания от игроков' : '💡 Предложение Мастеру'}</h2>
              {role === 'player' ? (
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
                  <h3 className="text-xl font-bold mb-4">Написать сообщение</h3>
                  <textarea className="bg-gray-700 p-3 rounded w-full mb-4 border border-gray-600 focus:border-amber-500 outline-none" placeholder="Опишите вашу идею, вопрос или предложение..." value={newProposalMsg} onChange={e => setNewProposalMsg(e.target.value)} rows={6} />
                  <button onClick={submitProposal} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold">Отправить Мастеру</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.length === 0 && <p className="text-gray-500 italic">Пока нет предложений от игроков.</p>}
                  {proposals.map(prop => (
                    <div key={prop.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-blue-400">{prop.author_nickname}</span>
                        <span className="text-xs text-gray-500">{new Date(prop.created_at).toLocaleString('ru-RU')}</span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap">{prop.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(currentView === 'lore-full' || currentView === 'lore-short') && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-500">{currentView === 'lore-full' ? ' Лор (полный)' : ' Краткий лор'}</h2>
                {role === 'dm' && <button onClick={() => setShowFolderForm(true)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">+ Папка</button>}
              </div>
              {showFolderForm && (
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                  <input className="bg-gray-700 p-2 rounded w-full mb-2" placeholder="Название папки" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => addLoreFolder(currentView === 'lore-full' ? 'full' : 'short')} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Создать</button>
                    <button onClick={() => setShowFolderForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Отмена</button>
                  </div>
                </div>
              )}
              {!selectedFolder ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {loreFolders.filter(f => f.type === (currentView === 'lore-full' ? 'full' : 'short')).map(folder => (
                    <div key={folder.id} onClick={() => { setSelectedFolder(folder.id); fetchLoreNotes(folder.id); }} className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-700">
                      <h3 className="text-lg font-bold"> {folder.name}</h3>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedFolder(null)} className="mb-4 text-blue-400 hover:text-blue-300">← Назад</button>
                  {role === 'dm' && <button onClick={() => setShowNoteForm(true)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold mb-4">+ Заметка</button>}
                  {showNoteForm && (
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                      <input className="bg-gray-700 p-2 rounded w-full mb-2" placeholder="Заголовок" value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
                      <textarea className="bg-gray-700 p-2 rounded w-full mb-2" placeholder="Содержание" value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} rows={6} />
                      <div className="flex gap-2">
                        <button onClick={addLoreNote} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Сохранить</button>
                        <button onClick={() => setShowNoteForm(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Отмена</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {loreNotes.map(note => (
                      <div key={note.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-bold mb-2">{note.title}</h3>
                        <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-amber-500 mb-2">👥 Участники</h3>
          <div className="bg-gray-700 p-3 rounded mb-3">
            <p className="font-bold">{user}</p>
            <p className="text-xs text-gray-400">{role === 'dm' ? '👑 Мастер' : '🎲 Игрок'}</p>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {participants.map((p, i) => (
              <div key={i} className="bg-gray-700/50 p-2 rounded text-sm flex items-center gap-2">
                <span>{p.role === 'dm' ? '👑' : '🎲'}</span>
                <span className="font-medium">{p.user_nickname}</span>
                <span className="text-xs text-gray-400 ml-auto">{p.role === 'dm' ? 'Мастер' : 'Игрок'}</span>
              </div>
            ))}
            {participants.length === 0 && <p className="text-xs text-gray-500">Загрузка...</p>}
          </div>
        </div>

        <div className="p-2 border-b border-gray-700">
          <button onClick={() => setIsDicePanelOpen(!isDicePanelOpen)} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors">
            🎲 {isDicePanelOpen ? 'Скрыть кубики' : 'Бросить кубики'}
          </button>
        </div>

        {isDicePanelOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => rollDice(20, 1, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">d20</button>
              <button onClick={() => rollDice(6, 2, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">2d6</button>
              <button onClick={() => rollDice(8, 1, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">d8</button>
              <button onClick={() => rollDice(10, 1, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">d10</button>
              <button onClick={() => rollDice(12, 1, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">d12</button>
              <button onClick={() => rollDice(4, 6, 0)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded text-xs font-bold transition-colors">6d4</button>
            </div>

            <div className="bg-gray-700 p-3 rounded">
              <label className="block text-sm font-bold mb-2 text-amber-400">🎲 Кто бросает:</label>
              <input type="text" id="diceThrower" placeholder="Имя игрока" className="w-full bg-gray-600 p-2 rounded text-sm mb-3 border border-gray-500 focus:border-amber-500 outline-none" defaultValue={user} />
              <p className="text-sm font-bold mb-2">Свой бросок:</p>
              <div className="flex gap-2 mb-2">
                <input type="number" placeholder="Кол-во" className="w-16 bg-gray-600 p-1 rounded text-sm text-center" id="diceCount" defaultValue={1} />
                <select id="diceType" className="bg-gray-600 p-1 rounded text-sm flex-1">
                  <option value="4">d4</option><option value="6">d6</option><option value="8">d8</option>
                  <option value="10">d10</option><option value="12">d12</option><option value="20">d20</option><option value="100">d100</option>
                </select>
                <input type="number" placeholder="Мод" className="w-16 bg-gray-600 p-1 rounded text-sm text-center" id="diceModifier" defaultValue={0} />
              </div>
              <button onClick={() => {
                const thrower = (document.getElementById('diceThrower') as HTMLInputElement).value || user;
                const count = parseInt((document.getElementById('diceCount') as HTMLInputElement).value) || 1;
                const sides = parseInt((document.getElementById('diceType') as HTMLSelectElement).value);
                const modifier = parseInt((document.getElementById('diceModifier') as HTMLInputElement).value) || 0;
                rollDice(sides, count, modifier, thrower);
              }} className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-bold text-sm transition-colors">
                🎲 Бросить
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-400 mb-2 flex justify-between">
                <span>История</span>
                {diceHistory.length > 0 && (
                  <button 
                    onClick={async () => { 
                      await supabase.from('dice_rolls').delete().eq('room_id', roomId); 
                      setDiceHistory([]);
                    }} 
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Очистить
                  </button>
                )}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {diceHistory.map(roll => {
                  let rollsArray = [];
                  try { rollsArray = JSON.parse(roll.rolls); } catch(e) { rollsArray = [roll.total]; }
                  return (
                    <div key={roll.id} className="bg-gray-700 p-2 rounded text-xs border-l-4 border-purple-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-blue-400">{roll.user_nickname}</span>
                        <span className="text-gray-400">{new Date(roll.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-300 font-medium">{roll.dice}{roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : ''}</span>
                        <span className="font-bold text-green-400 text-lg">{roll.total}</span>
                      </div>
                      <div className="text-gray-500 mt-1 font-mono">[{rollsArray.join(', ')}]</div>
                    </div>
                  );
                })}
                {diceHistory.length === 0 && <p className="text-gray-500 text-center text-xs italic py-4">Пока нет бросков</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

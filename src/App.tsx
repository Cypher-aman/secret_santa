import {
  AlertCircle,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  Shuffle,
  Trash2,
  User,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from './supabase';

/**
 * ------------------------------------------------------------------
 * DATABASE SERVICE (SUPABASE)
 * ------------------------------------------------------------------
 */

const db = {
  getParticipants: async (): Promise<Participant[]> => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
    return data || [];
  },
  addParticipant: async (name: string): Promise<Participant | null> => {
    const newPerson = {
      name,
      has_drawn: false,
      is_picked: false,
      picked_who: null,
    };
    
    const { data, error } = await supabase
      .from('participants')
      .insert([newPerson])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding participant:', error);
      return null;
    }
    return data;
  },
  updateParticipant: async (id: number, updates: Partial<Participant>): Promise<void> => {
    const { error } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', id);
      
    if (error) {
      console.error('Error updating participant:', error);
    }
  },
  resetGame: async (): Promise<void> => {
    const { error } = await supabase
      .from('participants')
      .update({
        has_drawn: false,
        is_picked: false,
        picked_who: null,
      })
      .neq('id', 0); // Updates all rows
      
    if (error) {
      console.error('Error resetting game:', error);
    }
  },
  clearAll: async (): Promise<void> => {
    const { error } = await supabase
      .from('participants')
      .delete()
      .neq('id', 0); // Deletes all rows
      
    if (error) {
      console.error('Error clearing database:', error);
    }
  },
};

/**
 * ------------------------------------------------------------------
 * COMPONENTS
 * ------------------------------------------------------------------
 */

interface Participant {
  id: number;
  name: string;
  has_drawn: boolean;
  is_picked: boolean;
  picked_who: string | null;
}

interface TicketProps {
  picker: Participant;
  target: Participant;
  innerRef: React.RefObject<HTMLDivElement | null>;
}

const Ticket: React.FC<TicketProps> = ({ picker, target, innerRef }) => (
  <div
    ref={innerRef}
    className="bg-[#fffdf5] text-gray-800 p-8 rounded-sm border-[8px] border-double border-red-700 shadow-2xl max-w-sm mx-auto text-center relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-full h-4 bg-red-600 pattern-diagonal"></div>
    <div className="absolute bottom-0 left-0 w-full h-4 bg-green-600 pattern-diagonal"></div>

    <h3 className="text-gray-500 uppercase tracking-[0.2em] text-sm mt-4">
      Secret Santa 2025
    </h3>
    <div className="w-1/2 h-px mx-auto my-4 bg-gray-300"></div>

    <p className="text-xs font-bold text-gray-400 uppercase">Santa</p>
    <h2 className="mb-6 text-xl font-bold text-gray-800">{picker.name}</h2>

    <p className="text-xs font-bold text-gray-400 uppercase">
      Mission: Buy a gift for
    </p>
    <h1 className="my-4 font-serif text-4xl font-black text-red-600 uppercase">
      {target.name}
    </h1>

    <div className="flex justify-center gap-4 my-4 text-2xl">
      <span>❄️</span>
      <span>🎄</span>
      <span>❄️</span>
    </div>
    <p className="text-[10px] text-gray-400">
      Keep this secret until the party!
    </p>
  </div>
);

interface AdminPanelProps {
  participants: Participant[];
  refreshData: () => Promise<void>;
  goHome: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  participants,
  refreshData,
  goHome,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

  const funnyMessages = [
    'Nice try! Santa is watching you... 👀',
    'Access Denied! You are on the Naughty List. 📜',
    'Trying to peek? Where is your holiday spirit? 🎄',
    'Ho Ho No! Wrong password. 🎅',
    'Password incorrect. An elf has been dispatched to your location. 🧝',
    'Coal for you this year! Try again. 🪨',
  ];

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      const randomMsg =
        funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
      setError(randomMsg);
      setPassword('');
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsLoading(true);
    await db.addParticipant(newName.trim());
    setNewName('');
    await refreshData();
    setIsLoading(false);
  };

  const executeAction = async () => {
    setIsLoading(true);
    if (confirmAction === 'reset') {
      await db.resetGame();
    } else if (confirmAction === 'clear') {
      await db.clearAll();
    }
    await refreshData();
    setConfirmAction(null);
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-center">Admin Access</h2>
          <p className="mb-6 text-center text-gray-500">
            This area is for the Organizer only!
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 mb-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            {error && (
              <div className="p-3 mb-4 text-sm text-center text-red-600 border border-red-100 rounded-lg bg-red-50 animate-pulse">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 font-bold text-white transition-colors bg-red-600 rounded-lg cursor-pointer hover:bg-red-700"
            >
              Unlock Panel
            </button>
            <button
              type="button"
              onClick={goHome}
              className="w-full mt-4 text-sm text-gray-500 cursor-pointer hover:text-gray-800"
            >
              Cancel & Go Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl min-h-screen p-4 mx-auto md:p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-800">
          <KeyRound className="w-6 h-6 text-red-600" /> Admin Dashboard
        </h1>
          <button
            onClick={goHome}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            ← Back to Game
          </button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl">
            <h3 className="mb-2 text-lg font-bold">Are you sure?</h3>
            <p className="mb-4 text-gray-600">
              {confirmAction === 'reset'
                ? 'This will clear all current matches.'
                : 'This will delete ALL participants.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-gray-600 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={isLoading}
                className="px-4 py-2 font-bold text-white bg-red-600 rounded hover:bg-red-700"
              >
                {isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 mb-8 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h3 className="mb-4 text-lg font-bold">Add Participant</h3>
        <form
          onSubmit={handleAdd}
          className="flex gap-4"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter Name (e.g. Vikram)"
            className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 font-bold text-white bg-gray-900 rounded-lg cursor-pointer hover:bg-black disabled:opacity-50"
          >
            {isLoading ? '...' : 'Add'}
          </button>
        </form>
      </div>

      <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Master Record</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction('reset')}
              className="flex items-center gap-1 px-3 py-1 text-xs text-yellow-800 bg-yellow-100 rounded cursor-pointer hover:bg-yellow-200"
            >
              <RefreshCw className="w-3 h-3" /> Reset Draws
            </button>
            <button
              onClick={() => setConfirmAction('clear')}
              className="flex items-center gap-1 px-3 py-1 text-xs text-red-800 bg-red-100 rounded cursor-pointer hover:bg-red-200"
            >
              <Trash2 className="w-3 h-3" /> Delete All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-sm text-gray-500 border-b border-gray-200">
                <th className="p-3">Name</th>
                <th className="p-3">Has Drawn?</th>
                <th className="p-3">Is Picked?</th>
                <th className="p-3 text-red-600">Secret Target</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-gray-400"
                  >
                    No participants yet. Add some!
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">
                      {p.has_drawn ? (
                        <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded">
                          Done
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
                          Waiting
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {p.is_picked ? (
                        <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
                          No
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-red-600">
                      {p.picked_who || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface GameScreenProps {
  participants: Participant[];
  refreshData: () => Promise<void>;
  goToAdmin: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  participants,
  refreshData,
  goToAdmin,
}) => {
  const [view, setView] = useState<'login' | 'draw' | 'result'>('login');
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [availableCards, setAvailableCards] = useState<Participant[]>([]);

  const [hasShuffled, setHasShuffled] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Participant | null>(null);
  const [drawnTarget, setDrawnTarget] = useState<Participant | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.getElementById('h2c-script')) {
      const script = document.createElement('script');
      script.id = 'h2c-script';
      script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      document.body.appendChild(script);
    }
  }, []);

  const handleLogin = (user: Participant) => {
    setCurrentUser(user);
    const pool = participants.filter((p) => !p.is_picked && p.id !== user.id);
    setAvailableCards(pool.sort(() => Math.random() - 0.5));
    setHasShuffled(false);
    setIsShuffling(false);
    setSelectedCard(null);
    setView('draw');
  };

  const shuffleCards = () => {
    if (isShuffling) return;

    setIsShuffling(true);
    setHasShuffled(false);
    setSelectedCard(null);

    let shuffleCount = 0;
    const maxShuffles = 8;

    const runShuffleStep = () => {
      if (shuffleCount >= maxShuffles) {
        setIsShuffling(false);
        setHasShuffled(true);
        return;
      }

      const performUpdate = () => {
        setAvailableCards((prev) => {
          const newArr = [...prev];
          for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
          }
          return newArr;
        });
        shuffleCount++;
        setTimeout(runShuffleStep, 350);
      };

      if (document.startViewTransition) {
        document.startViewTransition(() => {
          try {
            flushSync(() => {
              performUpdate();
            });
          } catch (e) {
            performUpdate();
          }
        });
      } else {
        performUpdate();
      }
    };
    runShuffleStep();
  };

  const handleCardClick = (target: Participant) => {
    if (!hasShuffled) return;
    if (isShuffling) return;
    setSelectedCard(target);
  };

  const confirmPick = async () => {
    if (!selectedCard || !currentUser) return;

    await db.updateParticipant(selectedCard.id, { is_picked: true });
    await db.updateParticipant(currentUser.id, {
      has_drawn: true,
      picked_who: selectedCard.name,
    });

    setDrawnTarget(selectedCard);
    await refreshData();
    setView('result');
    setSelectedCard(null);
  };

  const handleDownload = () => {
    if ((window as any).html2canvas && ticketRef.current) {
      (window as any).html2canvas(ticketRef.current).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `Secret_Santa_${currentUser?.name || 'Player'}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    }
  };

  if (view === 'login') {
    const pendingUsers = participants.filter((p) => !p.has_drawn);

    return (
      <div className="min-h-screen bg-[#e74c3c] flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-black text-white md:text-6xl drop-shadow-md">
            SECRET SANTA
          </h1>
          <p className="text-lg text-white/80">
            Who are you? Click your name to enter.
          </p>
        </div>

        <div className="flex flex-wrap justify-center w-full max-w-4xl gap-4">
          {participants.length === 0 && (
            <div className="p-6 text-center text-white rounded-lg bg-white/10 backdrop-blur-sm">
              <p>No participants found.</p>
              <p className="mt-2 text-sm opacity-75">
                Go to Admin panel to add people.
              </p>
            </div>
          )}

          {pendingUsers.length === 0 && participants.length > 0 && (
            <div className="p-6 text-xl font-bold text-center text-red-600 bg-white rounded-lg shadow-lg">
              🎉 Everyone has drawn! Game Over.
            </div>
          )}

          {pendingUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user)}
              className="bg-white hover:bg-yellow-400 text-gray-800 hover:text-red-900 transition-all transform hover:-translate-y-1 active:scale-95 py-4 px-6 rounded-xl font-bold text-lg shadow-lg flex flex-col items-center min-w-[140px] cursor-pointer"
            >
              <User className="w-8 h-8 mb-2 opacity-50" />
              {user.name}
            </button>
          ))}
        </div>

        <button
          onClick={goToAdmin}
          className="fixed flex items-center gap-1 text-sm cursor-pointer bottom-4 right-4 text-white/50 hover:text-white"
        >
          <Lock className="w-4 h-4" /> Go to Admin Panel
        </button>
      </div>
    );
  }

  if (view === 'draw') {
    return (
      <div className="min-h-screen bg-[#2c3e50] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style>{`::view-transition-group(root) { animation-duration: 0.3s; }`}</style>

        {selectedCard && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-sm p-8 text-center duration-200 bg-white shadow-2xl rounded-xl animate-in zoom-in-95">
              <h3 className="mb-2 text-2xl font-bold text-gray-800">
                Confirm Selection
              </h3>
              <p className="mb-6 text-gray-500">
                You are about to pick a card. Once confirmed, you{' '}
                <strong>cannot</strong> change your pick.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 px-4 py-3 font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPick}
                  className="flex-1 px-4 py-3 font-bold text-white bg-red-600 rounded-lg shadow-lg hover:bg-red-700"
                >
                  Yes, Pick It!
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="z-10 mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold text-white">
            Hello, {currentUser?.name}!
          </h2>
          <div
            className={`inline-block px-4 py-2 rounded-full text-sm border border-white/20 transition-colors duration-300 ${
              hasShuffled
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-white/90 backdrop-blur'
            }`}
          >
            {isShuffling
              ? 'Shuffling...'
              : hasShuffled
              ? 'Step 2: Pick a card!'
              : 'Step 1: Shuffle the deck'}
          </div>
        </div>

        {availableCards.length === 0 ? (
          <div className="z-10 max-w-md p-8 text-center text-white bg-red-500 shadow-2xl rounded-xl">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="mb-2 text-2xl font-bold">Uh oh!</h3>
            <p>You are the last one and only your name is left!</p>
            <p className="mt-4 text-sm opacity-80">
              Please contact the Admin to reset the specific draw.
            </p>
            <button
              onClick={() => setView('login')}
              className="px-6 py-2 mt-6 font-bold text-red-600 bg-white rounded-full"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto w-full max-w-5xl justify-center py-8 px-4 z-10 min-h-[300px]">
            {availableCards.map((card, idx) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                style={{ viewTransitionName: `card-${card.id}` }}
                className={`
                    flex-shrink-0 w-48 h-72 rounded-xl border-4 border-white shadow-2xl flex items-center justify-center text-6xl transition-all duration-200
                    ${isShuffling ? 'scale-90 bg-red-400' : ''}
                    ${
                      !hasShuffled && !isShuffling
                        ? 'bg-gray-600 opacity-50 cursor-not-allowed grayscale'
                        : ''
                    }
                    ${
                      hasShuffled && !isShuffling
                        ? 'bg-gradient-to-br from-red-500 to-red-700 cursor-pointer hover:-translate-y-4 hover:rotate-2 hover:shadow-red-500/50'
                        : ''
                    }
                `}
              >
                🎁
              </div>
            ))}
          </div>
        )}

        <div className="z-10 mt-8">
          <button
            onClick={shuffleCards}
            disabled={hasShuffled || isShuffling || availableCards.length === 0}
            className={`
                    px-8 py-4 rounded-full font-bold text-xl shadow-xl flex items-center gap-3 transition-all
                    ${
                      hasShuffled
                        ? 'bg-green-500 text-white cursor-default opacity-50'
                        : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 hover:scale-105 active:scale-95 cursor-pointer'
                    }
                `}
          >
            {isShuffling ? (
              <span>🎲 Shuffling...</span>
            ) : hasShuffled ? (
              <span>Cards Active! Pick One 👆</span>
            ) : (
              <>
                <Shuffle /> Shuffle Cards
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => setView('login')}
          className="absolute top-4 left-4 text-white/40 hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900/95">
        <div className="mb-6 text-center text-white animate-pulse">
          <h2 className="text-2xl font-bold">It's a Match!</h2>
        </div>

        <Ticket
          picker={currentUser!}
          target={drawnTarget!}
          innerRef={ticketRef}
        />

        <div className="flex flex-col w-full max-w-xs gap-4 mt-8">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-6 py-4 font-bold text-white transition-transform bg-green-500 rounded-lg shadow-lg hover:bg-green-600 active:scale-95"
          >
            <Download className="w-5 h-5" /> Save Image
          </button>

          <p className="text-xs text-center text-white/50">
            Please save the image immediately.
            <br />
            Once you leave this screen, it's gone!
          </p>

          <button
            onClick={() => setView('login')}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
};

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentPage, setCurrentPage] = useState<'game' | 'admin'>('game');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const data = await db.getParticipants();
    setParticipants(data);
  };

  return (
    <div>
      {currentPage === 'game' ? (
        <GameScreen
          participants={participants}
          refreshData={refreshData}
          goToAdmin={() => setCurrentPage('admin')}
        />
      ) : (
        <AdminPanel
          participants={participants}
          refreshData={refreshData}
          goHome={() => setCurrentPage('game')}
        />
      )}
    </div>
  );
}

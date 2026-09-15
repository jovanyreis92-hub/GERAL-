import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { RegistrationView } from './components/RegistrationView';
import { AdminPanel } from './components/AdminPanel';
import { QRScannerView } from './components/QRScannerView';
import { QRCardModal } from './components/QRCardModal';
import { EventManagerModal } from './components/EventManagerModal';
import { EditParticipantModal } from './components/EditParticipantModal';
import { MobileCheckInResultModal } from './components/MobileCheckInResultModal';
import { Participant, ActiveTab, EventItem } from './types';
import { fetchParticipants, fetchEvents, scanCheckIn } from './lib/api';
import { playSuccessSound } from './lib/qr';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [isEventManagerOpen, setIsEventManagerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [modalParticipant, setModalParticipant] = useState<Participant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  // Mobile check-in state (triggered when scanned by any phone or direct URL)
  const [mobileResult, setMobileResult] = useState<{
    participant: Participant;
    alreadyCheckedIn: boolean;
    message: string;
  } | null>(null);
  const [mobileLoading, setMobileLoading] = useState<boolean>(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [participantsData, eventsData] = await Promise.all([
        fetchParticipants(),
        fetchEvents(),
      ]);
      setParticipants(participantsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventsOnly = async () => {
    try {
      const eventsData = await fetchEvents();
      setEvents(eventsData);
    } catch (err) {
      console.error('Erro ao atualizar eventos:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check URL params for direct mobile check-in when scanned by any phone camera
  useEffect(() => {
    const handleUrlCheckIn = async () => {
      try {
        const search = window.location.search;
        if (!search) return;
        const params = new URLSearchParams(search);
        const checkinCode =
          params.get('checkin') || params.get('id') || params.get('code') || params.get('m');
        if (!checkinCode) return;

        setMobileLoading(true);
        setMobileError(null);

        // Perform check-in via API
        const res = await scanCheckIn(checkinCode);
        if (res.success && res.participant) {
          playSuccessSound();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([120, 60, 120]);
          }
          setMobileResult({
            participant: res.participant,
            alreadyCheckedIn: !!res.alreadyCheckedIn,
            message: res.message || 'Presença confirmada com sucesso!',
          });
          handleCheckInSuccess(res.participant);
        } else {
          setMobileError(res.message || 'Código QR não reconhecido.');
        }

        // Clean query params so refresh doesn't re-trigger
        try {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        } catch {
          // Ignore
        }
      } catch (err: any) {
        setMobileError(err.message || 'Erro ao validar presença do participante.');
      } finally {
        setMobileLoading(false);
      }
    };

    handleUrlCheckIn();
  }, []);

  const handleDirectCheckInSimulate = async (p: Participant) => {
    setMobileLoading(true);
    setMobileError(null);
    try {
      const res = await scanCheckIn(p.id);
      if (res.success && res.participant) {
        playSuccessSound();
        setMobileResult({
          participant: res.participant,
          alreadyCheckedIn: !!res.alreadyCheckedIn,
          message: res.message || 'Presença confirmada com sucesso!',
        });
        handleCheckInSuccess(res.participant);
      }
    } catch (err: any) {
      setMobileError(err.message || 'Erro ao testar check-in.');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleParticipantAdded = (newParticipant: Participant) => {
    setParticipants((prev) => [newParticipant, ...prev.filter((p) => p.id !== newParticipant.id)]);
  };

  const handleCheckInSuccess = (updatedParticipant: Participant) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
    );
  };

  const checkedInCount = participants.filter((p) => p.checkedIn).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCount={participants.length}
        checkedInCount={checkedInCount}
        isAdminUnlocked={isAdminUnlocked}
        eventsCount={events.length}
        onOpenEventManager={() => setIsEventManagerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'register' && (
          <RegistrationView
            events={events}
            selectedEventId={selectedEventId}
            onParticipantAdded={handleParticipantAdded}
            onOpenScanner={() => setActiveTab('scanner')}
            onOpenEventManager={() => setIsEventManagerOpen(true)}
          />
        )}

        {activeTab === 'scanner' && (
          <QRScannerView
            onCheckInSuccess={handleCheckInSuccess}
            onGoToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            participants={participants}
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            onOpenEventManager={() => setIsEventManagerOpen(true)}
            onRefresh={loadData}
            onViewQR={(p) => setModalParticipant(p)}
            isAdminUnlocked={isAdminUnlocked}
            setIsAdminUnlocked={setIsAdminUnlocked}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/50 py-4 px-4 text-center text-xs text-slate-500">
        <p>
          Sistema de Credenciamento & Controle de Presença QR Code • Cadastramento de Eventos por Datas
        </p>
      </footer>

      {/* QR Code Inspection & Download Modal */}
      {modalParticipant && (
        <QRCardModal
          participant={modalParticipant}
          onClose={() => setModalParticipant(null)}
          onEdit={(p) => setEditingParticipant(p)}
          onDirectCheckIn={handleDirectCheckInSimulate}
        />
      )}

      {/* Universal Mobile Check-in Result Modal */}
      {(mobileResult || mobileLoading || mobileError) && (
        <MobileCheckInResultModal
          result={mobileResult}
          loading={mobileLoading}
          error={mobileError}
          onClose={() => {
            setMobileResult(null);
            setMobileError(null);
          }}
          onOpenScanner={() => {
            setMobileResult(null);
            setMobileError(null);
            setActiveTab('scanner');
          }}
        />
      )}

      {/* Modal de Edição de Participante Direto */}
      {editingParticipant && (
        <EditParticipantModal
          participant={editingParticipant}
          events={events}
          onSaveSuccess={(updated) => {
            setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            if (modalParticipant && modalParticipant.id === updated.id) {
              setModalParticipant(updated);
            }
            setEditingParticipant(null);
            loadData();
          }}
          onClose={() => setEditingParticipant(null)}
        />
      )}

      {/* Event Manager Modal */}
      {isEventManagerOpen && (
        <EventManagerModal
          events={events}
          participants={participants}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => {
            setSelectedEventId(id);
          }}
          onEventsUpdated={() => {
            loadEventsOnly();
            loadData();
          }}
          onClose={() => setIsEventManagerOpen(false)}
        />
      )}
    </div>
  );
}

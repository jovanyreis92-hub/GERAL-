import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { RegistrationView } from './components/RegistrationView';
import { AdminPanel } from './components/AdminPanel';
import { QRScannerView } from './components/QRScannerView';
import { QRCardModal } from './components/QRCardModal';
import { EventManagerModal } from './components/EventManagerModal';
import { EditParticipantModal } from './components/EditParticipantModal';
import { Participant, ActiveTab, EventItem } from './types';
import { fetchParticipants, fetchEvents } from './lib/api';

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

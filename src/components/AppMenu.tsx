import React, { useState, useEffect } from "react";
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonLoading,
  IonTextarea,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { logOutOutline, sendOutline, documentTextOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import logo from '../assets/Adobe_Express_-_file-removebg-preview.png';
import "../css/AppMenu.css";
import { menuController } from "@ionic/core";

interface Note {
  id: string;
  content: string;
  date: string;
}

const AppMenu: React.FC = () => {
  const history = useHistory();
  const [loggingOut, setLoggingOut] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('adminNotes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save note function
  const saveNote = () => {
    if (noteContent.trim() === '') return;

    const newNote: Note = {
      id: Date.now().toString(),
      content: noteContent.trim(),
      date: new Date().toLocaleString()
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem('adminNotes', JSON.stringify(updatedNotes));
    setNoteContent('');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await menuController.close(); } catch {}
    history.push("/Tultoladmin/enter-passcode");
    setLoggingOut(false);
  };

  const handleMenuDidOpen = () => {
    // Focus on the note textarea when menu opens
    setTimeout(() => {
      const textarea = document.querySelector('ion-textarea textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  return (
    <IonMenu contentId="main" side="start" className="sidebar-menu" onIonDidOpen={handleMenuDidOpen}>
      <IonHeader className="sidebar-header">
        <div className="sidebar-brand">
          <img
            src={logo}
            alt="Toltula-AR Logo"
            className="sidebar-logo"
          />
          <div className="sidebar-brand-text">
            <h1 className="sidebar-title">Tultol-AD</h1>
            <p className="sidebar-subtitle">admin for Augmented Reality application</p>
          </div>
        </div>
      </IonHeader>
      <IonContent className="sidebar-content">
        {loggingOut && <div className="global-blur" />}
        <IonLoading isOpen={loggingOut} message="Signing out..." spinner="crescent" />
        <div className="sidebar-welcome">
          <h3 className="welcome-title">🎉 Welcome Back!</h3>
          <p className="welcome-subtitle">You are successfully signed in</p>
          <div className="welcome-status">
            <span className="status-dot"></span>
            <span className="status-text">🟢 Online & Ready</span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="notes-section" style={{padding: '16px'}}>
          <h4 style={{margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', fontWeight: '600'}}>
            📝 Admin Notes
          </h4>

          {/* Note Input */}
          <div style={{marginBottom: '16px'}}>
            <IonTextarea
              value={noteContent}
              onIonChange={(e) => setNoteContent(e.detail.value!)}
              placeholder="Write your admin notes here..."
              rows={4}
              style={{
                '--background': 'rgba(255, 255, 255, 0.08)',
                '--color': 'rgba(255, 255, 255, 0.9)',
                '--placeholder-color': 'rgba(255, 255, 255, 0.5)',
                '--border-radius': '8px',
                'border': '1px solid rgba(255, 255, 255, 0.1)',
                'marginBottom': '12px'
              }}
            />
            <IonButton
              expand="block"
              onClick={saveNote}
              disabled={!noteContent.trim()}
              style={{
                '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '--border-radius': '8px'
              }}
            >
              <IonIcon slot="start" icon={sendOutline} />
              Save Note
            </IonButton>
          </div>

          {/* Saved Notes */}
          {notes.length > 0 && (
            <div className="saved-notes">
              <h5 style={{margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', fontWeight: '500'}}>
                📋 Saved Notes ({notes.length})
              </h5>
              <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                {notes.map((note) => (
                  <IonCard key={note.id} style={{
                    '--background': 'rgba(255, 255, 255, 0.05)',
                    'margin': '8px 0',
                    'borderRadius': '8px',
                    'border': '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <IonCardContent style={{padding: '12px'}}>
                      <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                        <IonIcon icon={documentTextOutline} style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '16px',
                          marginTop: '2px'
                        }} />
                        <div style={{flex: 1}}>
                          <p style={{
                            margin: '0 0 6px 0',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            lineHeight: '1.4'
                          }}>
                            {note.content}
                          </p>
                          <small style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '0.75rem'
                          }}>
                            {note.date}
                          </small>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <IonButton expand="full" color="danger" onClick={handleLogout} disabled={loggingOut} className="sidebar-logout-btn">
            <IonIcon slot="start" icon={logOutOutline} />
            Sign Out
          </IonButton>
        </div>
      </IonContent>
    </IonMenu>
  );
};

export default AppMenu;



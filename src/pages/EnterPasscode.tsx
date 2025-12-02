import React, { useState, useEffect, useRef } from "react";
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonTitle,
  IonLoading,
  IonAlert,
  useIonViewDidEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import "../css/Home.css";
import "../css/EnterPasscode.css";

const EnterPasscode: React.FC = () => {
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [successLoading, setSuccessLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "">("");

  const inputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  useIonViewDidEnter(() => {
    // Focus only when this page is active and not aria-hidden
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      let ancestor = input.parentElement;
      let hiddenAncestor = false;
      while (ancestor) {
        if (ancestor.getAttribute && ancestor.getAttribute('aria-hidden') === 'true') {
          hiddenAncestor = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!hiddenAncestor) input.focus();
    }, 0);
  });

  useEffect(() => {
    const isAuth = localStorage.getItem("authenticated") === "true";
    if (isAuth) {
      history.replace("/Toltul-ad/home");
    }
  }, [history]);

  useEffect(() => {
   
    setPin(Array(6).fill(""));
    setActiveIndex(0);
    setModalMessage("");
    setModalType("");
    if (inputRef.current) inputRef.current.value = "";
  
  }, []);

  useEffect(() => {
    if (modalMessage) {
      const timer = setTimeout(() => {
        setPin(Array(6).fill(""));
        setActiveIndex(0);
        setModalMessage("");
        setModalType("");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [modalMessage]);

  const vibrate = (pattern: number | number[]) => {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  };

  const showModal = (message: string, type: "success" | "error") => {
    setModalMessage(message);
    setModalType(type);
  };

  const checkPasscode = async (code: string) => {
    if (!code) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("passcodes")
      .select("*")
      .eq("code", code.trim())
      .single();

    setLoading(false);

    if (error || !data) {
      vibrate([200, 100, 200]);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      showModal("❌ Incorrect Passcode", "error");
    } else {
      vibrate(150);
      showModal("✅ Access Granted", "success");
      localStorage.setItem("authenticated", "true");
      setSuccessLoading(true);
      setTimeout(() => {
        setSuccessLoading(false);
        setShowWelcome(true);
      }, 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 6) value = value.slice(0, 6);

    const newPin = value.split("");
    while (newPin.length < 6) newPin.push("");

    setPin(newPin);
    setActiveIndex(newPin.findIndex((d) => d === ""));

    if (value.length === 6) {
      checkPasscode(value);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    };
    const input = inputRef.current;
    if (input) {
      input.addEventListener("focus", handleFocus);
    }
    return () => {
      if (input) {
        input.removeEventListener("focus", handleFocus);
      }
    };
  }, []);

  return (
    <IonPage>
  <IonContent className="home-content" fullscreen inert={!!document.querySelector('ion-router-outlet[aria-hidden="true"]')}>
        {/* EPIC BACKGROUND ANIMATIONS */}
        <div className="floating-shapes">
          <div className="shape-1"></div>
          <div className="shape-2"></div>
          <div className="shape-3"></div>
          <div className="shape-4"></div>
          <div className="shape-5"></div>
        </div>
        <div className="wave-overlay"></div>

        <IonLoading isOpen={successLoading} message="Preparing your experience..." spinner="crescent" translucent />
        <IonAlert
          isOpen={showWelcome}
          header="Welcome"
          message="You have successfully logged in."
          buttons={[
            {
              text: "OK",
              handler: () => {
                console.log("Navigating to /Toltul-ad/home via alert OK");
                try { history.push("/Toltul-ad/home"); } catch (error) { console.error("Navigation failed:", error); }
              },
            },
          ]}
          onDidDismiss={() => {
            if (showWelcome) {
              console.log("Navigating to /Toltul-ad/home via alert dismiss");
              try { history.push("/Toltul-ad/home"); } catch (error) { console.error("Navigation failed:", error); }
            }
          }}
        />
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10
        }}>
          {/* Header Section - Takes upper portion */}
          <div style={{
            flex: '0 0 45%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center'
          }}>
            {/* Logo */}
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp9gZnSEdoA-GxkfjMOZy_NaQPGNM2OIRu9jysFNX_g3kY3zqYz8ii8sVO7-FbywES96A&usqp=CAU"
              alt="Logo"
              className="app-logo enhanced-logo"
              style={{marginBottom: '20px'}}
            />

            {/* Title */}
            <IonTitle className="tech-title enhanced-title" style={{
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              marginBottom: '25px',
              fontSize: '2.5rem'
            }}>
              Tultol-AD
            </IonTitle>

            {/* System Description */}
            <div style={{maxWidth: '600px'}}>
              <h2 style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '28px',
                fontWeight: '700',
                margin: '0 0 15px 0',
                textShadow: '0 3px 6px rgba(0, 0, 0, 0.4)',
                lineHeight: '1.2'
              }}>
                🏛️ Augmented Reality Marker Management System
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '18px',
                margin: '0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                lineHeight: '1.4',
                fontWeight: '300'
              }}>
                Administer and control AR markers across your campus ecosystem
              </p>
            </div>
          </div>

          {/* Passcode Input Section - Takes lower portion */}
          <div style={{
            flex: '0 0 55%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="glass-card passcode-pin-container enhanced-card" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '500px',
              padding: '40px 30px',
              borderRadius: '20px',
              marginTop: '20px'
            }}>
            {/* Passcode Input Section */}
            <div style={{marginTop: '20px'}}>
              {/* Hidden Input */}
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={pin.join("")}
                onChange={handleChange}
                className="hidden-pass-input"
                aria-label="Enter 6-digit passcode"
              />

              {/* PIN Boxes */}
              <div className={`pin-boxes enhanced-pin-boxes ${shake ? "shake" : ""}`} style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {pin.map((digit, i) => (
                  <div
                    key={i}
                    className={`pin-box enhanced-pin-box ${digit ? "filled" : ""} ${
                      i === activeIndex ? "active" : ""
                    }`}
                    onClick={() => {
                      // Only focus if not hidden
                      let ancestor = inputRef.current?.parentElement;
                      let hiddenAncestor = false;
                      while (ancestor) {
                        if (ancestor.getAttribute && ancestor.getAttribute('aria-hidden') === 'true') {
                          hiddenAncestor = true;
                          break;
                        }
                        ancestor = ancestor.parentElement;
                      }
                      if (!hiddenAncestor) inputRef.current?.focus();
                    }}
                    tabIndex={0}
                    aria-label={digit ? "Filled" : "Empty"}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      background: digit ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {digit ? (
                      <span className="pin-dot" style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        display: 'block'
                      }} />
                    ) : (
                      <span className="pin-placeholder" style={{
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '24px',
                        fontWeight: '300'
                      }}>
                        •
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Loading Spinner */}
              {loading && <IonSpinner name="crescent" className="loading-spinner enhanced-spinner" />}

              {/* Security Note */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  margin: '0',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}>
                  🔒 Secure admin access required • All activities are logged and monitored
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Notification */}
        {modalMessage && (
          <div
            className={`passcode-modal enhanced-modal ${modalType === "success" ? "success" : "error"}`}
            style={{
              background: modalType === "success" ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              backdropFilter: 'blur(10px)',
              border: modalType === "success" ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: modalType === "success" ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            {modalMessage}
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default EnterPasscode;
